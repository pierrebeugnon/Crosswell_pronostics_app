/**
 * APRÈS-BUILD — ce qui rend le site indexable.
 *
 * Vite produit un seul `dist/index.html`. Servi avec une réécriture attrape-tout
 * vers ce fichier, le site répondait **200 sur n'importe quelle URL** : Google y
 * voit des « soft 404 » en masse et des doublons, et `/robots.txt` lui-même
 * renvoyait du HTML. C'est le défaut que ce script corrige.
 *
 * Il écrit, à partir du `index.html` construit :
 *
 * - un fichier HTML RÉEL par route (`dist/methode/index.html`, etc.), avec son
 *   propre `<title>`, sa description et son `<link rel="canonical">` absolu ;
 * - un `dist/404.html`, que Vercel sert avec un vrai code 404 dès que la
 *   réécriture attrape-tout a disparu de `vercel.json` ;
 * - `dist/robots.txt` et `dist/sitemap.xml`, dérivés de la même table de routes,
 *   pour qu'ils ne puissent pas diverger.
 *
 * Le `<title>` et la description posés ici sont ceux que voit le ROBOT et le
 * partage sur les réseaux, avant l'exécution de React. `useTitre` continue de
 * régler le titre côté client pour la navigation interne : les deux doivent
 * dire la même chose, d'où la table ci-dessous, recopiée de `src/lib/useTitre`
 * et des `useTitre()` de chaque page.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ICI = dirname(fileURLToPath(import.meta.url))

/**
 * LES ARTICLES DU BLOG, lus depuis la MÊME source que le site :
 * `src/contenu/articles.json`. Chaque article obtient ainsi sa vraie page HTML,
 * avec son titre, sa description, sa canonique et son entrée de sitemap. Un
 * titre recopié ici finirait par diverger de celui affiché : on ne recopie pas.
 */
const ARTICLES = JSON.parse(await readFile(join(ICI, '..', 'src', 'contenu', 'articles.json'), 'utf8'))
const DIST = join(ICI, '..', 'dist')
const DIST_SERVEUR = join(ICI, '..', 'dist-serveur')

/**
 * LA TÊTE DE LA RUBRIQUE RÉSULTATS, lue dans le bundle de rendu serveur.
 *
 * Ce script tourne APRÈS `vite build --ssr` (voir `npm run build`), donc
 * `dist-serveur/entree-serveur.js` existe déjà. L'importer plutôt que recopier
 * son titre, c'est la même règle que pour les articles juste au-dessus : la
 * fonction `api/resultats` sert cette tête sur `/resultats`, et deux copies
 * d'un même titre finissent toujours par diverger.
 */
const { rendre, teteRubrique } = await import(
  pathToFileURL(join(DIST_SERVEUR, 'entree-serveur.js')).href
)
const RUBRIQUE = teteRubrique()

/**
 * L'ORIGINE CANONIQUE. C'est la seule valeur à changer le jour où le domaine
 * définitif est tranché — `robots.txt`, `sitemap.xml` et tous les `canonical`
 * en découlent.
 *
 * Par défaut : `crosswell.io`, le domaine de production depuis le 03/10/2026.
 * Le défaut était l'URL Vercel du projet, du temps où le domaine n'était pas
 * tranché : laissé en place, il faisait écrire des `canonical` en `.vercel.app`
 * sur les pages servies par le vrai domaine — le doublon exact que la balise
 * est censée empêcher. `vercel.json` garde son `X-Robots-Tag: noindex` sur
 * `*.vercel.app`, qui protège les déploiements de prévisualisation.
 *
 * MÊME VALEUR DANS `api/resultats.ts`, qui pose les canoniques des pages de
 * résultats : les deux lisent `VITE_URL_SITE` et retombent sur le même défaut.
 */
const ORIGINE = (process.env.VITE_URL_SITE ?? 'https://crosswell.io').replace(/\/+$/, '')

const SUFFIXE = 'Crosswell Pronostics'

/**
 * LE TITRE DE L'ACCUEIL — 54 signes, et c'est une contrainte, pas un hasard :
 * au-delà de 60, un moteur le tronque et c'est la fin de la phrase qui tombe.
 * L'ancien en faisait 64, l'ancienne description 179 (coupée à 155) : sur la
 * page la plus demandée du site, les deux lignes que voit un visiteur avant de
 * cliquer étaient amputées.
 *
 * `src/lib/useTitre.ts` POSE LE MÊME TITRE côté client. Les deux doivent dire
 * la même chose : l'un est lu par le robot, l'autre par l'onglet.
 */
