# Crosswell — Pronostics

Plateforme **destinée aux clients**. Elle expose, derrière un compte, les probabilités de
victoire et de place calculées chaque soir par le moteur Crosswell pour les courses du
lendemain, et publie sans filtre ce que ces probabilités valent.

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

Le mode démonstration génère un jeu **fictif et déterministe** de 45 jours et affiche un
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

## Architecture

```
src/
  config/app.ts          modèle servi, seuils, mentions légales — le seul fichier de réglage
  types.ts               Course, Partant, Reunion, Bilan, ProfilPiste
  lib/
    supabase.ts          client, nom de la vue
    format.ts            dates, pourcentages, cotes — tout le formatage français
    aggregate.ts         lignes brutes → courses → réunions, probabilités de marché
    stats.ts             Wilson, bilan, calibration, segments
    ambiance.ts          teinte de halos dérivée du nom d'un hippodrome
    demo.ts              jeu fictif déterministe
  services/predictions.ts requêtes paginées + abonnement temps réel
  services/hippodromes.ts profils de piste agrégés
  data/DonneesContext.tsx fenêtre glissante de 30 jours, partagée par les pages
  auth/                  session Supabase, route protégée
  components/            ui/ · layout/ · course/ · hippodrome/ · stats/ · brand/
  pages/                 Connexion, Aujourdhui, Reunions, Reunion, Course,
                         Partant, Hippodromes, Hippodrome, Resultats, Methode,
                         Compte, NonTrouve
db/001_acces_client.sql  vue des pronostics, droits, index
db/002_profil_hippodromes.sql  profil de piste agrégé, droits, index
```

### Deux points de conception qui ne sautent pas aux yeux

**La pagination n'est pas facultative.** PostgREST plafonne une réponse à 1 000 lignes, en
silence. Une réunion de huit courses à quinze partants en fait déjà 120 : sans la boucle de
`services/predictions.ts`, la page « Nos résultats » calculerait des taux sur une fraction des
courses sans qu'aucune erreur ne le signale.

**Le rafraîchissement repose sur le sondage, pas sur Realtime.** Le rôle `authenticated` n'a
aucun droit sur la table sous-jacente, et Realtime diffuse au niveau de la table : l'abonnement
reste muet. Le contexte se resynchronise donc toutes les 90 secondes et au retour dans
l'onglet — suffisant pour des données qui changent deux fois par jour.

## Design

Sombre uniquement, verre dépoli sur halos verts et bleu nuit. Il n'y a pas de thème clair, et c'est un
choix assumé : tout l'effet repose sur des dégradés flous vus au travers de surfaces
translucides, qui deviennent des taches sur fond clair.

Accent **vert énergique `#3DDC84`**, **Montserrat** en titrage, Inter en texte courant. Les
jetons vivent dans `src/index.css` (variables CSS) et `tailwind.config.ts` (aucune couleur
littérale). Les classes `.glass`, `.card`, `.card-nest`, `.card-accent` composent toutes les
surfaces ; `.card` ne doit jamais être imbriquée dans `.card` — un flou dans un flou vire au
gris laiteux.

Deux conséquences du choix du vert, à ne pas défaire par inadvertance :

- « Gagné » partage la teinte de l'accent. Chercher un **second** vert pour le résultat
  donnerait deux nuances trop voisines pour se distinguer, qu'on prendrait pour un bug. Ce qui
  sépare les deux emplois est le **poids** — dégradé et lueur pour la marque, aplat teinté pour
  le résultat. « Placé » reste bleu et « battu » rouge : les trois issues restent lisibles.
- Renommer un jeton de couleur dans `tailwind.config.ts` **impose de redémarrer Vite**. La
  config Tailwind n'est pas rechargée à chaud : le serveur continue de compiler contre
  l'ancienne palette et sert un `500` sur `/src/index.css` jusqu'au redémarrage, alors même que
  `npm run build` passe.

## Mobile d'abord

