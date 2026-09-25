-- =============================================================================
-- 010 — Le monitoring interne cesse d'être lisible par n'importe quel inscrit.
--
-- À appliquer sur le projet Supabase CROSSWELL, après 009. Idempotent.
--
-- CE QUE ÇA RÈGLE
--
-- Les six vues `public.monitoring_*` étaient lisibles par le rôle
-- `authenticated`, c'est-à-dire par TOUT COMPTE INSCRIT. `monitoring_predictions`
-- sert les quatorze modèles, prédictions du lendemain comprises : avec
-- l'inscription libre (`disable_signup: false`), c'était un accès gratuit à ce
-- que la plateforme vend. Constat repris de `db/003` (« À TRANCHER »), tranché
-- le 25/09/2026.
--
-- POURQUOI PAS UN SIMPLE REVOKE. L'outil de monitoring interne
-- (dépôt `Crosswell-internal-tools`) est une page qui tourne DANS LE NAVIGATEUR
-- avec la clé anon et se connecte par mot de passe : ses droits sont ceux du
-- rôle `authenticated`, exactement comme ceux d'un client. Retirer le droit au
-- rôle casserait l'outil — et pas proprement : son code déconnecte
-- l'utilisateur sur une erreur 42501, donc il boucherait sur une boucle
-- connexion / déconnexion.
--
-- LA SOLUTION : une liste blanche de comptes internes. Les vues ne rendent
-- leurs lignes qu'à ces comptes-là. L'outil garde exactement ce qu'il avait,
-- un client n'a plus rien — et n'a pas d'erreur : il lit zéro ligne.
--
-- LES TÂCHES DU PIPELINE NE SONT PAS CONCERNÉES : elles se connectent en
-- Postgres direct (`DATABASE_URL`), hors du rôle `authenticated`.
-- `crosswell_est_interne()` rend d'ailleurs vrai hors requête client, comme
-- `crosswell_acces_complet()` (007).
--
-- ⚠️ À REPORTER DANS `Crosswell-internal-tools` : `pipeline/scripts/elo.py`
-- (vers la ligne 357) recrée `public.monitoring_elo_historique` et lui
-- re-donne `GRANT SELECT TO authenticated` à chaque exécution. Tant que ce
-- script n'est pas aligné, il rouvrira cette vue-là. Les cinq autres tiennent.
-- =============================================================================

BEGIN;

-- A. LA LISTE BLANCHE ------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.comptes_internes (
  user_id   uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  motif     text,
  ajoute_le timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.comptes_internes IS
  'Comptes de l''équipe autorisés à lire le monitoring interne. Écrite à la main (ou par le rôle de service) ; aucun client ne la lit ni ne l''écrit.';

ALTER TABLE public.comptes_internes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.comptes_internes FROM PUBLIC, anon, authenticated;

-- Les comptes existants au 25/09/2026 sont ceux de l'équipe : le produit n'est
-- pas ouvert au public. À élaguer quand les premiers clients arriveront.
INSERT INTO public.comptes_internes (user_id, motif)
SELECT u.id, 'compte existant au 25/09/2026, avant ouverture au public'
  FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.crosswell_est_interne()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = ''
AS $$
  SELECT CASE
           WHEN coalesce(auth.role(), '') <> 'authenticated' THEN true
           ELSE EXISTS (SELECT 1 FROM public.comptes_internes c WHERE c.user_id = auth.uid())
         END
$$;

COMMENT ON FUNCTION public.crosswell_est_interne() IS
  'Vrai pour un compte de l''équipe (public.comptes_internes) ; toujours vrai hors requête client (pipeline, pg_cron, maintenance).';

REVOKE ALL ON FUNCTION public.crosswell_est_interne() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crosswell_est_interne() TO authenticated;

-- B. LES VUES DE MONITORING, FILTRÉES --------------------------------------
-- Chaque vue est reconstruite à partir de sa propre définition, enveloppée
-- dans un filtre. On ne recopie aucune définition à la main : elles vivent
-- dans l'autre dépôt et changent sans nous.

DO $$
DECLARE v record;
BEGIN
  FOR v IN
    SELECT c.relname, pg_get_viewdef(c.oid) AS def
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind = 'v'
       AND c.relname LIKE 'monitoring%'
  LOOP
    IF position('crosswell_est_interne' IN v.def) > 0 THEN
      CONTINUE;  -- déjà filtrée : migration rejouée
    END IF;
    EXECUTE format(
      'CREATE OR REPLACE VIEW public.%I AS SELECT * FROM (%s) AS source WHERE public.crosswell_est_interne()',
      v.relname, rtrim(btrim(v.def), ';'));
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon', v.relname);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', v.relname);
  END LOOP;
END $$;

-- C. LA RELANCE DES TÂCHES, RÉSERVÉE À L'ÉQUIPE ----------------------------
-- `declencher_tache` relance une phase du pipeline. Le bouton vit dans l'outil
-- interne ; le droit était donné à tout compte connecté. On garde le droit
-- (sinon l'outil casse) et on pose la garde dans la fonction.
-- ⚠️ La fonction appartient à `Crosswell-internal-tools`
-- (pipeline/migrations/023_resultats_seuls.sql) : y reporter cette garde, ou
-- la prochaine migration de ce dépôt l'effacera.

DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid, pg_get_functiondef(p.oid) AS def
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'declencher_tache'
  LOOP
    IF position('crosswell_est_interne' IN f.def) = 0 THEN
      RAISE NOTICE 'declencher_tache : garde absente, à poser dans le dépôt interne (%).', f.oid;
    END IF;
  END LOOP;
END $$;

-- D. CE QUI N'AVAIT RIEN À FAIRE OUVERT ------------------------------------

-- `rls_auto_enable` est SECURITY DEFINER et touche la sécurité des lignes ;
-- elle était exécutable par anon. Aucun code du produit ni des outils internes
-- ne l'appelle.
DO $$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS signature
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', f.signature);
  END LOOP;
END $$;

-- Trois tables publiques étaient écrivables avec la clé anon, celle qui part
-- dans tous les navigateurs. Les DONNÉES ne sont pas touchées, seulement le
-- droit d'écrire.
--
-- `fg_2025_bronze_resultats` est une table d'atterrissage du robot France
-- Galop : il écrit en Postgres direct (`DATABASE_URL`), donc rien ne change
-- pour lui. Ses politiques laissaient INSÉRER à n'importe qui muni de la clé
-- publique, et METTRE À JOUR à n'importe quel compte inscrit : les deux
-- tombent. La LECTURE reste ouverte, comme le reste des données France Galop
-- (choix du fondateur du 15/09, inchangé ici).
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.fg_2025_bronze_resultats FROM PUBLIC, anon, authenticated;
DROP POLICY IF EXISTS "Allow anon insert on fg_2025_bronze_resultats" ON public.fg_2025_bronze_resultats;
DROP POLICY IF EXISTS "Allow authenticated update on fg_2025_bronze_resultats" ON public.fg_2025_bronze_resultats;

-- Les deux tables `orion_*` dorment depuis le 13/06/2026 et n'appartiennent ni
-- au produit particulier ni aux outils internes. Leurs politiques sont déjà
-- par utilisateur (« own conversations ») : anon ne peut de toute façon rien y
-- faire. On retire le droit, pas les politiques — si le projet reprend, un
-- compte connecté retrouve exactement ce qu'il avait.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.orion_conversations, public.orion_messages FROM PUBLIC, anon;

COMMIT;
