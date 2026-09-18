import type { Course, TypeCourse } from '@/types'
import { confianceCourse } from '@/lib/programme'

/**
 * « NOS RÉSULTATS » — la logique pure de la page (`design/screens/Results.dc.html`) :
 * filtres, indicateurs, série mensuelle, découpages, repère du hasard.
 *
 * Toutes les mesures portent sur les courses JUGÉES (arrivée relevée). La
 * définition d'une réussite est celle de `lib/aggregate` : notre rang 1 AU
 * DÉPART, non-partants retirés (socle de mesure du 14/09/2026).
 */

// ── Indicateurs ─────────────────────────────────────────────────────────────

export const INDICATEURS = ['gagnant', 'place', 'top3'] as const
export type Indicateur = (typeof INDICATEURS)[number]

export const DEFINITION_INDICATEUR: Record<Indicateur, { libelle: string; long: string }> = {
  gagnant: { libelle: 'Gagnant', long: 'Le 1er prédit gagne la course' },
  place: { libelle: 'Placé', long: 'Le 1er prédit finit dans les 3 premiers' },
  top3: { libelle: 'Top 3', long: 'Les 3 premiers prédits forment le trio d’arrivée, dans le désordre' },
}

/** Nos trois premiers sont exactement les trois premiers de l'arrivée, dans le désordre. */
export function trioComplet(c: Course): boolean {
  return c.courue && c.podium.length >= 3 && c.dansLeTrio === 3
}

export function reussie(c: Course, i: Indicateur): boolean {
  if (i === 'gagnant') return c.gagne
  if (i === 'place') return c.place
  return trioComplet(c)
}

/** Taux de réussite sur les courses jugées ; 0 sans course. */
export function taux(courses: Course[], i: Indicateur): number {
  const jugees = courses.filter((c) => c.courue)
  return jugees.length ? jugees.filter((c) => reussie(c, i)).length / jugees.length : 0
}

/**
 * LE REPÈRE DU HASARD pour l'indicateur choisi, en moyenne sur les courses
 * jugées : ce qu'obtiendrait un tirage au sort. Moyenne des probabilités par
 * course, et non probabilité sur un peloton moyen (voir `repereHasard`).
 *
 * - gagnant : 1/n ;
 * - placé : 3/n (plafonné à 1) ;
 * - top 3 : 1 / C(n, 3), un trio tiré au sort.
 */
export function hasard(courses: Course[], i: Indicateur): number {
  const cs = courses.filter((c) => c.courue && c.partants > 0)
  if (!cs.length) return 0
  const p = (n: number) => {
    if (i === 'gagnant') return 1 / n
    if (i === 'place') return Math.min(1, 3 / n)
    return n <= 3 ? 1 : 6 / (n * (n - 1) * (n - 2))
  }
  return cs.reduce((s, c) => s + p(c.partants), 0) / cs.length
}

// ── Filtres ─────────────────────────────────────────────────────────────────

/** Lundi en premier, comme un calendrier français. */
export const JOURS_SEMAINE = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] as const

/** 'AAAA-MM-JJ' → 0 (lundi) à 6 (dimanche). */
export function jourSemaine(iso: string): number {
  const [a, m, j] = iso.split('-').map(Number)
  return (new Date(Date.UTC(a, m - 1, j)).getUTCDay() + 6) % 7
}

/** Les tranches de distance de la maquette : elles couvrent le plat et l'obstacle. */
export const TRANCHES_DISTANCE = ['< 1 600 m', '1 600 – 2 400 m', '2 400 – 3 500 m', '> 3 500 m'] as const

export function trancheDistance(m: number | null): number | null {
  if (m == null) return null
  if (m < 1600) return 0
  if (m < 2400) return 1
  if (m < 3500) return 2
  return 3
}

export const TYPES: readonly TypeCourse[] = ['Handicap', 'Réclamer', 'Conditions', 'Groupe & Listed']

export const NIVEAUX_CONFIANCE = ['Élevée', 'Moyenne', 'Faible'] as const

/**
 * Les filtres de la page, tels qu'ils vivent dans l'URL : chaînes, avec une
 * valeur « tout » (`''`) qui ne filtre rien. `mois`, `jour` et `distance` sont
 * des index ('0', '1'…), `type` un TypeCourse, `piste` un nom d'hippodrome.
 */
export interface FiltresResultats {
  annee: string
  mois: string
  jour: string
  type: string
  distance: string
  piste: string
}

export const AUCUN_FILTRE: FiltresResultats = { annee: '', mois: '', jour: '', type: '', distance: '', piste: '' }

export function filtrer(courses: Course[], f: FiltresResultats): Course[] {
  return courses.filter(
    (c) =>
      (!f.annee || c.date.slice(0, 4) === f.annee) &&
      (!f.mois || Number(c.date.slice(5, 7)) - 1 === Number(f.mois)) &&
      (!f.jour || jourSemaine(c.date) === Number(f.jour)) &&
      (!f.type || c.type === f.type) &&
      (!f.distance || trancheDistance(c.distance) === Number(f.distance)) &&
      (!f.piste || c.hippodrome === f.piste),
  )
}

/** Les années présentes dans l'historique, de la plus récente à la plus ancienne. */
export function anneesDisponibles(courses: Course[]): string[] {
  return [...new Set(courses.map((c) => c.date.slice(0, 4)))].sort().reverse()
}

