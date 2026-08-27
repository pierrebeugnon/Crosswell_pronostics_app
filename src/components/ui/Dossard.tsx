/**
 * Le numéro du cheval, porté comme sur la piste : une petite plaque, pas un
 * chiffre gris perdu dans le texte.
 *
 * La forme est un squircle (`rounded-[30%]`) — l'écho discret de la géométrie
 * du monogramme Crosswell — avec le filet de lumière supérieur du verre.
 * C'est le composant le plus répété de l'app : chaque liste de partants le
 * porte, et c'est précisément pour ça qu'il fait la signature — un détail
 * qu'on croise cent fois par soirée finit par être l'identité du produit.
 *
 * DISCRET PAR CONSTRUCTION. Le dossard dit « qui », jamais « combien » : la
 * hiérarchie (notre rang, le gagnant) reste portée par les pastilles de rang
 * et les chips — deux dossards se ressemblent toujours, quel que soit le
 * destin du cheval. Une seule variante `accent`, réservée au partant que la
 * carte met déjà en avant.
 */
const TAILLES = {
  sm: 'w-[1.375rem] h-[1.375rem] text-[0.6875rem]',
  md: 'w-6 h-6 text-xs',
} as const

export function Dossard({
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
      aria-label={`numéro ${numero}`}
      className={`num inline-grid place-items-center align-middle shrink-0 rounded-[30%]
                  font-bold leading-none select-none ${TAILLES[taille]} ${
                    accent
                      ? 'bg-accent/15 text-accent border border-accent/30'
                      : 'bg-white/[0.07] text-ink/85 border border-white/[0.14]'
                  } shadow-[inset_0_1px_0_rgb(255_255_255/0.10)] ${className}`}
    >
      {numero}
    </span>
  )
}
