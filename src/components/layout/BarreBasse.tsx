import { NavLink, useLocation } from 'react-router-dom'
import { ONGLETS_MOBILE, ongletActif } from '@/components/layout/Navigation'

/**
 * Barre d'onglets mobile, en pastille flottante détachée du bord.
 *
 * Ce produit se consulte debout, d'une main, le matin d'une réunion : les
 * destinations doivent tomber sous le pouce, pas derrière un menu en haut à
 * gauche. La pastille flotte au lieu d'être collée en bas parce que le verre
 * n'existe qu'à condition qu'on voie le fond glisser dessous — une barre
 * pleine largeur collée au bord redevient un bandeau opaque.
 *
 * L'état actif passe par `ongletActif`, pas par l'isActive de NavLink : une
 * page course doit allumer « Réunions », même si sa route n'en descend pas.
 */
export function BarreBasse() {
  const { pathname } = useLocation()

  return (
    <nav
      className="md:hidden fixed inset-x-0 z-40 flex justify-center px-4 pointer-events-none"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
      aria-label="Navigation"
    >
      <ul className="glass-strong pointer-events-auto grid grid-cols-4 gap-1 rounded-full p-1.5 w-full max-w-sm">
        {ONGLETS_MOBILE.map((o) => {
          const actif = ongletActif(o.to, pathname)
          return (
            <li key={o.to}>
              <NavLink
                to={o.to}
                aria-current={actif ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-1 min-h-[3.25rem] py-2 rounded-full
                   text-[0.625rem] font-medium transition-all ${
                     actif ? 'bg-white/[0.1] text-accent' : 'text-faint hover:text-muted'
                   }`}
              >
                <o.icone size={18} strokeWidth={actif ? 2.4 : 1.9} />
                <span>{o.libelle}</span>
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
