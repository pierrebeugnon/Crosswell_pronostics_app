/**
 * LES STATISTIQUES DES COURSES — le calcul de `/statistiques`.
 *
 * ELLES DÉCRIVENT LES COURSES, JAMAIS NOTRE MODÈLE. Le rang et les probabilités
 * ne sont ni lus ni calculés ici : les taux de nos pronostics vivent dans
 * l'application, et un chiffre interne n'a pas sa place sur cette page.
 *
 * QUATRE RÈGLES, QUI ONT TOUTES DÉJÀ FAUSSÉ UN CHIFFRE AILLEURS :
 * - une place vide n'est pas une course sans résultat : seule l'arrivée officielle
 *   est publiée, et un partant hors arrivée est un partant battu. Filtrer les
 *   lignes sur la place ferait monter tous les taux ;
 * - un non-partant garde parfois une cote : il ne compte ni dans le peloton, ni
 *   pour désigner le favori ;
 * - deux cotes égales, c'est pas de favori : la course sort du calcul, plutôt que
 *   d'être comptée gagnée dès que l'un des deux gagne ;
 * - les taux du favori et leurs repères se calculent sur LES MÊMES courses.
 *
 * Aucun import d'alias : ce fichier est testé depuis la racine du dépôt.
 */

/** Sous cet effectif, un taux ne s'affiche pas : il ne dirait rien. */
export const EFFECTIF_MINIMUM = 30

/** Une ligne de la vue `resultats_publics`, réduite à ce que décrit une course. */
export interface LigneStatistique {
  reunion_date: string
  hippodrome: string
  course_num: number
  discipline: string | null
  is_handicap: boolean | null
  actual_place: number | null
  cote: number | null
  non_partant: boolean | null
}

/** Un découpage : ses courses, et ce qu'y fait le favori du marché. */
export interface Segment {
  libelle: string
  courses: number
  partantsMoyens: number
  /** Courses à favori unique, cotées sur tout le peloton : l'effectif des taux. */
  avecFavori: number
  gagne: number | null
  place: number | null
  /** Ce que donnerait un partant tiré au sort, sur ces mêmes courses. */
  hasardGagne: number | null
  hasardPlace: number | null
  /** La probabilité qu'annonce la cote du favori, marge de l'opérateur retirée. */
  annonce: number | null
}

export interface LieuStatistique {
  /** Le nom tel que la base le garde : l'affichage le met en forme. */
  hippodrome: string
  courses: number
  journees: number
  partantsMoyens: number
}

export interface Statistiques {
  debut: string
  fin: string
  journees: number
  courses: number
  partants: number
  hippodromes: number
  /** Courses dont tout le peloton a une cote de clôture. */
  coursesCotees: number
  ensemble: Segment
  disciplines: Segment[]
  handicaps: Segment[]
  pelotons: Segment[]
  cotes: Segment[]
  lieux: LieuStatistique[]
}

interface Course {
  jour: string
  hippodrome: string
  discipline: string | null
  handicap: boolean
  partants: number
  cotee: boolean
  /** `null` sans cote complète, ou quand la cote la plus basse est partagée. */
  favori: { gagne: boolean; place: boolean; cote: number; annonce: number } | null
}

function coursesDe(lignes: LigneStatistique[]): Course[] {
  const parCourse = new Map<string, LigneStatistique[]>()
  for (const l of lignes) {
    const cle = `${l.reunion_date}|${l.hippodrome}|${l.course_num}`
    const groupe = parCourse.get(cle)
    if (groupe) groupe.push(l)
    else parCourse.set(cle, [l])
  }

  return [...parCourse.values()].map((groupe) => {
    const partants = groupe.filter((l) => l.non_partant !== true)
    const cotee = partants.length > 0 && partants.every((l) => l.cote != null && l.cote > 0)

    let favori: Course['favori'] = null
    if (cotee) {
      const plusBasse = Math.min(...partants.map((l) => l.cote as number))
      const favoris = partants.filter((l) => l.cote === plusBasse)
      if (favoris.length === 1) {
        const somme = partants.reduce((s, l) => s + 1 / (l.cote as number), 0)
        const place = favoris[0].actual_place
        favori = {
          gagne: place === 1,
          place: place != null && place >= 1 && place <= 3,
          cote: plusBasse,
          annonce: 1 / plusBasse / somme,
        }
      }
    }

    return {
      jour: groupe[0].reunion_date,
      hippodrome: groupe[0].hippodrome,
      discipline: groupe[0].discipline,
      handicap: groupe[0].is_handicap === true,
      partants: partants.length,
      cotee,
      favori,
    }
  })
}

