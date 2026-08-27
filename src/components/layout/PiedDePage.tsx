import { Link } from 'react-router-dom'
import { AVERTISSEMENT } from '@/config/app'
import { Logo } from '@/components/brand/Logo'

/**
 * Une seule mention, discrète, sur chaque page : analyses statistiques,
 * réservées aux majeurs. Le dispositif complet des opérateurs de jeux
 * (numéro d'aide, cartes dédiées) a été retiré à dessein — l'afficher
 * revendiquait précisément le positionnement « produit de paris » dont
 * l'application se tient à l'écart. Voir le commentaire de AVERTISSEMENT
 * dans config/app.ts.
 */
export function PiedDePage() {
  return (
    <footer className="mt-20 border-t border-white/[0.07]">
      <div className="mx-auto max-w-content px-4 sm:px-6 py-12">
        <div className="flex flex-col sm:flex-row gap-8 sm:items-start sm:justify-between">
          <div className="max-w-md">
            <Logo />
            <p className="text-sm text-muted mt-4 leading-relaxed">
              Des probabilités calculées, pas des certitudes. Nous publions nos analyses — et,
              sans filtre, ce qu'elles valent une fois les courses courues.
            </p>
          </div>
          <nav className="flex flex-col gap-2.5 text-sm" aria-label="Liens de bas de page">
            <Link to="/methode" className="text-muted hover:text-ink transition-colors">
              Notre méthode
            </Link>
            <Link to="/resultats" className="text-muted hover:text-ink transition-colors">
              Nos résultats
            </Link>
          </nav>
        </div>

        <div className="mt-10 pt-6 border-t border-white/[0.07] flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <p className="text-xs text-faint leading-relaxed max-w-2xl">
            {AVERTISSEMENT.texte} Service réservé aux personnes majeures (
            {AVERTISSEMENT.ageMinimum}&nbsp;ans et plus).
          </p>
          <p className="num text-xs text-faint shrink-0">© {new Date().getFullYear()} Crosswell</p>
        </div>
      </div>
    </footer>
  )
}
