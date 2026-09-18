import { DEMO, FUSEAU } from '@/config/app'
import { decalerJour, jourISO } from '@/lib/format'
import type { Course, Reunion } from '@/types'

/**
 * LA JOURNÉE DE COURSES — l'horloge de Paris et l'état de chaque course.
 *
 * Toutes les pages de prédiction lisent l'heure ICI, jamais `new Date()` : une
 * course « à venir » sur l'accueil ne peut pas être « partie » sur sa réunion.
 *
 * Aucun état « publication attendue » ici : depuis la décision du 17 septembre
 * 2026 (`RYTHME_PUBLICATION`), les pronostics de demain sont calculés dans la
 * nuit et aujourd'hui est toujours publié. L'ancien suivi de la publication du
 * matin (avant 7 h, en retard après 9 h 30) a été retiré avec ce rythme.
 */

export interface InstantParis {
  /** Jour civil à Paris, 'AAAA-MM-JJ'. */
  jour: string
  /** Minutes écoulées depuis minuit à Paris, 0 à 1439. */
  minutes: number
}

const HEURE_MINUTE = new Intl.DateTimeFormat('fr-FR', {
  timeZone: FUSEAU,
  hour: 'numeric',
  minute: 'numeric',
  hourCycle: 'h23',
})
const JOUR_PARIS = new Intl.DateTimeFormat('en-CA', { timeZone: FUSEAU })

/**
 * L'instant présent à Paris. En DÉMO seulement, `?horloge=HH:MM` remplace
 * l'heure : c'est le seul moyen de montrer une journée en cours sans attendre l'heure
 * réelle.
 */
export function instantParis(d?: Date): InstantParis {
  const date = d ?? new Date()
  const parts = HEURE_MINUTE.formatToParts(date)
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const mn = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
  let minutes = h * 60 + mn
  if (DEMO && d == null && typeof window !== 'undefined') {
    const v = new URLSearchParams(window.location.search).get('horloge')
    const m = v?.match(/^(\d{1,2}):(\d{2})$/)
    if (m) minutes = Math.min(1439, Number(m[1]) * 60 + Number(m[2]))
  }
  return { jour: d ? JOUR_PARIS.format(d) : jourISO(0), minutes }
}

/**
 * '14:05' → 845. Une heure avant 6 h appartient à la nuit de la veille (une
 * nocturne qui part à 0 h 40) : elle vaut 1440 + minutes, pour trier après 23 h.
 */
export function minutesDe(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  const t = h * 60 + m
  return h < 6 ? t + 1440 : t
}

export type EtatCourse = 'aVenir' | 'departPasse' | 'nonRelevee' | 'terminee'

/**
 * - `terminee` : arrivée relevée ;
 * - `aVenir` : l'heure de départ n'est pas atteinte (ou inconnue, le jour même) ;
 * - `departPasse` : l'heure est passée, l'arrivée n'est pas encore relevée ;
 * - `nonRelevee` : course d'un jour passé restée sans arrivée.
 */
export function etatCourse(c: Course, m: InstantParis): EtatCourse {
  const hier = decalerJour(m.jour, -1)
  if (c.courue) return 'terminee'
  if (c.date > m.jour) return 'aVenir'
  if (c.date < hier) return 'nonRelevee'
  if (!c.heureDepart) return c.date === m.jour ? 'aVenir' : 'nonRelevee'
  const mh = minutesDe(c.heureDepart)
  if (c.date === m.jour) return m.minutes >= mh ? 'departPasse' : 'aVenir'
  // Veille : seule une nocturne après minuit peut encore être à venir.
  if (mh >= 1440) return m.minutes + 1440 >= mh ? 'departPasse' : 'aVenir'
  return 'nonRelevee'
}

export function compterEtats(cs: Course[], m: InstantParis): Record<EtatCourse, number> {
  const r: Record<EtatCourse, number> = { aVenir: 0, departPasse: 0, nonRelevee: 0, terminee: 0 }
  for (const c of cs) r[etatCourse(c, m)]++
  return r
}

export function bornesHoraires(cs: Course[]): { premiere: string | null; derniere: string | null } {
  const h = cs
    .map((c) => c.heureDepart)
    .filter((x): x is string => !!x)
    .sort((a, b) => minutesDe(a) - minutesDe(b))
  return { premiere: h[0] ?? null, derniere: h[h.length - 1] ?? null }
}

export function premiereHeure(r: Reunion): string | null {
  return bornesHoraires(r.courses).premiere
}

/** Première heure de départ croissante, réunions sans heure en dernier, puis hippodrome. */
export function trierReunionsParHeure(rs: Reunion[]): Reunion[] {
  const p = (r: Reunion) => {
    const h = premiereHeure(r)
    return h ? minutesDe(h) : Number.POSITIVE_INFINITY
  }
  return [...rs].sort((a, b) => p(a) - p(b) || a.hippodrome.localeCompare(b.hippodrome))
}
