import { describe, expect, it } from 'vitest'
import {
  MAX_REUNIONS_HERO,
  apercuReunions,
  avanceeReunion,
  garderSelonJour,
  heureLisible,
  jourDemande,
  jourParDefaut,
  lienReunionsDuJour,
  resumeReunion,
  reunionsDuJour,
  texteAvancee,
} from '@/lib/avancee'
import type { Course, Reunion } from '@/types'

/*
 * Des réunions écrites à la main : seuls comptent la date, l'heure de départ et
 * l'arrivée relevée (`courue`). Le reste d'une course n'entre pas dans le hero.
 */

const NB = ' '
const JOUR = '2026-09-17'
const DEMAIN = '2026-09-18'

function course(numero: number, heureDepart: string | null, courue = false, date = JOUR): Course {
  return { date, numero, heureDepart, courue, hippodrome: 'X' } as Course
}

function reunion(hippodrome: string, courses: Course[], date = JOUR): Reunion {
  const cs = courses.map((c) => ({ ...c, date, hippodrome }))
  return {
    cle: `${date}|${hippodrome}`,
    date,
    hippodrome,
    courses: cs,
    courues: cs.filter((c) => c.courue).length,
    gagnees: 0,
  }
}

const a = (minutes: number) => ({ jour: JOUR, minutes })

describe('heureLisible', () => {
  it('écrit les heures à la française, espaces insécables compris', () => {
    expect(heureLisible('13:00')).toBe(`13${NB}h`)
    expect(heureLisible('15:55')).toBe(`15${NB}h${NB}55`)
    expect(heureLisible('09:05')).toBe(`9${NB}h${NB}05`)
  })
})

describe('resumeReunion', () => {
  it('donne le volume et la plage horaire', () => {
    const r = reunion('CHANTILLY', [course(1, '13:00'), course(2, '15:55'), course(3, '14:10')])
    expect(resumeReunion(r)).toBe(`3${NB}courses · 13${NB}h${NB}– 15${NB}h${NB}55`)
  })
  it('une seule heure quand la réunion n’a qu’une course', () => {
    expect(resumeReunion(reunion('DAX', [course(1, '13:00')]))).toBe(`1${NB}course · 13${NB}h`)
  })
  it('se tait sur l’horaire quand il est inconnu', () => {
    expect(resumeReunion(reunion('DAX', [course(1, null), course(2, null)]))).toBe(`2${NB}courses`)
  })
})

describe('avanceeReunion et texteAvancee — aujourd’hui', () => {
  const r = reunion('CHANTILLY', [
    course(1, '13:00', true),
    course(2, '13:30', true),
    course(3, '14:00', true),
    course(4, '14:30'),
    course(5, '15:00'),
    course(6, '15:55'),
  ])

  it('mesure les ARRIVÉES relevées, pas les départs', () => {
    // 14 h 40 : quatre départs donnés, trois arrivées relevées.
    const av = avanceeReunion(r, a(14 * 60 + 40))
    expect(av).toMatchObject({ total: 6, courues: 3, departs: 4, statut: 'enCours' })
    expect(texteAvancee(av)).toBe(`3${NB}arrivées sur 6`)
  })

  it('accorde au singulier', () => {
    const r1 = reunion('DAX', [course(1, '13:00', true), course(2, '14:00')])
    expect(texteAvancee(avanceeReunion(r1, a(13 * 60 + 30)))).toBe(`1${NB}arrivée sur 2`)
  })

  it('dit « À venir » avant le premier départ, sans répéter l’heure du résumé', () => {
    const r0 = reunion('DAX', [course(1, '13:00'), course(2, '14:00')])
    const av = avanceeReunion(r0, a(10 * 60))
    expect(av.statut).toBe('aVenir')
    expect(texteAvancee(av)).toBe('À venir')
    expect(texteAvancee(av)).not.toMatch(/[0-9]/)
  })

  it('dit « première arrivée à venir » quand un départ est donné sans arrivée relevée', () => {
    const r0 = reunion('DAX', [course(1, '13:00'), course(2, '14:00')])
    const av = avanceeReunion(r0, a(13 * 60 + 5))
    expect(av).toMatchObject({ courues: 0, departs: 1, statut: 'enCours' })
    expect(texteAvancee(av)).toBe('Première arrivée à venir')
  })

  it('« Terminée » quand toutes les arrivées sont relevées', () => {
    const rt = reunion('DAX', [course(1, '13:00', true), course(2, '14:00', true)])
    const av = avanceeReunion(rt, a(22 * 60))
    expect(av.statut).toBe('terminee')
    expect(texteAvancee(av)).toBe('Terminée')
  })

  it('reste « en cours » tard le soir si une arrivée manque encore', () => {
    const rt = reunion('DAX', [course(1, '13:00', true), course(2, '14:00')])
    const av = avanceeReunion(rt, a(22 * 60))
    expect(av.statut).toBe('enCours')
    expect(texteAvancee(av)).toBe(`1${NB}arrivée sur 2`)
  })

  it('sans horaire connu, n’invente pas d’heure', () => {
    const r0 = reunion('DAX', [course(1, null)])
    expect(texteAvancee(avanceeReunion(r0, a(10 * 60)))).toBe('Horaires non communiqués')
  })
})

