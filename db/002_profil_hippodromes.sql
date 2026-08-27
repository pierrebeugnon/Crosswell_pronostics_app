-- =============================================================================
-- 002 — Profil de piste par hippodrome, pour les pages hippodromes du client.
--
-- À appliquer sur le projet Supabase CROSSWELL. Idempotent : rejouable sans
-- effet de bord. Suppose 001_acces_client.sql déjà appliqué.
--
-- CE QUE CES VUES EXPOSENT, ET CE QU'ELLES N'EXPOSENT PAS
--
-- La source est `modele_prediction_engagement.tracking_courses`, alimentée par
-- les relevés de tracking. On n'en publie QUE des agrégats par hippodrome :
-- un train moyen sur mille sept cents courses, une vitesse moyenne par tranche
-- de distance. Aucune ligne de cheval, aucune course identifiable, aucun
-- sectionnel individuel ne franchit la frontière — ces vues ne touchent même
-- pas `tracking_partants`.
--
-- LE SEUIL DE VINGT COURSES EST DANS LA VUE, PAS DANS L'INTERFACE.
-- Une vitesse moyenne calculée sur trois courses n'est pas une caractéristique
-- de piste, c'est le hasard de trois après-midi. Filtrer côté serveur garantit
-- qu'aucun écran, présent ou futur, ne pourra publier ce bruit par distraction.
--
-- CE QUI N'EXISTE PAS, ET QU'IL NE FAUT PAS CHERCHER ICI
--   • Le TRACÉ (corde, ligne droite, dénivelé). `engagements.hippodromes` a
--     bien une colonne `corde`, mais la table est vide : douze lignes, tout à
--     NULL. Les pages client n'affichent donc aucun tracé.
--   • Le TERRAIN (souple, bon, collant, PSF). Aucune table ne le porte.
-- =============================================================================

-- ##### BLOC A — profil global d'un hippodrome #####

BEGIN;

CREATE OR REPLACE VIEW public.client_hippodromes AS
SELECT c.hippodrome,
       count(*)::integer                              AS courses,
       count(c.train_600_s)::integer                  AS courses_chronometrees,
       min(c.jour)                                    AS depuis,
       max(c.jour)                                    AS jusqua,
       -- Le TRAIN : moyenne des derniers 600 m des partants classés. Plus il
       -- est bas, plus la piste finit vite.
       round(avg(c.train_600_s)::numeric, 2)          AS train_600_s,
       round(avg(c.vitesse_moy)::numeric, 2)          AS vitesse_moy,
       -- L'écart-type dit si la piste est régulière ou si elle dépend beaucoup
       -- du jour. Sans lui, deux pistes de même moyenne paraissent identiques.
       round(stddev_pop(c.vitesse_moy)::numeric, 2)   AS vitesse_ecart_type,
       round(avg(c.distance_m)::numeric)::integer     AS distance_moy,
       min(c.distance_m)                              AS distance_min,
       max(c.distance_m)                              AS distance_max,
       round(avg(c.n_partants)::numeric, 1)           AS partants_moy
  FROM modele_prediction_engagement.tracking_courses c
 GROUP BY c.hippodrome
HAVING count(*) >= 20;

COMMENT ON VIEW public.client_hippodromes IS
  'Profil de piste agrégé par hippodrome (tracking). Aucune donnée individuelle. Réservé au rôle authenticated.';

COMMIT;

-- ##### BLOC B — profil par tranche de distance #####

BEGIN;

CREATE OR REPLACE VIEW public.client_hippodrome_distances AS
SELECT c.hippodrome,
       -- Mêmes bornes que `trancheDistance()` côté application : deux
       -- découpages différents produiraient deux vérités sur le même écran.
       CASE
         WHEN c.distance_m IS NULL  THEN 'Non précisée'
         WHEN c.distance_m < 1400   THEN 'Sprint'
         WHEN c.distance_m < 1800   THEN 'Mile'
         WHEN c.distance_m < 2200   THEN 'Intermédiaire'
         ELSE                            'Tenue'
       END                                           AS tranche,
       count(*)::integer                             AS courses,
       round(avg(c.vitesse_moy)::numeric, 2)         AS vitesse_moy,
       round(avg(c.train_600_s)::numeric, 2)         AS train_600_s
  FROM modele_prediction_engagement.tracking_courses c
 WHERE c.hippodrome IN (SELECT hippodrome FROM public.client_hippodromes)
 GROUP BY 1, 2
HAVING count(*) >= 10;

COMMENT ON VIEW public.client_hippodrome_distances IS
  'Vitesse moyenne par tranche de distance et par hippodrome. Réservé au rôle authenticated.';

COMMIT;

-- ##### BLOC C — les droits #####

BEGIN;

REVOKE ALL ON public.client_hippodromes            FROM PUBLIC, anon;
REVOKE ALL ON public.client_hippodrome_distances   FROM PUBLIC, anon;
GRANT  SELECT ON public.client_hippodromes          TO authenticated;
GRANT  SELECT ON public.client_hippodrome_distances TO authenticated;

COMMIT;

-- ##### BLOC D — index de service #####

BEGIN;

SET LOCAL lock_timeout = '15s';

CREATE INDEX IF NOT EXISTS tracking_courses_hippodrome_idx
  ON modele_prediction_engagement.tracking_courses (hippodrome);

COMMIT;

-- =============================================================================
-- VÉRIFICATIONS
--   SELECT count(*) FROM public.client_hippodromes;
--   SELECT hippodrome, courses, vitesse_moy FROM public.client_hippodromes
--    ORDER BY courses DESC LIMIT 10;
--   SELECT has_table_privilege('anon','public.client_hippodromes','SELECT');  -- false
--
-- ANNULATION
--   DROP VIEW public.client_hippodrome_distances;
--   DROP VIEW public.client_hippodromes;
-- =============================================================================
