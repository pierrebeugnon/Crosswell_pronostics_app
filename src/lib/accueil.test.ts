import { describe, expect, it } from 'vitest'
import {
  minutesAvantDepart,
  opportunites,
  prochaineCourse,
  resumeJour,
  statutAccueil,
  texteDepart,
} from '@/lib/accueil'
import type { Course, Partant, Reunion } from '@/types'

const JOUR = '2026-09-18'
const DEMAIN = '2026-09-19'
const a14h = { jour: JOUR, minutes: 14 * 60 }

function course(o: Partial<Course>): Course {
  return {
    cle: `${o.date ?? JOUR}|${o.hippodrome ?? 'X'}|${o.numero ?? 1}`,
    date: JOUR,
    hippodrome: 'X',
    numero: 1,
    heureDepart: null,
    courue: false,
    liste: [],
    ...o,
  } as Course
}

function reunion(hippodrome: string, courses: Course[], date = JOUR): Reunion {
  return { cle: `${date}|${hippodrome}`, date, hippodrome, courses } as Reunion
}

const value = (numero: number, ecart: number): Partant =>
  ({ numero, nom: `C${numero}`, value: true, nonPartant: false, ecartMarche: ecart }) as Partant

describe('prochaineCourse', () => {
  const c1 = course({ hippodrome: 'COMPIEGNE', numero: 1, heureDepart: '13:50', courue: true })
  const c2 = course({ hippodrome: 'COMPIEGNE', numero: 2, heureDepart: '15:15' })
  const d1 = course({ date: DEMAIN, numero: 1, heureDepart: '13:35' })
  const reunions = [reunion('COMPIEGNE', [c1, c2]), reunion('X', [d1], DEMAIN)]

  it('la prochaine à partir aujourd’hui', () => {
    expect(prochaineCourse(reunions, a14h, DEMAIN)).toEqual({ course: c2, demain: false, terminee: false })
  })

  it('plus rien aujourd’hui : la première de demain ; rien du tout : null', () => {
    expect(prochaineCourse(reunions, { jour: JOUR, minutes: 20 * 60 }, DEMAIN)).toEqual({ course: d1, demain: true, terminee: false })
    expect(prochaineCourse([], a14h, DEMAIN)).toBeNull()
  })

  it('le soir, demain pas encore publié : la dernière course du jour, terminée', () => {
    const soir = { jour: JOUR, minutes: 20 * 60 }
    expect(prochaineCourse([reunion('COMPIEGNE', [c1, c2])], soir, DEMAIN)).toEqual({ course: c2, demain: false, terminee: true })
  })
})

describe('départ', () => {
  it('compte les minutes le jour même seulement', () => {
    expect(minutesAvantDepart(course({ heureDepart: '15:15' }), a14h)).toBe(75)
    expect(minutesAvantDepart(course({ heureDepart: null }), a14h)).toBeNull()
    expect(minutesAvantDepart(course({ date: DEMAIN, heureDepart: '15:15' }), a14h)).toBeNull()
  })

  it('écrit le délai à la française', () => {
    expect(texteDepart(42)).toBe('dans 42 min')
    expect(texteDepart(60)).toBe('dans 1 h')
    expect(texteDepart(75)).toBe('dans 1 h 15')
    expect(texteDepart(125)).toBe('dans 2 h 05')
    expect(texteDepart(0)).toBe('imminent')
  })
})

describe('resumeJour', () => {
  it('compte courses et réunions, nomme les hippodromes', () => {
    const rs = [reunion('COMPIEGNE', [course({}), course({ numero: 2 })]), reunion('CHANTILLY', [course({ numero: 3 })])]
    expect(resumeJour(rs, JOUR)).toBe('3 courses · 2 réunions · Compiegne, Chantilly')
    expect(resumeJour([reunion('PAU', [course({})])], JOUR)).toBe('1 course · 1 réunion · Pau')
    expect(resumeJour(rs, DEMAIN)).toBe('')
  })
})

describe('statutAccueil', () => {
  it('distingue la prochaine des autres courses à venir', () => {
    const p = course({ numero: 2, heureDepart: '15:15' })
    const autre = course({ numero: 3, heureDepart: '16:00' })
    expect(statutAccueil(p, a14h, p)).toBe('prochaine')
    expect(statutAccueil(autre, a14h, p)).toBe('aVenir')
    expect(statutAccueil(course({ courue: true }), a14h, p)).toBe('terminee')
  })
})

describe('opportunites', () => {
  const courue = course({ numero: 1, heureDepart: '13:00', courue: true, liste: [value(4, 0.2)] })
  const aVenir = course({ numero: 2, heureDepart: '15:00', liste: [value(7, 0.12), value(9, 0.3)] })
  const demain = course({ date: DEMAIN, numero: 1, heureDepart: '13:00', liste: [value(2, 0.15)] })

  it('d’abord les courses à venir, aujourd’hui et demain, du plus grand écart au plus petit', () => {
    const o = opportunites([reunion('X', [courue, aVenir]), reunion('X', [demain], DEMAIN)], a14h, DEMAIN)
    expect(o.courues).toBe(false)
    expect(o.liste.map((x) => x.partant.numero)).toEqual([9, 2, 7])
  })

  it('sinon celles des courses déjà courues aujourd’hui, en le disant', () => {
    const o = opportunites([reunion('X', [courue])], a14h, DEMAIN)
    expect(o).toMatchObject({ courues: true })
    expect(o.liste.map((x) => x.partant.numero)).toEqual([4])
  })
})
