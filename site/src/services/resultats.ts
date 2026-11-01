import { supabase } from '@/lib/supabase'
import type {
  CoursePublique,
  Discipline,
  JourneePublique,
  PartantPublic,
  StatutOfficiel,
} from '@/lib/resultats'

/**
 * LA LECTURE DES RÉSULTATS — deux vues publiques, et rien d'autre.
 *
 * `resultats_publics` (une ligne par partant des courses JUGÉES) et
 * `programme_public` (une ligne par course à venir, SANS probabilité). Les
 * migrations db/013 et db/014 décrivent pourquoi le verrou est en SQL.
 *
 * Ce module assemble des lignes à plat en journées et en courses, exactement
 * comme `lib/aggregate` le fait dans l'application. Il ne décide RIEN de ce
 * qu'un visiteur a le droit de voir : cette question est tranchée en base.
 */

/** Les colonnes lues, nommées une fois — une liste qui dérive coûte un 400. */
const COLONNES_ARRIVEE =
  'reunion_date,hippodrome,course_num,course_nom,categorie,is_handicap,discipline,distance,field_size,heure_depart,reunion,allocation,terrain,quinte,horse_num,horse_name,rang,p_win,p_place,actual_place,cote,non_partant,poids,jockey,entraineur,sexe,age,pere,mere'

const COLONNES_PROGRAMME =
  'reunion_date,hippodrome,course_num,course_nom,categorie,is_handicap,discipline,distance,field_size,heure_depart,reunion,allocation,terrain,quinte,partants,non_partants'

/** Ce que la course porte, et que les deux vues servent à l'identique. */
interface ColonnesCourse {
  reunion_date: string
  hippodrome: string
  course_num: number
  course_nom: string | null
  categorie: string | null
  is_handicap: boolean | null
  discipline: string | null
  distance: number | null
  field_size: number | null
  heure_depart: string | null
  /** Les trois suivantes viennent d'une source qui ne couvre pas tout. */
  reunion: number | null
  allocation: number | null
  terrain: string | null
  /**
   * Le Quinté+ du jour (db/018). La vue sert un booléen jamais nul ; il est
   * typé nullable quand même, pour qu'une base où la migration manque donne
   * `undefined` plutôt qu'une page cassée.
   */
  quinte: boolean | null
}

interface LigneArrivee extends ColonnesCourse {
  horse_num: number
  horse_name: string | null
  rang: number | null
  p_win: number | null
  p_place: number | null
  actual_place: number | null
  cote: number | null
  non_partant: boolean | null
  poids: number | null
  jockey: string | null
  entraineur: string | null
  sexe: string | null
  age: number | null
  pere: string | null
  mere: string | null
}

interface LigneProgramme extends ColonnesCourse {
  partants: number
  non_partants: number
}

/** '13:20:00' → '13:20'. La vue sert un `time`, l'écran veut des heures. */
const heure = (t: string | null) => (t ? t.slice(0, 5) : null)

const cleCourse = (date: string, hippodrome: string, numero: number) =>
  `${date}|${hippodrome}|${numero}`

function partantDe(l: LigneArrivee): PartantPublic {
  return {
    numero: l.horse_num,
    nom: l.horse_name ?? `n°${l.horse_num}`,
    age: l.age,
    sexe: l.sexe,
    poids: l.poids,
    // `null` le jour même, par construction : la source s'écrit la nuit
    // suivante. Les composants n'affichent la colonne que si elle est remplie.
    jockey: l.jockey,
    entraineur: l.entraineur,
    pere: l.pere,
    mere: l.mere,
    rang: l.rang,
    pWin: l.p_win,
    pPlace: l.p_place,
    arrivee: l.actual_place,
    cote: l.cote,
    nonPartant: l.non_partant === true,
  }
}

