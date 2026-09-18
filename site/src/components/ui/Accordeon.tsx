/**
 * La FAQ des maquettes (`Landing`, `How`), en `<details>` natifs.
 *
 * Pas d'état React, et c'est délibéré : `<details>` s'ouvre sans JavaScript, se
 * cherche avec Ctrl+F et s'imprime déplié. `name` groupe les entrées : ouvrir
 * une réponse referme la précédente, comme la maquette ; un navigateur qui ne
 * connaît pas l'attribut laisse plusieurs réponses ouvertes, sans dommage. La
 * première est ouverte d'entrée, comme dans la maquette.
 */
export interface Question {
  q: string
  r: string
}

export function Accordeon({
  questions,
  nom = 'faq',
  compact = false,
}: {
  questions: readonly Question[]
  nom?: string
  /** La variante de « Comment ça marche » : un cran plus petite. */
  compact?: boolean
}) {
  return (
    <div className="flex flex-col">
      {questions.map((item, i) => (
        <details key={item.q} name={nom} open={i === 0} className="group border-t border-sep">
          <summary
            className={`flex items-center justify-between gap-4 py-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden font-bold hover:text-accent transition-colors ${
              compact ? 'min-h-[3.75rem] text-[0.9375rem] lg:text-[0.9375rem]' : 'min-h-16 text-[0.9375rem] lg:text-[1rem]'
            }`}
          >
            <span>{item.q}</span>
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden className="shrink-0">
              <path d="M6 12h12" fill="none" stroke="rgb(var(--c-accent))" strokeWidth={2.2} strokeLinecap="round" />
              <path
                d="M12 6v12"
                fill="none"
                stroke="rgb(var(--c-accent))"
                strokeWidth={2.2}
                strokeLinecap="round"
                className="group-open:hidden"
              />
            </svg>
          </summary>
          <p className="pb-5 max-w-[47.5rem] text-sm lg:text-[0.9375rem] font-medium leading-[1.65] text-muted">{item.r}</p>
        </details>
      ))}
    </div>
  )
}
