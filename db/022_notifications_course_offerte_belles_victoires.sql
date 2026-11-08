-- =============================================================================
-- 022 — NOTIFICATIONS : COURSE OFFERTE ET BELLES VICTOIRES (2026-11-08)
--
-- À appliquer après 021. Idempotent. Décision du fondateur le 08/11/2026, le
-- soir même de la 021 (aucun appareil encore abonné) :
--
--   « Enlève la notif pour alerter que les pronos sont en ligne. Ajoute une
--   notif pour le pass gratuit 30 min avant le départ de la course gratuite.
--   Une notif quand on gagne une course avec une cote plus haute que 10. Il
--   faut alerter quand des pronos gratifiants peuvent servir Crosswell. »
--
-- ## Les trois alertes, après cette migration
--
-- - « course_offerte » : 30-40 min avant le départ de la course offerte du
--   jour, aux comptes SANS accès complet (formule Gratuit). Même course que
--   `client_predictions` (CTE `offertes`, db/009 puis db/019) : plus gros
--   peloton déclaré, puis catégorie la plus relevée, puis premier départ,
--   hippodrome, numéro. Si cette règle change là-bas, elle change ici.
-- - « confiance_elevee » : inchangée (accès complet seulement).
-- - « belle_victoire » : notre 1er au départ a GAGNÉ à une cote d'au moins
--   `p_cote_min` (10 à la création : 7 courses du 11/09 au 07/11, environ une
--   par semaine). À tous les appareils qui l'ont choisie, Gratuit compris :
--   c'est la preuve publique que la méthode trouve des gagnants que le marché
--   ne voit pas. Cote finale, à défaut la dernière cote relevée avant le
--   départ. Seulement dans les 3 h qui suivent le départ : une arrivée publiée
--   très tard ne réveille personne pour une course de midi.
--
-- « pronostics_jour » disparaît : la colonne devient `course_offerte`.
-- =============================================================================

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'notifications_appareils'
                AND column_name = 'pronostics_jour') THEN
    ALTER TABLE public.notifications_appareils RENAME COLUMN pronostics_jour TO course_offerte;
  END IF;
END $$;

ALTER TABLE public.notifications_appareils
  ADD COLUMN IF NOT EXISTS belles_victoires boolean NOT NULL DEFAULT true;

GRANT INSERT (belles_victoires), UPDATE (belles_victoires) ON public.notifications_appareils TO authenticated;

ALTER TABLE public.notifications_envois DROP CONSTRAINT IF EXISTS notifications_envois_type_check;
ALTER TABLE public.notifications_envois
  ADD CONSTRAINT notifications_envois_type_check
  CHECK (type IN ('course_offerte', 'confiance_elevee', 'belle_victoire', 'test'));

DROP FUNCTION IF EXISTS public.crosswell_push_evenements(numeric);

