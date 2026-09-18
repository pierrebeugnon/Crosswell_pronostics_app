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

/** La colonne « Légal » du pied de page. Pas de CGU tant qu'elles ne sont pas rédigées. */
export const LEGAL: readonly Entree[] = [
  { libelle: 'Confidentialité', vers: '/confidentialite' },
  { libelle: 'Mentions légales', vers: '/mentions-legales' },
]
