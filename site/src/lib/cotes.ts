/**
 * LE CALCUL DU CONVERTISSEUR — `/outils/cote-probabilite`.
 *
 * Une cote se lit comme un prix : 1 ÷ cote donne la probabilité qu'elle
 * annonce. Sur une course entière, ces probabilités dépassent 100 % : l'excédent
 * est la marge de l'opérateur, et la retirer revient à diviser chaque
 * probabilité par leur somme — c'est `probasMarche` de `lib/resultats`, ici pour
 * des cotes saisies à la main.
 *
 * Aucun import d'alias : ce fichier est testé depuis la racine du dépôt.
 */

/**
 * La somme des 1 ÷ cote d'une course complète tombe presque toujours dans cette
 * fourchette (97 % des courses de galop cotées, mesuré en septembre 2026). En
 * dessous, il manque des partants dans la liste ; au-dessus, la saisie est
 * douteuse.
 */
export const SOMME_BASSE = 1.1
export const SOMME_HAUTE = 1.35

/** '3,5' ou '3.5' → 3.5 ; `null` si ce n'est pas une cote (une cote dépasse 1). */
export function lireCote(texte: string): number | null {
  const propre = texte.trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(propre)) return null
  const v = Number(propre)
  return v > 1 ? v : null
}

/** '25' ou '25 %' → 0.25 ; `null` hors de ]0 ; 100[. */
export function lireProbabilite(texte: string): number | null {
  const propre = texte.trim().replace('%', '').trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(propre)) return null
  const v = Number(propre)
  return v > 0 && v < 100 ? v / 100 : null
}

/**
 * Une liste de cotes collée telle quelle : séparées par des espaces, des
 * points-virgules ou des retours à la ligne. La virgule reste le séparateur
 * DÉCIMAL, comme on l'écrit en France : « 2,5 4 6 » se lit 2,5 ; 4 ; 6.
 */
export function lireCotes(texte: string): { cotes: number[]; rejetees: string[] } {
  const morceaux = texte.split(/[\s;]+/).filter(Boolean)
  const cotes: number[] = []
  const rejetees: string[] = []
  for (const m of morceaux) {
    const v = lireCote(m)
    if (v == null) rejetees.push(m)
    else cotes.push(v)
  }
  return { cotes, rejetees }
}

export type Diagnostic = 'incomplete' | 'normale' | 'elevee'

export interface LectureCourse {
  partants: { cote: number; annoncee: number; nette: number }[]
  /** La somme des 1 ÷ cote : 1,18 veut dire 18 % au-dessus de 100 %. */
  somme: number
  diagnostic: Diagnostic
}

/** Toute la course : ce qu'annonce chaque cote, et la même chose marge retirée. */
export function lireCourse(cotes: number[]): LectureCourse | null {
  if (cotes.length < 2) return null
  const somme = cotes.reduce((s, c) => s + 1 / c, 0)
  return {
    partants: cotes.map((cote) => ({ cote, annoncee: 1 / cote, nette: 1 / cote / somme })),
    somme,
    diagnostic: somme < SOMME_BASSE ? 'incomplete' : somme > SOMME_HAUTE ? 'elevee' : 'normale',
  }
}

/** Ce que l'adresse et le moteur lisent. Lu aussi par le build, d'où son export. */
export const TETE_OUTIL_COTE = {
  chemin: '/outils/cote-probabilite',
  titre: 'Convertir une cote en probabilité : calculateur',
  description:
    'Convertissez une cote en probabilité, retirez la marge de l’opérateur sur toute la course et vérifiez que la liste des cotes est complète.',
}
