import { describe, expect, it } from 'vitest'
import { construireCourses, construireReunions, typeCourse } from '@/lib/aggregate'
import type { Course, LignePrediction } from '@/types'

/*
 * Chaque cas est une course écrite à la main, au format exact de la vue
 * `client_predictions`. Les lignes sont minimales : seuls les champs qui
 * comptent pour le cas sont renseignés, le reste prend une valeur neutre.
 */

const DATE = '2026-09-10'
const HIPPO = 'DEAUVILLE'

function ligne(horse_num: number, champs: Partial<LignePrediction> = {}): LignePrediction {
  return {
    reunion_date: DATE,
    hippodrome: HIPPO,
    course_num: 1,
    course_nom: null,
    categorie: null,
    is_handicap: null,
    distance: 1600,
    field_size: null,
    horse_num,
    horse_name: null,
    id_fg: null,
    pred_rank: horse_num,
    p_win: null,
    p_place: null,
    actual_place: null,
    model_version: 'rating+forme.v1',
    cote: null,
    rapport_gagnant: null,
    rapport_place: null,
    non_partant: false,
    rang_effectif: horse_num,
    heure_depart: null,
    ...champs,
  }
}

/** Une seule course attendue : la renvoie, en échouant proprement sinon. */
function uneCourse(lignes: LignePrediction[]): Course {
  const courses = construireCourses(lignes)
  expect(courses).toHaveLength(1)
  return courses[0]
}

const numeros = (ps: { numero: number }[]) => ps.map((p) => p.numero)

describe('construireCourses — rang 1 publié déclaré non partant', () => {
  // Cas réel de l'outil interne (Toulouse C7, 2 septembre 2026) : notre n°1 est
  // retiré, notre n°2 gagne. La vue recalcule le rang parmi les partants.
  const c = uneCourse([
    ligne(1, { pred_rank: 1, non_partant: true, rang_effectif: null, field_size: 4 }),
    ligne(2, { pred_rank: 2, rang_effectif: 1, actual_place: 1, field_size: 4 }),
    ligne(3, { pred_rank: 3, rang_effectif: 2, actual_place: 2, field_size: 4 }),
    ligne(4, { pred_rank: 4, rang_effectif: 3, actual_place: 3, field_size: 4 }),
  ])

  it('le rang 1 effectif (n°2) devient notre favori, et il a gagné', () => {
    expect(c.favori?.numero).toBe(2)
    expect(c.favori?.rang).toBe(1)
    expect(c.favori?.rangInitial).toBe(2)
    expect(c.gagne).toBe(true)
    expect(c.courue).toBe(true)
  })

  it('le rang 1 publié est signalé comme retiré', () => {
    expect(c.favoriRetire?.numero).toBe(1)
    expect(c.favoriRetire?.nonPartant).toBe(true)
    expect(c.favoriRetire?.rang).toBeNull()
  })

  it('les partants sont comptés au départ, les déclarés gardent field_size', () => {
    expect(c.partants).toBe(3)
    expect(c.nonPartants).toBe(1)
    expect(c.declares).toBe(4)
  })

  it('le non-partant descend en bas de grille et sort du podium', () => {
    expect(numeros(c.liste)).toEqual([2, 3, 4, 1])
    expect(numeros(c.podium)).toEqual([2, 3, 4])
    expect(c.dansLeTrio).toBe(3)
  })
})

describe('construireCourses — base non migrée (sans non_partant ni rang_effectif)', () => {
  const sansMigration = (n: number, champs: Partial<LignePrediction> = {}) => {
    const l = ligne(n, champs)
    delete l.non_partant
    delete l.rang_effectif
    delete l.heure_depart
    return l
  }

  it('se comporte exactement sur pred_rank', () => {
    const c = uneCourse([
      sansMigration(3, { pred_rank: 2, actual_place: 1 }),
      sansMigration(5, { pred_rank: 1, actual_place: 2 }),
      sansMigration(7, { pred_rank: 3 }),
    ])
    expect(c.favori?.numero).toBe(5)
    expect(c.favori?.rang).toBe(1)
    expect(numeros(c.liste)).toEqual([5, 3, 7])
    expect(c.partants).toBe(3)
    expect(c.nonPartants).toBe(0)
    expect(c.favoriRetire).toBeNull()
    expect(c.gagne).toBe(false)
    expect(c.place).toBe(true)
    expect(c.heureDepart).toBeNull()
  })

  it('un rang 1 publié sans place compte en défaite (rien ne dit qu’il était retiré)', () => {
    const c = uneCourse([
      sansMigration(1, { pred_rank: 1 }),
      sansMigration(2, { pred_rank: 2, actual_place: 1 }),
    ])
    expect(c.favori?.numero).toBe(1)
    expect(c.courue).toBe(true)
    expect(c.gagne).toBe(false)
  })
})

