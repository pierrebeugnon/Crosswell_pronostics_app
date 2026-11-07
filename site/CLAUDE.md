# Crosswell — Site vitrine (`site/`)

Site public de **Crosswell Pronostics**, la plateforme client de pronostics hippiques
(`../`, même dépôt). Il présente le service et renvoie vers l'application
(`URL_APPLICATION` dans `src/config/site.ts`). Projet Vite + React 19 + TypeScript +
Tailwind, frère de l'app.

**Sans compte, mais plus sans base.** Jusqu'au 19/10/2026 le site était entièrement statique
(« aucune base, aucun appel réseau »). Les pages de résultats lisent désormais trois vues
publiques de Supabase, à la clé anonyme et en lecture seule — voir « Les résultats » plus
bas. Tout le reste du site n'appelle toujours rien, et **aucune page du site n'a de
connexion** : la session vit dans l'application, sur une autre origine.

```bash
cd site && npm run dev        # http://localhost:5195
cd site && npm run typecheck  # tsc --noEmit — DOIT passer avant de rendre la main
cd site && npm run build      # vite build, puis vite build --ssr, puis apres-build.mjs
```

Pages : `/` (accueil), `/methode` (« Comment ça marche »), `/blog` et `/blog/<slug>`,
`/resultats`, `/resultats/archives`, `/resultats/<AAAA-MM-JJ>` et `/resultats/<date>/<hippodrome>/c<n>-<slug>`, `/statistiques`, `/outils/cote-probabilite`
(calcul dans `lib/cotes.ts`, testé dans `tests/site/`),
`/cgv` (alias `/cgu`), `/confidentialite`, `/mentions-legales`, et la page introuvable.
Les routes vivent dans **`src/routes.tsx`**, pas dans `App.tsx` : elles sont partagées
entre le routeur du navigateur et le rendu serveur, pour qu'une page ne puisse pas exister
d'un côté et manquer de l'autre.
Alias `@/` → `src/`. Identifiants, commentaires et textes **en français**, comme dans l'app.

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
| `@/lib/format` | `pourcent` (espace insécable avant « % »), `jourLong`/`jourCourt`, `distance`, `hippodrome` et `nomCourse` — ces deux derniers remettent en casse de titre ce que la base garde en capitales. |
| `@/routes` | `ROUTES`, la table des routes, partagée par `App.tsx` (navigateur) et `entree-serveur.tsx` (serveur). |
| `@/lib/resultats` | Les types publics d'une journée et d'une course, les cinq états (`definitive`…`aVenir`), `cheminCourse`/`cheminJournee`, `slug`, `favoriDe`, `instantParis`. |
| `@/services/resultats` | `chargerJournee`, `chargerCourse`, `chargerJourneesDisponibles` — la lecture des trois vues, et le repliage des lignes à plat en courses. |
| `@/lib/resultats-seo` | `analyser` (le chemin), `decrire` (titre, description, canonique, données structurées), `teteRubrique`. |
| `@/lib/donnees-initiales` | Le pont entre le rendu serveur et le navigateur : `FournisseurDonnees`, `useDonneesInitiales`, `serialiser`. |
| `@/lib/supabase` | Le client, minuscule : sans session, sans rafraîchissement, `null` si les variables manquent. |
| `@/components/blog/Corps` | Les blocs du corps d'un article : `H2`, `H3`, `P`, `Liste`, `Chiffre`, `Encadre`, `Tableau`. |
| `@/contenu/articles` | Le catalogue du blog : `ARTICLES`, `articlesRecents`, `articleParSlug`, `rubriquesUtilisees`, `articlesLies`. Métadonnées dans `articles.json`. |
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
- **Blog** (`pages/Blog.tsx`, `pages/Article.tsx`) : l'index filtré par rubrique, et
  l'article. Voir « Écrire un article » ci-dessous.
- **Résultats** (`pages/Resultats.tsx`, `pages/ResultatCourse.tsx`) : la journée, et
  l'arrivée d'une course. Voir « Les résultats » ci-dessous — ce sont les deux seules
  pages qui lisent la base, et les deux seules rendues côté serveur.
