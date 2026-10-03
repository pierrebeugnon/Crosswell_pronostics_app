import { URL_RESULTATS } from '@/config/site'

/**
 * Une seule source pour la barre du haut, le menu de téléphone et le pied de
 * page (colonne « Produit »), comme dans les maquettes `design/screens/Landing*`.
 *
 * « Nos résultats » sort vers l'application : la page y vit, derrière un
 * compte. « Tarifs » est une ancre de l'accueil ; depuis une autre page, la
 * coquille fait défiler jusqu'au fragment à l'arrivée.
 */
export interface Entree {
  libelle: string
  /** Chemin interne (`/methode`, `/#tarifs`) ou adresse externe. */
  vers: string
  externe?: boolean
  /**
   * La ligne sous le libellé, dans le menu de téléphone uniquement : il a la
   * place de dire où mène chaque entrée, l'en-tête de bureau ne l'a pas.
   */
  description?: string
}

export const ENTREES: readonly Entree[] = [
  { libelle: 'Comment ça marche', vers: '/methode', description: 'La méthode, et ce que le modèle regarde' },
  { libelle: 'Nos résultats', vers: URL_RESULTATS, externe: true, description: 'Nos performances, mois par mois' },
  { libelle: 'Blog', vers: '/blog', description: 'Méthode, analyses, hippodromes' },
  { libelle: 'Tarifs', vers: '/#tarifs', description: 'Gratuit, Pass 1 jour, mensuel, annuel' },
]

/**
 * LE MENU DE TÉLÉPHONE — `design/screens/MenuMobile`.
 *
 * Il ouvre l'accueil en plus des entrées de l'en-tête : sur téléphone, le logo
 * est la seule façon d'y revenir, et un logo ne se lit pas comme un lien.
 *
 * ÉCARTS À LA MAQUETTE, tous dus au positionnement (A8) :
 * - la maquette sous-titre le Blog « Analyses, hippodromes, jeu responsable »
 *   et pose un lien « Jeu responsable » dans le pied du menu : nous n'avons pas
 *   cette rubrique, et nous n'entrons pas dans ce champ ;
 * - son bandeau « Les jeux d'argent et de hasard peuvent être dangereux » est
 *   le message officiel des opérateurs de jeux. Crosswell n'en est pas un. À sa
 *   place, notre mention unique (`AVERTISSEMENT`), celle du pied de page ;
 * - « La page d'accueil d'Arrivée » devient la nôtre : « Arrivée » n'est que le
 *   nom des maquettes, le produit s'appelle Crosswell Pronostics ;
 * - « La méthode, les facteurs, les limites » perd « les limites » : une entrée
 *   de menu annonce ce qu'on va trouver, pas ce qu'on ne trouvera pas.
 */
export const ACCUEIL: Entree = {
  libelle: 'Accueil',
  vers: '/',
  description: 'Ce que Crosswell publie chaque matin',
}

export const MENU_MOBILE: readonly Entree[] = [ACCUEIL, ...ENTREES]

/**
 * La colonne « Légal » du pied de page. Les CGV y figurent depuis le 25/09/2026
 * en VERSION DE TRAVAIL : la case obligatoire de l'inscription y renvoyait, et
 * tombait sur un 404. La page dit ce qu'elle est et garde ses trous visibles.
 */
export const LEGAL: readonly Entree[] = [
  { libelle: 'Conditions de vente', vers: '/cgv' },
  { libelle: 'Confidentialité', vers: '/confidentialite' },
  { libelle: 'Mentions légales', vers: '/mentions-legales' },
]
