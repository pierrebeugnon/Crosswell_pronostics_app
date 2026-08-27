import Monogramme from '@/components/brand/Monogramme'

/**
 * Le mot-clé « Pronostics » est porté en petites capitales à côté du nom, et
 * non fondu dedans : la marque reste Crosswell, la plateforme n'en est qu'un
 * produit — et l'élevage porte le même nom ailleurs.
 */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      <Monogramme size={26} color="rgb(var(--c-accent))" />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display font-semibold text-[1.0625rem] tracking-tight">Crosswell</span>
          <span className="label mt-1 text-[0.5625rem] tracking-[0.16em]">Pronostics</span>
        </span>
      )}
    </span>
  )
}
