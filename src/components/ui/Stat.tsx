import type { ReactNode } from 'react'

/**
 * Une tuile de chiffre. `precision` porte l'incertitude — sur deux semaines de
 * courses, un taux sans son intervalle est une affirmation que les données ne
 * soutiennent pas.
 *
 * `accent` réserve la carte verte : une seule par écran, sur le chiffre qui
 * porte la page. Deux tuiles vertes côte à côte et plus aucune ne ressort.
 */
export function Stat({
  libelle,
  valeur,
  unite,
  precision,
  note,
  accent = false,
  icone,
}: {
  libelle: string
  valeur: ReactNode
  unite?: string
  precision?: string
  note?: ReactNode
  accent?: boolean
  icone?: ReactNode
}) {
  return (
    <div className={accent ? 'card-accent p-4 sm:p-5' : 'card-nest p-4 sm:p-5'}>
      <div className={`flex items-center gap-1.5 text-xs ${accent ? 'text-accent' : 'text-faint'}`}>
        {icone}
        <span>{libelle}</span>
      </div>

      <div className="mt-2.5 flex items-baseline gap-1">
        <span
          className={`num text-[1.75rem] sm:text-[2rem] font-bold tracking-tight leading-none ${
            accent ? 'texte-accent' : ''
          }`}
        >
          {valeur}
        </span>
        {unite && (
          <span className={`text-sm font-medium ${accent ? 'text-accent/70' : 'text-faint'}`}>
            {unite}
          </span>
        )}
      </div>

      {precision && <div className="num mt-2 text-[0.6875rem] text-faint">{precision}</div>}
      {note && <div className="mt-2.5 text-xs text-muted leading-relaxed">{note}</div>}
    </div>
  )
}
