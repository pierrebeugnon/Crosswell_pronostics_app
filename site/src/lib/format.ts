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
  return JOUR_LONG.format(new Date(Date.UTC(a, m - 1, j)))
}

/** '2026-10-16' → '16 octobre' — pour les listes et les liens. */
export function jourCourt(jour: string): string {
  return jourLong(jour).replace(/^\S+\s/, '').replace(/\s\d{4}$/, '')
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

/** 'LA TESTE-BA' → 'La Teste-Ba' — les hippodromes arrivent en capitales. */
export function hippodrome(nom: string | null): string {
  if (!nom || nom === '?') return 'Hippodrome inconnu'
  return nom
    .toLocaleLowerCase('fr')
    .replace(/(^|[\s'’\-/])([a-zà-ÿ])/g, (_, sep: string, c: string) => sep + c.toLocaleUpperCase('fr'))
}
