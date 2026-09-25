import Monogramme from '@/components/brand/Monogramme'

/**
 * Le logo Crosswell Pronostics, posé à la place de celui des maquettes (décision
 * du 18/09/2026 : on garde notre nom et notre logo). Il en reprend les
 * proportions : pictogramme de 32 px (28 sur téléphone), nom en extra-gras à
 * approche serrée.
 *
 * Le mot « Pronostics » est porté en petites capitales à côté du nom, et non
 * fondu dedans : la marque reste Crosswell, la plateforme n'en est qu'un
 * produit — et l'élevage porte le même nom ailleurs.
 */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 md:gap-3 select-none">
      <Monogramme size={32} color="rgb(var(--c-accent))" className="w-7 h-auto md:w-8" />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display font-extrabold text-[1.125rem] md:text-[1.25rem] tracking-[-0.02em]">
            Crosswell
          </span>
          <span className="label mt-1 text-[0.5625rem] tracking-[0.16em]">Pronostics</span>
        </span>
      )}
    </span>
  )
}
