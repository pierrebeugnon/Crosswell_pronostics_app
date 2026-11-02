-- 017 — LE CALENDRIER DEVIENT UNE VUE MATÉRIALISÉE
--
-- `journees_publiques` était une vue ordinaire qui agrégeait
-- `resultats_publics` SUR TOUT L'HISTORIQUE, à chaque visite. Tant que cette
-- source était simple, c'était tenable (548 ms, mesuré à la db/015). La db/016
-- lui a ajouté trois jointures — performances, profils, courses PMU — et le
-- calendrier s'est mis à les payer toutes, pour n'en lire aucune colonne.
--
-- ════════════════════════════════════════════════════════════════════════════
-- CE QUE ÇA COÛTAIT, ET CE QUE ÇA CASSAIT.
--
-- Mesuré le 26/10/2026 : 421 ms à chaud, 136 197 pages lues, avec un parcours
-- des 185 000 lignes de `predictions_log` ET un seq scan des 40 000 lignes de
-- `pmu_courses`, à chaque appel. À froid, au-delà du délai d'attente : la page
-- `/resultats` a répondu 503 une fois sur neuf pendant le diagnostic.
--
-- Et ça ne pouvait qu'empirer : l'historique grossit d'environ 2 500 lignes par
-- jour. Le calendrier était le seul endroit du site dont le coût croissait
-- avec le passé plutôt qu'avec ce qu'on affiche.
-- ════════════════════════════════════════════════════════════════════════════
--
-- ════════════════════════════════════════════════════════════════════════════
-- DEUX CORRECTIONS, PAS UNE.
--
-- 1. ELLE NE LIT PLUS `resultats_publics`. Une journée a des résultats si et
--    seulement si elle a une course jugée — le poids, le jockey et l'allocation
--    n'y changent rien. La requête part donc directement de `predictions_log`,
--    sans aucune des trois jointures : 126 ms au lieu de 421, et 7 372 pages
--    au lieu de 136 197, soit dix-huit fois moins. Cela découple aussi le
--    calendrier des enrichissements à venir : une quatrième jointure dans
--    `resultats_publics` ne le ralentira plus.
--
-- 2. ELLE EST MATÉRIALISÉE. Même à 126 ms, recalculer tout le passé à chaque
--    visite n'a pas de sens pour une liste de 47 lignes qui change une fois
--    par jour. Lire la table matérialisée coûte une page.
-- ════════════════════════════════════════════════════════════════════════════
--
-- LE RAFRAÎCHISSEMENT, ET POURQUOI TOUTES LES DIX MINUTES.
--
-- La maison a déjà ce motif : `crosswell_classement_pros` (cron 7) rafraîchit
-- `chevaux.classement_pros` en `CONCURRENTLY`, toutes les heures. On reprend la
-- forme, pas la fréquence : une heure suffirait pour un classement, pas pour un
-- calendrier. La première arrivée du jour tombe vers 11 h 30, et tant qu'elle
-- n'est pas dans cette table, la journée du jour n'apparaît pas dans la grille.
-- Dix minutes, c'est moins que le délai de relevé d'une arrivée (19 à 26
-- minutes, mesuré le 22/10) : le calendrier n'est donc jamais le maillon lent.
--
-- `CONCURRENTLY` exige un index UNIQUE et ne pose aucun verrou de lecture : le
-- site continue de servir pendant le rafraîchissement. C'est la raison de
-- l'index ci-dessous, il n'est pas là pour la performance de lecture.
--
-- CE QUE CETTE MIGRATION NE CHANGE PAS : le nom, les colonnes et les droits.
-- `site/src/services/resultats.ts` interroge `journees_publiques` exactement
-- comme avant — PostgREST sert une vue matérialisée comme une vue.
--
-- NOTE SUR LA PAGE D'ENTRÉE. `/resultats` ne dépend plus de cette table pour
-- choisir le jour qu'elle affiche : la fonction `api/resultats` sert désormais
-- LA JOURNÉE DU JOUR, et ne retombe sur la plus récente que si aujourd'hui n'a
-- aucune course. Dix minutes de retard sur la grille sont invisibles ; dix
-- minutes de retard sur la page d'accueil des résultats ne l'auraient pas été.

begin;

drop view if exists public.journees_publiques;

create materialized view public.journees_publiques as
with jugees as (
  select p.reunion_date, p.hippodrome, p.course_num
  from modele_prediction_engagement.predictions_log p
  join public.crosswell_modele_servi m on m.version = p.model_version
  where p.hippodrome is not null
    and p.hippodrome <> '?'
  group by 1, 2, 3
  -- LE MÊME VERROU que `resultats_publics` : une course non jugée ne compte
  -- pas, donc une journée sans arrivée n'apparaît pas au calendrier.
  having bool_or(p.actual_place is not null)
)
select
  reunion_date,
  count(*)                   as courses,
  count(distinct hippodrome) as hippodromes
from jugees
group by reunion_date;

-- Exigé par `REFRESH ... CONCURRENTLY`. Une journée est unique par définition.
create unique index journees_publiques_jour
  on public.journees_publiques (reunion_date);

comment on materialized view public.journees_publiques is
  'Une ligne par journée ayant des arrivées publiées, avec son nombre de courses et d''hippodromes. Sert le calendrier et la liste des journées précédentes. MATÉRIALISÉE : rafraîchie toutes les dix minutes par la tâche cron `journees-publiques`.';

grant select on public.journees_publiques to anon, authenticated;

commit;
