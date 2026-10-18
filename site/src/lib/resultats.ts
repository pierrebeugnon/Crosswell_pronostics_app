/**
 * LES RÉSULTATS DE COURSES, CÔTÉ VITRINE — types et règles d'affichage.
 *
 * Ce fichier est la frontière entre ce que la base sait et ce qu'une page
 * publique montre. Il décrit un sous-ensemble ÉTROIT de `../../src/types.ts` :
 * tout ce qui n'apparaît pas ici n'arrivera jamais sur une page publique, même
 * si la source le porte.
 *
 * CORRECTION DU 18/10/2026 — ce fichier affirmait que l'ALLOCATION, le TERRAIN,
 * le NUMÉRO DE RÉUNION et le STATUT OFFICIEL n'existaient nulle part, et les
 * pages ont été amputées sur cette base. C'ÉTAIT FAUX : l'audit n'avait regardé
 * que le schéma `public`. Tout cela vit dans
 * `modele_prediction_engagement.pmu_courses`, rempli à 100 % sur les trente
 * derniers jours, avec 445 863 partants d'historique remontant à 2017.
 *
 * La leçon, pour la prochaine fois : un champ déclaré absent doit l'être après
 * un relevé de TOUS les schémas, pas du seul qui sert déjà l'application.
 */

/**
 * Le statut officiel, tel que la source le porte. Deux valeurs sur les trente
 * derniers jours : 281 courses en `ARRIVEE_DEFINITIVE_COMPLETE` et 108 en
 * `FIN_COURSE`. C'est une vraie distinction — la course est courue, l'arrivée
 * n'est pas encore définitive — et c'est exactement l'état « en cours
 * d'officialisation » de la maquette, que j'avais écarté en croyant qu'aucun
 * statut ne nous parvenait.
 */
export type StatutOfficiel = 'ARRIVEE_DEFINITIVE_COMPLETE' | 'FIN_COURSE'

/**
 * L'état d'une course.
 *
 * - `definitive` : arrivée définitive, c'est le cas courant.
 * - `provisoire` : la course est courue, l'arrivée n'est pas encore définitive.
 * - `departDonne` : l'heure de départ est passée et aucun statut ne nous est
 *   encore parvenu.
 * - `nonRelevee` : la journée est passée, l'arrivée n'est jamais arrivée.
 * - `aVenir` : le départ n'est pas donné.
 */
export type EtatCourse = 'definitive' | 'provisoire' | 'departDonne' | 'nonRelevee' | 'aVenir'

export const LIBELLE_ETAT: Record<EtatCourse, string> = {
  definitive: 'Terminée',
  provisoire: 'Arrivée provisoire',
  departDonne: 'Départ donné',
  nonRelevee: 'Non relevée',
  aVenir: 'À venir',
}

/** Un partant, réduit à ce qu'une page publique montre. */
export interface PartantPublic {
  numero: number
  nom: string
  /** Âge et sexe : renseignés à 100 % sur les trente derniers jours. */
  age: number | null
  sexe: string | null
  /**
   * Poids porté, en kilogrammes. Renseigné sur 43 % des lignes seulement : la
   * colonne s'affiche quand même, et le vide se dit.
   */
  poids: number | null
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

/**
 * La discipline. Elle EXISTE en base et manquait à la première version de ces
 * pages : la maquette l'affiche sur chaque ligne de course et dans les
 * caractéristiques, et une page qui écrit « Galop » en dur ne dit rien — le
 * galop se court au plat, en haies et en steeple, et le lecteur veut savoir
 * lequel.
 */
export type Discipline = 'Plat' | 'Haies' | 'Steeple' | 'Cross'

/** Une course, réduite à ce qu'une page publique montre. */
export interface CoursePublique {
  /** `2026-10-10|DEAUVILLE|3` — clé de liste, et base de l'adresse. */
  cle: string
  date: string
  hippodrome: string
  /** Numéro de réunion (`R1`, `R2`…) — `reunion_num`, rempli à 100 %. */
  reunion: number | null
  numero: number
  nom: string | null
  categorie: string | null
  discipline: Discipline | null
  distance: number | null
  /** Allocation en euros — `montant_prix`, rempli à 100 %. */
  allocation: number | null
  /** État du terrain, tel que la source le libelle. */
  terrain: string | null
  /** Statut officiel, s'il nous est parvenu. */
  statut: StatutOfficiel | null
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
  // Le statut officiel prime sur tout : c'est le seul à ne rien deviner.
  if (course.statut === 'ARRIVEE_DEFINITIVE_COMPLETE') return 'definitive'
  if (course.statut === 'FIN_COURSE') return 'provisoire'

