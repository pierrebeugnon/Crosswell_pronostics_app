-- =============================================================================
-- 025 — LA COURSE OFFERTE SE CHOISIT DANS LES RÉUNIONS PMU
--
-- À appliquer après 024. Idempotent. Seule la vue `crosswell_courses_offertes`
-- change : client_predictions et crosswell_push_evenements la lisent (024).
--
-- ## Le défaut de 024
--
-- La plus forte chance du jour tombait souvent sur une réunion PMH (paris sur
-- l'hippodrome seulement, aucune cote : Segré, Le Pertre, Nuillé-sur-Vicoin…)
-- ou outre-mer (Guadeloupe, Martinique) : 13 journées sur 79 du 11/09 au
-- 28/11. Une course que le public ne peut pas suivre en ligne ne donne envie
-- de rien, et ne se compare à aucune cote. Décision du fondateur le 28/11.
--
-- ## La règle
--
-- Une réunion est PMU si au moins une de ses courses a une `cote_matin`.
-- Les réunions PMU passent d'abord ; parmi elles, la plus forte chance de
-- notre 1er, puis la première au départ. S'il n'y a AUCUNE cote du matin ce
-- jour-là (relevé en panne), on retombe sur toutes les réunions : la formule
-- Gratuit garde toujours une course.
--
-- POURQUOI `cote_matin` SEULE, et pas `cote_avant` ni `cote` : elle est écrite
-- une fois, entre 7 h 12 et 7 h 45 (constaté du 01 au 28/11), juste après les
-- prédictions. `cote_avant` arrive à partir de 11 h : s'en servir ferait
-- changer la course offerte en pleine journée. Prix à payer : une réunion PMU
-- que le relevé du matin a manquée (6 sur 66 en novembre) ne peut pas être
-- offerte ce jour-là.
--
-- Entre l'écriture des prédictions (~7 h 10) et celle des cotes du matin
-- (~7 h 45), la course offerte peut encore changer une fois. Les alertes
-- push ne partent pas avant 8 h.
--
-- ## Mesure (28/11, 78 journées publiées du 11/09 au 27/11)
--
--   règle                          notre 1er gagne   dans les 3   partants
--   009 plus gros peloton            11 (14 %)        ~37 %         ~15
--   024 plus forte chance            30 (38 %)        58 (74 %)     6,5
--   025 plus forte chance, PMU       28 (36 %)        59 (76 %)     6,8
--
-- Une seule journée sans aucune cote du matin (repli) sur la période.
-- =============================================================================

SET lock_timeout = '3s';

BEGIN;

CREATE OR REPLACE VIEW public.crosswell_courses_offertes AS
WITH lignes AS (
  SELECT s.reunion_date,
         s.hippodrome,
         s.course_num,
         s.p_win,
         s.heure_depart,
         s.cote_matin
    FROM public.crosswell_predictions_servies s
   WHERE s.hippodrome IS NOT NULL
     AND s.hippodrome <> '?'
     AND s.reunion_date >= (now() AT TIME ZONE 'Europe/Paris')::date
), reunions AS (
  SELECT l.reunion_date,
         l.hippodrome,
         count(l.cote_matin) > 0 AS pmu
    FROM lignes l
   GROUP BY l.reunion_date, l.hippodrome
), courses AS (
  SELECT l.reunion_date,
         l.hippodrome,
         l.course_num,
         max(l.p_win)        AS p1,
         min(l.heure_depart) AS heure_depart
    FROM lignes l
   GROUP BY l.reunion_date, l.hippodrome, l.course_num
)
SELECT DISTINCT ON (c.reunion_date)
       c.reunion_date,
       c.hippodrome,
       c.course_num,
       c.p1
  FROM courses c
  JOIN reunions r ON r.reunion_date = c.reunion_date AND r.hippodrome = c.hippodrome
 ORDER BY c.reunion_date,
          r.pmu DESC,
          c.p1 DESC NULLS LAST,
          c.heure_depart NULLS LAST,
          c.hippodrome,
          c.course_num;

COMMENT ON VIEW public.crosswell_courses_offertes IS
  'La course offerte de chaque jour à venir (db/024, db/025) : dans les réunions PMU (une cote du matin au moins), celle où notre 1er a la plus forte probabilité de victoire, puis la première au départ ; toutes les réunions si aucune cote du matin. Lue par client_predictions et crosswell_push_evenements ; fermée aux comptes.';

REVOKE ALL ON public.crosswell_courses_offertes FROM PUBLIC, anon, authenticated;

COMMIT;
