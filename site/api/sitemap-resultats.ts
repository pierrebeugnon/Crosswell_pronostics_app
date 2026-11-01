import {
  CHEMIN_ARCHIVES,
  TOUTES_LES_JOURNEES,
  chargerAdressesCourses,
  chargerJourneesDisponibles,
  cheminCourse,
  cheminJournee,
  instantParis,
} from '../dist-serveur/entree-serveur.js'

/**
 * LE SITEMAP DES RÉSULTATS — journées, courses et archives.
 *
 * Une fonction et non un fichier du build : des courses s'ajoutent chaque jour,
 * et un sitemap figé au déploiement ne les connaîtrait pas. Les adresses sont
 * écrites par `cheminCourse` et `cheminJournee`, les mêmes que celles des pages :
 * une adresse déclarée ici est donc la canonique, sans redirection à suivre.
 *
 * LES COURSES À VENIR N'Y SONT PAS. Seules les courses jugées y figurent : ce
 * sont les pages qui ne bougeront plus.
 */

/** Même valeur que dans `api/resultats.ts` et `scripts/apres-build.mjs`. */
const ORIGINE = (process.env.VITE_URL_SITE ?? 'https://crosswell.io').replace(/\/+$/, '')

/** '2026-10-30' → '2026-10-31'. */
function lendemain(jour: string): string {
  const [a, m, j] = jour.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, j + 1)).toISOString().slice(0, 10)
}

/**
 * LE LENDEMAIN, parce que c'est là qu'une page cesse de bouger : jockey et
 * entraîneur arrivent des performances France Galop la nuit qui suit la course.
 * Rien pour une journée en cours : elle changera encore, et une date fausse vaut
 * moins qu'aucune date.
 */
const modification = (jour: string, aujourdhui: string) =>
  jour < aujourdhui ? `\n    <lastmod>${lendemain(jour)}</lastmod>` : ''

const entree = (chemin: string, modifie = '') =>
  `  <url>\n    <loc>${ORIGINE}${chemin}</loc>${modifie}\n  </url>`

async function servir(): Promise<Response> {
  try {
    const aujourdhui = instantParis().jour
    const journees = await chargerJourneesDisponibles(TOUTES_LES_JOURNEES)
    const courses = await chargerAdressesCourses(journees)

    const entrees = [
      entree(CHEMIN_ARCHIVES),
      ...journees.map((j) => entree(cheminJournee(j), modification(j, aujourdhui))),
      ...courses.map((c) => entree(cheminCourse(c), modification(c.date, aujourdhui))),
    ].join('\n')

    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entrees}\n</urlset>\n`,
      {
        status: 200,
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
        },
      },
    )
  } catch (e) {
    // Comme `api/resultats` : une base injoignable n'est pas une liste vide.
    console.error('api/sitemap-resultats', e)
    return new Response('Indisponible', { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}

/** La forme `{ fetch }` : voir le commentaire en bas de `api/resultats.ts`. */
export default { fetch: servir }
