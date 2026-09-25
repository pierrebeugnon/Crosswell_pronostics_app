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
import { fileURLToPath } from 'node:url'

const ICI = dirname(fileURLToPath(import.meta.url))
const DIST = join(ICI, '..', 'dist')

/**
 * L'ORIGINE CANONIQUE. C'est la seule valeur à changer le jour où le domaine
 * définitif est tranché — `robots.txt`, `sitemap.xml` et tous les `canonical`
 * en découlent.
 *
 * Par défaut : l'URL Vercel actuelle. Ce n'est PAS un domaine de production
 * souhaitable (voir la note « Déploiement » du projet) ; tant qu'elle est en
 * place, `vercel.json` pose un `X-Robots-Tag: noindex` sur cet hôte pour que le
 * site inachevé n'entre pas dans l'index sous une adresse qu'il faudra quitter.
 */
const ORIGINE = (process.env.VITE_URL_SITE ?? 'https://crosswell-pronostics-site.vercel.app').replace(
  /\/+$/,
  '',
)

const SUFFIXE = 'Crosswell Pronostics'

const DESCRIPTION_ACCUEIL =
  'Crosswell Pronostics estime, pour chaque partant des courses hippiques françaises, ses chances de victoire et de place — et publie ce qu’elles valent une fois les courses courues.'

/** Une entrée par route de `src/App.tsx`. `priorite` ne sert qu'au sitemap. */
const PAGES = [
  {
    chemin: '/',
    titre: `${SUFFIXE} — Chaque course, l’arrivée la plus probable`,
    description: DESCRIPTION_ACCUEIL,
    priorite: '1.0',
  },
  {
    chemin: '/methode',
    titre: `Comment ça marche — ${SUFFIXE}`,
    description:
      'Ce que le modèle regarde, ce qu’il ignore, et comment lire une probabilité : la méthode de calcul des chances de victoire et de place, expliquée sans jargon.',
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
function pageHtml(gabarit, { chemin, titre, description }, { indexable = true } = {}) {
  const url = chemin === '/' ? `${ORIGINE}/` : `${ORIGINE}${chemin}`
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

  const entetes = indexable
    ? `<link rel="canonical" href="${url}" />\n    <meta property="og:url" content="${url}" />`
    : `<meta name="robots" content="noindex" />`

  html = html.replace('</head>', `  ${entetes}\n  </head>`)
  return html
}

function sitemap() {
  const entrees = PAGES.map(({ chemin, priorite }) => {
    const url = chemin === '/' ? `${ORIGINE}/` : `${ORIGINE}${chemin}`
    return `  <url>\n    <loc>${echappe(url)}</loc>\n    <priority>${priorite}</priority>\n  </url>`
  }).join('\n')

  // Pas de `lastmod` : une date de build, qui change à chaque déploiement sans
  // que le contenu bouge, est un signal faux. Mieux vaut ne rien déclarer.
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entrees}\n</urlset>\n`
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
for (const marqueur of ['<title>', 'name="description"', 'property="og:title"', '</head>']) {
  if (!gabarit.includes(marqueur)) {
    throw new Error(
      `apres-build : « ${marqueur} » est introuvable dans dist/index.html. ` +
        `Le gabarit index.html a changé — mettre ce script à jour.`,
    )
  }
}

for (const page of PAGES) {
  const html = pageHtml(gabarit, page)
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
      description: DESCRIPTION_ACCUEIL,
    },
    { indexable: false },
  ),
  'utf8',
)

await writeFile(join(DIST, 'sitemap.xml'), sitemap(), 'utf8')
await writeFile(join(DIST, 'robots.txt'), robots(), 'utf8')

console.log(
  `après-build : ${PAGES.length} pages, 404.html, sitemap.xml et robots.txt écrits (origine ${ORIGINE})`,
)
