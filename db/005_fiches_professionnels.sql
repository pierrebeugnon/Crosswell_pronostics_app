-- =============================================================================
-- 005 — Les fiches jockey et entraîneur : statistiques, classement, palmarès.
--
-- À appliquer sur le projet Supabase CROSSWELL. Idempotent. Même modèle que 001
-- et 004 : des vues dans `public`, lisant les tables sources avec les droits de
-- leur propriétaire, que seul le rôle `authenticated` peut interroger.
--
-- Suite de la décision du 18/09/2026 (fiche cheval, 004) : le fondateur a
-- demandé les fiches jockey et entraîneur de la maquette. Source : les
-- performances France Galop (`chevaux.performances`).
--
-- POURQUOI DES AGRÉGATS CÔTÉ BASE
--
-- Une saison compte ~64 000 courses et jusqu'à 2 000 montes pour un seul
-- jockey : tout rapatrier dans le navigateur pour compter serait lourd sur un
-- téléphone. Les vues agrègent donc par personne, année, mois, discipline et
-- hippodrome ; l'application ne fait que sommer une centaine de lignes.
--
-- CE QUE CE FICHIER EXPOSE
--
--   client_stats_pros      par personne (jockey ou entraîneur), année, mois,
--                          discipline, hippodrome : montes, victoires, places
--                          (2e et 3e), allocations. Saison en cours et précédente.
--   client_classement      par personne et par année : totaux et rangs (aux
--                          victoires, aux allocations) parmi tous les jockeys
--                          ou tous les entraîneurs de l'année.
--   client_associations    par année : jockey × entraîneur, montes et victoires.
--   client_montes          chaque course de la saison en cours et de la
--                          précédente, avec le nom du cheval (derniers résultats).
--   client_palmares        les victoires de Groupe et Listed, toutes années.
--   client_entourage_du_jour  pour chaque cheval pronostiqué aujourd'hui ou
--                          plus tard, l'entraîneur et le jockey de sa DERNIÈRE
--                          course (la monte du jour n'est pas relevée).
--
-- Portée plus large que 004 : ces vues couvrent TOUTES les courses de la
-- période, pas seulement les chevaux pronostiqués — un classement ne se calcule
-- pas sur un échantillon. C'est ce que la décision du fondateur couvre.
-- =============================================================================

-- ##### BLOC A — une allocation lisible #####
-- `gains` est du texte au format France Galop (« 16.250 », parfois vide) :
-- une conversion naïve ferait échouer toute la vue sur une seule valeur mal
-- formée. La fonction renvoie 0 pour tout ce qui n'est pas un montant.

BEGIN;

CREATE OR REPLACE FUNCTION public.crosswell_montant(brut text)
  RETURNS numeric
  LANGUAGE sql
  IMMUTABLE
  SET search_path = ''
AS $$
  SELECT CASE
           WHEN brut ~ '^[0-9]{1,3}(\.[0-9]{3})*(,[0-9]+)?$' OR brut ~ '^[0-9]+(,[0-9]+)?$'
             THEN replace(replace(brut, '.', ''), ',', '.')::numeric
           ELSE 0
         END
$$;

COMMIT;

-- ##### BLOC B — les vues #####

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
 GROUP BY f.entraineurs, 3, 4, f.specialite, f.hippodrome;

COMMENT ON VIEW public.client_stats_pros IS
  'Statistiques des jockeys et entraîneurs (saison en cours et précédente), pour leurs fiches. Réservé au rôle authenticated.';

CREATE OR REPLACE VIEW public.client_classement AS
SELECT t.*,
       rank() OVER (PARTITION BY t.role, t.annee ORDER BY t.victoires DESC)   AS rang_victoires,
       rank() OVER (PARTITION BY t.role, t.annee ORDER BY t.allocations DESC) AS rang_allocations,
       count(*) OVER (PARTITION BY t.role, t.annee)                           AS effectif
  FROM (
        SELECT role, annee, nom,
               sum(montes)::int      AS montes,
               sum(victoires)::int   AS victoires,
               sum(allocations)      AS allocations
          FROM public.client_stats_pros
         GROUP BY role, annee, nom
       ) t;

COMMENT ON VIEW public.client_classement IS
  'Classement annuel des jockeys et entraîneurs, aux victoires et aux allocations. Réservé au rôle authenticated.';

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
 GROUP BY 1, f.jockey, f.entraineurs;

COMMENT ON VIEW public.client_associations IS
  'Associations jockey × entraîneur par année. Réservé au rôle authenticated.';

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
   AND f.date <= current_date;

COMMENT ON VIEW public.client_montes IS
  'Courses de la saison en cours et précédente, avec le nom du cheval (derniers résultats des fiches). Réservé au rôle authenticated.';

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
   AND f.date <= current_date;

COMMENT ON VIEW public.client_palmares IS
  'Victoires de Groupe et Listed, toutes années. Réservé au rôle authenticated.';

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
 ORDER BY f.cheval_id, f.date DESC;

COMMENT ON VIEW public.client_entourage_du_jour IS
  'Entraîneur et jockey de la dernière course des chevaux pronostiqués à venir. Réservé au rôle authenticated.';

COMMIT;

-- ##### BLOC C — les droits #####

BEGIN;

REVOKE ALL ON public.client_stats_pros, public.client_classement, public.client_associations,
              public.client_montes, public.client_palmares, public.client_entourage_du_jour
  FROM PUBLIC, anon;
GRANT SELECT ON public.client_stats_pros, public.client_classement, public.client_associations,
                public.client_montes, public.client_palmares, public.client_entourage_du_jour
  TO authenticated;

REVOKE ALL ON FUNCTION public.crosswell_montant(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crosswell_montant(text) TO authenticated;

COMMIT;

-- ##### BLOC D — index de service #####
-- Une fiche filtre par nom (jockey ou entraîneur) sur une plage de dates ; le
-- classement balaie l'année par date.

BEGIN;

SET LOCAL lock_timeout = '15s';

CREATE INDEX IF NOT EXISTS performances_jockey_date_idx ON chevaux.performances (jockey, date DESC);
CREATE INDEX IF NOT EXISTS performances_entraineurs_date_idx ON chevaux.performances (entraineurs, date DESC);
CREATE INDEX IF NOT EXISTS performances_date_idx ON chevaux.performances (date);

COMMIT;
