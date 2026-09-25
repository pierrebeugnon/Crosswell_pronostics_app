import { describe, expect, it } from 'vitest'
import { construireCourses } from '@/lib/aggregate'
import {
  BORNES_CALIBRATION,
  BORNES_CONFIANCE,
  bilan,
  calibration,
  confiance,
  faceAuMarche,
  pointsCalibration,
  repereHasard,
  wilson,
} from '@/lib/stats'
import type { LignePrediction } from '@/types'

/*
 * Les indicateurs de « Nos résultats », sur des courses écrites à la main. Les
 * valeurs attendues sont recalculées dans le test, jamais recopiées d'un écran.
 */

let courseSuivante = 1

function ligne(horse_num: number, champs: Partial<LignePrediction> = {}): LignePrediction {
  return {
    reunion_date: '2026-09-10',
    hippodrome: 'DEAUVILLE',
    course_num: 1,
    course_nom: null,
    categorie: null,
    is_handicap: null,
    distance: 1600,
    field_size: null,
    horse_num,
    horse_name: null,
    id_fg: null,
    pred_rank: horse_num,
    p_win: null,
    p_place: null,
    actual_place: null,
    model_version: 'rating+forme.v1',
    cote: null,
    rapport_gagnant: null,
    rapport_place: null,
    non_partant: false,
    rang_effectif: horse_num,
    heure_depart: null,
    ...champs,
  }
}

/**
 * Une course jugée de `n` partants, numérotés 1..n, rang = numéro, gagnée par
 * `gagnant` (null = aucune place relevée). `np` : numéros déclarés non partants.
 */
function course(n: number, gagnant: number | null, np: number[] = [], champs: Partial<LignePrediction> = {}) {
  const num = courseSuivante++
  let rang = 0
  return Array.from({ length: n + np.length }, (_, i) => {
    const h = i + 1
    const estNp = np.includes(h)
    if (!estNp) rang++
    return ligne(h, {
      course_num: num,
      non_partant: estNp,
      rang_effectif: estNp ? null : rang,
      actual_place: gagnant === h ? 1 : null,
      ...champs,
    })
  })
}

describe('wilson', () => {
  it('65 victoires sur 234 courses → [22,43 % ; 33,84 %]', () => {
    // Valeur recalculée à la main : p = 65/234, z = 1,96.
    const z = 1.96
    const p = 65 / 234
    const d = 1 + (z * z) / 234
    const centre = p + (z * z) / 468
    const e = z * Math.sqrt((p * (1 - p) + (z * z) / 936) / 234)
    const { bas, haut } = wilson(65, 234)
    expect(bas).toBeCloseTo((centre - e) / d, 12)
    expect(haut).toBeCloseTo((centre + e) / d, 12)
    expect(bas).toBeCloseTo(0.2243, 4)
    expect(haut).toBeCloseTo(0.3384, 4)
  })
  it('reste dans [0 ; 1] aux extrêmes et vaut [0 ; 0] sans effectif', () => {
    expect(wilson(0, 0)).toEqual({ bas: 0, haut: 0 })
    expect(wilson(0, 10).bas).toBe(0)
    expect(wilson(10, 10).haut).toBe(1)
    expect(wilson(0, 10).haut).toBeGreaterThan(0)
  })
})

