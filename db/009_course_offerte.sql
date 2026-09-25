-- =============================================================================
-- 009 — La course offerte : la plus belle du jour, et non plus la première.
--
-- À appliquer sur le projet Supabase CROSSWELL, après 008. Idempotent.
--
-- POURQUOI
--
-- 007 ouvrait au compte gratuit la PREMIÈRE course de chaque jour (la plus
-- tôt au départ). Deux défauts, constatés le 25/09/2026 :
--
-- 1. Elle est courue en début d'après-midi. Passé son départ, un compte
--    gratuit n'a plus une seule course à venir de lisible : tout est
--    verrouillé jusqu'au lendemain. En démonstration, à 15 h, l'accueil
--    affichait « Avec un Pass » trente-huit fois et « Offert » zéro fois.
-- 2. C'est rarement la course qui donne envie : la première d'une réunion est
--    souvent la plus petite.
--
-- LA RÈGLE, tranchée par le fondateur le 25/09/2026 : LA PLUS BELLE COURSE DU
-- JOUR. Le plus gros peloton d'abord ; à égalité, la catégorie la plus relevée
-- (Groupe I, II, III, Listed) ; puis la première au départ, l'hippodrome et le
-- numéro, pour que le choix soit toujours déterminé.
--
-- `field_size` est le nombre de chevaux DÉCLARÉS : il ne bouge pas quand un
-- cheval est retiré en cours de journée. La course offerte annoncée le matin
-- reste donc la même jusqu'au soir — ce qui compte pour une promesse écrite à
-- l'écran (« 1 pronostic offert par jour »).
--
-- UNE COURSE PAR JOUR, AUJOURD'HUI ET LES JOURS À VENIR (le fondateur, 25/09 :
-- « la formule gratuite affiche une course tous les jours »). Les jours passés
-- et les courses jugées restent ouverts à tous : « Nos résultats » ne se
-- verrouille pas.
--
-- Seul le CTE `offertes` change ; le reste de la vue est celui de 007, aux
-- colonnes près qui ne bougent pas (CREATE OR REPLACE VIEW l'exige).
-- =============================================================================

BEGIN;

CREATE OR REPLACE VIEW public.client_predictions AS
WITH acces AS (
  SELECT public.crosswell_acces_complet() AS complet,
         (now() AT TIME ZONE 'Europe/Paris')::date AS aujourdhui
),
offertes AS (
  SELECT DISTINCT ON (l.reunion_date) l.reunion_date, l.hippodrome, l.course_num
    FROM modele_prediction_engagement.predictions_log l
   WHERE l.model_version = public.crosswell_modele_client()
     AND l.hippodrome IS NOT NULL
     AND l.hippodrome <> '?'
     AND l.reunion_date >= (SELECT aujourdhui FROM acces)
   ORDER BY l.reunion_date,
            l.field_size DESC NULLS LAST,
            CASE
              WHEN l.categorie ~* '^gr\.?\s*iii' THEN 2
              WHEN l.categorie ~* '^gr\.?\s*ii'  THEN 3
              WHEN l.categorie ~* '^gr\.?\s*i'   THEN 4
              WHEN l.categorie ~* 'listed'       THEN 1
              ELSE 0
            END DESC,
            l.heure_depart NULLS LAST,
            l.hippodrome,
            l.course_num
),
base AS (
  SELECT p.reunion_date, p.hippodrome, p.course_num, p.course_nom, p.categorie, p.is_handicap,
         p.distance, p.field_size, p.horse_num, p.horse_name, p.id_fg, p.pred_rank, p.p_win,
         p.p_place, p.actual_place, p.model_version, p.cote, p.rapport_gagnant, p.rapport_place,
         p.non_partant, p.heure_depart,
         CASE
           WHEN p.non_partant IS TRUE THEN NULL::bigint
           ELSE rank() OVER (PARTITION BY p.model_version, p.reunion_date, p.hippodrome, p.course_num,
                                          (p.non_partant IS TRUE)
                             ORDER BY p.pred_rank)
         END AS rang_calcule,
         bool_or(p.actual_place IS NOT NULL)
           OVER (PARTITION BY p.model_version, p.reunion_date, p.hippodrome, p.course_num) AS jugee
    FROM modele_prediction_engagement.predictions_log p
   WHERE p.model_version = public.crosswell_modele_client()
     AND p.hippodrome IS NOT NULL
     AND p.hippodrome <> '?'
),
marquee AS (
  SELECT b.*,
         (NOT a.complet
          AND b.reunion_date >= a.aujourdhui
          AND NOT b.jugee
          AND o.course_num IS NULL) AS verrou
    FROM base b
    CROSS JOIN acces a
    LEFT JOIN offertes o
           ON o.reunion_date = b.reunion_date
          AND o.hippodrome = b.hippodrome
          AND o.course_num = b.course_num
)
SELECT m.reunion_date,
       m.hippodrome,
       m.course_num,
       m.course_nom,
       m.categorie,
       m.is_handicap,
       m.distance,
       m.field_size,
       m.horse_num,
       m.horse_name,
       m.id_fg,
       CASE WHEN m.verrou THEN NULL ELSE m.pred_rank END    AS pred_rank,
       CASE WHEN m.verrou THEN NULL ELSE m.p_win END        AS p_win,
       CASE WHEN m.verrou THEN NULL ELSE m.p_place END      AS p_place,
       m.actual_place,
       m.model_version,
       m.cote,
       m.rapport_gagnant,
       m.rapport_place,
       m.non_partant,
       CASE WHEN m.verrou THEN NULL ELSE m.rang_calcule END AS rang_effectif,
       m.heure_depart,
       m.verrou                                             AS verrouille
  FROM marquee m;

COMMENT ON VIEW public.client_predictions IS
  'Pronostics du modèle servi, filtrés par formule : sans accès complet, les courses à venir autres que la course offerte du jour (le plus gros peloton, puis la catégorie la plus relevée) n''ont ni rang ni probabilité (verrouille = vrai). Réservé au rôle authenticated.';

REVOKE ALL ON public.client_predictions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.client_predictions TO authenticated;

COMMIT;
