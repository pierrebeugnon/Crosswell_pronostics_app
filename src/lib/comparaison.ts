import type { Partant } from '@/types'

/**
 * LE COMPARATEUR — la logique pure (`design/screens/MainCompare.dc.html`).
 * Deux à trois partants d'une même course, jamais un non-partant.
 */

export const MAX_COMPARES = 3
export const MIN_COMPARES = 2

/** Ajoute ou retire un numéro ; au-delà de trois, rien ne change. */
export function basculer(numeros: readonly number[], numero: number): number[] {
  if (numeros.includes(numero)) return numeros.filter((n) => n !== numero)
  if (numeros.length >= MAX_COMPARES) return [...numeros]
  return [...numeros, numero]
}

/** La phrase de la barre, comme la maquette. */
export function indiceComparaison(n: number): string {
  if (n < MIN_COMPARES) return 'Sélectionnez au moins 2 chevaux'
  return n >= MAX_COMPARES ? '3 chevaux maximum' : 'Vous pouvez en ajouter un 3e'
}

/**
 * Les partants retenus, dans l'ordre de sélection, en écartant ceux qui ne
 * sont plus dans la course ou sont devenus non-partants depuis.
 */
export function partantsCompares(liste: readonly Partant[], numeros: readonly number[]): Partant[] {
  return numeros
    .map((n) => liste.find((p) => p.numero === n))
    .filter((p): p is Partant => p != null && !p.nonPartant)
}

/** La meilleure valeur d'une ligne (la plus haute), pour la mettre en vert ; null si rien à comparer. */
export function meilleure(valeurs: readonly (number | null | undefined)[]): number | null {
  const v = valeurs.filter((x): x is number => x != null && Number.isFinite(x))
  return v.length >= MIN_COMPARES ? Math.max(...v) : null
}
