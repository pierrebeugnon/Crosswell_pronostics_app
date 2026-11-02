-- 016 — LES ARRIVÉES PUBLIQUES, AVEC CE QU'IL MANQUAIT
--
-- Ajoute à `resultats_publics` le type de course, le poids, le jockey,
-- l'entraîneur, l'âge, le sexe, les origines — et, quand la source les porte,
-- l'allocation, le terrain et le numéro de réunion. Ajoute à
-- `programme_public` de quoi grouper une journée par réunion.
--
-- ════════════════════════════════════════════════════════════════════════════
-- POURQUOI CETTE MIGRATION EXISTE : LA 013 S'ÉTAIT TROMPÉE.
--
-- Elle affirmait, en toutes lettres, « pas d'allocation, pas de terrain, pas
-- de numéro de réunion », et servait `null` pour le poids et la discipline.
-- Le raisonnement était double, et faux des deux côtés :
--
-- 1. « On reproduit l'application, on n'invente rien. » La règle est bonne,
--    mais elle avait été appliquée à des colonnes que `predictions_log` — la
--    table que ces vues lisent DÉJÀ — porte à 100 % : `discipline`, `poids`,
--    `is_handicap`, `p_place`. Les écrire `null` n'était pas de la prudence,
--    c'était une perte sèche.
--
-- 2. « `pmu_courses` ne couvre que le plat et n'a été remplie qu'une fois, à la
--    main, le 17/10. » La première moitié est vraie, la seconde est fausse :
--    mesuré le 21/10/2026, cette table va de 2017-01-01 au 2026-10-22, soit
--    39 920 courses, allocation à 100 %, terrain à 98,8 %, réunion à 100 %.
--    Elle est vivante.
--
-- Et le verrou commercial ne couvrait pas ces champs. Il protège UNE chose :
-- ne pas révéler une probabilité AVANT la course, puisque c'est ce que le Pass
-- fait payer. Une fois la course courue, le jockey, l'entraîneur et le poids
-- sont des faits publics. La 013 avait étendu le verrou à ce qu'il ne couvre
-- pas.
-- ════════════════════════════════════════════════════════════════════════════
--
-- ════════════════════════════════════════════════════════════════════════════
-- CE QUI EST MESURÉ, ET CE QUI NE L'EST PAS (21/10/2026, journées du 16 au 20)
--
--   depuis `predictions_log`, déjà lue :
--     discipline (Plat/Haies/Steeple/Cross) ......... 100 %, plat ET obstacle
--     poids ........................................ 100 %
--     is_handicap .................................. 100 %
--     p_place ...................................... 100 %  (déjà servie)
--
--   depuis `chevaux.performances`, jointe sur (cheval, date) :
--     jockey ....................................... 97,7 % sur 18 416 partants
--     entraineur ................................... 97,7 %
--
--   depuis `chevaux.profile`, jointe sur l'identifiant du cheval :
--     age (calculé depuis la date de naissance) ..... 100 %
--     pere / mere .................................. 96,8 %
--     sexe ......................................... 84,4 %
--
--   depuis `pmu_courses`, jointe sur (date, hippodrome, course) :
--     allocation / terrain / numero de reunion ..... 32 % SEULEMENT, voir plus bas
--
-- AUCUNE DE CES JOINTURES NE DUPLIQUE DE LIGNE : vérifié le 21/10/2026, zéro
-- couple en double dans `chevaux.performances` par (cheval, date), zéro dans
-- `chevaux.profile` par cheval, zéro dans `pmu_courses` par (date, hippodrome,
-- course). Toutes sont des LEFT JOIN : une source muette donne `null`, jamais
-- une ligne en moins. Les index nécessaires existent déjà
-- (`performances_cheval_date_idx`, `profile_pkey`).
-- ════════════════════════════════════════════════════════════════════════════
--
-- ════════════════════════════════════════════════════════════════════════════
-- LES DEUX LIMITES, ÉCRITES ICI POUR QU'ON NE LES REDÉCOUVRE PAS
--
-- 1. LE JOUR MÊME N'A NI JOCKEY NI ENTRAÎNEUR. Les performances s'écrivent la
--    nuit suivante : mesuré quatre jours d'affilée, à 03:49:59, 03:50:32,
--    03:51:27 et 03:52:36 UTC. La journée en cours sort donc avec ces colonnes
--    à `null`, et elles se remplissent le lendemain matin. Les composants
--    n'affichent une case que si la valeur existe : rien à faire côté front.
--
-- 2. L'ALLOCATION ET LE TERRAIN NE JOIGNENT QU'À 32 %, ET CE N'EST PAS LA
--    COUVERTURE DE LA SOURCE. `pmu_courses` ne couvre que le PLAT (environ
--    trois quarts de nos courses), mais surtout les deux tables n'écrivent pas
--    les hippodromes pareil : `predictions_log` dit « BDX LE BOUSCAT » là où
--    `pmu_courses` dit « LE BOUSCAT ». La jointure est donc sur ÉGALITÉ
--    STRICTE, volontairement : une table de correspondance inventée ici
--    deviendrait fausse au premier hippodrome nouveau, et personne ne saurait
--    pourquoi une allocation est absente. Le jour où cette correspondance
--    existera pour de bon, elle fera passer ces trois colonnes d'environ 32 %
--    à environ 75 % sans toucher à cette vue.
-- ════════════════════════════════════════════════════════════════════════════
--
-- CE QUI NE CHANGE PAS, ET QUI EST L'ESSENTIEL :
--   - le VERROU : `where jugee`. Une course pas encore jugée n'a toujours
--     aucune ligne dans `resultats_publics`. Rien de ce qui suit ne l'affaiblit.
--   - `programme_public` ne porte toujours AUCUNE probabilité, AUCUN rang,
--     AUCUNE cote, et AUCUN partant. On lui ajoute de quoi décrire la course,
--     pas de quoi la pronostiquer.
--   - la version de modèle vient toujours de la TABLE `crosswell_modele_servi`
--     (014), jamais d'une fonction : une vue délègue l'accès aux tables, pas
--     l'EXECUTE sur les fonctions.
--   - surtout pas `security_invoker = true` : `anon` n'a aucun droit sur les
--     tables sources, la vue renverrait une erreur de permission au lieu de
--     données.

