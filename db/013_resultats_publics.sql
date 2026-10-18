-- 013 — LES RÉSULTATS, EN LECTURE PUBLIQUE
--
-- Ouvre à un visiteur SANS COMPTE les arrivées des courses déjà jugées, et le
-- seul programme des courses à venir. C'est ce que les pages /resultats du site
-- vitrine serviront, et la base de leur référencement.
--
-- ════════════════════════════════════════════════════════════════════════════
-- LE VERROU EST DANS LE SQL, PAS DANS LE CODE, et c'est le point important.
--
-- `crosswell_acces_complet()` renvoie VRAI pour tout rôle non authentifié : un
-- site qui lirait `client_predictions` avec une clé de service verrait donc
-- TOUT déverrouillé, et il faudrait refiltrer à la main dans du TypeScript —
-- c'est-à-dire à l'endroit le plus facile à oublier.
--
-- Ici, une course pas encore jugée N'A AUCUNE LIGNE dans `resultats_publics`.
-- Il n'existe pas de probabilité à cacher : elle n'est pas servie. Et
-- `programme_public` ne porte AUCUNE colonne de probabilité, de rang ni de
-- cote — pas même nulle. Une erreur de code ne peut pas les faire apparaître.
-- ════════════════════════════════════════════════════════════════════════════
--
-- CE QUE LA SOURCE OFFICIELLE COUVRE RÉELLEMENT — mesuré le 18/10/2026 sur les
-- 21 derniers jours, et c'est une limite à connaître avant de lire ces vues :
--
--   `modele_prediction_engagement.pmu_courses` ne contient QUE DU PLAT : 265
--   courses, aucune haies, aucun steeple. Auteuil n'y figure pas.
--   Rapprochées de nos prédictions : 205 courses sur 451, soit 45,5 %.
--
-- Donc `reunion_num`, `discipline`, `allocation`, `terrain` et `statut` sont
-- renseignés sur environ 45 % des courses, et nuls sur le reste. La jointure
-- est volontairement EXTERNE : nos courses restent toutes présentes, et
-- l'absence se dit à l'écran plutôt que de faire disparaître une ligne.
--
-- Les noms d'hippodrome divergent entre les deux sources (« LYON PARILLY » vs
-- « LYON-PARILLY », « MAR.BORELY » vs « BORELY »). D'où la clé normalisée
-- ci-dessous : capitales, accents retirés, tout ce qui n'est pas alphanumérique
-- ramené à une espace. Le rapprochement se fait sur l'égalité, ou à défaut sur
-- le premier mot — ce qui rattrape « NANCY » / « NANCY-BRABOIS ».

begin;

-- ────────────────────────────────────────────────────────────────────────────
-- La clé de rapprochement, isolée pour que les deux vues la partagent.
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.crosswell_cle_hippodrome(nom text)
returns text
language sql
immutable
parallel safe
as $$
  select trim(regexp_replace(
           upper(translate(coalesce(nom, ''), 'ÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ', 'AAAEEEEIIOOUUUC')),
           '[^A-Z0-9]+', ' ', 'g'))
$$;

comment on function public.crosswell_cle_hippodrome(text) is
  'Nom d''hippodrome normalisé, pour rapprocher nos prédictions des données officielles dont les libellés diffèrent.';

-- ────────────────────────────────────────────────────────────────────────────
-- LES ARRIVÉES — une ligne par partant, courses JUGÉES uniquement.
-- ────────────────────────────────────────────────────────────────────────────
create or replace view public.resultats_publics as
with nos_courses as (
  select
    p.reunion_date,
    p.hippodrome,
    p.course_num,
    p.course_nom,
    p.categorie,
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
    -- Rang EFFECTIF, règle de l'application : un non-partant ne décale personne.
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
),
officiel as (
  select
    c.date,
    c.course_num,
    public.crosswell_cle_hippodrome(c.hippodrome) as cle,
    max(c.reunion_num)   as reunion_num,
    max(c.discipline)    as discipline,
    max(c.montant_prix)  as allocation,
    max(c.terrain)       as terrain,
    max(c.statut)        as statut
  from modele_prediction_engagement.pmu_courses c
  group by 1, 2, 3
)
select
  n.reunion_date,
  n.hippodrome,
  o.reunion_num,
  n.course_num,
  n.course_nom,
  n.categorie,
  o.discipline,
  n.distance,
  o.allocation,
  o.terrain,
  o.statut,
  n.field_size,
  n.heure_depart,
  n.horse_num,
  n.horse_name,
  n.rang,
  n.p_win,
  n.p_place,
  n.actual_place,
  n.cote,
  n.non_partant,
  pp.age,
  pp.sexe,
  -- Le poids officiel arrive en hectogrammes. Renseigné sur 43 % des lignes
  -- seulement : l'absence se dit à l'écran, elle ne devient pas un zéro.
  (pp.poids_monte_hg / 10.0)::numeric(5,1) as poids
