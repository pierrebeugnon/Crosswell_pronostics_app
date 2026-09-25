-- =============================================================================
-- 003 — Les non-partants dans la vue client, et une vue enfin en LECTURE SEULE.
--
-- À appliquer sur le projet Supabase CROSSWELL, après 001 et 002. Idempotent.
--
-- CE QUE CE FICHIER RÈGLE
--
-- 1. UNE FAILLE D'ÉCRITURE. `client_predictions` était une vue « simple » (une
--    table, un WHERE, aucune agrégation) : Postgres la rend donc AUTOMATIQUEMENT
--    modifiable. Et le GRANT SELECT de 001 s'ajoutait aux privilèges par défaut
--    de Supabase au lieu de les remplacer : `authenticated` gardait INSERT,
--    UPDATE, DELETE et TRUNCATE. La vue étant exécutée avec les droits de son
--    propriétaire (`postgres`), n'importe quel compte connecté pouvait modifier
--    ou effacer les prédictions du modèle servi par un simple appel REST.
--    Le bloc C retire ces droits explicitement ; la fonction de fenêtre ajoutée
--    au bloc B rend en plus la vue non modifiable par construction. Les deux
--    protections sont voulues : aucune ne doit dépendre de l'autre.
--
-- 2. LES NON-PARTANTS. La table les marque depuis le 8 septembre 2026
--    (`non_partant`, posé par le relevé PMU du soir ou par la prédiction du
--    matin), mais la vue ne les transmettait pas. Côté application, un rang 1
--    retiré le matin arrivait avec `actual_place = NULL`, exactement comme un
--    cheval arrivé au-delà du dernier classé relevé : la course comptait comme
--    un échec, et rien ne permettait de distinguer les deux cas.
--
--    `rang_effectif` est le rang parmi les chevaux réellement au départ. La
--    formule est celle de `public.monitoring_predictions` (outil interne,
--    migration 018) : les deux outils désignent ainsi le même « rang 1 ».
--    Sémantique de `non_partant` : TRUE = déclaré non partant ; FALSE = vérifié
--    partant ; NULL = jamais vérifié — traité comme partant, faute de mieux.
--
-- 3. L'HEURE DE DÉPART, renseignée depuis le 1er septembre 2026 (heure de Paris).
--
-- CE QUI N'EST VOLONTAIREMENT PAS EXPOSÉ
--
-- `cote_avant` et `cote_matin` restent hors de la vue. Des écarts au marché
-- calculés sur une cote relevée AVANT le départ et servis avant la course
-- relèvent d'un service d'aide à la mise ; l'arbitrage n'est pas rendu. La vue
-- ne sert donc que la cote de clôture, relevée après la course.
--
-- COMPATIBILITÉ
--
-- Les colonnes existantes gardent leur nom, leur type et leur ordre ; les
-- nouvelles sont ajoutées à la fin, ce qu'exige CREATE OR REPLACE VIEW. Une
-- version de l'application antérieure à ce fichier continue de fonctionner.
-- =============================================================================

-- ##### BLOC B — la vue client, étendue #####

BEGIN;

CREATE OR REPLACE VIEW public.client_predictions AS
SELECT p.reunion_date,
       p.hippodrome,
       p.course_num,
       p.course_nom,
       p.categorie,
       p.is_handicap,
       p.distance,
       p.field_size,
       p.horse_num,
       p.horse_name,
       p.id_fg,
       p.pred_rank,
       p.p_win,
       p.p_place,
       p.actual_place,
       p.model_version,
       p.cote,
       p.rapport_gagnant,
       p.rapport_place,
       -- Ajouts de 003, toujours en fin de liste.
       p.non_partant,
       CASE
         WHEN p.non_partant IS TRUE THEN NULL::bigint
         ELSE rank() OVER (
           PARTITION BY p.model_version, p.reunion_date, p.hippodrome, p.course_num,
                        (p.non_partant IS TRUE)
           ORDER BY p.pred_rank NULLS LAST
         )
       END AS rang_effectif,
       p.heure_depart
  FROM modele_prediction_engagement.predictions_log p
 WHERE p.model_version = public.crosswell_modele_client()
   AND p.hippodrome IS NOT NULL
   AND p.hippodrome <> '?';

COMMENT ON VIEW public.client_predictions IS
  'Prédictions exposées à la plateforme client. Un seul modèle, lecture seule, réservé au rôle authenticated.';
COMMENT ON COLUMN public.client_predictions.non_partant IS
  'TRUE = déclaré non partant ; FALSE = vérifié partant ; NULL = jamais vérifié (traité comme partant).';
COMMENT ON COLUMN public.client_predictions.rang_effectif IS
  'Rang parmi les chevaux au départ (NULL pour un non-partant). Même formule que monitoring_predictions.';

COMMIT;

-- ##### BLOC C — lecture seule, pour de bon #####
-- REVOKE ALL puis GRANT SELECT : c'est la seule écriture qui remplace les
-- privilèges par défaut au lieu de s'y ajouter. Appliqué aussi aux deux vues de
-- 002, qui avaient hérité du même défaut (sans conséquence pratique, puisque
-- des vues agrégées ne sont pas modifiables, mais un droit qui ne sert pas est
-- un droit qui finit par servir).

BEGIN;

REVOKE ALL ON public.client_predictions FROM PUBLIC, anon, authenticated;
GRANT  SELECT ON public.client_predictions TO authenticated;

REVOKE ALL ON public.client_hippodromes FROM PUBLIC, anon, authenticated;
GRANT  SELECT ON public.client_hippodromes TO authenticated;

REVOKE ALL ON public.client_hippodrome_distances FROM PUBLIC, anon, authenticated;
GRANT  SELECT ON public.client_hippodrome_distances TO authenticated;

COMMIT;

-- =============================================================================
-- VÉRIFICATIONS À FAIRE APRÈS APPLICATION
--
--   -- 1. La vue n'est plus modifiable (NO / NO attendus) :
--   SELECT is_updatable, is_insertable_into
--     FROM information_schema.views
--    WHERE table_schema = 'public' AND table_name = 'client_predictions';
--
--   -- 2. `authenticated` n'a plus que SELECT sur les trois vues client :
--   SELECT table_name, string_agg(privilege_type, ',')
--     FROM information_schema.role_table_grants
--    WHERE table_schema = 'public' AND grantee = 'authenticated'
--      AND table_name IN ('client_predictions', 'client_hippodromes', 'client_hippodrome_distances')
--    GROUP BY 1;
--
--   -- 3. Un seul rang effectif 1 par course (hors ex æquo du modèle) :
--   SELECT reunion_date, hippodrome, course_num, count(*)
--     FROM public.client_predictions WHERE rang_effectif = 1
--    GROUP BY 1, 2, 3 HAVING count(*) > 1;
--
-- CE QUE CE FICHIER NE RÈGLE PAS — À TRANCHER
--
--   `public.monitoring_predictions` (outil interne) est lisible par TOUT compte
--   connecté : les quatorze modèles, y compris les prédictions du lendemain.
--   Tant que l'inscription libre est ouverte, c'est un accès gratuit à tout ce
--   que la plateforme vend. On n'y touche pas ici : l'outil interne en dépend,
--   et la correction (rôle dédié ou vérification d'un claim) se décide avec lui.
-- =============================================================================
