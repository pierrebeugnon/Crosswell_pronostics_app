import { useDeploiement } from '@/lib/useDeploiement'

/**
 * Barre de probabilité. L'échelle est RELATIVE au meilleur partant de la
 * course, pas à 100 % : une course à seize partants plafonne vers 25 %, et une
 * échelle absolue y écraserait toutes les barres au ras du sol, rendant la
 * hiérarchie illisible — précisément ce qu'on cherche à montrer.
 *
 * La barre SE DÉPLOIE à l'apparition : premier rendu à zéro, puis la
 * transition de largeur — écrite ici depuis le début mais qui ne se jouait
 * jamais — l'amène à sa valeur (voir useDeploiement).
 */
export function BarreProba({
  valeur,
  maximum,
  accent = false,
  className = '',
}: {
  valeur: number | null
  maximum: number
  accent?: boolean
  className?: string
}) {
  const pret = useDeploiement()
  const largeur =
    !pret || valeur == null || maximum <= 0 ? 0 : Math.max(2, (valeur / maximum) * 100)

  return (
    <div className={`h-2 rounded-full bg-track overflow-hidden ${className}`} aria-hidden>
      {/* Maquette : aplat vert pour les trois premiers, vert éteint au-delà. */}
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(.22,1,.36,1)]"
        style={{
          width: `${largeur}%`,
          background: accent ? 'rgb(var(--c-accent))' : 'rgb(var(--c-accent-dim))',
        }}
      />
    </div>
  )
}
