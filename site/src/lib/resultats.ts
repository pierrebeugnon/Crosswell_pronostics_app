/**
 * LES RÉSULTATS DE COURSES, CÔTÉ VITRINE — types et règles d'affichage.
 *
 * Ce fichier est la frontière entre ce que la base sait et ce qu'une page
 * publique montre. Il décrit un sous-ensemble ÉTROIT de `../../src/types.ts` :
 * tout ce qui n'apparaît pas ici n'arrivera jamais sur une page publique, même
 * si la source le porte.
 *
 * TROIS CHAMPS DE LA MAQUETTE N'EXISTENT NULLE PART et ne sont donc pas
 * déclarés : l'ALLOCATION, le TERRAIN et le NUMÉRO DE RÉUNION. Relevé le
 * 10/10/2026 sur tout le schéma — le seul endroit qui portait les deux premiers
 * s'arrête au 06/07/2026 et est à moitié vide. Les déclarer « optionnels »
 * reviendrait à afficher du vide sur 100 % des journées : mieux vaut une page à
 * cinq caractéristiques justes qu'à huit dont trois sont muettes. C'est aussi
 * pourquoi l'adresse d'une course se bâtit sur hippodrome + numéro, et non sur
 * le « R1C3 » de la maquette.
 *
 * AUCUN STATUT OFFICIEL NON PLUS. La maquette affiche « En cours · arrivée en
 * cours d'officialisation », qu'elle devine en comparant l'heure de départ à
 * l'horloge. Nous ne recevons aucun statut de société de courses : les quatre
 * états ci-dessous sont ceux que l'application emploie déjà, et ils ne
 * promettent que ce que nous savons.
 */

/**
 * L'état d'une course, tel qu'on peut l'affirmer sans inventer.
 *
 * - `terminee` : l'arrivée est relevée, on la montre.
 * - `departDonne` : l'heure de départ est passée, l'arrivée n'est pas encore
 *   chez nous. On ne dit pas « en cours d'officialisation » : nous n'en savons
 *   rien, nous constatons seulement que le départ est derrière nous.
 * - `nonRelevee` : la journée est passée et l'arrivée n'est jamais arrivée.
 *   Environ quatre réunions sur dix ne sont pas cotées, et certaines arrivées
 *   nous manquent : le dire vaut mieux qu'un tiret muet.
 * - `aVenir` : le départ n'est pas donné.
 */
export type EtatCourse = 'terminee' | 'departDonne' | 'nonRelevee' | 'aVenir'

export const LIBELLE_ETAT: Record<EtatCourse, string> = {
  terminee: 'Terminée',
  departDonne: 'Départ donné',
  nonRelevee: 'Non relevée',
  aVenir: 'À venir',
}

/** Un partant, réduit à ce qu'une page publique montre. */
export interface PartantPublic {
  numero: number
  nom: string
  /** Place à l'arrivée. `null` tant que l'arrivée n'est pas relevée. */
  arrivee: number | null
  /** Notre rang publié. `null` pour un non-partant. */
  rang: number | null
  /** Probabilité de victoire annoncée, de 0 à 1. */
  pWin: number | null
  /**
   * Cote DE CLÔTURE, relevée APRÈS la course. Elle est absente le jour même —
   * mesuré le 10/10/2026 : 0 ligne sur 132 le jour courant, 209 sur 210 la
   * veille. Une page qui l'affiche doit donc savoir l'attendre.
   */
  cote: number | null
  nonPartant: boolean
}

/** Une course, réduite à ce qu'une page publique montre. */
export interface CoursePublique {
  /** `2026-10-10|DEAUVILLE|3` — clé de liste, et base de l'adresse. */
  cle: string
  date: string
  hippodrome: string
  numero: number
  nom: string | null
  categorie: string | null
  distance: number | null
  /** Chevaux au départ, non-partants retirés. */
  partants: number
  /**
   * Non-partants déclarés. `null` quand le statut n'a pas encore été vérifié —
   * ce qui n'est PAS la même chose que zéro, et ne doit jamais s'afficher « 0 ».
   */
  nonPartants: number | null
  /** Heure de départ 'HH:MM', heure de Paris. */
  heureDepart: string | null
  courue: boolean
  liste: PartantPublic[]
}

/** Une journée, telle que la page `/resultats/AAAA-MM-JJ` la sert. */
export interface JourneePublique {
  /** 'AAAA-MM-JJ'. */
  jour: string
  courses: CoursePublique[]
}

/**
 * L'état d'une course, lu sur l'heure de Paris.
 *
 * `instant` est passé en paramètre et jamais lu ici : une page rendue côté
 * serveur et la même page rendue dans le navigateur doivent conclure la même
 * chose, et un `new Date()` caché dans une fonction d'affichage rend ce genre
 * de bogue introuvable.
 */
export function etatCourse(
  course: CoursePublique,
  instant: { jour: string; minutes: number },
): EtatCourse {
  if (course.courue) return 'terminee'
  if (course.date < instant.jour) return 'nonRelevee'
  if (course.date > instant.jour) return 'aVenir'

  if (!course.heureDepart) return 'aVenir'
  const [h, m] = course.heureDepart.split(':').map(Number)
  return h * 60 + m <= instant.minutes ? 'departDonne' : 'aVenir'
}

/**
 * L'adresse d'une course. Le slug ne sert qu'à la lisibilité : c'est le couple
 * hippodrome + numéro qui identifie, et lui seul est relu.
 */
export function cheminCourse(course: CoursePublique): string {
  const lieu = slug(course.hippodrome)
  const nom = course.nom ? `-${slug(course.nom)}` : ''
  return `/resultats/${course.date}/${lieu}/c${course.numero}${nom}`
}

export const cheminJournee = (jour: string) => `/resultats/${jour}`

/** Minuscules, sans accent, tirets — stable d'un rendu à l'autre. */
export function slug(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Les cinq premiers, pour l'aperçu d'une liste. Les non-partants sortent, et
 * une arrivée manquante ne décale personne : on trie sur la place réelle.
 */
export function cinqPremiers(course: CoursePublique): PartantPublic[] {
  return course.liste
    .filter((p) => !p.nonPartant && p.arrivee !== null)
    .sort((a, b) => (a.arrivee ?? 99) - (b.arrivee ?? 99))
    .slice(0, 5)
}

/** Notre rang 1 parmi les partants au départ. */
export const favoriDe = (course: CoursePublique): PartantPublic | null =>
  course.liste.find((p) => p.rang === 1 && !p.nonPartant) ?? null

/**
 * Le décompte d'une journée, pour le résumé sous le titre. On ne compte pas
 * « en cours » : voir `EtatCourse`.
 */
export function compterJournee(journee: JourneePublique, instant: { jour: string; minutes: number }) {
  const par = (e: EtatCourse) => journee.courses.filter((c) => etatCourse(c, instant) === e).length
  return {
    total: journee.courses.length,
    terminees: par('terminee'),
    departDonne: par('departDonne'),
    nonRelevees: par('nonRelevee'),
    aVenir: par('aVenir'),
  }
}
