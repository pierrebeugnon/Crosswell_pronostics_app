import Monogramme from '@/components/brand/Monogramme'

/**
 * L'attente porte la marque. Le spinner circulaire — le chargement le plus
 * générique du web — s'affichait sur les écrans les plus répétés du produit :
 * chaque ouverture du soir et du matin. C'est désormais la fleur Crosswell qui
 * respire (animate-respire, tailwind.config), en vert d'accent : le seul
 * moment où l'app n'a rien à montrer est aussi celui où elle est le plus
 * elle-même.
 */
export function Chargement({ plein = false, texte }: { plein?: boolean; texte?: string }) {
  return (
    <div
      className={plein ? 'min-h-[60vh] grid place-items-center' : 'py-10 grid place-items-center'}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3.5">
        <span className="animate-respire" aria-hidden>
          <Monogramme size={30} color="rgb(var(--c-accent))" />
        </span>
        <span className="text-sm text-faint">{texte ?? 'Chargement…'}</span>
      </div>
    </div>
  )
}

/** Squelette de liste — garde la mise en page stable pendant le chargement. */
export function SqueletteListe({ lignes = 5 }: { lignes?: number }) {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: lignes }, (_, i) => (
        <div key={i} className="skeleton h-16 rounded-2xl" />
      ))}
    </div>
  )
}

export function SqueletteStats({ n = 4 }: { n?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="skeleton h-24 rounded-2xl" />
      ))}
    </div>
  )
}
