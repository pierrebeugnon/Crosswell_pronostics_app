export interface Option<T extends string> {
  valeur: T
  libelle: string
}

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
  return (
    <div
      role="tablist"
      aria-label={aria}
      /* `max-w-full` + défilement : à quatre options aux libellés longs, le
         contrôle dépasse 375 px. Sans cela il se ferait rogner par la carte qui
         le contient, et les dernières options deviendraient inatteignables sur
         téléphone — panne invisible sur un écran large. */
      className="glass-nest inline-flex max-w-full overflow-x-auto rounded-full p-1 gap-0.5
                 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {options.map((o) => {
        const actif = o.valeur === valeur
        return (
          <button
            key={o.valeur}
            role="tab"
            aria-selected={actif}
            onClick={() => onChange(o.valeur)}
            className={`shrink-0 px-3.5 h-11 sm:h-8 rounded-full text-[0.8125rem] font-medium transition-all whitespace-nowrap ${
              actif
                ? 'bg-white/[0.12] text-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.14)]'
                : 'text-faint hover:text-muted'
            }`}
          >
            {o.libelle}
          </button>
        )
      })}
    </div>
  )
}
