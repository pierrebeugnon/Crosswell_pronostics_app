import type { InputHTMLAttributes, ReactNode } from 'react'

/**
 * Le champ de saisie des maquettes : 48 px de haut, fond de page, filet des
 * contrôles, focus vert. Le libellé est au-dessus ; une action facultative
 * (« Mot de passe oublié ? ») se place à sa droite ; l'erreur, en dessous, est
 * reliée au champ pour être relue par un lecteur d'écran.
 */
export const CLASSE_CHAMP =
  'w-full h-12 px-3.5 rounded-xl bg-canvas border text-[0.9375rem] font-medium text-ink ' +
  'placeholder:text-dim transition-colors focus:outline-none focus:ring-2 focus:ring-accent ' +
  'disabled:text-faint disabled:cursor-not-allowed'

export function Champ({
  id,
  libelle,
  action,
  erreur,
  aide,
  suffixe,
  className = '',
  ...attributs
}: {
  id: string
  libelle: string
  action?: ReactNode
  erreur?: string | null
  aide?: ReactNode
  /** Un bouton posé dans le champ, à droite (« Afficher »). */
  suffixe?: ReactNode
} & InputHTMLAttributes<HTMLInputElement>) {
  const decrit = [aide ? `${id}-aide` : null, erreur ? `${id}-erreur` : null].filter(Boolean).join(' ')
  return (
    <div className={`flex flex-col gap-[7px] ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[0.8125rem] font-semibold text-muted">
          {libelle}
        </label>
        {action}
      </div>
      <div className="relative">
        <input
          id={id}
          aria-invalid={erreur ? true : undefined}
          aria-describedby={decrit || undefined}
          className={`${CLASSE_CHAMP} ${erreur ? 'border-loss' : 'border-line-strong'} ${suffixe ? 'pr-24' : ''}`}
          {...attributs}
        />
        {suffixe && <span className="absolute right-1 top-1">{suffixe}</span>}
      </div>
      {aide && (
        <p id={`${id}-aide`} className="text-xs font-medium text-faint leading-relaxed">
          {aide}
        </p>
      )}
      {erreur && (
        <p id={`${id}-erreur`} role="alert" className="text-xs font-semibold text-loss">
          {erreur}
        </p>
      )}
    </div>
  )
}