describe('construireCourses — rang 1 sans place dans une course jugée', () => {
  // Arrivée relevée jusqu'au 5e seulement : notre rang 1 a fini au-delà.
  const c = uneCourse([
    ligne(1, { p_win: 0.3 }),
    ligne(2, { actual_place: 3 }),
    ligne(3, { actual_place: 1 }),
    ligne(4, { actual_place: 5 }),
    ligne(5, { actual_place: 2 }),
    ligne(6, { actual_place: 4 }),
    ligne(7),
  ])

  it('la course est jugée, et c’est une défaite, pas une donnée manquante', () => {
    expect(c.courue).toBe(true)
    expect(c.favori?.numero).toBe(1)
    expect(c.favori?.arrivee).toBeNull()
    expect(c.gagne).toBe(false)
    expect(c.place).toBe(false)
    expect(c.gagnant?.numero).toBe(3)
  })
})

describe('construireCourses — course pas encore jugée', () => {
  it('aucune place relevée : ni jugée, ni gagnée, ni placée', () => {
    const c = uneCourse([ligne(1, { heure_depart: '15:05:00' }), ligne(2), ligne(3)])
    expect(c.courue).toBe(false)
    expect(c.gagne).toBe(false)
    expect(c.place).toBe(false)
    expect(c.gagnant).toBeNull()
    expect(c.heureDepart).toBe('15:05')
  })
})

describe('construireCourses — le marché, sur les seuls partants', () => {
  const c = uneCourse([
    ligne(1, { cote: 3 }),
    ligne(2, { cote: 5 }),
    // Retiré, mais sa cote relevée avant le retrait est la plus basse.
    ligne(3, { pred_rank: 3, non_partant: true, rang_effectif: null, cote: 1.5 }),
    ligne(4, { pred_rank: 4, rang_effectif: 3, cote: 10 }),
    ligne(5, { pred_rank: 5, rang_effectif: 4, cote: null }),
  ])

  it('le favori du marché ignore un non-partant à cote plus basse', () => {
    expect(c.favoriMarche?.numero).toBe(1)
    expect(c.cotee).toBe(true)
  })

  it('les probabilités du marché sont renormalisées sur les partants cotés (somme = 1)', () => {
    const pm = c.liste.filter((p) => p.pMarche != null)
    expect(numeros(pm).sort()).toEqual([1, 2, 4])
    expect(pm.reduce((s, p) => s + p.pMarche!, 0)).toBeCloseTo(1, 12)
    const somme = 1 / 3 + 1 / 5 + 1 / 10
    expect(c.liste.find((p) => p.numero === 1)!.pMarche).toBeCloseTo(1 / 3 / somme, 12)
    expect(c.liste.find((p) => p.numero === 3)!.pMarche).toBeNull()
    expect(c.liste.find((p) => p.numero === 5)!.pMarche).toBeNull()
  })

  it('à cote égale, le mieux classé par nous est le favori du marché', () => {
    const egal = uneCourse([ligne(4, { cote: 2.5 }), ligne(2, { cote: 2.5 }), ligne(3, { cote: 4 })])
    expect(egal.favoriMarche?.numero).toBe(2)
  })

  it('une course sans aucune cote n’a pas de favori du marché', () => {
    const sans = uneCourse([ligne(1), ligne(2)])
    expect(sans.cotee).toBe(false)
    expect(sans.favoriMarche).toBeNull()
  })
})

