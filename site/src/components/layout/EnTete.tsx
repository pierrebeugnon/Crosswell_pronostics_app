import { Link, useLocation } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { ENTREES, type Entree } from '@/components/layout/Navigation'
import { AVERTISSEMENT, URL_CONNEXION, URL_INSCRIPTION } from '@/config/site'

/** Le lien d'une entrée : `<a>` vers l'application, `<Link>` à l'intérieur du site. */
export function LienEntree({ entree, className, courant }: { entree: Entree; className: string; courant?: boolean }) {
  if (entree.externe) {
    return (
      <a href={entree.vers} className={className}>
        {entree.libelle}
      </a>
    )
  }
  return (
    <Link to={entree.vers} className={className} aria-current={courant ? 'page' : undefined}>
      {entree.libelle}
    </Link>
  )
}

/** La pastille « 18+ » de la maquette : l'âge minimum, sans le message des jeux d'argent. */
export function Majeurs({ className = '' }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label={`Réservé aux plus de ${AVERTISSEMENT.ageMinimum} ans`}
      className={`h-7 lg:h-8 px-2 lg:px-2.5 rounded-full border border-line-strong flex items-center text-[0.6875rem] lg:text-xs font-extrabold text-muted ${className}`}
    >
      {AVERTISSEMENT.ageMinimum}+
    </span>
  )
}

/**
 * L'EN-TÊTE — `design/screens/Landing.dc.html` et `LandingMobile`.
 *
 * Grand écran : logo, trois liens, « 18+ », Se connecter, Essayer gratuitement.
 * Téléphone : logo, « 18+ » et Connexion seulement, comme la maquette mobile —
 * les autres pages s'atteignent depuis l'accueil et le pied de page.
 *
 * La connexion et l'inscription vivent dans l'APPLICATION (la session est
 * stockée par origine) : le site n'y renvoie que par des liens.
 */
export function EnTete() {
  const { pathname } = useLocation()
  return (
    <header className="sticky top-0 z-40 h-16 lg:h-[4.75rem] shrink-0 px-5 lg:px-10 flex items-center justify-between gap-4 bg-canvas border-b border-sep">
      <div className="flex items-center gap-10">
        <Link to="/" aria-label="Crosswell Pronostics, accueil" className="flex items-center">
          <Logo />
        </Link>
        <nav aria-label="Navigation" className="hidden lg:flex items-center gap-1">
          {ENTREES.map((e) => (
            <LienEntree
              key={e.libelle}
              entree={e}
              courant={pathname === e.vers}
              className="h-10 px-4 rounded-full flex items-center text-sm font-semibold text-muted hover:text-accent aria-[current=page]:text-ink aria-[current=page]:bg-raised transition-colors"
            />
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-2 lg:gap-2.5">
        <Majeurs />
        <a
          href={URL_CONNEXION}
          className="h-11 px-3.5 lg:px-[1.125rem] rounded-full border border-line-strong flex items-center text-[0.8125rem] lg:text-sm font-bold hover:border-line-hover transition-colors"
        >
          <span className="lg:hidden">Connexion</span>
          <span className="hidden lg:inline">Se connecter</span>
        </a>
        <a
          href={URL_INSCRIPTION}
          className="hidden lg:flex h-11 px-5 rounded-full bg-accent text-accent-ink items-center text-sm font-bold hover:bg-accent-hover transition-colors"
        >
          Essayer gratuitement
        </a>
      </div>
    </header>
  )
}
