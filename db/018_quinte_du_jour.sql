-- =============================================================================
-- 018 — LE QUINTÉ+ DANS LES VUES PUBLIQUES (2026-10-28)
--
-- ## Le besoin
--
-- Mettre en surbrillance le Quinté+ de la journée sur la page de résultats du
-- site et dans l'application. Le mot est une EXCEPTION ÉCRITE au vocabulaire
-- banni du positionnement, accordée par le fondateur le 2026-10-28 : il nomme
-- une course, et rien d'autre. Voir `site/CLAUDE.md`, section « Le
-- positionnement ». Ne pas retirer cette colonne au nom de la règle générale.
--
-- ## D'où vient la donnée
--
-- De `modele_prediction_engagement.quintes`, créée par la migration 038 du
-- dépôt `Crosswell-internal-tools`, remplie par `pmu_arrivees.py` depuis la
-- réponse du programme PMU déjà téléchargée (`courses[].paris[].codePari` vaut
-- `QUINTE_PLUS`). Aucune requête réseau supplémentaire côté pipeline.
--
-- ## Pourquoi un booléen, et pas le libellé
--
-- La course porte déjà son nom (`course_nom`). Le front n'a besoin que de
-- savoir LAQUELLE mettre en avant. Reproduire ici le libellé du PMU ouvrirait
-- un deuxième nom pour la même course, et c'est exactement ainsi qu'un titre
-- finit par diverger de l'autre.
--
-- ## La jointure ne peut pas dédoubler les lignes
--
-- `quintes` porte un index UNIQUE sur `date` : au plus une course désignée par
-- jour, donc au plus une correspondance par (date, hippodrome, course_num). La
-- jointure est strictement 1-pour-1, et aucun partant n'est compté deux fois.
--
-- ## Les droits ne bougent pas
--
-- Ces deux vues sont en security DEFINER (aucun `security_invoker=on` dans
-- leurs `reloptions`, vérifié le 2026-10-28) : elles lisent `quintes` avec les
-- droits de leur propriétaire. On n'ouvre donc RIEN à `anon` — la migration 016
-- a fermé les tables brutes aux visiteurs, et ce fichier ne la défait pas.
--
-- ## La colonne est ajoutée EN DERNIER, et c'est une contrainte, pas un choix
--
-- `create or replace view` ne sait qu'AJOUTER des colonnes À LA FIN. Insérer
-- `quinte` au milieu exigerait un `drop view`, qui tomberait sur les
-- dépendances. On l'ajoute donc en queue, dans les deux vues.
--
-- ## AU PASSAGE : un bug de jointure qui vidait l'allocation à ParisLongchamp
--
-- Les deux vues joignaient `pmu_courses` sur `pc.hippodrome = p.hippodrome`,
-- À LA CASSE PRÈS. Or les deux tables ne l'écrivent pas pareil : `pmu_courses`
-- garde « ParisLongchamp » (le `libelleCourt` du PMU) et `predictions_log`
-- garde « PARISLONGCHAMP ». Mesuré le 2026-10-28 : 72 lignes contre 11 536.
-- La jointure ne matchait donc JAMAIS sur le premier hippodrome de France, et
-- `allocation`, `reunion` et `terrain` y ressortaient nuls — le Prix de l'Arc de
-- Triomphe sortait sans allocation alors qu'elle vaut 5 000 000 € en base.
--
-- Les deux jointures passent donc par `upper()`. Ce n'est pas une optimisation :
-- sans cela la colonne `quinte` aurait hérité du même trou, et le Quinté+ couru
-- à ParisLongchamp n'aurait jamais été reconnu. Aucun index n'existe sur
-- `hippodrome`, donc `upper()` ne coûte aucun parcours qui n'avait pas lieu.
-- Mesuré après correction : 668 lignes de ParisLongchamp portent une allocation,
-- contre 0 avant.
--
-- ## CE QUE `upper()` NE RÉPARE PAS : les noms réellement différents
--
-- La casse n'est pas le seul écart entre les deux graphies. Contrôle du
-- 2026-10-28 sur les 26 Quinté+ de galop depuis le 10 septembre : 25 sont
-- appariés, un seul ne l'est pas — celui du 12 octobre, que le PMU nomme
-- « BORELY » et `predictions_log` « Mar.Borely ». Ce n'est pas une casse, c'est
-- un autre nom. Les réparer tous demande une table d'alias d'hippodromes, qui
-- n'existe pas et dépasse ce lot. Conséquence à connaître : un jour sur
-- vingt-six environ, le Quinté+ ne sera pas marqué alors qu'il est chez nous.
-- Le symptôme est silencieux — une course simplement non mise en avant.
-- =============================================================================

-- ─── Les arrivées ────────────────────────────────────────────────────────────
create or replace view public.resultats_publics as
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
           FROM modele_prediction_engagement.predictions_log p
             JOIN crosswell_modele_servi m ON m.version = p.model_version
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
    (q.date IS NOT NULL) AS quinte
   FROM base b
     LEFT JOIN chevaux.performances perf ON perf.cheval_id = b.id_fg AND perf.date = b.reunion_date
     LEFT JOIN chevaux.profile prof ON prof."ID_FG" = b.id_fg
     LEFT JOIN modele_prediction_engagement.pmu_courses pc ON pc.date = b.reunion_date AND upper(pc.hippodrome) = upper(b.hippodrome) AND pc.course_num = b.course_num
     LEFT JOIN modele_prediction_engagement.quintes q ON q.date = b.reunion_date AND upper(q.hippodrome) = upper(b.hippodrome) AND q.course_num = b.course_num
  WHERE b.jugee;

comment on column public.resultats_publics.quinte is
  'La course est le Quinté+ du jour. Exception de vocabulaire accordée le 2026-10-28, voir site/CLAUDE.md. Source : migration 038 du pipeline.';

-- ─── Le programme à venir ────────────────────────────────────────────────────
create or replace view public.programme_public as
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
   FROM modele_prediction_engagement.predictions_log p
     JOIN crosswell_modele_servi m ON m.version = p.model_version
     LEFT JOIN modele_prediction_engagement.pmu_courses pc ON pc.date = p.reunion_date AND upper(pc.hippodrome) = upper(p.hippodrome) AND pc.course_num = p.course_num
     LEFT JOIN modele_prediction_engagement.quintes q ON q.date = p.reunion_date AND upper(q.hippodrome) = upper(p.hippodrome) AND q.course_num = p.course_num
  WHERE p.hippodrome IS NOT NULL AND p.hippodrome <> '?'::text
  GROUP BY p.reunion_date, p.hippodrome, p.course_num
 HAVING NOT bool_or(p.actual_place IS NOT NULL);

comment on column public.programme_public.quinte is
  'La course est le Quinté+ du jour. Exception de vocabulaire accordée le 2026-10-28, voir site/CLAUDE.md. Source : migration 038 du pipeline.';