const TITRE_ACCUEIL = 'Crosswell — Pronostics hippiques de toutes les courses'

const DESCRIPTION_ACCUEIL =
  'Toutes les courses du jour analysées chaque matin : les chances de chaque partant, en pourcentage. Une course offerte par jour, sans carte bancaire.'

/** Une entrée par route de `src/App.tsx`. `priorite` ne sert qu'au sitemap. */
const PAGES = [
  {
    chemin: '/',
    titre: TITRE_ACCUEIL,
    description: DESCRIPTION_ACCUEIL,
    priorite: '1.0',
  },
  {
    chemin: '/methode',
    titre: `Comment ça marche — ${SUFFIXE}`,
    description:
      'Sept facteurs mesurés, aucune cote lue : comment Crosswell calcule les chances de victoire et de place de chaque partant, expliqué sans jargon.',
    priorite: '0.8',
  },
  {
    chemin: '/mentions-legales',
    titre: `Mentions légales — ${SUFFIXE}`,
    description: 'Éditeur, directeur de la publication et hébergeur du site Crosswell Pronostics.',
    priorite: '0.3',
  },
  {
    chemin: '/confidentialite',
    titre: `Confidentialité — ${SUFFIXE}`,
    description:
      'Les données que nous conservons, celles que nous ne collectons pas, et comment exercer vos droits.',
    priorite: '0.3',
  },
  // `/resultats` N'A PAS DE FICHIER, et c'est la condition pour qu'il marche.
  // Chez Vercel, une réécriture n'est examinée QU'APRÈS le système de fichiers :
  // si `dist/resultats/index.html` existait, il serait servi — coquille vide —
  // et la fonction `api/resultats` ne serait jamais appelée. Cette entrée ne
  // sert donc qu'à deux choses : fabriquer l'enveloppe que la fonction
  // remplit (`dist-serveur/coquille.js`), et déclarer l'adresse au sitemap.
  //
  // Le titre et la description sont ceux de la RUBRIQUE, et ils sont LUS DANS
  // LE BUNDLE (`teteRubrique`, plus haut) : la fonction `api/resultats` sert la
  // même tête sur `/resultats`, et deux copies d'un même titre finissent
  // toujours par diverger.
  {
    chemin: '/resultats',
    titre: RUBRIQUE.titre,
    description: RUBRIQUE.description,
    priorite: '0.9',
    sansFichier: true,
    // AU SITEMAP depuis le 26/10/2026, en même temps que `INDEXABLE` est passé
    // à `true` dans `api/resultats.ts`. Les deux vont ensemble : déclarer au
    // moteur une adresse qu'on lui demande par ailleurs d'ignorer est un signal
    // contradictoire. Les adresses datées et les pages de course changent chaque
    // jour : elles sont dans `/sitemap-resultats.xml`, servi par une fonction.
  },
  {
    chemin: '/blog',
    titre: `Blog — ${SUFFIXE}`,
    description:
      'Comprendre une course, pas seulement son résultat : notre méthode, nos résultats mois par mois, les hippodromes et ce que nos pourcentages veulent dire.',
    priorite: '0.7',
  },
  // Les articles s'ajoutent ici, lus depuis `src/contenu/articles.json`.
  ...ARTICLES.map((a) => ({
    chemin: `/blog/${a.slug}`,
    titre: a.seo.titre,
    description: a.seo.description,
    priorite: '0.6',
    article: a,
  })),
  {
    chemin: '/cgv',
    titre: `Conditions générales de vente — ${SUFFIXE}`,
    description:
      'Formules, paiement, reconduction, résiliation en ligne et droit de rétractation. Version de travail, en attente de relecture juridique.',
    priorite: '0.3',
  },
  // `/cgu` sert la même page : c'est l'adresse vers laquelle l'application
  // renvoie depuis la case obligatoire de l'inscription. Hors du sitemap, pour
  // ne pas déclarer deux adresses pour un seul document.
  //
  // `canonique` N'EST PAS FACULTATIF ICI. Sans lui, chaque page se déclarait
  // l'originale : deux adresses, le même texte, et deux `canonical` qui se
  // contredisent. C'est la définition du contenu dupliqué, et c'est Google qui
  // tranche alors laquelle des deux il garde.
  {
    chemin: '/cgu',
    titre: `Conditions générales de vente — ${SUFFIXE}`,
    description:
      'Formules, paiement, reconduction, résiliation en ligne et droit de rétractation. Version de travail, en attente de relecture juridique.',
    horsSitemap: true,
    canonique: '/cgv',
  },
]

