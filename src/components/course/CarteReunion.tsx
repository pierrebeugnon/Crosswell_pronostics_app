import { Link } from 'react-router-dom'
import { ArrowUpRight, MapPin } from 'lucide-react'
import type { Reunion } from '@/types'
import { dateRelative, hippodrome as formatHippodrome } from '@/lib/format'

/**
 * Une réunion en carte de verre. Le sous-titre change selon l'état : une
 * réunion à venir annonce son volume, une réunion terminée annonce son
 * résultat. Afficher « 0 gagnée sur 0 courue » avant le départ ferait passer
 * une absence de mesure pour un échec.
 */
export function CarteReunion({
  reunion,
  montrerDate = false,
}: {
  reunion: Reunion
  montrerDate?: boolean
}) {
  const { date, hippodrome, courses, courues, gagnees } = reunion
  const total = courses.length
  const enCours = courues > 0 && courues < total

  return (
    <Link
      to={`/reunions/${date}/${encodeURIComponent(hippodrome)}`}
      className="card group relative overflow-hidden p-5 flex items-center gap-4
                 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift
                 hover:!border-white/20 active:scale-[0.99] animate-fade-up"
    >
      {/* Lueur qui s'allume au survol — la carte réagit à la lumière plutôt
          qu'à un changement de couleur de fond. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-10 w-44 h-44 rounded-full
                   opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: 'radial-gradient(circle, rgb(var(--c-accent) / 0.18), transparent 70%)',
        }}
      />

      <span className="relative w-11 h-11 rounded-2xl glass-nest grid place-items-center text-accent shrink-0">
        <MapPin size={18} />
      </span>

      <div className="relative min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold tracking-tight truncate">{formatHippodrome(hippodrome)}</h3>
          {montrerDate && <span className="chip-neutral">{dateRelative(date)}</span>}
          {enCours && <span className="chip-win">En cours</span>}
        </div>
        <p className="num text-sm text-muted mt-1.5">
          {total} course{total > 1 ? 's' : ''}
          {courues > 0 ? (
            <>
              <span className="text-faint"> · </span>
              {courues} courue{courues > 1 ? 's' : ''}
              <span className="text-faint"> · </span>
              <span className={gagnees > 0 ? 'text-win font-medium' : 'text-muted'}>
                {gagnees} gagnée{gagnees > 1 ? 's' : ''}
              </span>
            </>
          ) : (
            <span className="text-faint"> · pronostics disponibles</span>
          )}
        </p>
      </div>

      <ArrowUpRight
        size={18}
        className="relative text-faint group-hover:text-accent transition-colors shrink-0"
      />
    </Link>
  )
}