CREATE OR REPLACE FUNCTION public.crosswell_push_evenements(p_seuil numeric, p_cote_min numeric)
  RETURNS TABLE (type text, cle text, titre text, corps text, url text)
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = ''
AS $$
  WITH t AS (
    SELECT (now() AT TIME ZONE 'Europe/Paris')::date AS jour,
           (now() AT TIME ZONE 'Europe/Paris')::time AS heure
  ), premiers AS (
    -- Notre 1er au départ de chaque course du jour : le meilleur rang parmi les
    -- partants (non-partants exclus), comme `rang_calcule` de client_predictions.
    SELECT DISTINCT ON (p.hippodrome, p.course_num)
           p.hippodrome, p.course_num, p.heure_depart, p.horse_num, p.horse_name, p.p_win,
           p.actual_place, coalesce(p.cote, p.cote_avant) AS cote
      FROM modele_prediction_engagement.predictions_log p, t
     WHERE p.model_version = public.crosswell_modele_client()
       AND p.reunion_date = t.jour
       AND p.hippodrome IS NOT NULL AND p.hippodrome <> '?'
       AND p.non_partant IS NOT TRUE
     ORDER BY p.hippodrome, p.course_num, p.pred_rank
  ), courues AS (
    SELECT DISTINCT p.hippodrome, p.course_num
      FROM modele_prediction_engagement.predictions_log p, t
     WHERE p.model_version = public.crosswell_modele_client()
       AND p.reunion_date = t.jour
       AND p.actual_place IS NOT NULL
  ), offerte AS (
    -- La course offerte : copie de la règle de `client_predictions` (db/019).
    SELECT DISTINCT ON (l.reunion_date) l.hippodrome, l.course_num
      FROM modele_prediction_engagement.predictions_log l, t
     WHERE l.model_version = public.crosswell_modele_client()
       AND l.hippodrome IS NOT NULL AND l.hippodrome <> '?'
       AND l.reunion_date = t.jour
     ORDER BY l.reunion_date, l.field_size DESC NULLS LAST,
              CASE WHEN l.categorie ~* '^gr\.?\s*iii' THEN 2
                   WHEN l.categorie ~* '^gr\.?\s*ii' THEN 3
                   WHEN l.categorie ~* '^gr\.?\s*i' THEN 4
                   WHEN l.categorie ~* 'listed' THEN 1
                   ELSE 0 END DESC,
              l.heure_depart, l.hippodrome, l.course_num
  )
  SELECT 'course_offerte',
         t.jour || '#' || f.hippodrome || '#' || f.course_num,
         'Votre course offerte · ' || initcap(f.hippodrome) || ' C' || f.course_num,
         'Départ à ' || to_char(f.heure_depart, 'HH24"h"MI') || '. Notre pronostic complet est ouvert : n°'
           || f.horse_num || ' ' || f.horse_name || ' en tête, ' || round(100 * f.p_win) || ' % de chances de gagner.',
         '/courses/' || t.jour || '/' || replace(f.hippodrome, ' ', '%20') || '/' || f.course_num
    FROM premiers f
    JOIN offerte o USING (hippodrome, course_num)
    CROSS JOIN t
   WHERE f.heure_depart IS NOT NULL
     AND f.actual_place IS NULL
     AND f.heure_depart > t.heure
     AND f.heure_depart <= t.heure + interval '40 minutes'
  UNION ALL
  SELECT 'confiance_elevee',
         t.jour || '#' || f.hippodrome || '#' || f.course_num,
         'Confiance Élevée · ' || initcap(f.hippodrome) || ' C' || f.course_num,
         'Départ à ' || to_char(f.heure_depart, 'HH24"h"MI') || '. Notre sélection : n°' || f.horse_num
           || ' ' || f.horse_name || ', ' || round(100 * f.p_win) || ' % de chances de gagner.',
         '/courses/' || t.jour || '/' || replace(f.hippodrome, ' ', '%20') || '/' || f.course_num
    FROM premiers f, t
   WHERE f.p_win >= p_seuil
     AND f.actual_place IS NULL
     AND f.heure_depart IS NOT NULL
     AND f.heure_depart > t.heure
     AND f.heure_depart <= t.heure + interval '40 minutes'
  UNION ALL
  SELECT 'belle_victoire',
         t.jour || '#' || f.hippodrome || '#' || f.course_num,
         'Quelle course ! Notre n°1 l’emporte à ' || initcap(f.hippodrome),
         'C' || f.course_num || ' : n°' || f.horse_num || ' ' || f.horse_name || ', notre 1er, gagne alors que le marché le cotait à '
           || replace(regexp_replace(to_char(f.cote, 'FM990D0'), '\.0$', ''), '.', ',') || '. Revivez la course et notre classement.',
         '/courses/' || t.jour || '/' || replace(f.hippodrome, ' ', '%20') || '/' || f.course_num
    FROM premiers f
    JOIN courues USING (hippodrome, course_num)
    CROSS JOIN t
   WHERE f.actual_place::text = '1'
     AND f.cote >= p_cote_min
     AND f.heure_depart IS NOT NULL
     AND f.heure_depart <= t.heure
     AND f.heure_depart > t.heure - interval '3 hours'
$$;

COMMENT ON FUNCTION public.crosswell_push_evenements(numeric, numeric) IS
  'Alertes push dues maintenant (db/022) : course offerte et confiance Élevée dans les 40 min, belle victoire (notre 1er gagne à cote >= p_cote_min). Rôle de service seulement.';

CREATE OR REPLACE FUNCTION public.crosswell_push_destinataires(p_type text)
  RETURNS TABLE (id bigint, user_id uuid, endpoint text, p256dh text, auth text)
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = ''
AS $$
  WITH appareils AS (
    SELECT d.*,
           EXISTS (
             -- La règle d'accès complet de crosswell_acces_complet() (db/007),
             -- appliquée à chaque compte au lieu du compte de la requête.
             SELECT 1
               FROM public.abonnements a
              WHERE a.user_id = d.user_id
                AND (a.acces_jusqua IS NULL OR a.acces_jusqua > now())
                AND (a.statut = 'offert'
                     OR (a.formule IN ('jour', 'mois', 'an')
                         AND a.statut IN ('actif', 'resiliation_programmee')))
           ) AS complet
      FROM public.notifications_appareils d
     WHERE d.echecs < 3
  )
  SELECT id, user_id, endpoint, p256dh, auth
    FROM appareils
   WHERE CASE p_type
           WHEN 'course_offerte'   THEN course_offerte AND NOT complet
           WHEN 'confiance_elevee' THEN confiance_elevee AND complet
           WHEN 'belle_victoire'   THEN belles_victoires
           ELSE false
         END
$$;

COMMENT ON FUNCTION public.crosswell_push_destinataires(text) IS
  'Appareils abonnés à un type d''alerte (db/022) : course offerte = formule Gratuit, confiance Élevée = accès complet, belle victoire = tous. Rôle de service seulement.';

REVOKE ALL ON FUNCTION public.crosswell_push_evenements(numeric, numeric), public.crosswell_push_destinataires(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.crosswell_push_evenements(numeric, numeric), public.crosswell_push_destinataires(text)
  TO service_role;

COMMIT;
