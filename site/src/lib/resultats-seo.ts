import {
  distance as formatDistance,
  hippodrome as formatHippodrome,
  jourChiffres,
  jourLong,
  jourSansSemaine,
  nomCourse as formatNomCourse,
} from '@/lib/format'
import {
  CHEMIN_ARCHIVES,
  cheminCourse,
  cheminJournee,
  favoriDe,
  slug,
  type CoursePublique,
  type JourneePublique,
} from '@/lib/resultats'

/**
 * CE QUE LE ROBOT LIT DANS LA TÊTE — titre, description, canonique, données
 * structurées, pour une page de résultats.
 *
 * Pourquoi ici et pas dans la fonction `api/resultats` : ce fichier est dans le
 * MÊME bundle que les pages. Le titre servi est donc calculé par le même code,
 * avec les mêmes formateurs (`jourLong`, `hippodrome`), que le H1 affiché.
 * Les pages éditoriales ont la même règle pour la même raison — voir
 * `scripts/apres-build.mjs` : « un titre recopié ailleurs finirait par
 * diverger, et c'est alors l'autre que verrait le moteur ».
 *
 * Le vocabulaire suit le positionnement : des arrivées, des probabilités, un
 * favori au sens « classé premier par le modèle ». Jamais de pari, de mise ni
 * de rendement — y compris ici, où l'on écrit « pour Google » et où le mot
 * revient tout seul.
 */

/** 60 signes pour le titre, 155 pour la description : au-delà, Google coupe. */
const MAX_TITRE = 60
const MAX_DESCRIPTION = 155

/**
 * Coupe à la frontière d'un mot et pose une ellipse. Une coupure au milieu d'un
 * mot est pire que la troncature du moteur : elle est visible dans l'onglet.
 *
 * C'est le DERNIER recours. Un titre coupé sur « … 2026 —… » laisse un tiret
 * pendant et une marque absente : mieux vaut d'abord retirer une information
 * entière, ce que fait `leMieuxQuiTient`.
 */
function raccourcir(texte: string, max: number): string {
  if (texte.length <= max) return texte
  const coupe = texte.slice(0, max - 1)
  const espace = coupe.lastIndexOf(' ')
  return `${(espace > max * 0.6 ? coupe.slice(0, espace) : coupe).trimEnd()}…`
}

/**
 * La première variante qui tient dans `max`, de la plus complète à la plus
 * courte ; la dernière est tronquée s'il le faut.
 *
 * Écrire les variantes à la main plutôt que couper : on choisit alors ce qu'on
 * perd — le lieu, la date — au lieu de le laisser au compteur de signes.
 */
function leMieuxQuiTient(variantes: string[], max: number): string {
  return variantes.find((v) => v.length <= max) ?? raccourcir(variantes[variantes.length - 1], max)
}

/** Ce qu'une adresse `/resultats/...` désigne, ou `null` si elle ne dit rien. */
export interface Demande {
  /** `AAAA-MM-JJ`, ou `null` pour `/resultats` tout court. */
  jour: string | null
  /** Le slug d'hippodrome, pour une page de course. */
  lieu: string | null
  /** Le numéro de course, pour une page de course. */
  numero: number | null
  /** `/resultats/archives` : la liste des journées, sans journée à charger. */
  archives?: boolean
}

/**
 * Analyse le chemin. C'est la MÊME lecture que celle des composants
 * (`useParams` dans `Resultats.tsx` et `ResultatCourse.tsx`) : le `r{n}` est
 * toléré et ignoré, c'est le couple hippodrome + numéro qui identifie.
 *
 * Retourne `null` pour une adresse qui n'est pas une page de résultats, y
 * compris une date mal formée — c'est un 404, pas une journée vide.
 */
export function analyser(chemin: string): Demande | null {
  const propre = chemin.split('?')[0].replace(/\/+$/, '')
  const bouts = propre.split('/').filter(Boolean)

  if (bouts[0] !== 'resultats') return null
  if (bouts.length === 1) return { jour: null, lieu: null, numero: null }
  if (bouts[1] === 'archives' && bouts.length === 2) {
    return { jour: null, lieu: null, numero: null, archives: true }
  }

  const jour = bouts[1]
  // Une date doit être réelle, pas seulement bien formée : `2026-02-31` passe
  // le gabarit et n'existe pas.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(jour)) return null
  const [a, m, j] = jour.split('-').map(Number)
  const d = new Date(Date.UTC(a, m - 1, j))
  if (d.getUTCFullYear() !== a || d.getUTCMonth() !== m - 1 || d.getUTCDate() !== j) return null

  if (bouts.length === 2) return { jour, lieu: null, numero: null }
  if (bouts.length !== 4) return null

  const numero = Number(bouts[3].match(/^(?:r\d+)?c(\d+)/)?.[1] ?? NaN)
  if (!Number.isInteger(numero)) return null

  return { jour, lieu: bouts[2], numero }
}

/** La course que l'adresse désigne dans une journée déjà chargée. */
export function courseDemandee(journee: JourneePublique, d: Demande): CoursePublique | undefined {
  if (d.numero === null || d.lieu === null) return undefined
  return journee.courses.find((c) => c.numero === d.numero && slug(c.hippodrome) === d.lieu)
}

