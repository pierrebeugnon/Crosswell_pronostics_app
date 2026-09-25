import { Link } from 'react-router-dom'
import { CalendarClock } from 'lucide-react'
import type { Course } from '@/types'
import { RYTHME_PUBLICATION_COURT } from '@/config/app'
import { dateEnTete, dateEnTeteCourte, distance as formatDistance, hippodrome as formatHippodrome, pourcent } from '@/lib/format'
import { AvecUnPass } from '@/components/acces/Verrou'
import { lienCourse } from '@/lib/programme'

function meta(c: Course): string {
  return [c.type, c.distance != null ? formatDistance(c.distance) : null].filter(Boolean).join(' · ')
}

/**
 * « Demain » — le programme du lendemain en lignes : heure, hippodrome, nom,
 * et notre premier choix. Sans course publiée, le rythme de publication.
 */
export function Demain({ courses, demain }: { courses: Course[]; demain: string }) {
  return (
    <section className="flex flex-col gap-1 lg:gap-4" aria-labelledby="demain">
      <div className="flex items-baseline justify-between gap-4 pb-2 lg:pb-0">
        <h2 id="demain" className="label lg:normal-case lg:tracking-[-0.01em] lg:text-[1.25rem] lg:font-bold lg:text-ink">
          Demain{' '}
          <span className="lg:text-[0.9375rem] lg:font-medium lg:text-faint">
            · <span className="lg:hidden">{dateEnTeteCourte(demain)}</span>
            <span className="hidden lg:inline">{dateEnTete(demain)}</span>
          </span>
        </h2>
        {courses.length > 0 && (
          <Link to={`/courses?jour=${demain}`} className="text-sm font-semibold text-accent hover:text-accent-hover">
            <span className="lg:hidden">Voir</span>
            <span className="hidden lg:inline">Voir les pronostics de demain</span>
          </Link>
        )}
      </div>

      {courses.length === 0 ? (
        <div className="flex items-start gap-4 p-5 rounded-2xl bg-surface border border-line">
          <span className="shrink-0 w-11 h-11 rounded-xl bg-accent/[0.12] grid place-items-center text-accent" aria-hidden>
            <CalendarClock size={22} />
          </span>
          {/* « pas ENCORE publiés » laissait attendre une parution dans la
              journée. Le pipeline calcule le jour même (décision du 20/09/2026,
              voir `RYTHME_PUBLICATION` dans config/app) : les courses de demain
              paraissent demain matin, pas ce soir. Le dire évite d'attendre
              pour rien — et, sur un Pass 1 jour acheté le soir, évite surtout
              de croire qu'on a payé pour quelque chose qui manque. */}
          <span className="flex flex-col gap-1">
            <span className="font-bold">Les pronostics de demain paraîtront demain matin</span>
            <span className="text-[0.8125rem] font-medium text-muted leading-relaxed">{RYTHME_PUBLICATION_COURT}</span>
          </span>
        </div>
      ) : (
        <>
          {/* Grand écran : le tableau. */}
          <div className="hidden lg:block rounded-2xl border border-sep overflow-hidden">
            {courses.map((c) => (
              <Link
                key={c.cle}
                to={lienCourse(c)}
                className="grid grid-cols-[4.5rem_4rem_10rem_minmax(0,1fr)_16.25rem] items-center gap-4 px-6 h-[3.75rem] border-b border-track last:border-b-0 transition-colors hover:bg-sunken"
              >
                <span className="num text-[1rem] font-extrabold">{c.heureDepart ?? '—'}</span>
                <span className="num text-[0.8125rem] font-semibold text-faint">C{c.numero}</span>
                <span className="text-sm font-semibold truncate">{formatHippodrome(c.hippodrome)}</span>
                <span className="min-w-0 flex items-baseline gap-2.5">
                  <span className="text-[0.9375rem] font-semibold truncate">{c.nom ?? `Course ${c.numero}`}</span>
                  <span className="num shrink-0 text-xs font-medium text-faint">{meta(c)}</span>
                </span>
                <span className="num flex items-center justify-end gap-2.5 text-[0.8125rem] font-semibold text-faint min-w-0">
                  {c.verrouillee ? (
                    <AvecUnPass />
                  ) : c.favori && (
                    <>
                      <span>Favori</span>
                      <span className="text-ink font-bold truncate max-w-[8.125rem]">
                        n°{c.favori.numero} {c.favori.nom}
                      </span>
                      <span className="text-accent font-bold">{pourcent(c.favori.pWin)}</span>
                    </>
                  )}
                </span>
              </Link>
            ))}
          </div>

          {/* Téléphone : les lignes. */}
          <div className="lg:hidden">
            {courses.map((c) => (
              <Link
                key={c.cle}
                to={lienCourse(c)}
                className="grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-3 min-h-[3.75rem] py-2 border-t border-track"
              >
                <span className="num flex flex-col gap-0.5">
                  <span className="text-[0.9375rem] font-extrabold">{c.heureDepart ?? '—'}</span>
                  <span className="text-[0.6875rem] font-semibold text-faint">C{c.numero}</span>
                </span>
                <span className="min-w-0 flex flex-col gap-[3px]">
                  <span className="text-sm font-bold truncate">{c.nom ?? `Course ${c.numero}`}</span>
                  <span className="num text-xs font-medium text-faint truncate">
                    {formatHippodrome(c.hippodrome)} · {meta(c)}
                  </span>
                </span>
                {c.verrouillee ? (
                  <AvecUnPass />
                ) : (
                  c.favori && (
                    <span className="num text-[0.8125rem] font-bold text-accent">
                      n°{c.favori.numero} · {pourcent(c.favori.pWin)}
                    </span>
                  )
                )}
              </Link>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
