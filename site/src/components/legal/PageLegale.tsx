import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LEGAL } from '@/components/layout/Navigation'

/**
 * LES PAGES LÉGALES — `design/screens/Legal.dc.html` et `LegalMobile` : une
 * colonne de 860 px, les documents en onglets (des liens : chaque document
 * garde son adresse), le titre, la date, puis des sections séparées d'un filet.
 *
 * Un onglet de la maquette n'est pas repris (design/INTEGRATION.md, lot 7) :
 * « Jeu responsable », hors de notre positionnement.
 *
 * Les CGV, elles, sont publiées depuis le 25/09/2026 en VERSION DE TRAVAIL,
 * trous visibles : la case obligatoire de l'inscription y renvoyait et tombait
 * sur un 404. Une page qui dit franchement qu'elle n'est pas en vigueur vaut
 * mieux qu'une case à cocher qui mène au vide. Les mentions manquantes restent
 * signalées, jamais inventées — la règle ne change pas.
 */
export const MISE_A_JOUR = '18 septembre 2026'

export function SectionLegale({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 pt-6 border-t border-sep">
      <h2 className="text-[1.1875rem] lg:text-[1.25rem] font-extrabold">{titre}</h2>
      <div className="flex flex-col gap-3 text-[0.9375rem] font-medium leading-[1.7] text-soft [&_a]:text-accent [&_a]:font-semibold [&_a:hover]:text-accent-hover [&_strong]:text-ink">
        {children}
      </div>
    </section>
  )
}

export function ListeLegale({ points }: { points: ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {points.map((p, i) => (
        <li key={i} className="flex gap-3">
          <span className="shrink-0 w-1.5 h-1.5 mt-2.5 rounded-full bg-accent" aria-hidden />
          <span>{p}</span>
        </li>
      ))}
    </ul>
  )
}

export function PageLegale({ titre, intro, children }: { titre: string; intro?: ReactNode; children: ReactNode }) {
  const { pathname } = useLocation()
  return (
    <div className="w-full max-w-[53.75rem] mx-auto px-5 lg:px-0 pt-9 lg:pt-16 pb-14 lg:pb-24 flex flex-col gap-6 lg:gap-7">
      <span className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Informations légales</span>
      <nav aria-label="Documents" className="flex gap-2 overflow-x-auto [scrollbar-width:none] -mx-5 px-5 lg:mx-0 lg:px-0">
        {LEGAL.map((d) => {
          const actif = pathname === d.vers
          return (
            <Link
              key={d.vers}
              to={d.vers}
              aria-current={actif ? 'page' : undefined}
              className={`shrink-0 h-11 px-[1.125rem] rounded-full flex items-center text-sm font-bold border transition-colors ${
                actif ? 'bg-accent text-accent-ink border-accent' : 'text-soft border-line-strong hover:border-line-hover'
              }`}
            >
              {d.libelle}
            </Link>
          )
        })}
      </nav>
      <article className="flex flex-col gap-7">
        <div className="flex flex-col gap-3">
          <h1 className="text-[1.6875rem] lg:text-[2.3125rem] font-extrabold tracking-[-0.03em] leading-[1.1]">{titre}</h1>
          <span className="text-[0.8125rem] font-medium text-faint">Dernière mise à jour&nbsp;: {MISE_A_JOUR}</span>
          {intro && <p className="text-[0.9375rem] lg:text-[0.9375rem] font-medium leading-[1.7] text-soft">{intro}</p>}
        </div>
        {children}
      </article>
    </div>
  )
}
