import { describe, expect, it } from 'vitest'
import {
  OUVERTURE_MARCHE,
  cotesDeCourse,
  flecheCote,
  heureMinute,
  historiqueSimule,
  tendanceCote,
  tracer,
} from '@/lib/cotes'
import type { Course, Partant } from '@/types'

const course = (o: Partial<Course> = {}): Course =>
  ({ cle: '2026-09-18|CHANTILLY|3', date: '2026-09-18', heureDepart: '15:10', courue: false, ...o }) as Course
const partant = (o: Partial<Partant> = {}): Partant => ({ numero: 4, cote: 6.5, nonPartant: false, ...o }) as Partant
const a = (jour: string, hhmm: string) => ({ jour, minutes: Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3)) })

describe('relevés réels', () => {
  const releves = [
    { numero: 4, minute: 12 * 60 + 23, cote: 4.2 },
    { numero: 4, minute: 11 * 60 + 53, cote: 5.2 },
    { numero: 7, minute: 11 * 60 + 53, cote: 9 },
    { numero: 9, minute: 11 * 60 + 53, cote: 1 },
  ]

  it('trie les relevés, garde le dernier et calcule la variation', () => {
    const { dernier, historiques } = cotesDeCourse(releves, course())
    expect(dernier.get(4)).toEqual({ minute: 12 * 60 + 23, cote: 4.2 })
    const h = historiques.get(4)!
    expect(h.points.map((p) => p.cote)).toEqual([5.2, 4.2])
    expect(h.matin).toBe(5.2)
    expect(h.derniere).toBe(4.2)
    expect(h.variation).toBeCloseTo((4.2 - 5.2) / 5.2)
    expect(h.fin).toBe('releve')
    expect(h.simulee).toBe(false)
  })

  it('donne la cote du moment sans courbe quand il n’y a qu’un relevé', () => {
    const { dernier, historiques } = cotesDeCourse(releves, course())
    expect(dernier.get(7)).toEqual({ minute: 11 * 60 + 53, cote: 9 })
    expect(historiques.has(7)).toBe(false)
  })

  it('écarte une cote à 1 ou moins, et ne rend rien sans relevé', () => {
    const { dernier } = cotesDeCourse(releves, course())
    expect(dernier.has(9)).toBe(false)
    expect(cotesDeCourse([], course()).dernier.size).toBe(0)
  })
})

describe('historique simulé', () => {
  it('finit exactement sur la cote relevée, part de 9 h, treize points', () => {
    const h = historiqueSimule(course({ courue: true }), partant(), a('2026-09-18', '20:00'))!
    expect(h.points).toHaveLength(13)
    expect(h.points[0].minute).toBe(OUVERTURE_MARCHE)
    expect(h.points[12]).toEqual({ minute: 15 * 60 + 10, cote: 6.5 })
    expect(h.fin).toBe('depart')
    expect(h.derniere).toBe(6.5)
    expect(h.matin).toBe(h.points[0].cote)
    expect(h.variation).toBeCloseTo((6.5 - h.matin) / h.matin)
    expect(h.simulee).toBe(true)
  })

  it('est stable pour un même partant, différent d’un partant à l’autre', () => {
    const m = a('2026-09-18', '20:00')
    const un = historiqueSimule(course(), partant(), m)!.points.map((p) => p.cote)
    expect(historiqueSimule(course(), partant(), m)!.points.map((p) => p.cote)).toEqual(un)
    expect(historiqueSimule(course(), partant({ numero: 5 }), m)!.points.map((p) => p.cote)).not.toEqual(un)
  })

  it('le jour même avant le départ, s’arrête à maintenant', () => {
    const h = historiqueSimule(course(), partant(), a('2026-09-18', '12:30'))!
    expect(h.fin).toBe('maintenant')
    expect(h.points[12].minute).toBe(12 * 60 + 30)
  })

  it('rien pour un non-partant, sans cote, un jour à venir ou trop tôt le matin', () => {
    const m = a('2026-09-18', '12:00')
    expect(historiqueSimule(course(), partant({ nonPartant: true }), m)).toBeNull()
    expect(historiqueSimule(course(), partant({ cote: null }), m)).toBeNull()
    expect(historiqueSimule(course({ date: '2026-09-19' }), partant(), m)).toBeNull()
    expect(historiqueSimule(course(), partant(), a('2026-09-18', '09:10'))).toBeNull()
  })

  it('une course d’un jour passé sans heure s’arrête au départ, heure inconnue', () => {
    const h = historiqueSimule(course({ date: '2026-09-17', heureDepart: null }), partant(), a('2026-09-18', '10:00'))!
    expect(h.fin).toBe('depart')
    expect(h.heureConnue).toBe(false)
  })

  it('jamais de cote sous 1,1', () => {
    const m = a('2026-09-18', '20:00')
    for (let n = 1; n <= 30; n++) {
      const h = historiqueSimule(course(), partant({ numero: n, cote: 1.3 }), m)!
      expect(Math.min(...h.points.map((p) => p.cote))).toBeGreaterThanOrEqual(1.1)
    }
  })
})

describe('lecture', () => {
  it('tendance et flèche, avec leurs seuils', () => {
    expect(tendanceCote(-0.04)).toEqual({ sens: 'stable', libelle: 'Stable' })
    expect(tendanceCote(-0.27)).toEqual({ sens: 'baisse', libelle: 'En baisse de 27 %' })
    expect(tendanceCote(0.3)).toEqual({ sens: 'hausse', libelle: 'En hausse de 30 %' })
    expect(flecheCote(-0.07)).toBeNull()
    expect(flecheCote(-0.08)).toBe('baisse')
    expect(flecheCote(0.12)).toBe('hausse')
  })

  it('heures et tracé', () => {
    expect(heureMinute(540)).toBe('09:00')
    expect(heureMinute(1450)).toBe('00:10')
    const h = historiqueSimule(course(), partant(), a('2026-09-18', '20:00'))!
    const pts = tracer(h, 520, 140)
    expect(pts[0].x).toBe(0)
    expect(pts[12].x).toBe(520)
    for (const p of pts) {
      expect(p.y).toBeGreaterThan(0)
      expect(p.y).toBeLessThan(140)
    }
  })
})