begin;

-- ────────────────────────────────────────────────────────────────────────────
-- LES ARRIVÉES — une ligne par partant, courses JUGÉES uniquement.
-- ────────────────────────────────────────────────────────────────────────────
create or replace view public.resultats_publics as
with base as (
  select
    p.reunion_date,
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
    -- Rang EFFECTIF, règle de l'application : un non-partant ne décale
    -- personne, et n'a pas de rang.
    case when p.non_partant is true then null
         else rank() over (
           partition by p.reunion_date, p.hippodrome, p.course_num, (p.non_partant is true)
           order by p.pred_rank)
    end as rang,
    -- Une course est jugée dès qu'une arrivée nous est parvenue.
    bool_or(p.actual_place is not null) over (
      partition by p.reunion_date, p.hippodrome, p.course_num) as jugee
  from modele_prediction_engagement.predictions_log p
  join public.crosswell_modele_servi m on m.version = p.model_version
  where p.hippodrome is not null
    and p.hippodrome <> '?'
)
select
  b.reunion_date,
  b.hippodrome,
  b.course_num,
  b.course_nom,
  b.categorie,
  b.is_handicap,
  b.discipline,
  b.distance,
  b.field_size,
  b.heure_depart,
  -- La course, telle que la société de courses l'a organisée. `null` hors plat
  -- et sur les hippodromes dont la graphie diffère — voir l'en-tête.
  pc.reunion_num    as reunion,
  pc.montant_prix   as allocation,
  pc.terrain        as terrain,
  b.horse_num,
  b.horse_name,
  b.rang,
  b.p_win,
  b.p_place,
  b.actual_place,
  b.cote,
  b.non_partant,
  b.poids,
  -- L'entourage du jour. `null` sur la journée en cours : voir la limite 1.
  perf.jockey       as jockey,
  perf.entraineurs  as entraineur,
  -- Le cheval. L'âge se calcule à la DATE DE LA COURSE, et non à aujourd'hui :
  -- une arrivée de l'an dernier doit dire l'âge qu'il avait ce jour-là.
  prof.sexe         as sexe,
  case when prof.date_naissance is not null
       then extract(year from age(b.reunion_date, prof.date_naissance))::int
  end               as age,
  prof.pere         as pere,
  prof.mere         as mere
