import { describe, expect, it } from 'vitest'
import {
  grade,
  indicateurs,
  initialesPro,
  lienPro,
  parDiscipline,
  parHippodrome,
  saison,
  specialitePrincipale,
  victoiresParMois,
} from '@/lib/professionnels'
import type { StatPro } from '@/types'

const s = (o: Partial<StatPro>): StatPro => ({
  annee: 2026,
  mois: 1,
  specialite: 'P',
  hippodrome: 'CHANTILLY',
  montes: 10,
  victoires: 1,
  places: 2,
  allocations: 1000,
  ...o,
})

describe('identité', () => {
  it('initiales et adresse', () => {
    expect(initialesPro('L. ZULIANI')).toBe('LZ')
    expect(initialesPro('E. ALLAIRE (S)')).toBe('EA')
    expect(initialesPro('A. ALLAIRE')).toBe('AA')
    expect(lienPro('jockey', 'L. ZULIANI')).toBe('/jockeys/L.%20ZULIANI')
    expect(lienPro('entraineur', 'E. ALLAIRE (S)')).toBe('/entraineurs/E.%20ALLAIRE%20(S)')
  })
})

describe('saison et indicateurs', () => {
  it('prend la saison en cours si elle a des courses, sinon la précédente', () => {
    expect(saison([s({ annee: 2026 })], 2026)).toBe(2026)
    expect(saison([s({ annee: 2025 })], 2026)).toBe(2025)
    expect(saison([s({ annee: 2026, montes: 0 })], 2026)).toBe(2025)
  })

  it('somme et calcule réussite et placé (victoires comprises)', () => {
    const i = indicateurs([s({}), s({ montes: 30, victoires: 5, places: 4, allocations: 9000 })])
    expect(i).toMatchObject({ montes: 40, victoires: 6, places: 6, allocations: 10000 })
    expect(i.reussite).toBeCloseTo(6 / 40)
    expect(i.place).toBeCloseTo(12 / 40)
    expect(indicateurs([]).reussite).toBe(0)
  })
})

describe('découpages', () => {
  const stats = [
    s({ mois: 1, victoires: 2 }),
    s({ mois: 3, specialite: 'H', hippodrome: 'AUTEUIL', montes: 20, victoires: 4 }),
    s({ mois: 3, specialite: 'S', hippodrome: 'AUTEUIL', montes: 5, victoires: 0 }),
  ]

  it('victoires par mois jusqu’au mois en cours, sans trou', () => {
    expect(victoiresParMois(stats, 2026, '2026-04-10').map((m) => m.victoires)).toEqual([2, 0, 4, 0])
    expect(victoiresParMois(stats, 2025, '2026-04-10')).toHaveLength(12)
  })

  it('par discipline et par hippodrome, du plus couru au moins couru', () => {
    expect(parDiscipline(stats).map((t) => [t.libelle, t.montes])).toEqual([
      ['Haies', 20],
      ['Plat', 10],
      ['Steeple', 5],
    ])
    expect(parHippodrome(stats)[0]).toEqual({ libelle: 'AUTEUIL', montes: 25, reussite: 4 / 25 })
    expect(specialitePrincipale(stats)).toBe('Obstacle')
    expect(specialitePrincipale([])).toBeNull()
  })

  it('lit les catégories de Groupe et Listed', () => {
    expect(grade('GR.I')).toBe('Gr. 1')
    expect(grade('GR.II')).toBe('Gr. 2')
    expect(grade('GR.III PA')).toBe('Gr. 3 PA')
    expect(grade('Listed')).toBe('Listed')
    expect(grade('LISTED PA')).toBe('Listed PA')
    expect(grade(null)).toBe('')
  })
})
