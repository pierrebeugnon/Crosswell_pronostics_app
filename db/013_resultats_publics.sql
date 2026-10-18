-- 013 — LES RÉSULTATS, EN LECTURE PUBLIQUE
--
-- Ouvre à un visiteur SANS COMPTE ce que l'application montre déjà à un compte
-- connecté : les arrivées des courses jugées, et le programme des courses à
-- venir. C'est ce que servent les pages `/resultats` du site vitrine.
--
-- ════════════════════════════════════════════════════════════════════════════
-- ON REPRODUIT L'APPLICATION, ON N'INVENTE RIEN.
--
-- L'application lit DEUX vues et deux seulement : `client_predictions` (dans
-- `services/predictions.ts`) et `client_cotes` (dans `services/cotes.ts`).
-- Elle ne touche ni `pmu_courses`, ni `engagements.*`, ni les schémas `fg_*`.
-- Ces vues publiques reprennent donc la MÊME source — `predictions_log`,
-- filtrée sur `crosswell_modele_client()` — avec la même règle de rang.
--
-- Conséquence assumée : pas d'allocation, pas de terrain, pas de numéro de
-- réunion. L'en-tête de course de l'application n'en affiche aucun — elle
-- montre « C3 · Deauville · Départ 13:20 », le type, la distance, les partants
-- et la confiance. La maquette en demandait huit ; nous en avons cinq, les
-- mêmes que le produit payant. Une première version de cette migration allait
-- les chercher dans `pmu_courses` : cette table ne couvre que le plat et n'a
-- été remplie qu'une fois, à la main, le 17/10 (documentation §6.4 et §10.4).
-- La piste est abandonnée.
--
-- Ce que cette source couvre, elle, mesuré le 18/10/2026 sur 21 jours :
-- 451 courses, 42 hippodromes, Auteuil, Compiègne, Pau et Enghien compris —
-- PLAT ET OBSTACLE — et 82,2 % des lignes portent une cote.
-- ════════════════════════════════════════════════════════════════════════════
--
-- ════════════════════════════════════════════════════════════════════════════
-- LE VERROU EST DANS LE SQL, PAS DANS LE CODE.
--
-- `crosswell_acces_complet()` renvoie VRAI pour tout rôle non authentifié : un
-- site qui lirait `client_predictions` avec une clé de service verrait donc
-- TOUT déverrouillé, et il faudrait refiltrer à la main en TypeScript —
-- c'est-à-dire à l'endroit le plus facile à oublier.
--
-- Ici, une course pas encore jugée N'A AUCUNE LIGNE dans `resultats_publics` :
-- il n'existe pas de probabilité à cacher, elle n'est pas servie. Et
-- `programme_public` ne porte AUCUNE colonne de probabilité, de rang ni de
-- cote — pas même nulle. Une erreur de code ne peut pas les faire apparaître.
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- ────────────────────────────────────────────────────────────────────────────
-- LES ARRIVÉES — une ligne par partant, courses JUGÉES uniquement.
-- ────────────────────────────────────────────────────────────────────────────
create or replace view public.resultats_publics as
with base as (
  select
    p.reunion_date,
    p.hippodrome,
    p.course_num,
    p.course_nom,
    p.categorie,
    p.is_handicap,
    p.distance,
    p.field_size,
    p.heure_depart,
    p.horse_num,
    p.horse_name,
    p.p_win,
    p.p_place,
    p.actual_place,
    p.cote,
    p.non_partant,
    -- Rang EFFECTIF, règle de l'application : un non-partant ne décale
    -- personne, et n'a pas de rang.
    case when p.non_partant is true then null
         else rank() over (
           partition by p.reunion_date, p.hippodrome, p.course_num, (p.non_partant is true)
           order by p.pred_rank)
    end as rang,
    -- Une course est jugée dès qu'une arrivée nous est parvenue.
    bool_or(p.actual_place is not null) over (
      partition by p.reunion_date, p.hippodrome, p.course_num) as jugee
  from modele_prediction_engagement.predictions_log p
  where p.model_version = crosswell_modele_client()
    and p.hippodrome is not null
    and p.hippodrome <> '?'
)
select
  reunion_date,
  hippodrome,
  course_num,
  course_nom,
  categorie,
  is_handicap,
  distance,
  field_size,
  heure_depart,
  horse_num,
  horse_name,
  rang,
  p_win,
  p_place,
  actual_place,
  cote,
  non_partant
from base
-- LE VERROU : seules les courses jugées sortent d'ici.
where jugee;

comment on view public.resultats_publics is
  'Arrivées publiques des courses JUGÉES : notre favori, la probabilité annoncée, la place réelle, la cote de clôture. Même source et mêmes règles que `client_predictions`, que lit l''application. Une course pas encore jugée n''y a aucune ligne — le verrou est dans la clause WHERE, pas dans le code appelant.';

-- ────────────────────────────────────────────────────────────────────────────
-- LE PROGRAMME — courses pas encore jugées, SANS AUCUNE PROBABILITÉ.
--
-- Une ligne par COURSE, jamais par partant : un visiteur sans compte n'a pas à
-- connaître la composition d'une course à venir. Et cette vue ne porte ni
-- `p_win`, ni `p_place`, ni `pred_rank`, ni `cote`. Il n'y a rien à filtrer.
-- ────────────────────────────────────────────────────────────────────────────
create or replace view public.programme_public as
select
  p.reunion_date,
  p.hippodrome,
  p.course_num,
  max(p.course_nom)   as course_nom,
  max(p.categorie)    as categorie,
  bool_or(p.is_handicap) as is_handicap,
  max(p.distance)     as distance,
  max(p.field_size)   as field_size,
  max(p.heure_depart) as heure_depart,
  count(*) filter (where p.non_partant is not true) as partants,
  count(*) filter (where p.non_partant is true)     as non_partants
from modele_prediction_engagement.predictions_log p
where p.model_version = crosswell_modele_client()
  and p.hippodrome is not null
  and p.hippodrome <> '?'
group by p.reunion_date, p.hippodrome, p.course_num
having not bool_or(p.actual_place is not null);

comment on view public.programme_public is
  'Programme des courses pas encore jugées, pour un visiteur sans compte. Ne porte AUCUNE colonne de probabilité, de rang ni de cote : il n''y a rien à masquer.';

-- ────────────────────────────────────────────────────────────────────────────
-- Les droits : lecture publique sur ces deux vues, et sur elles seules.
--
-- SURTOUT PAS `security_invoker = true`, et c'est contre-intuitif : la vue
-- s'exécuterait alors avec les droits de l'APPELANT, or `anon` n'en a aucun sur
-- `predictions_log`. Elle renverrait une erreur de permission, pas des données.
-- On garde donc le comportement par défaut — les droits du PROPRIÉTAIRE de la
-- vue — : c'est lui qui ouvre le sous-ensemble filtré, pendant que la table
-- source reste fermée à `anon`.
-- ────────────────────────────────────────────────────────────────────────────
grant select on public.resultats_publics to anon, authenticated;
grant select on public.programme_public  to anon, authenticated;

commit;
