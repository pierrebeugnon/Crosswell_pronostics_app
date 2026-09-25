import { Link, useLocation } from 'react-router-dom'
import { ONGLETS_MOBILE, ongletActif } from '@/components/layout/Navigation'

/**
 * La barre d'onglets mobile des maquettes : pleine largeur, collée en bas,
 * opaque, séparée du contenu par un filet. Icône de 22 px et libellé de 11 px ;
 * l'onglet actif passe au vert et en gras.
 *
 * L'état actif passe par `ongletActif`, et par de simples Link : NavLink
 * écraserait notre aria-current dès que l'adresse ne commence pas par la
 * sienne (les réunions passées allument « Courses »).
 */
export function BarreBasse() {
  const { pathname } = useLocation()

  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-sep bg-canvas"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Navigation"
    >
      <ul
        className="grid h-[4.25rem]"
        style={{ gridTemplateColumns: `repeat(${ONGLETS_MOBILE.length}, minmax(0, 1fr))` }}
      >
        {ONGLETS_MOBILE.map((o) => {
          const actif = ongletActif(o.to, pathname)
          return (
            <li key={o.to} className="flex">
              <Link
                to={o.to}
                aria-current={actif ? 'page' : undefined}
                className={`flex-1 flex flex-col items-center justify-center gap-1 text-[0.6875rem] transition-colors ${
                  actif ? 'text-accent font-bold' : 'text-faint font-semibold hover:text-muted'
                }`}
              >
                <o.icone size={22} />
                <span>{o.court}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