describe('calibration', () => {
  const lignes = [
    // Course jugée : un gagnant, un perdant sans place, un non-partant, un p_win nul.
    ligne(1, { course_num: 101, p_win: 0.5, actual_place: 1 }),
    ligne(2, { course_num: 101, p_win: 0.3 }),
    ligne(3, { course_num: 101, p_win: 0.2, non_partant: true, rang_effectif: null }),
    ligne(4, { course_num: 101, p_win: null, rang_effectif: 3 }),
    // Course non jugée : aucun point.
    ligne(1, { course_num: 102, p_win: 0.6 }),
    ligne(2, { course_num: 102, p_win: 0.4 }),
  ]
  const courses = construireCourses(lignes)

  it('un cheval sans place dans une course jugée est un point perdant (y = 0)', () => {
    const pts = pointsCalibration(courses)
    expect(pts).toContainEqual({ p: 0.3, gagne: 0 })
    expect(pts).toContainEqual({ p: 0.5, gagne: 1 })
  })

  it('exclut les non-partants, les probabilités nulles et les courses non jugées', () => {
    expect(pointsCalibration(courses)).toHaveLength(2)
    const t = calibration(courses, [[0, 0.4], [0.4, 1]])
    expect(t.map((x) => [x.n, x.gagnants])).toEqual([[1, 0], [1, 1]])
  })

  it('la dernière tranche est fermée à droite : p = 1 est compté', () => {
    const c = construireCourses([
      ligne(1, { course_num: 201, p_win: 1, actual_place: 1 }),
      ligne(2, { course_num: 201, p_win: 0, actual_place: 2 }),
      ligne(3, { course_num: 201, p_win: 0.45, actual_place: 3 }),
    ])
    const t = calibration(c)
    const derniere = t.find((x) => x.haut === 1)!
    expect(derniere.bas).toBe(BORNES_CALIBRATION[BORNES_CALIBRATION.length - 1][0])
    // 0,45 tombe dans [0,45 ; 1] (borne basse incluse), 1 aussi.
    expect(derniere.n).toBe(2)
    expect(derniere.gagnants).toBe(1)
    expect(derniere.annonce).toBeCloseTo(0.725, 12)
    expect(t.reduce((s, x) => s + x.n, 0)).toBe(3)
  })

  it('une tranche intermédiaire reste ouverte à droite', () => {
    const c = construireCourses([
      ligne(1, { course_num: 301, p_win: 0.15, actual_place: 1 }),
      ligne(2, { course_num: 301, p_win: 0.1 }),
    ])
    const t = calibration(c)
    expect(t.find((x) => x.bas === 0.15)?.n).toBe(1)
    expect(t.find((x) => x.bas === 0.1)?.n).toBe(1)
    expect(t.find((x) => x.bas === 0.1)?.gagnants).toBe(0)
  })

  it('les tranches vides disparaissent, l’intervalle de Wilson est celui de la tranche', () => {
    const t = calibration(courses, [[0, 0.1], [0.1, 0.4], [0.4, 1]])
    expect(t.map((x) => x.bas)).toEqual([0.1, 0.4])
    const w = wilson(1, 1)
    expect(t[1].icBas).toBeCloseTo(w.bas, 12)
    expect(t[1].icHaut).toBeCloseTo(w.haut, 12)
  })
})

describe('confiance', () => {
  it('un point par course jugée, celui du rang 1 EFFECTIF, dans les tranches de l’outil interne', () => {
    const courses = construireCourses([
      // Rang 1 publié retiré (p = 0,40) : c'est le n°2 (p = 0,20) qui compte.
      ...course(3, 2, [1], { p_win: null }).map((l) => ({ ...l, p_win: [0.4, 0.2, 0.1, 0.05][l.horse_num - 1] })),
      ...course(4, 1, [], {}).map((l) => ({ ...l, p_win: [0.35, 0.3, 0.2, 0.15][l.horse_num - 1] })),
      ...course(4, 3, [], {}).map((l) => ({ ...l, p_win: [0.1, 0.3, 0.2, 0.15][l.horse_num - 1] })),
      ...course(4, 3, [], {}).map((l) => ({ ...l, p_win: [1, 0, 0, 0][l.horse_num - 1] })),
      // Non jugée : ignorée.
      ...course(4, null, [], {}).map((l) => ({ ...l, p_win: 0.25 })),
    ])
    const t = confiance(courses)
    expect(BORNES_CONFIANCE).toEqual([[0, 0.15], [0.15, 0.22], [0.22, 0.3], [0.3, 1]])
    expect(t.map((x) => [x.bas, x.n, x.gagnants])).toEqual([
      [0, 1, 0], // 0,10
      [0.15, 1, 1], // 0,20 : le rang 1 effectif a gagné
      [0.3, 2, 1], // 0,35 (gagnant) et 1 (perdant, tranche fermée à droite)
    ])
  })
})

describe('repereHasard', () => {
  it('est la moyenne des 1/n, pas 1 sur la taille moyenne (6 et 16 partants → 11,46 %)', () => {
    const courses = construireCourses([...course(6, 1), ...course(16, 2)])
    const h = repereHasard(courses)
    expect(h.victoire).toBeCloseTo((1 / 6 + 1 / 16) / 2, 12)
    expect(h.victoire).toBeCloseTo(0.1146, 4)
    expect(h.victoire).not.toBeCloseTo(1 / 11, 3)
    expect(h.dansLesTrois).toBeCloseTo((3 / 6 + 3 / 16) / 2, 12)
    expect(h.n).toBe(2)
  })

  it('compte les chevaux AU DÉPART, plafonne « dans les trois » à 1, ignore les courses non jugées', () => {
    const courses = construireCourses([
      ...course(16, 1, [4]), // 17 déclarés, 16 au départ
      ...course(2, 1), // 3/2 plafonné à 1
      ...course(5, null), // non jugée
    ])
    const h = repereHasard(courses)
    expect(h.n).toBe(2)
    expect(h.victoire).toBeCloseTo((1 / 16 + 1 / 2) / 2, 12)
    expect(h.dansLesTrois).toBeCloseTo((3 / 16 + 1) / 2, 12)
  })

  it('vaut zéro sans course jugée', () => {
    expect(repereHasard([])).toEqual({ victoire: 0, dansLesTrois: 0, n: 0 })
  })
})