// ── Série mensuelle ─────────────────────────────────────────────────────────

export interface Mois {
  /** 'AAAA-MM' */
  cle: string
  annee: number
  /** 0 à 11 */
  mois: number
  n: number
  taux: number
}

/**
 * Le taux de réussite mois par mois, du premier au dernier mois jugé, SANS
 * TROU : un mois sans course reste dans la série, à zéro course, plutôt que de
 * rapprocher deux mois qui ne se suivent pas.
 */
export function parMois(courses: Course[], i: Indicateur): Mois[] {
  const jugees = courses.filter((c) => c.courue)
  if (!jugees.length) return []
  const groupes = new Map<string, Course[]>()
  for (const c of jugees) {
    const k = c.date.slice(0, 7)
    const g = groupes.get(k)
    if (g) g.push(c)
    else groupes.set(k, [c])
  }
  const cles = [...groupes.keys()].sort()
  let [a, m] = cles[0].split('-').map(Number)
  const [aFin, mFin] = cles[cles.length - 1].split('-').map(Number)
  const serie: Mois[] = []
  while (a < aFin || (a === aFin && m <= mFin)) {
    const cle = `${a}-${String(m).padStart(2, '0')}`
    const g = groupes.get(cle) ?? []
    serie.push({ cle, annee: a, mois: m - 1, n: g.length, taux: taux(g, i) })
    m += 1
    if (m > 12) {
      m = 1
      a += 1
    }
  }
  return serie
}

/** « janv. 2025 – sept. 2026 » */
export function etendue(serie: Mois[]): string {
  if (!serie.length) return ''
  const nom = (x: Mois) => `${MOIS_COURT[x.mois]} ${x.annee}`
  const [premier, dernier] = [serie[0], serie[serie.length - 1]]
  return premier.cle === dernier.cle ? nom(premier) : `${nom(premier)} – ${nom(dernier)}`
}

export const MOIS_COURT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

/**
 * L'échelle verticale du graphique : un pas de 5, 10 ou 25 points selon le
 * maximum, et un sommet arrondi au pas supérieur (règle de la maquette).
 */
export function echelle(max: number): { haut: number; graduations: number[] } {
  const m = Math.max(0.1, max)
  const pas = m > 0.6 ? 0.25 : m > 0.3 ? 0.1 : 0.05
  const haut = Math.ceil(m / pas - 1e-9) * pas
  const graduations: number[] = []
  for (let v = haut; v > -1e-9; v -= pas) graduations.push(Math.max(0, Math.round(v * 1000) / 1000))
  return { haut, graduations }
}

// ── Découpages ──────────────────────────────────────────────────────────────

export interface LigneDecoupage {
  libelle: string
  n: number
  taux: number
}

/**
 * Le taux par valeur d'un axe (type, distance, confiance…), dans l'ordre
 * donné, sur les seules courses jugées. Les valeurs sans course sont omises.
 */
export function decoupage(
  courses: Course[],
  i: Indicateur,
  axe: (c: Course) => string | null,
  ordre: readonly string[],
): LigneDecoupage[] {
  const jugees = courses.filter((c) => c.courue)
  return ordre
    .map((libelle) => {
      const g = jugees.filter((c) => axe(c) === libelle)
      return { libelle, n: g.length, taux: taux(g, i) }
    })
    .filter((l) => l.n > 0)
}

export const axes = {
  type: (c: Course) => c.type,
  distance: (c: Course) => {
    const t = trancheDistance(c.distance)
    return t == null ? null : TRANCHES_DISTANCE[t]
  },
  confiance: (c: Course) => confianceCourse(c)?.libelle ?? null,
  jour: (c: Course) => JOURS_SEMAINE[jourSemaine(c.date)],
  piste: (c: Course) => c.hippodrome,
}

/** Les hippodromes les plus courus de la sélection, par nombre de courses jugées. */
export function pistesLesPlusCourues(courses: Course[], n = 6): string[] {
  const compte = new Map<string, number>()
  for (const c of courses) if (c.courue) compte.set(c.hippodrome, (compte.get(c.hippodrome) ?? 0) + 1)
  return [...compte.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([h]) => h)
}

// ── Dernières courses ───────────────────────────────────────────────────────

export type StatutResultat = 'top3' | 'gagnant' | 'place' | 'manque' | 'sansSelection'

export const LIBELLE_STATUT_RESULTAT: Record<StatutResultat, string> = {
  top3: 'Top 3',
  gagnant: 'Gagnant',
  place: 'Placé',
  manque: 'Manqué',
  sansSelection: 'Sans sélection',
}

/** Le trio complet l'emporte sur la victoire seule, comme dans la maquette. */
export function statutResultat(c: Course): StatutResultat {
  if (!c.favori) return 'sansSelection'
  if (trioComplet(c)) return 'top3'
  if (c.gagne) return 'gagnant'
  if (c.place) return 'place'
  return 'manque'
}

/** Les courses jugées, de la plus récente à la plus ancienne. */
export function dernieres(courses: Course[]): Course[] {
  return courses
    .filter((c) => c.courue)
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        (b.heureDepart ?? '').localeCompare(a.heureDepart ?? '') ||
        a.hippodrome.localeCompare(b.hippodrome) ||
        b.numero - a.numero,
    )
}
