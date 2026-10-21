-- 016 — LES TABLES BRUTES NE SE LISENT PLUS QUE PAR LES VUES
--
-- APPLIQUÉE EN PRODUCTION LE 21/10/2026 (migration 20261021202648).
--
-- Lot 1 de l'audit du 21/10/2026. Jusqu'ici, la seule clé publique suffisait à
-- lire `chevaux.performances` (2,9 M lignes), `chevaux.profile` (propriétaires
-- et éleveurs compris), tout `etalons`, `etalon_plat`, `etalon_obstacle` et
-- `engagements`. Deux conséquences, toutes deux vérifiées en se faisant passer
-- pour un visiteur puis pour un inscrit non abonné :
--
--   • LE PAYWALL SE CONTOURNAIT. `client_stats_pros`, `client_montes` et
--     `client_associations` filtrent par `crosswell_acces_complet()`, mais se
--     recalculent depuis `chevaux.performances`, ouverte à tous.
--   • DES DONNÉES DE TIERS FUYAIENT. `etalons.haras_contacts` (91 contacts,
--     dont 37 e-mails) était lisible par n'importe quel compte gratuit.
--
-- LE CORRECTIF TIENT EN UNE IDÉE, DÉJÀ PRISE DANS LA 014 : une vue délègue les
-- droits de son propriétaire sur les tables et les schémas qu'elle lit. Les vues
-- `client_*`, `monitoring_*`, `programme_public` et `resultats_publics`
-- appartiennent à `postgres` ; elles continuent donc de lire ces schémas une
-- fois les droits de `anon` et `authenticated` retirés. L'application et le
-- site ne lisent rien d'autre (vérifié dans le code le 21/10).
--
-- ⚠️ CE QUE CETTE MIGRATION NE FAIT PAS, EXPRÈS :
--
--   • ELLE NE RETIRE PAS `chevaux` DE L'API (`pgrst.db_schemas`). La synchro
--     de nuit (`Crosswell_plateforme`, `sync_performances.py` et
--     `completer_profils.py`) écrit `chevaux.performances` et `chevaux.profile`
--     PAR POSTGREST, avec la clé `service_role`. Retirer le schéma de l'API
--     casserait la nuit. Sans aucun droit pour `anon` ni `authenticated`, le
--     schéma exposé ne livre plus rien : c'est le droit qui protège, pas la
--     liste des schémas.
--   • ELLE NE TOUCHE PAS `service_role` ni `postgres` : collecte, calculs,
--     fonctions Edge et tâches planifiées gardent tous leurs droits.
--   • ELLE NE SUPPRIME RIEN. Les tables héritées (`fg_2025_bronze_resultats`,
--     les sauvegardes du 17/08) sont fermées, pas effacées : leur sort se
--     tranche au lot 2.
--
-- CE QUI CESSE DE MARCHER, ET C'EST VOULU : tout client qui lisait ces schémas
-- avec la clé publique — en pratique l'ancien front Élevage
-- (`Crosswell_plateforme_V1/frontend`), remplacé sur crosswell.io le 03/10, et
-- les RPC qu'il appelait (`search_mares`, `get_production_distances`,
-- `chevaux.search_cheval`…).

begin;

-- Échoue vite plutôt que de bloquer les lectures si une synchro tient un verrou.
set local lock_timeout = '5s';

