/**
 * Formatage français, recopié de l'application. Le site n'a pas de dates à
 * afficher : seuls les nombres restent.
 *
 * La cote des exemples se formate dans `lib/exemple.ts`, au format de l’app.
 */

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

/** 'LA TESTE-BA' → 'La Teste-Ba' — les hippodromes arrivent en capitales. */
export function hippodrome(nom: string | null): string {
  if (!nom || nom === '?') return 'Hippodrome inconnu'
  return nom
    .toLocaleLowerCase('fr')
    .replace(/(^|[\s'’\-/])([a-zà-ÿ])/g, (_, sep: string, c: string) => sep + c.toLocaleUpperCase('fr'))
}
