import {
  TOUTES_LES_JOURNEES,
  analyser,
  chargerJournee,
  chargerJourneesDisponibles,
  chargerStatistiques,
  decrire,
  instantParis,
  rendre,
  teteStatistiques,
  type JourneePublique,
} from '../dist-serveur/entree-serveur.js'
import { COQUILLE } from '../dist-serveur/coquille.js'
import { INTROUVABLE } from '../dist-serveur/introuvable.js'

/**
 * LES PAGES DE RÉSULTATS, RENDUES CÔTÉ SERVEUR.
 *
 * Tout le reste du site est fait de vrais fichiers HTML, écrits au build par
 * `scripts/apres-build.mjs` : c'est le bon outil pour des pages dont le texte
 * ne change pas. Les résultats, eux, changent chaque jour et se comptent par
 * milliers d'adresses — un fichier par course serait un build sans fin. D'où
 * cette fonction, et elle seule : `vercel.json` ne lui envoie que
 * `/resultats` et `/resultats/*`.
 *
 * CE QU'ELLE FAIT, dans cet ordre :
 *   1. elle lit l'adresse DEMANDÉE, que la réécriture lui passe en `chemin` —
 *      car après réécriture `request.url` vaut `/api/resultats` ;
 *   2. elle charge la journée depuis les vues publiques ;
 *   3. elle rend l'arbre React avec ces données, pose la tête, et dépose les
 *      mêmes données dans une balise `<script>` pour que le navigateur n'ait
 *      pas à refaire la requête ;
 *   4. elle répond un VRAI 404 quand l'adresse ne désigne rien.
 *
 * ELLE NE DÉCIDE RIEN DE CE QUI EST VISIBLE. Les vues `resultats_publics` et
 * `programme_public` ne servent aucune probabilité de course non jugée : le
 * verrou est en SQL (db/013, db/014), pas dans ce fichier.
 */

/**
 * LE DRAPEAU D'INDEXATION — à passer à `true` une fois les pages vérifiées en
 * production, et c'est la seule ligne à changer.
 *
 * Pourquoi `false` d'abord : ouvrir d'un coup quelques milliers d'adresses à
 * l'exploration, sans les avoir vues servies par Vercel, c'est risquer de faire
 * entrer dans l'index des pages à moitié rendues. Une page désindexée se
 * réindexe ; une page indexée vide se traîne des semaines.
 */
const INDEXABLE = true

/**
 * L'origine canonique. MÊME VALEUR que `ORIGINE` dans
 * `scripts/apres-build.mjs` — d'où la même variable d'environnement, pour que
 * les deux ne puissent pas déclarer deux domaines différents.
 */
const ORIGINE = (process.env.VITE_URL_SITE ?? 'https://crosswell.io').replace(/\/+$/, '')

/** Combien de journées le calendrier reçoit. Au-delà, personne ne défile. */
const JOURNEES = 60

const echappe = (texte: string) =>
  texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/**
 * Pose la tête sur la coquille et y verse le corps rendu.
 *
 * La coquille arrive du build avec le titre et la description de la RUBRIQUE :
 * les quatre remplacements ci-dessous les spécialisent pour la journée ou la
 * course demandée. C'est le seul endroit où une balise de tête est écrite
 * ailleurs qu'au build, et c'est inévitable — un titre qui dit « courses du 19
 * octobre » ne peut pas être calculé avant de savoir quel jour on sert.
 */