describe('construireCourses — dead heat (deux actual_place = 1)', () => {
  /*
   * Le cas existe en base : deux courses à deux gagnants au 14 septembre 2026.
   * `gagnant` ne retient QU'UN cheval — le premier dans l'ordre de notre
   * classement —, exactement comme l'outil interne (`rs.find(actual_place === 1)`),
   * et un dead heat avec notre rang 1 compte toujours gagné. La comparaison au
   * marché, elle, ne passe pas par `gagnant` : `faceAuMarche` juge chaque camp
   * sur `arrivee === 1`, et le favori du marché ex æquo premier y a gagné aussi
   * (voir `stats.test.ts` et l'écart (iv) de `tests/parite`).
   */
  it('le gagnant retenu est le mieux classé par nous des deux premiers', () => {
    const c = uneCourse([
      ligne(1, { actual_place: 1, cote: 4 }),
      ligne(2, { actual_place: 3, cote: 6 }),
      ligne(3, { actual_place: 1, cote: 2 }),
    ])
    expect(c.gagnant?.numero).toBe(1)
    expect(c.gagne).toBe(true)
    expect(c.favoriMarche?.numero).toBe(3)
    // Les deux vainqueurs sont bien dans l'arrivée à trois.
    expect(c.dansLeTrio).toBe(3)
  })

  it('notre rang 1 hors du dead heat reste une défaite', () => {
    const c = uneCourse([ligne(1, { actual_place: 3 }), ligne(2, { actual_place: 1 }), ligne(3, { actual_place: 1 })])
    expect(c.gagnant?.numero).toBe(2)
    expect(c.gagne).toBe(false)
    expect(c.place).toBe(true)
  })
})

describe('construireCourses — cheval sans pred_rank : rang null, jamais favori', () => {
  /*
   * `rank() … ORDER BY pred_rank NULLS LAST` place tous les NULL à égalité juste
   * derrière les chevaux classés. La vue leur donne donc un rang : 1 à tout le
   * peloton quand le modèle n'a rien classé, 3 quand il n'en a classé que deux.
   * L'app refuse ce rang — un cheval que le modèle n'a pas classé n'a pas été
   * pronostiqué. Les rangs ci-dessous sont ceux que la vue renverrait.
   */
  it('course entière sans pred_rank : aucun rang 1, aucun podium, ni victoire ni place', () => {
    const c = uneCourse([
      ligne(1, { pred_rank: null, rang_effectif: 1, actual_place: 1, p_win: 0.3, cote: 2 }),
      ligne(2, { pred_rank: null, rang_effectif: 1, actual_place: 2, cote: 3 }),
      ligne(3, { pred_rank: null, rang_effectif: 1, actual_place: 3 }),
      ligne(4, { pred_rank: null, rang_effectif: 1 }),
    ])
    expect(c.courue).toBe(true)
    expect(c.liste.map((p) => p.rang)).toEqual([null, null, null, null])
    expect(c.liste.map((p) => p.rangInitial)).toEqual([null, null, null, null])
    expect(c.favori).toBeNull()
    expect(c.podium).toEqual([])
    expect(c.gagne).toBe(false)
    expect(c.place).toBe(false)
    expect(c.dansLeTrio).toBe(0)
    // Le vainqueur et le marché restent lisibles : seul notre pronostic manque.
    expect(c.gagnant?.numero).toBe(1)
    expect(c.favoriMarche?.numero).toBe(1)
  })

  it('deux chevaux classés : les autres n’entrent pas dans nos trois, et passent derrière les classés', () => {
    const c = uneCourse([
      ligne(5, { pred_rank: null, rang_effectif: 3, actual_place: 1 }),
      ligne(3, { pred_rank: null, rang_effectif: 3, actual_place: 3 }),
      ligne(2, { pred_rank: 2, rang_effectif: 2, actual_place: 2 }),
      ligne(1, { pred_rank: 1, rang_effectif: 1 }),
      ligne(4, { pred_rank: 3, non_partant: true, rang_effectif: null }),
    ])
    expect(c.favori?.numero).toBe(1)
    expect(numeros(c.podium)).toEqual([1, 2])
    // Seul le n° 2 compte : les n° 5 et 3 sont arrivés dans les trois sans avoir été classés.
    expect(c.dansLeTrio).toBe(1)
    expect(c.gagne).toBe(false)
    // Grille : classés, puis sans rang (au numéro), puis non-partants.
    expect(numeros(c.liste)).toEqual([1, 2, 3, 5, 4])
    expect(c.liste.find((p) => p.numero === 5)?.rang).toBeNull()
  })

  it('un cheval sans pred_rank n’est jamais favori, même si la vue lui donne le rang 1', () => {
    // Le seul cheval classé est retiré : la vue donne le rang 1 aux deux restants.
    const c = uneCourse([
      ligne(1, { pred_rank: 1, non_partant: true, rang_effectif: null }),
      ligne(2, { pred_rank: null, rang_effectif: 1, actual_place: 1 }),
      ligne(3, { pred_rank: null, rang_effectif: 1, actual_place: 2 }),
    ])
    expect(c.favori).toBeNull()
    expect(c.favoriRetire?.numero).toBe(1)
    expect(c.gagne).toBe(false)
    expect(c.partants).toBe(2)
  })
})

