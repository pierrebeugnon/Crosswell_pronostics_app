import { DEMO } from '@/config/app'
import { supabase, configure } from '@/lib/supabase'
import { profilsDemo, distancesDemo } from '@/lib/demo'
import type { ProfilPiste, TrancheProfil, VitesseParDistance } from '@/types'

const VUE_PROFILS = 'client_hippodromes'
const VUE_DISTANCES = 'client_hippodrome_distances'

/** Forme brute renvoyée par PostgREST — colonnes en serpent. */
interface LigneProfil {
  hippodrome: string
  courses: number
  courses_chronometrees: number
  depuis: string
  jusqua: string
  train_600_s: number | string | null
  vitesse_moy: number | string | null
  vitesse_ecart_type: number | string | null
  distance_moy: number | null
  distance_min: number | null
  distance_max: number | null
  partants_moy: number | string | null
}

interface LigneDistance {
  hippodrome: string
  tranche: string
  courses: number
  vitesse_moy: number | string | null
  train_600_s: number | string | null
}

/**
 * PostgREST renvoie les `numeric` de PostgreSQL en CHAÎNES, pas en nombres —
 * la précision arbitraire de `numeric` ne tient pas dans un double JavaScript,
 * et le pilote préfère ne rien perdre. Une comparaison de vitesses laissée en
 * chaînes trierait « 9.9 » après « 57.8 ».
 */
const nombre = (v: number | string | null | undefined): number | null => {
  if (v == null) return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

function versProfil(l: LigneProfil): ProfilPiste {
  return {
    hippodrome: l.hippodrome,
    courses: l.courses,
    coursesChronometrees: l.courses_chronometrees,
    depuis: l.depuis,
    jusqua: l.jusqua,
    train600: nombre(l.train_600_s),
    vitesseMoy: nombre(l.vitesse_moy),
    vitesseEcartType: nombre(l.vitesse_ecart_type),
    distanceMoy: l.distance_moy,
    distanceMin: l.distance_min,
    distanceMax: l.distance_max,
    partantsMoy: nombre(l.partants_moy),
  }
}

const TRANCHES: TrancheProfil[] = ['Sprint', 'Mile', 'Intermédiaire', 'Tenue', 'Non précisée']

function versDistance(l: LigneDistance): VitesseParDistance {
  const tranche = (TRANCHES.find((t) => t === l.tranche) ?? 'Non précisée') as TrancheProfil
  return {
    hippodrome: l.hippodrome,
    tranche,
    courses: l.courses,
    vitesseMoy: nombre(l.vitesse_moy),
    train600: nombre(l.train_600_s),
  }
}

function indisponible(message: string): Error {
  if (/JWT|permission denied|row-level security/i.test(message)) {
    return new Error("Votre session n'a plus accès aux profils de piste. Reconnectez-vous.")
  }
  if (/does not exist|schema cache/i.test(message)) {
    return new Error(
      'Les profils de piste sont introuvables. Appliquez db/002_profil_hippodromes.sql sur la base.',
    )
  }
  return new Error('Les profils de piste sont momentanément indisponibles.')
}

/** Tous les hippodromes dont la piste est profilée (≥ 20 courses relevées). */
export async function chargerProfils(): Promise<ProfilPiste[]> {
  if (DEMO) return profilsDemo()
  if (!configure) throw new Error("La connexion à la base n'est pas configurée.")

  const { data, error } = await supabase
    .from(VUE_PROFILS)
    .select('*')
    .order('courses', { ascending: false })
  if (error) throw indisponible(error.message)
  return ((data ?? []) as LigneProfil[]).map(versProfil)
}

/** Vitesse moyenne par tranche de distance, pour un hippodrome. */
export async function chargerDistances(hippodrome: string): Promise<VitesseParDistance[]> {
  if (DEMO) return distancesDemo(hippodrome)
  if (!configure) throw new Error("La connexion à la base n'est pas configurée.")

  const { data, error } = await supabase
    .from(VUE_DISTANCES)
    .select('*')
    .eq('hippodrome', hippodrome)
  if (error) throw indisponible(error.message)
  const lignes = ((data ?? []) as LigneDistance[]).map(versDistance)
  // L'ordre naturel des distances, pas celui des effectifs : un profil de piste
  // se lit du sprint vers la tenue.
  return lignes.sort((a, b) => TRANCHES.indexOf(a.tranche) - TRANCHES.indexOf(b.tranche))
}

/**
 * Vitesse moyenne de l'ensemble des pistes profilées — le repère sans lequel
 * « 57,8 km/h » ne veut rien dire. Pondérée par le nombre de courses : une
 * moyenne de moyennes donnerait autant de poids à une piste de vingt courses
 * qu'à Chantilly et ses mille sept cents.
 */
export function vitesseDeReference(profils: ProfilPiste[]): number | null {
  let poids = 0
  let somme = 0
  for (const p of profils) {
    if (p.vitesseMoy == null || p.coursesChronometrees <= 0) continue
    poids += p.coursesChronometrees
    somme += p.vitesseMoy * p.coursesChronometrees
  }
  return poids ? somme / poids : null
}
