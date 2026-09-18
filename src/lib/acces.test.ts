import { describe, expect, it } from 'vitest'
import { courseOfferte, lireAcces, verrouillerLignes } from '@/lib/acces'
import type { Course, LignePrediction } from '@/types'

const ligne = (o: Partial<LignePrediction>): LignePrediction =>
  ({
    reunion_date: '2026-09-19',
    hippodrome: 'CHANTILLY',
    course_num: 1,
    horse_num: 1,
    pred_rank: 1,
    p_win: 0.3,
    p_place: 0.6,
    rang_effectif: 1,
    actual_place: null,
    heure_depart: '13:50:00',
    ...o,
  }) as LignePrediction

describe('lecture de l’accès', () => {
  it('prend ce qui est valide, remplace le reste', () => {
    expect(lireAcces({ complet: true, formule: 'mois', statut: 'actif', acces_jusqua: '2026-10-18T10:00:00Z', client_stripe: true })).toEqual({
      complet: true,
      formule: 'mois',
      statut: 'actif',
      accesJusqua: '2026-10-18T10:00:00Z',
      clientStripe: true,
    })
    expect(lireAcces({ complet: 'oui', formule: 'platine', statut: 'vip' })).toMatchObject({ complet: false, formule: 'gratuit', statut: 'aucun' })
    expect(lireAcces(null).complet).toBe(false)
  })
})

describe('règle de la base, reproduite pour la démo', () => {
  const lignes = [
    ligne({ course_num: 1, heure_depart: '15:00:00' }),
    ligne({ course_num: 2, heure_depart: '13:10:00' }), // la première du jour : offerte
    ligne({ hippodrome: 'AUTEUIL', course_num: 1, heure_depart: '16:00:00' }),
    ligne({ reunion_date: '2026-09-18', course_num: 3, actual_place: null }), // jour passé
    ligne({ reunion_date: '2026-09-19', hippodrome: 'DEAUVILLE', course_num: 4, actual_place: 2 }), // jugée
  ]
  const r = verrouillerLignes(lignes, '2026-09-19')

  it('ouvre la première course du jour, les jours passés et les courses jugées', () => {
    expect(r.map((l) => l.verrouille)).toEqual([true, false, true, false, false])
  })

  it('efface rang et probabilités des courses verrouillées, garde le reste', () => {
    expect(r[0]).toMatchObject({ p_win: null, p_place: null, pred_rank: null, rang_effectif: null, horse_num: 1 })
    expect(r[1]).toMatchObject({ p_win: 0.3, pred_rank: 1 })
  })
})

describe('course offerte', () => {
  it('la première au départ', () => {
    const c = (numero: number, heureDepart: string | null) => ({ numero, hippodrome: 'X', heureDepart }) as Course
    expect(courseOfferte([c(1, '15:00'), c(2, '13:10'), c(3, null)])?.numero).toBe(2)
    expect(courseOfferte([])).toBeNull()
  })
})
