/**
 * Formatage français, recopié de l'application.
 *
 * Les dates y sont entrées le 18/10/2026, avec les pages de résultats : le site
 * n'en affichait aucune jusque-là.
 *
 * La cote des exemples se formate dans `lib/exemple.ts`, au format de l’app.
 */

const JOUR_LONG = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

/**
 * '2026-10-16' → 'vendredi 16 octobre 2026'.
 *
 * Lu en UTC À DESSEIN : la chaîne porte un jour civil, pas un instant. Laisser
 * le fuseau de la machine l'interpréter ferait basculer la date d'un jour selon
 * l'endroit où le rendu a lieu — et le rendu aura lieu des deux côtés.
 */
export function jourLong(jour: string): string {
  const [a, m, j] = jour.split('-').map(Number)
  // « 1er », pas « 1 ». `Intl` avec `day: 'numeric'` rend toujours « 1 », y
  // compris en `dateStyle: 'full'` : l'ordinal français du premier du mois
  // n'existe nulle part dans l'API, il faut le poser soi-même. Passer par
  // `formatToParts` plutôt que par un remplacement sur la chaîne finale, qui
  // toucherait aussi le « 1 » d'un millésime comme 2031.
  return JOUR_LONG.formatToParts(new Date(Date.UTC(a, m - 1, j)))
    .map((p) => (p.type === 'day' && p.value === '1' ? '1er' : p.value))
    .join('')
}

/**
 * '2026-10-16' → '16 octobre 2026' — la date sans le jour de la semaine.
 *
 * Pour les titres de page : « vendredi » coûte huit signes sur les soixante que
 * Google affiche, et c'est lui qui faisait couper la marque. Le jour de la
 * semaine reste dans le H1 et dans la description, où la place ne manque pas.
 */
export function jourSansSemaine(jour: string): string {
  return jourLong(jour).replace(/^\S+\s/, '')
}

/** '2026-10-16' → '16 octobre' — pour les listes et les liens. */
export function jourCourt(jour: string): string {
  return jourSansSemaine(jour).replace(/\s\d{4}$/, '')
}

/**
 * '2026-10-16' → '16/10/2026' — pour les titres de course. Un même prix revient
 * chaque année : la date les distingue, et l'année doit y rester.
 */
export function jourChiffres(jour: string): string {
  const [a, m, j] = jour.split('-')
  return `${j}/${m}/${a}`
}

/** '2026-10' → 'octobre 2026' — l'intitulé d'un mois dans les archives. */
export function moisLong(mois: string): string {
  return jourSansSemaine(`${mois}-15`).replace(/^15\s/, '')
}

/**
 * 0.2837 → '28 %', espace INSÉCABLE avant « % » (écrite en échappement) : un
 * « % » seul en début de ligne ne se lit pas. `decimales` pour les écarts fins.
 */
export function pourcent(v: number | null | undefined, decimales = 0): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return `${(v * 100).toFixed(decimales).replace('.', ',')}\u00a0%`
}

export function distance(m: number | null): string {
  return m == null ? '—' : `${m.toLocaleString('fr-FR')} m`
}

/**
 * Met en casse de titre un libellé qui arrive tout en capitales.
 *
 * La base garde la graphie de sa source : « LA TESTE-BA », « PRIX FRANCOIS DE
 * CHEVIGNY ». Les maquettes écrivent « Prix… », et un titre de page tout en
 * capitales se lit comme du tapage dans un résultat de recherche.
 */
export const casseDeTitre = (nom: string) =>
  nom
    .toLocaleLowerCase('fr')
    // Les séparateurs incluent la PARENTHÈSE et le CROISILLON : sans eux,
    // « PRIX LE CALVADOS (PRIX ASHMORE) » ressortait « … (prix Ashmore) », une
    // minuscule au milieu d'un nom propre — relevé sur 11 titres sur 81.
    .replace(/(^|[\s'’\-/([«"#.])([a-zà-ÿ])/g, (_, sep: string, c: string) => sep + c.toLocaleUpperCase('fr'))
    // Les particules redescendent en minuscule quand elles ne commencent pas le
    // nom : « Prix De Seine-Et-Oise » se lit mal et, surtout, ce n'est pas la
    // graphie sous laquelle un lecteur cherche la course.
    //
    // LA LISTE S'ARRÊTE AUX PARTICULES SÛRES. Ni « La » ni « Le », qui font
    // partie du nom propre dans « Prix La Force », « Prix La Rochette »,
    // « Prix Le Calvados » : les rabaisser produirait une faute là où la règle
    // générale en corrige une autre.
    .replace(/(\s)(De|Du|Des|Et|Au|Aux|À)(?=[\s'’\-/)\].,]|$)/g, (_, sep: string, mot: string) =>
      sep + mot.toLocaleLowerCase('fr'),
    )
    .replace(/(\s)([DL])(['’])/g, (_, sep: string, lettre: string, apo: string) =>
      sep + lettre.toLocaleLowerCase('fr') + apo,
    )
    // Dans un nom composé, la particule PRISE ENTRE DEUX TRAITS D'UNION est
    // minuscule : « Seine-et-Oise », « Fresnay-le-Buffard ». Le trait d'union
    // qui suit est exigé, pour ne pas toucher « Saint-Cloud » ni « Royal-Oak ».
    .replace(/(-)(De|Du|Des|Et|Le|La|Les)(?=-)/g, (_, sep: string, mot: string) =>
      sep + mot.toLocaleLowerCase('fr'),
    )

/**
 * Les graphies de la source qu'une mise en casse ne sauve pas, et que le lecteur
 * chercherait autrement. Seul l'affichage change : les adresses se calculent sur
 * le nom de la base, et ne bougent donc pas.
 */
const HIPPODROMES: Record<string, string> = {
  PARISLONGCHAMP: 'ParisLongchamp',
  COMPIEGNE: 'Compiègne',
  'BDX LE BOUSCAT': 'Bordeaux-Le Bouscat',
  'MAR.BORELY': 'Marseille-Borély',
}

/** 'LA TESTE-BA' → 'La Teste-Ba' — les hippodromes arrivent en capitales. */
export function hippodrome(nom: string | null): string {
  if (!nom || nom === '?') return 'Hippodrome inconnu'
  return HIPPODROMES[nom] ?? casseDeTitre(nom)
}

/**
 * 'PRIX FRANCOIS DE CHEVIGNY' → 'Prix Francois De Chevigny'.
 *
 * Le repli porte le numéro de course : une course sans nom existe, et
 * « Course 3 » se lit mieux qu'un blanc. Utilisé par l'affichage ET par le
 * titre servi au robot (`lib/resultats-seo`), pour qu'ils ne divergent pas.
 */
export function nomCourse(nom: string | null, numero: number): string {
  return nom ? casseDeTitre(nom) : `Course ${numero}`
}

const PASTILLE = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

/**
 * '2026-10-20' → 'mar. 20' — le libellé court d'une pastille de journée.
 *
 * Lu en UTC pour la même raison que `jourLong` : la chaîne porte un jour civil,
 * et le rendu a lieu des deux côtés.
 */
export function jourPastille(jour: string): string {
  const [a, m, j] = jour.split('-').map(Number)
  return PASTILLE.format(new Date(Date.UTC(a, m - 1, j)))
}
