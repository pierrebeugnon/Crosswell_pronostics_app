-- =============================================================================
-- 006 — Le classement des jockeys et entraîneurs, précalculé chaque heure.
--
-- À appliquer sur le projet Supabase CROSSWELL, après 005. Idempotent.
-- Appliquée en production le 18/09/2026, avec l'accord du fondateur.
--
-- POURQUOI
--
-- Mesuré le 18/09/2026, juste après 005 : `client_classement` réagrège toute
-- la saison (~61 000 courses) à chaque ouverture de fiche. 0,9 s au premier
-- appel, 6,8 s au suivant (tri sur disque, lecture dispersée de la table),
-- alors que le rôle `authenticated` coupe les requêtes à 8 s. Les autres vues
-- de 005 restent sous 0,3 s : elles filtrent sur un nom, par index.
--
-- CE QUE CE FICHIER FAIT
--
--   chevaux.classement_pros   vue MATÉRIALISÉE : le même calcul que
--                             `client_classement` (totaux et rangs par
--                             personne et par année), stocké. ~10 000 lignes.
--                             Hors de l'API : personne ne la lit directement.
--   public.client_classement  redevient une simple lecture de ce stock. MÊME
--                             nom, MÊMES colonnes : l'application ne change pas.
--   tâche pg_cron             rafraîchit le stock chaque heure, à la 17e minute,
--                             sans bloquer les lectures (CONCURRENTLY).
--
-- Conséquence visible : le classement peut retarder d'une heure au plus sur
-- les autres chiffres de la fiche, qui restent calculés en direct.
--
-- Pour revenir en arrière : SELECT cron.unschedule('crosswell_classement_pros');
-- puis réappliquer la définition de `client_classement` de 005.
-- =============================================================================

-- ##### BLOC A — le stock et la vue publique #####

BEGIN;

CREATE MATERIALIZED VIEW IF NOT EXISTS chevaux.classement_pros AS
SELECT t.*,
       rank() OVER (PARTITION BY t.role, t.annee ORDER BY t.victoires DESC)   AS rang_victoires,
       rank() OVER (PARTITION BY t.role, t.annee ORDER BY t.allocations DESC) AS rang_allocations,
       count(*) OVER (PARTITION BY t.role, t.annee)                           AS effectif
  FROM (
        SELECT role, annee, nom,
               sum(montes)::int      AS montes,
               sum(victoires)::int   AS victoires,
               sum(allocations)      AS allocations
          FROM public.client_stats_pros
         GROUP BY role, annee, nom
       ) t
WITH DATA;

COMMENT ON MATERIALIZED VIEW chevaux.classement_pros IS
  'Classement annuel des jockeys et entraîneurs, précalculé (rafraîchi chaque heure par pg_cron). Lu par public.client_classement.';

-- Obligatoire pour REFRESH ... CONCURRENTLY ; sert aussi le filtre de la fiche.
CREATE UNIQUE INDEX IF NOT EXISTS classement_pros_cle_idx
  ON chevaux.classement_pros (role, annee, nom);

REVOKE ALL ON chevaux.classement_pros FROM PUBLIC, anon, authenticated;

-- Même nom, mêmes colonnes, même ordre que 005.
CREATE OR REPLACE VIEW public.client_classement AS
SELECT role, annee, nom, montes, victoires, allocations,
       rang_victoires, rang_allocations, effectif
  FROM chevaux.classement_pros;

COMMENT ON VIEW public.client_classement IS
  'Classement annuel des jockeys et entraîneurs, aux victoires et aux allocations (précalculé, voir chevaux.classement_pros). Réservé au rôle authenticated.';

REVOKE ALL ON public.client_classement FROM PUBLIC, anon;
GRANT SELECT ON public.client_classement TO authenticated;

COMMIT;

-- ##### BLOC B — le rafraîchissement horaire #####
-- pg_cron est déjà installé sur le projet. Un nom de tâche existant est
-- mis à jour, pas dupliqué.

SELECT cron.schedule(
  'crosswell_classement_pros',
  '17 * * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY chevaux.classement_pros$$
);
