import { useState } from 'react'
import { MOIS_LONG, pourcent } from '@/lib/format'
import { MOIS_COURT, echelle, type Mois } from '@/lib/resultats'

/**
 * « Taux de réussite par mois » — une barre par mois, le trait pointillé de la
 * moyenne de la période, et le détail d'un mois au survol (au toucher sur
 * téléphone, sous le graphique). Un mois sans course garde sa place, vide.
 */
export function GraphiqueMois({
  serie,
  moyenne,
  titre,
  sousTitre,
}: {
  serie: Mois[]
  moyenne: number
  titre: string
  sousTitre: string
}) {
  const [actif, setActif] = useState<string | null>(null)
  const { haut, graduations } = echelle(Math.max(moyenne, ...serie.map((m) => m.taux)))
  const detail = serie.find((m) => m.cle === actif) ?? null
  const nomMois = (m: Mois) => `${MOIS_LONG[m.mois].replace(/^./, (x) => x.toUpperCase())} ${m.annee}`
  const effectif = (m: Mois) => (m.n === 0 ? 'aucune course' : `${m.n} course${m.n > 1 ? 's' : ''}`)

  return (
    <section className="flex flex-col gap-3.5 lg:gap-5 p-[1.125rem] lg:p-7 rounded-[1.25rem] bg-surface border border-line min-w-0">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-1 lg:gap-6">
        <div className="flex flex-col gap-1 lg:gap-1.5">
          <h2 className="text-[0.9375rem] lg:text-[1.1875rem] font-bold">{titre}</h2>
          <p className="num text-xs lg:text-[0.8125rem] font-medium text-faint">{sousTitre}</p>
        </div>
        <p className="num flex items-center gap-2.5 text-xs lg:text-[0.8125rem] font-semibold text-muted">
          <span className="w-[1.375rem] border-t border-dashed border-faint" aria-hidden />
          Moyenne de la période {pourcent(moyenne, 1)}
        </p>
      </div>

      <div className="flex gap-2 lg:gap-3 h-[12.5rem] lg:h-[18.75rem]">
        <div className="num w-[1.875rem] lg:w-10 flex flex-col justify-between pb-[1.875rem] lg:pb-[2.375rem] text-[0.625rem] lg:text-[0.6875rem] font-semibold text-faint text-right" aria-hidden>
          {graduations.map((g) => (
            <span key={g} className="leading-[0]">
              {Math.round(g * 100)} %
            </span>
          ))}
        </div>
        <div className="flex-1 min-w-0 flex flex-col">
          <div
            className="relative flex-1 flex items-end gap-[3px] lg:gap-1.5 border-b border-line-strong"
            onMouseLeave={() => setActif(null)}
          >
            <span
              className="absolute inset-x-0 border-t border-dashed border-faint pointer-events-none"
              style={{ bottom: `${(moyenne / haut) * 100}%` }}
              aria-hidden
            />
            {serie.map((m) => {
              const allume = actif == null || actif === m.cle
              return (
                <button
                  key={m.cle}
                  type="button"
                  aria-label={`${nomMois(m)} : ${m.n ? pourcent(m.taux, 1) : 'aucune course'}${m.n ? `, ${effectif(m)}` : ''}`}
                  onMouseEnter={() => setActif(m.cle)}
                  onFocus={() => setActif(m.cle)}
                  onBlur={() => setActif(null)}
                  onClick={() => setActif((a) => (a === m.cle ? null : m.cle))}
                  className="relative flex-1 basis-0 min-w-0 h-full flex items-end justify-center"
                >
                  <span
                    className={`block w-full max-w-[1.75rem] rounded-t transition-colors ${allume ? 'bg-accent' : 'bg-accent-dim'}`}
                    style={{ height: m.n ? `${Math.max(1, (m.taux / haut) * 100)}%` : 0 }}
                  />
                  {actif === m.cle && (
                    <span className="hidden lg:flex num absolute top-0 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap flex-col gap-0.5 px-3 py-2.5 rounded-[10px] bg-raised-2 border border-line-strong text-left pointer-events-none">
                      <span className="text-xs font-semibold text-muted">{nomMois(m)}</span>
                      <span className="text-[0.9375rem] font-extrabold text-ink">{m.n ? pourcent(m.taux, 1) : '—'}</span>
                      <span className="text-[0.6875rem] font-medium text-faint">{effectif(m)}</span>
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <div className="flex gap-[3px] lg:gap-1.5 h-[1.875rem] lg:h-[2.375rem] pt-1.5 lg:pt-2" aria-hidden>
            {serie.map((m, i) => (
              <span
                key={m.cle}
                className="flex-1 basis-0 min-w-0 flex flex-col items-center gap-px text-[0.5625rem] lg:text-[0.6875rem] font-bold lg:font-semibold text-faint"
              >
                <span className="lg:hidden">{MOIS_COURT[m.mois].charAt(0).toUpperCase()}</span>
                <span className="hidden lg:inline">{MOIS_COURT[m.mois]}</span>
                {(i === 0 || m.mois === 0) && (
                  <span className="text-[0.5625rem] lg:text-[0.625rem] text-dim">
                    <span className="lg:hidden">{String(m.annee).slice(2)}</span>
                    <span className="hidden lg:inline">{m.annee}</span>
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Téléphone : le détail du mois touché, sous le graphique. */}
      {detail && (
        <p className="lg:hidden num flex items-center justify-between px-3 py-2.5 rounded-[10px] bg-raised-2 border border-line-strong text-[0.8125rem]">
          <span className="font-semibold text-muted">{nomMois(detail)}</span>
          <span className="font-extrabold">
            {detail.n ? pourcent(detail.taux, 1) : '—'} <span className="font-medium text-faint">· {effectif(detail)}</span>
          </span>
        </p>
      )}
    </section>
  )
}
