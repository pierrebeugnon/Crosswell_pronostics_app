-- 015 — LA LISTE DES JOURNÉES, EN UNE LIGNE PAR JOUR
--
-- APPLIQUÉE EN PRODUCTION LE 19/10/2026.
--
-- Le calendrier et les « journées précédentes » ont besoin des dates qui
-- portent des résultats. Sans cette vue, le site lisait la colonne
-- `reunion_date` de `resultats_publics` et repliait les doublons dans le
-- navigateur. Deux défauts, tous deux mesurés :
--
--   • JUSTESSE : environ 250 lignes par journée, donc une limite de 3 600
--     lignes ne couvrait qu'une dizaine de jours. Le calendrier était muet
--     au-delà, sans que rien ne le signale.
--   • VITESSE : la page attendait plus de deux secondes pour afficher sa
--     première course. Avec la vue, 548 ms.
--
-- La leçon vaut au-delà d'ici : PostgREST n'a pas de DISTINCT, et replier des
-- doublons côté navigateur impose de deviner combien de lignes demander. Dès
-- que ce nombre dépend des données, il est faux.

begin;

create or replace view public.journees_publiques as
select
  reunion_date,
  count(distinct (hippodrome, course_num)) as courses,
  count(distinct hippodrome)               as hippodromes
from public.resultats_publics
group by reunion_date;

comment on view public.journees_publiques is
  'Une ligne par journée ayant des arrivées publiées, avec son nombre de courses et d''hippodromes. Sert le calendrier et la liste des journées précédentes.';

grant select on public.journees_publiques to anon, authenticated;

commit;
