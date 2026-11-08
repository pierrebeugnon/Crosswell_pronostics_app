-- =============================================================================
-- 021 — LES NOTIFICATIONS PUSH (2026-11-08)
--
-- À appliquer sur le projet Supabase CROSSWELL, après 020. Idempotent.
-- Demande du fondateur le 08/11/2026 : « commence par les pronostics du jour et
-- confiance Élevée ».
--
-- ## Ce que pose ce fichier
--
-- 1. `public.notifications_appareils` : un appareil abonné par ligne (l'adresse
--    d'envoi que rend le navigateur, ses deux clés, les choix du client).
--    Le client lit, crée, modifie et supprime SES lignes, et rien d'autre (RLS).
-- 2. `public.notifications_envois` : le journal des alertes parties. La clé
--    `(type, cle)` est la garde contre le DOUBLON : la fonction d'envoi
--    « réserve » l'alerte par un INSERT ... ON CONFLICT DO NOTHING avant
--    d'envoyer. Deux appels simultanés de pg_cron n'envoient donc qu'une fois.
--    Aucun droit client : seul le rôle de service y écrit.
-- 3. `public.crosswell_push_evenements(seuil)` : ce qui mérite une alerte
--    MAINTENANT, calculé sur le modèle servi aux clients.
-- 4. `public.crosswell_push_destinataires(type)` : les appareils à prévenir.
--
-- Les deux fonctions sont réservées au rôle de service (`notifications-push`,
-- supabase/functions/). Le schéma `modele_prediction_engagement` n'est plus
-- exposé à l'API depuis 016 : elles le lisent en SECURITY DEFINER.
--
-- ## Les deux alertes
--
-- - « pronostics_jour » : une fois par jour, quand les pronostics du jour sont
--   écrits. La matinée écrit entre ~07h10 et ~07h25 : on attend 10 min sans
--   nouvelle écriture (journée complète), et pas avant 8h00 à Paris. Rien
--   après 15h : une alerte « en ligne » envoyée l'après-midi, après un run en
--   retard, parlerait d'une journée déjà entamée. À tous les appareils qui
--   l'ont choisie, formule Gratuit comprise (la course offerte est ouverte).
-- - « confiance_elevee » : une course dont notre 1er a au moins `seuil` de
--   chances de gagner (`SEUILS_CONFIANCE.elevee`, src/config/app.ts), dans les
--   40 minutes qui précèdent son départ. Réservée à l'accès complet : la
--   confiance se lit sur les probabilités, masquées pour la formule Gratuit
--   (`client_predictions`, db/009). Le seuil est passé par la fonction d'envoi,
--   qui le recopie de l'app (test de parité, tests/notifications/).
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.notifications_appareils (
  id               bigserial PRIMARY KEY,
  user_id          uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  endpoint         text NOT NULL UNIQUE,
  p256dh           text NOT NULL,
  auth             text NOT NULL,
  navigateur       text,
  pronostics_jour  boolean NOT NULL DEFAULT true,
  confiance_elevee boolean NOT NULL DEFAULT true,
  cree_le          timestamptz NOT NULL DEFAULT now(),
  maj_le           timestamptz NOT NULL DEFAULT now(),
  -- Tenus par la fonction d'envoi : un appareil qui échoue trois fois de suite
  -- (hors 404/410, qui le suppriment aussitôt) n'est plus servi.
  dernier_envoi    timestamptz,
  echecs           integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS notifications_appareils_user ON public.notifications_appareils (user_id);

COMMENT ON TABLE public.notifications_appareils IS
  'Appareils abonnés aux notifications push (db/021). Une ligne par adresse d''envoi ; le client ne voit que les siennes.';

ALTER TABLE public.notifications_appareils ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS appareils_lecture ON public.notifications_appareils;
CREATE POLICY appareils_lecture ON public.notifications_appareils
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS appareils_creation ON public.notifications_appareils;
CREATE POLICY appareils_creation ON public.notifications_appareils
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS appareils_modification ON public.notifications_appareils;
CREATE POLICY appareils_modification ON public.notifications_appareils
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS appareils_suppression ON public.notifications_appareils;
CREATE POLICY appareils_suppression ON public.notifications_appareils
  FOR DELETE TO authenticated USING (user_id = auth.uid());

REVOKE ALL ON public.notifications_appareils FROM PUBLIC, anon, authenticated;
-- Les compteurs d'envoi ne sont pas au client : il ne règle que ses choix.
-- `user_id` et `endpoint` sont dans le droit UPDATE parce que l'app enregistre
-- par un upsert (ON CONFLICT (endpoint) DO UPDATE réécrit toutes les colonnes
-- envoyées) ; la politique `appareils_modification` interdit quand même de
-- toucher ou de produire une ligne d'un autre compte.
GRANT SELECT, DELETE ON public.notifications_appareils TO authenticated;
GRANT INSERT (user_id, endpoint, p256dh, auth, navigateur, pronostics_jour, confiance_elevee)
  ON public.notifications_appareils TO authenticated;
GRANT UPDATE (user_id, endpoint, p256dh, auth, navigateur, pronostics_jour, confiance_elevee, maj_le)
  ON public.notifications_appareils TO authenticated;
GRANT USAGE ON SEQUENCE public.notifications_appareils_id_seq TO authenticated;

CREATE TABLE IF NOT EXISTS public.notifications_envois (
  type          text NOT NULL CHECK (type IN ('pronostics_jour', 'confiance_elevee', 'test')),
  cle           text NOT NULL,
  reserve_le    timestamptz NOT NULL DEFAULT now(),
  titre         text,
  corps         text,
  destinataires integer,
  reussis       integer,
  PRIMARY KEY (type, cle)
);

COMMENT ON TABLE public.notifications_envois IS
  'Journal des alertes push (db/021). La clé (type, cle) empêche d''envoyer deux fois la même alerte.';

ALTER TABLE public.notifications_envois ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notifications_envois FROM PUBLIC, anon, authenticated;

COMMIT;

BEGIN;

-- Ce qui mérite une alerte MAINTENANT. Rend au plus une ligne « pronostics_jour »
-- et une ligne par course « confiance_elevee » ; la fonction d'envoi réserve
-- chaque (type, cle) dans notifications_envois avant d'envoyer.
CREATE OR REPLACE FUNCTION public.crosswell_push_evenements(p_seuil numeric)
  RETURNS TABLE (type text, cle text, titre text, corps text, url text)
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = ''
AS $$
  WITH t AS (
    SELECT (now() AT TIME ZONE 'Europe/Paris')::date AS jour,
           (now() AT TIME ZONE 'Europe/Paris')::time AS heure,
           now() AS maintenant
  ), jour AS (
    SELECT p.hippodrome, p.course_num, p.heure_depart, p.created_at
      FROM modele_prediction_engagement.predictions_log p, t
     WHERE p.model_version = public.crosswell_modele_client()
       AND p.reunion_date = t.jour
       AND p.hippodrome IS NOT NULL AND p.hippodrome <> '?'
  ), resume AS (
    SELECT count(DISTINCT (hippodrome, course_num)) AS courses,
           min(heure_depart) AS premiere,
           max(created_at) AS derniere_ecriture
      FROM jour
  ), favoris AS (
    -- Notre 1er au départ : le meilleur rang parmi les partants (non-partants
    -- exclus), comme `rang_calcule` de client_predictions.
    SELECT DISTINCT ON (p.hippodrome, p.course_num)
           p.hippodrome, p.course_num, p.course_nom, p.heure_depart,
           p.horse_num, p.horse_name, p.p_win
      FROM modele_prediction_engagement.predictions_log p, t
     WHERE p.model_version = public.crosswell_modele_client()
       AND p.reunion_date = t.jour
       AND p.hippodrome IS NOT NULL AND p.hippodrome <> '?'
       AND p.non_partant IS NOT TRUE
       AND p.actual_place IS NULL
     ORDER BY p.hippodrome, p.course_num, p.pred_rank
  )
  SELECT 'pronostics_jour',
         t.jour::text,
         'Les pronostics du jour sont en ligne',
         r.courses || CASE WHEN r.courses > 1 THEN ' courses' ELSE ' course' END
           || ' au programme' || coalesce(', premier départ à ' || to_char(r.premiere, 'HH24"h"MI'), '') || '.',
         '/'
    FROM resume r, t
   WHERE r.courses > 0
     AND r.derniere_ecriture < t.maintenant - interval '10 minutes'
     AND t.heure >= time '08:00' AND t.heure < time '15:00'
  UNION ALL
  SELECT 'confiance_elevee',
         t.jour || '#' || f.hippodrome || '#' || f.course_num,
         'Confiance Élevée · ' || initcap(f.hippodrome) || ' C' || f.course_num,
         'Départ à ' || to_char(f.heure_depart, 'HH24"h"MI') || '. Notre sélection : n°' || f.horse_num
           || ' ' || f.horse_name || ', ' || round(100 * f.p_win) || ' % de chances de gagner.',
         '/courses/' || t.jour || '/' || replace(f.hippodrome, ' ', '%20') || '/' || f.course_num
    FROM favoris f, t
   WHERE f.p_win >= p_seuil
     AND f.heure_depart IS NOT NULL
     AND f.heure_depart > t.heure
     AND f.heure_depart <= t.heure + interval '40 minutes'
$$;

COMMENT ON FUNCTION public.crosswell_push_evenements(numeric) IS
  'Alertes push dues maintenant (db/021) : pronostics du jour, courses à confiance Élevée dans les 40 min. Rôle de service seulement.';

-- Les appareils à prévenir pour un type d'alerte. La règle d'accès complet est
-- celle de crosswell_acces_complet() (db/007), appliquée à chaque compte au lieu
-- du compte de la requête.
CREATE OR REPLACE FUNCTION public.crosswell_push_destinataires(p_type text)
  RETURNS TABLE (id bigint, user_id uuid, endpoint text, p256dh text, auth text)
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = ''
AS $$
  SELECT d.id, d.user_id, d.endpoint, d.p256dh, d.auth
    FROM public.notifications_appareils d
   WHERE d.echecs < 3
     AND CASE p_type
           WHEN 'pronostics_jour' THEN d.pronostics_jour
           WHEN 'confiance_elevee' THEN d.confiance_elevee AND EXISTS (
             SELECT 1
               FROM public.abonnements a
              WHERE a.user_id = d.user_id
                AND (a.acces_jusqua IS NULL OR a.acces_jusqua > now())
                AND (a.statut = 'offert'
                     OR (a.formule IN ('jour', 'mois', 'an')
                         AND a.statut IN ('actif', 'resiliation_programmee'))))
           ELSE false
         END
$$;

COMMENT ON FUNCTION public.crosswell_push_destinataires(text) IS
  'Appareils abonnés à un type d''alerte (db/021) ; confiance_elevee exige l''accès complet (règle de db/007). Rôle de service seulement.';

REVOKE ALL ON FUNCTION public.crosswell_push_evenements(numeric), public.crosswell_push_destinataires(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crosswell_push_evenements(numeric), public.crosswell_push_destinataires(text)
  TO service_role;

COMMIT;