Ce produit se consulte debout, d'une main, la veille au soir et le matin d'une réunion. Le
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
- **Les actions se répètent là où le pouce arrive.** La navigation entre courses d'une réunion
  existe dans l'en-tête sur grand écran et se répète en bas de page sur téléphone : arrivé au
  bout du tableau des partants, on ne remonte pas huit écrans pour passer à la course suivante.
  Même logique pour le sommaire de `/methode`, page longue de dix écrans, dont les ancres
  passent en bandeau défilant sous le titre.

## Les pages hippodromes

`/hippodromes` et `/hippodromes/:nom` publient le **profil de piste** : vitesse moyenne, train
des derniers 600 m, régularité, distances courues. La source est `tracking_courses`, agrégée
côté base par `db/002_profil_hippodromes.sql` — aucune donnée individuelle de cheval ne franchit
la frontière, et le seuil de vingt courses vit **dans la vue**, pas dans l'interface, pour qu'aucun
écran futur ne puisse publier une moyenne calculée sur trois après-midi.

La mise en page est immersive : sections pleine largeur, grand titre centré, séparateurs courbes,
révélation au défilement. Chaque piste reçoit une **ambiance dérivée de son nom** — teintes de
halos stables et uniques, sans table de couleurs à maintenir. Le vert de marque, lui, ne bouge
jamais : faire varier l'accent avec la piste donnerait vingt-six petites marques au lieu d'une.

Trois garde-fous à ne pas défaire :

- **Sous vingt courses jugées, aucun taux n'est affiché.** La page dit le nombre de courses et
  pourquoi elle se tait. Sur six courses, l'intervalle de Wilson couvre quarante points.
- **Une piste sans chrono reste une piste.** Auteuil compte près de mille courses relevées et
  zéro chronométrée ; `vitesseMoy` et `train600` sont nullables et le restent.
- **La révélation au défilement a un filet de deux secondes.** Un document caché ne fait pas
  tourner la boucle d'`IntersectionObserver` : sans ce `setTimeout`, une page ouverte dans un
  onglet d'arrière-plan resterait à opacité zéro. Du contenu facturé ne dépend pas d'une animation.

## Ce que la plateforme ne fait pas

Sans partenariat France Galop, elle ne publie **ni la forme détaillée des chevaux, ni les
engagements en temps réel**. Les partants sont ceux déclarés la veille au soir : un non-partant
de dernière minute n'y est pas reflété, et les cotes affichées sont des cotes de clôture
relevées après la course. Ces limites sont écrites dans l'interface, sur `/methode` et au bas
des pages concernées — elles ne doivent pas en disparaître.

S'y ajoutent, sur les pages hippodromes : **ni tracé** (corde, ligne droite, dénivelé) **ni terrain**
(souple, bon, collant, PSF). `engagements.hippodromes` porte bien une colonne `corde`, mais la
table est vide — douze lignes, tout à `NULL` — et aucune table ne porte l'état du terrain.

## Positionnement — et il est strict

Crosswell publie des **analyses statistiques** sur les courses hippiques. Ce n'est ni un
opérateur de jeux ni un service de conseil en mise — un secteur réglementé dans lequel nous
n'entrons pas. Il en découle des règles de contenu qui ne sont pas du style, mais du droit :

- **Le vocabulaire du jeu d'argent est banni de l'interface** : pari, mise, miser, jouer,
  gain, rendement, ROI, bankroll. Le produit mesure la justesse de ses probabilités ; il ne
  valorise rien en euros et ne recommande aucune action.
- **Aucune valorisation monétaire nulle part.** Les rapports PMU (`rapport_gagnant`,
  `rapport_place`) restent dans la couche de données mais ne sont plus affichés ; la section
  « rendement d'une mise plate » de `/resultats` a été supprimée, pas reformulée. Les cotes,
  elles, restent : ce sont des données de marché publiques, utilisées comme étalon de
  comparaison (« face au marché », calibration), jamais comme un prix à jouer.
- **Une seule mention légale, discrète**, sur chaque page : analyses statistiques publiées à
  titre d'information, service réservé aux majeurs. Elle est centralisée dans `AVERTISSEMENT`
  (`src/config/app.ts`), dont le commentaire porte la règle complète.

`/methode` (section « Ce que ce service n'est pas ») dit ce positionnement au client, et
`/resultats` publie les chiffres réels, y compris quand ils sont mauvais.
