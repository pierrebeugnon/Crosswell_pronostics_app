import { Link } from 'react-router-dom'
import type { Course, Partant } from '@/types'
import { cote as formatCote, pourcent } from '@/lib/format'
import { BarreProba } from '@/components/ui/BarreProba'
import { Dossard } from '@/components/ui/Dossard'

/**
 * Nos trois premiers — et une VRAIE hiérarchie de podium.
 *
 * Trois cartes égales en grille disaient « voici trois chevaux » ; le client
 * vient chercher « voici NOTRE cheval, et ses deux dauphins ». Le rang 1
 * occupe donc toute la largeur, en carte accent, avec le chiffre en très
 * grand ; les rangs 2 et 3 se partagent la ligne du dessous, plus bas et plus
 * sobres. La forme dit le classement avant que les nombres soient lus.
 */

function chipArrivee(p: Partant, courue: boolean) {
  if (!courue) return null
  if (p.arrivee == null) return <span className="chip-neutral">Non classé</span>
  const bienArrive = p.arrivee <= 3
  return (
    <span className={`${bienArrive ? 'chip-win' : 'chip-neutral'} num`}>
      {p.arrivee === 1 ? '1er' : `${p.arrivee}e`}
    </span>
  )
}

export function Podium({ course }: { course: Course }) {
  const trois = course.podium.slice(0, 3)
  if (!trois.length) return null
  const max = Math.max(...trois.map((p) => p.pWin ?? 0), 0.0001)
  const [tete, ...dauphins] = trois
  const lien = (p: Partant) =>
    `/courses/${course.date}/${encodeURIComponent(course.hippodrome)}/${course.numero}/partants/${p.numero}`

  return (
    <div className="space-y-3">
      <Link
        to={lien(tete)}
        className="card-accent hover:shadow-lift-accent block p-5 sm:p-6 transition-all
                   duration-300 hover:-translate-y-0.5 active:scale-[0.99] animate-fade-up"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="label !text-accent">Notre sélection</span>
          {chipArrivee(tete, course.courue)}
        </div>

        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <p className="font-display font-semibold tracking-tight text-2xl sm:text-3xl min-w-0 truncate">
            <Dossard numero={tete.numero} taille="md" accent className="mr-2.5 -mt-1" />
            {tete.nom}
          </p>
          <p className="shrink-0 flex items-baseline gap-2.5">
            <span className="num texte-accent font-display font-bold tracking-tight text-4xl leading-none">
              {pourcent(tete.pWin)}
            </span>
            {tete.cote != null && (
              <span className="num text-xs text-faint">cote {formatCote(tete.cote)}</span>
            )}
          </p>
        </div>
        <BarreProba valeur={tete.pWin} maximum={max} accent className="mt-4" />
      </Link>

      {dauphins.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {dauphins.map((p, i) => (
            <Link
              key={p.numero}
              to={lien(p)}
              className="card hover:shadow-lift p-4 sm:p-5 transition-all duration-300
                         hover:-translate-y-0.5 active:scale-[0.99] animate-fade-up"
              style={{ animationDelay: `${(i + 1) * 60}ms` }}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className="num w-6 h-6 rounded-lg grid place-items-center text-[0.6875rem]
                             font-bold glass-nest text-muted"
                >
                  {i + 2}
                </span>
                {chipArrivee(p, course.courue)}
              </div>

              <p className="mt-3.5 font-semibold tracking-tight truncate">
                <Dossard numero={p.numero} className="mr-2 -mt-0.5" />
                {p.nom}
              </p>

              <div className="mt-2.5 flex items-baseline justify-between gap-2">
                <span className="num text-lg font-bold">{pourcent(p.pWin)}</span>
                {p.cote != null && (
                  <span className="num text-xs text-faint">cote {formatCote(p.cote)}</span>
                )}
              </div>
              <BarreProba valeur={p.pWin} maximum={max} className="mt-2.5" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