from base b
left join chevaux.performances perf
       on perf.cheval_id = b.id_fg
      and perf.date      = b.reunion_date
left join chevaux.profile prof
       on prof."ID_FG"   = b.id_fg
left join modele_prediction_engagement.pmu_courses pc
       on pc.date        = b.reunion_date
      and pc.hippodrome  = b.hippodrome
      and pc.course_num  = b.course_num
-- LE VERROU : seules les courses jugées sortent d'ici.
where b.jugee;

comment on view public.resultats_publics is
  'Arrivées publiques des courses JUGÉES : notre favori, la probabilité annoncée, la place réelle, la cote de clôture, et le détail de chaque partant (poids, jockey, entraîneur, âge, sexe, origines). Une course pas encore jugée n''y a aucune ligne — le verrou est dans la clause WHERE, pas dans le code appelant. Jockey et entraîneur sont nuls sur la journée en cours : leur source s''écrit la nuit suivante.';

-- ────────────────────────────────────────────────────────────────────────────
-- LE PROGRAMME — courses pas encore jugées, SANS AUCUNE PROBABILITÉ.
--
-- Une ligne par COURSE, jamais par partant. On lui ajoute `discipline` et
-- `reunion`, qui servent à GROUPER la journée comme la maquette le fait
-- (réunion, hippodrome, discipline), et l'allocation et le terrain, qui
-- décrivent la course. Toujours ni `p_win`, ni `p_place`, ni `rang`, ni
-- `cote`, ni la liste des partants : il n'y a rien à filtrer.
-- ────────────────────────────────────────────────────────────────────────────
create or replace view public.programme_public as
select
  p.reunion_date,
  p.hippodrome,
  p.course_num,
  max(p.course_nom)      as course_nom,
  max(p.categorie)       as categorie,
  bool_or(p.is_handicap) as is_handicap,
  max(p.discipline)      as discipline,
  max(p.distance)        as distance,
  max(p.field_size)      as field_size,
  max(p.heure_depart)    as heure_depart,
  max(pc.reunion_num)    as reunion,
  max(pc.montant_prix)   as allocation,
  max(pc.terrain)        as terrain,
  count(*) filter (where p.non_partant is not true) as partants,
  count(*) filter (where p.non_partant is true)     as non_partants
from modele_prediction_engagement.predictions_log p
join public.crosswell_modele_servi m on m.version = p.model_version
left join modele_prediction_engagement.pmu_courses pc
       on pc.date       = p.reunion_date
      and pc.hippodrome = p.hippodrome
      and pc.course_num = p.course_num
where p.hippodrome is not null
  and p.hippodrome <> '?'
group by p.reunion_date, p.hippodrome, p.course_num
having not bool_or(p.actual_place is not null);

comment on view public.programme_public is
  'Programme des courses pas encore jugées, pour un visiteur sans compte. Décrit la course (type, distance, réunion, allocation, terrain) mais ne porte AUCUNE colonne de probabilité, de rang ni de cote, et aucun partant : il n''y a rien à masquer.';

-- ────────────────────────────────────────────────────────────────────────────
-- Les droits sont inchangés : lecture publique sur ces deux vues, et sur elles
-- seules. `create or replace view` conserve les GRANT existants ; on les
-- repose malgré tout, pour que cette migration soit rejouable seule sur une
-- base neuve sans dépendre de l'ordre des précédentes.
--
-- RIEN N'EST OUVERT SUR LES NOUVELLES SOURCES. `chevaux.performances`,
-- `chevaux.profile` et `pmu_courses` restent fermées à `anon` : c'est le
-- PROPRIÉTAIRE de la vue qui les lit, et il n'en laisse sortir que les colonnes
-- énumérées ci-dessus, pour des courses déjà jugées.
-- ────────────────────────────────────────────────────────────────────────────
grant select on public.resultats_publics to anon, authenticated;
grant select on public.programme_public  to anon, authenticated;

commit;
