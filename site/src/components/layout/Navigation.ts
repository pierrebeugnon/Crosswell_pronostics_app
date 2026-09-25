import { URL_RESULTATS } from '@/config/site'

/**
 * Une seule source pour la barre du haut et le pied de page (colonne
 * « Produit »), comme dans les maquettes `design/screens/Landing*`.
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
}

export const ENTREES: readonly Entree[] = [
  { libelle: 'Comment ça marche', vers: '/methode' },
  { libelle: 'Nos résultats', vers: URL_RESULTATS, externe: true },
  { libelle: 'Tarifs', vers: '/#tarifs' },
]

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