from nos_courses n
left join officiel o
  on o.date = n.reunion_date
 and o.course_num = n.course_num
 and (o.cle = public.crosswell_cle_hippodrome(n.hippodrome)
      or split_part(o.cle, ' ', 1) = split_part(public.crosswell_cle_hippodrome(n.hippodrome), ' ', 1))
left join modele_prediction_engagement.pmu_partants pp
  on pp.date = n.reunion_date
 and pp.reunion_num = o.reunion_num
 and pp.course_num = n.course_num
 and pp.num_pmu = n.horse_num
-- LE VERROU : seules les courses jugées sortent d'ici.
where n.jugee;

comment on view public.resultats_publics is
  'Arrivées publiques des courses JUGÉES : notre favori, la probabilité annoncée, la place réelle. Une course pas encore jugée n''y a aucune ligne — le verrou est dans la clause WHERE, pas dans le code appelant.';

-- ────────────────────────────────────────────────────────────────────────────
-- LE PROGRAMME — courses pas encore jugées, SANS AUCUNE PROBABILITÉ.
--
-- Une ligne par COURSE, jamais par partant : un visiteur sans compte n'a pas à
-- connaître la composition détaillée d'une course à venir, et surtout cette
-- vue ne porte ni `p_win`, ni `pred_rank`, ni `cote`. Il n'y a rien à filtrer.
-- ────────────────────────────────────────────────────────────────────────────
create or replace view public.programme_public as
with nos_courses as (
  select
    p.reunion_date,
    p.hippodrome,
    p.course_num,
    max(p.course_nom)  as course_nom,
    max(p.categorie)   as categorie,
    max(p.distance)    as distance,
    max(p.field_size)  as field_size,
    max(p.heure_depart) as heure_depart,
    count(*) filter (where p.non_partant is not true) as partants,
    count(*) filter (where p.non_partant is true)     as non_partants,
    bool_or(p.actual_place is not null) as jugee
  from modele_prediction_engagement.predictions_log p
  where p.model_version = crosswell_modele_client()
    and p.hippodrome is not null
    and p.hippodrome <> '?'
  group by 1, 2, 3
),
officiel as (
  select
    c.date,
    c.course_num,
    public.crosswell_cle_hippodrome(c.hippodrome) as cle,
    max(c.reunion_num)  as reunion_num,
    max(c.discipline)   as discipline,
    max(c.montant_prix) as allocation,
    max(c.terrain)      as terrain
  from modele_prediction_engagement.pmu_courses c
  group by 1, 2, 3
)
select
  n.reunion_date,
  n.hippodrome,
  o.reunion_num,
  n.course_num,
  n.course_nom,
  n.categorie,
  o.discipline,
  n.distance,
  o.allocation,
  o.terrain,
  n.partants,
  n.non_partants,
  n.heure_depart
from nos_courses n
left join officiel o
  on o.date = n.reunion_date
 and o.course_num = n.course_num
 and (o.cle = public.crosswell_cle_hippodrome(n.hippodrome)
      or split_part(o.cle, ' ', 1) = split_part(public.crosswell_cle_hippodrome(n.hippodrome), ' ', 1))
where not n.jugee;

comment on view public.programme_public is
  'Programme des courses pas encore jugées, pour un visiteur sans compte. Ne porte AUCUNE colonne de probabilité, de rang ni de cote : il n''y a rien à masquer.';

-- ────────────────────────────────────────────────────────────────────────────
-- Les droits : lecture publique sur ces deux vues, et sur elles seules.
--
-- SURTOUT PAS `security_invoker = true`, et c'est contre-intuitif : la vue
-- s'exécuterait alors avec les droits de l'APPELANT, or `anon` n'en a aucun sur
-- `predictions_log` ni sur `pmu_courses`. Elle renverrait une erreur de
-- permission, pas des données. On garde donc le comportement par défaut — les
-- droits du PROPRIÉTAIRE de la vue — : c'est lui qui ouvre le sous-ensemble
-- filtré, pendant que les tables sources restent fermées à `anon`.
-- ────────────────────────────────────────────────────────────────────────────
grant select on public.resultats_publics to anon, authenticated;
grant select on public.programme_public  to anon, authenticated;

commit;
