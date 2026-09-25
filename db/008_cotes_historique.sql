-- =============================================================================
-- 008 — L'historique des cotes, servi au client.
--
-- À appliquer sur le projet Supabase CROSSWELL, après 007. Idempotent.
-- Appliquée en production le 25/09/2026 avec l'accord du fondateur.
--
-- POURQUOI
--
-- `modele_prediction_engagement.cotes_jour` est alimentée depuis le 25/09/2026
-- par la tâche `crosswell-cotes-avant` (toutes les 30 minutes, de 11 h à 19 h) :
-- une ligne par partant et par relevé, clé (date, hippodrome, course, numéro,
-- relevé). C'est ce qui manquait à l'évolution de la cote dessinée par les
-- maquettes (design/INTEGRATION.md, A4) : jusqu'ici la courbe était SIMULÉE
-- dans l'app, et coupée en production pour ne pas faire passer une invention
-- pour une mesure.
--
-- CE QUE LA VUE SERT
--
-- Les relevés des courses du modèle servi, et rien d'autre : pas de cote d'une
-- course que le client ne voit pas, pas de cote nulle ou absurde (<= 1). La
-- vue est réservée au rôle `authenticated`, comme toutes les vues `client_*`.
--
-- `heure` est l'heure de Paris du relevé, au format 'HH:MM', comme
-- `heure_depart` de `client_predictions` : l'application raisonne en minutes
-- depuis minuit, heure de Paris, et n'a pas à reconvertir un fuseau.
--
-- CE QUI RESTE VOLONTAIREMENT DEHORS
--
-- L'ÉCART AU MARCHÉ NE SE CALCULE PAS SUR CES COTES. Décision du fondateur du
-- 25/09/2026 : on montre le marché (la cote du moment et son évolution), on ne
-- dit pas avant la course qu'un cheval « vaut mieux que sa cote ». L'« Écart + »
-- reste calculé sur la cote de CLÔTURE, après l'arrivée (`client_predictions`
-- .cote, migration 003) : un écart au marché servi AVANT le départ ferait de
-- Crosswell un service de value bets, ce que le positionnement exclut (voir
-- AVERTISSEMENT dans src/config/app.ts).
--
-- La vue ne filtre pas par formule : une cote est une donnée publique de
-- marché, pas un pronostic. Les courses verrouillées (007) le restent — leur
-- pronostic n'est pas servi, et la fiche d'un partant ne s'ouvre pas.
-- =============================================================================

BEGIN;

CREATE OR REPLACE VIEW public.client_cotes AS
SELECT c.reunion_date,
       c.hippodrome,
       c.course_num,
       c.horse_num,
       to_char(c.releve_le AT TIME ZONE 'Europe/Paris', 'HH24:MI') AS heure,
       c.releve_le,
       c.cote
  FROM modele_prediction_engagement.cotes_jour c
 WHERE c.cote IS NOT NULL
   AND c.cote > 1
   AND EXISTS (
         SELECT 1
           FROM modele_prediction_engagement.predictions_log l
          WHERE l.model_version = public.crosswell_modele_client()
            AND l.reunion_date = c.reunion_date
            AND l.hippodrome = c.hippodrome
            AND l.course_num = c.course_num
       );

COMMENT ON VIEW public.client_cotes IS
  'Relevés de cote des courses du modèle servi (tâche crosswell-cotes-avant, toutes les 30 minutes de 11 h à 19 h). Heure de Paris. Réservé au rôle authenticated. Ne sert pas au calcul de l''écart au marché, qui reste sur la cote de clôture.';

REVOKE ALL ON public.client_cotes FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.client_cotes TO authenticated;

COMMIT;
