import { SEUILS_CONFIANCE } from '@/config/app'
import { etatCourse, minutesDe, type InstantParis } from '@/lib/journee'
import type { Course, Partant, Reunion } from '@/types'

/**
 * LA PAGE COURSES — la logique pure du programme et de la course affichée.
 *
 * Tout ce qui décide QUOI montrer (quelle course s'ouvre, quel verdict, quel
 * niveau de confiance, quels chevaux dans l'arrivée prédite) vit ici, sans
 * React, pour être testé. Les composants de `components/courses/` ne font que
 * mettre en forme.
 */

/** L'adresse d'une course : elle ouvre la page Courses sur elle. */
export function lienCourse(c: Pick<Course, 'date' | 'hippodrome' | 'numero'>): string {
  return `/courses/${c.date}/${encodeURIComponent(c.hippodrome)}/${c.numero}`
}

/**
 * L'état posé par les liens qui ouvrent une fiche DEPUIS sa course : fermer la
 * fiche revient alors en arrière dans l'historique, au lieu d'empiler une
 * nouvelle entrée que le bouton retour rouvrirait.
 */
export const DEPUIS_LA_COURSE = { depuisLaCourse: true } as const

/** L'adresse de la fiche d'un partant. */
export function lienPartant(c: Pick<Course, 'date' | 'hippodrome' | 'numero'>, p: Pick<Partant, 'numero'>): string {
  return `${lienCourse(c)}/partants/${p.numero}`
}

export type NiveauConfiance = 1 | 2 | 3

export interface Confiance {
  niveau: NiveauConfiance
  libelle: 'Élevée' | 'Moyenne' | 'Faible'
}

/**
 * Le niveau de confiance d'une course, d'après la seule probabilité de notre
 * rang 1 au départ. Null quand aucune sélection n'existe.
 */
export function confianceCourse(c: Course): Confiance | null {
  const p = c.favori?.pWin
  if (p == null) return null
  if (p >= SEUILS_CONFIANCE.elevee) return { niveau: 3, libelle: 'Élevée' }
  if (p >= SEUILS_CONFIANCE.moyenne) return { niveau: 2, libelle: 'Moyenne' }
  return { niveau: 1, libelle: 'Faible' }
}

export type Verdict = 'gagnant' | 'place' | 'manque' | 'sansSelection'

/**
 * Le verdict d'une course courue, dans le vocabulaire des maquettes :
 * « Gagnant » (notre rang 1 a gagné), « Placé » (dans les trois), « Manqué ».
 * Null tant que l'arrivée n'est pas relevée.
 */
export function verdictCourse(c: Course): Verdict | null {
  if (!c.courue) return null
  if (!c.favori) return 'sansSelection'
  if (c.gagne) return 'gagnant'
  if (c.place) return 'place'
  return 'manque'
}

export const LIBELLE_VERDICT: Record<Verdict, string> = {
  gagnant: 'Gagnant',
  place: 'Placé',
  manque: 'Manqué',
  sansSelection: 'Sans sélection',
}

/** Réussite au sens de la maquette : le vert pour « Gagnant » comme pour « Placé ». */
export function verdictReussi(v: Verdict | null): boolean {
  return v === 'gagnant' || v === 'place'
}

/** Clé de tri d'une course par heure de départ ; sans heure, en fin de journée, puis par numéro. */
function ordreHoraire(c: Course): number {
  return (c.heureDepart ? minutesDe(c.heureDepart) : 5000) * 100 + c.numero
}

/** Toutes les courses d'un jour, de la plus matinale à la plus tardive. */
export function coursesDuJour(reunions: Reunion[], jour: string): Course[] {
  return reunions
    .filter((r) => r.date === jour)
    .flatMap((r) => r.courses)
    .sort((a, b) => ordreHoraire(a) - ordreHoraire(b) || a.hippodrome.localeCompare(b.hippodrome))
}

/**
 * La course sur laquelle la page s'ouvre pour un jour donné : la prochaine à
 * partir, sinon la dernière de la journée (tout est couru), sinon rien.
 */
export function courseParDefaut(courses: Course[], m: InstantParis): Course | null {
  if (courses.length === 0) return null
  return courses.find((c) => etatCourse(c, m) === 'aVenir') ?? courses[courses.length - 1]
}

/** Les chevaux au départ, dans l'ordre de notre classement (rang effectif). */
export function classement(c: Course): Partant[] {
  return c.liste.filter((p) => !p.nonPartant && p.rang != null)
}

/** L'arrivée prédite : nos cinq premiers au départ. */
export function arriveePredite(c: Course, n = 5): Partant[] {
  return classement(c).slice(0, n)
}

/** L'arrivée relevée : les cinq premiers classés, dans l'ordre. */
export function arriveeRelevee(c: Course, n = 5): Partant[] {
  return c.liste
    .filter((p) => p.arrivee != null)
    .sort((a, b) => a.arrivee! - b.arrivee!)
    .slice(0, n)
}

export type Correspondance = 'exacte' | 'presente' | 'absente'

/**
 * Pour le tableau « pronostic face à l'arrivée » : un cheval est à sa place
 * exacte, présent ailleurs dans l'autre liste de cinq, ou absent.
 */
export function correspondance(numero: number, index: number, autre: Partant[]): Correspondance {
  if (autre[index]?.numero === numero) return 'exacte'
  return autre.some((p) => p.numero === numero) ? 'presente' : 'absente'
}

/** Combien de nos cinq premiers se retrouvent dans les cinq premiers de l'arrivée. */
export function retrouvesDansLesCinq(c: Course): number {
  const arrivee = new Set(arriveeRelevee(c).map((p) => p.numero))
  return arriveePredite(c).filter((p) => arrivee.has(p.numero)).length
}
