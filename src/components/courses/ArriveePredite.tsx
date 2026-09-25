import { Link } from 'react-router-dom'
import type { Course, Partant } from '@/types'
import { cote as formatCote, pourcent, rang as formatRang } from '@/lib/format'
import { arriveePredite, DEPUIS_LA_COURSE, lienPartant } from '@/lib/programme'

/**
 * La ligne sous le nom, là où la maquette met le jockey. La base ne le connaît
 * pas (design/INTEGRATION.md) : on y met la chance d'être placé, qu'on a.
 */
function sousLigne(p: Partant): string {
  return p.pPlace != null ? `placé ${pourcent(p.pPlace)}` : ''
}

/**
 * « Arrivée prédite » — nos cinq premiers, dans l'ordre. Sur grand écran, cinq
 * cartes côte à côte, la première en aplat vert ; sur téléphone, le premier en
 * grande carte verte et les quatre suivants en vignettes.
 *
 * La cote n'est montrée que si elle existe : sur une course à venir, la vue
 * n'en porte pas encore (cotes de clôture, relevées après la course).
 */
export function ArriveePredite({ course }: { course: Course }) {
  const cinq = arriveePredite(course)
  if (cinq.length === 0) return null
  const [tete, ...suivants] = cinq

  return (
    <section className="flex flex-col gap-3 lg:gap-4" aria-labelledby="arrivee-predite">
      <div className="flex items-baseline justify-between gap-4">
        <h2
          id="arrivee-predite"
          className="label lg:normal-case lg:tracking-[-0.01em] lg:text-[1.25rem] lg:font-bold lg:text-ink"
        >
          Arrivée prédite
        </h2>
        <span className="hidden lg:inline text-[0.8125rem] font-medium text-faint">
          Ordre le plus probable · % = chances de victoire
        </span>
      </div>

      {/* Grand écran : cinq cartes. */}
      <div className="hidden lg:grid grid-cols-5 gap-3">
        {cinq.map((p, i) => {
          const premier = i === 0
          return (
            <Link
              key={p.numero}
              to={lienPartant(course, p)}
              state={DEPUIS_LA_COURSE}
              preventScrollReset
              aria-label={`${formatRang(i + 1)} prédit : ${p.nom}, ${pourcent(p.pWin)} de chances de victoire`}
              className={`min-w-0 flex flex-col gap-5 p-[1.125rem] rounded-2xl border transition-colors ${
                premier
                  ? 'bg-accent text-accent-ink border-accent hover:bg-accent-hover'
                  : 'bg-surface text-ink border-line hover:border-line-hover'
              }`}
            >
              <span className="flex items-center justify-between">
                <span className={`text-[0.8125rem] font-extrabold tracking-[0.04em] ${premier ? '' : 'text-faint'}`}>
                  {formatRang(i + 1)}
                </span>
                <span
                  className={`num w-10 h-10 rounded-xl grid place-items-center text-[1.0625rem] font-extrabold ${
                    premier ? 'bg-accent-ink text-accent' : 'bg-raised-2 text-ink border border-line-strong'
                  }`}
                >
                  {p.numero}
                </span>
              </span>
              <span className="flex flex-col gap-1 min-w-0">
                <span className="text-[0.9375rem] font-bold truncate">{p.nom}</span>
                <span className={`num text-xs font-semibold ${premier ? 'text-accent-ink/70' : 'text-faint'}`}>
                  {sousLigne(p)}
                </span>
              </span>
              <span className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                <span
                  className={`num whitespace-nowrap text-[1.4375rem] xl:text-[1.625rem] font-extrabold tracking-[-0.02em] leading-none ${
                    premier ? '' : 'text-accent'
                  }`}
                >
                  {pourcent(p.pWin)}
                </span>
                {p.cote != null && (
                  <span
                    className={`num whitespace-nowrap text-xs font-semibold ${premier ? 'text-accent-ink/70' : 'text-faint'}`}
                  >
                    cote {formatCote(p.cote)}
                  </span>
                )}
              </span>
            </Link>
          )
        })}
      </div>

      {/* Téléphone : le premier en grand, les suivants en vignettes. */}
      <div className="lg:hidden flex flex-col gap-3">
        <Link
          to={lienPartant(course, tete)}
          state={DEPUIS_LA_COURSE}
          preventScrollReset
          aria-label={`1er prédit : ${tete.nom}, ${pourcent(tete.pWin)} de chances de victoire`}
          className="flex flex-col gap-4 p-[1.125rem] rounded-3xl bg-accent text-accent-ink"
        >
          <span className="flex items-center gap-3.5">
            <span className="num w-12 h-12 shrink-0 rounded-xl bg-accent-ink text-accent grid place-items-center text-[1.25rem] font-extrabold">
              {tete.numero}
            </span>
            <span className="min-w-0 flex flex-col gap-[3px]">
              <span className="text-xs font-extrabold tracking-[0.04em]">1er prédit</span>
              <span className="text-[1.0625rem] font-extrabold truncate">{tete.nom}</span>
              <span className="num text-xs font-semibold text-accent-ink/70">{sousLigne(tete)}</span>
            </span>
          </span>
          <span className="flex items-baseline justify-between">
            <span className="num text-[1.8125rem] font-extrabold tracking-[-0.02em] leading-none">{pourcent(tete.pWin)}</span>
            {tete.cote != null && (
              <span className="num text-[0.8125rem] font-bold text-accent-ink/70">cote {formatCote(tete.cote)}</span>
            )}
          </span>
        </Link>
        {suivants.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {suivants.map((p, i) => (
              <Link
                key={p.numero}
                to={lienPartant(course, p)}
                state={DEPUIS_LA_COURSE}
                preventScrollReset
                aria-label={`${formatRang(i + 2)} prédit : ${p.nom}, ${pourcent(p.pWin)}`}
                className="flex flex-col items-center gap-2 px-1.5 py-3 rounded-2xl bg-surface border border-line"
              >
                <span className="text-[0.6875rem] font-bold text-faint">{formatRang(i + 2)}</span>
                <span className="num w-[2.375rem] h-[2.375rem] rounded-[11px] bg-raised-2 border border-line-strong grid place-items-center text-[0.9375rem] font-extrabold">
                  {p.numero}
                </span>
                <span className="num text-[0.9375rem] font-extrabold text-accent">{pourcent(p.pWin)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
