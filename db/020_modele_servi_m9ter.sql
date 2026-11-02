-- =============================================================================
-- 020 — Le modèle servi aux clients devient `M9ter.etranger`.
--
-- À appliquer sur le projet Supabase CROSSWELL, après 019. Idempotent.
-- Appliquée en production le 02/11/2026, à la demande du fondateur
-- (« c'est notre meilleur modèle actuellement »), le même soir que le
-- déploiement de `MODELE_CLIENT = 'M9ter.etranger'` (src/config/app.ts).
--
-- CE QUI CHANGE ENSEMBLE, SINON L'APPLICATION SE VIDE
--
-- 1. `crosswell_modele_client()`, la garde des vues `client_*` ;
-- 2. `crosswell_modele_servi`, son miroir en table (014), que lisent les vues
--    publiques. Le CHECK de 014 compare la ligne à la fonction : il n'est
--    évalué qu'à l'écriture, d'où la mise à jour de la ligne APRÈS la fonction,
--    dans la même transaction ;
-- 3. `MODELE_CLIENT` dans l'application, déployée juste avant.
--
-- CE QUE LA MESURE DIT
--
-- Live apparié du 11/09 au 01/11/2026, 1 137 courses communes : C-index
-- +0,59 pt [+0,30 ; +0,87] pour M9ter ; victoire du favori 27,4 % contre
-- 26,6 % (+0,7 pt [−1,0 ; +2,3], non significatif) ; place +0,7 pt. M9ter a
-- prédit toutes les journées depuis le 11/09.
--
-- CE QUE LE CLIENT VOIT CHANGER
--
-- - « Nos résultats » passe sur l'historique de M9ter depuis le 11/09/2026,
--   avec la date du changement affichée (`DATE_CHANGEMENT_MODELE`).
-- - Les chances sont annoncées à la température du contrat de M9ter (depuis
--   le 20/10) : plus franches que celles de M9bis. Les seuils de confiance
--   passent de 28 / 18 % à 41 / 25 % pour garder les mêmes parts de courses.
-- - ⚠️ Toute mesure de p_win de l'historique enjambe le 20/10, date du
--   changement de température de M9ter : deux échelles s'y mélangent.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.crosswell_modele_client()
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  SET search_path = ''
AS $$
  SELECT 'M9ter.etranger'::text
$$;

COMMENT ON FUNCTION public.crosswell_modele_client() IS
  'Version de modèle servie aux clients (M9ter.etranger depuis le 02/11/2026, M9bis.niveau du 03/10 au 02/11). Doit concorder avec MODELE_CLIENT dans src/config/app.ts : une divergence vide l''application sans lever d''erreur.';

UPDATE public.crosswell_modele_servi
   SET version = public.crosswell_modele_client()
 WHERE version <> public.crosswell_modele_client();

INSERT INTO public.crosswell_modele_servi (version)
VALUES (public.crosswell_modele_client())
ON CONFLICT (version) DO NOTHING;

COMMIT;

-- Les journées publiques sont une vue matérialisée (017), rafraîchie toutes les
-- 10 min : on la rafraîchit tout de suite pour que le site ne serve pas
-- l'ancien modèle jusque-là.
REFRESH MATERIALIZED VIEW CONCURRENTLY public.journees_publiques;