-- 1. Les cinq schémas bruts : plus aucun droit pour un visiteur ni un inscrit.
--
-- Retirer l'USAGE du schéma est la vraie barrière : sans lui, aucun objet du
-- schéma n'est atteignable, y compris les fonctions dont l'EXECUTE vient de
-- PUBLIC (qu'un `revoke … from anon` ne retirerait pas). Les `revoke` sur les
-- objets ferment la seconde porte, au cas où l'USAGE serait un jour redonné.
revoke usage on schema chevaux, etalons, etalon_plat, etalon_obstacle, engagements
  from anon, authenticated;

revoke all on all tables in schema chevaux, etalons, etalon_plat, etalon_obstacle, engagements
  from anon, authenticated;
revoke all on all sequences in schema chevaux, etalons, etalon_plat, etalon_obstacle, engagements
  from anon, authenticated;
revoke all on all functions in schema chevaux, etalons, etalon_plat, etalon_obstacle, engagements
  from anon, authenticated;

-- Les droits par défaut accordaient la lecture à `anon` et `authenticated` sur
-- toute NOUVELLE table de ces schémas. Sans ce retrait, la prochaine table
-- créée par la collecte serait publique dès sa naissance.
alter default privileges for role postgres in schema chevaux, etalons, etalon_plat, etalon_obstacle, engagements
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema chevaux, etalons, etalon_plat, etalon_obstacle, engagements
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema chevaux, etalons, etalon_plat, etalon_obstacle, engagements
  revoke all on functions from anon, authenticated;

-- 2. Les politiques « tout le monde lit tout » tombent avec les droits.
--
-- Elles ne servent plus à rien une fois le droit retiré, mais elles sont un
-- piège : un `grant select` rouvrirait instantanément la table entière. Sans
-- politique, une table sous RLS ne livre rien aux rôles soumis à la RLS ;
-- `service_role` et `postgres`, qui la contournent, ne voient aucune différence.
do $$
declare
  p record;
  n integer := 0;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where cmd = 'SELECT'
      and qual = 'true'
      and roles && array['anon', 'authenticated', 'public']::name[]
      and (schemaname in ('chevaux', 'etalons', 'etalon_plat', 'etalon_obstacle', 'engagements')
           or (schemaname = 'public' and tablename = 'fg_2025_bronze_resultats'))
  loop
    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
    n := n + 1;
  end loop;
  raise notice '016 : % politiques de lecture publique supprimées', n;
end
$$;

-- 3. Restes de l'ancienne plateforme dans `public`.
--
-- `fg_2025_bronze_resultats` : lisible sans compte, lue par aucune page.
revoke all on public.fg_2025_bronze_resultats from anon, authenticated;

-- `search_mares` et `get_production_distances` lisent `chevaux` et `etalons`
-- avec les droits de l'appelant : elles échoueraient de toute façon. On les
-- retire de l'API plutôt que de laisser une RPC qui répond par une erreur.
-- L'EXECUTE leur vient de PUBLIC, d'où le retrait à PUBLIC et le droit rendu à
-- `service_role` pour les scripts qui les appelleraient encore.
revoke execute on function public.search_mares(text, integer) from public, anon, authenticated;
revoke execute on function public.get_production_distances(text) from public, anon, authenticated;
grant execute on function public.search_mares(text, integer) to service_role;
grant execute on function public.get_production_distances(text) to service_role;

-- Orion : les politiques exigent `auth.uid()`, donc un visiteur n'obtenait
-- rien ; mais aucun droit n'a à être accordé à `anon` sur des conversations.
revoke all on public.orion_conversations, public.orion_messages from anon;

-- 4. Contrôle : la migration échoue, et donc ne s'applique pas, si une seule
-- porte est restée ouverte.
do $$
declare
  fuites text;
begin
  select string_agg(n.nspname || '.' || c.relname, ', ' order by 1)
    into fuites
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where c.relkind in ('r', 'p', 'v', 'm', 'f')
    and (n.nspname in ('chevaux', 'etalons', 'etalon_plat', 'etalon_obstacle', 'engagements')
         or (n.nspname = 'public' and c.relname = 'fg_2025_bronze_resultats'))
    and (has_table_privilege('anon', c.oid, 'SELECT')
         or has_table_privilege('authenticated', c.oid, 'SELECT'));
  if fuites is not null then
    raise exception '016 : encore lisible par anon ou authenticated : %', fuites;
  end if;
end
$$;

-- Le visiteur ne lit plus la table brute…
set local role anon;
do $$
begin
  perform 1 from chevaux.performances limit 1;
  raise exception '016 : anon lit encore chevaux.performances';
exception when insufficient_privilege then
  null;
end
$$;
-- … mais lit toujours les vues publiques du site.
select 1 from public.programme_public limit 1;
select 1 from public.resultats_publics limit 1;
reset role;

-- L'inscrit ne lit plus les contacts des haras…
set local role authenticated;
do $$
begin
  perform 1 from etalons.haras_contacts limit 1;
  raise exception '016 : authenticated lit encore etalons.haras_contacts';
exception when insufficient_privilege then
  null;
end
$$;
-- … mais l'application lit toujours ses vues (le filtre d'abonnement, lui,
-- répond selon le compte : ici aucun, donc la version gratuite).
select 1 from public.client_predictions limit 1;
select 1 from public.client_performances limit 1;
select 1 from public.client_stats_pros limit 1;
reset role;

commit;

-- À FAIRE À LA MAIN, HORS SQL : Supabase > Authentication > Policies >
-- « Leaked password protection », à activer (dernier point du lot 1).
--
-- VÉRIFIÉ EN HTTP AVEC LA CLÉ ANON, APRÈS APPLICATION (21/10) :
--   chevaux/performances, chevaux/profile          401 permission denied for schema chevaux
--   etalons/haras_contacts, stallion_profiles      401 permission denied for schema etalons
--   engagements/courses                            401 permission denied for schema engagements
--   fg_2025_bronze_resultats, rpc/search_mares     401 permission denied
--   resultats_publics, programme_public,
--   journees_publiques                             200
-- En base, sous le jeton d'un inscrit sans abonnement : `client_predictions`
-- 8 963 lignes, `client_chevaux`, `client_performances` et `client_cotes`
-- servies, les six vues payantes à 0 ligne (filtre d'abonnement intact), son
-- profil lisible. `service_role` garde l'usage de `chevaux` et l'écriture sur
-- `performances` et `profile` : la synchro de nuit n'est pas touchée.
-- crosswell.io/resultats s'affiche, sans erreur de console.
