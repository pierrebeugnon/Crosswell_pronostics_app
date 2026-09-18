import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Course } from '@/types'
import { dateCourte, distance as formatDistance, hippodrome as formatHippodrome } from '@/lib/format'
import { arriveePredite, arriveeRelevee, lienCourse } from '@/lib/programme'
import { LIBELLE_STATUT_RESULTAT, statutResultat, type StatutResultat } from '@/lib/resultats'

const PAR_PAGE = 10
const REUSSI: StatutResultat[] = ['top3', 'gagnant', 'place']

/** Nos trois premiers et les trois premiers de l’arrivée, en tuiles. */
function tuiles(course: Course) {
  const arrivee = arriveeRelevee(course, 3)
  const dans = new Set(arrivee.map((p) => p.numero))
  const tuile = 'num w-[1.875rem] h-[1.875rem] rounded-[8px] inline-grid place-items-center text-xs font-extrabold'
  return {
    pronostic: (
      <span className="flex gap-1.5" aria-label="Pronostic">
        {arriveePredite(course, 3).map((p) => (
          <span
            key={p.numero}
            className={`${tuile} ${dans.has(p.numero) ? 'bg-accent text-accent-ink' : 'bg-raised-2 text-ink border border-line-strong'}`}
          >
            {p.numero}
          </span>
        ))}
      </span>
    ),
    arrivee: (
      <span className="flex gap-1.5" aria-label="Arrivée">
        {arrivee.map((p) => (
          <span key={p.numero} className={`${tuile} text-soft border border-line-strong`}>
            {p.numero}
          </span>
        ))}
      </span>
    ),
  }
}

function Statut({ course }: { course: Course }) {
  const s = statutResultat(course)
  return (
    <span
      className={`shrink-0 justify-self-end text-[0.6875rem] font-extrabold uppercase tracking-[0.06em] rounded-full px-2.5 py-1 border ${
        REUSSI.includes(s) ? 'bg-accent/[0.12] text-accent border-accent/40' : 'bg-raised text-faint border-line-strong'
      }`}
    >
      {LIBELLE_STATUT_RESULTAT[s]}
    </span>
  )
}

const date = (c: Course) => `${dateCourte(c.date)} ${c.date.slice(0, 4)}`
const meta = (c: Course) => [c.type, c.distance != null ? formatDistance(c.distance) : null].filter(Boolean).join(' · ')

/**
 * « Dernières courses » — chaque course jugée : nos trois premiers face aux
 * trois premiers de l'arrivée, en vert ceux qu'on retrouve. Dix d'abord, puis
 * par vingt : le registre complet reste à portée sans noyer la page.
 */
export function DernieresCourses({ courses }: { courses: Course[] }) {
  const [nombre, setNombre] = useState(PAR_PAGE)
  const visibles = courses.slice(0, nombre)
  const reste = courses.length - visibles.length

  return (
    <section className="flex flex-col gap-4 p-[1.125rem] lg:p-7 rounded-[1.25rem] bg-surface border border-line">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[0.9375rem] lg:text-[1.1875rem] font-bold">Dernières courses</h2>
        <span className="text-xs lg:text-[0.8125rem] font-medium text-faint text-right">
          En vert : chevaux prédits présents dans l’arrivée
        </span>
      </div>

      {/* Grand écran : le tableau. */}
      <div className="hidden lg:block">
        <div className="grid grid-cols-[8.125rem_10rem_minmax(0,1fr)_9.375rem_9.375rem_6.875rem] items-center gap-4 px-1 pb-3 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-faint">
          <span>Date</span>
          <span>Hippodrome</span>
          <span>Course</span>
          <span>Pronostic</span>
          <span>Arrivée</span>
          <span className="text-right">Résultat</span>
        </div>
        {visibles.map((c) => {
          const t = tuiles(c)
          return (
            <Link
              key={c.cle}
              to={lienCourse(c)}
              className="num grid grid-cols-[8.125rem_10rem_minmax(0,1fr)_9.375rem_9.375rem_6.875rem] items-center gap-4 px-1 h-14 border-t border-track text-sm transition-colors hover:bg-sunken"
            >
              <span className="font-semibold">{date(c)}</span>
              <span className="font-semibold truncate">{formatHippodrome(c.hippodrome)}</span>
              <span className="font-medium text-muted truncate">{meta(c)}</span>
              {t.pronostic}
              {t.arrivee}
              <Statut course={c} />
            </Link>
          )
        })}
      </div>

      {/* Téléphone : une fiche par course. */}
      <div className="lg:hidden">
        {visibles.map((c) => {
          const t = tuiles(c)
          return (
            <Link key={c.cle} to={lienCourse(c)} className="flex flex-col gap-2.5 py-3.5 border-t border-track">
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0 flex flex-col gap-0.5">
                  <span className="num text-sm font-bold truncate">
                    {formatHippodrome(c.hippodrome)} · {date(c)}
                  </span>
                  <span className="num text-xs font-medium text-faint truncate">{meta(c)}</span>
                </span>
                <Statut course={c} />
              </span>
              <span className="flex items-center gap-4">
                {t.pronostic}
                <span className="text-dim" aria-hidden>
                  →
                </span>
                {t.arrivee}
              </span>
            </Link>
          )
        })}
      </div>

      {reste > 0 && (
        <button type="button" className="btn-glass self-center" onClick={() => setNombre((n) => n + 20)}>
          Voir {Math.min(20, reste)} course{Math.min(20, reste) > 1 ? 's' : ''} de plus
          {reste > 20 && <span className="num text-faint font-semibold">· {reste} restantes</span>}
        </button>
      )}
    </section>
  )
}
