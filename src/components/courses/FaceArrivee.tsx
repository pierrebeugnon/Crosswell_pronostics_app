import { Link } from 'react-router-dom'
import type { Course, Partant } from '@/types'
import { rang as formatRang } from '@/lib/format'
import {
  LIBELLE_VERDICT,
  arriveePredite,
  arriveeRelevee,
  correspondance,
  DEPUIS_LA_COURSE, lienPartant,
  retrouvesDansLesCinq,
  verdictCourse,
  verdictReussi,
  type Correspondance,
} from '@/lib/programme'

const TUILE: Record<Correspondance, string> = {
  exacte: 'bg-accent text-accent-ink',
  presente: 'bg-transparent text-accent border-2 border-accent',
  absente: 'bg-raised-2 text-faint border border-line-strong',
}

function Tuile({ p, c }: { p: Partant; c: Correspondance }) {
  return (
    <span className={`num w-10 h-10 lg:w-12 lg:h-12 shrink-0 rounded-xl grid place-items-center text-[0.9375rem] lg:text-[1.125rem] font-extrabold ${TUILE[c]}`}>
      {p.numero}
    </span>
  )
}

/** « Le 1er prédit, n°10 Cap Horizon, a gagné · 3 des 5 chevaux prédits sont dans les 5 premiers » */
function resume(course: Course): string {
  const f = course.favori
  if (!f) return 'Aucune sélection n’avait été publiée sur cette course.'
  const issue =
    f.arrivee === 1 ? 'a gagné' : f.arrivee != null ? `a terminé ${formatRang(f.arrivee)}` : 'n’a pas été classé'
  const n = retrouvesDansLesCinq(course)
  return `Le 1er prédit, n°${f.numero} ${f.nom}, ${issue} · ${n} des ${arriveePredite(course).length} chevaux prédits ${
    n > 1 ? 'sont' : 'est'
  } dans les 5 premiers`
}

/**
 * « Pronostic face à l'arrivée » — pour une course courue, nos cinq premiers
 * en regard des cinq premiers classés. Plein : bonne place ; contour : dans
 * les cinq, à une autre place ; gris : absent.
 */
export function FaceArrivee({ course }: { course: Course }) {
  const predits = arriveePredite(course)
  const arrives = arriveeRelevee(course)
  const v = verdictCourse(course)
  if (!v) return null

  const ligne = (titre: string, liste: Partant[], autre: Partant[]) => (
    <>
      <span className="label col-span-5 lg:col-span-1">{titre}</span>
      {liste.map((p, i) => (
        <Link
          key={p.numero}
          to={lienPartant(course, p)}
          state={DEPUIS_LA_COURSE}
          preventScrollReset
          aria-label={`${titre} ${formatRang(i + 1)} : ${p.nom}`}
          className="min-w-0 flex justify-center lg:justify-start items-center gap-2.5 group"
        >
          <Tuile p={p} c={correspondance(p.numero, i, autre)} />
          <span className="hidden lg:flex min-w-0 flex-col gap-0.5">
            <span className="text-[0.6875rem] font-bold text-faint">{formatRang(i + 1)}</span>
            <span className="text-[0.8125rem] font-semibold truncate group-hover:text-accent">{p.nom}</span>
          </span>
        </Link>
      ))}
      {/* Une arrivée relevée à moins de cinq : on complète la grille. */}
      {Array.from({ length: Math.max(0, 5 - liste.length) }, (_, i) => (
        <span key={`vide-${i}`} aria-hidden />
      ))}
    </>
  )

  return (
    <section
      aria-labelledby="face-arrivee"
      className="flex flex-col gap-3.5 lg:gap-[1.375rem] p-[1.125rem] lg:p-7 rounded-3xl bg-surface border border-line"
    >
      <div className="flex items-center justify-between gap-3 lg:gap-6">
        <div className="flex flex-col gap-1.5 min-w-0">
          <h2 id="face-arrivee" className="text-[0.9375rem] lg:text-[1.25rem] font-bold tracking-[-0.01em]">
            <span className="lg:hidden">Pronostic vs arrivée</span>
            <span className="hidden lg:inline">Pronostic face à l’arrivée</span>
          </h2>
          <p className="hidden lg:block text-sm font-medium text-muted">{resume(course)}</p>
        </div>
        <span
          className={`shrink-0 text-xs font-extrabold uppercase tracking-[0.06em] rounded-full px-3 py-1.5 ${
            verdictReussi(v) ? 'bg-accent text-accent-ink' : 'bg-raised-2 text-muted border border-line-strong'
          }`}
        >
          {LIBELLE_VERDICT[v]}
        </span>
      </div>
      <p className="lg:hidden text-xs font-medium leading-normal text-muted">{resume(course)}</p>

      <div className="grid grid-cols-5 lg:grid-cols-[10.625rem_repeat(5,minmax(0,1fr))] gap-2 lg:gap-x-4 lg:gap-y-3 items-center">
        {ligne('Pronostic', predits, arrives)}
        {ligne('Arrivée', arrives, predits)}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-4 border-t border-sep text-[0.6875rem] lg:text-xs font-semibold text-faint">
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-[5px] bg-accent" aria-hidden />
          Bonne place
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-[5px] border-2 border-accent" aria-hidden />
          Dans les 5 premiers, autre place
        </span>
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-[5px] bg-raised-2 border border-line-strong" aria-hidden />
          Absent
        </span>
      </div>
    </section>
  )
}
