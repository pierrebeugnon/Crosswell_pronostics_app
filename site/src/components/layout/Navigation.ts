/**
 * Une seule source pour la barre du haut, le menu de téléphone et le pied de
 * page (colonne « Produit »), comme dans les maquettes `design/screens/Landing*`.
 *
 * « Résultats » MÈNE AU SITE, et non plus à l'application. L'entrée sortait
 * vers `URL_RESULTATS` tant que le site n'avait pas de page de résultats : il
 * en a une depuis le 19/10/2026, rendue côté serveur, avec les arrivées, les
 * jockeys et ce que le modèle avait annoncé. Envoyer le visiteur derrière un
 * compte pour voir des courses déjà courues revenait à lui fermer la porte
 * qu'on vient d'ouvrir — et à priver le site de sa page la plus indexable.
 *
 * `URL_RESULTATS` sert toujours, mais depuis la page elle-même : « Le détail,
 * filtre par filtre » renvoie aux statistiques de l'application, qui ne sont
 * pas la même chose que les arrivées du jour.
 *
 * « Tarifs » est une ancre de l'accueil ; depuis une autre page, la coquille
 * fait défiler jusqu'au fragment à l'arrivée.
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
  { libelle: 'Résultats', vers: '/resultats', description: 'Les arrivées du jour, et ce que nous avions annoncé' },
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