- **Pages légales** : Confidentialité et Mentions légales, en onglets. **Pas de CGU** tant
  qu'elles ne sont pas rédigées et validées (la maquette n'en donne qu'un squelette à
  « [À COMPLÉTER] ») — or elles deviennent nécessaires avant de vendre des Pass en ligne.
  **Pas de page « Jeu responsable »** : hors de notre positionnement (ci-dessous).

## Les résultats — la base, et le rendu serveur

Ouvertes le 19/10/2026. Ce sont les seules pages du site qui lisent des données, et les
seules servies par une fonction plutôt que par un fichier.

### Ce que la base expose, et pourquoi le verrou n'est pas ici

Trois vues publiques, lisibles à la **clé anonyme** et à rien d'autre :

| Vue | Migration | Contenu |
| --- | --- | --- |
| `resultats_publics` | `db/013`, `db/014` | Une ligne par partant des courses **jugées** : rang annoncé, probabilité, place réelle, cote. |
| `programme_public` | `db/013`, `db/014` | Une ligne par course **à venir**, sans **aucune** colonne de probabilité. |
| `journees_publiques` | `db/015` | Une ligne par jour ayant des résultats — le calendrier. |

**Le verrou est en SQL, jamais dans le front.** Une course pas encore jugée n'a aucune
ligne dans `resultats_publics`, et `programme_public` ne porte pas de colonne à cacher.
Aucun filtre côté client ne vaudrait cela : un filtre s'oublie, une colonne absente non.
`src/lib/supabase.ts` coupe `persistSession` et `autoRefreshToken`, et rend `null` quand
les variables manquent — une page de résultats mal configurée ne doit pas faire tomber
l'accueil. La clé anonyme est **publique par conception**, comme dans l'app : ce qu'elle
ouvre est décidé par les droits.

Les vues **reproduisent ce que lit l'application**, pas plus : ni allocation, ni terrain,
ni numéro de réunion, ni âge/sexe/poids: l'app ne les affiche pas non plus. La seule
source qui les porte (`pmu_courses`, `pmu_partants`) ne couvre que le plat et n'est plus
alimentée. Le jour où l'app les affichera, la vue les ajoutera et les composants les
porteront sans retouche : les cases sont déjà écrites, elles ne s'affichent pas quand la
valeur est `null`. **Ne pas repartir de `pmu_*` :** regarder comment l'app fait, et faire
pareil (arbitrage du fondateur, 19/10/2026).

### Le rendu serveur — `api/resultats.ts`

Une coquille vide que React remplit dans le navigateur ne suffit pas : Google exécute le
JavaScript, mais sur un domaine jeune ce rendu est différé et parfois sauté, et d'autres robots
ne l'exécutent pas. Le reste du site est donc rendu **au build** (voir « Le build produit des
fichiers réels »). Les résultats changent chaque jour : ils ont une fonction, **et ces pages
seulement**.

La chaîne, dans l'ordre :

1. `vercel.json` réécrit `/resultats` et `/resultats/:chemin*` vers `/api/resultats`, **en
   passant le chemin demandé en paramètre `chemin`** : après réécriture, `request.url` ne
   vaut plus que `/api/resultats`.
2. la fonction lit la journée via `chargerJournee` — **le même code que le navigateur**,
   importé depuis `dist-serveur/entree-serveur.js` ;
3. elle rend l'arbre React avec ces données (`rendre`), pose la tête (`decrire`), et dépose
   les mêmes données dans un `<script>` pour que le navigateur n'ait pas à refaire la
   requête ;
4. elle répond un **vrai 404** quand l'adresse ne désigne rien, et **503** si la base est
   injoignable — jamais 404, qui ferait désindexer des pages valables à la première panne.

Quatre règles qui ne se devinent pas :

