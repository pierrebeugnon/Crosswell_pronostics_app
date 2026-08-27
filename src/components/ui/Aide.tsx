import { HelpCircle } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'

/**
 * Une bulle d'explication au clic — pas au survol.
 *
 * Le survol n'existe pas sur un téléphone, et ce produit se consulte d'abord
 * sur un téléphone, le matin d'une réunion. Un `title` HTML aurait le même
 * défaut.
 */
export function Aide({ children }: { children: ReactNode }) {
  const [ouvert, setOuvert] = useState(false)
  const id = useId()

  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-expanded={ouvert}
        aria-controls={id}
        aria-label="Explication"
        onClick={() => setOuvert((o) => !o)}
        onBlur={() => setOuvert(false)}
        className="tap text-faint hover:text-accent transition-colors"
      >
        <HelpCircle size={14} strokeWidth={2} />
      </button>
      {ouvert && (
        <span
          id={id}
          role="tooltip"
          className="glass-strong absolute z-30 left-1/2 -translate-x-1/2 top-7 w-64 p-3.5
                     rounded-2xl text-xs leading-relaxed text-muted font-normal normal-case tracking-normal
                     animate-fade-up"
        >
          {children}
        </span>
      )}
    </span>
  )
}
