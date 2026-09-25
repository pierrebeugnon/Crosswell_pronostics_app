# Crosswell — Site vitrine (`site/`)

Site public de **Crosswell Pronostics**, la plateforme client de pronostics hippiques
(`../`, même dépôt). Statique : aucune base, aucun compte, aucun appel réseau. Il présente
le service et renvoie vers l'application (`URL_APPLICATION` dans `src/config/site.ts`).
Projet Vite + React 19 + TypeScript + Tailwind, frère de l'app.

```bash
cd site && npm run dev        # http://localhost:5195
cd site && npm run typecheck  # tsc --noEmit — DOIT passer avant de rendre la main
cd site && npm run build
```

Pages : `/` (accueil), `/methode` (« Comment ça marche »), `/confidentialite`,
`/mentions-legales`, et la page introuvable. Alias `@/` → `src/`. Identifiants,
commentaires et textes **en français**, comme dans l'app.

## Le périmètre — particulier, pronostics, rien d'autre

Ce site est celui de la **version particulier** : des pronostics, pour un individu qui suit
les courses. La **version pro** (éleveur, entraîneur, propriétaire — croisements, pedigrees,
effectif) est mise de côté. Ne pas importer son contenu ici : ni « jument », ni
« croisement », ni « short-list », ni « votre effectif ».

## La direction artistique — les maquettes « Arrivée »

Depuis le 18/09/2026, la référence est le handoff `../design/` : `screens/Landing*`,
`How*`, `Legal*` (plan d'intégration et arbitrages dans `../design/INTEGRATION.md`, lot 7).
« Arrivée » n'est que le nom des maquettes : on garde **le nom Crosswell Pronostics et
notre logo** (`components/brand/Logo`, copie de celui de l'app).

- **Une seule charte avec l'app.** `src/index.css` et `tailwind.config.ts` sont des
  **copies conformes** de ceux de l'application (noir plat, bordures opaques, Montserrat
  400 à 800, accent `#2EE58F`). Le site n'ajoute qu'un bloc « SITE » en bas du CSS. Une
  teinte qui change dans l'app se recopie ici.
- **Aucune couleur littérale** dans les composants : jetons Tailwind (`bg-surface`,
  `border-line`, `text-muted`, `text-faint`, `bg-accent/[0.12]`…) ou, dans un SVG,
  `rgb(var(--c-accent))`.
- **Valeurs de la maquette, textes réduits d’un cran** (demande du fondateur, 18/09/2026) :
  titres de section 25 px (téléphone) / 34 px (bureau) au lieu de 28 / 40, héros 53 px au lieu
  de 68, texte courant 15 px ; rien sous 15 px n’a bougé. Cartes
  `rounded-3xl bg-surface border border-line`, marges de 20 px sur téléphone et 80 px sur
  grand écran, pilules `rounded-full`, boutons de 44 à 54 px de haut.
- **Mobile d'abord** : cibles de 44 px, rails horizontaux qui défilent (sommaire de
  « Comment ça marche », onglets légaux).

## Le socle

