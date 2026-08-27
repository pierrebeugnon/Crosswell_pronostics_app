import { Link, NavLink, useLocation } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { ONGLETS, ongletActif } from '@/components/layout/Navigation'
import { useDonnees } from '@/data/DonneesContext'

function heure(d: Date) {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

/**
 * La barre reste collée en haut et laisse voir le fond au travers. C'est ce
 * qui justifie le `backdrop-filter` ici plus qu'ailleurs : sans lui, le texte
 * de la page passerait sous une bande transparente et deviendrait illisible
 * pendant le défilement.
 */
export function BarreHaute() {
  const { majLe, chargement, rafraichir } = useDonnees()
  const { pathname } = useLocation()

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-canvas/60 backdrop-blur-2xl">
      <div className="mx-auto max-w-content px-4 sm:px-6 h-14 sm:h-16 flex items-center gap-6">
        <Link to="/" className="tap shrink-0 rounded-xl" aria-label="Crosswell Pronostics, accueil">
          <Logo />
        </Link>

        {/* L'état actif passe par `ongletActif` : une page course allume
            « Réunions », même si sa route n'en descend pas. */}
        <nav className="hidden md:flex items-center gap-1 ml-2" aria-label="Navigation principale">
          {ONGLETS.map((o) => {
            const actif = ongletActif(o.to, pathname)
            return (
              <NavLink
                key={o.to}
                to={o.to}
                aria-current={actif ? 'page' : undefined}
                className={`px-3.5 h-9 inline-flex items-center rounded-full text-sm font-medium transition-all ${
                  actif ? 'glass-nest text-ink' : 'text-muted hover:text-ink hover:bg-white/[0.05]'
                }`}
              >
                {o.libelle}
              </NavLink>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* Le point vivant est visible PARTOUT : c'est le seul signal
              permanent que les données respirent. Sur téléphone — l'appareil
              principal — seul le libellé disparaît, jamais le pouls. */}
          {majLe && (
            <span
              className="inline-flex items-center gap-2 text-[0.6875rem] text-faint"
              title={`Données à jour à ${heure(majLe)}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-win animate-pulse-dot" aria-hidden />
              <span className="num hidden sm:inline">à jour à {heure(majLe)}</span>
            </span>
          )}
          <button
            onClick={rafraichir}
            className="btn-ghost !px-3 !h-11 sm:!h-9 sm:!px-2.5"
            aria-label="Rafraîchir les données"
            disabled={chargement}
          >
            <RefreshCw size={16} className={chargement ? 'animate-spin' : undefined} />
          </button>
        </div>
      </div>
    </header>
  )
}
