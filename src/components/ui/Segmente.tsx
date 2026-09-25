import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

export interface Option<T extends string> {
  valeur: T
  libelle: string
}

/**
 * CHOIX EXCLUSIF EN PASTILLES — une période, un axe, une issue.
 *
 * Sémantiquement c'est un groupe de boutons radio, pas des onglets : aucun
 * panneau n'est associé à chaque option, et un lecteur d'écran qui annonçait
 * « onglet 2 sur 4 » faisait attendre un panneau qui n'existait pas. Clavier des
 * radios : une seule tabulation pour entrer dans le groupe, flèches pour
 * changer (le choix suit le focus), Début / Fin.
 *
 * `valeur` peut n'appartenir à aucune option (période choisie ailleurs) : aucun
 * bouton n'est alors coché, et la première option reçoit la tabulation.
 */
export function Segmente<T extends string>({
  options,
  valeur,
  onChange,
  aria,
}: {
  options: Option<T>[]
  valeur: T
  onChange: (v: T) => void
  aria: string
}) {
  const conteneur = useRef<HTMLDivElement>(null)
  // Fondu à droite TANT QU'il reste des options cachées : à 375 px, « Cotes » ou
  // « Hors des trois » étaient invisibles sans aucun indice qu'on pouvait défiler.
  const [suite, setSuite] = useState(false)
  useEffect(() => {
    const el = conteneur.current
    if (!el) return
    const mesurer = () => setSuite(el.scrollLeft + el.clientWidth < el.scrollWidth - 2)
    mesurer()
    el.addEventListener('scroll', mesurer, { passive: true })
    const obs = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(mesurer)
    obs?.observe(el)
    return () => {
      el.removeEventListener('scroll', mesurer)
      obs?.disconnect()
    }
  }, [options.length])
  const index = options.findIndex((o) => o.valeur === valeur)
  const entree = index === -1 ? 0 : index

  // L'option cochée reste visible quand le groupe défile (375 px) : sinon
  // « Tout » choisi par un lien partagé serait coché hors de l'écran.
  useEffect(() => {
    const el = conteneur.current
    const actif = el?.querySelector<HTMLElement>('[aria-checked="true"]')
    if (!el || !actif) return
    const g = actif.offsetLeft
    const d = g + actif.offsetWidth
    if (g < el.scrollLeft) el.scrollLeft = g - 8
    else if (d > el.scrollLeft + el.clientWidth) el.scrollLeft = d - el.clientWidth + 8
  }, [valeur])

  function clavier(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    let cible: number | null = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') cible = (i + 1) % options.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') cible = (i - 1 + options.length) % options.length
    else if (e.key === 'Home') cible = 0
    else if (e.key === 'End') cible = options.length - 1
    if (cible == null) return
    e.preventDefault()
    onChange(options[cible].valeur)
    conteneur.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[cible]?.focus()
  }

  return (
    <div
      ref={conteneur}
      role="radiogroup"
      aria-label={aria}
      /* `max-w-full` + défilement : à quatre options aux libellés longs, le
         contrôle dépasse 375 px. Sans cela il se ferait rogner par la carte qui
         le contient, et les dernières options deviendraient inatteignables sur
         téléphone — panne invisible sur un écran large. */
      className={`bg-well border border-line inline-flex max-w-full overflow-x-auto rounded-full p-1 gap-0.5
                 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${suite ? 'fade-r' : ''}`}
    >
      {options.map((o, i) => {
        const actif = o.valeur === valeur
        return (
          <button
            key={o.valeur}
            type="button"
            role="radio"
            aria-checked={actif}
            tabIndex={i === entree ? 0 : -1}
            onClick={() => onChange(o.valeur)}
            onKeyDown={(e) => clavier(e, i)}
            className={`shrink-0 px-3.5 h-11 sm:h-8 rounded-full text-sm font-bold transition-colors whitespace-nowrap ${
              actif
                ? 'bg-accent text-accent-ink'
                : 'text-muted hover:text-ink'
            }`}
          >
            {o.libelle}
          </button>
        )
      })}
    </div>
  )
}
