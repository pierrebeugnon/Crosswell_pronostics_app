-- =============================================================================
-- 023 — TS.remplace SERVI AUX CLIENTS, AVEC REPLI SUR M9ter COURSE PAR COURSE
--
-- À appliquer après 022. Décision du fondateur le 09/11/2026 (« change le
-- modèle M9ter par TS-R, qui semble correct et fait de bons résultats ») :
-- bascule « maintenant, avec repli », seuils de confiance aux mêmes parts
-- (46 / 27 %). APPLIQUÉE LE SOIR, après la dernière course : l'app promet une
-- seule publication par jour.
--
-- ## Ce que dit la mesure (live apparié du 31/10 au 08/11, 198 courses)
--
-- Victoire du 1er 30,3 % contre 28,8 % (+1,5 pt [−3,0 ; +6,1]), place +1,0,
-- C-index +0,27 [−0,56 ; +1,11] : en faveur de TS-R, rien de significatif.
-- L'essai TrueSkill (pipeline/modeles/trueskill/critere.md) continue de juger
-- TS.remplace contre PSF.temoin ; le servir ne change pas sa mesure.
--
-- ## Pourquoi un repli
--
-- TS.remplace repose sur M12 et sur la note TrueSkill de la nuit : il
-- s'abstient si l'un manque (daily_predict.preparer_trueskill), alors que
-- M9ter tient sans eux. Sans repli, un tel matin laisserait l'application
-- vide. La vue `crosswell_predictions_servies` sert donc, COURSE PAR COURSE,
-- TS.remplace s'il l'a prédite, M9ter sinon. Un client voit toujours UN seul
-- modèle par course ; `model_version` dit lequel.
--
-- ## Ce qui change ensemble, sinon l'application se vide
--
-- 1. `crosswell_modele_client()` → TS.remplace ; `crosswell_modele_repli()` →
--    M9ter.etranger ; la table miroir porte les deux (rôle servi / repli) ;
-- 2. les cinq vues client_* et les trois vues publiques lisent la source
--    servie ;
-- 3. l'application filtre `model_version IN (MODELE_CLIENT, MODELE_REPLI)`,
--    déployée AVANT cette migration (elle lit aussi bien l'ancien état).
--
-- ## L'historique public
--
-- « Nos résultats » devient : M9ter jusqu'au 30/10, TS.remplace à partir du
-- 31/10 (sa mise en service interne), M9ter sur toute course que TS.remplace
-- n'a pas prédite. Date du changement affichée (DATE_CHANGEMENT_MODELE).
-- Les probabilités de l'historique mêlent donc deux échelles.
--
-- Les vues sont recopiées de `pg_get_viewdef` du 09/11/2026 (générées par
-- script) : seule la source change. Ne rien toucher d'autre en passant.
-- =============================================================================


SET lock_timeout = '3s';

-- ##### BLOC A — le modèle servi, son repli, et la table miroir #####
BEGIN;

CREATE OR REPLACE FUNCTION public.crosswell_modele_repli()
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  SET search_path = ''
AS $$
  SELECT 'M9ter.etranger'::text
$$;

COMMENT ON FUNCTION public.crosswell_modele_repli() IS
  'Modèle de REPLI (db/023) : sert une course que le modèle client n''a pas prédite. Doit concorder avec MODELE_REPLI (src/config/app.ts).';

REVOKE ALL ON FUNCTION public.crosswell_modele_repli() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crosswell_modele_repli() TO authenticated, service_role;

-- La table miroir porte désormais DEUX lignes, chacune tenue par sa fonction.
ALTER TABLE public.crosswell_modele_servi ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'servi';
ALTER TABLE public.crosswell_modele_servi DROP CONSTRAINT IF EXISTS crosswell_modele_servi_accord_fonction;
ALTER TABLE public.crosswell_modele_servi DROP CONSTRAINT IF EXISTS crosswell_modele_servi_role_unique;
ALTER TABLE public.crosswell_modele_servi ADD CONSTRAINT crosswell_modele_servi_role_unique UNIQUE (role);

CREATE OR REPLACE FUNCTION public.crosswell_modele_client()
  RETURNS text
  LANGUAGE sql
  IMMUTABLE
  SET search_path = ''
AS $$
  SELECT 'TS.remplace'::text
$$;

COMMENT ON FUNCTION public.crosswell_modele_client() IS
  'Version de modèle servie aux clients (TS.remplace depuis le 09/11/2026, repli M9ter.etranger course par course ; M9ter.etranger du 02/11 au 09/11, M9bis.niveau du 03/10 au 02/11). Doit concorder avec MODELE_CLIENT dans src/config/app.ts.';

DELETE FROM public.crosswell_modele_servi;
INSERT INTO public.crosswell_modele_servi (version, role) VALUES
  (public.crosswell_modele_client(), 'servi'),
  (public.crosswell_modele_repli(), 'repli');

ALTER TABLE public.crosswell_modele_servi ADD CONSTRAINT crosswell_modele_servi_accord_fonction
  CHECK ((role = 'servi' AND version = public.crosswell_modele_client())
      OR (role = 'repli' AND version = public.crosswell_modele_repli()));

COMMIT;

-- ##### BLOC B — la source servie : TS.remplace, sinon M9ter, course par course #####
BEGIN;

CREATE OR REPLACE VIEW public.crosswell_predictions_servies AS
SELECT id, reunion_date, hippodrome, course_num, course_nom, categorie, is_handicap, distance, field_size, horse_num, horse_name, id_fg, pred_rank, p_win, p_place, actual_place, model_version, created_at, cote, rapport_gagnant, rapport_place, heure_depart, cote_matin, cote_matin_le, cote_avant, cote_avant_le, non_partant, non_partant_le, non_partant_source, elo_lent, elo_vif, discipline, poids, artefact_sha, ecrit_le
  FROM (
    SELECT p.*, m.role,
           bool_or(m.role = 'servi') OVER (PARTITION BY p.reunion_date, p.hippodrome, p.course_num) AS course_servie
      FROM modele_prediction_engagement.predictions_log p
      JOIN public.crosswell_modele_servi m ON m.version = p.model_version
  ) s
 WHERE s.role = 'servi' OR NOT s.course_servie;

COMMENT ON VIEW public.crosswell_predictions_servies IS
  'Les lignes servies (db/023) : le modèle client sur toute course qu''il a prédite, le modèle de repli sur les autres. Lue par les vues client_* et publiques, jamais exposée à l''API.';

-- Jamais exposée : elle porte l'identifiant interne du modèle et TOUT le pronostic.
REVOKE ALL ON public.crosswell_predictions_servies FROM PUBLIC, anon, authenticated;

COMMIT;

-- ##### BLOC C — les vues de l'application et du site lisent la source servie #####
BEGIN;

CREATE OR REPLACE VIEW public.client_predictions AS
 WITH acces AS (
         SELECT crosswell_acces_complet() AS complet,
            (now() AT TIME ZONE 'Europe/Paris'::text)::date AS aujourdhui
        ), offertes AS (
         SELECT DISTINCT ON (l.reunion_date) l.reunion_date,
            l.hippodrome,
            l.course_num
           FROM public.crosswell_predictions_servies l
          WHERE l.hippodrome IS NOT NULL AND l.hippodrome <> '?'::text AND l.reunion_date >= (( SELECT acces.aujourdhui
                   FROM acces))
          ORDER BY l.reunion_date, l.field_size DESC NULLS LAST, (
                CASE
                    WHEN l.categorie ~* '^gr\.?\s*iii'::text THEN 2
                    WHEN l.categorie ~* '^gr\.?\s*ii'::text THEN 3
                    WHEN l.categorie ~* '^gr\.?\s*i'::text THEN 4
                    WHEN l.categorie ~* 'listed'::text THEN 1
                    ELSE 0
                END) DESC, l.heure_depart, l.hippodrome, l.course_num
        ), base AS (
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
            p.non_partant,
            p.heure_depart,
            q.date IS NOT NULL AS quinte,
                CASE
                    WHEN p.non_partant IS TRUE THEN NULL::bigint
                    ELSE rank() OVER (PARTITION BY p.model_version, p.reunion_date, p.hippodrome, p.course_num, (p.non_partant IS TRUE) ORDER BY p.pred_rank)
                END AS rang_calcule,
            bool_or(p.actual_place IS NOT NULL) OVER (PARTITION BY p.model_version, p.reunion_date, p.hippodrome, p.course_num) AS jugee
           FROM public.crosswell_predictions_servies p
             LEFT JOIN modele_prediction_engagement.quintes q ON q.date = p.reunion_date AND upper(q.hippodrome) = upper(p.hippodrome) AND q.course_num = p.course_num
          WHERE p.hippodrome IS NOT NULL AND p.hippodrome <> '?'::text
        ), marquee AS (
         SELECT b.reunion_date,
            b.hippodrome,
            b.course_num,
            b.course_nom,
            b.categorie,
            b.is_handicap,
            b.distance,
            b.field_size,
            b.horse_num,
            b.horse_name,
            b.id_fg,
            b.pred_rank,
            b.p_win,
            b.p_place,
            b.actual_place,
            b.model_version,
            b.cote,
            b.rapport_gagnant,
            b.rapport_place,
            b.non_partant,
            b.heure_depart,
            b.quinte,
            b.rang_calcule,
            b.jugee,
            NOT a.complet AND b.reunion_date >= a.aujourdhui AND NOT b.jugee AND o.course_num IS NULL AS verrou
           FROM base b
             CROSS JOIN acces a
             LEFT JOIN offertes o ON o.reunion_date = b.reunion_date AND o.hippodrome = b.hippodrome AND o.course_num = b.course_num
        )
 SELECT reunion_date,
    hippodrome,
    course_num,
    course_nom,
    categorie,
    is_handicap,
    distance,
    field_size,
    horse_num,
    horse_name,
    id_fg,
        CASE
            WHEN verrou THEN NULL::integer
            ELSE pred_rank
        END AS pred_rank,
        CASE
            WHEN verrou THEN NULL::numeric
            ELSE p_win
        END AS p_win,
        CASE
            WHEN verrou THEN NULL::numeric
            ELSE p_place
        END AS p_place,
    actual_place,
    model_version,
    cote,
    rapport_gagnant,
    rapport_place,
    non_partant,
        CASE
            WHEN verrou THEN NULL::bigint
            ELSE rang_calcule
        END AS rang_effectif,
    heure_depart,
    verrou AS verrouille,
    quinte
   FROM marquee m;

CREATE OR REPLACE VIEW public.client_chevaux AS
 SELECT "ID_FG" AS id_fg,
    nom,
    sexe,
    robe,
    date_naissance,
    pere,
    mere,
    eleveur,
    proprietaire
   FROM chevaux.profile p
  WHERE (EXISTS ( SELECT 1
           FROM modele_prediction_engagement.predictions_log l
          WHERE l.id_fg = p."ID_FG" AND (l.model_version = crosswell_modele_client() OR l.model_version = crosswell_modele_repli())));

CREATE OR REPLACE VIEW public.client_cotes AS
 SELECT reunion_date,
    hippodrome,
    course_num,
    horse_num,
    to_char((releve_le AT TIME ZONE 'Europe/Paris'::text), 'HH24:MI'::text) AS heure,
    releve_le,
    cote
   FROM modele_prediction_engagement.cotes_jour c
  WHERE cote IS NOT NULL AND cote > 1::numeric AND (EXISTS ( SELECT 1
           FROM modele_prediction_engagement.predictions_log l
          WHERE (l.model_version = crosswell_modele_client() OR l.model_version = crosswell_modele_repli()) AND l.reunion_date = c.reunion_date AND l.hippodrome = c.hippodrome AND l.course_num = c.course_num));

CREATE OR REPLACE VIEW public.client_entourage_du_jour AS
 SELECT DISTINCT ON (cheval_id) cheval_id AS id_fg,
    entraineurs AS entraineur,
    jockey,
    date AS derniere_course
   FROM chevaux.performances f
  WHERE (EXISTS ( SELECT 1
           FROM modele_prediction_engagement.predictions_log l
          WHERE l.id_fg = f.cheval_id AND (l.model_version = crosswell_modele_client() OR l.model_version = crosswell_modele_repli()) AND l.reunion_date >= CURRENT_DATE)) AND ( SELECT crosswell_acces_complet() AS crosswell_acces_complet)
  ORDER BY cheval_id, date DESC;

CREATE OR REPLACE VIEW public.client_performances AS
 SELECT cheval_id AS id_fg,
    date,
    hippodrome,
    place,
    distance,
    specialite,
    categorie,
    poids,
    jockey,
    entraineurs AS entraineur,
    gains
   FROM chevaux.performances f
  WHERE (EXISTS ( SELECT 1
           FROM modele_prediction_engagement.predictions_log l
          WHERE l.id_fg = f.cheval_id AND (l.model_version = crosswell_modele_client() OR l.model_version = crosswell_modele_repli())));

CREATE OR REPLACE VIEW public.programme_public AS
 SELECT p.reunion_date,
    p.hippodrome,
    p.course_num,
    max(p.course_nom) AS course_nom,
    max(p.categorie) AS categorie,
    bool_or(p.is_handicap) AS is_handicap,
    max(p.discipline) AS discipline,
    max(p.distance) AS distance,
    max(p.field_size) AS field_size,
    max(p.heure_depart) AS heure_depart,
    max(pc.reunion_num) AS reunion,
    max(pc.montant_prix) AS allocation,
    max(pc.terrain) AS terrain,
    count(*) FILTER (WHERE p.non_partant IS NOT TRUE) AS partants,
    count(*) FILTER (WHERE p.non_partant IS TRUE) AS non_partants,
    bool_or(q.date IS NOT NULL) AS quinte
   FROM public.crosswell_predictions_servies p
     LEFT JOIN modele_prediction_engagement.pmu_courses pc ON pc.date = p.reunion_date AND upper(pc.hippodrome) = upper(p.hippodrome) AND pc.course_num = p.course_num
     LEFT JOIN modele_prediction_engagement.quintes q ON q.date = p.reunion_date AND upper(q.hippodrome) = upper(p.hippodrome) AND q.course_num = p.course_num
  WHERE p.hippodrome IS NOT NULL AND p.hippodrome <> '?'::text
  GROUP BY p.reunion_date, p.hippodrome, p.course_num
 HAVING NOT bool_or(p.actual_place IS NOT NULL);

CREATE OR REPLACE VIEW public.resultats_publics AS
 WITH base AS (
         SELECT p.reunion_date,
            p.hippodrome,
            p.course_num,
            p.course_nom,
            p.categorie,
            p.is_handicap,
            p.discipline,
            p.distance,
            p.field_size,
            p.heure_depart,
            p.horse_num,
            p.horse_name,
            p.id_fg,
            p.poids,
            p.p_win,
            p.p_place,
            p.actual_place,
            p.cote,
            p.non_partant,
                CASE
                    WHEN p.non_partant IS TRUE THEN NULL::bigint
                    ELSE rank() OVER (PARTITION BY p.reunion_date, p.hippodrome, p.course_num, (p.non_partant IS TRUE) ORDER BY p.pred_rank)
                END AS rang,
            bool_or(p.actual_place IS NOT NULL) OVER (PARTITION BY p.reunion_date, p.hippodrome, p.course_num) AS jugee
           FROM public.crosswell_predictions_servies p
          WHERE p.hippodrome IS NOT NULL AND p.hippodrome <> '?'::text
        )
 SELECT b.reunion_date,
    b.hippodrome,
    b.course_num,
    b.course_nom,
    b.categorie,
    b.is_handicap,
    b.discipline,
    b.distance,
    b.field_size,
    b.heure_depart,
    pc.reunion_num AS reunion,
    pc.montant_prix AS allocation,
    pc.terrain,
    b.horse_num,
    b.horse_name,
    b.rang,
    b.p_win,
    b.p_place,
    b.actual_place,
    b.cote,
    b.non_partant,
    b.poids,
    perf.jockey,
    perf.entraineurs AS entraineur,
    prof.sexe,
        CASE
            WHEN prof.date_naissance IS NOT NULL THEN EXTRACT(year FROM age(b.reunion_date::timestamp with time zone, prof.date_naissance::timestamp with time zone))::integer
            ELSE NULL::integer
        END AS age,
    prof.pere,
    prof.mere,
    q.date IS NOT NULL AS quinte
   FROM base b
     LEFT JOIN chevaux.performances perf ON perf.cheval_id = b.id_fg AND perf.date = b.reunion_date
     LEFT JOIN chevaux.profile prof ON prof."ID_FG" = b.id_fg
     LEFT JOIN modele_prediction_engagement.pmu_courses pc ON pc.date = b.reunion_date AND upper(pc.hippodrome) = upper(b.hippodrome) AND pc.course_num = b.course_num
     LEFT JOIN modele_prediction_engagement.quintes q ON q.date = b.reunion_date AND upper(q.hippodrome) = upper(b.hippodrome) AND q.course_num = b.course_num
  WHERE b.jugee;


-- La vue matérialisée des journées ne se remplace pas : on la refait, avec son
-- index unique (le rafraîchissement CONCURRENTLY de pg_cron l'exige).
DROP MATERIALIZED VIEW IF EXISTS public.journees_publiques;
CREATE MATERIALIZED VIEW public.journees_publiques AS
 WITH jugees AS (
         SELECT p.reunion_date,
            p.hippodrome,
            p.course_num
           FROM public.crosswell_predictions_servies p
          WHERE p.hippodrome IS NOT NULL AND p.hippodrome <> '?'::text
          GROUP BY p.reunion_date, p.hippodrome, p.course_num
         HAVING bool_or(p.actual_place IS NOT NULL)
        )
 SELECT reunion_date,
    count(*) AS courses,
    count(DISTINCT hippodrome) AS hippodromes
   FROM jugees
  GROUP BY reunion_date;
CREATE UNIQUE INDEX journees_publiques_jour ON public.journees_publiques USING btree (reunion_date);
COMMENT ON MATERIALIZED VIEW public.journees_publiques IS 'Une ligne par journee ayant des arrivees publiees, avec son nombre de courses et d''hippodromes. Sert le calendrier et la liste des journees precedentes. MATERIALISEE : rafraichie toutes les dix minutes par la tache cron `journees-publiques`.';
REVOKE ALL ON public.journees_publiques FROM PUBLIC, anon, authenticated;

COMMIT;


-- ##### BLOC D — les alertes push lisent la source servie #####
BEGIN;

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
      FROM public.crosswell_predictions_servies p, t
     WHERE p.reunion_date = t.jour
       AND p.hippodrome IS NOT NULL AND p.hippodrome <> '?'
       AND p.non_partant IS NOT TRUE
     ORDER BY p.hippodrome, p.course_num, p.pred_rank
  ), courues AS (
    SELECT DISTINCT p.hippodrome, p.course_num
      FROM public.crosswell_predictions_servies p, t
     WHERE p.reunion_date = t.jour
       AND p.actual_place IS NOT NULL
  ), offerte AS (
    -- La course offerte : copie de la règle de `client_predictions` (db/019).
    SELECT DISTINCT ON (l.reunion_date) l.hippodrome, l.course_num
      FROM public.crosswell_predictions_servies l, t
     WHERE l.hippodrome IS NOT NULL AND l.hippodrome <> '?'
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

COMMIT;
