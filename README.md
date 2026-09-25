# Crosswell — Pronostics

Plateforme **destinée aux clients**. Elle expose, derrière un compte, les pronostics
d'aujourd'hui et de demain : les probabilités de victoire et de place calculées par le moteur
Crosswell, et publie sans filtre ce que ces probabilités valent.

> **Rythme de publication (décision du 17 septembre 2026).** Le pipeline est en cours de
> reprogrammation pour calculer **dans la nuit** les pronostics du lendemain : le client a
> toujours ceux d'aujourd'hui et ceux de demain. L'interface annonce déjà ce rythme, sans heure
> précise, par une seule constante : `RYTHME_PUBLICATION` dans `src/config/app.ts` (à cette date,
> la production calcule encore le jour même vers 7 h). Les arrivées sont relevées au fil des
> courses, complétées au relevé du soir (`HEURE_RELEVE_SOIR`), et aucune probabilité n'est
> recalculée. Le mode démonstration a toujours ses réunions de demain.

Elle est le pendant public de [`crosswell-internal-tools`](https://github.com/pierrebeugnon/crosswell-internal-tools),
qui reste l'outil de R&D : même base Supabase, mais une vue distincte, un seul modèle exposé,
et une porte d'authentification.

## Stack

React 19 · TypeScript · Vite · React Router · Tailwind · Supabase (auth + lecture seule)

## Démarrage

```bash
npm install
cp .env.example .env   # renseigner URL + clé anon Supabase
npm run dev            # http://localhost:5190
```

Pour développer sans base ni compte :

```bash
VITE_DEMO=1 npm run dev
```

Le mode démonstration (`npm run dev:demo`) génère un jeu **fictif et déterministe** de 45 jours,
jusqu'à demain inclus, et affiche un
bandeau rouge permanent. Il ne fait aucun appel réseau et court-circuite l'authentification.

## Mise en service

1. **Appliquer `db/001_acces_client.sql`** sur le projet Supabase. Le fichier crée la vue
   `public.client_predictions`, la réserve au rôle `authenticated`, et n'y laisse passer
   qu'une seule version de modèle.
2. **Désactiver l'inscription libre** — Supabase → Authentication → Providers → *Enable email
   signups* décoché. Sans cela, n'importe qui se crée un compte et lit les pronostics.
3. **Créer les comptes clients** à la main — Authentication → Users.
4. Déployer (`vercel.json` est fourni : réécriture SPA + en-têtes de sécurité).

## Le modèle servi

L'application n'expose **qu'une** prédiction, le *Score Crosswell*, alors que la base en
contient onze en cours d'évaluation. Le nom de la version servie vit à deux endroits, et ils
doivent concorder :

| Où | Quoi |
| --- | --- |
| `src/config/app.ts` | `MODELE_CLIENT` — filtre appliqué à chaque requête |
| `db/001_acces_client.sql` | `crosswell_modele_client()` — filtre appliqué dans la vue |

Le second est la garde : même si l'interface se trompait, la base ne laisserait pas sortir un
modèle expérimental. Changer de modèle servi suppose donc de modifier les deux et de rejouer
le fichier SQL.

## Tests et parité

```bash
npm test          # tous les tests (Vitest)
npm run parite    # seulement la parité avec l'outil interne
```

- **Tests unitaires** (`src/lib/*.test.ts`) : les périodes et les jours de Paris, la
  construction des courses (non-partants, rang effectif, cheval sans `pred_rank`, dead heat,
  marché), les indicateurs
  (calibration, confiance, repère du hasard, face au marché, Wilson). Cas écrits à la main.
- **Parité** (`tests/parite/`) : l'app et le vrai code de l'outil interne tournent sur un
  même jeu généré de plus de 3 000 courses ; tout ce qui doit être identique l'est course par
  course, et les sept écarts voulus sont mesurés à l'unité :
  1. calibration sans non-partants ;
  2. « dans les trois » au lieu des places payées ;
  3. hasard calculé (valeur figée en fraction, écart mesuré avec le 11 % et la vue Modèles) ;
  4. dead heat : le favori du marché ex æquo premier compte une victoire ;
  5. un cheval sans `pred_rank` n'a pas de rang ;
  6. favori du marché sur la seule clôture (la vue ne sert pas l'avant-course) ;
  7. segment de peloton sur les partants au départ, pas sur `field_size`.

  Sans l'outil interne (CI), l'app est comparée à l'instantané `tests/parite/reference.json`.
  Régénération : `MAJ_REFERENCE=1 npm run parite`, puis `npm run parite` ; détails dans
  `tests/parite/README.md`.
- **Contre la base** : `db/verifications/reference_mesure.sql` recalcule en SQL, selon les
  définitions de l'app, les chiffres de « Nos résultats » (tout l'historique et 30 jours), à
  comparer à l'écran. Lecture seule.

## Site vitrine

Le dossier `site/` contient le **site de présentation** du service, projet Vite frère de
l'application : mêmes jetons, mêmes primitives de verre, aucune base ni compte. Il se
développe (`cd site && npm install && npm run dev`, port 5195) et se déploie séparément —
projet Vercel distinct, « Root Directory » réglé sur `site`. Son brief de charte et de
positionnement vit dans `site/CLAUDE.md` ; ses réglages (adresse de l'application, contact,
seuils recopiés d'ici) dans `site/src/config/site.ts`.

## Architecture

```
src/
  config/app.ts          modèle servi, seuils, libellés, mentions légales — le seul fichier de réglage
  types.ts               Course, Partant, Reunion, Bilan
  lib/
    supabase.ts          client, nom de la vue
    format.ts            dates, pourcentages, cotes — tout le formatage français
    aggregate.ts         lignes brutes → courses → réunions, probabilités de marché
    stats.ts             Wilson, bilan, calibration, face au marché, repère du hasard
    journee.ts           heure de Paris et état d'une course
    periodes.ts          périodes de mesure (« 30 jours » = aujourd'hui compris)
    programme.ts         page Courses : course par défaut, confiance, verdict, arrivées
    accueil.ts           accueil : prochaine course, délai, écarts au marché
    resultats.ts         « Nos résultats » : filtres, indicateurs, série mensuelle, découpages
    demo.ts              jeu fictif déterministe
  services/predictions.ts requêtes paginées + abonnement temps réel
  data/DonneesContext.tsx fenêtre glissante de 30 jours, partagée par les pages
  auth/                  session Supabase (et session fictive de la démo), route protégée
  components/            ui/ · layout/ · courses/ · accueil/ · resultats/ · brand/
  pages/                 Connexion, Aujourdhui, Courses, Reunions, Reunion (redirection),
                         Resultats, Methode, Compte, NonTrouve
design/                  maquettes de la refonte du 18/09/2026 et plan d'intégration
db/001_acces_client.sql  vue des pronostics, droits, index
```

La fiche d'un partant n'est plus une page : c'est un tiroir posé sur la page Courses
(`/courses/:date/:hippodrome/:numero/partants/:cheval`). Les pages hippodromes ont été
retirées le 18/09/2026 ; la vue `db/002_profil_hippodromes.sql` existe toujours en base,
l'application ne la lit plus.

### Deux points de conception qui ne sautent pas aux yeux

**La pagination n'est pas facultative.** PostgREST plafonne une réponse à 1 000 lignes, en
silence. Une réunion de huit courses à quinze partants en fait déjà 120 : sans la boucle de
`services/predictions.ts`, la page « Nos résultats » calculerait des taux sur une fraction des
courses sans qu'aucune erreur ne le signale.

**Le rafraîchissement repose sur le sondage, pas sur Realtime.** Le rôle `authenticated` n'a
aucun droit sur la table sous-jacente, et Realtime diffuse au niveau de la table : l'abonnement
reste muet. Le contexte se resynchronise donc toutes les 90 secondes et au retour dans
l'onglet — suffisant pour des données qui changent quelques fois par jour : la publication de
nuit, les arrivées relevées au fil de l'après-midi, le relevé du soir.

## Design

Refonte du 18/09/2026 d'après les maquettes de `design/` (plan et écarts :
`design/INTEGRATION.md`). **Noir plat, bordures opaques**, sans verre ni halos : c'est la
bordure, pas la transparence, qui sépare les plans. Sombre uniquement.

Accent **vert `#2EE58F`** (survol `#5BF0A8`), **Montserrat partout**, de 400 à 800. Les
jetons vivent dans `src/index.css` (variables CSS) et `tailwind.config.ts` (aucune couleur
littérale) : fonds `canvas < sunken < surface < raised`, filets `sep · line · line-strong ·
line-hover`, texte `ink > soft > muted > faint > dim`. Les classes historiques `.glass`,
`.card`, `.card-nest`, `.btn-*`, `.chip-*` existent toujours, mais sont devenues des aplats
bordés aux valeurs de la maquette.

- « Gagné » partage la teinte de l'accent : c'est le **poids** (aplat plein ou teinte) qui
  sépare la marque du résultat.
- Renommer un jeton de couleur dans `tailwind.config.ts` **impose de redémarrer Vite** : la
  config Tailwind n'est pas rechargée à chaud.

## Mobile d'abord

Ce produit se consulte debout, d'une main, le matin et au fil d'une journée de courses. Le
téléphone est donc l'écran de référence, pas une dégradation du bureau. Quatre règles en
découlent, et chacune corrige une faute constatée sur cette base de code :

- **Rien de vendable ne se cache derrière un `hidden sm:`.** La ligne d'une course affichait,
  à 375 px, « Prix Quacourt · 1 800 m · 9 partants » — soit le programme que n'importe quel
  site publie gratuitement. Le cheval sur lequel nous sommes et sa probabilité vivaient dans
  une colonne de droite inexistante sur téléphone. Même faute pour la cote dans le tableau des
  partants : une probabilité sans l'avis du marché en face ne se confronte à rien.
- **44 px de cible tactile.** `.btn` fait `h-11 sm:h-10`, les segments `h-11 sm:h-8`. Pour ce
  qu'on ne peut pas grossir — le point d'interrogation d'une bulle d'aide, un lien de bas de
  page — la classe `.tap` étend la zone cliquable sans toucher à la taille visible. Seuls les
  liens **en ligne dans une phrase** restent plus petits : WCAG 2.5.8 les exempte, et les
  grossir casserait l'interligne.
- **16 px dans les champs de saisie.** Safari iOS zoome la page sous ce seuil. La règle est en
  bas de `index.css`, hors `@layer` et en `!important` — les deux sont nécessaires, le
  commentaire sur place explique pourquoi.
- **La navigation reste là où le pouce arrive.** Sur téléphone, la bascule de jour et le ruban
  des courses restent collés sous l'en-tête de la page Courses : arrivé au bout de la liste des
  partants, on ne remonte pas huit écrans pour passer à la course suivante.
  Même logique pour le sommaire de `/methode`, page longue de dix écrans, dont les ancres
  passent en bandeau défilant sous le titre.

## Ce que la plateforme ne fait pas

Elle publie la fiche des chevaux pronostiqués — profil, origines, entourage, musique et
performances (données France Galop, vues de `db/004_fiche_cheval.sql`, exposées par décision
du 18/09/2026) —, mais **ni les engagements en temps réel, ni la monte du jour**. Les probabilités décrivent les partants connus au moment du
calcul et ne sont pas recalculées après un retrait : un non-partant est signalé dans la journée
(`NOTE_NON_PARTANTS`), mais les pourcentages des autres chevaux restent ceux publiés. Les cotes
affichées sont des cotes de clôture relevées après la course. Ces limites sont écrites dans
l'interface, sur `/methode` et au bas des pages concernées — elles ne doivent pas en disparaître.

## Positionnement — et il est strict

Crosswell publie des **analyses statistiques** sur les courses hippiques. Ce n'est ni un
opérateur de jeux ni un service de conseil en mise — un secteur réglementé dans lequel nous
n'entrons pas. Il en découle des règles de contenu qui ne sont pas du style, mais du droit :

- **Le vocabulaire du jeu d'argent est banni de l'interface** : pari, parier, mise, miser,
  jouer, gain, rendement, ROI, bankroll, value, tuyau, coup sûr. Le produit mesure la justesse
  de ses probabilités ; il ne valorise rien en euros et ne recommande aucune action. Le
  vocabulaire **hippique**, lui, est le bon : pronostic, favori, rang, gagnant, placé, arrivée,
  partants, dossard, non-partant.
- **Aucune valorisation monétaire nulle part.** Les rapports PMU (`rapport_gagnant`,
  `rapport_place`) restent dans la couche de données mais ne sont plus affichés ; la section
  « rendement d'une mise plate » de `/resultats` a été supprimée, pas reformulée. Les cotes,
  elles, restent : ce sont des données de marché publiques, utilisées comme étalon de
  comparaison (écart par partant et « face au marché » sur les pages de course, cumul dans
  « Nos résultats »), jamais comme un prix.
- **Une seule mention légale, discrète**, sur chaque page : analyses statistiques publiées à
  titre d'information, service réservé aux majeurs. Elle est centralisée dans `AVERTISSEMENT`
  (`src/config/app.ts`), dont le commentaire porte la règle complète.

`/methode` (section « Ce que ce service n'est pas ») dit ce positionnement au client, et
`/resultats` publie les chiffres réels, y compris quand ils sont mauvais.
