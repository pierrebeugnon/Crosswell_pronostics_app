-- =============================================================================
-- 007 — Les abonnements (Stripe) et le contrôle d'accès par formule.
--
-- À appliquer sur le projet Supabase CROSSWELL, après 006. Idempotent.
-- Appliquée en production le 18/09/2026 avec l'accord du fondateur.
--
-- POURQUOI
--
-- Jusqu'ici, tout compte connecté voyait tout. Avec l'inscription libre
-- (`src/pages/Inscription.tsx`) — et les inscriptions déjà ouvertes sur le
-- projet (`disable_signup: false`) —, un compte créé en deux minutes ouvrait
-- tout le produit, gratuitement. Ce fichier pose l'état d'abonnement, tenu par
-- Stripe (fonctions `supabase/functions/`), et fait appliquer la formule PAR LA
-- BASE : l'application ne fait que l'afficher.
--
-- LA RÈGLE
--
-- Un compte a l'« accès complet » si son abonnement est :
--   - `offert` (accès ouvert à la main par l'équipe ; tous les comptes existants
--     le reçoivent ici, pour ne couper personne) ;
--   - ou un Pass (`jour`, `mois`, `an`) `actif` ou `resiliation_programmee`,
--     tant que `acces_jusqua` n'est pas passé.
-- Un impayé (`impaye`) coupe l'accès : il revient au paiement suivant.
--
-- Sans accès complet (formule Gratuit), un compte voit :
--   - toutes les courses DÉJÀ JUGÉES (arrivée relevée) ou d'un jour passé : c'est
--     « Nos résultats », promis à la formule Gratuit ;
--   - LA COURSE OFFERTE de chaque jour, pronostic complet ;
--   - les autres courses à venir SANS pronostic : noms, heures, partants, mais
--     rang, probabilités et rang effectif à NULL, et `verrouille` à vrai ;
--   - pas de fiche jockey ni entraîneur (vues de 005/006 vides) ;
--   - la fiche d'un cheval reste lisible (004) : elle ne dit rien du pronostic.
--
-- LA COURSE OFFERTE — RÈGLE PAR DÉFAUT, À CONFIRMER (design/INTEGRATION.md, A5) :
-- la PREMIÈRE course de la journée (heure de départ la plus tôt). Changer de
-- règle = changer le seul CTE `offertes` de `client_predictions`.
--
-- LES TÂCHES INTERNES NE SONT PAS FILTRÉES : `crosswell_acces_complet()` rend
-- vrai hors requête d'un compte client (rôle ≠ `authenticated`), pour que le
-- rafraîchissement du classement (006, pg_cron) et la maintenance voient tout.
-- =============================================================================

-- ##### BLOC A — les tables #####

BEGIN;

CREATE TABLE IF NOT EXISTS public.abonnements (
  user_id                uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  formule                text NOT NULL DEFAULT 'gratuit'
                           CHECK (formule IN ('gratuit', 'jour', 'mois', 'an')),
  statut                 text NOT NULL DEFAULT 'aucun'
                           CHECK (statut IN ('aucun', 'offert', 'actif', 'resiliation_programmee', 'impaye', 'expire')),
  -- Fin de la période payée (Pass 1 jour : +24 h ; abonnement : fin de la
  -- période Stripe en cours). NULL : sans échéance (accès offert).
  acces_jusqua           timestamptz,
  stripe_customer_id     text UNIQUE,
  stripe_subscription_id text,
  mis_a_jour_le          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.abonnements IS
  'État d''abonnement de chaque compte, tenu par le webhook Stripe (et par l''équipe pour les accès offerts). Le client lit sa ligne, n''écrit jamais.';

-- La preuve de la demande d'accès immédiat, texte exact et horodaté (Code de la
-- consommation, L221-13 et L221-28) : conservée même si le compte est supprimé.
CREATE TABLE IF NOT EXISTS public.paiements_consentements (
  id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id           uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  email             text,
  formule           text NOT NULL CHECK (formule IN ('jour', 'mois', 'an')),
  formulation       text NOT NULL,
  stripe_session_id text,
  cree_le           timestamptz NOT NULL DEFAULT now()
);

