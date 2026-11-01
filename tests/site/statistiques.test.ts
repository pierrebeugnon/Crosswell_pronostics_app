import { describe, expect, it } from 'vitest'
import { calculerStatistiques, type LigneStatistique } from '../../site/src/lib/statistiques'

/** Une course : `[cote, place, non-partant ?]` par partant. */
function course(
  numero: number,
  partants: [number | null, number | null, boolean?][],
  autre: Partial<LigneStatistique> = {},
): LigneStatistique[] {
  return partants.map(([cote, place, np]) => ({
    reunion_date: '2026-10-01',
    hippodrome: 'DEAUVILLE',
    course_num: numero,
    discipline: 'Plat',
    is_handicap: false,
    actual_place: place,
    cote,
    non_partant: np ?? false,
    ...autre,
  }))
}

describe('calculerStatistiques', () => {
  it('compte battu un favori hors arrivée, sans le retirer de l’effectif', () => {
    const s = calculerStatistiques([
      ...course(1, [[2, 1], [5, 2], [9, 3]]),
      ...course(2, [[2, null], [5, 1], [9, 2], [12, 3]]),
    ])
    expect(s.ensemble.avecFavori).toBe(2)
    expect(s.ensemble.gagne).toBe(0.5)
    expect(s.ensemble.place).toBe(0.5)
  })

  it('ne laisse pas un non-partant désigner le favori ni grossir le peloton', () => {
    const s = calculerStatistiques(course(1, [[1.5, null, true], [3, 2], [4, 1]]))
    expect(s.partants).toBe(2)
    expect(s.ensemble.gagne).toBe(0)
    expect(s.ensemble.hasardGagne).toBe(0.5)
  })

  it('écarte une course dont la cote la plus basse est partagée', () => {
    const s = calculerStatistiques(course(1, [[3, 1], [3, 2], [8, 3]]))
    expect(s.courses).toBe(1)
    expect(s.coursesCotees).toBe(1)
    expect(s.ensemble.avecFavori).toBe(0)
    expect(s.ensemble.gagne).toBeNull()
  })

  it('écarte du favori une course sans cote complète, et la garde dans les courses', () => {
    const s = calculerStatistiques([
      ...course(1, [[null, 1], [null, 2]]),
      ...course(2, [[2, 2], [null, 1]]),
    ])
    expect(s.courses).toBe(2)
    expect(s.coursesCotees).toBe(0)
    expect(s.ensemble.avecFavori).toBe(0)
  })

  it('calcule les repères sur les seules courses à favori', () => {
    const s = calculerStatistiques([
      ...course(1, [[2, 1], [4, 2]]),
      ...course(2, [[null, 1], [null, 2], [null, 3], [null, 4]]),
    ])
    expect(s.ensemble.hasardGagne).toBe(0.5)
    expect(s.ensemble.hasardPlace).toBe(1)
  })

  it('retire la marge de l’opérateur de ce qu’annonce la cote', () => {
    const s = calculerStatistiques(course(1, [[2, 1], [4, 2], [4, 3]]))
    expect(s.ensemble.annonce).toBeCloseTo(0.5)
  })

  it('range chaque course dans sa discipline, son peloton et sa tranche de cote', () => {
    const s = calculerStatistiques([
      ...course(1, [[1.5, 1], [6, 2]], { discipline: 'Haies', is_handicap: true }),
      ...course(2, [[3.5, 1], [6, 2], [7, 3], [8, 4], [9, 5], [10, 6], [11, 7]]),
    ])
    expect(s.disciplines.map((d) => [d.libelle, d.courses])).toEqual([['Plat', 1], ['Haies', 1]])
    expect(s.handicaps.map((h) => h.courses)).toEqual([1, 1])
    expect(s.pelotons.map((p) => p.libelle)).toEqual(['6 partants ou moins', '7 à 9 partants'])
    expect(s.cotes.map((c) => c.libelle)).toEqual(['Moins de 2', 'De 3 à 4'])
  })

  it('n’expose aucune colonne du modèle', () => {
    const s = calculerStatistiques(course(1, [[2, 1], [4, 2]]))
    expect(JSON.stringify(s)).not.toMatch(/rang|p_win|p_place|pWin/)
  })
})