const moyenne = (valeurs: number[]) =>
  valeurs.length ? valeurs.reduce((s, v) => s + v, 0) / valeurs.length : null

function segment(libelle: string, courses: Course[]): Segment {
  const jugees = courses.filter((c) => c.favori)
  const part = (test: (c: Course) => boolean) =>
    jugees.length ? jugees.filter(test).length / jugees.length : null

  return {
    libelle,
    courses: courses.length,
    partantsMoyens: moyenne(courses.map((c) => c.partants)) ?? 0,
    avecFavori: jugees.length,
    gagne: part((c) => c.favori?.gagne === true),
    place: part((c) => c.favori?.place === true),
    hasardGagne: moyenne(jugees.map((c) => 1 / c.partants)),
    hasardPlace: moyenne(jugees.map((c) => Math.min(3, c.partants) / c.partants)),
    annonce: moyenne(jugees.map((c) => c.favori?.annonce ?? 0)),
  }
}

/** L'ordre d'usage, pas l'ordre alphabétique : le plat d'abord. */
const DISCIPLINES = ['Plat', 'Haies', 'Steeple', 'Cross']

const PELOTONS: { libelle: string; test: (n: number) => boolean }[] = [
  { libelle: '6 partants ou moins', test: (n) => n <= 6 },
  { libelle: '7 à 9 partants', test: (n) => n >= 7 && n <= 9 },
  { libelle: '10 à 12 partants', test: (n) => n >= 10 && n <= 12 },
  { libelle: '13 à 15 partants', test: (n) => n >= 13 && n <= 15 },
  { libelle: '16 partants ou plus', test: (n) => n >= 16 },
]

const COTES: { libelle: string; test: (c: number) => boolean }[] = [
  { libelle: 'Moins de 2', test: (c) => c < 2 },
  { libelle: 'De 2 à 3', test: (c) => c >= 2 && c < 3 },
  { libelle: 'De 3 à 4', test: (c) => c >= 3 && c < 4 },
  { libelle: '4 ou plus', test: (c) => c >= 4 },
]

/** Combien d'hippodromes le tableau montre : au-delà, chacun a trop peu de courses. */
const LIEUX_MONTRES = 10

export function calculerStatistiques(lignes: LigneStatistique[]): Statistiques {
  const courses = coursesDe(lignes)
  const jours = [...new Set(courses.map((c) => c.jour))].sort()

  const parLieu = new Map<string, Course[]>()
  for (const c of courses) parLieu.set(c.hippodrome, [...(parLieu.get(c.hippodrome) ?? []), c])

  return {
    debut: jours[0] ?? '',
    fin: jours[jours.length - 1] ?? '',
    journees: jours.length,
    courses: courses.length,
    partants: courses.reduce((s, c) => s + c.partants, 0),
    hippodromes: parLieu.size,
    coursesCotees: courses.filter((c) => c.cotee).length,
    ensemble: segment('Toutes les courses', courses),
    disciplines: DISCIPLINES.map((d) => segment(d, courses.filter((c) => c.discipline === d))).filter(
      (s) => s.courses > 0,
    ),
    handicaps: [
      segment('Handicaps', courses.filter((c) => c.handicap)),
      segment('Autres courses', courses.filter((c) => !c.handicap)),
    ],
    pelotons: PELOTONS.map((p) => segment(p.libelle, courses.filter((c) => p.test(c.partants)))).filter(
      (s) => s.courses > 0,
    ),
    cotes: COTES.map((t) =>
      segment(t.libelle, courses.filter((c) => c.favori != null && t.test(c.favori.cote))),
    ).filter((s) => s.courses > 0),
    lieux: [...parLieu.entries()]
      .map(([hippodrome, c]) => ({
        hippodrome,
        courses: c.length,
        journees: new Set(c.map((x) => x.jour)).size,
        partantsMoyens: moyenne(c.map((x) => x.partants)) ?? 0,
      }))
      .sort((a, b) => b.courses - a.courses || a.hippodrome.localeCompare(b.hippodrome))
      .slice(0, LIEUX_MONTRES),
  }
}
