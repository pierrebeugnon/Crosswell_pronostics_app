import { FUSEAU } from '@/config/app'

const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
/** Noms de mois en toutes lettres, partagés : un seul endroit à relire. */
export const MOIS_LONG = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']

/** `en-CA` compose nativement AAAA-MM-JJ ; le fuseau est forcé sur Paris. */
const JOUR_PARIS = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSEAU,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/**
 * Date du jour au format ISO, À PARIS, décalée de `decalage` jours.
 *
 * Deux pièges évités. `toISOString()` bascule en UTC : passé minuit en été, il
 * renvoie encore la veille jusqu'à 2 h. Et le fuseau du navigateur fait dépendre
 * « aujourd'hui » de l'endroit où se trouve le client — or une fenêtre de trente
 * jours doit valoir la même chose pour tous.
 */
export function jourISO(decalage = 0): string {
  return decalerJour(jourParis(new Date()), decalage)
}

/** Le jour civil de Paris ('AAAA-MM-JJ') d'un instant donné — mêmes pièges évités que `jourISO`. */
export function jourParis(d: Date): string {
  return JOUR_PARIS.format(d)
}

/**
 * '2026-09-14' + n jours. Calcul en UTC pur sur la date civile : aucun passage
 * à l'heure d'été ne peut faire sauter ou doubler un jour.
 */
export function decalerJour(iso: string, n: number): string {
  const [a, m, j] = iso.split('-').map(Number)
  const d = new Date(Date.UTC(a, m - 1, j + n))
  return d.toISOString().slice(0, 10)
}

/** '2026-08-26' → '26 août' */
export function dateCourte(iso: string): string {
  const [, m, j] = iso.split('-')
  return `${Number(j)} ${MOIS[Number(m) - 1]}`
}

/** '2026-08-26' → 'mercredi 26 août 2026' */
export function dateLongue(iso: string): string {
  const [a, m, j] = iso.split('-').map(Number)
  const jour = JOURS[new Date(a, m - 1, j).getDay()]
  return `${jour} ${j} ${MOIS_LONG[m - 1]} ${a}`
}

const capitale = (s: string) => s.charAt(0).toLocaleUpperCase('fr-FR') + s.slice(1)

/** '2026-09-18' → 'Vendredi 18 septembre' — la date de l'en-tête, sans l'année. */
export function dateEnTete(iso: string): string {
  const [a, m, j] = iso.split('-').map(Number)
  return capitale(`${JOURS[new Date(a, m - 1, j).getDay()]} ${j} ${MOIS_LONG[m - 1]}`)
}

/** '2026-09-18' → 'Ven. 18 sept.' — la même, pour un téléphone. */
export function dateEnTeteCourte(iso: string): string {
  const [a, m, j] = iso.split('-').map(Number)
  return capitale(`${JOURS[new Date(a, m - 1, j).getDay()].slice(0, 3)}. ${j} ${MOIS[m - 1]}`)
}

/** 'aujourd’hui', 'demain', 'hier', sinon la date courte. */
export function dateRelative(iso: string): string {
  if (iso === jourISO(0)) return "aujourd'hui"
  if (iso === jourISO(1)) return 'demain'
  if (iso === jourISO(-1)) return 'hier'
  return dateCourte(iso)
}

/** 'LA TESTE-BA' → 'La Teste-Ba' — les hippodromes arrivent en capitales. */
export function hippodrome(nom: string | null): string {
  if (!nom || nom === '?') return 'Hippodrome inconnu'
  return nom
    .toLocaleLowerCase('fr')
    .replace(/(^|[\s'’\-/])([a-zà-ÿ])/g, (_, sep: string, c: string) => sep + c.toLocaleUpperCase('fr'))
}

/** 0.2837 → '28 %'. `decimales` pour les écarts fins. */
export function pourcent(v: number | null | undefined, decimales = 0): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return `${(v * 100).toFixed(decimales).replace('.', ',')} %`
}

/** Un ratio déjà exprimé en points (28.37 → '28 %'). */
export function points(v: number | null | undefined, decimales = 0): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return `${v.toFixed(decimales).replace('.', ',')} %`
}

/** Toujours signé — un écart au marché n'a de sens qu'avec son signe. */
export function signe(v: number | null | undefined, decimales = 1): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const s = (v * 100).toFixed(decimales).replace('.', ',')
  return v > 0 ? `+${s}` : s
}

export function cote(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return v.toFixed(1).replace('.', ',')
}

export function distance(m: number | null): string {
  return m == null ? '—' : `${m.toLocaleString('fr-FR')} m`
}

/** 1 → '1er', 2 → '2e' */
export function rang(n: number | null | undefined): string {
  if (n == null) return '—'
  return n === 1 ? '1er' : `${n}e`
}

/**
 * « à » suivi d'un nom d'hippodrome, avec l'élision qui va bien.
 *
 * Les noms d'hippodromes portent souvent leur article : Le Touquet, La Teste,
 * Les Sables. Composer « à » + le nom donne « à Le Touquet », faute qui saute
 * aux yeux d'un lecteur français et décrédibilise une page entière de chiffres
 * justes. On contracte donc comme la langue le fait.
 */
export function aHippodrome(nom: string | null): string {
  const propre = hippodrome(nom)
  if (propre.startsWith('Le ')) return `au ${propre.slice(3)}`
  if (propre.startsWith('Les ')) return `aux ${propre.slice(4)}`
  if (propre.startsWith('La ') || propre.startsWith("L'")) return `à ${propre}`
  return `à ${propre}`
}

/** Libellé complet d'une tranche de distance, bornes comprises.
 *
 *  La vue SQL renvoie des libellés courts (« Sprint »), et l'agrégation côté
 *  application des libellés bornés (« Sprint (< 1 400 m) »). Les deux se
 *  croisent sur la page d'un hippodrome : sans ce pont, le même écran nomme la
 *  même tranche de deux façons, et le lecteur croit à deux mesures distinctes. */
const BORNES_TRANCHE: Record<string, string> = {
  Sprint: 'Sprint (< 1 400 m)',
  Mile: 'Mile (1 400 – 1 800 m)',
  'Intermédiaire': 'Intermédiaire (1 800 – 2 200 m)',
  Tenue: 'Tenue (> 2 200 m)',
}

export function trancheComplete(courte: string): string {
  return BORNES_TRANCHE[courte] ?? courte
}
