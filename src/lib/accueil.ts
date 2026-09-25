import { etatCourse, minutesDe, type EtatCourse, type InstantParis } from '@/lib/journee'
import { hippodrome as formatHippodrome } from '@/lib/format'
import { coursesDuJour } from '@/lib/programme'
import type { Course, Partant, Reunion } from '@/types'

/**
 * L'ACCUEIL — la logique pure de `pages/Aujourdhui.tsx` : quelle course mettre
 * en avant, dans combien de temps elle part, quelles opportunités montrer.
 */

export interface Prochaine {
  course: Course
  /** Vrai quand plus rien n'est à venir aujourd'hui : on montre la première de demain. */
  demain: boolean
  /**
   * Vrai quand la journée est finie ET que demain n'est pas encore publié : la
   * grande carte montre alors la DERNIÈRE course du jour, avec son arrivée.
   */
  terminee: boolean
}

/**
 * La course de la grande carte : la prochaine à partir aujourd'hui ; sinon la
 * première de demain ; sinon la dernière du jour, terminée ; sinon rien.
 *
 * La troisième branche compte : le soir, tant que demain n'est pas publié, la
 * carte disparaissait et l'accueil n'était plus qu'une liste de courses —
 * plus du tout la composition de la maquette (retour du fondateur, 18/09).
 */
export function prochaineCourse(reunions: Reunion[], m: InstantParis, demain: string): Prochaine | null {
  const duJour = coursesDuJour(reunions, m.jour)
  const aujourdhui = duJour.find((c) => etatCourse(c, m) === 'aVenir')
  if (aujourdhui) return { course: aujourdhui, demain: false, terminee: false }
  const premiere = coursesDuJour(reunions, demain)[0]
  if (premiere) return { course: premiere, demain: true, terminee: false }
  const derniere = duJour[duJour.length - 1]
  return derniere ? { course: derniere, demain: false, terminee: true } : null
}

/** Minutes avant le départ, le jour même ; null sans heure ou pour un autre jour. */
export function minutesAvantDepart(c: Course, m: InstantParis): number | null {
  if (!c.heureDepart || c.date !== m.jour) return null
  return minutesDe(c.heureDepart) - m.minutes
}

/** 42 → « dans 42 min » ; 80 → « dans 1 h 20 » ; 120 → « dans 2 h ». */
export function texteDepart(minutes: number): string {
  if (minutes <= 0) return 'imminent'
  if (minutes < 60) return `dans ${minutes} min`
  const h = Math.floor(minutes / 60)
  const mn = minutes % 60
  return mn === 0 ? `dans ${h} h` : `dans ${h} h ${String(mn).padStart(2, '0')}`
}

/** « 5 courses · 2 réunions · Compiègne, Chantilly » */
export function resumeJour(reunions: Reunion[], jour: string): string {
  const rs = reunions.filter((r) => r.date === jour)
  const n = rs.reduce((s, r) => s + r.courses.length, 0)
  if (n === 0) return ''
  const noms = rs.map((r) => formatHippodrome(r.hippodrome)).join(', ')
  return `${n} course${n > 1 ? 's' : ''} · ${rs.length} réunion${rs.length > 1 ? 's' : ''} · ${noms}`
}

/**
 * L'état d'une course dans la grille de l'accueil : celui de la journée, avec
 * la « prochaine » distinguée des autres courses à venir.
 */
export type StatutAccueil = EtatCourse | 'prochaine'

export function statutAccueil(c: Course, m: InstantParis, prochaine: Course | null): StatutAccueil {
  if (prochaine && c.cle === prochaine.cle) return 'prochaine'
  return etatCourse(c, m)
}

export const LIBELLE_STATUT: Record<StatutAccueil, string> = {
  prochaine: 'Prochaine',
  aVenir: 'À venir',
  departPasse: 'Départ donné',
  nonRelevee: 'Non relevée',
  terminee: 'Terminée',
}

export interface Opportunite {
  course: Course
  partant: Partant
}

export interface Opportunites {
  liste: Opportunite[]
  /**
   * Vrai quand aucune course à venir n'en porte et qu'on montre celles des
   * courses déjà courues aujourd'hui. En production, c'est le cas ordinaire :
   * la vue ne porte que la cote de clôture, relevée après la course.
   */
  courues: boolean
}

/**
 * « Écarts au marché » — les partants marqués d'un écart (notre probabilité dépasse
 * nettement celle de la cote), du plus grand écart au plus petit.
 *
 * D'abord ceux des courses à venir, aujourd'hui et demain, comme la maquette.
 * S'il n'y en a aucun, ceux des courses déjà courues aujourd'hui, en le
 * disant : une carte qui s'éteindrait au milieu de l'après-midi sans rien
 * dire ferait croire à une panne.
 */
export function opportunites(reunions: Reunion[], m: InstantParis, demain: string, max = 4): Opportunites {
  const auJour = (jour: string) =>
    coursesDuJour(reunions, jour).flatMap((course) =>
      course.liste.filter((p) => p.value && !p.nonPartant).map((partant) => ({ course, partant })),
    )
  const parEcart = (a: Opportunite, b: Opportunite) => (b.partant.ecartMarche ?? 0) - (a.partant.ecartMarche ?? 0)

  const aujourdhui = auJour(m.jour)
  const aVenir = [...aujourdhui.filter((o) => etatCourse(o.course, m) === 'aVenir'), ...auJour(demain)]
  if (aVenir.length > 0) return { liste: aVenir.sort(parEcart).slice(0, max), courues: false }
  return { liste: aujourdhui.filter((o) => o.course.courue).sort(parEcart).slice(0, max), courues: true }
}
