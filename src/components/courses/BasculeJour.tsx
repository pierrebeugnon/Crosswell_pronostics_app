export type Jour = 'aujourdhui' | 'demain'

/**
 * La bascule Aujourd'hui / Demain des maquettes : un rail sombre, deux pilules
 * de même largeur, la pilule active en aplat vert. `actif` vaut null quand la
 * page montre un autre jour (un lien vers une course passée) : aucune pilule
 * n'est alors allumée, et chacune ramène à son jour.
 */
export function BasculeJour({
  actif,
  onChoisir,
  className = '',
}: {
  actif: Jour | null
  onChoisir: (j: Jour) => void
  className?: string
}) {
  const pilule = (j: Jour, libelle: string) => (
    <button
      type="button"
      aria-pressed={actif === j}
      onClick={() => onChoisir(j)}
      className={`h-11 lg:h-10 px-[1.375rem] rounded-full text-sm font-bold transition-colors ${
        actif === j ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink'
      }`}
    >
      {libelle}
    </button>
  )

  return (
    <div
      role="group"
      aria-label="Jour"
      className={`grid grid-cols-2 gap-1 p-1 rounded-full bg-well border border-line ${className}`}
    >
      {pilule('aujourdhui', 'Aujourd’hui')}
      {pilule('demain', 'Demain')}
    </div>
  )
}
