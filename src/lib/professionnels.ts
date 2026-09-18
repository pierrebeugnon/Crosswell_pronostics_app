import type { RolePro, StatPro } from '@/types'
import { discipline } from '@/lib/fiche'

/**
 * LES FICHES JOCKEY ET ENTRAÎNEUR — la logique pure : saison affichée,
 * indicateurs, victoires par mois, découpages, libellés. Les agrégats arrivent
 * de la base (`db/005_fiches_professionnels.sql`) ; ici on ne fait que sommer.
 */

export const LIBELLES_ROLE: Record<RolePro, { titre: string; unite: string; uniteSingulier: string; pluriel: string }> = {
  jockey: { titre: 'Jockey', unite: 'montes', uniteSingulier: 'monte', pluriel: 'jockeys' },
  entraineur: { titre: 'Entraîneur', unite: 'partants', uniteSingulier: 'partant', pluriel: 'entraîneurs' },
}

/** L'adresse d'une fiche. Le nom est la clé : France Galop n'expose pas d'identifiant. */
export function lienPro(role: RolePro, nom: string): string {
  return `/${role === 'jockey' ? 'jockeys' : 'entraineurs'}/${encodeURIComponent(nom)}`
}

/** « L. ZULIANI » → « LZ » ; « E. ALLAIRE (S) » → « EA ». */
export function initialesPro(nom: string): string {
  const mots = nom
    .replace(/\(.*?\)/g, ' ')
    .split(/[\s.\-]+/)
    .filter((m) => /\p{L}/u.test(m))
  const lettres = [mots[0], mots[mots.length - 1]].filter(Boolean).map((m) => [...m][0])
  return lettres.join('').toLocaleUpperCase('fr-FR') || '?'
}

/** L'année affichée : la saison en cours si elle a déjà des courses, sinon la précédente. */
export function saison(stats: StatPro[], anneeCourante: number): number {
  return stats.some((s) => s.annee === anneeCourante && s.montes > 0) ? anneeCourante : anneeCourante - 1
}

export interface Indicateurs {
  montes: number
  victoires: number
  places: number
  allocations: number
  /** Victoires / montes. */
  reussite: number
  /** Dans les trois (victoires + 2e + 3e) / montes. */
  place: number
}

export function indicateurs(stats: StatPro[]): Indicateurs {
  const t = stats.reduce(
    (a, s) => ({
      montes: a.montes + s.montes,
      victoires: a.victoires + s.victoires,
      places: a.places + s.places,
      allocations: a.allocations + s.allocations,
    }),
    { montes: 0, victoires: 0, places: 0, allocations: 0 },
  )
  return {
    ...t,
    reussite: t.montes ? t.victoires / t.montes : 0,
    place: t.montes ? (t.victoires + t.places) / t.montes : 0,
  }
}

/** Les victoires de chaque mois, de janvier au dernier mois écoulé de la saison. */
export function victoiresParMois(stats: StatPro[], annee: number, jour: string): { mois: number; victoires: number; montes: number }[] {
  const dernier = Number(jour.slice(0, 4)) === annee ? Number(jour.slice(5, 7)) : 12
  return Array.from({ length: dernier }, (_, i) => {
    const du = stats.filter((s) => s.mois === i + 1)
    return {
      mois: i + 1,
      victoires: du.reduce((n, s) => n + s.victoires, 0),
      montes: du.reduce((n, s) => n + s.montes, 0),
    }
  })
}

export interface Tranche {
  libelle: string
  montes: number
  reussite: number
}

function grouper(stats: StatPro[], cle: (s: StatPro) => string | null): Tranche[] {
  const g = new Map<string, { montes: number; victoires: number }>()
  for (const s of stats) {
    const k = cle(s)
    if (!k) continue
    const v = g.get(k) ?? { montes: 0, victoires: 0 }
    v.montes += s.montes
    v.victoires += s.victoires
    g.set(k, v)
  }
  return [...g.entries()]
    .filter(([, v]) => v.montes > 0)
    .map(([libelle, v]) => ({ libelle, montes: v.montes, reussite: v.victoires / v.montes }))
    .sort((a, b) => b.montes - a.montes)
}

/** Réussite par discipline (Plat, Haies, Steeple, Cross), de la plus courue à la moins courue. */
export function parDiscipline(stats: StatPro[]): Tranche[] {
  return grouper(stats, (s) => discipline(s.specialite))
}

/** Réussite sur les hippodromes les plus fréquentés. */
export function parHippodrome(stats: StatPro[], n = 5): Tranche[] {
  return grouper(stats, (s) => s.hippodrome).slice(0, n)
}

/** « Plat » ou « Obstacle », selon où se fait la majorité des courses. */
export function specialitePrincipale(stats: StatPro[]): 'Plat' | 'Obstacle' | null {
  let plat = 0
  let obstacle = 0
  for (const s of stats) {
    if ((s.specialite ?? '').toUpperCase() === 'P') plat += s.montes
    else if (s.specialite) obstacle += s.montes
  }
  if (plat + obstacle === 0) return null
  return plat >= obstacle ? 'Plat' : 'Obstacle'
}

/**
 * La catégorie d'une victoire de palmarès : « GR.I » → « Gr. 1 », « GR.III PA »
 * → « Gr. 3 PA », « LISTED » → « Listed ». PA : pur-sang arabe ; AQ : AQPS.
 */
export function grade(categorie: string | null): string {
  if (!categorie) return ''
  const c = categorie.trim().toUpperCase()
  const suffixe = c.match(/\s(PA|AQ)$/)?.[1]
  const base = c.startsWith('LISTED')
    ? 'Listed'
    : c.startsWith('GR.III')
      ? 'Gr. 3'
      : c.startsWith('GR.II')
        ? 'Gr. 2'
        : c.startsWith('GR.I')
          ? 'Gr. 1'
          : categorie
  return suffixe ? `${base} ${suffixe}` : base
}
