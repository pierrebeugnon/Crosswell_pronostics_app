-- =============================================================================
-- 011 — La suppression d'un compte laisse une trace, pour qu'aucun prélèvement
--       ne lui survive.
--
-- À appliquer sur le projet Supabase CROSSWELL, après 010. Idempotent.
--
-- POURQUOI
--
-- `public.abonnements.user_id` est en ON DELETE CASCADE (007, bloc A), et cette
-- table est le SEUL endroit du système où vivent `stripe_customer_id` et
-- `stripe_subscription_id`. Supprimer le compte efface donc le lien avec Stripe
-- AVANT qu'on s'en soit servi : l'abonnement continue de prélever, et plus rien,
-- dans la base, ne dit lequel annuler.
--
-- Cette table est la PIERRE TOMBALE. Elle est écrite AVANT la suppression et ne
-- porte AUCUNE clé étrangère vers `auth.users` : c'est la condition pour qu'elle
-- survive à l'utilisateur. Si la procédure s'arrête en chemin (fonction
-- interrompue, Stripe indisponible), c'est elle qui permet de la reprendre —
-- sans elle, l'information est perdue pour toujours.
--
-- CE QU'ELLE NE CONTIENT PAS : ni e-mail, ni prénom, ni rien de nominatif.
-- `user_id` n'est plus qu'un identifiant orphelin ; `stripe_customer_id` est la
-- seule clé de rapprochement avec les factures, que le droit comptable impose de
-- conserver DIX ANS (code de commerce, L123-22 ; six ans pour le fisc, LPF
-- L102 B). C'est l'exception de l'article 17.3.b du RGPD.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.suppressions_comptes (
  user_id             uuid PRIMARY KEY,
  stripe_customer_id  text,
  -- Les abonnements Stripe annulés, dans l'ordre où ils l'ont été.
  abonnements_annules text[] NOT NULL DEFAULT '{}',
  demande_le          timestamptz NOT NULL DEFAULT now(),
  annule_le           timestamptz,
  client_supprime_le  timestamptz,
  compte_supprime_le  timestamptz,
  -- Le dernier obstacle rencontré, en clair. NULL quand tout est allé au bout.
  erreur              text
);

COMMENT ON TABLE public.suppressions_comptes IS
  'Trace des suppressions de compte : ce qui a été annulé chez Stripe, et jusqu''où la procédure est allée. Sans clé étrangère, pour survivre à l''utilisateur. Aucun client ne la lit ni ne l''écrit.';

-- Même régime que `stripe_evenements` (007) : RLS active, aucune politique, tous
-- droits révoqués. Seul le rôle de service (les fonctions Edge) y touche.
ALTER TABLE public.suppressions_comptes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.suppressions_comptes FROM PUBLIC, anon, authenticated;

-- Les suppressions à reprendre à la main : tout ce qui n'est pas allé au bout.
CREATE INDEX IF NOT EXISTS suppressions_comptes_inachevees
  ON public.suppressions_comptes (demande_le DESC)
  WHERE compte_supprime_le IS NULL;

COMMIT;

-- ##### VÉRIFICATIONS, après application #####
--
-- 1. La table est bien fermée aux clients :
--      SELECT has_table_privilege('authenticated', 'public.suppressions_comptes', 'SELECT');  -- attendu : false
-- 2. Après la première suppression réelle, aucune ligne inachevée :
--      SELECT * FROM public.suppressions_comptes WHERE compte_supprime_le IS NULL;
-- 3. Et, côté Stripe (tableau de bord → Abonnements), aucun abonnement vivant
--    sur le `cus_…` qu'elle nomme.