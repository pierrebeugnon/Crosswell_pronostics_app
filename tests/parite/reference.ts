import type { LigneMonitoring } from './generateur'

/**
 * CE QUE L'ON RETIENT DE L'OUTIL INTERNE — et rien de plus.
 *
 * Le test de parité compare l'app à l'outil interne sous deux formes : en direct,
 * en important son vrai code (poste de développement), et contre un instantané
 * `reference.json` quand l'outil est absent (CI, Vercel). Les deux passent par
 * cette même extraction : l'instantané n'est que la sérialisation de ce que le
 * test en direct compare. Aucun pourcentage n'y figure — des numérateurs et des
 * dénominateurs entiers, et le détail par course pour pouvoir nommer la course
 * fautive.
 */

/** Le sous-ensemble de `CourseRecord` (outil interne, `src/types.ts`) que la parité lit. */
export interface LigneInterne {
  horse_num: number
  p_win: number | null
  actual_place: number | null
}
export interface CourseInterne {
  date: string
  hippo: string | null
  num: number
  /** `typeOf(categorie)` : Handicap, Réclamer, Conditions, Black-type. */
  type: string
  dist: number | null
  /** `field_size` brut : les déclarés, pas les partants au départ. */
  field: number | null
  scored: boolean
  pick: LigneInterne | null
  winner: LigneInterne | null
  marketFav: LigneInterne | null
  hit: boolean
  rec: number
  pickPlaced: boolean
}

/** Les fonctions de `src/lib/aggregate.ts` de l'outil interne, telles qu'elles sont exportées. */
export interface ModuleInterne {
  buildCourses(rows: LigneMonitoring[]): CourseInterne[]
  winProbPoints(courses: CourseInterne[]): [number, number][]
  confidenceBins(courses: CourseInterne[]): { label: string; n: number; winRate: number; predAvg: number }[]
  marketStats(courses: CourseInterne[]): { n: number; agree: number; ourWin: number; mktWin: number } | null
  distanceBand(d: number | null): string
  fieldBucket(n: number | null): string
  segmentStats(
    courses: CourseInterne[],
    keyFn: (c: CourseInterne) => string,
    order?: string[],
  ): { label: string; n: number; hit: number; rate: number }[]
}

/**
 * Tranches de calibration de l'outil interne, `[bas ; haut[` — y compris la
 * dernière : p = 1 en sort. Recopiées de `src/components/CalibrationChart.tsx`
 * (un composant React, qu'on n'importe pas) ; le test en direct relit ce
 * fichier et échoue si elles y ont changé.
 */
export const BORNES_CALIBRATION_INTERNE: readonly (readonly [number, number])[] = [
  [0, 0.08],
  [0.08, 0.14],
  [0.14, 0.22],
  [0.22, 1],
]

/** Libellés de `confidenceBins` (outil interne, `aggregate.ts:317`) → bornes. */
export const BORNES_CONFIANCE_INTERNE: Record<string, readonly [number, number]> = {
  '<15%': [0, 0.15],
  '15-22%': [0.15, 0.22],
  '22-30%': [0.22, 0.3],
  '>30%': [0.3, 1],
}

/**
 * Par course : [jugée, n° du rang 1, victoire, |trio ∩ nos trois|, favori placé,
 * n° du favori du marché, n° du vainqueur, segment de type, segment de distance,
 * segment de peloton]. Les trois segments sont les libellés de l'outil interne
 * (`typeOf`, `distanceBand`, `fieldBucket`), tels quels.
 */
export type DetailCourse = [
  0 | 1,
  number | null,
  0 | 1,
  number,
  0 | 1,
  number | null,
  number | null,
  string,
  string,
  string,
]

/** Un segment de `segmentStats` (outil interne) : courses jugées et victoires du rang 1. */
export interface SegmentInterne {
  label: string
  n: number
  hit: number
}

export interface Reference {
  meta: {
    lisezMoi: string
    commitOutilInterne: string | null
  }
  jeu: { graine: number; courses: number; lignes: number; empreinte: string }
  agregats: {
    courses: number
    reunions: number
    scored: number
    hit: number
    pickPlaced: number
    /** Σ |act3 ∩ our3| = Σ rec × 3 : l'outil divise par 3, on garde l'entier. */
    trio: number
    calibration: { bas: number; haut: number; n: number; gagnants: number }[]
    confiance: { label: string; n: number; victoires: number }[]
    marche: { n: number; agree: number; ourWin: number; mktWin: number } | null
    /** `segmentStats` sur les trois découpages, triés par libellé. */
    segments: { type: SegmentInterne[]; distance: SegmentInterne[]; peloton: SegmentInterne[] }
  }
  parCourse: Record<string, DetailCourse>
}

/** Clé de course au format de l'app (`lib/aggregate.ts`, `cleCourse`). */
export const cleClient = (date: string, hippo: string | null, num: number) => `${date}|${hippo ?? '?'}|${num}`

