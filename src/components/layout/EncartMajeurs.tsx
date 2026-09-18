import { Link } from 'react-router-dom'
import { AVERTISSEMENT } from '@/config/app'

/**
 * L'encart « 18+ » des maquettes, en bas de page et sur la connexion. La
 * maquette y met le message officiel sur les jeux d'argent ; tant que le
 * positionnement n'est pas tranché (design/INTEGRATION.md, A8), il porte NOTRE
 * mention — analyses statistiques, réservées aux majeurs. Voir AVERTISSEMENT
 * dans config/app.ts.
 */
export function EncartMajeurs({ lienMethode = true }: { lienMethode?: boolean }) {
  return (
    <div
      role="note"
      aria-label="Mise en garde"
      className="flex items-start gap-3 rounded-xl bg-surface border border-line px-3.5 py-3 sm:px-[1.125rem] sm:py-3.5"
    >
      <span className="shrink-0 h-6 px-[0.4375rem] rounded-[6px] bg-ink text-accent-ink grid place-items-center text-[0.6875rem] font-extrabold">
        {AVERTISSEMENT.ageMinimum}+
      </span>
      <p className="text-[0.6875rem] sm:text-xs font-medium leading-[1.55] text-muted">
        {AVERTISSEMENT.texte} Service réservé aux personnes majeures ({AVERTISSEMENT.ageMinimum}&nbsp;ans et plus).
        {lienMethode && (
          <>
            {' '}
            <Link to="/methode" className="text-accent font-bold hover:text-accent-hover">
              Notre méthode
            </Link>
          </>
        )}
      </p>
    </div>
  )
}