/** Échappe ce qui part dans un attribut HTML ou dans du XML. */
const echappe = (texte) =>
  texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/**
 * Remplace titre, description et URL dans le gabarit construit par Vite, et
 * insère le `canonical` — absent du `index.html` source, donc ajouté ici.
 *
 * On opère par expressions régulières sur les balises exactes que produit
 * `index.html` plutôt qu'avec un analyseur HTML : le gabarit est à nous, il
 * tient en trente lignes, et une dépendance de plus pour ça n'est pas justifiée.
 * Si `index.html` change de forme, les `assert` ci-dessous le font remarquer.
 */
/**
 * LES DONNÉES STRUCTURÉES d'un article (schema.org/Article). Elles disent à un
 * moteur ce qu'il a sous les yeux : un article daté, son auteur, son éditeur.
 * On ne déclare QUE ce qui est vrai et visible sur la page — pas d'image
 * inventée, pas de note, pas d'avis : un balisage qui promet ce que la page
 * n'affiche pas se retourne contre le site.
 */
/** L'adresse absolue de la couverture d'un article, ou `null` s'il n'en a pas. */
const couvertureAbsolue = (article) =>
  article.couverture ? `${ORIGINE}${article.couverture.fichier}` : null

function donneesArticle(article, url) {
  const image = couvertureAbsolue(article)
  const article_ = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.titre,
    description: article.seo.description,
    datePublished: article.date,
    // Pas d'historique de révision : tant qu'un article n'est pas réécrit, sa
    // date de modification est sa date de publication. Mettre la date du build
    // ferait croire à une mise à jour à chaque déploiement.
    dateModified: article.date,
    inLanguage: 'fr-FR',
    articleSection: article.rubrique,
    isAccessibleForFree: true,
    // `image` n'est déclarée QUE si l'article porte vraiment une couverture :
    // un balisage qui annonce une image absente de la page se retourne contre
    // le site. D'où le `...(image ? …)` plutôt qu'une valeur par défaut.
    ...(image ? { image: [image] } : {}),
    author: { '@type': 'Organization', name: 'Crosswell' },
    publisher: { '@type': 'Organization', name: 'Crosswell' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  }

  // Le fil d'Ariane, celui-là même qu'affiche `pages/Article.tsx` : on ne
  // déclare pas un chemin que la page ne montre pas.
  const ariane = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${ORIGINE}/` },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${ORIGINE}/blog` },
      { '@type': 'ListItem', position: 3, name: article.titre, item: url },
    ],
  }

  return JSON.stringify([article_, ariane])
}

/**
 * L'ENTITÉ « CROSSWELL », posée sur l'accueil et sur lui seul.
 *
 * Sans elle, rien ne dit à un moteur que Crosswell est une marque : le mot est
 * d'abord un toponyme, et c'est contre ça que la page d'accueil doit s'ancrer.
 *
 * On ne déclare QUE ce qui est vrai, stable et visible. Pas de `SearchAction`
 * (le site n'a pas de recherche interne, la déclarer serait faux), pas d'offres
 * chiffrées : les prix vivent dans `config/site.ts`, que ce script — du Node
 * simple — ne sait pas lire. Les recopier ici créerait exactement la divergence
 * que le projet interdit.
 */
function donneesAccueil(url) {
  const organisation = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Crosswell',
    alternateName: SUFFIXE,
    url,
    logo: `${ORIGINE}/favicon.svg`,
    description: DESCRIPTION_ACCUEIL,
  }

  const siteWeb = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SUFFIXE,
    url,
    inLanguage: 'fr-FR',
    publisher: { '@type': 'Organization', name: 'Crosswell' },
  }

  return JSON.stringify([organisation, siteWeb])
}

