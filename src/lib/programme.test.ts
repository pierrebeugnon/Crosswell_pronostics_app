import { describe, expect, it } from 'vitest'
import {
  arriveePredite,
  arriveeRelevee,
  confianceCourse,
  correspondance,
  courseParDefaut,
  coursesDuJour,
  retrouvesDansLesCinq,
  verdictCourse,
} from '@/lib/programme'
import type { Course, Partant, Reunion } from '@/types'

const JOUR = '2026-09-18'

function partant(numero: number, rang: number | null, arrivee: number | null = null, nonPartant = false): Partant {
  return { numero, nom: `Cheval ${numero}`, rang, nonPartant, arrivee, pWin: 0.1 } as Partant
}

function course(o: Partial<Course>): Course {
  return { date: JOUR, hippodrome: 'X', numero: 1, heureDepart: null, courue: false, liste: [], favori: null, ...o } as Course
}

describe('confianceCourse', () => {
  const avec = (p: number | null) => course({ favori: p == null ? null : ({ pWin: p } as Partant) })

  it('suit les seuils 28 % et 18 %, bornes incluses', () => {
    expect(confianceCourse(avec(0.3))?.libelle).toBe('Élevée')
    expect(confianceCourse(avec(0.28))?.libelle).toBe('Élevée')
    expect(confianceCourse(avec(0.279))?.libelle).toBe('Moyenne')
    expect(confianceCourse(avec(0.18))?.libelle).toBe('Moyenne')
    expect(confianceCourse(avec(0.1799))?.libelle).toBe('Faible')
  })

  it('rien sans sélection', () => {
    expect(confianceCourse(avec(null))).toBeNull()
  })
})

describe('verdictCourse', () => {
  it('attend l’arrivée, puis dit gagnant, placé, manqué ou sans sélection', () => {
    expect(verdictCourse(course({ courue: false }))).toBeNull()
    const f = partant(1, 1)
    expect(verdictCourse(course({ courue: true, favori: f, gagne: true, place: true }))).toBe('gagnant')
    expect(verdictCourse(course({ courue: true, favori: f, gagne: false, place: true }))).toBe('place')
    expect(verdictCourse(course({ courue: true, favori: f, gagne: false, place: false }))).toBe('manque')
    expect(verdictCourse(course({ courue: true, favori: null }))).toBe('sansSelection')
  })
})

describe('coursesDuJour et courseParDefaut', () => {
  const r = (hippodrome: string, courses: Course[]): Reunion => ({ date: JOUR, hippodrome, courses }) as Reunion
  const a1 = course({ hippodrome: 'A', numero: 1, heureDepart: '13:50', courue: true })
  const a2 = course({ hippodrome: 'A', numero: 2, heureDepart: '15:15' })
  const b1 = course({ hippodrome: 'B', numero: 1, heureDepart: '14:25' })
  const sansHeure = course({ hippodrome: 'B', numero: 2, heureDepart: null })
  const reunions = [r('A', [a1, a2]), r('B', [b1, sansHeure]), { ...r('C', [course({})]), date: '2026-09-19' }]

  it('trie toutes les réunions du jour par heure, les courses sans heure en dernier', () => {
    expect(coursesDuJour(reunions, JOUR)).toEqual([a1, b1, a2, sansHeure])
  })

  it('ouvre la prochaine course à partir', () => {
    const liste = coursesDuJour(reunions, JOUR)
    expect(courseParDefaut(liste, { jour: JOUR, minutes: 14 * 60 })).toBe(b1)
    expect(courseParDefaut(liste, { jour: JOUR, minutes: 14 * 60 + 30 })).toBe(a2)
  })

  it('tout est parti : la dernière de la journée ; rien : null', () => {
    const liste = [a1, course({ numero: 3, heureDepart: '16:00' })]
    expect(courseParDefaut(liste, { jour: JOUR, minutes: 23 * 60 })).toBe(liste[1])
    expect(courseParDefaut([], { jour: JOUR, minutes: 0 })).toBeNull()
  })
})

describe('arrivée prédite face à l’arrivée relevée', () => {
  // Notre classement : 7, 3, 11, 5, 9, 2 ; le 8 non partant. Arrivée : 3, 7, 4, 11, 1.
  const liste = [
    partant(7, 1, 2),
    partant(3, 2, 1),
    partant(11, 3, 4),
    partant(5, 4, null),
    partant(9, 5, 6),
    partant(2, 6, 7),
    partant(4, 7, 3),
    partant(1, 8, 5),
    partant(8, null, null, true),
  ]
  const c = course({ courue: true, liste })

  it('prend nos cinq premiers au départ et les cinq premiers classés', () => {
    expect(arriveePredite(c).map((p) => p.numero)).toEqual([7, 3, 11, 5, 9])
    expect(arriveeRelevee(c).map((p) => p.numero)).toEqual([3, 7, 4, 11, 1])
  })

  it('classe chaque case : place exacte, présent ailleurs, absent', () => {
    const arr = arriveeRelevee(c)
    expect(correspondance(7, 0, arr)).toBe('presente')
    expect(correspondance(11, 2, arr)).toBe('presente')
    expect(correspondance(5, 3, arr)).toBe('absente')
    expect(correspondance(3, 0, arr)).toBe('exacte')
  })

  it('compte nos chevaux retrouvés dans les cinq premiers', () => {
    expect(retrouvesDansLesCinq(c)).toBe(3)
  })
})
