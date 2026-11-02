-- =============================================================================
-- 019 — LE QUINTÉ+ DANS L'APPLICATION (2026-10-28)
--
-- ## Pourquoi un deuxième fichier après la 018
--
-- La 018 a posé `quinte` sur les deux vues PUBLIQUES, celles du site vitrine.
-- L'application, elle, ne les lit pas : elle lit `public.client_predictions`
-- (`VUE_PREDICTIONS` dans `src/lib/supabase.ts`), et rien d'autre. Sans cette
-- migration, la surbrillance existerait sur crosswell.io et nulle part dans le
-- produit payant.
--
-- ## Ce qui change, et ce qui ne change pas
--
-- Une colonne ajoutée EN FIN de vue, et une jointure. Tout le reste est
-- recopié tel que `pg_get_viewdef` le sert le 2026-10-28 : le CTE `offertes`
-- (la course offerte du jour, db/009), le verrou des formules Gratuit
-- (db/007), le rang effectif (db/003). Les toucher en passant serait le bon
-- moyen de casser l'accès en croyant ajouter une pastille.
--
-- ## LE DRAPEAU N'EST PAS VERROUILLÉ, et c'est délibéré
--
-- `pred_rank`, `p_win`, `p_place` et `rang_effectif` passent à NULL pour un
-- compte sans Pass sur une course à venir non offerte. `quinte` NON : ce n'est
-- pas un pronostic, c'est le nom que le PMU donne à une course, et le même
-- jour le site le montre à un visiteur anonyme. Le masquer dans l'application
-- la rendrait plus pauvre que sa vitrine.
--
-- ## La jointure ne peut pas dédoubler les lignes
--
-- `modele_prediction_engagement.quintes` porte un index UNIQUE sur `date`
-- (migration 038 du pipeline) : au plus une correspondance par
-- (date, hippodrome, course_num). Vérifié après coup, plus bas.
--
-- `upper()` des deux côtés pour la même raison qu'en 018 : `pmu_courses` et
-- les tables du PMU écrivent « ParisLongchamp », `predictions_log` écrit
-- « PARISLONGCHAMP ». Sans cela, aucun Quinté+ couru à Longchamp — le plus
-- grand hippodrome de plat du pays — ne serait reconnu.
--
-- ## Les droits ne bougent pas
--
-- La vue est en security DEFINER (`reloptions` nul, vérifié le 2026-10-28) :
-- elle lit `quintes` avec les droits de son propriétaire. Aucun grant n'est
-- ouvert à `authenticated` sur le schéma brut, et la 016 reste intacte.
-- =============================================================================

create or replace view public.client_predictions as
 with acces as (
         select crosswell_acces_complet() as complet,
            (now() at time zone 'Europe/Paris'::text)::date as aujourdhui
        ), offertes as (
         select distinct on (l.reunion_date) l.reunion_date,
            l.hippodrome,
            l.course_num
           from modele_prediction_engagement.predictions_log l
          where l.model_version = crosswell_modele_client() and l.hippodrome is not null and l.hippodrome <> '?'::text and l.reunion_date >= (( select acces.aujourdhui
                   from acces))
          order by l.reunion_date, l.field_size desc nulls last, (
                case
                    when l.categorie ~* '^gr\.?\s*iii'::text then 2
                    when l.categorie ~* '^gr\.?\s*ii'::text then 3
                    when l.categorie ~* '^gr\.?\s*i'::text then 4
                    when l.categorie ~* 'listed'::text then 1
                    else 0
                end) desc, l.heure_depart, l.hippodrome, l.course_num
        ), base as (
         select p.reunion_date,
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
            (q.date is not null) as quinte,
                case
                    when p.non_partant is true then null::bigint
                    else rank() over (partition by p.model_version, p.reunion_date, p.hippodrome, p.course_num, (p.non_partant is true) order by p.pred_rank)
                end as rang_calcule,
            bool_or(p.actual_place is not null) over (partition by p.model_version, p.reunion_date, p.hippodrome, p.course_num) as jugee
           from modele_prediction_engagement.predictions_log p
             left join modele_prediction_engagement.quintes q on q.date = p.reunion_date and upper(q.hippodrome) = upper(p.hippodrome) and q.course_num = p.course_num
          where p.model_version = crosswell_modele_client() and p.hippodrome is not null and p.hippodrome <> '?'::text
        ), marquee as (
         select b.reunion_date,
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
            not a.complet and b.reunion_date >= a.aujourdhui and not b.jugee and o.course_num is null as verrou
           from base b
             cross join acces a
             left join offertes o on o.reunion_date = b.reunion_date and o.hippodrome = b.hippodrome and o.course_num = b.course_num
        )
 select reunion_date,
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
        case
            when verrou then null::integer
            else pred_rank
        end as pred_rank,
        case
            when verrou then null::numeric
            else p_win
        end as p_win,
        case
            when verrou then null::numeric
            else p_place
        end as p_place,
    actual_place,
    model_version,
    cote,
    rapport_gagnant,
    rapport_place,
    non_partant,
        case
            when verrou then null::bigint
            else rang_calcule
        end as rang_effectif,
    heure_depart,
    verrou as verrouille,
    quinte
   from marquee m;

comment on column public.client_predictions.quinte is
  'La course est le Quinté+ du jour. Jamais masquée par le verrou des formules Gratuit : ce n''est pas un pronostic. Exception de vocabulaire accordée le 2026-10-28, voir site/CLAUDE.md. Source : migration 038 du pipeline, exposée par db/018 et db/019.';
