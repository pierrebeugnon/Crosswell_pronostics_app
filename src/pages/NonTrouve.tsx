import { Link } from 'react-router-dom'

/** Page introuvable, dans le langage des maquettes : grand chiffre vert, deux sorties. */
export default function NonTrouve() {
  return (
    <div className="min-h-[55vh] grid place-items-center text-center animate-fade-up">
      <div className="flex flex-col items-center gap-5">
        <p className="num text-[3.875rem] lg:text-[5.4375rem] font-extrabold tracking-[-0.04em] leading-none text-accent" aria-hidden>
          404
        </p>
        <h1 className="text-[1.4375rem] lg:text-[2.125rem] font-extrabold tracking-[-0.025em] leading-[1.05]">
          Page introuvable
        </h1>
        <p className="text-sm lg:text-[0.9375rem] font-medium text-muted max-w-sm leading-relaxed">
          Cette adresse n’existe pas, ou la course que vous cherchez est sortie de notre fenêtre de trente jours.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
          <Link to="/" className="btn-accent">
            Retour à l’accueil
          </Link>
          <Link to="/courses" className="btn-glass">
            Voir les courses
          </Link>
        </div>
      </div>
    </div>
  )
}