describe('demain', () => {
  it('n’a aucune avancée : seul le résumé (volume et plage) est affiché', () => {
    const r = reunion('DAX', [course(2, '15:00'), course(1, '13:30')], DEMAIN)
    const av = avanceeReunion(r, a(23 * 60))
    expect(av).toMatchObject({ courues: 0, departs: 0, statut: 'aVenir' })
    expect(resumeReunion(r)).toBe(`2${NB}courses · 13${NB}h${NB}30${NB}– 15${NB}h`)
  })
})

describe('apercuReunions — le lien « Voir les N réunions »', () => {
  const noms = ['DAX', 'VICHY', 'DIEPPE', 'VITTEL', 'DEAUVILLE', 'CHANTILLY']
  const jour = (n: number, date = DEMAIN) =>
    noms.slice(0, n).map((h, i) => reunion(h, [course(1, `1${2 + i}:00`)], date))

  it('montre tout, sans lien, jusqu’au seuil', () => {
    expect(MAX_REUNIONS_HERO).toBe(4)
    const ap = apercuReunions(jour(4), DEMAIN)
    expect(ap.visibles).toHaveLength(4)
    expect(ap.total).toBe(4)
    expect(ap.lienTout).toBeNull()
  })

  it('au-delà, tronque aux 4 plus matinales et donne le lien filtré sur le jour', () => {
    const ap = apercuReunions([...jour(5), ...jour(2, JOUR)], DEMAIN)
    expect(ap.total).toBe(5)
    expect(ap.visibles.map((r) => r.hippodrome)).toEqual(['DAX', 'VICHY', 'DIEPPE', 'VITTEL'])
    expect(ap.lienTout).toBe('/reunions?jour=2026-09-18')
  })

  it('le lien se relit en le même jour sur la page Réunions', () => {
    const lien = lienReunionsDuJour(DEMAIN)
    const brut = new URL(lien, 'https://exemple.test').searchParams.get('jour')
    expect(jourDemande(brut)).toBe(DEMAIN)
  })
})

describe('jourDemande et garderSelonJour — le filtre ?jour de Réunions', () => {
  it('refuse les valeurs mal formées ou impossibles', () => {
    expect(jourDemande(null)).toBeNull()
    expect(jourDemande('')).toBeNull()
    expect(jourDemande('18/09/2026')).toBeNull()
    expect(jourDemande('2026-02-30')).toBeNull()
    expect(jourDemande('2026-13-01')).toBeNull()
  })

  it('le jour demandé l’emporte sur la période', () => {
    const dem = reunion('DAX', [course(1, '13:00')], DEMAIN)
    const vieille = reunion('DAX', [course(1, '13:00')], '2026-09-01')
    expect(garderSelonJour(dem, DEMAIN, '2026-09-11')).toBe(true)
    expect(garderSelonJour(vieille, DEMAIN, '2026-08-01')).toBe(false)
    expect(garderSelonJour(vieille, null, '2026-08-01')).toBe(true)
    expect(garderSelonJour(vieille, null, '2026-09-11')).toBe(false)
  })
})

describe('reunionsDuJour', () => {
  const rs = [
    reunion('VICHY', [course(1, '18:00')]),
    reunion('DAX', [course(1, '13:30')]),
    reunion('AUTEUIL', [course(1, null)]),
    reunion('CHANTILLY', [course(1, '13:30')]),
    reunion('LYON', [course(1, '11:00')], DEMAIN),
  ]

  it('garde le jour demandé et trie par premier départ, sans heure en dernier', () => {
    expect(reunionsDuJour(rs, JOUR).map((r) => r.hippodrome)).toEqual([
      'CHANTILLY',
      'DAX',
      'VICHY',
      'AUTEUIL',
    ])
    expect(reunionsDuJour(rs, DEMAIN).map((r) => r.hippodrome)).toEqual(['LYON'])
  })

  it('une nocturne après minuit se range après 23 h', () => {
    const n = [reunion('A', [course(1, '00:40')]), reunion('B', [course(1, '21:00')])]
    expect(reunionsDuJour(n, JOUR).map((r) => r.hippodrome)).toEqual(['B', 'A'])
  })
})

describe('jourParDefaut', () => {
  const auj = reunion('DAX', [course(1, '13:00')])
  const dem = reunion('LYON', [course(1, '13:00')], DEMAIN)
  it('ouvre sur aujourd’hui dès qu’il a une réunion, à toute heure', () => {
    expect(jourParDefaut([auj, dem], JOUR, DEMAIN)).toBe(JOUR)
  })
  it('passe à demain quand aujourd’hui est vide', () => {
    expect(jourParDefaut([dem], JOUR, DEMAIN)).toBe(DEMAIN)
  })
  it('reste sur aujourd’hui quand les deux sont vides', () => {
    expect(jourParDefaut([], JOUR, DEMAIN)).toBe(JOUR)
  })
})
