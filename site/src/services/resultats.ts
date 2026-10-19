import { supabase } from '@/lib/supabase'
import type { CoursePublique, JourneePublique, PartantPublic, StatutOfficiel } from '@/lib/resultats'

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
  'reunion_date,hippodrome,course_num,course_nom,categorie,distance,field_size,heure_depart,horse_num,horse_name,rang,p_win,p_place,actual_place,cote,non_partant'

const COLONNES_PROGRAMME =
  'reunion_date,hippodrome,course_num,course_nom,categorie,distance,field_size,heure_depart,partants,non_partants'

interface LigneArrivee {
  reunion_date: string
  hippodrome: string
  course_num: number
  course_nom: string | null
  categorie: string | null
  distance: number | null
  field_size: number | null
  heure_depart: string | null
  horse_num: number
  horse_name: string | null
  rang: number | null
  p_win: number | null
  p_place: number | null
  actual_place: number | null
  cote: number | null
  non_partant: boolean | null
}

interface LigneProgramme {
  reunion_date: string
  hippodrome: string
  course_num: number
  course_nom: string | null
  categorie: string | null
  distance: number | null
  field_size: number | null
  heure_depart: string | null
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
    // Âge, sexe et poids ne sont pas servis : l'application ne les affiche pas
    // non plus, et leur seule source de course (`pmu_partants`) ne couvre que
    // le plat et n'est plus alimentée. Voir db/013.
    age: null,
    sexe: null,
    poids: null,
    rang: l.rang,
    pWin: l.p_win,
    arrivee: l.actual_place,
    cote: l.cote,
    nonPartant: l.non_partant === true,
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
        date: l.reunion_date,
        hippodrome: l.hippodrome,
        // Ni numéro de réunion, ni discipline, ni allocation, ni terrain :
        // l'en-tête de course de l'application n'en affiche aucun, et la seule
        // source qui les porte est figée au 16/10 et limitée au plat.
        reunion: null,
        numero: l.course_num,
        nom: l.course_nom,
        categorie: l.categorie,
        discipline: null,
        distance: l.distance,
        allocation: null,
        terrain: null,
        // La vue ne sert que des courses jugées : l'arrivée est connue.
        statut: 'ARRIVEE_DEFINITIVE_COMPLETE' as StatutOfficiel,
        partants: 0,
        nonPartants: 0,
        heureDepart: heure(l.heure_depart),
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
    date: l.reunion_date,
    hippodrome: l.hippodrome,
    reunion: null,
    numero: l.course_num,
    nom: l.course_nom,
    categorie: l.categorie,
    discipline: null,
    distance: l.distance,
    allocation: null,
    terrain: null,
    statut: null,
    partants: l.partants,
    // `0` est ici une vraie valeur : la vue compte les non-partants déclarés.
    nonPartants: l.non_partants,
    heureDepart: heure(l.heure_depart),
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
