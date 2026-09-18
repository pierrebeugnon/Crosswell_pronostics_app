import type { ReactNode } from 'react'

/** Le cadre des panneaux de la page : surface, filet, 20 px de rayon. */
export function Panneau({
  titre,
  sousTitre,
  droite,
  children,
  className = '',
}: {
  titre: ReactNode
  sousTitre?: ReactNode
  droite?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`flex flex-col gap-4 p-[1.125rem] lg:p-6 rounded-[1.25rem] bg-surface border border-line min-w-0 ${className}`}>
      <div className="flex items-start justify-between gap-6">
        <div className="flex flex-col gap-1 min-w-0">
          <h2 className="text-[0.9375rem] lg:text-[1rem] font-bold">{titre}</h2>
          {sousTitre && <p className="num text-xs font-medium text-faint">{sousTitre}</p>}
        </div>
        {droite}
      </div>
      {children}
    </section>
  )
}

export interface LigneBarre {
  libelle: string
  /** Le chiffre en gras à droite. */
  valeur: string
  /** Le complément en gris : « 807 courses ». */
  complement: string
  /** Remplissage, entre 0 et 1, déjà rapporté à l'échelle du panneau. */
  part: number
  /** Position du trait pointillé, entre 0 et 1 ; absent pour ne pas en tracer. */
  repere?: number
}

/**
 * Les lignes à barre des découpages : libellé, chiffre, et une barre verte
 * que coupe un trait pointillé (la moyenne de la sélection, ou le pourcentage
 * annoncé pour la fiabilité).
 */
export function LignesBarres({ lignes }: { lignes: LigneBarre[] }) {
  return (
    <div className="flex flex-col gap-3.5">
      {lignes.map((l) => (
        <div key={l.libelle} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-semibold truncate">{l.libelle}</span>
            <span className="num whitespace-nowrap">
              <span className="text-sm font-extrabold">{l.valeur}</span>
              <span className="text-xs font-medium text-faint"> · {l.complement}</span>
            </span>
          </div>
          <span className="relative block h-2.5 rounded-r bg-track" aria-hidden>
            <span
              className="block h-full rounded-r bg-accent transition-[width] duration-500"
              style={{ width: `${Math.max(1, Math.min(100, l.part * 100))}%` }}
            />
            {l.repere != null && (
              <span
                className="absolute -top-1 -bottom-1 w-0 border-l border-dashed border-muted"
                style={{ left: `${Math.min(100, l.repere * 100)}%` }}
              />
            )}
          </span>
        </div>
      ))}
    </div>
  )
}