| Import | Rôle |
| --- | --- |
| `@/components/layout/Coquille` | En-tête, page, pied de page ; défilement vers un fragment (`/#tarifs`) à l'arrivée. |
| `@/components/layout/EnTete` | Logo, trois liens, « 18+ », Se connecter / Connexion, Essayer gratuitement. `LienEntree`, `Majeurs`. |
| `@/components/layout/PiedDePage` | Colonnes Produit et Légal, encart de mise en garde (`AVERTISSEMENT`), ©. |
| `@/components/layout/Navigation` | `ENTREES` (en-tête et pied) et `LEGAL` : une seule source. |
| `@/components/accueil/ExempleCourse` | L'exemple de pronostic du héros (course fictive « Prix de Morlaix »). |
| `@/components/legal/PageLegale` | La colonne de 860 px des pages légales, ses onglets, `SectionLegale`, `ListeLegale`. |
| `@/components/ui/Accordeon` | FAQ en `<details name>` natifs, la première ouverte (copié dans l'app). |
| `@/components/ui/Fictif` | « Chevaux et chiffres fictifs, pour illustration. » — **obligatoire** sous tout exemple. |
| `@/lib/exemple` | `EXEMPLE`, la course fictive partagée par l'accueil et « Comment ça marche ». |
| `@/lib/format` | `pourcent` (espace insécable avant « % »). |
| `@/config/site` | Adresses, `CONTACT` / `ecrire(objet)`, `FORMULES`, `RYTHME_PUBLICATION(_COURT)`, `HEURE_RELEVE`, `NOTE_NON_PARTANTS`, `MARGE_ECART`, `LIBELLE_ECART`, `SEUILS_CONFIANCE`, `SEUIL_ECHANTILLON`, `FENETRE_JOURS`, `AVERTISSEMENT`, `EDITEUR`. |

Les chiffres de réglage (seuils, formulations) se **lisent dans `@/config/site`**, jamais
recopiés en clair, et y sont **égaux à ceux de `../src/config/app.ts`** : le site promet ce
que l'app tient.

`public/media/` garde trois photographies de l'ancien site, que le nouveau design n'utilise
pas. L'ancien code (sections, aperçus, `Bloc`, `TexteRevele`…) a été retiré le 18/09/2026 ;
il est dans la sauvegarde `Desktop\crosswell-pronostics-sauvegarde-2026-09-18\site`.

## Les pages

- **Accueil** (`pages/Accueil.tsx`) : héros et exemple de course, quatre atouts, trois
  étapes, bandeau « Transparence », tarifs (`#tarifs`), mise en garde, FAQ.
- **Comment ça marche** (`pages/Methode.tsx`) : sommaire collé, sept sections numérotées
  (modèle, lecture d'un pronostic, cote et probabilité avec calculateur, écart au marché,
  confiance, limites, questions), bandeau vert final. La page Méthode de l'app
  (`../src/pages/Methode.tsx`) est la même, plus une section « Comment nos résultats sont
  comptés » (`#mesure`) : une correction de l'une se reporte sur l'autre.
- **Pages légales** : Confidentialité et Mentions légales, en onglets. **Pas de CGU** tant
  qu'elles ne sont pas rédigées et validées (la maquette n'en donne qu'un squelette à
  « [À COMPLÉTER] ») — or elles deviennent nécessaires avant de vendre des Pass en ligne.
  **Pas de page « Jeu responsable »** : hors de notre positionnement (ci-dessous).

## Le positionnement — c'est du droit, pas du style

Crosswell publie des **analyses statistiques** sur les courses hippiques. Ce n'est ni un
opérateur de jeux ni un service de conseil en mise, secteur réglementé dans lequel nous
n'entrons pas. **Arbitrage du fondateur, confirmé le 18/09/2026 face aux maquettes** : la
règle stricte l'emporte. Les maquettes assument l'univers du pari (« Nous ne prenons aucun
pari », message officiel « jeux d'argent » et Joueurs Info Service, « Si vous pariez, ne
misez que… », page Jeu responsable) : **rien de cela n'est repris**.

