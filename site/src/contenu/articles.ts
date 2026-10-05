import type { ComponentType } from 'react'
import metadonnees from '@/contenu/articles.json'
import ArcDeTriomphe2026Daryz from '@/contenu/articles/arc-de-triomphe-2026-daryz'
import ComprendreCrosswell from '@/contenu/articles/comprendre-crosswell'

/**
 * LE CATALOGUE DU BLOG — `design/screens/Blog*.dc.html`.
 *
 * Les articles vivent dans le dépôt, un fichier par article, et ce catalogue
 * les ordonne. Pas de système de gestion de contenu : à ce rythme de
 * publication, une base de plus coûterait plus qu'elle ne rapporte, et un
 * article en TypeScript se relit en revue de code comme le reste.
 *
 * CE FICHIER EST AUSSI LA SOURCE DU RÉFÉRENCEMENT : `scripts/apres-build.mjs`
 * le lit pour écrire une vraie page HTML par article (titre, description,
 * canonique, données structurées) et les ajouter au `sitemap.xml`. Un article
 * absent d'ici n'existe pour personne.
 *
 * LES RUBRIQUES de la maquette sont reprises, SAUF « Jeu responsable » : le
 * positionnement exclut ce champ (voir AVERTISSEMENT dans `config/site.ts` et
 * l'arbitrage A8 de `design/INTEGRATION.md`). Crosswell n'est pas opérateur de
 * jeux et ne conseille aucune action ; une rubrique sur le budget de mise
 * n'aurait pas sa place ici.
 */

export const RUBRIQUES = ['Méthode', 'Analyses', 'Hippodromes', 'Produit'] as const
export type Rubrique = (typeof RUBRIQUES)[number]

/** Une entrée du sommaire : l'ancre doit exister dans le corps de l'article. */
export interface Section {
  id: string
  titre: string
}

export interface Article {
  /** Dernier segment de l'adresse : `/blog/<slug>`. Jamais modifié après publication. */
  slug: string
  rubrique: Rubrique
  titre: string
  /** Le chapô, repris sous le titre et dans la carte de l'index. */
  chapo: string
  /** Date de publication, ISO. Sert au tri, à l'affichage et aux données structurées. */
  date: string
  /** Durée de lecture annoncée, en minutes. Comptée, pas inventée. */
  minutes: number
  /** Mis en avant sur l'index, dans le bloc « À la une ». Un seul à la fois. */
  aLaUne?: boolean
  /**
   * L'image de couverture, servie depuis `public/`. `alt` décrit la photo pour
   * qui ne la voit pas, et ne doit RIEN affirmer sur Crosswell : une photo
   * d'illustration n'est pas une preuve, et un `alt` est du texte indexé comme
   * un autre — le vocabulaire banni s'y applique. Facultative : sans elle,
   * l'article retombe sur l'aplat de marque.
   */
  couverture?: {
    fichier: string
    alt: string
    /**
     * Le point de l'image gardé quand le cadre la rogne (`object-position`,
     * ex. « 50% 80% »). Le bandeau de tête est bien plus large que haut sur
     * grand écran : sans cadrage, une photo dont le sujet est en bas perd le
     * sujet. Facultatif — centré par défaut.
     */
    cadrage?: string
  }
  /** Ce que lisent les moteurs : titre ≤ 60 signes, description ≤ 155. */
  seo: { titre: string; description: string }
  sections: Section[]
  Contenu: ComponentType
}

/**
 * LE CORPS DE CHAQUE ARTICLE, par slug. Les métadonnées, elles, vivent dans
 * `articles.json` : c'est le SEUL fichier que `scripts/apres-build.mjs` sait
 * lire, et il faut une source unique — un titre recopié à deux endroits finit
 * toujours par diverger, et c'est alors le moteur de recherche qui voit l'autre.
 */
const CORPS: Record<string, ComponentType> = {
  'arc-de-triomphe-2026-daryz-analyse-statistique': ArcDeTriomphe2026Daryz,
  'comprendre-crosswell-pronostics-hippiques-statistiques': ComprendreCrosswell,
}

export const ARTICLES: readonly Article[] = (metadonnees as Omit<Article, 'Contenu'>[])
  .filter((a) => CORPS[a.slug])
  .map((a) => ({ ...a, Contenu: CORPS[a.slug] }))

/** Les articles du plus récent au plus ancien — l'ordre de l'index. */
export const articlesRecents = (): Article[] =>
  [...ARTICLES].sort((a, b) => b.date.localeCompare(a.date))

export const articleParSlug = (slug: string): Article | undefined =>
  ARTICLES.find((a) => a.slug === slug)

/** Les rubriques qui portent au moins un article : inutile d'offrir un filtre vide. */
export const rubriquesUtilisees = (): Rubrique[] =>
  RUBRIQUES.filter((r) => ARTICLES.some((a) => a.rubrique === r))

/**
 * « À lire ensuite » : même rubrique d'abord, complété par les plus récents.
 * Trois au maximum, comme la maquette, et jamais l'article courant.
 */
export function articlesLies(article: Article, maximum = 3): Article[] {
  const autres = articlesRecents().filter((a) => a.slug !== article.slug)
  const memeRubrique = autres.filter((a) => a.rubrique === article.rubrique)
  const reste = autres.filter((a) => a.rubrique !== article.rubrique)
  return [...memeRubrique, ...reste].slice(0, maximum)
}
