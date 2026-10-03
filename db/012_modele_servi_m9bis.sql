-- =============================================================================
-- 012 — Le modèle servi aux clients devient `M9bis.niveau`.
--
-- À appliquer sur le projet Supabase CROSSWELL, après 011. Idempotent.
-- Appliquée en production le 03/10/2026 avec l'accord du fondateur.
--
-- CE QUI CHANGE, ET CE QUE ÇA DÉPLACE
--
-- `crosswell_modele_client()` est la garde : toutes les vues `client_*` filtrent
-- dessus. Elle doit rester d'accord avec `MODELE_CLIENT` (src/config/app.ts) —
-- une divergence VIDE l'application en silence, car l'intersection des deux
-- filtres est nulle et rien ne lève d'erreur. Les deux changent ensemble.
--
-- POURQUOI M9bis, ET CE QUE LA MESURE DIT VRAIMENT
--
-- Sur les 486 courses jugées communes aux treize modèles généralistes
-- (11/09 → 03/10/2026), M9bis.niveau trouve le gagnant dans 24,5 % des courses
-- contre 20,8 % pour `rating+forme.v1`, et place son rang 1 dans 57,2 % contre
-- 51,9 %.
--
-- HONNÊTETÉ SUR CES CHIFFRES : l'écart sur la VICTOIRE n'est pas significatif
-- en comparaison appariée (McNemar : 64 courses gagnées que v1 rate, 46
-- l'inverse, chi2 = 2,63 sous le seuil de 3,84). L'écart sur le PODIUM est à la
-- limite (chi2 = 3,86). Le choix ne repose donc pas sur une preuve statistique
-- de supériorité, mais sur une décision du fondateur, prise en connaissance de
-- cette réserve : v1 était DERNIÈRE des treize sur le taux de place, et c'est
-- l'écart le plus constant du jeu de données.
--
-- CE QUI A ÉTÉ VÉRIFIÉ AVANT LA BASCULE
--
-- - Couverture : M9bis couvre exactement les mêmes courses que v1 depuis le
--   10/09/2026, sans trou de jour. Aucun écran ne se videra.
-- - Complétude : ZÉRO valeur manquante sur p_win, p_place, id_fg, heure_depart
--   et field_size — v1, elle, a 99 lignes sans probabilité et 3 698 sans heure
--   de départ. Le nouveau modèle est plus propre que l'ancien.
-- - Échelle des probabilités comparable : p_win moyenne du rang 1 à 0,201
--   contre 0,200, médiane 0,188 contre 0,183. Les seuils publiés
--   (`SEUILS_CONFIANCE`, `MARGE_VALUE`) gardent le même sens.
--
-- CE QUE LE CLIENT VERRA CHANGER, ET QU'IL FAUT ASSUMER
--
-- « Nos résultats » recalcule TOUT sur le modèle servi : l'historique public
-- passe de 1 052 à 496 courses jugées, et repart du 10/09/2026 au lieu du
-- 11/08. Les taux affichés changent donc le jour de la bascule. C'est pour cela
-- que `DATE_CHANGEMENT_MODELE` est publiée à l'écran : des chiffres qui bougent
-- sans explication datée ressemblent à une retouche, jamais à de la rigueur.
--
-- Appliquée à 18 h 40, APRÈS que les seize courses du jour aient été courues et
-- jugées : aucun client n'avait de pronostic en cours.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.crosswell_modele_client()
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  SET search_path = ''
AS $$
  SELECT 'M9bis.niveau'::text
$$;

COMMENT ON FUNCTION public.crosswell_modele_client() IS
  'Version de modèle servie aux clients (M9bis.niveau depuis le 03/10/2026). Doit concorder avec MODELE_CLIENT dans src/config/app.ts : une divergence vide l''application sans lever d''erreur.';

COMMIT;
