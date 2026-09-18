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
  /**
   * TRUE = déclaré non partant ; FALSE = vérifié partant ; NULL = jamais
   * vérifié, traité comme partant. Ajouté par `db/003` : optionnel, pour qu'une
   * base où la migration manque dégrade l'affichage au lieu de le casser.
   */
  non_partant?: boolean | null
  /** Rang parmi les chevaux au départ (NULL pour un non-partant). `db/003`. */
  rang_effectif?: number | null
  /** Heure de départ, heure de Paris, 'HH:MM:SS'. `db/003`. */
  heure_depart?: string | null
  /**
   * Pronostic réservé aux Pass (`db/007`) : rang et probabilités sont alors à
   * NULL. Vrai seulement sans accès complet, sur les courses à venir non offertes.
   */
  verrouille?: boolean | null
}

export type TypeCourse = 'Handicap' | 'Réclamer' | 'Conditions' | 'Groupe & Listed'

/** Un partant, enrichi de tout ce que l'écran a besoin de montrer. */
export interface Partant {
  numero: number
  nom: string
  /** Identifiant France Galop : la clé de la fiche (profil, performances). */
  idFg: string | null
  /**
   * Rang EFFECTIF : le rang parmi les chevaux au départ. Quand notre rang 1 est
   * déclaré non partant, le cheval suivant devient rang 1 — c'est la règle de
   * l'outil interne, et la seule qui ne compte pas en échec une course où notre
   * sélection n'a jamais couru. NULL pour un non-partant.
   */
  rang: number | null
  /** Rang publié par le modèle, avant tout retrait. */
  rangInitial: number | null
  /** Déclaré non partant. Un partant jamais vérifié vaut `false`. */
  nonPartant: boolean
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
  /**
   * Chevaux AU DÉPART (non-partants retirés). C'est la taille qui sert au repère
   * du hasard et aux tranches de peloton.
   */
  partants: number
  /** Chevaux déclarés, non-partants compris (`field_size`). */
  declares: number | null
  /** Nombre de non-partants déclarés dans la course. */
  nonPartants: number
  /** Heure de départ 'HH:MM', heure de Paris, si connue. */
  heureDepart: string | null
  /** L'arrivée est connue. */
  courue: boolean
  /** Des cotes sont disponibles sur cette course. */
  cotee: boolean
  /**
   * Le pronostic est réservé aux Pass (formule Gratuit, course à venir autre que
   * la course offerte) : la base n'en a donné ni rang ni probabilité.
   */
  verrouillee: boolean
  liste: Partant[]
  /** Notre rang 1. */
  favori: Partant | null
  /**
   * Le rang 1 publié, s'il a été déclaré non partant — c'est alors `favori` qui
   * porte le rang 1 effectif. Sert à le dire à l'écran plutôt qu'à le taire.
   */
  favoriRetire: Partant | null
  /** Nos rangs effectifs 1 à 3, dans l'ordre (plus de trois en cas d'ex æquo). */
  podium: Partant[]
  /** Le vainqueur réel, si la course est courue. */
  gagnant: Partant | null
  /** Le favori du marché : cote de clôture la plus basse parmi les partants. */
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
  /** Réunions touchées par l'ensemble, jugées ou non. */
  reunions: number
  /** Réunions comptant au moins une course jugée. */
  reunionsJugees: number
  tauxVictoire: number
  tauxPlace: number
  tauxTrio: number
}

/**
 * Le profil d'un cheval (vue `client_chevaux`, `db/004_fiche_cheval.sql`), en
 * codes France Galop : sexe « HONGRE », robe « GRI ». `lib/fiche` les décode.
 */
export interface ProfilCheval {
  idFg: string
  nom: string | null
  sexe: string | null
  robe: string | null
  dateNaissance: string | null
  pere: string | null
  mere: string | null
  eleveur: string | null
  proprietaire: string | null
}

/**
 * Une course courue par le cheval (vue `client_performances`), en texte brut
 * France Galop : place « 3 » ou « TB », distance « 3.600 », allocation « 16.250 ».
 */
export interface PerformanceCheval {
  date: string | null
  hippodrome: string | null
  place: string | null
  distance: string | null
  specialite: string | null
  categorie: string | null
  poids: string | null
  jockey: string | null
  entraineur: string | null
  gains: string | null
}

/** La fiche d'un cheval : son profil (s'il est connu) et ses courses, la plus récente d'abord. */
export interface Fiche {
  profil: ProfilCheval | null
  performances: PerformanceCheval[]
}

/** Jockey ou entraîneur : les deux fiches partagent tout, sauf quelques libellés. */
export type RolePro = 'jockey' | 'entraineur'

/** Une ligne d'agrégat (vue `client_stats_pros`, `db/005`) : personne × année × mois × discipline × hippodrome. */
export interface StatPro {
  annee: number
  mois: number
  specialite: string | null
  hippodrome: string | null
  montes: number
  victoires: number
  /** Arrivées 2e et 3e (les victoires à part). */
  places: number
  allocations: number
}

/** Une personne dans le classement annuel (vue `client_classement`). */
export interface RangPro {
  nom: string
  montes: number
  victoires: number
  allocations: number
  rangVictoires: number
  rangAllocations: number
  effectif: number
}

/** Un partenaire habituel : l'entraîneur d'un jockey, ou le jockey d'un entraîneur. */
export interface AssociationPro {
  partenaire: string
  montes: number
  victoires: number
}

/** Une course d'un jockey ou d'un entraîneur (vues `client_montes`, `client_palmares`). */
export interface MontePro {
  date: string
  hippodrome: string | null
  place: string | null
  distance: string | null
  specialite: string | null
  categorie: string | null
  jockey: string | null
  entraineur: string | null
  cheval: string | null
}

/** Tout ce que la fiche d'un jockey ou d'un entraîneur affiche. */
export interface ProfilPro {
  role: RolePro
  nom: string
  /** La saison affichée : l'année en cours, ou la précédente si rien n'a encore couru. */
  annee: number
  stats: StatPro[]
  classement: RangPro[]
  moi: RangPro | null
  associations: AssociationPro[]
  montes: MontePro[]
  palmares: MontePro[]
  /** Entraîneur : les chevaux pronostiqués à venir dont il a sellé la dernière course. */
  programme: string[]
}
