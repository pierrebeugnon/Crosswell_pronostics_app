-- =============================================================================
-- 001 — Ouvrir les prédictions aux CLIENTS, et rien de plus.
--
-- À appliquer sur le projet Supabase CROSSWELL. Idempotent : rejouable sans
-- effet de bord.
--
-- CE QUE CE FICHIER RÈGLE
--
-- L'outil interne lit `public.monitoring_predictions`, une vue accessible à la
-- clé anon. C'est acceptable pour un tableau de bord privé ; ça ne l'est pas
-- pour une plateforme payante. Deux fuites y sont inacceptables :
--
--   1. La clé anon voyage dans le bundle JavaScript. N'importe qui l'extrait et
--      lit les pronostics du lendemain sans payer. La vue client est donc
--      réservée au rôle `authenticated` : sans session, la requête est refusée.
--
--   2. `monitoring_predictions` expose les ONZE versions de modèle en cours
--      d'évaluation. C'est la R&D. La vue client n'en laisse passer qu'une.
--
-- LE COUPLAGE À CONNAÎTRE
--
-- Le nom du modèle servi apparaît à DEUX endroits, et ils doivent concorder :
--     ici, dans `crosswell_modele_client()` ci-dessous ;
--     dans `src/config/app.ts`, constante MODELE_CLIENT.
-- L'application filtre déjà côté requête ; la fonction est la ceinture qui
-- s'ajoute aux bretelles, pour qu'un bug d'interface ne puisse pas révéler un
-- modèle expérimental. Changer de modèle servi = modifier les deux, et rejouer
-- ce fichier.
--
-- POURQUOI UNE FONCTION ET PAS UNE CONSTANTE ÉCRITE DANS LA VUE
--
-- Parce qu'une vue se remplace en entier : y écrire le nom en dur obligerait à
-- relire toute la définition pour changer une chaîne, avec le risque d'en
-- perdre une colonne au passage. La fonction isole la seule ligne qui bouge.
-- =============================================================================

-- ##### BLOC A — le modèle servi #####

BEGIN;

CREATE OR REPLACE FUNCTION public.crosswell_modele_client()
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  -- `search_path` vide : une fonction sans chemin figé peut être détournée par
  -- un schéma placé devant `public` dans la session appelante.
  SET search_path = ''
AS $$
  SELECT 'rating+forme.v1'::text
$$;

COMMENT ON FUNCTION public.crosswell_modele_client() IS
  'Version de modèle servie aux clients. Doit concorder avec MODELE_CLIENT dans src/config/app.ts.';

COMMIT;

-- ##### BLOC B — la vue client #####
-- Séparé du bloc A : une vue se remplace, et sa redéfinition ne doit pas
-- empêcher la fonction d'exister si les colonnes évoluent.

BEGIN;

-- SECURITY DEFINER (le défaut, `security_invoker` laissé à off) est VOULU : la
-- vue lit `modele_prediction_engagement.predictions_log` avec les droits de son
-- propriétaire. Le rôle `authenticated` n'a donc jamais besoin d'un accès direct
-- à la table sous-jacente — il ne voit que ce que la vue laisse passer.
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
       p.rapport_place
  FROM modele_prediction_engagement.predictions_log p
 WHERE p.model_version = public.crosswell_modele_client()
   -- L'hippodrome inconnu ('?') vient de pages d'engagement mal formées. Une
   -- réunion sans lieu n'est consultable par personne : elle encombre la liste
   -- et n'a pas de page. On la retire ici plutôt que dans chaque écran.
   AND p.hippodrome IS NOT NULL
   AND p.hippodrome <> '?';

COMMENT ON VIEW public.client_predictions IS
  'Prédictions exposées à la plateforme client. Un seul modèle, réservé au rôle authenticated.';

COMMIT;

-- ##### BLOC C — les droits #####
-- Le bloc qui compte vraiment. Sans lui, la vue serait lisible par `anon`,
-- c'est-à-dire par quiconque extrait la clé publique du bundle.

BEGIN;

REVOKE ALL ON public.client_predictions FROM PUBLIC;
REVOKE ALL ON public.client_predictions FROM anon;
GRANT  SELECT ON public.client_predictions TO authenticated;

REVOKE ALL ON FUNCTION public.crosswell_modele_client() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.crosswell_modele_client() FROM anon;
GRANT  EXECUTE ON FUNCTION public.crosswell_modele_client() TO authenticated;

COMMIT;

-- ##### BLOC D — index de service #####
-- La plateforme interroge presque toujours par plage de dates, et la page
-- « Nos résultats » balaie tout l'historique d'un seul modèle. Sans cet index,
-- chaque chargement provoque un parcours complet de predictions_log.

BEGIN;

SET LOCAL lock_timeout = '15s';

CREATE INDEX IF NOT EXISTS predictions_log_modele_date_idx
  ON modele_prediction_engagement.predictions_log (model_version, reunion_date DESC);

COMMIT;

-- =============================================================================
-- VÉRIFICATIONS À FAIRE APRÈS APPLICATION
--
--   -- 1. La vue renvoie bien un seul modèle :
--   SELECT DISTINCT model_version FROM public.client_predictions;
--
--   -- 2. Le volume est celui attendu :
--   SELECT count(*) AS lignes,
--          count(DISTINCT (reunion_date, hippodrome, course_num)) AS courses,
--          min(reunion_date) AS debut, max(reunion_date) AS fin
--     FROM public.client_predictions;
--
--   -- 3. Le rôle anon n'y a plus accès (doit renvoyer false) :
--   SELECT has_table_privilege('anon', 'public.client_predictions', 'SELECT');
--
-- CE QUI RESTE À FAIRE À LA MAIN, HORS SQL
--
--   • Créer les comptes clients dans Supabase → Authentication → Users.
--     L'application ne propose PAS d'inscription libre : l'accès est vendu, et
--     `signInWithOtp` y est appelé avec `shouldCreateUser: false`.
--   • Désactiver « Enable email signups » dans Authentication → Providers,
--     sinon n'importe qui se crée un compte et lit les pronostics.
--   • Le temps réel (Realtime) n'est PAS activé sur cette vue : le rôle
--     `authenticated` n'a aucun droit sur la table sous-jacente, et Realtime
--     diffuse au niveau de la table. L'application le sait — elle s'abonne sans
--     bruit et se rafraîchit toutes les 90 secondes, ainsi qu'au retour dans
--     l'onglet. C'est suffisant pour un produit dont les données changent deux
--     fois par jour.
-- =============================================================================