- **`export default { fetch: … }`**, pas `export default function`. Vercel ne documente un
  `export default` qui est une fonction que pour le style Node `(req, res)`, où `request`
  est un `IncomingMessage` : `new URL(request.url)` lèverait et la valeur renvoyée serait
  ignorée. Ce n'est pas un choix de style.
- **`/resultats` n'a PAS de fichier HTML**, et c'est la condition pour que tout marche :
  chez Vercel une réécriture n'est examinée qu'**après** le système de fichiers. D'où le
  drapeau `sansFichier` sur son entrée de `PAGES`, dans `scripts/apres-build.mjs`.
- **Les pages ne lisent jamais `window` directement** : `src/lib/donnees-initiales.tsx`
  donne deux chemins — un contexte React au serveur (il n'y a pas de `window`), et
  `window.__CROSSWELL__` au navigateur, consommé à la première lecture. Resservir cette
  valeur à la seconde navigation afficherait la veille sous le titre du jour.
- **`api/` n'importe rien de `src/` directement.** Les sources lisent `import.meta.env.VITE_…`,
  que Vite remplace à la construction et que Node ne connaît pas ; et Vercel ne supporte
  pas les *path mappings* du `tsconfig.json` (donc pas d'alias `@/`). Tout passe par
  `src/entree-serveur.tsx`, qui réexporte ce dont la fonction a besoin.

### L'indexation est ouverte depuis le 26/10/2026

`INDEXABLE = true`, en tête de `api/resultats.ts`, et `/resultats` est au sitemap. Les deux
vont **ensemble** : déclarer au sitemap une adresse qu'on demande de ne pas indexer est un
signal contradictoire.

**Deux chemins vers les anciennes journées**, parce que le calendrier s'arrête à 60 :
`/resultats/archives` (`pages/ArchivesResultats.tsx`), lié depuis « Journées précédentes », et
`/sitemap-resultats.xml` (`api/sitemap-resultats.ts`), qui liste journées et courses jugées.

### Les statistiques : les courses, jamais le modèle

`/statistiques` est rendue par la même fonction (`servirStatistiques`), à partir de
`resultats_publics`. **Elle ne lit aucune colonne du modèle** (`lib/statistiques.ts`, couvert
par `tests/site/statistiques.test.ts`) : les taux de nos pronostics vivent dans l'application.
Aucun chiffre n'est écrit dans le texte de la page, tout vient du calcul. « Le favori » y désigne
la cote de clôture la plus basse : **ne pas le confondre avec « notre favori »**. Une requête par
journée à chaque calcul : le cache du CDN est ce qui rend cela supportable, et les liens passent
par `<a>`, pas par le routeur, pour que le navigateur ne refasse pas ces requêtes.

### Titres et descriptions : une seule source

`src/lib/resultats-seo.ts` calcule titre, description, canonique et données structurées.
Il est dans le **même bundle que les pages**, donc le titre servi au robot est calculé par
le même code, avec les mêmes formateurs, que le H1 affiché.

**Les deux pages appellent `decrire()` pour leur `useTitre`, avec `{ suffixe: false }`** —
même règle que les articles, et pour la même raison : Google exécute le JavaScript, donc un
`useTitre` qui poserait sa propre formule ferait lire au moteur un titre différent de celui
qu'il a reçu. C'est arrivé : au premier déploiement du rendu serveur (21/10/2026), les trois
types de page divergeaient. `decrire()` prend son `origine` **en dernier et optionnelle**,
justement pour que les pages puissent l'appeler sans en avoir une sous la main.

Un détail qui se trompe facilement : la `Demande` passée depuis la page se construit sur le
paramètre d'adresse, **pas** sur la journée affichée. Sur `/resultats` sans date, le serveur
sert le titre de la rubrique ; l'onglet doit dire la même chose, même si le corps montre les
courses du jour. `teteRubrique()` est même
**importée par `scripts/apres-build.mjs`** depuis le bundle : le titre de `/resultats` n'est
écrit qu'à un seul endroit. Le vocabulaire du positionnement s'applique ici aussi — c'est
l'endroit où l'on écrit « pour Google » et où le mot banni revient tout seul.

## Écrire un article

Un article, c'est **deux fichiers** — jamais un seul :

1. une entrée dans **`src/contenu/articles.json`** : `slug`, `rubrique`, `titre` (le H1),
   `chapo`, `date`, `minutes`, `seo.titre` (≤ 60 signes) et `seo.description` (≤ 155),
   et `sections` (les ancres du sommaire) ;
2. un composant dans **`src/contenu/articles/<slug>.tsx`**, export par défaut, inscrit
   dans `CORPS` de `src/contenu/articles.ts` — sans quoi l'article est ignoré.

`articles.json` est la **source unique** : `scripts/apres-build.mjs` le lit, en Node, pour
écrire la vraie page HTML de l'article (titre, description, canonique, `og:type article`,
données structurées `Article` + `BreadcrumbList`) et l'ajouter au `sitemap.xml`. Un titre
recopié ailleurs finirait par diverger, et c'est alors l'autre que verrait le moteur. Pour
la même raison, `Article.tsx` appelle `useTitre(seo.titre, { suffixe: false })` : le titre
d'onglet doit être **identique** à celui du HTML servi.

Le corps n'écrit **aucune classe** : il assemble les blocs de `components/blog/Corps.tsx`
(`H2`, `H3`, `P`, `Liste`, `Chiffre`, `Encadre`, `Tableau`). L'`id` de chaque `H2` doit
figurer dans `sections`. Les chiffres (prix, seuils, rythme de publication, mentions) se
**lisent dans `@/config/site`**, jamais saisis en clair : un article reste en ligne des
mois, et un prix recopié devient un prix faux.

Les rubriques sont `Méthode`, `Analyses`, `Hippodromes`, `Produit`. **Pas de « Jeu
responsable »**, malgré la maquette : hors positionnement (ci-dessous). Le vocabulaire
banni vaut aussi pour les `seo.titre`, `seo.description`, les slugs, les `alt` et les
ancres de liens — ce sont les endroits où il revient par inadvertance, parce qu'on les
écrit « pour Google » et plus pour un lecteur. **Aucun taux de réussite dans le texte** :
il serait faux le lendemain ; l'article explique comment on le compte, l'app dit combien
il vaut.

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
- **UNE EXCEPTION, accordée par le fondateur le 28/10/2026 : « Quinté+ ».** Il la tient pour
  la désignation usuelle du grand rendez-vous de la journée, et non pour une invitation à
  parier. Le terme est donc autorisé pour NOMMER une course, et à rien d'autre : ni
  « jouer le Quinté+ », ni un pronostic présenté comme une combinaison à jouer. Ne pas
  retirer cette ligne au nom de la règle générale — c'est un arbitrage, pas un oubli.
  **C'est en place depuis le 28/10/2026.** Le drapeau est collecté par `pmu_arrivees.py`
  depuis la réponse du programme PMU déjà téléchargée (`courses[].paris[].codePari` vaut
  `QUINTE_PLUS`), rangé dans `modele_prediction_engagement.quintes` (migration 038 du
  pipeline) et servi par `db/018` (`resultats_publics`, `programme_public`) et `db/019`
  (`client_predictions`). À l'écran, trois formes : une pastille **rouge** `Quinté+` (liste
  d'une journée et page d'arrivée du site ; programme et en-tête de course de l'app), un
  **filet rouge** sur l'élément cliquable (ligne du site, ligne du programme, pastille du
  ruban de téléphone, carte de l'accueil) et, là où une pastille écraserait le nom, **le mot
  en rouge dans le texte** (cartes et liste de l'accueil de l'app). Le rouge est un choix du
  fondateur (28/10/2026), pour la reconnaissance : c'est la couleur sous laquelle le Quinté+
  se présente partout ailleurs. **Jamais en vert** : le vert dit « notre pronostic » et
  « gagnant » partout ailleurs, et le réutiliser laisserait croire que nous recommandons
  cette course. Et **jamais `loss`**, l'autre rouge de la charte, qui porte les erreurs,
  les pertes et les cotes en hausse : le Quinté+ a son propre jeton, `--c-quinte`
  (#FF4757), assez distant du corail pour qu'on ne les confonde pas — les mesures sont dans
  le commentaire du jeton.
  Deux limites à connaître avant de toucher à tout cela. Le Quinté+ se court **souvent au
  trot**, discipline hors de notre périmètre : 34 des 79 jours relevés le 28/10, soit 43 %
  de journées où il n'y a rien à mettre en avant — c'est NORMAL, pas une collecte manquée.
  Et il ne faut PAS poser le drapeau sur `pmu_courses`, qui ne garde que le plat : le
  Quinté+ du 28/10 était le Prix Santo Pietro, une course de haies à Auteuil, absente de
  cette table.
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

Le site **est en ligne sur `crosswell.io` depuis le 03/10/2026** : la liste ci-dessous
disait « interdit de mettre le site en ligne », ce n'est plus l'état des lieux. Ce sont
désormais les manques du **parcours d'achat**, pas du déploiement :

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

**Les deux variables Supabase vivent dans `site/.env.local`, qui n'est pas suivi par git** :
`VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`. Elles ont d'abord été écrites dans
`.env.development`, qui **est** suivi — une clé dans l'historique du dépôt. Ne pas refaire
cette erreur : `.env.development` ne porte qu'une note.
Vite les **fige à la construction**, dans le bundle du navigateur comme dans celui du rendu
serveur : elles doivent donc être déclarées **dans le projet Vercel**
(`crosswell-pronostics-site`), sinon `supabase` vaut `null` et les pages de résultats
répondent « indisponible » en production alors qu'elles marchent en local.

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

**`vercel.json` porte depuis le 19/10/2026 deux réécritures, et elles ne contredisent pas
ce qui précède** : elles sont bornées à `/resultats` et `/resultats/:chemin*`, et leur
destination est une fonction qui répond un vrai 404 quand l'adresse ne désigne rien — pas
un `index.html` servi en 200. C'est exactement l'inverse de l'attrape-tout. **Ne jamais
élargir ces sources**, et ne jamais ajouter de règle sur `/(.*)`. Deux autres, depuis
novembre 2026, ne portent que sur les adresses exactes `/sitemap-resultats.xml` et
`/statistiques`.

Ce qui la remplace : `scripts/apres-build.mjs`, lancé par `npm run build` après `vite build`.
Il écrit, à partir du `dist/index.html` construit :

- **un fichier HTML réel par route** (`dist/methode/index.html`, …), chacun avec son `<title>`,
  sa description, son `<link rel="canonical">` absolu, son `og:url` et, depuis le 01/11/2026,
  **son corps rendu** (`avecCorps`, que `src/main.tsx` reprend avec `hydrateRoot`) — Vercel les
  sert directement, sans réécriture ;
- **`dist/404.html`** en `noindex`, `#root` vide, que Vercel sert avec un vrai code 404 pour tout
  le reste ;
- **`dist/robots.txt`, `dist/sitemap.xml` (un index) et `dist/sitemap-pages.xml`**, dérivés de la
  même table `PAGES` pour qu'ils ne puissent pas diverger du routeur.

**Une page éditoriale doit donc rendre le même HTML au build et au navigateur** : pas d'horloge,
pas de `window`, pas de date sans `timeZone`. Un écart ne casse rien, mais React refait la page.

Règles qui en découlent :

- **Toute nouvelle route de `src/routes.tsx` doit être ajoutée à `PAGES`** dans
  `scripts/apres-build.mjs`, sinon elle n'a ni fichier HTML, ni canonical, ni entrée au
  sitemap — et Vercel la servira en 404.
- **Une exception, et une seule : les résultats.** `/resultats` est dans `PAGES` mais porte
  `sansFichier` (la réécriture doit gagner, voir « Les résultats »), et les adresses datées
  ou de course n'y sont pas du tout : elles se comptent par milliers et changent chaque
  jour, un fichier par course serait un build sans fin. C'est la fonction `api/resultats`
  qui leur donne tête, canonique et code de retour. Toute autre route, elle, reste un
  fichier.
- Le `<title>` et la description y sont **recopiés** de ce que `useTitre` pose côté client :
  les deux doivent dire la même chose. Le script a des garde-fous qui font échouer le build si
  `index.html` change de forme.
- **`ORIGINE`** (en tête du script, surchargeable par `VITE_URL_SITE`) est la seule valeur à
  changer le jour où le domaine définitif est tranché.
- `vercel.json` pose un `X-Robots-Tag: noindex, nofollow` sur **tout hôte `*.vercel.app`** :
  le site inachevé ne doit pas entrer dans l'index sous une adresse qu'il faudra quitter, et
  les déploiements de prévisualisation non plus. La règle cesse d'elle-même de s'appliquer dès
  qu'un vrai domaine est branché — rien à défaire.

## L'héritage de l'ancien site — pourquoi `vercel.json` porte des redirections

`crosswell.io` a d'abord servi **Crosswell Élevage**, la plateforme de génétique équine
(version « pro », mise de côté). Google en a indexé les pages, et il les sert encore :
en cherchant « crosswell », on tombait sur « Crosswell - Intelligent Equine Breeding », et
le clic menait à une page morte. Deux causes, et aucune ne se corrige dans le code React.

1. **Les adresses indexées sont sur `www.`**, pas sur l'apex : `www.crosswell.io/en` et
   `www.crosswell.io/fr/contact`. Or `www` était un alias du projet qui **servait le site
   en 200**, sans redirection — deux hôtes pour un seul site. Seule la balise `canonical`
   empêchait le doublon d'être indexé. `vercel.json` redirige maintenant tout `www` vers
   l'apex en 301.
2. **L'ancien site préfixait ses routes par la langue** (`/fr/…`, `/en/…`). Le nouveau n'a
   pas ces chemins : ils tombaient en 404. Ils sont redirigés vers l'accueil.

Ces redirections sont dans `vercel.json` plutôt que dans le réglage « Redirect » du tableau
de bord Vercel : elles suivent le dépôt, se relisent en revue de code, et ne disparaissent
pas si le projet est recréé.

**La racine a sa propre règle, et ce n'est pas un doublon** : chez Vercel, `/:chemin*` ne
matche PAS le chemin `/` tout seul. Mesuré : avec la seule règle générique,
`www.crosswell.io/methode` redirigeait bien, et `www.crosswell.io/` répondait 200. Sans la
règle explicite sur `/`, la page la plus visitée du site reste donc servie sur deux hôtes.

**Ce que les redirections NE font PAS** : elles ne changent pas ce que Google AFFICHE. Le
titre et la description d'un résultat viennent de la dernière exploration ; tant que Google
n'a pas recrawlé, l'ancien libellé reste. Cela se force depuis la Search Console
(propriété de domaine, sitemap, inspection d'URL, et l'outil Suppressions pour masquer les
adresses mortes le temps que l'index se mette à jour). C'est un geste de compte, pas de code.

Un redirect massif vers l'accueil est lu par Google comme un « soft 404 » : les anciennes
adresses seront désindexées, pas transférées. C'est assumé — il n'existe aucun équivalent
de la page « contact » de l'élevage sur un site de pronostics, et l'enjeu est qu'un visiteur
arrive quelque part d'utile plutôt que sur une erreur.

## Vérification visuelle — un piège connu

Les captures du pane navigateur **sortent noires, figées ou réduites à une bande** dès qu'on
défile ou qu'on redimensionne. Le défilement doux (`scroll-behavior: smooth`) n'avance pas
non plus dans le pane : utiliser `scrollTo({ behavior: 'instant' })`. Vérifier par mesures
(`getBoundingClientRect`, styles calculés) plutôt que sur une capture douteuse.
