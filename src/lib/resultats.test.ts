import { describe, expect, it } from 'vitest'
import {
  AUCUN_FILTRE,
  decoupage,
  dernieres,
  echelle,
  etendue,
  filtrer,
  hasard,
  jourSemaine,
  parMois,
  pistesLesPlusCourues,
  statutResultat,
  taux,
  trancheDistance,
  trioComplet,
} from '@/lib/resultats'
import type { Course, Partant } from '@/types'

function course(o: Partial<Course>): Course {
  return {
    cle: `${o.date}|${o.hippodrome}|${o.numero}`,
    date: '2026-09-18',
    hippodrome: 'X',
    numero: 1,
    type: 'Handicap',
    distance: 2000,
    partants: 10,
    courue: true,
    gagne: false,
    place: false,
    dansLeTrio: 0,
    podium: [{}, {}, {}] as Partant[],
    favori: { pWin: 0.2 } as Partant,
    ...o,
  } as Course
}

describe('indicateurs', () => {
  const gagnee = course({ gagne: true, place: true, dansLeTrio: 2 })
  const trio = course({ gagne: false, place: true, dansLeTrio: 3 })
  const battue = course({})
  const aVenir = course({ courue: false, gagne: true })
  const lot = [gagnee, trio, battue, aVenir]

  it('mesure sur les seules courses jugées', () => {
    expect(taux(lot, 'gagnant')).toBeCloseTo(1 / 3)
    expect(taux(lot, 'place')).toBeCloseTo(2 / 3)
    expect(taux(lot, 'top3')).toBeCloseTo(1 / 3)
    expect(taux([], 'gagnant')).toBe(0)
  })

  it('un trio complet exige trois chevaux prédits au départ', () => {
    expect(trioComplet(trio)).toBe(true)
    expect(trioComplet(course({ dansLeTrio: 3, podium: [{}, {}] as Partant[] }))).toBe(false)
  })

  it('le statut préfère le trio complet à la victoire', () => {
    expect(statutResultat(course({ gagne: true, place: true, dansLeTrio: 3 }))).toBe('top3')
    expect(statutResultat(gagnee)).toBe('gagnant')
    expect(statutResultat(course({ place: true }))).toBe('place')
    expect(statutResultat(battue)).toBe('manque')
    expect(statutResultat(course({ favori: null }))).toBe('sansSelection')
  })
})

describe('hasard', () => {
  it('moyenne des probabilités par course, selon l’indicateur', () => {
    const lot = [course({ partants: 4 }), course({ partants: 10 })]
    expect(hasard(lot, 'gagnant')).toBeCloseTo((1 / 4 + 1 / 10) / 2)
    expect(hasard(lot, 'place')).toBeCloseTo((3 / 4 + 3 / 10) / 2)
    expect(hasard(lot, 'top3')).toBeCloseTo((1 / 4 + 1 / 120) / 2)
    expect(hasard([course({ partants: 3 })], 'top3')).toBe(1)
  })
})

describe('filtres', () => {
  it('jour de la semaine, lundi = 0', () => {
    expect(jourSemaine('2026-09-14')).toBe(0)
    expect(jourSemaine('2026-09-20')).toBe(6)
  })

  it('tranches de distance de la maquette, bornes basses incluses', () => {
    expect([1599, 1600, 2399, 2400, 3499, 3500].map(trancheDistance)).toEqual([0, 1, 1, 2, 2, 3])
    expect(trancheDistance(null)).toBeNull()
  })

  it('combine les filtres, une valeur vide ne filtre rien', () => {
    const a = course({ date: '2025-03-10', hippodrome: 'PAU', type: 'Conditions', distance: 3600 })
    const b = course({ date: '2026-03-12', hippodrome: 'PAU', type: 'Handicap', distance: 1200 })
    const c = course({ date: '2026-09-14', hippodrome: 'DEAUVILLE' })
    expect(filtrer([a, b, c], AUCUN_FILTRE)).toHaveLength(3)
    expect(filtrer([a, b, c], { ...AUCUN_FILTRE, annee: '2026' })).toEqual([b, c])
    expect(filtrer([a, b, c], { ...AUCUN_FILTRE, mois: '2' })).toEqual([a, b])
    expect(filtrer([a, b, c], { ...AUCUN_FILTRE, jour: '0' })).toEqual([a, c])
    expect(filtrer([a, b, c], { ...AUCUN_FILTRE, piste: 'PAU', distance: '3' })).toEqual([a])
    expect(filtrer([a, b, c], { ...AUCUN_FILTRE, type: 'Handicap', annee: '2026' })).toEqual([b, c])
  })
})

describe('série mensuelle', () => {
  const lot = [
    course({ date: '2025-11-03', gagne: true }),
    course({ date: '2025-11-20' }),
    course({ date: '2026-01-05', gagne: true }),
    course({ date: '2026-02-01', courue: false }),
  ]

  it('comble les mois sans course et franchit l’année', () => {
    const s = parMois(lot, 'gagnant')
    expect(s.map((m) => [m.cle, m.n, m.taux])).toEqual([
      ['2025-11', 2, 0.5],
      ['2025-12', 0, 0],
      ['2026-01', 1, 1],
    ])
    expect(etendue(s)).toBe('nov. 2025 – janv. 2026')
    expect(parMois([], 'gagnant')).toEqual([])
  })

  it('arrondit le sommet au pas qui convient', () => {
    expect(echelle(0.44)).toEqual({ haut: 0.5, graduations: [0.5, 0.4, 0.3, 0.2, 0.1, 0] })
    expect(echelle(0.22).haut).toBeCloseTo(0.25)
    expect(echelle(0.8).haut).toBe(1)
    expect(echelle(0).haut).toBeCloseTo(0.1)
  })
})

describe('découpages', () => {
  const lot = [
    course({ hippodrome: 'PAU', type: 'Handicap', gagne: true }),
    course({ hippodrome: 'PAU', type: 'Handicap' }),
    course({ hippodrome: 'DAX', type: 'Conditions' }),
    course({ hippodrome: 'DAX', courue: false }),
  ]

  it('garde l’ordre demandé et omet les valeurs sans course jugée', () => {
    expect(decoupage(lot, 'gagnant', (c) => c.type, ['Réclamer', 'Handicap', 'Conditions'])).toEqual([
      { libelle: 'Handicap', n: 2, taux: 0.5 },
      { libelle: 'Conditions', n: 1, taux: 0 },
    ])
  })

  it('classe les hippodromes par courses jugées, puis dernières courses d’abord', () => {
    expect(pistesLesPlusCourues(lot)).toEqual(['PAU', 'DAX'])
    const d = dernieres([course({ date: '2026-09-01' }), course({ date: '2026-09-03' }), course({ date: '2026-09-02', courue: false })])
    expect(d.map((c) => c.date)).toEqual(['2026-09-03', '2026-09-01'])
  })
})
