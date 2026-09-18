import { describe, expect, it } from 'vitest'
import { basculer, indiceComparaison, meilleure, partantsCompares } from '@/lib/comparaison'
import type { Partant } from '@/types'

const p = (numero: number, nonPartant = false) => ({ numero, nonPartant }) as Partant

describe('sélection', () => {
  it('ajoute, retire, et s’arrête à trois', () => {
    expect(basculer([], 4)).toEqual([4])
    expect(basculer([4, 7], 4)).toEqual([7])
    expect(basculer([4, 7, 9], 2)).toEqual([4, 7, 9])
    expect(basculer([4, 7, 9], 7)).toEqual([4, 9])
  })

  it('dit quoi faire', () => {
    expect(indiceComparaison(1)).toBe('Sélectionnez au moins 2 chevaux')
    expect(indiceComparaison(2)).toBe('Vous pouvez en ajouter un 3e')
    expect(indiceComparaison(3)).toBe('3 chevaux maximum')
  })

  it('garde l’ordre de sélection et écarte absents et non-partants', () => {
    const liste = [p(1), p(2), p(3, true), p(4)]
    expect(partantsCompares(liste, [4, 3, 9, 1]).map((x) => x.numero)).toEqual([4, 1])
  })
})

describe('meilleure valeur', () => {
  it('la plus haute, seulement quand il y a de quoi comparer', () => {
    expect(meilleure([0.12, 0.3, null])).toBe(0.3)
    expect(meilleure([0.12, null])).toBeNull()
    expect(meilleure([])).toBeNull()
  })
})
