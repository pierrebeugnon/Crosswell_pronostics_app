import type { Course, Partant } from '@/types'
import { minutesDe, type InstantParis } from '@/lib/journee'

/**
 * L'ÉVOLUTION DE LA COTE — SIMULÉE.
 *
 * On ne relève qu'une cote par partant, sans historique (design/INTEGRATION.md,
 * A4). En attendant que l'historique soit enregistré, la courbe de la maquette
 * est SIMULÉE : treize points de 9 h au départ (ou à maintenant), tirés au
 * hasard mais toujours les mêmes pour un partant donné, et qui finissent
 * exactement sur la cote relevée. Chaque écran qui l'affiche dit « simulée ».
 *
 * Quand l'historique existera, seul `historiqueSimule` sera remplacé : la
 * forme `HistoriqueCote` est celle qu'un service réel renverra.
 */

/** L'ouverture du marché dans la maquette : 9 h. */
export const OUVERTURE_MARCHE = 9 * 60
const NB_POINTS = 13
/** En deçà, « Stable » (maquette : 5 %). */
const SEUIL_TENDANCE = 0.05
/** En deçà, pas de flèche dans le tableau (maquette : 8 %). */
const SEUIL_FLECHE = 0.08
/** Pas de cote sous 1,1. */
const COTE_MINIMUM = 1.1

export interface PointCote {
  /** Minutes depuis minuit, heure de Paris. */
  minute: number
  cote: number
}

export interface HistoriqueCote {
  points: PointCote[]
  /** La première cote de la journée. */
  matin: number
  /** La dernière : celle qu'on affiche partout ailleurs. */
  derniere: number
  /** (dernière − matin) / matin : négatif quand la cote baisse. */
  variation: number
  /** La courbe s'arrête au départ (course partie) ou maintenant (à venir). */
  fin: 'depart' | 'maintenant'
  /** L'heure de départ est-elle connue (pour la légende de fin de courbe). */
  heureConnue: boolean
  simulee: boolean
}

/** Un générateur pseudo-aléatoire graine → [0, 1), stable d'une session à l'autre. */
function graine(texte: string): () => number {
  let h = 2166136261
  for (let i = 0; i < texte.length; i++) {
    h ^= texte.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** La fin de la courbe, ou null quand le marché n'a pas encore bougé. */
function borneDeFin(c: Course, m: InstantParis): { minute: number; fin: HistoriqueCote['fin'] } | null {
  const depart = c.heureDepart ? minutesDe(c.heureDepart) : null
  if (c.date > m.jour) return null
  if (c.date < m.jour || c.courue) return { minute: depart ?? 15 * 60, fin: 'depart' }
  if (depart != null && m.minutes >= depart) return { minute: depart, fin: 'depart' }
  // Le jour même, avant le départ : jusqu'à maintenant, s'il y a de quoi tracer.
  if (m.minutes < OUVERTURE_MARCHE + 30) return null
  return { minute: m.minutes, fin: 'maintenant' }
}

/**
 * L'historique simulé d'un partant, ou null : non-partant, pas de cote, course
 * d'un jour à venir, ou trop tôt dans la matinée.
 */
export function historiqueSimule(c: Course, p: Partant, m: InstantParis): HistoriqueCote | null {
  if (p.nonPartant || p.cote == null || !(p.cote > 1)) return null
  const borne = borneDeFin(c, m)
  if (!borne || borne.minute <= OUVERTURE_MARCHE) return null

  const r = graine(`${c.cle}|${p.numero}`)
  // Dérive sur la journée, en log : de ±45 %, comme la maquette.
  const derive = (r() - 0.5) * 0.9
  const matin = p.cote / Math.exp(derive)
  const pas = (borne.minute - OUVERTURE_MARCHE) / (NB_POINTS - 1)
  const points: PointCote[] = Array.from({ length: NB_POINTS }, (_, i) => {
    const f = i / (NB_POINTS - 1)
    const bruit = i === 0 || i === NB_POINTS - 1 ? 0 : (r() - 0.5) * 0.12
    const brute = i === NB_POINTS - 1 ? p.cote! : Math.max(COTE_MINIMUM, matin * Math.exp(derive * f + bruit))
    return { minute: Math.round(OUVERTURE_MARCHE + pas * i), cote: i === NB_POINTS - 1 ? brute : Math.round(brute * 10) / 10 }
  })
  const premiere = points[0].cote
  return {
    points,
    matin: premiere,
    derniere: p.cote,
    variation: (p.cote - premiere) / premiere,
    fin: borne.fin,
    heureConnue: c.heureDepart != null,
    simulee: true,
  }
}

export type SensCote = 'stable' | 'baisse' | 'hausse'

/** « Stable », « En baisse de 12 % », « En hausse de 30 % ». */
export function tendanceCote(variation: number): { sens: SensCote; libelle: string } {
  const pct = Math.round(Math.abs(variation) * 100)
  if (Math.abs(variation) < SEUIL_TENDANCE) return { sens: 'stable', libelle: 'Stable' }
  return variation < 0 ? { sens: 'baisse', libelle: `En baisse de ${pct} %` } : { sens: 'hausse', libelle: `En hausse de ${pct} %` }
}

/** La flèche du tableau des partants : seulement au-delà de 8 %. */
export function flecheCote(variation: number): Exclude<SensCote, 'stable'> | null {
  if (variation <= -SEUIL_FLECHE) return 'baisse'
  if (variation >= SEUIL_FLECHE) return 'hausse'
  return null
}

/** « 09:00 » ; les minutes au-delà de minuit (courses de nuit) repassent sur 24 h. */
export function heureMinute(minute: number): string {
  const t = ((Math.round(minute) % 1440) + 1440) % 1440
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

/**
 * Les points d'une polyligne SVG dans un cadre largeur × hauteur, avec 18 % de
 * marge au-dessus et au-dessous de l'amplitude, comme la maquette.
 */
export function tracer(h: HistoriqueCote, largeur: number, hauteur: number): { x: number; y: number }[] {
  const valeurs = h.points.map((p) => p.cote)
  const mn = Math.min(...valeurs)
  const mx = Math.max(...valeurs)
  const amplitude = Math.max(0.4, mx - mn)
  const bas = mn - amplitude * 0.18
  const haut = mx + amplitude * 0.18
  const n = valeurs.length
  return valeurs.map((v, i) => ({ x: (i * largeur) / (n - 1), y: hauteur - ((v - bas) / (haut - bas)) * hauteur }))
}