describe('construireCourses — non_partant NULL (jamais vérifié)', () => {
  it('compte comme partant, et peut être notre rang 1', () => {
    const c = uneCourse([
      ligne(1, { non_partant: null, rang_effectif: 1, actual_place: 2 }),
      ligne(2, { non_partant: null, rang_effectif: 2, actual_place: 1 }),
      ligne(3, { non_partant: null, rang_effectif: 3 }),
    ])
    expect(c.partants).toBe(3)
    expect(c.nonPartants).toBe(0)
    expect(c.favori?.numero).toBe(1)
    expect(c.favori?.nonPartant).toBe(false)
    expect(c.favoriRetire).toBeNull()
    expect(c.place).toBe(true)
  })
})

describe('construireCourses — dansLeTrio', () => {
  it('compte nos trois premiers présents dans l’arrivée à trois', () => {
    const c = uneCourse([
      ligne(1, { actual_place: 3 }),
      ligne(2, { actual_place: 1 }),
      ligne(3, { actual_place: 4 }),
      ligne(4),
      ligne(5, { actual_place: 2 }),
    ])
    expect(numeros(c.podium)).toEqual([1, 2, 3])
    expect(c.dansLeTrio).toBe(2)
  })

  it('en cas d’ex æquo de rang, le podium dépasse trois chevaux', () => {
    const c = uneCourse([
      ligne(1, { pred_rank: 1, rang_effectif: 1, actual_place: 1 }),
      ligne(2, { pred_rank: 2, rang_effectif: 2, actual_place: 2 }),
      ligne(3, { pred_rank: 3, rang_effectif: 3, actual_place: 4 }),
      ligne(4, { pred_rank: 3, rang_effectif: 3, actual_place: 3 }),
      ligne(5, { pred_rank: 5, rang_effectif: 5 }),
    ])
    expect(numeros(c.podium)).toEqual([1, 2, 3, 4])
    expect(c.dansLeTrio).toBe(3)
  })

  it('vaut 0 sans arrivée', () => {
    expect(uneCourse([ligne(1), ligne(2), ligne(3)]).dansLeTrio).toBe(0)
  })
})

describe('construireCourses — ex æquo au rang 1', () => {
  it('le plus petit numéro l’emporte, quel que soit l’ordre des lignes', () => {
    const lignes = [
      ligne(7, { pred_rank: 1, rang_effectif: 1 }),
      ligne(4, { pred_rank: 1, rang_effectif: 1 }),
      ligne(9, { pred_rank: 3, rang_effectif: 3 }),
    ]
    expect(uneCourse(lignes).favori?.numero).toBe(4)
    expect(uneCourse([...lignes].reverse()).favori?.numero).toBe(4)
  })
})

describe('construireCourses — regroupement', () => {
  it('sépare les courses et les hippodromes, dédoublonne un cheval répété', () => {
    const courses = construireCourses([
      ligne(1, { course_num: 2 }),
      ligne(1, { course_num: 1 }),
      ligne(1, { course_num: 1, model_version: 'autre' }), // doublon fuité d'un autre modèle
      ligne(2, { course_num: 1 }),
      ligne(1, { hippodrome: 'VICHY' }),
      ligne(1, { reunion_date: '2026-09-11' }),
    ])
    expect(courses.map((c) => c.cle)).toEqual([
      '2026-09-11|DEAUVILLE|1',
      '2026-09-10|DEAUVILLE|1',
      '2026-09-10|DEAUVILLE|2',
      '2026-09-10|VICHY|1',
    ])
    expect(courses[1].liste).toHaveLength(2)
    const reunions = construireReunions(courses)
    expect(reunions.map((r) => r.cle)).toEqual(['2026-09-11|DEAUVILLE', '2026-09-10|DEAUVILLE', '2026-09-10|VICHY'])
  })

  it('classe les catégories comme l’outil interne', () => {
    expect(typeCourse('HAND. DIV. 1')).toBe('Handicap')
    expect(typeCourse('RECL.')).toBe('Réclamer')
    expect(typeCourse('GR.III')).toBe('Groupe & Listed')
    expect(typeCourse('Listed')).toBe('Groupe & Listed')
    expect(typeCourse(null)).toBe('Conditions')
  })
})
