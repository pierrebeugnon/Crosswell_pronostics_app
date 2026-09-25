import type { Course, Partant } from '@/types'
import { minutesDe, type InstantParis } from '@/lib/journee'

/**
 * L'ÉVOLUTION DE LA COTE — RÉELLE depuis le 25/09/2026.
 *
 * `modele_prediction_engagement.cotes_jour` enregistre un relevé par partant
 * toutes les 30 minutes, de 11 h à 19 h ; `public.client_cotes` le sert à
 * l'application (`db/008_cotes_historique.sql`, `services/cotes.ts`).
 * `cotesDeCourse` en tire, par numéro, le dernier relevé — la cote du moment,
 * affichée avant la course, que la cote de clôture n'a pas encore — et la
 * courbe, dès qu'il y a deux relevés.
 *
 * CE QUI NE SE CALCULE PAS SUR CES COTES : l'écart au marché. Décision du
 * fondateur du 25/09 — on montre le marché, on ne dit pas avant le départ
 * qu'un cheval vaut mieux que sa cote. `Partant.cote` et `Partant.pMarche`
 * restent donc la cote de CLÔTURE (`lib/aggregate.ts`), et l'« Écart + » avec
 * eux ; les relevés du jour voyagent à part (`CotesCourse`).
 *
 * `historiqueSimule` survit pour la DÉMONSTRATION seule, qui n'a pas de base :
 * treize points tirés au hasard, toujours les mêmes pour un partant donné,
 * marqués « Simulée » partout où ils s'affichent.
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
  /**
   * Ce que dit le dernier point : l'heure de son relevé (cotes réelles), le
   * départ ou maintenant (simulation, qui va jusqu'à l'un ou l'autre).
   */
  fin: 'depart' | 'maintenant' | 'releve'
  /** L'heure de départ est-elle connue (pour la légende de fin de courbe). */
  heureConnue: boolean
  simulee: boolean
}

/** Un relevé de `client_cotes`, déjà converti en minutes depuis minuit à Paris. */
export interface ReleveCote {
  numero: number
  minute: number
  cote: number
}

/** Ce que les relevés d'une course donnent à l'écran. */
export interface CotesCourse {
  /** Le dernier relevé de chaque partant : la cote du moment. */
  dernier: Map<number, PointCote>
  /** L'évolution de chaque partant, dès deux relevés. */
  historiques: Map<number, HistoriqueCote>
}

export const COTES_VIDES: CotesCourse = { dernier: new Map(), historiques: new Map() }

/**
 * Les relevés d'une course, rangés par partant : la cote du moment pour tous,
 * la courbe pour ceux qui ont bougé au moins deux fois. Les relevés arrivent
 * triés par heure ; on ne s'y fie pas.
 */
export function cotesDeCourse(releves: readonly ReleveCote[], c: Course): CotesCourse {
  const parNumero = new Map<number, PointCote[]>()
  for (const r of releves) {
    if (!(r.cote > 1)) continue
    const points = parNumero.get(r.numero)
    if (points) points.push({ minute: r.minute, cote: r.cote })
    else parNumero.set(r.numero, [{ minute: r.minute, cote: r.cote }])
  }

  const dernier = new Map<number, PointCote>()
  const historiques = new Map<number, HistoriqueCote>()
  for (const [numero, points] of parNumero) {
    points.sort((a, b) => a.minute - b.minute)
    dernier.set(numero, points[points.length - 1])
    if (points.length < 2) continue
    const matin = points[0].cote
    const derniere = points[points.length - 1].cote
    historiques.set(numero, {
      points,
      matin,
      derniere,
      variation: (derniere - matin) / matin,
      fin: 'releve',
      heureConnue: c.heureDepart != null,
      simulee: false,
    })
  }
  return { dernier, historiques }
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
