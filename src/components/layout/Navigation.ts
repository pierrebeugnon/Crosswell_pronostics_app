import { BarChart3, CalendarDays, Home, MapPin, User } from 'lucide-react'

/**
 * Une seule source pour la barre du haut et celle du bas : deux listes qui
 * divergent est le premier défaut qu'on remarque en changeant de format.
 *
 * `principal` départage les deux barres. Sur grand écran, cinq entrées tiennent
 * sans se serrer ; dans la pastille flottante d'un téléphone, une cinquième
 * ramènerait chaque onglet sous les 60 px de large et l'étiquette passerait à
 * la ligne. Les hippodromes se consultent à froid, pas en courant avant une
 * réunion : c'est l'entrée qu'on retire du pouce.
 */
export const ONGLETS = [
  { to: '/', libelle: "Aujourd'hui", icone: Home, exact: true, principal: true },
  { to: '/reunions', libelle: 'Réunions', icone: CalendarDays, exact: false, principal: true },
  { to: '/hippodromes', libelle: 'Hippodromes', icone: MapPin, exact: false, principal: false },
  { to: '/resultats', libelle: 'Nos résultats', icone: BarChart3, exact: false, principal: true },
  { to: '/compte', libelle: 'Compte', icone: User, exact: false, principal: true },
] as const

/** Les quatre destinations de la barre d'onglets mobile. */
export const ONGLETS_MOBILE = ONGLETS.filter((o) => o.principal)

/**
 * Une course et une fiche partant APPARTIENNENT au parcours « Réunions » même
 * si leurs routes ne descendent pas de /reunions : sans ce rattachement, aucun
 * onglet n'était allumé sur les pages les plus consultées du produit, et la
 * barre disait « vous n'êtes nulle part ». NavLink ne sait juger que par
 * préfixe d'URL ; les deux barres passent donc par cette fonction.
 */
export function ongletActif(to: string, pathname: string): boolean {
  if (to === '/') return pathname === '/'
  if (to === '/reunions') {
    return (
      pathname.startsWith('/reunions') ||
      pathname.startsWith('/courses') ||
      pathname.startsWith('/partants')
    )
  }
  return pathname.startsWith(to)
}