export function extraireReference(
  mod: ModuleInterne,
  lignes: LigneMonitoring[],
  jeu: Reference['jeu'],
  commitOutilInterne: string | null,
): Reference {
  // L'outil interne trie les lignes de chaque course EN PLACE : on lui donne des copies.
  const courses = mod.buildCourses(lignes.map((l) => ({ ...l })))
  const scored = courses.filter((c) => c.scored)

  const points = mod.winProbPoints(courses)
  const calibration = BORNES_CALIBRATION_INTERNE.map(([bas, haut]) => {
    // Réplique exacte de CalibrationChart.tsx : `p >= bas && p < haut`, tranches vides retirées.
    const g = points.filter(([p]) => p >= bas && p < haut)
    return { bas, haut, n: g.length, gagnants: g.reduce((s, [, y]) => s + y, 0) }
  }).filter((t) => t.n > 0)

  const parCourse: Record<string, DetailCourse> = {}
  for (const c of courses) {
    parCourse[cleClient(c.date, c.hippo, c.num)] = [
      c.scored ? 1 : 0,
      c.pick?.horse_num ?? null,
      c.hit ? 1 : 0,
      Math.round(c.rec * 3),
      c.pickPlaced ? 1 : 0,
      c.marketFav?.horse_num ?? null,
      c.winner?.horse_num ?? null,
      c.type,
      mod.distanceBand(c.dist),
      mod.fieldBucket(c.field),
    ]
  }

  // Les découpages de `SegmentAnalysis.tsx` : type, `distanceBand(dist)`, `fieldBucket(field)`.
  const segments = (cle: (c: CourseInterne) => string): SegmentInterne[] =>
    mod
      .segmentStats(courses, cle)
      .map((s) => ({ label: s.label, n: s.n, hit: s.hit }))
      .sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0))

  const marche = mod.marketStats(courses)
  return {
    meta: {
      lisezMoi:
        "Agrégats de l'outil interne (Crosswell-internal-tools) sur le jeu de tests/parite/generateur.ts. Généré par `npm run parite` ; régénérer avec MAJ_REFERENCE=1 (voir tests/parite/README.md). Ne pas éditer à la main.",
      commitOutilInterne,
    },
    jeu,
    agregats: {
      courses: courses.length,
      reunions: new Set(courses.map((c) => `${c.date}#${c.hippo ?? '?'}`)).size,
      scored: scored.length,
      hit: scored.filter((c) => c.hit).length,
      pickPlaced: scored.filter((c) => c.pickPlaced).length,
      trio: scored.reduce((s, c) => s + Math.round(c.rec * 3), 0),
      calibration,
      // winRate est un pourcentage flottant : n × winRate / 100 redonne l'entier, à l'arrondi près.
      confiance: mod.confidenceBins(courses).map((b) => ({
        label: b.label,
        n: b.n,
        victoires: Math.round((b.winRate * b.n) / 100),
      })),
      marche: marche && { n: marche.n, agree: marche.agree, ourWin: marche.ourWin, mktWin: marche.mktWin },
      segments: {
        type: segments((c) => c.type),
        distance: segments((c) => mod.distanceBand(c.dist)),
        peloton: segments((c) => mod.fieldBucket(c.field)),
      },
    },
    parCourse,
  }
}

/**
 * Sérialisation lisible en diff : une course par ligne. `JSON.stringify(…, 2)`
 * mettrait chaque tableau sur huit lignes et noierait une vraie différence dans
 * vingt mille lignes de bruit.
 */
export function serialiserReference(ref: Reference): string {
  const { parCourse, ...tete } = ref
  const corps = JSON.stringify(tete, null, 2).replace(/\n}$/, '')
  const courses = Object.keys(parCourse)
    .sort()
    .map((k) => `    ${JSON.stringify(k)}: ${JSON.stringify(parCourse[k])}`)
    .join(',\n')
  return `${corps},\n  "parCourse": {\n${courses}\n  }\n}\n`
}

/** Comparaison hors métadonnées : renvoie les premiers chemins qui diffèrent. */
export function differencesReference(a: Reference, b: Reference, max = 10): string[] {
  const diffs: string[] = []
  const parcourir = (x: unknown, y: unknown, chemin: string) => {
    if (diffs.length >= max) return
    if (typeof x === 'object' && x !== null && typeof y === 'object' && y !== null) {
      const cles = new Set([...Object.keys(x), ...Object.keys(y)])
      for (const k of cles) parcourir((x as Record<string, unknown>)[k], (y as Record<string, unknown>)[k], `${chemin}.${k}`)
    } else if (x !== y) {
      diffs.push(`${chemin} : ${JSON.stringify(x)} ≠ ${JSON.stringify(y)}`)
    }
  }
  parcourir({ jeu: a.jeu, agregats: a.agregats, parCourse: a.parCourse }, { jeu: b.jeu, agregats: b.agregats, parCourse: b.parCourse }, 'reference')
  return diffs
}