/** La vue sert la graphie de sa source ; seules ces valeurs sont attendues. */
const DISCIPLINES: readonly string[] = ['Plat', 'Haies', 'Steeple', 'Cross']
const disciplineDe = (v: string | null): Discipline | null =>
  v && DISCIPLINES.includes(v) ? (v as Discipline) : null

/** Les colonnes de course, repliées une fois — les deux vues les partagent. */
function courseDe(l: ColonnesCourse) {
  return {
    date: l.reunion_date,
    hippodrome: l.hippodrome,
    reunion: l.reunion,
    numero: l.course_num,
    nom: l.course_nom,
    categorie: l.categorie,
    handicap: l.is_handicap === true,
    discipline: disciplineDe(l.discipline),
    distance: l.distance,
    allocation: l.allocation,
    terrain: l.terrain,
    quinte: l.quinte === true,
    heureDepart: heure(l.heure_depart),
  }
}

/** Les lignes à plat d'une journée, repliées en courses. */
function assembler(lignes: LigneArrivee[]): CoursePublique[] {
  const parCourse = new Map<string, CoursePublique>()

  for (const l of lignes) {
    const cle = cleCourse(l.reunion_date, l.hippodrome, l.course_num)
    let course = parCourse.get(cle)

    if (!course) {
      course = {
        cle,
        ...courseDe(l),
        // La vue ne sert que des courses jugées : l'arrivée est connue.
        statut: 'ARRIVEE_DEFINITIVE_COMPLETE' as StatutOfficiel,
        partants: 0,
        nonPartants: 0,
        courue: true,
        liste: [],
      }
      parCourse.set(cle, course)
    }

    course.liste.push(partantDe(l))
  }

  // Les compteurs se déduisent de la liste, jamais de `field_size` : celui-ci
  // compte les déclarés, non-partants compris.
  for (const c of parCourse.values()) {
    c.partants = c.liste.filter((p) => !p.nonPartant).length
    c.nonPartants = c.liste.filter((p) => p.nonPartant).length
    c.liste.sort((a, b) => (a.arrivee ?? 99) - (b.arrivee ?? 99) || a.numero - b.numero)
  }

  return [...parCourse.values()].sort(
    (a, b) =>
      (a.heureDepart ?? '').localeCompare(b.heureDepart ?? '') ||
      a.hippodrome.localeCompare(b.hippodrome) ||
      a.numero - b.numero,
  )
}

function courseDuProgramme(l: LigneProgramme): CoursePublique {
  return {
    cle: cleCourse(l.reunion_date, l.hippodrome, l.course_num),
    ...courseDe(l),
    statut: null,
    partants: l.partants,
    // `0` est ici une vraie valeur : la vue compte les non-partants déclarés.
    nonPartants: l.non_partants,
    courue: false,
    // Aucun partant : la vue n'en sert pas, et c'est le verrou.
    liste: [],
  }
}

/** Une journée complète : les arrivées jugées, et le programme restant. */
export async function chargerJournee(jour: string): Promise<JourneePublique> {
  if (!supabase) throw new Error('Les résultats ne sont pas disponibles.')

  const [arrivees, programme] = await Promise.all([
    supabase.from('resultats_publics').select(COLONNES_ARRIVEE).eq('reunion_date', jour),
    supabase.from('programme_public').select(COLONNES_PROGRAMME).eq('reunion_date', jour),
  ])

  if (arrivees.error) throw arrivees.error
  if (programme.error) throw programme.error

  const courses = [
    ...assembler((arrivees.data ?? []) as LigneArrivee[]),
    ...((programme.data ?? []) as LigneProgramme[]).map(courseDuProgramme),
  ].sort(
    (a, b) =>
      (a.heureDepart ?? '').localeCompare(b.heureDepart ?? '') ||
      a.hippodrome.localeCompare(b.hippodrome) ||
      a.numero - b.numero,
  )

  return { jour, courses }
}

