import { afterEach, describe, expect, it, vi } from 'vitest'
import { decalerJour, jourISO } from '@/lib/format'
import { bornesPeriode, dansPeriode, lirePeriode, PERIODE_FENETRE, type Periode } from '@/lib/periodes'

/*
 * Les périodes sont la promesse la plus visible de l'application : « 30 jours »
 * doit valoir la même chose sur tous les écrans, pour tous les clients, à toute
 * heure. Les dates de référence sont choisies pour casser ce qui casse d'habitude :
 * un 1er du mois, un 1er janvier, un mois de février, un passage à l'heure d'été.
 */

afterEach(() => {
  vi.useRealTimers()
})

describe('bornesPeriode — un jour ordinaire (lundi 14 septembre 2026)', () => {
  const J = '2026-09-14'
  const cas: [Periode, string | null, string][] = [
    // « N jours » = [J−(N−1) ; J], aujourd'hui compris.
    ['7j', '2026-09-08', J],
    ['30j', '2026-08-16', J],
    ['3m', '2026-06-17', J],
    ['hier', '2026-09-13', '2026-09-13'],
    ['mois', '2026-09-01', J],
    ['moisPrecedent', '2026-08-01', '2026-08-31'],
    ['tout', null, J],
  ]
  it.each(cas)('%s → [%s ; %s]', (periode, depuis, jusqua) => {
    expect(bornesPeriode(periode, J)).toEqual({ depuis, jusqua })
  })

  it('une période glissante de N jours compte exactement N jours', () => {
    for (const [p, n] of [['7j', 7], ['30j', 30], ['3m', 90]] as const) {
      const { depuis, jusqua } = bornesPeriode(p, J)
      const jours = (Date.parse(jusqua) - Date.parse(depuis!)) / 86_400_000 + 1
      expect(jours, p).toBe(n)
    }
  })

  it('aucune période ne déborde sur demain', () => {
    for (const p of ['7j', '30j', 'mois', '3m', 'tout'] as const) {
      expect(dansPeriode('2026-09-15', p, J), p).toBe(false)
      expect(dansPeriode(J, p, J), p).toBe(true)
    }
  })

  it('les bornes sont incluses, la veille de la borne basse est exclue', () => {
    expect(dansPeriode('2026-08-16', '30j', J)).toBe(true)
    expect(dansPeriode('2026-08-15', '30j', J)).toBe(false)
    expect(dansPeriode('2026-08-31', 'moisPrecedent', J)).toBe(true)
    expect(dansPeriode('2026-09-01', 'moisPrecedent', J)).toBe(false)
  })

  it('la fenêtre partagée est la période « 30 jours »', () => {
    expect(PERIODE_FENETRE).toBe('30j')
  })
})

describe('bornesPeriode — le 1er mars (février non bissextile)', () => {
  const J = '2026-03-01'
  it('hier est le 28 février', () => {
    expect(bornesPeriode('hier', J)).toEqual({ depuis: '2026-02-28', jusqua: '2026-02-28' })
  })
  it('le mois en cours se réduit au jour même', () => {
    expect(bornesPeriode('mois', J)).toEqual({ depuis: '2026-03-01', jusqua: '2026-03-01' })
  })
  it('le mois dernier est février entier', () => {
    expect(bornesPeriode('moisPrecedent', J)).toEqual({ depuis: '2026-02-01', jusqua: '2026-02-28' })
  })
  it('7 jours remonte en février', () => {
    expect(bornesPeriode('7j', J)).toEqual({ depuis: '2026-02-23', jusqua: J })
  })
  it('une année bissextile garde le 29 février', () => {
    expect(bornesPeriode('hier', '2028-03-01')).toEqual({ depuis: '2028-02-29', jusqua: '2028-02-29' })
    expect(bornesPeriode('moisPrecedent', '2028-03-01')).toEqual({ depuis: '2028-02-01', jusqua: '2028-02-29' })
  })
})

describe('bornesPeriode — le 1er janvier (changement d’année)', () => {
  const J = '2026-01-01'
  it.each([
    ['hier', '2025-12-31', '2025-12-31'],
    ['mois', '2026-01-01', J],
    ['moisPrecedent', '2025-12-01', '2025-12-31'],
    ['30j', '2025-12-03', J],
    ['3m', '2025-10-04', J],
  ] as [Periode, string, string][])('%s → [%s ; %s]', (periode, depuis, jusqua) => {
    expect(bornesPeriode(periode, J)).toEqual({ depuis, jusqua })
  })
})

