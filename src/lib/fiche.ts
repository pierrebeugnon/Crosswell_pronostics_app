import type { PerformanceCheval, ProfilCheval } from '@/types'

/**
 * LA FICHE D'UN CHEVAL — la logique pure : identité lisible, musique, bilan de
 * carrière. Les données viennent de France Galop (vues `client_chevaux` et
 * `client_performances`, `db/004_fiche_cheval.sql`) et arrivent en codes :
 * sexe « HONGRE », robe « GRI », place « TB », distance « 3.600 », allocation
 * « 16.250 ». Tout le décodage vit ici, et nulle part dans l'écran.
 */

/** Âge en années révolues au jour donné ('AAAA-MM-JJ'). */
export function age(naissance: string | null, jour: string): number | null {
  if (!naissance) return null
  const [a, m, j] = naissance.split('-').map(Number)
  const [A, M, J] = jour.split('-').map(Number)
  const n = A - a - (M < m || (M === m && J < j) ? 1 : 0)
  return n >= 0 ? n : null
}

const SEXES: Record<string, string> = { FEMELLE: 'Femelle', HONGRE: 'Hongre', MALE: 'Mâle', 'MÂLE': 'Mâle' }

/** Les robes relevées en base ; un code inconnu n'est pas affiché plutôt que deviné. */
const ROBES: Record<string, string> = {
  BAI: 'Bai',
  ALE: 'Alezan',
  AL: 'Alezan',
  ALZ: 'Alezan',
  GRI: 'Gris',
  GR: 'Gris',
  NOI: 'Noir',
  ROU: 'Rouan',
  AUB: 'Aubère',
  PAL: 'Palomino',
  ISA: 'Isabelle',
  BLA: 'Blanc',
}

