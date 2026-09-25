import { Link, useLocation } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { IconeCalendrier, IconeCompte } from '@/components/layout/IconesNavigation'
import { ONGLETS_HAUT, ongletActif } from '@/components/layout/Navigation'
import { useAuth } from '@/auth/AuthContext'
import { dateEnTete, dateEnTeteCourte } from '@/lib/format'
import { initiales } from '@/lib/prenom'
import { useHeureParis } from '@/lib/useHeureParis'

/**
 * L'en-tête des maquettes : logo et navigation à gauche, date du jour et
 * pastille de compte à droite. Opaque et collé en haut : sans verre, il n'y a
 * plus rien à voir au travers.
 *
 * Le bouton « rafraîchir » a disparu avec la refonte : les données se
 * rechargent seules (minuterie et retour d'onglet, voir DonneesContext).
 *
 * Sur téléphone, la navigation passe dans la barre du bas ; il ne reste ici
 * que le logo et la date courte, comme dans `design/screens/Mobile.dc.html`.
 */
export function BarreHaute() {
  const { pathname } = useLocation()
  const { jour } = useHeureParis()
  const { prenom, email } = useAuth()
  const lettres = initiales(prenom, email)
  const compteActif = ongletActif('/compte', pathname)

  return (
    <header className="sticky top-0 z-40 border-b border-sep bg-canvas">
      <div className="mx-auto max-w-content px-5 md:px-10 h-16 md:h-[4.75rem] flex items-center gap-12">
        <Link to="/" className="tap shrink-0 rounded-xl" aria-label="Crosswell Pronostics, accueil">
          <Logo />
        </Link>

        {/* L'état actif passe par `ongletActif` : une page course allume
            « Courses », même si sa route n'en descend pas. */}
        <nav className="hidden md:flex items-center gap-2" aria-label="Navigation principale">
          {ONGLETS_HAUT.map((o) => {
            const actif = ongletActif(o.to, pathname)
            return (
              <Link
                key={o.to}
                to={o.to}
                aria-current={actif ? 'page' : undefined}
                className={`h-10 px-[1.125rem] inline-flex items-center rounded-full text-sm transition-colors ${
                  actif ? 'bg-raised text-ink font-bold' : 'text-muted font-semibold hover:text-accent'
                }`}
              >
                {o.libelle}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2.5 text-faint text-sm font-semibold">
          <IconeCalendrier size={18} className="hidden md:block" />
          <span className="num hidden md:inline">{dateEnTete(jour)}</span>
          <span className="num md:hidden text-[0.8125rem]">{dateEnTeteCourte(jour)}</span>
          <Link
            to="/compte"
            aria-label="Mon compte"
            aria-current={compteActif ? 'page' : undefined}
            className={`hidden md:grid ml-3.5 w-10 h-10 place-items-center rounded-full border text-sm font-bold transition-colors ${
              compteActif
                ? 'bg-accent text-accent-ink border-accent'
                : 'bg-raised text-ink border-line-strong hover:border-line-hover'
            }`}
          >
            {lettres ?? <IconeCompte size={18} />}
          </Link>
        </div>
      </div>
    </header>
  )
}
