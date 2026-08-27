import { Link } from 'react-router-dom'

export default function NonTrouve() {
  return (
    <div className="min-h-[50vh] grid place-items-center text-center px-2 animate-fade-up">
      <div>
        <h1 className="num font-display font-bold tracking-tight texte-accent text-[4.5rem] sm:text-[6rem] leading-none">404</h1>
        <p className="text-muted mt-5 max-w-sm mx-auto leading-relaxed">
          Cette page n’existe pas — ou la course que vous cherchez est sortie de notre fenêtre de
          trente jours.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/" className="btn-accent">
            Retour à aujourd’hui
          </Link>
          <Link to="/reunions" className="btn-glass">
            Voir les réunions
          </Link>
        </div>
      </div>
    </div>
  )
}