- **Vocabulaire banni** : pari, parier, mise, miser, jouer, joueur, jeu d'argent, gain,
  gagner de l'argent, rendement, rentable, ROI, bankroll, value, cash, « bon plan »,
  « tuyau », « coup sûr », « conseil » (sauf pour dire que nous n'en sommes pas un).
- **« Value » → « Écart + »** (`LIBELLE_ECART`), le marqueur de l'app : notre probabilité de
  victoire dépasse d'au moins `MARGE_ECART` (10 %, en relatif) celle qu'implique la cote,
  marge de l'opérateur retirée. Les cotes de l'app sont **de clôture, relevées après la
  course** : l'écart se lit après coup, sur les réunions cotées. Ne jamais écrire « cote en
  direct » ni « évolution de la cote » (celle de l'app est simulée, en développement
  seulement).
- **Le prix des formules est une exception explicite** : c'est le prix d'un service
  d'analyse, pas une valorisation de ce que nos probabilités rapporteraient. Il vit dans
  `FORMULES`.
- On dit **probabilité**, **estimation**, **pronostic**, **notre favori** (le cheval classé
  1er), **rang**, **arrivée prédite**, **placé** (dans les 3 premiers), **partants**,
  **non-partant**, **niveau de confiance**, **écart au marché**. Pourcentages entiers.
- **Aucune promesse de résultat, aucun auto-dénigrement.** Des verbes de mesure (annoncer,
  publier, comparer) ; jamais « le modèle se trompe », « même mauvais », « nos favoris sont
  battus », « ce que nous ne savons pas faire ». Les trois mentions restent en toutes
  lettres : une probabilité est une estimation, aucun résultat n'est garanti, les
  performances passées ne préjugent pas des résultats futurs.
- **Aucun chiffre réel inventé** : ni taux présenté comme mesuré, ni nombre de clients, ni
  témoignage, ni « [X ANNÉES] ». Les exemples sont fictifs et portent `<Fictif />`. Un ordre
  de grandeur mesuré (réunions sans cote, marge de l'opérateur ≈ 20 %) s'écrit **daté**.
- Une seule mention légale : `AVERTISSEMENT.texte` + majeurs, dans l'encart du pied de
  page. Le « 18+ » de l'en-tête dit l'âge minimum, sans message des jeux d'argent.

## Ce que le service est, en faits (tout est vrai et vient de l'app)

- **Publication** : `RYTHME_PUBLICATION` — calcul chaque nuit, publication le matin même,
  pour les courses du jour. Le calcul de la veille (décision du 17/09/2026) a été
  **abandonné le 20/09** : ne promettre ni « dès la veille », ni les courses de demain.
  **Aucune heure** n'est écrite. Une fois publiées, les probabilités ne sont **jamais
  recalculées**, même après un retrait ; un non-partant est signalé dans la journée
  (`NOTE_NON_PARTANTS`, citée telle quelle).
- **Sur une course** : l'arrivée prédite, le pourcentage de victoire et de place de chaque
  partant, le niveau de confiance (`SEUILS_CONFIANCE` : élevée dès 28 %, moyenne dès 18 %),
  la cote relevée et le marqueur « Écart + » sur les réunions cotées, l'arrivée une fois la
  course courue. Les arrivées sont relevées le jour même, complétées le soir vers
  `HEURE_RELEVE`.
- **Fiches** : cheval, jockey, entraîneur (performances publiées par France Galop — nous ne
  sommes pas partenaires de France Galop), et un **comparateur** de deux ou trois partants.
  Pas de « facteurs du pronostic » (le modèle ne les exporte pas), pas de suivis ni
  d'alertes (ils n'existent pas).
- **Le modèle** regarde la valeur du cheval, sa forme récente, la distance, la catégorie, la
  taille du peloton, le jockey et l'entraîneur. Il **ignore** la presse, les informations
  d'écurie et **les cotes**.
- **Nos résultats** vivent dans l'application (derrière un compte) : filtres par période,
  type de course, distance, hippodrome ; chaque taux avec son effectif ; échantillon court
  signalé sous `SEUIL_ECHANTILLON` courses jugées. Le site y renvoie (`URL_RESULTATS`).
- Environ quatre réunions sur dix ne sont pas cotées (constat d'août 2026).
- **La connexion n'est pas ici.** Elle vit dans l'application (`/connexion`), parce que la
  session est stockée par origine. **Jamais de formulaire de mot de passe sur la vitrine.**

## Les formules, et ce qui attend le système de compte

Tarifs **retenus par le fondateur le 18/09/2026** (ceux des maquettes) : Gratuit (0 €,
une course offerte par jour), Pass 1 jour (4,99 €), Pass mensuel (12,99 €, recommandé),
Pass annuel (99 €, soit 8,25 €/mois). Les points de chaque carte ne promettent que ce que
l'app fait.

**L'inscription existe dans l'application** depuis le 18/09/2026 (`../src/pages/Inscription.tsx`,
développée « comme si tout était prêt » à la demande du fondateur) : Compte → Formule →
Paiement (Stripe Checkout, page hébergée) → Bienvenue. « Essayer gratuitement » y mène, et
chaque bouton de formule y arrive la formule cochée (`inscrireAvec`). La phrase sous la
grille dit « Paiement sécurisé par Stripe ».

Ce qui manque encore, et interdit de mettre le site en ligne :

- **Le paiement Stripe côté serveur** (fonction `paiement-session`, webhook) : sans lui,
  l'étape Paiement de l'app affiche « pas encore ouvert ». Voir `../src/services/paiement.ts`.
- **Le contrôle d'accès par formule**, dans l'app et dans les vues de la base : aujourd'hui,
  tout compte connecté voit tout — une inscription ouvre donc tout le produit gratuitement.
- **La course offerte chaque jour** (formule Gratuit) : la règle n'est pas tranchée
  (INTEGRATION.md, A5).
- **Les conditions générales** (lien de l'inscription vers `/cgu`, page à créer une fois le
  texte rédigé et validé).
- La résiliation se fait encore par e-mail (FAQ, page Compte) : à réécrire avec le portail
  client Stripe.

En développement, `.env.development` fait pointer le site vers l'app locale (port 5190) :
sans lui, « Se connecter » ouvrirait la production, qui n'a pas la même version.

## Ton

Celui de l'app : sobre, précis, honnête, à la première personne du pluriel. Phrases courtes,
verbes concrets, pas de superlatif, pas de point d'exclamation, pas de jargon anglais.
Typographie française : apostrophe typographique `’`, espace insécable avant `:` `;` `?` `!`
et dans « 28 % », « 24 h » (`&nbsp;` en JSX, ` ` en échappement dans une chaîne JS —
**jamais ` ` dans le texte JSX, où il s'afficherait tel quel**).

## Le build produit des fichiers réels — ne pas remettre la réécriture attrape-tout

`vercel.json` contenait `rewrites: [{ source: "/(.*)", destination: "/index.html" }]`. C'est le
réflexe habituel pour un SPA, et c'est **faux ici** : le site répondait **200 sur n'importe
quelle URL**, y compris `/robots.txt` et `/sitemap.xml` qui renvoyaient du HTML. Google y voit
des « soft 404 » en masse et des doublons. La réécriture a été retirée le 20 septembre 2026.

Ce qui la remplace : `scripts/apres-build.mjs`, lancé par `npm run build` après `vite build`.
Il écrit, à partir du `dist/index.html` construit :

- **un fichier HTML réel par route** (`dist/methode/index.html`, …), chacun avec son `<title>`,
  sa description, son `<link rel="canonical">` absolu et son `og:url` — Vercel les sert
  directement, sans réécriture ;
- **`dist/404.html`** en `noindex`, que Vercel sert avec un vrai code 404 pour tout le reste ;
- **`dist/robots.txt` et `dist/sitemap.xml`**, dérivés de la même table `PAGES` pour qu'ils ne
  puissent pas diverger du routeur.

Règles qui en découlent :

- **Toute nouvelle route de `src/App.tsx` doit être ajoutée à `PAGES`** dans
  `scripts/apres-build.mjs`, sinon elle n'a ni fichier HTML, ni canonical, ni entrée au
  sitemap — et Vercel la servira en 404.
- Le `<title>` et la description y sont **recopiés** de ce que `useTitre` pose côté client :
  les deux doivent dire la même chose. Le script a des garde-fous qui font échouer le build si
  `index.html` change de forme.
- **`ORIGINE`** (en tête du script, surchargeable par `VITE_URL_SITE`) est la seule valeur à
  changer le jour où le domaine définitif est tranché.
- `vercel.json` pose un `X-Robots-Tag: noindex, nofollow` sur **tout hôte `*.vercel.app`** :
  le site inachevé ne doit pas entrer dans l'index sous une adresse qu'il faudra quitter, et
  les déploiements de prévisualisation non plus. La règle cesse d'elle-même de s'appliquer dès
  qu'un vrai domaine est branché — rien à défaire.

## Vérification visuelle — un piège connu

Les captures du pane navigateur **sortent noires, figées ou réduites à une bande** dès qu'on
défile ou qu'on redimensionne. Le défilement doux (`scroll-behavior: smooth`) n'avance pas
non plus dans le pane : utiliser `scrollTo({ behavior: 'instant' })`. Vérifier par mesures
(`getBoundingClientRect`, styles calculés) plutôt que sur une capture douteuse.