  if (course.courue) return 'definitive'
  if (course.date < instant.jour) return 'nonRelevee'
  if (course.date > instant.jour) return 'aVenir'

  if (!course.heureDepart) return 'aVenir'
  const [h, m] = course.heureDepart.split(':').map(Number)
  return h * 60 + m <= instant.minutes ? 'departDonne' : 'aVenir'
}

/** Vrai dès que l'arrivée est publiable, définitive ou non. */
export const arriveeConnue = (e: EtatCourse) => e === 'definitive' || e === 'provisoire'

/**
 * L'adresse d'une course, au schéma de la maquette : `r{réunion}c{course}`.
 * Il était tombé à `c{course}` seul quand je croyais le numéro de réunion
 * absent de la base — il y est, à 100 %.
 */
export function cheminCourse(course: CoursePublique): string {
  const lieu = slug(course.hippodrome)
  const nom = course.nom ? `-${slug(course.nom)}` : ''
  const rang = course.reunion != null ? `r${course.reunion}` : ''
  return `/resultats/${course.date}/${lieu}/${rang}c${course.numero}${nom}`
}

/** « R1C3 », ou « C3 » si la réunion manque. */
export const repereCourse = (c: CoursePublique) =>
  `${c.reunion != null ? `R${c.reunion}` : ''}C${c.numero}`

/** « 364 000 € » — l'allocation, formatée à la française. */
export const allocation = (euros: number | null) =>
  euros == null ? null : `${euros.toLocaleString('fr-FR')} €`

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
 * LE TON D'UNE CATÉGORIE, comme la maquette les distingue : les groupes en
 * aplat vert, les Listed en contour vert, le reste en neutre. C'est la seule
 * hiérarchie de prestige que le lecteur attend sur une liste de courses.
 *
 * La reconnaissance est volontairement tolérante : la catégorie arrive de la
 * source en texte libre, et elle est ABSENTE sur une ligne sur trois (50 sur
 * 132 le 10/10/2026). Un libellé inconnu retombe en neutre, jamais en erreur.
 */
export function tonCategorie(categorie: string | null): 'groupe' | 'listed' | 'neutre' | null {
  if (!categorie) return null
  const c = categorie.toLowerCase()
  if (/^gr\.?\s*[i1]|groupe\s*[i1]/.test(c)) return 'groupe'
  if (c.includes('listed')) return 'listed'
  return 'neutre'
}

/** Les disciplines présentes dans une journée, pour l'en-tête d'une réunion. */
export function disciplinesDe(courses: CoursePublique[]): Discipline[] {
  return [...new Set(courses.map((c) => c.discipline).filter((d): d is Discipline => d !== null))]
}

/**
 * Le décompte d'une journée, pour le résumé sous le titre. On ne compte pas
 * « en cours » : voir `EtatCourse`.
 */
export function compterJournee(journee: JourneePublique, instant: { jour: string; minutes: number }) {
  const par = (e: EtatCourse) => journee.courses.filter((c) => etatCourse(c, instant) === e).length
  return {
    total: journee.courses.length,
    definitives: par('definitive'),
    provisoires: par('provisoire'),
    departDonne: par('departDonne'),
    nonRelevees: par('nonRelevee'),
    aVenir: par('aVenir'),
  }
}