export interface Tete {
  titre: string
  description: string
  /** Le chemin canonique — celui qui fait foi, pas forcément celui demandé. */
  canonique: string
  /** Les blocs `application/ld+json`, déjà sérialisés. */
  donneesStructurees: string[]
}

const MARQUE = 'Crosswell'

function arianeJournee(origine: string, jour: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${origine}/` },
      { '@type': 'ListItem', position: 2, name: 'Résultats', item: `${origine}/resultats` },
      { '@type': 'ListItem', position: 3, name: jourLong(jour), item: `${origine}${cheminJournee(jour)}` },
    ],
  }
}

/**
 * La tête d'une PAGE DE JOURNÉE.
 *
 * La description compte les courses : c'est la seule chose qui distingue deux
 * journées aux yeux d'un moteur, et une description identique sur soixante
 * adresses est lue comme du contenu dupliqué.
 */
function teteJournee(origine: string, jour: string, journee: JourneePublique): Tete {
  const n = journee.courses.length
  const lieux = [...new Set(journee.courses.map((c) => formatHippodrome(c.hippodrome)))]
  const courues = journee.courses.filter((c) => c.courue).length

  // La queue de phrase est la même partout : c'est la LISTE DES HIPPODROMES qui
  // fait déborder, parce qu'une grosse journée en compte neuf. On en montre
  // donc le plus possible, et c'est elle qui rétrécit — jamais la phrase, dont
  // la fin serait coupée au milieu d'un mot.
  const queue = `. ${courues > 0 ? 'Les arrivées' : 'Le programme'}, et la probabilité que nous avions annoncée pour chaque partant.`
  const tete = `${n} course${n > 1 ? 's' : ''} de galop le ${jourLong(jour)}`

  const avec = (combien: number) => {
    if (!lieux.length) return `${tete}${queue}`
    const montres = lieux.slice(0, combien)
    const restants = lieux.length - montres.length
    const reste = restants > 0 ? ` et ${restants} autre${restants > 1 ? 's' : ''}` : ''
    return `${tete} à ${montres.join(', ')}${reste}${queue}`
  }

  return {
    // La marque est « Crosswell » et non « Crosswell Pronostics » : avec le nom
    // complet, « Résultats des courses du 18 octobre 2026 » dépasse les
    // soixante signes et c'est la marque qui tombe. Mieux vaut un nom court
    // présent qu'un nom long coupé.
    titre: leMieuxQuiTient(
      [
        `Résultats des courses du ${jourSansSemaine(jour)} — ${MARQUE}`,
        `Résultats des courses du ${jourSansSemaine(jour)}`,
      ],
      MAX_TITRE,
    ),
    description: leMieuxQuiTient([avec(3), avec(2), avec(1), avec(0)], MAX_DESCRIPTION),
    canonique: cheminJournee(jour),
    donneesStructurees: [JSON.stringify(arianeJournee(origine, jour))],
  }
}

/**
 * La tête d'une PAGE DE COURSE — la page d'atterrissage, celle que trouve
 * quelqu'un qui cherche une arrivée.
 *
 * `SportsEvent` ne porte que ce que nous savons : le nom, la date, le lieu, et
 * le fait que la course est terminée. Rien d'inventé : une donnée structurée
 * fausse se retourne en pénalité, et nous n'avons ni le statut officiel de la
 * société de courses, ni l'heure de fin.
 */
function teteCourse(origine: string, jour: string, course: CoursePublique): Tete {
  const lieu = formatHippodrome(course.hippodrome)
  const nom = formatNomCourse(course.nom, course.numero)
  const favori = favoriDe(course)
  const gagnant = course.liste.find((p) => p.arrivee === 1)

  // `startDate` SANS HEURE quand nous n'en avons pas : une heure inventée est
  // pire qu'une date seule. Le décalage est celui de Paris, le seul fuseau où
  // ces courses ont lieu ; `+02:00` est l'heure d'été, et une course d'hiver
  // serait donnée une heure trop tôt — d'où la date seule plutôt qu'un faux
  // décalage. Voir le repli ci-dessous.
  //
  // `eventStatus` reste `EventScheduled` même après la course : schema.org n'a
  // pas de valeur « terminé » (les autres sont annulé, reporté, déplacé). Le
  // mettre à autre chose serait déclarer un incident qui n'a pas eu lieu.
  const evenement: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: nom,
    sport: 'Courses hippiques',
    startDate: jour,
    eventStatus: 'https://schema.org/EventScheduled',
    location: { '@type': 'Place', name: lieu, address: { '@type': 'PostalAddress', addressCountry: 'FR' } },
    url: `${origine}${cheminCourse(course)}`,
  }
  if (course.distance) evenement.description = `Course de ${formatDistance(course.distance)} à ${lieu}.`

  const ariane = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${origine}/` },
      { '@type': 'ListItem', position: 2, name: 'Résultats', item: `${origine}/resultats` },
      { '@type': 'ListItem', position: 3, name: jourLong(jour), item: `${origine}${cheminJournee(jour)}` },
      { '@type': 'ListItem', position: 4, name: nom, item: `${origine}${cheminCourse(course)}` },
    ],
  }

  // Le gagnant dans la description : c'est le mot que la personne tape, et la
  // seule information qui différencie vraiment cette page des autres.
  //
  // `phrase` évite le double point : les noms de la base finissent souvent par
  // une abréviation (« F.AQ. »), et « F.AQ.. » se voit.
  const phrase = (t: string) => (t.endsWith('.') ? t : `${t}.`)
  const detail = gagnant?.nom
    ? phrase(`Gagnant : ${gagnant.nom}`)
    : course.courue
      ? 'Arrivée relevée partant par partant.'
      : 'Départ à venir.'

  const base = `${nom} à ${lieu}, le ${jourLong(jour)}, ${course.partants} partants. ${detail}`
  const annonce = favori?.nom ? ` ${phrase(`Notre favori annoncé le matin même : ${favori.nom}`)}` : ''
  // La queue est AJOUTÉE OU OMISE, jamais tronquée : une description coupée sur
  // « notre favori :… » promet un nom qu'elle n'affiche pas.
  const description = base.length + annonce.length <= MAX_DESCRIPTION ? base + annonce : base

  // LA DATE RESTE, ANNÉE COMPRISE : un même prix revient chaque année, et sans
  // elle deux pages porteraient le même titre. Tombent d'abord le lieu, que le H1
  // garde, puis le libellé ; le nom n'est coupé qu'en dernier recours.
  //
  // « Programme » tant que la course n'est pas courue : la page existe dès le
  // matin, et promettre une arrivée qu'elle n'affiche pas décevrait le clic.
  const date = jourChiffres(jour)
  const libelle = course.courue ? 'Arrivée' : 'Programme'

  return {
    titre: leMieuxQuiTient(
      [
        `${libelle} ${nom} — ${lieu}, ${date}`,
        `${libelle} ${nom}, ${date}`,
        `${nom}, ${date}`,
        `${raccourcir(nom, MAX_TITRE - date.length - 2)}, ${date}`,
      ],
      MAX_TITRE,
    ),
    description: raccourcir(description, MAX_DESCRIPTION),
    canonique: cheminCourse(course),
    donneesStructurees: [JSON.stringify(ariane), JSON.stringify(evenement)],
  }
}

