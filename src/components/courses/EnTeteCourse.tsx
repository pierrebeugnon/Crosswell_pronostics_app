import { Link } from 'react-router-dom'
import type { Course } from '@/types'
import { distance as formatDistance, hippodrome as formatHippodrome } from '@/lib/format'
import { AvecUnPass } from '@/components/acces/Verrou'
import { confianceCourse, type Confiance } from '@/lib/programme'

/** Les trois barres croissantes de la confiance, allumées jusqu'au niveau atteint. */
export function BarresConfiance({ confiance, petit = false }: { confiance: Confiance | null; petit?: boolean }) {
  return (
    <span className={`flex items-end gap-1 ${petit ? 'h-5' : 'h-[1.625rem]'}`} aria-hidden>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`block ${petit ? 'w-1.5 rounded-[2px]' : 'w-2 rounded-[3px]'} ${
            confiance && i <= confiance.niveau ? 'bg-accent' : 'bg-line-strong'
          }`}
          style={{ height: petit ? 6 + i * 5 : 8 + i * 6 }}
        />
      ))}
    </span>
  )
}

/**
 * L'en-tête d'une course : repère (numéro, hippodrome, heure), nom, étiquettes,
 * et, à droite sur grand écran, l'encart « Confiance du pronostic ».
 */
export function EnTeteCourse({ course }: { course: Course }) {
  const c = course
  const confiance = confianceCourse(c)
  const etiquettes = [
    c.type,
    c.distance != null ? formatDistance(c.distance) : null,
    `${c.partants} partants`,
    c.nonPartants > 0 ? `${c.nonPartants} non-partant${c.nonPartants > 1 ? 's' : ''}` : null,
  ].filter((e): e is string => !!e)

  return (
    <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-2 lg:gap-8">
      <div className="flex flex-col gap-2 lg:gap-3 min-w-0">
        <p className="num flex flex-wrap items-center gap-x-2 gap-y-1 text-xs lg:text-[0.8125rem] font-semibold text-faint">
          <span className="text-accent">C{c.numero}</span>
          <span aria-hidden>·</span>
          <span>{formatHippodrome(c.hippodrome)}</span>
          {c.heureDepart && (
            <>
              <span aria-hidden>·</span>
              <span>Départ {c.heureDepart}</span>
            </>
          )}
        </p>
        <h1 className="text-[1.4375rem] lg:text-[2.125rem] font-extrabold tracking-[-0.025em] leading-[1.08]">
          {c.nom ?? `Course ${c.numero}`}
        </h1>

        {/* Téléphone : une ligne de méta et la confiance en ligne, comme la maquette mobile. */}
        <p className="lg:hidden num text-[0.8125rem] font-medium text-faint">{etiquettes.join(' · ')}</p>
        <div className="lg:hidden flex items-center gap-2.5 mt-1">
          {c.courue && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-ink text-accent-ink">Terminée</span>
          )}
          {c.verrouillee ? (
            <AvecUnPass />
          ) : (
            <>
              <BarresConfiance confiance={confiance} petit />
              <span className="text-[0.8125rem] font-semibold text-soft">
                Confiance {confiance ? confiance.libelle.toLowerCase() : 'non évaluée'}
              </span>
            </>
          )}
        </div>
        <Link to="/methode#lire" className="lg:hidden self-start min-h-8 flex items-center text-xs font-bold text-accent">
          Comment lire ce pronostic ?
        </Link>

        <div className="hidden lg:flex flex-wrap gap-2">
          {c.courue && (
            <span className="text-[0.8125rem] font-bold px-3 py-1.5 rounded-full bg-ink text-accent-ink">
              Terminée · arrivée relevée
            </span>
          )}
          {etiquettes.map((e) => (
            <span key={e} className="chip-neutral num">
              {e}
            </span>
          ))}
        </div>
      </div>

      <div className="hidden lg:flex shrink-0 flex-col gap-2.5 min-w-[13.125rem] px-5 py-4 rounded-2xl bg-surface border border-line">
        <span className="label">Confiance du pronostic</span>
        {/* Formule Gratuit : la confiance est calculée, mais réservée aux Pass (`db/007`). */}
        {c.verrouillee ? (
          <AvecUnPass className="!text-sm min-h-[1.625rem]" />
        ) : (
          <span className="flex items-center gap-3">
            <BarresConfiance confiance={confiance} />
            <span className="text-[1.0625rem] font-bold">{confiance ? confiance.libelle : 'Non évaluée'}</span>
          </span>
        )}
        <Link to="/methode#lire" className="text-xs font-bold text-accent hover:text-accent-hover">
          Comment lire ce pronostic ?
        </Link>
      </div>
    </header>
  )
}
