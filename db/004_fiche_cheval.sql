-- =============================================================================
-- 004 — La fiche d'un cheval : profil et performances, pour les CLIENTS.
--
-- À appliquer sur le projet Supabase CROSSWELL. Idempotent : rejouable sans
-- effet de bord. Même modèle que 001 : des vues dans `public`, qui lisent les
-- tables sources avec les droits de leur propriétaire, et que seul le rôle
-- `authenticated` peut interroger.
--
-- DÉCISION DU 18/09/2026 : le fondateur lève la décision du 15/09 de ne pas
-- exposer les données France Galop (profil, performances) aux clients. Les
-- données sont relevées dans l'espace membre France Galop ; le risque tenant
-- aux droits sur ces données reste entier (voir la note de projet).
--
-- CE QUE CE FICHIER EXPOSE — et seulement cela
--
--   client_chevaux        l'identité d'un cheval : sexe, robe, naissance,
--                         père, mère, éleveur, propriétaire.
--   client_performances   ses courses : date, hippodrome, place, distance,
--                         discipline, catégorie, poids, jockey, entraîneur,
--                         allocation.
--
-- Deux restrictions, voulues :
--
--   1. Seuls les chevaux PRONOSTIQUÉS (présents dans predictions_log pour le
--      modèle servi) passent. La base en compte plus de 300 000 : un compte
--      client n'a pas à pouvoir aspirer tout le fichier.
--   2. Seules les colonnes utiles à la fiche passent. `chevaux.profile.entraineur`
--      est écarté : il contient parfois une page entière aspirée ; l'entraîneur
--      affiché est celui de la dernière course.
--
-- CE QUE CE FICHIER NE CORRIGE PAS
--
-- Les droits d'écriture de `anon` sur chevaux.performances et chevaux.profile
-- (politique « Allow all operations »), laissés en l'état par choix du
-- fondateur le 15/09/2026, et les tables du schéma `chevaux` sans RLS signalées
-- par l'advisor Supabase. Voir design/INTEGRATION.md.
-- =============================================================================

-- ##### BLOC A — les vues #####

BEGIN;

CREATE OR REPLACE VIEW public.client_chevaux AS
SELECT p."ID_FG"        AS id_fg,
       p.nom,
       p.sexe,
       p.robe,
       p.date_naissance,
       p.pere,
       p.mere,
       p.eleveur,
       p.proprietaire
  FROM chevaux.profile p
 WHERE EXISTS (
         SELECT 1
           FROM modele_prediction_engagement.predictions_log l
          WHERE l.id_fg = p."ID_FG"
            AND l.model_version = public.crosswell_modele_client()
       );

COMMENT ON VIEW public.client_chevaux IS
  'Profil des chevaux pronostiqués, pour la fiche cheval de la plateforme client. Réservé au rôle authenticated.';

CREATE OR REPLACE VIEW public.client_performances AS
SELECT f.cheval_id      AS id_fg,
       f.date,
       f.hippodrome,
       f.place,
       f.distance,
       f.specialite,
       f.categorie,
       f.poids,
       f.jockey,
       f.entraineurs    AS entraineur,
       f.gains
  FROM chevaux.performances f
 WHERE EXISTS (
         SELECT 1
           FROM modele_prediction_engagement.predictions_log l
          WHERE l.id_fg = f.cheval_id
            AND l.model_version = public.crosswell_modele_client()
       );

COMMENT ON VIEW public.client_performances IS
  'Performances des chevaux pronostiqués, pour la fiche cheval de la plateforme client. Réservé au rôle authenticated.';

COMMIT;

-- ##### BLOC B — les droits #####

BEGIN;

REVOKE ALL ON public.client_chevaux FROM PUBLIC;
REVOKE ALL ON public.client_chevaux FROM anon;
GRANT  SELECT ON public.client_chevaux TO authenticated;

REVOKE ALL ON public.client_performances FROM PUBLIC;
REVOKE ALL ON public.client_performances FROM anon;
GRANT  SELECT ON public.client_performances TO authenticated;

COMMIT;

-- ##### BLOC C — index de service #####
-- La fiche interroge un cheval à la fois (`id_fg = …`), et les deux vues
-- vérifient qu'il est pronostiqué. Sans ces index, chaque ouverture de fiche
-- parcourrait predictions_log et les 2,9 millions de performances.
-- À VÉRIFIER AVANT : un index sur chevaux.performances (cheval_id) existe
-- peut-être déjà (clé étrangère) ; celui-ci ajoute la date, pour le tri.

BEGIN;

SET LOCAL lock_timeout = '15s';

CREATE INDEX IF NOT EXISTS predictions_log_id_fg_idx
  ON modele_prediction_engagement.predictions_log (id_fg);

CREATE INDEX IF NOT EXISTS performances_cheval_date_idx
  ON chevaux.performances (cheval_id, date DESC);

COMMIT;

-- =============================================================================
-- VÉRIFICATIONS APRÈS APPLICATION
--
--   -- 1. Un cheval pronostiqué a son profil et ses performances :
--   SELECT * FROM public.client_chevaux
--    WHERE id_fg = (SELECT id_fg FROM public.client_predictions WHERE id_fg IS NOT NULL LIMIT 1);
--
--   -- 2. anon n'y a pas accès :
--   SELECT has_table_privilege('anon', 'public.client_performances', 'SELECT');  -- false
-- =============================================================================
