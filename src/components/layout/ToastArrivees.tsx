import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Flag, X } from 'lucide-react'
import { useDonnees } from '@/data/DonneesContext'
import { hippodrome as formatHippodrome } from '@/lib/format'
import type { Course } from '@/types'

/** Le temps de lire une ligne et de décider de cliquer — pas plus. */
const DUREE_MS = 8000

/**
 * L'accusé de réception du direct. Quand une arrivée tombe pendant que le
 * client regarde une autre page, ce toast est le seul signal : sans lui, le
 * polling remplace les chips en silence et le produit paraît figé alors qu'il
 * vient précisément de vivre.
 *
 * Une seule course est mise en avant même quand la resynchronisation en
 * apporte plusieurs (retour d'onglet après une heure) : un toast-liste devient
 * un panneau, et un panneau se ferme sans être lu. On nomme la plus récente et
 * on compte le reste.
 */
export function ToastArrivees() {
  const { arrivees } = useDonnees()
  const [visibles, setVisibles] = useState<Course[] | null>(null)

  useEffect(() => {
    if (arrivees.length === 0) return
    setVisibles(arrivees)
    const timer = window.setTimeout(() => setVisibles(null), DUREE_MS)
    return () => window.clearTimeout(timer)
  }, [arrivees])

  if (!visibles || visibles.length === 0) return null
  const premiere = visibles[0]
  const autres = visibles.length - 1

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 z-50 flex justify-center px-4 pointer-events-none
                 bottom-24 md:bottom-6"
    >
      <div
        className="glass-strong pointer-events-auto flex items-center gap-3 rounded-full
                   py-2 pl-3 pr-2 max-w-md animate-fade-up"
      >
        <span
          className="shrink-0 w-8 h-8 rounded-full bg-accent/15 border border-accent/25
                     grid place-items-center text-accent"
          aria-hidden
        >
          <Flag size={14} />
        </span>

        <Link
          to={`/courses/${premiere.date}/${encodeURIComponent(premiere.hippodrome)}/${premiere.numero}`}
          className="min-w-0 text-sm hover:underline underline-offset-4"
          onClick={() => setVisibles(null)}
        >
          <span className="font-medium">Arrivée — {premiere.nom ?? `course ${premiere.numero}`}</span>
          <span className="num text-faint">
            {' '}
            · {formatHippodrome(premiere.hippodrome)}
            {autres > 0 && ` · +${autres} autre${autres > 1 ? 's' : ''}`}
          </span>
        </Link>

        <button
          type="button"
          onClick={() => setVisibles(null)}
          aria-label="Fermer la notification"
          className="tap shrink-0 w-8 h-8 rounded-full grid place-items-center text-faint
                     hover:text-ink hover:bg-raised transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
