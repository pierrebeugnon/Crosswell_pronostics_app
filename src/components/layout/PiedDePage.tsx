import { Link } from 'react-router-dom'
import { EncartMajeurs } from '@/components/layout/EncartMajeurs'

/** Le bas de page des maquettes : l'encart « 18+ », puis une ligne de liens. */
export function PiedDePage() {
  return (
    <footer className="mt-16 border-t border-sep">
      <div className="mx-auto max-w-content px-5 md:px-10 py-8 flex flex-col gap-5">
        <EncartMajeurs />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold text-faint">
          <nav className="flex gap-5" aria-label="Liens de bas de page">
            <Link to="/methode" className="tap hover:text-ink transition-colors">
              Notre méthode
            </Link>
            <Link to="/resultats" className="tap hover:text-ink transition-colors">
              Nos résultats
            </Link>
          </nav>
          <p className="num sm:ml-auto">© {new Date().getFullYear()} Crosswell</p>
        </div>
      </div>
    </footer>
  )
}
