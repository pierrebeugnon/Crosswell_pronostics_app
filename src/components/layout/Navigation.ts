import {
  IconeAccueil,
  IconeCompte,
  IconeCourses,
  IconeResultats,
} from '@/components/layout/IconesNavigation'

/**
 * Une seule source pour la barre du haut et celle du bas : deux listes qui
 * divergent est le premier défaut qu'on remarque en changeant de format.
 *
 * D'après les maquettes (`design/`) : en haut, les destinations de contenu,
 * le compte passant par la pastille d'initiales à droite ; en bas, sur
 * téléphone, les mêmes plus le compte. « Mes suivis » n'y figure pas encore :
 * la fonction n'existe pas (design/INTEGRATION.md, A7).
 *
 * `court` : le libellé sous l'icône, dans la barre du bas.
 */
export const ONGLETS = [
  { to: '/', libelle: 'Accueil', court: 'Accueil', icone: IconeAccueil, haut: true, bas: true },
  { to: '/courses', libelle: 'Courses', court: 'Courses', icone: IconeCourses, haut: true, bas: true },
  { to: '/resultats', libelle: 'Nos résultats', court: 'Résultats', icone: IconeResultats, haut: true, bas: true },
  { to: '/compte', libelle: 'Compte', court: 'Compte', icone: IconeCompte, haut: false, bas: true },
] as const

/** Les destinations de la barre du haut (grand écran). */
export const ONGLETS_HAUT = ONGLETS.filter((o) => o.haut)

/** Les destinations de la barre d'onglets mobile. */
export const ONGLETS_MOBILE = ONGLETS.filter((o) => o.bas)

/**
 * Les réunions des jours passés, la fiche d'un partant et celles des jockeys et
 * entraîneurs APPARTIENNENT au parcours « Courses » : sans ce rattachement, aucun onglet ne s'allumait sur
 * ces pages, et la barre disait « vous n'êtes nulle part ». NavLink ne sait
 * juger que par préfixe d'URL ; les deux barres passent donc par cette fonction.
 */
export function ongletActif(to: string, pathname: string): boolean {
  if (to === '/') return pathname === '/'
  if (to === '/courses') {
    return (
      pathname.startsWith('/reunions') ||
      pathname.startsWith('/courses') ||
      pathname.startsWith('/partants') ||
      pathname.startsWith('/jockeys') ||
      pathname.startsWith('/entraineurs')
    )
  }
  return pathname.startsWith(to)
}
