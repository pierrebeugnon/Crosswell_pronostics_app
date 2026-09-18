-- =============================================================================
-- RÉFÉRENCE DE MESURE — les chiffres de « Nos résultats », recalculés en SQL.
--
-- LECTURE SEULE : un unique SELECT, aucune écriture. À lancer dans l'éditeur SQL
-- de Supabase (projet CROSSWELL) et à comparer, ligne à ligne, à l'écran « Nos
-- résultats » ouvert le même jour sur les mêmes périodes. Un écart qui ne
-- s'explique pas par une course jugée entre les deux lectures est un bug.
--
-- LES DÉFINITIONS SONT CELLES DE L'APPLICATION CLIENT, pas de l'outil interne :
-- chaque bloc cite la fonction qu'il reproduit (`src/lib/aggregate.ts`,
-- `src/lib/stats.ts`, `src/lib/periodes.ts`). Les écarts voulus avec l'outil
-- interne sont décrits et mesurés dans `tests/parite`.
--
--   - Partant       : `non_partant IS NOT TRUE` — NULL (jamais vérifié) compte partant.
--   - Rang          : `rang_effectif`, repli sur `pred_rank` ; NULL pour un non-partant
--                     ET pour un cheval sans `pred_rank`. La vue lui donne pourtant un
--                     rang (`rank()` range les NULL à égalité derrière les classés :
--                     rang 1 à tout le peloton d'une course que le modèle n'a pas
--                     classée) ; l'app le refuse, cette requête aussi.
--   - Course jugée  : au moins une `actual_place` relevée. Une place NULL dans une
--                     course jugée est une DÉFAITE (arrivées relevées au 5e ou au 7e).
--   - Rang 1        : le partant de rang 1 ; ex æquo → le plus petit numéro.
--   - Vainqueur     : `actual_place = 1` ; dead heat → le premier dans notre ordre
--                     (non-partants en dernier, rang, numéro), comme `construireCourses`.
--                     Sert au taux de victoire ; PAS à la comparaison au marché.
--   - Face au marché: chaque camp a gagné si SON cheval a `actual_place = 1` — sur un
--                     dead heat, notre rang 1 et le favori du marché peuvent avoir gagné
--                     tous les deux (`faceAuMarche`). Favori du marché à la seule cote
--                     de clôture : la vue ne sert pas l'avant-course.
--   - Dans les trois: le rang 1 arrive 1er, 2e ou 3e — PAS les places payées.
--   - Période       : jours de PARIS ; « 30 jours » = [J−29 ; J], aujourd'hui compris ;
--                     toute période s'arrête à aujourd'hui (demain n'est jamais mesuré).
--
-- Sortie en format long : une ligne par (période, mesure), avec numérateur,
-- dénominateur et pourcentage. Les numérateurs et dénominateurs sont ceux à
-- comparer — un pourcentage arrondi peut cacher un écart d'une course.
-- =============================================================================

WITH
aujourdhui AS (
  -- `jourISO()` : la date civile à Paris, jamais celle du serveur (UTC).
  SELECT (now() AT TIME ZONE 'Europe/Paris')::date AS jour
),

periodes AS (
  -- `bornesPeriode('tout')` et `bornesPeriode('30j')`.
  SELECT 'tout'::text AS periode, NULL::date AS depuis, jour AS jusqua FROM aujourdhui
  UNION ALL
  SELECT '30j', jour - 29, jour FROM aujourdhui
),

lignes AS (
  -- Une ligne par cheval et par période. La vue ne sert qu'un modèle : la
  -- déduplication par numéro de `construireCourses` n'a rien à retirer ici.
  SELECT p.periode,
         l.reunion_date,
         l.hippodrome,
         l.course_num,
         l.horse_num,
         (l.non_partant IS TRUE) AS np,
         -- `rangEffectif()` : NULL pour un non-partant et pour un cheval que le
         -- modèle n'a pas classé, quel que soit le `rang_effectif` de la vue.
         CASE WHEN l.non_partant IS TRUE OR l.pred_rank IS NULL THEN NULL
              ELSE coalesce(l.rang_effectif, l.pred_rank) END AS rang,
         -- Clé de tri de `construireCourses` : non-partants en bas (999), rang inconnu à 99.
         CASE WHEN l.non_partant IS TRUE THEN 999
              WHEN l.pred_rank IS NULL THEN 99
              ELSE coalesce(l.rang_effectif, l.pred_rank) END AS cle_tri,
         l.p_win,
         l.actual_place,
         l.cote
    FROM public.client_predictions l
    JOIN periodes p
      ON l.reunion_date <= p.jusqua
     AND (p.depuis IS NULL OR l.reunion_date >= p.depuis)
),

courses AS (
  -- Une ligne par course : le `Course` de `construireCourses`.
  SELECT periode,
         reunion_date,
         hippodrome,
         course_num,
         bool_or(actual_place IS NOT NULL)                      AS jugee,
         count(*) FILTER (WHERE NOT np)                         AS partants,
         min(horse_num) FILTER (WHERE rang = 1)                 AS favori,
         (array_agg(actual_place ORDER BY horse_num)
            FILTER (WHERE rang = 1))[1]                         AS arrivee_favori,
         (array_agg(horse_num ORDER BY cle_tri, horse_num)
            FILTER (WHERE actual_place = 1))[1]                 AS gagnant,
         -- `favoriMarche` : cote minimale parmi les PARTANTS ; à cote égale, le mieux
         -- classé par nous, puis le plus petit numéro.
         (array_agg(horse_num ORDER BY cote, cle_tri, horse_num)
            FILTER (WHERE NOT np AND cote > 0))[1]              AS favori_marche,
         -- Arrivée de ce même cheval : `faceAuMarche` juge le marché sur elle, pas sur le vainqueur retenu.
         (array_agg(actual_place ORDER BY cote, cle_tri, horse_num)
            FILTER (WHERE NOT np AND cote > 0))[1]              AS arrivee_favori_marche,
         -- `dansLeTrio` : nos rangs ≤ 3 au départ présents dans l'arrivée à trois.
         count(*) FILTER (WHERE rang <= 3 AND actual_place <= 3) AS dans_le_trio
    FROM lignes
   GROUP BY periode, reunion_date, hippodrome, course_num
),

jugees AS (
  SELECT c.*,
         coalesce(c.favori = c.gagnant, false)   AS gagne,          -- `gagne`
         coalesce(c.arrivee_favori <= 3, false)  AS dans_les_trois  -- `place`
    FROM courses c
   WHERE c.jugee
),

volumes AS (
  -- `bilan()` : courses et réunions de la période, jugées ou non.
  SELECT periode,
         count(*)                                     AS courses,
         -- Clé de réunion de l'app (`cleReunion`) : date|hippodrome.
         count(DISTINCT reunion_date::text || '|' || hippodrome) AS reunions
    FROM courses
   GROUP BY periode
),

indicateurs AS (
  SELECT periode,
         count(*)                                                    AS jugees,
         count(DISTINCT reunion_date::text || '|' || hippodrome)     AS reunions_jugees,
         count(*) FILTER (WHERE gagne)                               AS gagnees,
         count(*) FILTER (WHERE dans_les_trois)                      AS placees,
         sum(dans_le_trio)                                           AS trio,
         -- `repereHasard()` : MOYENNE des 1/n sur les courses jugées, n = partants au départ.
         count(*) FILTER (WHERE partants > 0)                        AS hasard_n,
         sum(1.0 / partants) FILTER (WHERE partants > 0)             AS hasard_victoire,
         sum(least(1.0, 3.0 / partants)) FILTER (WHERE partants > 0) AS hasard_trois,
         -- `faceAuMarche()` : jugée, avec notre rang 1 et un favori du marché ; vainqueur non exigé.
         -- Même règle pour les deux camps : `actual_place = 1` du cheval désigné.
         count(*) FILTER (WHERE favori IS NOT NULL AND favori_marche IS NOT NULL)          AS marche_n,
         count(*) FILTER (WHERE favori IS NOT NULL AND favori_marche IS NOT NULL
                            AND arrivee_favori = 1)                                        AS marche_nous,
         count(*) FILTER (WHERE favori IS NOT NULL AND favori_marche IS NOT NULL
                            AND arrivee_favori_marche = 1)                                 AS marche_marche,
         count(*) FILTER (WHERE favori = favori_marche)                                    AS marche_accord
    FROM jugees
   GROUP BY periode
),

tranches (ordre, bas, haut, derniere) AS (
  -- `BORNES_CALIBRATION` : [bas ; haut[, la dernière fermée à droite (p = 1 compte).
  VALUES (1, 0.00, 0.05, false),
         (2, 0.05, 0.10, false),
         (3, 0.10, 0.15, false),
         (4, 0.15, 0.22, false),
         (5, 0.22, 0.30, false),
         (6, 0.30, 0.45, false),
         (7, 0.45, 1.00, true)
),

points AS (
  -- `pointsCalibration()` : chaque PARTANT d'une course jugée dont `p_win` est
  -- connu ; gagné si `actual_place = 1`, perdu sinon (place NULL comprise).
  -- Les non-partants ne donnent aucun point.
  SELECT l.periode,
         l.p_win,
         coalesce(l.actual_place = 1, false) AS gagne
    FROM lignes l
    JOIN jugees j USING (periode, reunion_date, hippodrome, course_num)
   WHERE NOT l.np
     AND l.p_win IS NOT NULL
),

calibration AS (
  SELECT pt.periode,
         t.ordre,
         format('%s–%s %%', round(t.bas * 100), round(t.haut * 100)) AS tranche,
         count(*)                           AS n,
         count(*) FILTER (WHERE pt.gagne)   AS gagnants,
         avg(pt.p_win)                      AS annonce
    FROM points pt
    JOIN tranches t
      ON pt.p_win >= t.bas
     AND (pt.p_win < t.haut OR (t.derniere AND pt.p_win <= t.haut))
   GROUP BY pt.periode, t.ordre, t.bas, t.haut
)

SELECT p.periode,
       m.ordre,
       m.mesure,
       NULL::text                                                      AS tranche,
       m.numerateur,
       m.denominateur,
       round(100 * m.numerateur / nullif(m.denominateur, 0), 2)        AS pourcentage,
       NULL::numeric                                                   AS p_win_moyen
  FROM periodes p
  LEFT JOIN volumes v     ON v.periode = p.periode
  LEFT JOIN indicateurs i ON i.periode = p.periode
 CROSS JOIN LATERAL (VALUES
   ( 1, 'courses de la période (jugées ou non)',     coalesce(v.courses, 0)::numeric,         NULL::numeric),
   ( 2, 'réunions de la période',                    coalesce(v.reunions, 0)::numeric,        NULL),
   ( 3, 'réunions jugées',                           coalesce(i.reunions_jugees, 0)::numeric, NULL),
   ( 4, 'courses jugées',                            coalesce(i.jugees, 0)::numeric,          NULL),
   ( 5, 'victoires du rang 1',                       coalesce(i.gagnees, 0)::numeric,         i.jugees::numeric),
   ( 6, 'rang 1 dans les trois',                     coalesce(i.placees, 0)::numeric,         i.jugees::numeric),
   ( 7, 'dans le trio (somme, sur 3 × jugées)',      coalesce(i.trio, 0)::numeric,            (3 * i.jugees)::numeric),
   ( 8, 'hasard — victoire (somme des 1/n)',         i.hasard_victoire,                       i.hasard_n::numeric),
   ( 9, 'hasard — dans les trois (somme des min(1, 3/n))', i.hasard_trois,                    i.hasard_n::numeric),
   (10, 'face au marché — courses comparables',      coalesce(i.marche_n, 0)::numeric,        NULL),
   (11, 'face au marché — victoires de notre rang 1', coalesce(i.marche_nous, 0)::numeric,    i.marche_n::numeric),
   (12, 'face au marché — victoires du favori du marché', coalesce(i.marche_marche, 0)::numeric, i.marche_n::numeric),
   (13, 'face au marché — même cheval désigné',      coalesce(i.marche_accord, 0)::numeric,   i.marche_n::numeric)
 ) AS m(ordre, mesure, numerateur, denominateur)

UNION ALL

SELECT c.periode,
       100 + c.ordre,
       'calibration — gagnants / points',
       c.tranche,
       c.gagnants::numeric,
       c.n::numeric,
       round(100.0 * c.gagnants / c.n, 2),
       round(100 * c.annonce, 2)
  FROM calibration c

ORDER BY 1, 2;
