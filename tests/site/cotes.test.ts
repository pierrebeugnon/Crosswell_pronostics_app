import { describe, expect, it } from 'vitest'
import { TETE_OUTIL_COTE, lireCote, lireCotes, lireCourse, lireProbabilite } from '../../site/src/lib/cotes'

describe('lireCote', () => {
  it('accepte la virgule et le point décimal', () => {
    expect(lireCote('3,5')).toBe(3.5)
    expect(lireCote(' 3.5 ')).toBe(3.5)
    expect(lireCote('12')).toBe(12)
  })

  it('refuse ce qui n’est pas une cote', () => {
    expect(lireCote('1')).toBeNull()
    expect(lireCote('0,8')).toBeNull()
    expect(lireCote('abc')).toBeNull()
    expect(lireCote('')).toBeNull()
    expect(lireCote('-3')).toBeNull()
  })
})

describe('lireProbabilite', () => {
  it('lit un pourcentage, avec ou sans signe', () => {
    expect(lireProbabilite('25')).toBe(0.25)
    expect(lireProbabilite('12,5 %')).toBe(0.125)
  })

  it('refuse 0 et 100', () => {
    expect(lireProbabilite('0')).toBeNull()
    expect(lireProbabilite('100')).toBeNull()
  })
})

describe('lireCotes', () => {
  it('garde la virgule comme décimale et sépare sur les blancs', () => {
    expect(lireCotes('2,5 4\n6;8').cotes).toEqual([2.5, 4, 6, 8])
  })

  it('met de côté ce qui ne se lit pas', () => {
    expect(lireCotes('3 x 1 5')).toEqual({ cotes: [3, 5], rejetees: ['x', '1'] })
  })
})

describe('lireCourse', () => {
  it('retire la marge : les probabilités nettes font 100 %', () => {
    const l = lireCourse([2, 4, 4, 5])!
    expect(l.somme).toBeCloseTo(1.2)
    expect(l.partants.reduce((s, p) => s + p.nette, 0)).toBeCloseTo(1)
    expect(l.partants[0].annoncee).toBe(0.5)
    expect(l.partants[0].nette).toBeCloseTo(0.5 / 1.2)
    expect(l.diagnostic).toBe('normale')
  })

  it('signale une liste où manquent des partants', () => {
    expect(lireCourse([3, 5, 8])!.diagnostic).toBe('incomplete')
  })

  it('signale une somme anormalement haute', () => {
    expect(lireCourse([1.5, 2, 3])!.diagnostic).toBe('elevee')
  })

  it('ne lit pas une course d’un seul partant', () => {
    expect(lireCourse([2])).toBeNull()
  })
})

describe('TETE_OUTIL_COTE', () => {
  it('tient dans ce que Google affiche', () => {
    expect(TETE_OUTIL_COTE.titre.length).toBeLessThanOrEqual(60)
    expect(TETE_OUTIL_COTE.description.length).toBeLessThanOrEqual(155)
  })
})