describe('faceAuMarche', () => {
  it('n’exige pas que le vainqueur figure dans nos lignes', () => {
    const courses = construireCourses([
      // Jugée, cotée, mais le vainqueur n'est pas dans nos lignes (seul le 2e est relevé).
      ligne(1, { course_num: 401, cote: 2 }),
      ligne(2, { course_num: 401, cote: 4, actual_place: 2 }),
      // Jugée, cotée : nous (n°1) gagnons, le marché (n°2) non.
      ligne(1, { course_num: 402, cote: 5, actual_place: 1 }),
      ligne(2, { course_num: 402, cote: 3 }),
      // Jugée, cotée : accord, et le favori commun gagne.
      ligne(1, { course_num: 403, cote: 1.8, actual_place: 1 }),
      ligne(2, { course_num: 403, cote: 3 }),
      // Jugée mais sans cote : hors comparaison.
      ligne(1, { course_num: 404, actual_place: 1 }),
      ligne(2, { course_num: 404 }),
      // Cotée mais non jugée : hors comparaison.
      ligne(1, { course_num: 405, cote: 2 }),
      ligne(2, { course_num: 405, cote: 3 }),
    ])
    const m = faceAuMarche(courses)!
    expect([m.n, m.nous, m.marche, m.accord]).toEqual([3, 2, 1, 2])
    expect(m.tauxNous).toBeCloseTo(2 / 3, 12)
  })

  it('dead heat : le favori du marché ex æquo premier compte une victoire', () => {
    /*
     * Notre rang 1 (n° 1) et le favori du marché (n° 3, cote 2) finissent premiers
     * ex æquo. `construireCourses` ne retient qu'un vainqueur, le mieux classé par
     * nous ; `faceAuMarche` juge les deux camps sur l'arrivée : chacun a gagné.
     * L'outil interne ne comptait la course que pour nous (écart (iv) de tests/parite).
     */
    const courses = construireCourses([
      ligne(1, { course_num: 501, cote: 4, actual_place: 1 }),
      ligne(2, { course_num: 501, cote: 6, actual_place: 3 }),
      ligne(3, { course_num: 501, cote: 2, actual_place: 1 }),
    ])
    expect(courses[0].gagnant?.numero).toBe(1)
    const m = faceAuMarche(courses)!
    expect([m.n, m.nous, m.marche, m.accord]).toEqual([1, 1, 1, 0])
  })

  it('une course sans rang 1 (aucun pred_rank) sort de la comparaison', () => {
    const courses = construireCourses([
      ligne(1, { course_num: 601, pred_rank: null, rang_effectif: 1, cote: 2, actual_place: 1 }),
      ligne(2, { course_num: 601, pred_rank: null, rang_effectif: 1, cote: 3 }),
    ])
    expect(faceAuMarche(courses)).toBeNull()
  })

  it('renvoie null quand aucune course n’est comparable', () => {
    expect(faceAuMarche(construireCourses(course(4, 1)))).toBeNull()
  })
})

describe('bilan', () => {
  it('compte les réunions touchées et les réunions jugées séparément', () => {
    const courses = construireCourses([
      // Deauville : deux courses, une gagnée, une perdue dans les trois.
      ligne(1, { course_num: 1, actual_place: 1 }),
      ligne(2, { course_num: 1, actual_place: 2 }),
      ligne(3, { course_num: 1, actual_place: 3 }),
      ligne(1, { course_num: 2, actual_place: 3 }),
      ligne(2, { course_num: 2, actual_place: 4 }),
      ligne(3, { course_num: 2, actual_place: 1 }),
      ligne(4, { course_num: 2, actual_place: 2 }),
      // Vichy : une course pas encore courue.
      ligne(1, { hippodrome: 'VICHY' }),
      ligne(2, { hippodrome: 'VICHY' }),
    ])
    const b = bilan(courses)
    expect(b.courses).toBe(3)
    expect(b.jugees).toBe(2)
    expect(b.gagnees).toBe(1)
    expect(b.placees).toBe(2)
    expect(b.trio).toBe(3 + 2)
    expect(b.reunions).toBe(2)
    expect(b.reunionsJugees).toBe(1)
    expect(b.tauxVictoire).toBe(0.5)
    expect(b.tauxTrio).toBeCloseTo(5 / 6, 12)
  })

  it('reste à zéro sans course jugée', () => {
    const b = bilan(construireCourses(course(5, null)))
    expect([b.jugees, b.tauxVictoire, b.tauxPlace, b.tauxTrio, b.reunionsJugees]).toEqual([0, 0, 0, 0, 0])
  })
})
