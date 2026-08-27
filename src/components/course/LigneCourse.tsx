import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { Course } from '@/types'
import { cote as formatCote, distance as formatDistance, pourcent } from '@/lib/format'
import { EtiquetteStatut, EtiquetteType } from '@/components/ui/Etiquettes'
import { Dossard } from '@/components/ui/Dossard'

/**
 * Une course dans la liste d'une réunion.
 *
 * NOTRE SÉLECTION EST VISIBLE SUR TÉLÉPHONE, et ce n'est pas un détail. La
 * première version la reléguait derrière un `hidden sm:block` : à 375 px, la
 * ligne n'affichait plus que « Prix Quacourt · 1 800 m · 9 partants », c'est-à-
 * dire le programme des courses que n'importe quel site publie gratuitement.
 * Le seul contenu qui justifie l'abonnement — sur quel cheval nous sommes, et
 * avec quelle confiance — disparaissait précisément sur l'appareil depuis
 * lequel on consulte la veille au soir et le matin de la réunion.
 *
 * D'où deux dispositions et non une seule échelle : sur téléphone la sélection
 * passe en bandeau sous l'intitulé, sur grand écran elle reprend sa colonne à
 * droite. Le classement complet reste à un clic — à ce niveau de lecture, le
 * client cherche « sur quoi Crosswell est-il ? », pas la distribution des seize
 * partants.
 */
export function LigneCourse({ course }: { course: Course }) {
  const f = course.favori

  return (
    <Link
      to={`/courses/${course.date}/${encodeURIComponent(course.hippodrome)}/${course.numero}`}
      className="group block px-4 py-4 sm:px-5 transition-colors hover:bg-white/[0.04] active:bg-white/[0.07]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        {/* Intitulé */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <span
            className="num shrink-0 w-9 h-9 rounded-xl glass-nest grid place-items-center
                       text-sm font-semibold text-muted"
            aria-hidden
          >
            {course.numero}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium leading-snug break-words">
                {course.nom ?? `Course ${course.numero}`}
              </span>
              {/* Le statut suit l'intitulé sur téléphone, où il n'y a pas de
                  colonne de droite pour l'accueillir. */}
              <span className="shrink-0 sm:hidden">
                <EtiquetteStatut course={course} />
              </span>
            </div>

            <p className="num text-xs text-faint mt-1.5 flex items-center gap-1.5 flex-wrap">
              <EtiquetteType type={course.type} />
              <span>{formatDistance(course.distance)}</span>
              <span className="opacity-50">·</span>
              <span>{course.partants ?? '—'} partants</span>
            </p>
          </div>
        </div>

        {/* Notre sélection */}
        {f && (
          <div
            className="card-nest px-3.5 py-2.5 flex items-center gap-3 sm:border-0 sm:bg-transparent
                       sm:shadow-none sm:p-0 sm:w-44 sm:shrink-0 sm:block sm:text-right"
          >
            <span className="label !text-[0.5625rem] shrink-0 sm:hidden">Notre&nbsp;sélection</span>
            <span className="hidden sm:block label !text-[0.625rem]">Notre sélection</span>

            <span className="min-w-0 flex-1 text-sm font-medium truncate sm:block sm:mt-0.5">
              <Dossard numero={f.numero} className="mr-1.5" />
              {f.nom}
            </span>

            <span className="num shrink-0 flex items-baseline gap-2 sm:justify-end">
              <span className="text-accent font-semibold">{pourcent(f.pWin)}</span>
              {f.cote != null && (
                <span className="text-xs text-faint">{formatCote(f.cote)}</span>
              )}
            </span>
          </div>
        )}

        {/* Statut et chevron : colonne de droite, grand écran seulement. */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <EtiquetteStatut course={course} />
          <ChevronRight
            size={16}
            className="text-faint group-hover:text-accent transition-colors"
          />
        </div>
      </div>
    </Link>
  )
}