/**
 * La tête de `/resultats` tout court — la porte d'entrée de la rubrique.
 *
 * LUE AUSSI PAR LE BUILD : `scripts/apres-build.mjs` l'importe depuis le
 * bundle pour fabriquer l'enveloppe `dist-serveur/coquille.js`. C'est pour
 * cela qu'elle ne dépend d'aucune donnée — et qu'il n'y a qu'un seul endroit
 * où ce titre est écrit.
 */
export function teteRubrique(): Tete {
  return {
    titre: `Résultats des courses hippiques du jour — ${MARQUE}`,
    description:
      'Les arrivées de toutes les courses de galop, jour par jour, et en face la probabilité que nous avions annoncée le matin même pour chaque partant.',
    canonique: '/resultats',
    donneesStructurees: [],
  }
}

/**
 * La tête de `/resultats/archives`. Elle ne dépend d'aucune donnée, et n'a pas de
 * journée à décrire : c'est le chemin que suit un robot vers les journées que le
 * calendrier ne montre plus.
 */
function teteArchives(origine: string): Tete {
  return {
    titre: `Archives des résultats de courses hippiques — ${MARQUE}`,
    description:
      'Toutes les journées de galop publiées, mois par mois : les arrivées, et la probabilité annoncée le matin même pour chaque partant.',
    canonique: CHEMIN_ARCHIVES,
    donneesStructurees: [
      JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${origine}/` },
          { '@type': 'ListItem', position: 2, name: 'Résultats', item: `${origine}/resultats` },
          { '@type': 'ListItem', position: 3, name: 'Archives', item: `${origine}${CHEMIN_ARCHIVES}` },
        ],
      }),
    ],
  }
}

/**
 * La tête de la page que l'adresse désigne.
 *
 * `null` quand l'adresse ne désigne rien de servable — journée sans course,
 * course absente : à l'appelant d'en faire un vrai 404 plutôt qu'une page vide.
 */
export function decrire(
  d: Demande,
  journee: JourneePublique | null,
  /**
   * L'origine canonique. OPTIONNELLE, et c'est délibéré : les PAGES appellent
   * cette fonction pour leur seul `titre`, afin que l'onglet dise exactement ce
   * que le robot a reçu (voir `useTitre`). Elles n'ont pas d'origine sous la
   * main et n'en ont pas besoin — seules la canonique et les données
   * structurées en dépendent, et elles ne les lisent pas. Seule la fonction
   * `api/resultats` la passe.
   */
  origine = '',
): Tete | null {
  if (d.archives) return teteArchives(origine)
  if (d.jour === null) return teteRubrique()
  if (!journee || journee.courses.length === 0) return null

  if (d.numero !== null) {
    const course = courseDemandee(journee, d)
    return course ? teteCourse(origine, d.jour, course) : null
  }

  return teteJournee(origine, d.jour, journee)
}
