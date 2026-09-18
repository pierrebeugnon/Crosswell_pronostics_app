import { Fictif } from '@/components/ui/Fictif'
import { EXEMPLE, cote } from '@/lib/exemple'
import { pourcent } from '@/lib/format'

/**
 * L'EXEMPLE DE PRONOSTIC du héros (`design/screens/Landing.dc.html`) : l'en-tête
 * de course, l'arrivée prédite en cinq cases, puis les quatre premiers partants
 * avec leur barre et leur cote. Les barres sont à l'échelle du premier, comme
 * dans l'application ; au-delà des trois premiers, elles s'éteignent.
 */
export function ExempleCourse() {
  const max = EXEMPLE.partants[0].victoire
  return (
    <figure
      aria-label="Exemple de pronostic"
      className="m-0 flex flex-col gap-4 lg:gap-[1.125rem] p-5 lg:p-7 rounded-3xl lg:rounded-[1.5rem] bg-surface border border-line shadow-[0_30px_80px_rgba(0,0,0,0.45)]"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="num text-xs font-semibold text-faint">
          <span className="text-accent">{EXEMPLE.course}</span> · {EXEMPLE.hippodrome} · {EXEMPLE.heure}
        </span>
        <span className="text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-faint">Exemple</span>
      </div>
      <span className="text-[1.1875rem] lg:text-[1.3125rem] font-extrabold tracking-[-0.02em]">{EXEMPLE.nom}</span>
      <div className="flex flex-col gap-2.5">
        <span className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-faint">Arrivée prédite</span>
        <ol className="flex gap-1.5 lg:gap-2" aria-label="Arrivée prédite, du premier au cinquième">
          {EXEMPLE.arrivee.map((n, i) => (
            <li
              key={n}
              className={`num w-11 h-11 lg:w-12 lg:h-12 rounded-xl grid place-items-center text-[1rem] lg:text-[1.125rem] font-extrabold ${
                i === 0 ? 'bg-accent text-accent-ink' : 'bg-raised-2 border border-line-strong'
              }`}
            >
              {n}
            </li>
          ))}
        </ol>
      </div>
      <div>
        {EXEMPLE.partants.map((p) => (
          <div
            key={p.numero}
            className="grid grid-cols-[1.375rem_2.125rem_minmax(0,1fr)_3.75rem_2.5rem] lg:grid-cols-[1.375rem_2.125rem_minmax(0,1fr)_5.625rem_2.5rem] items-center gap-2.5 h-12 border-t border-track"
          >
            <span className={`num text-[0.8125rem] font-extrabold ${p.rang <= 3 ? 'text-accent' : 'text-dim'}`}>{p.rang}</span>
            <span className="num w-[1.875rem] h-[1.875rem] rounded-[8px] bg-raised border border-line-strong grid place-items-center text-[0.8125rem] font-bold">
              {p.numero}
            </span>
            <span className="text-sm font-semibold truncate">{p.nom}</span>
            <span className="flex items-center gap-2">
              <span className="grow h-1.5 rounded-full bg-track overflow-hidden">
                <span
                  className={`block h-full rounded-full ${p.rang <= 3 ? 'bg-accent' : 'bg-accent-dim'}`}
                  style={{ width: `${Math.round((p.victoire / max) * 100)}%` }}
                />
              </span>
              <span className="num text-[0.8125rem] font-bold whitespace-nowrap">{pourcent(p.victoire)}</span>
            </span>
            <span className="num text-right text-[0.8125rem] font-bold text-muted">{cote(p.cote)}</span>
          </div>
        ))}
      </div>
      <figcaption>
        <Fictif />
      </figcaption>
    </figure>
  )
}
