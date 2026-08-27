import { useId } from 'react'
import { useCompteur } from '@/lib/useCompteur'
import { useDeploiement } from '@/lib/useDeploiement'

/**
 * Jauge en FER À CHEVAL — l'anneau fermé à 360° est la jauge de n'importe quel
 * dashboard ; ouvert de 110° par le bas, l'arc prend la silhouette de l'objet
 * le plus hippique qui soit, sans un pixel de dessin en plus. Les extrémités
 * rondes (strokeLinecap) font le reste.
 *
 * L'arc sombre derrière l'arc vert n'est pas décoratif : il porte l'échelle —
 * il dessine le fer complet, et la valeur le remplit. Sans lui, 30 % et 70 %
 * se ressemblent quand on ne regarde pas le chiffre.
 *
 * L'arc SE DÉPLOIE à l'apparition (voir useDeploiement) et le chiffre compte
 * pendant ce temps : deux mouvements de même durée, un seul geste.
 */

/** Ouverture du fer, en degrés, centrée sur le bas. */
const OUVERTURE = 110

export function Jauge({
  valeur,
  libelle,
  taille = 104,
}: {
  valeur: number
  libelle: string
  taille?: number
}) {
  const id = useId()
  const pret = useDeploiement()
  const r = taille / 2 - 8
  const circonference = 2 * Math.PI * r
  /* L'arc utile couvre 360 − OUVERTURE degrés. La rotation place son départ
     juste à gauche de l'ouverture : 90° (le bas) + OUVERTURE/2. */
  const arc = ((360 - OUVERTURE) / 360) * circonference
  const rotation = 90 + OUVERTURE / 2
  const rempli = pret ? Math.max(0, Math.min(1, valeur)) * arc : 0
  const compteur = useCompteur(Math.round(valeur * 100), 800)

  return (
    <div className="flex flex-col items-center gap-2.5">
      <svg
        width={taille}
        height={taille}
        viewBox={`0 0 ${taille} ${taille}`}
        role="img"
        aria-label={`${libelle} : ${Math.round(valeur * 100)} %`}
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgb(var(--c-accent-hi))" />
            <stop offset="100%" stopColor="rgb(var(--c-accent-lo))" />
          </linearGradient>
        </defs>
        <circle
          cx={taille / 2}
          cy={taille / 2}
          r={r}
          fill="none"
          stroke="rgb(255 255 255 / 0.09)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${arc} ${circonference}`}
          transform={`rotate(${rotation} ${taille / 2} ${taille / 2})`}
        />
        <circle
          cx={taille / 2}
          cy={taille / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${rempli} ${circonference}`}
          transform={`rotate(${rotation} ${taille / 2} ${taille / 2})`}
          style={{ transition: 'stroke-dasharray .8s cubic-bezier(.22,1,.36,1)' }}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          className="num fill-ink"
          style={{ fontSize: taille * 0.25, fontWeight: 700 }}
        >
          {Math.round(compteur)}
        </text>
        <text
          x="50%"
          y="50%"
          dy={taille * 0.2}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-faint"
          style={{ fontSize: taille * 0.1 }}
        >
          %
        </text>
      </svg>
      <span className="text-xs text-muted text-center leading-tight max-w-[10rem]">{libelle}</span>
    </div>
  )
}
