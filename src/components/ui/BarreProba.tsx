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
    <div className={`h-1.5 rounded-full bg-white/[0.08] overflow-hidden ${className}`} aria-hidden>
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(.22,1,.36,1)]"
        style={{
          width: `${largeur}%`,
          background: accent
            ? 'linear-gradient(90deg, rgb(var(--c-accent-lo)), rgb(var(--c-accent-hi)))'
            : 'rgb(255 255 255 / 0.28)',
          boxShadow: accent ? '0 0 14px -2px rgb(var(--c-accent) / 0.7)' : undefined,
        }}
      />
    </div>
  )
}
