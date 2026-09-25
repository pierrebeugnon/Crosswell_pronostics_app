import { Link } from 'react-router-dom'
import type { Course } from '@/types'
import { hippodrome as formatHippodrome, pourcent } from '@/lib/format'
import { LIBELLE_STATUT, statutAccueil } from '@/lib/accueil'
import { arriveePredite, lienCourse } from '@/lib/programme'
import type { InstantParis } from '@/lib/journee'
import { TuileNumero } from '@/components/ui/TuileNumero'
import { AvecUnPass } from '@/components/acces/Verrou'

/**
 * « Toutes les courses du jour » — une carte par course sur grand écran, une
 * ligne par course sur téléphone : l'heure, le nom, nos trois premiers et la
 * probabilité de notre premier. La prochaine course est bordée de vert, les
 * courses parties s'estompent.
 */
export function CoursesDuJour({
  courses,
  prochaine,
  maintenant,
}: {
  courses: Course[]
  prochaine: Course | null
  maintenant: InstantParis
}) {
  return (
    <section className="flex flex-col gap-1 lg:gap-4" aria-labelledby="courses-du-jour">
      <div className="flex items-baseline justify-between gap-4 pb-2 lg:pb-0">
        <h2 id="courses-du-jour" className="label lg:normal-case lg:tracking-[-0.01em] lg:text-[1.25rem] lg:font-bold lg:text-ink">
          <span className="lg:hidden">Courses du jour</span>
          <span className="hidden lg:inline">Toutes les courses du jour</span>
        </h2>
        <Link to="/courses" className="text-sm font-semibold text-accent hover:text-accent-hover">
          Voir le programme
        </Link>
      </div>

      {/* Grand écran : les cartes. */}
      <div className="hidden lg:grid grid-cols-5 gap-3">
        {courses.map((c) => {
          const statut = statutAccueil(c, maintenant, prochaine)
          const trois = arriveePredite(c, 3)
          return (
            <Link
              key={c.cle}
              to={lienCourse(c)}
              className={`min-w-0 flex flex-col gap-[1.125rem] p-[1.125rem] rounded-2xl bg-surface border transition-colors ${
                statut === 'prochaine' ? 'border-accent' : 'border-line hover:border-line-hover'
              } ${statut === 'terminee' || statut === 'departPasse' ? 'opacity-60 hover:opacity-100' : ''}`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="num flex items-baseline gap-2">
                  <span className="text-[1.1875rem] font-extrabold">{c.heureDepart ?? '—'}</span>
                  <span className="text-xs font-semibold text-faint">C{c.numero}</span>
                </span>
                <span
                  className={`shrink-0 text-[0.625rem] font-bold uppercase tracking-[0.08em] rounded-full px-2 py-[3px] ${
                    statut === 'prochaine' ? 'bg-accent text-accent-ink' : 'bg-raised-2 text-faint'
                  }`}
                >
                  {LIBELLE_STATUT[statut]}
                </span>
              </span>
              <span className="flex flex-col gap-1 min-w-0">
                <span className="text-[0.9375rem] font-bold truncate">{c.nom ?? `Course ${c.numero}`}</span>
                <span className="text-xs font-medium text-faint truncate">
                  {formatHippodrome(c.hippodrome)} · {c.type}
                </span>
              </span>
              {/* Formule Gratuit : la base n'a rien donné de cette course (`db/007`). */}
              {c.verrouillee ? (
                <AvecUnPass className="min-h-[1.875rem]" />
              ) : (
                <span className="flex items-center justify-between gap-2">
                  <span className="flex gap-1.5">
                    {trois.map((p, i) => (
                      <TuileNumero key={p.numero} numero={p.numero} accent={i === 0} />
                    ))}
                  </span>
                  {c.favori && <span className="num text-[0.8125rem] font-bold text-accent">{pourcent(c.favori.pWin)}</span>}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {/* Téléphone : les lignes. */}
      <div className="lg:hidden">
        {courses.map((c) => {
          const statut = statutAccueil(c, maintenant, prochaine)
          return (
            <Link
              key={c.cle}
              to={lienCourse(c)}
              className={`grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-3 min-h-[3.75rem] py-2 border-t border-track ${
                statut === 'terminee' || statut === 'departPasse' ? 'opacity-[0.55]' : ''
              }`}
            >
              <span className="num flex flex-col gap-0.5">
                <span className="text-[0.9375rem] font-extrabold">{c.heureDepart ?? '—'}</span>
                <span className={`text-[0.6875rem] font-semibold ${statut === 'prochaine' ? 'text-accent' : 'text-faint'}`}>
                  {statut === 'prochaine' ? 'Prochaine' : `C${c.numero}`}
                </span>
              </span>
              <span className="min-w-0 flex flex-col gap-[3px]">
                <span className="text-sm font-bold truncate">{c.nom ?? `Course ${c.numero}`}</span>
                <span className="text-xs font-medium text-faint truncate">
                  {formatHippodrome(c.hippodrome)} · {c.type}
                </span>
              </span>
              {c.verrouillee ? (
                <AvecUnPass />
              ) : (
                <span className="flex gap-1">
                  {arriveePredite(c, 3).map((p, i) => (
                    <TuileNumero key={p.numero} numero={p.numero} taille="xs" accent={i === 0} />
                  ))}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