function assembler(
  tete: { titre: string; description: string; canonique: string; donneesStructurees: string[] },
  corps: string,
  balise: string,
): string {
  const url = `${ORIGINE}${tete.canonique}`
  const titre = echappe(tete.titre)
  const description = echappe(tete.description)
  let html = COQUILLE

  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${titre}</title>`)
  html = html.replace(
    /<meta\s+name="description"[\s\S]*?\/>/,
    `<meta name="description" content="${description}" />`,
  )
  html = html.replace(
    /<meta\s+property="og:title"[\s\S]*?\/>/,
    `<meta property="og:title" content="${titre}" />`,
  )
  html = html.replace(
    /<meta\s+property="og:description"[\s\S]*?\/>/,
    `<meta property="og:description" content="${description}" />`,
  )
  // La canonique et `og:url` sont posées par le build sur `/resultats` : il
  // faut les REMPLACER, pas en ajouter. Deux canoniques dans une page, c'est
  // Google qui tranche, et il ne tranche pas forcément comme nous.
  html = html.replace(/<link\s+rel="canonical"[\s\S]*?\/>/, `<link rel="canonical" href="${url}" />`)
  html = html.replace(/<meta\s+property="og:url"[\s\S]*?\/>/, `<meta property="og:url" content="${url}" />`)

  // Les données structurées sont posées MÊME EN `noindex` : c'est ainsi qu'on
  // peut les vérifier en production, avec l'outil de test de Google, avant
  // d'ouvrir l'indexation. Un moteur les ignore sur une page en `noindex`,
  // elles ne coûtent donc rien.
  //
  // `<` est échappé dans le JSON pour la même raison que dans
  // `lib/donnees-initiales` : un nom de course contenant « </script> »
  // fermerait la balise.
  const blocs = tete.donneesStructurees
    .map((d) => `<script type="application/ld+json">${d.replace(/</g, '\\u003c')}</script>`)
    .join('\n    ')
  const robots = INDEXABLE ? '' : '<meta name="robots" content="noindex, nofollow" />'
  const ajouts = [robots, blocs].filter(Boolean).join('\n    ')
  if (ajouts) html = html.replace('</head>', `  ${ajouts}\n  </head>`)

  // `balise` porte les données déjà lues. Elle va AVANT les scripts du bundle :
  // `useDonneesInitiales()` lit `window` au premier rendu de React, donc la
  // valeur doit y être posée avant que le bundle ne s'exécute.
  // Le conteneur porte une classe (`class="h-full"`) : la capturer plutôt que
  // la réécrire, sinon la page perd sa hauteur pleine et le pied de page
  // remonte au milieu de l'écran.
  const avec = html.replace(
    /<div id="root"([^>]*)>[\s\S]*?<\/div>/,
    (_, attributs: string) => `<div id="root"${attributs}>${corps}</div>\n    ${balise}`,
  )
  // Si la coquille n'a plus son conteneur, mieux vaut une erreur bruyante
  // qu'une page servie sans son contenu : le gabarit a changé de forme.
  if (avec === html) throw new Error('coquille : le conteneur id="root" est introuvable')
  return avec
}

/**
 * Les en-têtes de cache. Deux régimes, parce qu'il y a deux natures de page :
 *
 * - UNE JOURNÉE PASSÉE ne bouge plus. Les probabilités ne sont jamais
 *   recalculées et l'arrivée est relevée : un jour de cache côté CDN, une
 *   semaine de service périmé-pendant-revalidation. Le visiteur n'attend pas la
 *   base, et la base ne voit presque personne.
 * - LA JOURNÉE EN COURS change toute la journée, course après course. Deux
 *   minutes de cache : assez pour absorber une rafale, trop peu pour qu'une
 *   arrivée se fasse attendre.
 *
 * `max-age=0` dans les deux cas : c'est le CDN qui garde, pas le navigateur.
 * Une page gardée par le navigateur ne peut plus être rafraîchie par un
 * déploiement.
 */
function cache(jour: string, aujourdhui: string): string {
  if (jour >= aujourdhui) return 'public, max-age=0, s-maxage=120, stale-while-revalidate=600'
  return 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800'
}

const enTetes = (cacheControl: string) => {
  const h: Record<string, string> = {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': cacheControl,
  }
  // Le `noindex` est posé AUSSI en en-tête : si le HTML est servi par un cache
  // intermédiaire ou lu par un outil qui ne parse pas la tête, la consigne
  // passe quand même. Il part avec `INDEXABLE`.
  if (!INDEXABLE) h['X-Robots-Tag'] = 'noindex, nofollow'
  return h
}

function introuvable(): Response {
  return new Response(INTROUVABLE, {
    status: 404,
    // Court : une adresse peut devenir valable dès que l'arrivée est relevée.
    headers: enTetes('public, max-age=0, s-maxage=60, stale-while-revalidate=300'),
  })
}

/**
 * LES STATISTIQUES. Une requête par journée à chaque calcul : c'est le CDN qui
 * doit le porter. Six heures de cache, et un jour de service périmé pendant la
 * revalidation : les chiffres ne bougent qu'une fois par jour de courses, et le
 * visiteur n'attend pas le calcul.
 */
async function servirStatistiques(chemin: string): Promise<Response> {
  try {
    const statistiques = await chargerStatistiques()
    const { corps, donnees: balise } = rendre(chemin, { statistiques })
    return new Response(assembler(teteStatistiques(ORIGINE, statistiques), corps, balise), {
      status: 200,
      headers: enTetes('public, max-age=0, s-maxage=21600, stale-while-revalidate=86400'),
    })
  } catch (e) {
    console.error('api/resultats', chemin, e)
    return new Response(INTROUVABLE, {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    })
  }
}

async function servir(request: Request): Promise<Response> {
  const chemin = new URL(request.url).searchParams.get('chemin') ?? '/resultats'

  if (chemin === '/statistiques') return servirStatistiques(chemin)

  const demande = analyser(chemin)
  if (!demande) return introuvable()

  const aujourdhui = instantParis().jour

  try {
    // LES ARCHIVES n'ont pas de journée à charger, et ne bougent qu'une fois par
    // jour de courses : une heure de cache suffit à ménager la base.
    if (demande.archives) {
      const toutes = await chargerJourneesDisponibles(TOUTES_LES_JOURNEES)
      const tete = decrire(demande, null, ORIGINE)
      if (!tete) return introuvable()
      const { corps, donnees: balise } = rendre(chemin, { journees: toutes })
      return new Response(assembler(tete, corps, balise), {
        status: 200,
        headers: enTetes('public, max-age=0, s-maxage=3600, stale-while-revalidate=86400'),
      })
    }

    // Le calendrier et la liste « journées précédentes » en ont besoin sur les
    // deux pages ; sans elles, `/resultats` tout court ne saurait même pas quel
    // jour afficher.
    const journees = await chargerJourneesDisponibles(JOURNEES)

    // `/resultats` tout court sert LA JOURNÉE DU JOUR, et retombe sur la plus
    // récente seulement si aujourd'hui n'a aucune course — un lundi de janvier,
    // par exemple.
    //
    // POURQUOI PAS SIMPLEMENT `journees[0]`, qui était la règle avant le
    // 26/10 : cette liste vient de `journees_publiques`, devenue une vue
    // MATÉRIALISÉE, rafraîchie toutes les dix minutes (db/017). Elle ne connaît
    // donc la journée du jour qu'une fois la première arrivée relevée ET le
    // rafraîchissement passé. S'y fier ici aurait fait afficher la veille sur
    // la page d'entrée tous les matins de course, jusqu'à une heure durant.
    // Dix minutes de retard sur la grille du calendrier ne se voient pas ;
    // dix minutes de retard sur la page que le menu ouvre, si.
    //
    // Le programme du jour, lui, est servi dès le matin par `programme_public`
    // (courses verrouillées), donc « aujourd'hui » a des courses bien avant
    // d'avoir des arrivées.
    let jour = demande.jour ?? aujourdhui
    let journee: JourneePublique = await chargerJournee(jour)

    if (demande.jour === null && journee.courses.length === 0 && journees[0]) {
      jour = journees[0]
      journee = await chargerJournee(jour)
    }

    // `demande` est passée TELLE QUELLE, sans la date résolue : `/resultats`
    // doit garder sa propre tête et sa propre canonique. Lui donner celle de
    // la journée du jour la ferait disparaître de l'index — or c'est l'adresse
    // stable de la rubrique, celle qui peut accumuler de l'autorité sur
    // « résultats des courses », quand les adresses datées prennent la longue
    // traîne. Titre et description y sont distincts, ce qui est la condition
    // pour que les deux coexistent sans être lues comme un doublon.
    //
    // Une journée sans course n'est pas une page vide : c'est une page qui
    // n'existe pas. Idem pour une course absente — `decrire` renvoie `null`
    // dans les deux cas, et c'est là que se décide le 404.
    const tete = decrire(demande, journee, ORIGINE)
    if (!tete) return introuvable()

    // UNE SEULE ADRESSE PAR PAGE. Le slug qui suit `c<n>-` n'entre pas dans
    // l'identification d'une course : `c1-n-importe-quoi` servait donc le même
    // contenu que `c1-prix-des-equidays`, et une infinité d'adresses menaient
    // à la même page. La canonique le couvrait, mais une 301 est un signal
    // plus fort qu'une balise — et elle règle le cas avant même que la page ne
    // soit lue. Elle redresse aussi la forme `r1c1-…`, tolérée en entrée.
    const normalise = chemin.split('?')[0].replace(/\/+$/, '') || '/resultats'
    if (normalise !== tete.canonique) {
      return new Response(null, {
        status: 301,
        headers: {
          Location: `${ORIGINE}${tete.canonique}`,
          'Cache-Control': cache(jour, aujourdhui),
          ...(INDEXABLE ? {} : { 'X-Robots-Tag': 'noindex, nofollow' }),
        },
      })
    }

    const donnees = { journee, journees }
    const { corps, donnees: balise } = rendre(chemin, donnees)

    return new Response(assembler(tete, corps, balise), {
      status: 200,
      // Le cache suit la journée RÉELLEMENT servie, pas l'adresse : `/resultats`
      // montre les courses du jour, il doit donc se rafraîchir comme elles.
      headers: enTetes(cache(jour, aujourdhui)),
    })
  } catch (e) {
    // Une base injoignable n'est PAS un 404 : répondre 404 ferait désindexer
    // des pages valables à la première panne. 503 dit « reviens plus tard »,
    // et Google le comprend ainsi.
    console.error('api/resultats', chemin, e)
    return new Response(INTROUVABLE, {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    })
  }
}

/**
 * L'EXPORT `fetch`, et pas un `export default` qui serait une fonction.
 *
 * Vercel documente deux écritures pour un handler Web : `export default
 * { fetch(request) {…} }` et un export nommé par méthode (`export function
 * GET`). Un `export default` qui EST une fonction n'est documenté que pour
 * l'autre style, celui de Node — `(request, response)`, où `request` est un
 * `IncomingMessage` et non un `Request`. Dans ce cas `request.url` ne vaudrait
 * que le chemin, `new URL(...)` lèverait, et la valeur renvoyée serait ignorée
 * puisque ce style répond en écrivant dans `response`.
 *
 * Autrement dit : la forme ci-dessous n'est pas une préférence de style, c'est
 * ce qui distingue une fonction qui répond d'une fonction qui expire.
 */
export default { fetch: servir }
