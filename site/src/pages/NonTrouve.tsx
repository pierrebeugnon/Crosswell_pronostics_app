import { Link } from 'react-router-dom'
import { useTitre } from '@/lib/useTitre'

/** La page introuvable, dans la composition de celle de l'application. */
export default function NonTrouve() {
  useTitre('Page introuvable')

  return (
    <div className="min-h-[60vh] grid place-items-center text-center px-5 py-14 animate-fade-up">
      <div className="flex flex-col items-center gap-5">
        <p className="num text-[3.875rem] lg:text-[5.4375rem] font-extrabold tracking-[-0.04em] leading-none text-accent" aria-hidden>
          404
        </p>
        <h1 className="text-[1.4375rem] lg:text-[2.125rem] font-extrabold tracking-[-0.025em] leading-[1.05]">
          Page introuvable
        </h1>
        <p className="text-sm lg:text-[0.9375rem] font-medium text-muted max-w-sm leading-relaxed">
          Cette adresse n’existe pas. Le site est court&nbsp;: tout ce qu’il dit tient sur l’accueil et sur «&nbsp;Comment
          ça marche&nbsp;».
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
          <Link to="/" className="btn-accent">
            Retour à l’accueil
          </Link>
          <Link to="/methode" className="btn-glass">
            Comment ça marche
          </Link>
        </div>
      </div>
    </div>
  )
}
