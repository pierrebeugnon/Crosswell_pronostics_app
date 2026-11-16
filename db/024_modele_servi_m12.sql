-- =============================================================================
-- 024 — M12.vitesse-tendances SERVI AUX CLIENTS, REPLI M9ter INCHANGÉ
--
-- À appliquer après 023. Idempotent. Décision du fondateur le 16/11/2026
-- (« passe l'app sur M12 partout »), après la comparaison live du 31/10 au
-- 16/11 sur les mêmes 355 courses :
--
--   M12    : 1er gagnant 30,7 %, placé 57,2 %, C-index 66,90
--   TS-R   : 1er gagnant 30,1 %, placé 57,2 %, C-index 66,73
--   M9ter  : 1er gagnant 28,2 %, placé 56,6 %, C-index 66,13
--
-- M12 − TS-R : +0,6 pt de victoires [−2,3 ; +3,4], +0,17 de C-index
-- [−0,29 ; +0,65], aucune condition de course ne les départage. M12 − M9ter :
-- C-index +0,77 [+0,15 ; +1,41], victoires en obstacle +8,6 [+1,0 ; +16,2].
--
-- ## Ce qui change, et seulement ça
--
-- La fonction `crosswell_modele_client()` et la ligne « servi » de la table
-- miroir. Toutes les vues lisent `crosswell_predictions_servies` (023) : M12
-- sur toute course qu'il a prédite, M9ter sinon. M12 prédit depuis le
-- 19/10/2026 : l'historique public est donc M9ter jusqu'au 18/10, M12 depuis.
--
-- L'application filtre `model_version IN (M12, M9ter, TS.remplace)` à partir
-- de son déploiement du 16/11 : elle lit l'état d'avant comme celui d'après,
-- et se déploie AVANT cette migration.
-- =============================================================================

SET lock_timeout = '3s';

BEGIN;

CREATE OR REPLACE FUNCTION public.crosswell_modele_client()
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  SET search_path = ''
AS $$
  SELECT 'M12.vitesse-tendances'::text
$$;

COMMENT ON FUNCTION public.crosswell_modele_client() IS
  'Version de modèle servie aux clients (M12.vitesse-tendances depuis le 16/11/2026, repli M9ter.etranger course par course ; TS.remplace du 09/11 au 16/11, M9ter.etranger du 02/11 au 09/11, M9bis.niveau du 03/10 au 02/11). Doit concorder avec MODELE_CLIENT dans src/config/app.ts.';

-- Le CHECK de la table miroir n'est évalué qu'à l'écriture : la ligne suit la
-- fonction, dans la même transaction.
UPDATE public.crosswell_modele_servi
   SET version = public.crosswell_modele_client()
 WHERE role = 'servi' AND version <> public.crosswell_modele_client();

COMMIT;

REFRESH MATERIALIZED VIEW CONCURRENTLY public.journees_publiques;
