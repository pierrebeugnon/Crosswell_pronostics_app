-- 014 — L'ÉTIQUETTE DU MODÈLE SORT DE LA SURFACE PUBLIQUE
--
-- APPLIQUÉE EN PRODUCTION LE 19/10/2026.
--
-- La 013 avait dû accorder `execute` sur `crosswell_modele_client()` à `anon`,
-- parce qu'une vue délègue les droits sur les TABLES qu'elle lit mais PAS
-- l'EXECUTE sur les FONCTIONS qu'elle appelle — celles-ci sont vérifiées
-- contre l'appelant. Effet de bord découvert en interrogeant l'API avec la clé
-- anon : la fonction devenait appelable en RPC et livrait l'identifiant interne
-- du modèle (`M9bis.niveau`) à n'importe quel visiteur. Or le site ne montre
-- jamais cet identifiant ; il parle du « Score Crosswell ».
--
-- LE CORRECTIF TIENT EN UNE IDÉE : ce que la vue doit lire devient une TABLE,
-- dont l'accès EST délégué par la vue. Plus aucun droit n'est nécessaire pour
-- `anon`, et les deux portes se referment.

begin;

create table if not exists public.crosswell_modele_servi (
  -- Une seule ligne, et elle NE PEUT PAS diverger de la fonction : la
  -- contrainte la compare à `crosswell_modele_client()`, qui est IMMUTABLE et
  -- donc utilisable dans un CHECK. Une migration qui changerait le modèle sans
  -- mettre cette table à jour échouerait, au lieu de laisser les deux se
  -- contredire en silence — c'est-à-dire de servir au public les pronostics
  -- d'un modèle qui n'est plus celui des clients.
  version text primary key,
  constraint crosswell_modele_servi_accord_fonction
    check (version = public.crosswell_modele_client())
);

insert into public.crosswell_modele_servi (version)
values (public.crosswell_modele_client())
on conflict (version) do nothing;

comment on table public.crosswell_modele_servi is
  'Miroir, en table, de `crosswell_modele_client()`. Existe pour que les vues publiques filtrent sans qu''`anon` ait besoin d''exécuter la fonction — ce qui exposerait l''identifiant interne du modèle en RPC. Aucun GRANT : les vues délèguent l''accès.';

-- Les deux vues de la 013 lisent désormais la table plutôt que la fonction.
-- (Corps identique par ailleurs : seul le filtre change, `join ... m on
-- m.version = p.model_version` au lieu de `where p.model_version = f()`.)
create or replace view public.resultats_publics as
with base as (
  select
    p.reunion_date, p.hippodrome, p.course_num, p.course_nom, p.categorie,
    p.is_handicap, p.distance, p.field_size, p.heure_depart,
    p.horse_num, p.horse_name, p.p_win, p.p_place, p.actual_place,
    p.cote, p.non_partant,
    case when p.non_partant is true then null
         else rank() over (
           partition by p.reunion_date, p.hippodrome, p.course_num, (p.non_partant is true)
           order by p.pred_rank)
    end as rang,
    bool_or(p.actual_place is not null) over (
      partition by p.reunion_date, p.hippodrome, p.course_num) as jugee
  from modele_prediction_engagement.predictions_log p
  join public.crosswell_modele_servi m on m.version = p.model_version
  where p.hippodrome is not null
    and p.hippodrome <> '?'
)
select
  reunion_date, hippodrome, course_num, course_nom, categorie, is_handicap,
  distance, field_size, heure_depart, horse_num, horse_name,
  rang, p_win, p_place, actual_place, cote, non_partant
from base
where jugee;

comment on view public.resultats_publics is
  'Arrivées publiques des courses JUGÉES : notre favori, la probabilité annoncée, la place réelle, la cote de clôture. Même source et mêmes règles que client_predictions. Une course pas encore jugée n''y a aucune ligne.';

create or replace view public.programme_public as
select
  p.reunion_date, p.hippodrome, p.course_num,
  max(p.course_nom)   as course_nom,
  max(p.categorie)    as categorie,
  bool_or(p.is_handicap) as is_handicap,
  max(p.distance)     as distance,
  max(p.field_size)   as field_size,
  max(p.heure_depart) as heure_depart,
  count(*) filter (where p.non_partant is not true) as partants,
  count(*) filter (where p.non_partant is true)     as non_partants
from modele_prediction_engagement.predictions_log p
join public.crosswell_modele_servi m on m.version = p.model_version
where p.hippodrome is not null
  and p.hippodrome <> '?'
group by p.reunion_date, p.hippodrome, p.course_num
having not bool_or(p.actual_place is not null);

comment on view public.programme_public is
  'Programme des courses pas encore jugées, pour un visiteur sans compte. Ne porte AUCUNE colonne de probabilité, de rang ni de cote.';

-- On referme les deux portes. `authenticated` garde l'exécution : l'application
-- en a besoin pour `client_predictions`.
revoke execute on function public.crosswell_modele_client() from anon;
revoke all on public.crosswell_modele_servi from anon, authenticated;

commit;

-- VÉRIFIÉ EN HTTP AVEC LA CLÉ ANON, APRÈS APPLICATION :
--   rpc/crosswell_modele_client   401 permission denied
--   crosswell_modele_servi        401 permission denied
--   resultats_publics             200 (Auteuil, notre rang 1 gagnant)
--   programme_public              200
-- et côté application : 191 lignes du jour toujours lues par `client_predictions`.