-- Les événements Stripe déjà traités : Stripe renvoie un événement tant qu'il
-- n'a pas reçu 200 ; on ne l'applique qu'une fois.
CREATE TABLE IF NOT EXISTS public.stripe_evenements (
  id      text PRIMARY KEY,
  type    text NOT NULL,
  recu_le timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.abonnements             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paiements_consentements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_evenements       ENABLE ROW LEVEL SECURITY;

-- Le client lit SA ligne d'abonnement, et rien d'autre. Aucune écriture : seul
-- le rôle de service (fonctions Stripe) écrit, et il ignore la RLS.
DROP POLICY IF EXISTS abonnements_lecture_de_soi ON public.abonnements;
CREATE POLICY abonnements_lecture_de_soi ON public.abonnements
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

REVOKE ALL ON public.abonnements, public.paiements_consentements, public.stripe_evenements
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.abonnements TO authenticated;

COMMIT;

-- ##### BLOC B — les fonctions d'accès #####

BEGIN;

CREATE OR REPLACE FUNCTION public.crosswell_acces_complet()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = ''
AS $$
  SELECT CASE
           -- Hors requête d'un compte client : tâches pg_cron, maintenance, rôle de service.
           WHEN coalesce(auth.role(), '') <> 'authenticated' THEN true
           ELSE EXISTS (
             SELECT 1
               FROM public.abonnements a
              WHERE a.user_id = auth.uid()
                AND (a.acces_jusqua IS NULL OR a.acces_jusqua > now())
                AND (a.statut = 'offert'
                     OR (a.formule IN ('jour', 'mois', 'an')
                         AND a.statut IN ('actif', 'resiliation_programmee')))
           )
         END
$$;

COMMENT ON FUNCTION public.crosswell_acces_complet() IS
  'Vrai si le compte de la requête a l''accès complet (Pass valide ou accès offert) ; toujours vrai hors requête client.';

-- Ce que l'application affiche du compte : une seule lecture, calculée par la
-- même règle que les vues.
CREATE OR REPLACE FUNCTION public.crosswell_mon_acces()
  RETURNS json
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = ''
AS $$
  SELECT json_build_object(
           'complet',       public.crosswell_acces_complet(),
           'formule',       coalesce(a.formule, 'gratuit'),
           'statut',        coalesce(a.statut, 'aucun'),
           'acces_jusqua',  a.acces_jusqua,
           'client_stripe', a.stripe_customer_id IS NOT NULL
         )
    FROM (SELECT 1) AS x
    LEFT JOIN public.abonnements a ON a.user_id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.crosswell_acces_complet(), public.crosswell_mon_acces() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crosswell_acces_complet(), public.crosswell_mon_acces() TO authenticated;

COMMIT;

-- ##### BLOC C — personne n'est coupé #####
-- Les comptes existants ont été ouverts à la main par l'équipe : ils gardent
-- l'accès complet, « offert », jusqu'à décision contraire (mettre `statut` à
-- 'aucun' pour le retirer).

BEGIN;

INSERT INTO public.abonnements (user_id, formule, statut)
SELECT u.id, 'gratuit', 'offert'
  FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;

COMMIT;

-- ##### BLOC D — les pronostics, filtrés par formule #####
-- Mêmes colonnes, même ordre que 003, plus `verrouille` en dernier (seul ajout
-- que permet CREATE OR REPLACE VIEW).

BEGIN;

CREATE OR REPLACE VIEW public.client_predictions AS
WITH acces AS (
  SELECT public.crosswell_acces_complet() AS complet,
         (now() AT TIME ZONE 'Europe/Paris')::date AS aujourdhui
),
-- LA COURSE OFFERTE de chaque jour à venir : la première au départ.
offertes AS (
  SELECT DISTINCT ON (l.reunion_date) l.reunion_date, l.hippodrome, l.course_num
    FROM modele_prediction_engagement.predictions_log l
   WHERE l.model_version = public.crosswell_modele_client()
     AND l.hippodrome IS NOT NULL
     AND l.hippodrome <> '?'
     AND l.reunion_date >= (SELECT aujourdhui FROM acces)
   ORDER BY l.reunion_date, l.heure_depart NULLS LAST, l.hippodrome, l.course_num
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
         -- JUGÉE = au moins une place relevée (même définition que l'application).
         bool_or(p.actual_place IS NOT NULL)
           OVER (PARTITION BY p.model_version, p.reunion_date, p.hippodrome, p.course_num) AS jugee
    FROM modele_prediction_engagement.predictions_log p
   WHERE p.model_version = public.crosswell_modele_client()
     AND p.hippodrome IS NOT NULL
     AND p.hippodrome <> '?'
),
-- Une JOINTURE et non un EXISTS corrélé : `verrou` est recopié dans chaque
-- colonne masquée, et un sous-plan corrélé s'y rejouait ligne par ligne, cinq
-- fois — mesuré le 18/09 avant application.
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
  'Pronostics du modèle servi, filtrés par formule : sans accès complet, les courses à venir autres que la course offerte n''ont ni rang ni probabilité (verrouille = vrai). Réservé au rôle authenticated.';

REVOKE ALL ON public.client_predictions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.client_predictions TO authenticated;

COMMIT;

-- ##### BLOC E — les fiches jockey et entraîneur, réservées aux Pass #####
-- Définitions de 005 et 006, à l'identique, plus la condition d'accès. Le
-- classement précalculé (006) se rafraîchit hors requête client : il voit tout.

BEGIN;

CREATE OR REPLACE VIEW public.client_stats_pros AS
SELECT 'jockey'::text                               AS role,
       f.jockey                                     AS nom,
       extract(year FROM f.date)::int               AS annee,
       extract(month FROM f.date)::int              AS mois,
       f.specialite,
       f.hippodrome,
       count(*) FILTER (WHERE f.place IS DISTINCT FROM 'NP')  AS montes,
       count(*) FILTER (WHERE f.place = '1')                  AS victoires,
       count(*) FILTER (WHERE f.place IN ('2', '3'))          AS places,
       sum(public.crosswell_montant(f.gains))                 AS allocations
  FROM chevaux.performances f
 WHERE f.date >= make_date(extract(year FROM current_date)::int - 1, 1, 1)
   AND f.date <= current_date
   AND coalesce(f.jockey, '') <> ''
   AND (SELECT public.crosswell_acces_complet())
 GROUP BY f.jockey, 3, 4, f.specialite, f.hippodrome
UNION ALL
SELECT 'entraineur'::text,
       f.entraineurs,
       extract(year FROM f.date)::int,
       extract(month FROM f.date)::int,
       f.specialite,
       f.hippodrome,
       count(*) FILTER (WHERE f.place IS DISTINCT FROM 'NP'),
       count(*) FILTER (WHERE f.place = '1'),
       count(*) FILTER (WHERE f.place IN ('2', '3')),
       sum(public.crosswell_montant(f.gains))
  FROM chevaux.performances f
 WHERE f.date >= make_date(extract(year FROM current_date)::int - 1, 1, 1)
   AND f.date <= current_date
   AND coalesce(f.entraineurs, '') <> ''
   AND (SELECT public.crosswell_acces_complet())
 GROUP BY f.entraineurs, 3, 4, f.specialite, f.hippodrome;

CREATE OR REPLACE VIEW public.client_classement AS
SELECT role, annee, nom, montes, victoires, allocations,
       rang_victoires, rang_allocations, effectif
  FROM chevaux.classement_pros
 WHERE (SELECT public.crosswell_acces_complet());

CREATE OR REPLACE VIEW public.client_associations AS
SELECT extract(year FROM f.date)::int                         AS annee,
       f.jockey,
       f.entraineurs                                          AS entraineur,
       count(*) FILTER (WHERE f.place IS DISTINCT FROM 'NP')  AS montes,
       count(*) FILTER (WHERE f.place = '1')                  AS victoires
  FROM chevaux.performances f
 WHERE f.date >= make_date(extract(year FROM current_date)::int - 1, 1, 1)
   AND f.date <= current_date
   AND coalesce(f.jockey, '') <> ''
   AND coalesce(f.entraineurs, '') <> ''
   AND (SELECT public.crosswell_acces_complet())
 GROUP BY 1, f.jockey, f.entraineurs;

CREATE OR REPLACE VIEW public.client_montes AS
SELECT f.date,
       f.hippodrome,
       f.place,
       f.distance,
       f.specialite,
       f.categorie,
       f.jockey,
       f.entraineurs AS entraineur,
       p.nom         AS cheval
  FROM chevaux.performances f
  LEFT JOIN chevaux.profile p ON p."ID_FG" = f.cheval_id
 WHERE f.date >= make_date(extract(year FROM current_date)::int - 1, 1, 1)
   AND f.date <= current_date
   AND (SELECT public.crosswell_acces_complet());

CREATE OR REPLACE VIEW public.client_palmares AS
SELECT f.date,
       f.hippodrome,
       f.distance,
       f.specialite,
       f.categorie,
       f.jockey,
       f.entraineurs AS entraineur,
       p.nom         AS cheval
  FROM chevaux.performances f
  LEFT JOIN chevaux.profile p ON p."ID_FG" = f.cheval_id
 WHERE f.place = '1'
   AND f.categorie ~* '^(GR|LISTED)'
   AND f.date > DATE '1990-01-01'
   AND f.date <= current_date
   AND (SELECT public.crosswell_acces_complet());

CREATE OR REPLACE VIEW public.client_entourage_du_jour AS
SELECT DISTINCT ON (f.cheval_id)
       f.cheval_id   AS id_fg,
       f.entraineurs AS entraineur,
       f.jockey,
       f.date        AS derniere_course
  FROM chevaux.performances f
 WHERE EXISTS (
         SELECT 1
           FROM modele_prediction_engagement.predictions_log l
          WHERE l.id_fg = f.cheval_id
            AND l.model_version = public.crosswell_modele_client()
            AND l.reunion_date >= current_date
       )
   AND (SELECT public.crosswell_acces_complet())
 ORDER BY f.cheval_id, f.date DESC;

REVOKE ALL ON public.client_stats_pros, public.client_classement, public.client_associations,
              public.client_montes, public.client_palmares, public.client_entourage_du_jour
  FROM PUBLIC, anon;
GRANT SELECT ON public.client_stats_pros, public.client_classement, public.client_associations,
                public.client_montes, public.client_palmares, public.client_entourage_du_jour
  TO authenticated;

COMMIT;

-- ##### VÉRIFICATIONS, après application #####
--
-- 1. Les comptes existants gardent l'accès :
--      SELECT u.email, a.statut FROM auth.users u JOIN public.abonnements a ON a.user_id = u.id;
-- 2. En tant que compte SANS abonnement (jeton d'un compte de test), la vue ne
--    donne de probabilités à venir que sur une course par jour :
--      SELECT reunion_date, count(DISTINCT hippodrome || course_num) FILTER (WHERE NOT verrouille)
--        FROM client_predictions WHERE reunion_date >= current_date GROUP BY 1;
-- 3. Le classement se rafraîchit toujours (tâche pg_cron de 006) :
--      REFRESH MATERIALIZED VIEW CONCURRENTLY chevaux.classement_pros;