/** « 7 ans · Hongre · Gris » — ce qu'on sait, dans cet ordre, sans trou. */
export function ligneIdentite(p: ProfilCheval | null, jour: string): string {
  if (!p) return ''
  const a = age(p.dateNaissance, jour)
  return [
    a != null ? `${a} an${a > 1 ? 's' : ''}` : null,
    p.sexe ? (SEXES[p.sexe.toUpperCase()] ?? null) : null,
    p.robe ? (ROBES[p.robe.toUpperCase()] ?? null) : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

/** Les disciplines de France Galop : P plat, H haies, S steeple, C cross. */
const DISCIPLINES: Record<string, { lettre: string; libelle: string }> = {
  P: { lettre: 'p', libelle: 'Plat' },
  H: { lettre: 'h', libelle: 'Haies' },
  S: { lettre: 's', libelle: 'Steeple' },
  C: { lettre: 'c', libelle: 'Cross' },
}

export function discipline(code: string | null): string | null {
  return code ? (DISCIPLINES[code.toUpperCase()]?.libelle ?? null) : null
}

/** Les places non numériques relevées, en toutes lettres et en lettre de musique. */
const INCIDENTS: Record<string, { libelle: string; lettre: string }> = {
  AR: { libelle: 'Arrêté', lettre: 'A' },
  TB: { libelle: 'Tombé', lettre: 'T' },
  TJ: { libelle: 'Désarçonné', lettre: 'T' },
  DI: { libelle: 'Disqualifié', lettre: 'D' },
  DB: { libelle: 'Dérobé', lettre: 'D' },
  RP: { libelle: 'Rétrogradé', lettre: 'R' },
  NP: { libelle: 'Non-partant', lettre: '' },
}

/** La place numérique, ou null (incident, non-partant, valeur absente). */
export function placeNumerique(place: string | null): number | null {
  if (!place || !/^\d+$/.test(place.trim())) return null
  const n = Number(place)
  return n > 0 ? n : null
}

/** « 3e », « 1er », « Tombé »… */
export function placeLisible(place: string | null): string {
  const n = placeNumerique(place)
  if (n != null) return n === 1 ? '1er' : `${n}e`
  const code = (place ?? '').trim().toUpperCase()
  return INCIDENTS[code]?.libelle ?? (code || '—')
}

/**
 * Le ton d'une case, comme dans la maquette : vert dans les trois, éteint
 * au-delà de la 9e ou sur incident (tombé, arrêté…), neutre entre les deux.
 */
export type TonPlace = 'place' | 'neutre' | 'loin'

export function tonPlace(place: string | null): TonPlace {
  const n = placeNumerique(place)
  if (n == null || n > 9) return 'loin'
  return n <= 3 ? 'place' : 'neutre'
}

export interface CaseMusique {
  /** « 1p », « 0h », « Ts »… */
  libelle: string
  ton: TonPlace
}

/**
 * LA MUSIQUE — les dernières courses, la plus récente en premier, notées comme
 * dans la presse hippique : la place (0 au-delà de la 9e, A arrêté, T tombé,
 * D disqualifié ou dérobé, R rétrogradé) suivie de la discipline. Les
 * non-partants n'y entrent pas : le cheval n'a pas couru.
 */
export function musique(performances: PerformanceCheval[], n = 6): CaseMusique[] {
  return [...performances]
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    .filter((p) => (p.place ?? '').trim().toUpperCase() !== 'NP')
    .slice(0, n)
    .map((p) => {
      const num = placeNumerique(p.place)
      const code = (p.place ?? '').trim().toUpperCase()
      const chiffre = num != null ? (num > 9 ? '0' : String(num)) : (INCIDENTS[code]?.lettre ?? '?')
      const lettre = DISCIPLINES[(p.specialite ?? '').toUpperCase()]?.lettre ?? ''
      return { libelle: `${chiffre}${lettre}`, ton: tonPlace(p.place) }
    })
}

/** « 16.250 » → 16250 ; « 16.250,50 » → 16250.5. Point = milliers chez France Galop. */
export function montant(brut: string | null): number | null {
  if (!brut) return null
  const n = Number(brut.trim().replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** « 3.600 » → 3600. */
export function metres(brut: string | null): number | null {
  const n = montant(brut)
  return n != null && n > 0 ? n : null
}

export interface Carriere {
  courses: number
  victoires: number
  places: number
  /** Allocations cumulées, en euros. */
  allocations: number
}

/** Le bilan de carrière sur les performances relevées, non-partants exclus. */
export function carriere(performances: PerformanceCheval[]): Carriere {
  const courues = performances.filter((p) => (p.place ?? '').trim().toUpperCase() !== 'NP')
  return {
    courses: courues.length,
    victoires: courues.filter((p) => placeNumerique(p.place) === 1).length,
    places: courues.filter((p) => {
      const n = placeNumerique(p.place)
      return n != null && n <= 3
    }).length,
    allocations: courues.reduce((s, p) => s + (montant(p.gains) ?? 0), 0),
  }
}

/** « 16 250 € », « 1,25 M€ ». */
export function euros(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2).replace('.', ',').replace(/,?0+$/, '')} M€`
  return `${Math.round(v).toLocaleString('fr-FR')} €`
}

/**
 * Nom propre à partir des capitales de France Galop : « E. ALLAIRE (S) » →
 * « E. Allaire (S) », « GOLIATH DU BERLAIS » → « Goliath du Berlais ».
 */
export function nomPropre(brut: string | null): string | null {
  if (!brut) return null
  const petits = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'et', 'd', 'l'])
  return brut
    .trim()
    .toLocaleLowerCase('fr')
    .replace(/(^|[\s\-(./])([a-zà-ÿ])/g, (_: string, sep: string, c: string) => sep + c.toLocaleUpperCase('fr'))
    // Après une apostrophe, majuscule seulement derrière une lettre seule :
    // « D'Artagnan », « L'Or », mais « King's ».
    .replace(/(^|[\s(])([a-zà-ÿ])(['’])([a-zà-ÿ])/gi, (_: string, sep: string, l: string, apo: string, c: string) =>
      sep + l.toLocaleUpperCase('fr') + apo + c.toLocaleUpperCase('fr'),
    )
    .replace(/(\s)(De|Du|Des|La|Le|Les|Et)(?=\s)/g, (m, sep: string, mot: string) =>
      petits.has(mot.toLowerCase()) ? sep + mot.toLowerCase() : m,
    )
    .replace(/\((s|S)\)/, '(S)')
    // France Galop écrit en capitales sans accent : « ECURIE ».
    .replace(/\bEcurie\b/g, 'Écurie')
}
