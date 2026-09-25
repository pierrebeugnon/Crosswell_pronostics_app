import { describe, expect, it } from 'vitest'
import { age, carriere, discipline, euros, ligneIdentite, metres, montant, musique, nomPropre, placeLisible } from '@/lib/fiche'
import type { PerformanceCheval, ProfilCheval } from '@/types'

const perf = (date: string, place: string, specialite = 'P', gains: string | null = null): PerformanceCheval =>
  ({ date, place, specialite, gains }) as PerformanceCheval

describe('identité', () => {
  it('calcule l’âge révolu', () => {
    expect(age('2019-04-12', '2026-09-18')).toBe(7)
    expect(age('2019-09-19', '2026-09-18')).toBe(6)
    expect(age(null, '2026-09-18')).toBeNull()
  })

  it('compose « âge · sexe · robe » et tait un code inconnu', () => {
    const p = { dateNaissance: '2019-04-12', sexe: 'HONGRE', robe: 'GRI' } as ProfilCheval
    expect(ligneIdentite(p, '2026-09-18')).toBe('7 ans · Hongre · Gris')
    expect(ligneIdentite({ ...p, robe: 'BCE', sexe: 'FEMELLE' }, '2026-09-18')).toBe('7 ans · Femelle')
    expect(ligneIdentite(null, '2026-09-18')).toBe('')
  })

  it('remet les noms en casse française', () => {
    expect(nomPropre('GOLIATH DU BERLAIS')).toBe('Goliath du Berlais')
    expect(nomPropre('E. ALLAIRE (S)')).toBe('E. Allaire (S)')
    expect(nomPropre("KING'S THEATRE IRE")).toBe("King's Theatre Ire")
    expect(nomPropre("D'ARTAGNAN DE L'OR")).toBe("D'Artagnan de L'Or")
    expect(nomPropre(null)).toBeNull()
  })
})

describe('performances', () => {
  it('lit places, disciplines, distances et montants', () => {
    expect(placeLisible('1')).toBe('1er')
    expect(placeLisible('12')).toBe('12e')
    expect(placeLisible('TB')).toBe('Tombé')
    expect(placeLisible(null)).toBe('—')
    expect(discipline('H')).toBe('Haies')
    expect(metres('3.600')).toBe(3600)
    expect(montant('16.250')).toBe(16250)
    expect(montant('1.250,50')).toBe(1250.5)
    expect(euros(16250)).toBe(`16${' '}250 €`)
    expect(euros(2_600_000)).toBe('2,6 M€')
  })

  it('écrit la musique, la plus récente d’abord, sans les non-partants', () => {
    const m = musique([
      perf('2026-07-01', '1', 'H'),
      perf('2026-09-01', '3', 'P'),
      perf('2026-08-01', 'NP', 'P'),
      perf('2026-08-15', '12', 'S'),
      perf('2026-06-01', 'TB', 'S'),
    ])
    expect(m.map((c) => c.libelle)).toEqual(['3p', '0s', '1h', 'Ts'])
    expect(m.map((c) => c.ton)).toEqual(['place', 'loin', 'place', 'loin'])
  })

  it('fait le bilan de carrière, non-partants exclus', () => {
    const c = carriere([perf('a', '1', 'P', '16.250'), perf('b', '3', 'P', '4.000'), perf('c', '7'), perf('d', 'NP', 'P', '0')])
    expect(c).toEqual({ courses: 3, victoires: 1, places: 2, allocations: 20250 })
  })
})
