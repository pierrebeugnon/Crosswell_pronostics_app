/**
 * La tuile carrée numérotée des maquettes : le numéro d'un cheval dans une
 * arrivée prédite, un top 3, une opportunité. Pleine et verte pour notre
 * premier choix, sombre et bordée pour les autres. Le rayon suit la taille
 * (environ 28 %), comme dans la maquette.
 */
const TAILLES = {
  xs: 'w-7 h-7 rounded-[8px] text-xs',
  sm: 'w-[1.875rem] h-[1.875rem] rounded-[8px] text-[0.8125rem]',
  md: 'w-10 h-10 rounded-[11px] text-[0.9375rem]',
  lg: 'w-14 h-14 rounded-2xl text-[1.25rem]',
} as const

export function TuileNumero({
  numero,
  taille = 'sm',
  accent = false,
  className = '',
}: {
  numero: number
  taille?: keyof typeof TAILLES
  accent?: boolean
  className?: string
}) {
  return (
    <span
      className={`num shrink-0 grid place-items-center font-extrabold ${TAILLES[taille]} ${
        accent ? 'bg-accent text-accent-ink' : 'bg-raised-2 text-ink border border-line-strong'
      } ${className}`}
    >
      <span className="sr-only">n°</span>
      {numero}
    </span>
  )
}