describe('bornesPeriode sans date explicite', () => {
  it('prend « aujourd’hui » à Paris', () => {
    vi.setSystemTime(new Date('2026-09-13T22:30:00Z')) // 00 h 30 le 14 à Paris
    expect(bornesPeriode('hier')).toEqual({ depuis: '2026-09-13', jusqua: '2026-09-13' })
    expect(bornesPeriode('30j').jusqua).toBe('2026-09-14')
  })
})

describe('lirePeriode', () => {
  const permises = ['7j', '30j', 'tout'] as const
  it('garde une valeur permise', () => {
    expect(lirePeriode('7j', permises, '30j')).toBe('7j')
  })
  it('retombe sur le défaut pour une valeur absente, inconnue ou non permise', () => {
    expect(lirePeriode(null, permises, '30j')).toBe('30j')
    expect(lirePeriode('', permises, '30j')).toBe('30j')
    expect(lirePeriode('j7', permises, '30j')).toBe('30j') // libellé de l'outil interne
    expect(lirePeriode('mois', permises, '30j')).toBe('30j') // période réelle, mais non permise ici
  })
})

describe('jourISO — toujours un jour de Paris', () => {
  it('à 23 h 30 UTC en été (UTC+2), Paris est déjà au lendemain', () => {
    vi.setSystemTime(new Date('2026-09-13T23:30:00Z'))
    expect(jourISO()).toBe('2026-09-14')
    expect(jourISO(-1)).toBe('2026-09-13')
    expect(jourISO(1)).toBe('2026-09-15')
  })
  it('à 21 h 59 UTC en été, Paris est encore la veille au soir', () => {
    vi.setSystemTime(new Date('2026-09-13T21:59:00Z'))
    expect(jourISO()).toBe('2026-09-13')
  })
  it('en hiver (UTC+1), la bascule se fait à 23 h UTC', () => {
    vi.setSystemTime(new Date('2026-01-15T22:59:00Z'))
    expect(jourISO()).toBe('2026-01-15')
    vi.setSystemTime(new Date('2026-01-15T23:00:00Z'))
    expect(jourISO()).toBe('2026-01-16')
  })
  it('le soir du 31 décembre UTC, Paris est déjà en janvier', () => {
    vi.setSystemTime(new Date('2025-12-31T23:30:00Z'))
    expect(jourISO()).toBe('2026-01-01')
    expect(bornesPeriode('moisPrecedent')).toEqual({ depuis: '2025-12-01', jusqua: '2025-12-31' })
  })
})

describe('decalerJour', () => {
  it('traverse le passage à l’heure d’été sans sauter de jour (29 mars 2026)', () => {
    expect(decalerJour('2026-03-28', 1)).toBe('2026-03-29')
    expect(decalerJour('2026-03-28', 2)).toBe('2026-03-30')
    expect(decalerJour('2026-03-30', -2)).toBe('2026-03-28')
  })
  it('traverse le retour à l’heure d’hiver sans doubler de jour (25 octobre 2026)', () => {
    expect(decalerJour('2026-10-24', 1)).toBe('2026-10-25')
    expect(decalerJour('2026-10-24', 2)).toBe('2026-10-26')
    expect(decalerJour('2026-10-26', -2)).toBe('2026-10-24')
  })
  it('traverse mois et années, dans les deux sens', () => {
    expect(decalerJour('2026-02-28', 1)).toBe('2026-03-01')
    expect(decalerJour('2026-12-31', 1)).toBe('2027-01-01')
    expect(decalerJour('2026-01-01', -1)).toBe('2025-12-31')
    expect(decalerJour('2026-09-14', 0)).toBe('2026-09-14')
  })
  it('ne dépend pas du fuseau de la machine, même à l’instant du changement d’heure', () => {
    vi.setSystemTime(new Date('2026-03-29T01:30:00Z')) // 03 h 30 à Paris, heure d'été toute neuve
    expect(jourISO()).toBe('2026-03-29')
    expect(jourISO(-1)).toBe('2026-03-28')
  })
})
