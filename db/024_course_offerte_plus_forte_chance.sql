-- =============================================================================
-- 024 — LA COURSE OFFERTE : CELLE OÙ NOTRE 1er A LA PLUS FORTE CHANCE DE GAGNER
--
-- À appliquer après 023. Idempotent. (Le numéro 024 d'une bascule vers M12,
-- annulée le 22/11 et jamais appliquée, a été supprimé : ce fichier le reprend.)
--
-- ## La décision
--
-- Le fondateur, le 28/11/2026 : « changeons la course gratuite de l'offre par
-- la course avec notre plus grande chance de gagner ». Elle remplace la règle
-- du 25/09 (db/009, « la plus belle course du jour » = le plus gros peloton).
--
-- ## Pourquoi
--
-- Le plus gros peloton est la course la plus difficile à prévoir : la formule
-- Gratuit montrait le modèle sous son pire jour. Mesuré le 28/11 sur le modèle
-- servi (crosswell_predictions_servies), journées jugées du 01/09 au 27/11 :
--
--   règle                      journées  notre 1er gagne  dans les 3
--   plus gros peloton (009)       78       11 (14 %)        ~37 %
--   plus forte chance (024)       78       30 (38 %)        ~74 %
--
-- Sur les seules 28 journées depuis le 31/10 (TS-R servi) : 8 victoires sur 28
-- (28,6 %, le favori du marché fait autant sur ces courses), 23 fois dans les
-- 3 (82 %). Ces courses sont des petits pelotons (7,3 partants en moyenne,
-- 4 à 13) où notre 1er est aussi le favori du marché 4 fois sur 5 (cote
-- médiane 2,3).
--
-- ## La règle
--
-- Pour chaque course du jour, la probabilité de victoire la plus haute du
-- classement servi (notre 1er). La course offerte est celle où elle est la
-- plus haute ; à égalité, la première au départ, puis l'hippodrome et le
-- numéro, pour que le choix soit toujours déterminé.
--
-- STABLE DANS LA JOURNÉE. Les prédictions s'écrivent une fois, vers 7 h 10
-- (constaté du 21 au 28/11 : aucune réécriture ensuite). Le maximum est pris
-- sur TOUTES les lignes de la course, non-partants compris : si notre 1er est
-- retiré à midi, la course reste offerte. Une promesse affichée le matin ne
-- doit pas changer de course l'après-midi.
--
-- ## Une seule définition
--
-- La règle vivait en deux copies (le CTE `offertes` de client_predictions et
-- le CTE `offerte` de crosswell_push_evenements). Elle vit désormais dans la
-- vue `crosswell_courses_offertes`, lue par les deux. Fermée aux comptes : on
-- la lit à travers client_predictions, qui gagne une colonne `offerte` pour
-- que l'application NOMME la course offerte sans refaire le calcul (un compte
-- Gratuit ne reçoit pas les probabilités des courses verrouillées, il ne
-- pourrait pas le refaire).
--
-- Les deux objets sont recopiés de `pg_get_viewdef` / `pg_get_functiondef` du
-- 28/11/2026 : seule la course offerte change, plus la colonne `offerte` en
-- fin de vue (CREATE OR REPLACE VIEW n'accepte qu'un ajout en dernier).
-- =============================================================================

SET lock_timeout = '3s';

BEGIN;

-- ##### La règle, une seule fois #####
CREATE OR REPLACE VIEW public.crosswell_courses_offertes AS
WITH courses AS (
  SELECT s.reunion_date,
         s.hippodrome,
         s.course_num,
         max(s.p_win)        AS p1,
         min(s.heure_depart) AS heure_depart
    FROM public.crosswell_predictions_servies s
   WHERE s.hippodrome IS NOT NULL
     AND s.hippodrome <> '?'
     AND s.reunion_date >= (now() AT TIME ZONE 'Europe/Paris')::date
   GROUP BY s.reunion_date, s.hippodrome, s.course_num
)
SELECT DISTINCT ON (c.reunion_date)
       c.reunion_date,
       c.hippodrome,
       c.course_num,
       c.p1
  FROM courses c
 ORDER BY c.reunion_date,
          c.p1 DESC NULLS LAST,
          c.heure_depart NULLS LAST,
          c.hippodrome,
          c.course_num;

COMMENT ON VIEW public.crosswell_courses_offertes IS
  'La course offerte de chaque jour à venir (db/024) : celle où notre 1er a la plus forte probabilité de victoire, puis la première au départ. Lue par client_predictions et crosswell_push_evenements ; fermée aux comptes.';

REVOKE ALL ON public.crosswell_courses_offertes FROM PUBLIC, anon, authenticated;

-- ##### client_predictions : la source de la course offerte, et la colonne `offerte` #####
CREATE OR REPLACE VIEW public.client_predictions AS
 WITH acces AS (
         SELECT crosswell_acces_complet() AS complet,
            (now() AT TIME ZONE 'Europe/Paris'::text)::date AS aujourdhui
        ), offertes AS (
         SELECT o.reunion_date,
            o.hippodrome,
            o.course_num
           FROM crosswell_courses_offertes o
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
           FROM crosswell_predictions_servies p
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
            NOT a.complet AND b.reunion_date >= a.aujourdhui AND NOT b.jugee AND o.course_num IS NULL AS verrou,
            o.course_num IS NOT NULL AS offerte
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
    quinte,
    offerte
   FROM marquee m;

COMMENT ON VIEW public.client_predictions IS
  'Pronostics du modèle servi, filtrés par formule : sans accès complet, les courses à venir autres que la course offerte du jour (crosswell_courses_offertes, db/024 : la plus forte chance de notre 1er) n''ont ni rang ni probabilité (verrouille = vrai). offerte = la course offerte du jour, pour tous. Réservé au rôle authenticated.';

REVOKE ALL ON public.client_predictions FROM PUBLIC, anon;
GRANT SELECT ON public.client_predictions TO authenticated;

-- ##### Les alertes push : même course offerte #####
CREATE OR REPLACE FUNCTION public.crosswell_push_evenements(p_seuil numeric, p_cote_min numeric)
 RETURNS TABLE(type text, cle text, titre text, corps text, url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    -- La course offerte : la règle unique (db/024).
    SELECT o.hippodrome, o.course_num
      FROM public.crosswell_courses_offertes o, t
     WHERE o.reunion_date = t.jour
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
$function$;

COMMIT;
