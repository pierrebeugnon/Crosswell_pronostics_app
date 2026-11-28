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

describe('règle de la base (db/024), reproduite pour la démo', () => {
  const lignes = [
    ligne({ course_num: 1, heure_depart: '15:00:00', p_win: 0.3 }),
    ligne({ course_num: 1, horse_num: 2, pred_rank: 2, heure_depart: '15:00:00', p_win: 0.2 }),
    ligne({ course_num: 2, heure_depart: '13:10:00', p_win: 0.55 }), // la plus forte chance : offerte
    ligne({ course_num: 2, horse_num: 2, pred_rank: 2, heure_depart: '13:10:00', p_win: 0.15 }),
    ligne({ hippodrome: 'AUTEUIL', course_num: 1, heure_depart: '16:00:00', p_win: 0.4 }),
    ligne({ reunion_date: '2026-09-18', course_num: 3, actual_place: null, p_win: 0.9 }), // jour passé
    ligne({ reunion_date: '2026-09-19', hippodrome: 'DEAUVILLE', course_num: 4, actual_place: 2, p_win: 0.2 }), // jugée
  ]
  const r = verrouillerLignes(lignes, '2026-09-19')

  it('ouvre la course où notre 1er a la plus forte chance, les jours passés et les courses jugées', () => {
    expect(r.map((l) => l.verrouille)).toEqual([true, true, false, false, true, false, false])
    expect(r.map((l) => l.offerte)).toEqual([false, false, true, true, false, false, false])
  })

  it('efface rang et probabilités des courses verrouillées, garde le reste', () => {
    expect(r[0]).toMatchObject({ p_win: null, p_place: null, pred_rank: null, rang_effectif: null, horse_num: 1 })
    expect(r[2]).toMatchObject({ p_win: 0.55, pred_rank: 1 })
  })

  it('à chance égale, la première au départ, et le choix reste déterminé', () => {
    const egales = verrouillerLignes(
      [
        ligne({ course_num: 1, heure_depart: '16:00:00', p_win: 0.5 }),
        ligne({ course_num: 2, heure_depart: '13:10:00', p_win: 0.5 }),
        ligne({ course_num: 3, heure_depart: null, p_win: 0.5 }),
      ],
      '2026-09-19',
    )
    expect(egales.map((l) => l.offerte)).toEqual([false, true, false])
  })

  it('garde la course offerte quand notre 1er est retiré, comme la base', () => {
    const retire = verrouillerLignes(
      [
        ligne({ course_num: 1, p_win: 0.6, non_partant: true }),
        ligne({ course_num: 1, horse_num: 2, pred_rank: 2, p_win: 0.2 }),
        ligne({ course_num: 2, p_win: 0.5 }),
      ],
      '2026-09-19',
    )
    expect(retire.map((l) => l.offerte)).toEqual([true, true, false])
  })
})

describe('course offerte — désignée par la base', () => {
  const c = (numero: number, o: Partial<Course> = {}) =>
    ({ numero, hippodrome: 'X', heureDepart: '15:00', offerte: false, ...o }) as Course

  it('nomme la course que la base a marquée offerte', () => {
    expect(courseOfferte([c(1), c(2, { offerte: true }), c(3)])?.numero).toBe(2)
  })

  it('ne nomme rien sans marque (jour vide, ou base sans db/024)', () => {
    expect(courseOfferte([])).toBeNull()
    expect(courseOfferte([c(1), c(2)])).toBeNull()
  })
})
