/** Ligne brute de la vue de prédictions : un cheval dans une course. */
export interface LignePrediction {
  reunion_date: string
  hippodrome: string | null
  course_num: number
  course_nom: string | null
  categorie: string | null
  is_handicap: boolean | null
  distance: number | null
  field_size: number | null
  horse_num: number
  horse_name: string | null
  id_fg: string | null
  pred_rank: number | null
  p_win: number | null
  p_place: number | null
  actual_place: number | null
  model_version: string | null
  cote: number | null
  rapport_gagnant: number | null
  rapport_place: number | null
}

export type TypeCourse = 'Handicap' | 'Réclamer' | 'Conditions' | 'Groupe & Listed'

/** Un partant, enrichi de tout ce que l'écran a besoin de montrer. */
export interface Partant {
  numero: number
  nom: string
  rang: number | null
  pWin: number | null
  pPlace: number | null
  cote: number | null
  /** Probabilité implicite de la cote, renormalisée sur la course. */
  pMarche: number | null
  /** pWin − pMarche. Positif = nous sommes plus optimistes que le marché. */
  ecartMarche: number | null
  /** L'écart dépasse la marge de bruit : partant à valeur. */
  value: boolean
  arrivee: number | null
  rapportGagnant: number | null
  rapportPlace: number | null
}

/** Une course, telle que la plateforme la présente. */
export interface Course {
  /** `2026-08-26|CLAIREFONTAINE|3` — sert d'URL et de clé de liste. */
  cle: string
  date: string
  hippodrome: string
  numero: number
  nom: string | null
  categorie: string | null
  type: TypeCourse
  handicap: boolean
  distance: number | null
  partants: number | null
  /** L'arrivée est connue. */
  courue: boolean
  /** Des cotes sont disponibles sur cette course. */
  cotee: boolean
  liste: Partant[]
  /** Notre rang 1. */
  favori: Partant | null
  /** Nos rangs 1 à 3, dans l'ordre. */
  podium: Partant[]
  /** Le vainqueur réel, si la course est courue. */
  gagnant: Partant | null
  /** Le favori du marché (cote la plus basse). */
  favoriMarche: Partant | null
  /** Notre rang 1 a gagné. */
  gagne: boolean
  /** Notre rang 1 est arrivé dans les trois. */
  place: boolean
  /** Combien de nos trois se retrouvent dans l'arrivée à trois : 0, 1, 2 ou 3. */
  dansLeTrio: number
}

/** Une réunion : toutes les courses d'un hippodrome, un jour donné. */
export interface Reunion {
  cle: string
  date: string
  hippodrome: string
  courses: Course[]
  courues: number
  gagnees: number
}

/** Bilan chiffré d'un ensemble de courses. */
export interface Bilan {
  courses: number
  jugees: number
  gagnees: number
  placees: number
  /** Somme des recouvrements du trio, entre 0 et `jugees`. */
  trio: number
  reunions: number
  tauxVictoire: number
  tauxPlace: number
  tauxTrio: number
}

/**
 * Profil de piste d'un hippodrome, agrégé sur les relevés de tracking.
 *
 * `vitesseMoy` et `train600` sont NULLABLES et le restent : un hippodrome
 * d'obstacle comme Auteuil compte près de mille courses sans un seul relevé
 * chronométré. Une piste sans chrono n'est pas une piste sans données — elle a
 * un volume, des distances, des pelotons — et l'écran doit pouvoir la montrer
 * amputée de sa seule vitesse.
 */
export interface ProfilPiste {
  hippodrome: string
  courses: number
  coursesChronometrees: number
  depuis: string
  jusqua: string
  train600: number | null
  vitesseMoy: number | null
  vitesseEcartType: number | null
  distanceMoy: number | null
  distanceMin: number | null
  distanceMax: number | null
  partantsMoy: number | null
}

export type TrancheProfil = 'Sprint' | 'Mile' | 'Intermédiaire' | 'Tenue' | 'Non précisée'

export interface VitesseParDistance {
  hippodrome: string
  tranche: TrancheProfil
  courses: number
  vitesseMoy: number | null
  train600: number | null
}