/** Une course, pour sa page. `undefined` si elle n'existe pas ou n'est pas jugée. */
export async function chargerCourse(
  jour: string,
  hippodrome: string,
  numero: number,
): Promise<CoursePublique | undefined> {
  if (!supabase) throw new Error('Les résultats ne sont pas disponibles.')

  const { data, error } = await supabase
    .from('resultats_publics')
    .select(COLONNES_ARRIVEE)
    .eq('reunion_date', jour)
    .eq('hippodrome', hippodrome)
    .eq('course_num', numero)

  if (error) throw error
  return assembler((data ?? []) as LigneArrivee[])[0]
}

/** Ce qu'il faut pour écrire l'adresse d'une course — voir `cheminCourse`. */
export type AdresseCourse = Pick<CoursePublique, 'date' | 'hippodrome' | 'reunion' | 'numero' | 'nom'>

/** Pour les archives et le sitemap : le calendrier, lui, s'arrête à 60 journées. */
export const TOUTES_LES_JOURNEES = 1000

/** Le plafond de lignes de l'API : l'atteindre signifie qu'il en manque. */
const PLAFOND_LIGNES = 1000

/** '2026-12' → '2027-01-01' : la borne exclue d'un mois, sans inventer de 31 février. */
function debutMoisSuivant(mois: string): string {
  const [a, m] = mois.split('-').map(Number)
  return m === 12 ? `${a + 1}-01-01` : `${a}-${String(m + 1).padStart(2, '0')}-01`
}

/**
 * LES ADRESSES DE TOUTES LES COURSES JUGÉES, pour `api/sitemap-resultats`.
 *
 * `rang = 1` ne garde qu'une ligne par course : vérifié sur 1 119 courses le
 * 01/11/2026, chacune en a exactement une.
 *
 * MOIS PAR MOIS plutôt que par décalage : une vue lue par `range` est recalculée
 * à chaque tranche, et c'est ce qui a déjà fait tomber le monitoring en 57014.
 */
export async function chargerAdressesCourses(journees: string[]): Promise<AdresseCourse[]> {
  const client = supabase
  if (!client) throw new Error('Les résultats ne sont pas disponibles.')

  const parMois = await Promise.all(
    [...new Set(journees.map((j) => j.slice(0, 7)))].map(async (mois) => {
      const { data, error } = await client
        .from('resultats_publics')
        .select('reunion_date,hippodrome,reunion,course_num,course_nom')
        .eq('rang', 1)
        .gte('reunion_date', `${mois}-01`)
        .lt('reunion_date', debutMoisSuivant(mois))

      if (error) throw error
      if (data.length >= PLAFOND_LIGNES) throw new Error(`Sitemap : ${mois} dépasse le plafond de lignes.`)

      return data.map((l) => ({
        date: l.reunion_date as string,
        hippodrome: l.hippodrome as string,
        reunion: l.reunion as number | null,
        numero: l.course_num as number,
        nom: l.course_nom as string | null,
      }))
    }),
  )

  return parMois.flat()
}

/**
 * Les journées qui ont des résultats, de la plus récente à la plus ancienne.
 * Sert le calendrier et la liste « journées précédentes ».
 *
 * Lit `journees_publiques` (db/015), une ligne par jour. La première version
 * lisait la colonne `reunion_date` de `resultats_publics` et repliait les
 * doublons ici : environ 250 lignes par journée, donc une limite de 3 600
 * lignes ne couvrait qu'une dizaine de jours — le calendrier était faux
 * au-delà, et la page attendait deux secondes pour rien.
 */
export async function chargerJourneesDisponibles(limite = 60): Promise<string[]> {
  if (!supabase) throw new Error('Les résultats ne sont pas disponibles.')

  const { data, error } = await supabase
    .from('journees_publiques')
    .select('reunion_date')
    .order('reunion_date', { ascending: false })
    .limit(limite)

  if (error) throw error
  return (data ?? []).map((l) => (l as { reunion_date: string }).reunion_date)
}