function pageHtml(gabarit, { chemin, titre, description, article, canonique }, { indexable = true } = {}) {
  const adresse = (c) => (c === '/' ? `${ORIGINE}/` : `${ORIGINE}${c}`)
  const url = adresse(chemin)
  // La canonique peut DÉSIGNER UNE AUTRE PAGE : c'est ainsi qu'un alias déclare
  // l'original au lieu de lui faire concurrence.
  const canonical = adresse(canonique ?? chemin)
  let html = gabarit

  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${echappe(titre)}</title>`)
  html = html.replace(
    /<meta\s+name="description"[\s\S]*?\/>/,
    `<meta name="description" content="${echappe(description)}" />`,
  )
  html = html.replace(
    /<meta\s+property="og:title"[\s\S]*?\/>/,
    `<meta property="og:title" content="${echappe(titre)}" />`,
  )
  html = html.replace(
    /<meta\s+property="og:description"[\s\S]*?\/>/,
    `<meta property="og:description" content="${echappe(description)}" />`,
  )

  let entetes = indexable
    ? `<link rel="canonical" href="${canonical}" />\n    <meta property="og:url" content="${url}" />`
    : `<meta name="robots" content="noindex" />`

  if (chemin === '/' && indexable) {
    entetes += `\n    <script type="application/ld+json">${donneesAccueil(url)}</script>`
  }

  if (article) {
    // `og:type` est REMPLACÉ, pas ajouté : le gabarit porte déjà `website`, et
    // deux `og:type` contradictoires dans une même page ne valent pas mieux
    // qu'aucun — le réseau social garde celui qu'il veut.
    html = html.replace(
      /<meta\s+property="og:type"[\s\S]*?\/>/,
      `<meta property="og:type" content="article" />`,
    )
    // La couverture sert aussi d'aperçu au partage. `summary_large_image` n'a
    // de sens qu'avec une image : sans elle, la carte reste en `summary`, posé
    // par le gabarit.
    const image = couvertureAbsolue(article)
    if (image) {
      entetes += `\n    <meta property="og:image" content="${echappe(image)}" />`
      entetes += `\n    <meta property="og:image:alt" content="${echappe(article.couverture.alt)}" />`
      html = html.replace(
        /<meta\s+name="twitter:card"[\s\S]*?\/>/,
        `<meta name="twitter:card" content="summary_large_image" />`,
      )
    }

    if (indexable) {
      entetes += `\n    <script type="application/ld+json">${donneesArticle(article, url)}</script>`
    }
  }

  html = html.replace('</head>', `  ${entetes}\n  </head>`)
  return html
}

/**
 * LE CORPS DE LA PAGE, DANS LE HTML SERVI.
 *
 * Sans lui, un robot qui n'exécute pas le JavaScript lit une page vide, et Google
 * diffère un rendu qu'il sautera parfois sur un domaine jeune. `src/main.tsx`
 * reprend ce balisage avec `hydrateRoot`.
 *
 * APPLIQUÉ AUX SEULS FICHIERS DE `PAGES`. La coquille de `api/resultats` et le
 * 404 gardent `#root` vide : la première y verse son propre corps, et le second
 * sert aussi des adresses de résultats, qu'un corps « introuvable » contredirait
 * une fois hydraté.
 */
function avecCorps(html, page) {
  const { corps } = rendre(page.chemin, {})
  // Un article absent de `CORPS` (`src/contenu/articles.ts`) rendrait la page
  // introuvable sous un titre valable : mieux vaut un échec de build.
  if (!corps.includes('<h1') || (page.article && !corps.includes(page.article.titre))) {
    throw new Error(`apres-build : le rendu de ${page.chemin} ne contient pas son titre.`)
  }
  const rempli = html.replace(
    /<div id="root"([^>]*)><\/div>/,
    (_, attributs) => `<div id="root"${attributs}>${corps}</div>`,
  )
  if (rempli === html) throw new Error(`apres-build : #root est introuvable pour ${page.chemin}.`)
  return rempli
}

function sitemapPages() {
  const entrees = PAGES.filter((p) => !p.horsSitemap)
    .map(({ chemin, priorite, article }) => {
      const url = chemin === '/' ? `${ORIGINE}/` : `${ORIGINE}${chemin}`
      // `lastmod` pour les seuls articles, dont la date est écrite dans
      // `articles.json` et reprise par `dateModified`. Ailleurs, ce serait une
      // date de build, qui change à chaque déploiement sans que le contenu bouge :
      // un signal faux. Mieux vaut ne rien déclarer.
      const modifie = article ? `\n    <lastmod>${article.date}</lastmod>` : ''
      return `  <url>\n    <loc>${echappe(url)}</loc>${modifie}\n    <priority>${priorite}</priority>\n  </url>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entrees}\n</urlset>\n`
}

/**
 * `/sitemap.xml` EST UN INDEX, parce que deux listes vivent à deux rythmes : les
 * pages écrites au build, et les résultats servis par `api/sitemap-resultats`.
 * L'adresse ne change pas : c'est celle déclarée à la Search Console.
 */
function indexSitemaps() {
  const entrees = ['sitemap-pages.xml', 'sitemap-resultats.xml']
    .map((f) => `  <sitemap>\n    <loc>${ORIGINE}/${f}</loc>\n  </sitemap>`)
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entrees}\n</sitemapindex>\n`
}

function robots() {
  return [
    'User-agent: *',
    'Allow: /',
    '',
    '# Le site ne sert aucune API ni aucun écran derrière compte : tout est public.',
    '# L’application, elle, vit sur un autre domaine et porte son propre robots.txt.',
    '',
    `Sitemap: ${ORIGINE}/sitemap.xml`,
    '',
  ].join('\n')
}

const gabarit = await readFile(join(DIST, 'index.html'), 'utf8')

// Garde-fous : si le gabarit change de forme, on veut un échec bruyant au build
// plutôt qu'un site déployé avec des balises restées à leur valeur d'accueil.
for (const marqueur of [
  '<title>',
  'name="description"',
  'property="og:title"',
  'property="og:type"',
  '</head>',
  // La fonction `api/resultats` verse le corps rendu dans ce conteneur : sans
  // lui, elle servirait une page sans contenu. Mieux vaut échouer ici.
  'id="root"',
]) {
  if (!gabarit.includes(marqueur)) {
    throw new Error(
      `apres-build : « ${marqueur} » est introuvable dans dist/index.html. ` +
        `Le gabarit index.html a changé — mettre ce script à jour.`,
    )
  }
}

for (const page of PAGES) {
  if (page.sansFichier) continue
  const html = avecCorps(pageHtml(gabarit, page), page)
  const cible = page.chemin === '/' ? join(DIST, 'index.html') : join(DIST, page.chemin, 'index.html')
  await mkdir(dirname(cible), { recursive: true })
  await writeFile(cible, html, 'utf8')
}

// Le 404 porte `noindex` : Vercel le sert avec un vrai code 404, mais si une URL
// fautive traîne dans un lien externe, autant qu'elle ne puisse pas être indexée
// pendant le délai de recrawl.
await writeFile(
  join(DIST, '404.html'),
  pageHtml(
    gabarit,
    {
      chemin: '/404',
      titre: `Page introuvable — ${SUFFIXE}`,
      description: 'Cette adresse n’existe pas ou plus. Les pronostics du jour, eux, sont toujours là.',
    },
    { indexable: false },
  ),
  'utf8',
)

await writeFile(join(DIST, 'sitemap.xml'), indexSitemaps(), 'utf8')
await writeFile(join(DIST, 'sitemap-pages.xml'), sitemapPages(), 'utf8')
await writeFile(join(DIST, 'robots.txt'), robots(), 'utf8')

/**
 * LES DEUX ENVELOPPES DE LA FONCTION `api/resultats`.
 *
 * Elle a besoin du HTML construit — celui qui porte les URL hachées du bundle.
 * Il est écrit ici en MODULES JAVASCRIPT plutôt que lu en HTML à l'exécution :
 * une fonction Vercel ne reçoit pas la sortie statique dans son système de
 * fichiers, alors qu'un `import` est suivi par l'empaqueteur et embarqué sans
 * réglage. C'est aussi un échec au build, et non en production, si le fichier
 * manque.
 */
/**
 * `JSON.stringify` donne un littéral JavaScript valide, à deux caractères
 * près : U+2028 et U+2029 terminent une ligne en JavaScript et ne sont pas
 * échappés par JSON. Laissés tels quels, ils couperaient le module en deux.
 */
const moduleTexte = (nom, texte) =>
  `// Écrit par scripts/apres-build.mjs — ne pas modifier à la main.\n` +
  `export const ${nom} = ${JSON.stringify(texte)
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')}\n`

const rubrique = PAGES.find((p) => p.chemin === '/resultats')
if (!rubrique) throw new Error('apres-build : l’entrée /resultats a disparu de PAGES.')

await writeFile(
  join(DIST_SERVEUR, 'coquille.js'),
  moduleTexte('COQUILLE', pageHtml(gabarit, rubrique)),
  'utf8',
)
await writeFile(
  join(DIST_SERVEUR, 'introuvable.js'),
  moduleTexte('INTROUVABLE', await readFile(join(DIST, '404.html'), 'utf8')),
  'utf8',
)

const fichiers = PAGES.filter((p) => !p.sansFichier).length
console.log(
  `après-build : ${fichiers} pages rendues, 404.html, sitemap.xml, sitemap-pages.xml, robots.txt, ` +
    `et les enveloppes dist-serveur/{coquille,introuvable}.js (origine ${ORIGINE})`,
)
