import { useId } from 'react'
import type { Course } from '@/types'
import { pourcent } from '@/lib/format'
import { useDeploiement } from '@/lib/useDeploiement'

/**
 * L'axe de peloton : chaque partant est une pastille posée sur un rail, à
 * l'abscisse de sa probabilité de victoire. C'est la réponse d'un seul regard
 * à la question que le tableau, en dessous, ne peut pas donner : la course
 * est-elle un cavalier seul, un duel, ou un mouchoir ?
 *
 * Le rail est dessiné dans le langage du site (hairlines blanches basses) et
 * la « ligne d'arrivée » — le bord droit, où vit le favori — porte le halo
 * vert. L'échelle va de 0 au meilleur partant, arrondi au-dessus : une échelle
 * à 100 % écraserait tout le peloton dans le premier quart.
 *
 * ANTI-CHEVAUCHEMENT : les pastilles sont réparties sur trois rangées ; deux
 * chevaux à probabilité voisine se décalent verticalement au lieu de se
 * recouvrir. La rangée ne code RIEN — seule l'abscisse parle — et le rail
 * traverse les trois pour le rappeler.
 *
 * Deux viewBox choisis par CSS, comme la courbe du héros : le format large
 * rendrait des pastilles de 6 px sur un téléphone.
 */

const FORMATS = {
  etroit: { L: 380, H: 128, r: 12, police: 10 },
  large: { L: 720, H: 132, r: 13, police: 11 },
} as const

/** Position des trois rangées, en part de la hauteur utile. */
const RANGEES = [0.5, 0.22, 0.78]

function Axe({
  course,
  format,
  className,
}: {
  course: Course
  format: keyof typeof FORMATS
  className: string
}) {
  const id = useId()
  const pret = useDeploiement()
  const { L, H, r, police } = FORMATS[format]

  const partants = course.liste.filter((p) => p.pWin != null)
  const max = Math.max(...partants.map((p) => p.pWin ?? 0)) * 1.12
  const gauche = 10
  const droite = L - 26
  const x = (p: number) => gauche + (p / max) * (droite - gauche)

  const hautRail = 18
  const basRail = H - 30
  const y = (part: number) => hautRail + part * (basRail - hautRail)

  /* Répartition : triés par probabilité décroissante, chaque pastille prend la
     rangée centrale sauf si elle y toucherait la précédente — elle alterne
     alors haut/bas. Trois rangées suffisent : au-delà de trois chevaux dans le
     même couloir de probabilité, le recouvrement DIT le mouchoir. */
  const ordonnes = [...partants].sort((a, b) => (b.pWin ?? 0) - (a.pWin ?? 0))
  const poses: { px: number; rangee: number }[] = []
  const positions = ordonnes.map((p) => {
    const px = x(p.pWin ?? 0)
    let rangee = 0
    for (const candidate of [0, 1, 2]) {
      if (!poses.some((q) => q.rangee === candidate && Math.abs(q.px - px) < r * 2.1)) {
        rangee = candidate
        break
      }
    }
    poses.push({ px, rangee })
    return { partant: p, px, py: y(RANGEES[rangee]) }
  })

  return (
    <svg
      viewBox={`0 0 ${L} ${H}`}
      className={`w-full h-auto ${className}`}
      role="img"
      aria-label={`Répartition des ${partants.length} partants selon leur probabilité de victoire, de 0 à ${pourcent(max)}.`}
    >
      <defs>
        <linearGradient id={`${id}-fil`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--c-accent))" stopOpacity="0" />
          <stop offset="50%" stopColor="rgb(var(--c-accent))" stopOpacity="0.9" />
          <stop offset="100%" stopColor="rgb(var(--c-accent))" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Le rail : trois hairlines, la centrale un peu plus présente. */}
      {RANGEES.map((part, i) => (
        <line
          key={part}
          x1={gauche}
          x2={droite + 12}
          y1={y(part)}
          y2={y(part)}
          stroke={`rgb(255 255 255 / ${i === 0 ? 0.09 : 0.05})`}
          strokeWidth="1"
        />
      ))}

      {/* La ligne d'arrivée, et son halo. */}
      <line
        x1={droite + 12}
        x2={droite + 12}
        y1={hautRail - 6}
        y2={basRail + 6}
        stroke={`url(#${id}-fil)`}
        strokeWidth="2"
      />

      {/* Graduations de lecture. */}
      <text x={gauche} y={H - 8} fontSize={police} fill="rgb(var(--c-faint))" className="num">
        0 %
      </text>
      <text
        x={droite + 12}
        y={H - 8}
        fontSize={police}
        fill="rgb(var(--c-faint))"
        textAnchor="end"
        className="num"
      >
        {pourcent(max)}
      </text>

      {positions.map(({ partant: p, px, py }, i) => {
        const favori = p.rang === 1
        return (
          <g
            key={p.numero}
            opacity={pret ? 1 : 0}
            style={{
              transition: `opacity .5s ease ${Math.min(i, 10) * 45}ms`,
            }}
          >
            <title>{`${p.numero} ${p.nom} — ${pourcent(p.pWin)}${p.rang != null ? ` (notre rang ${p.rang})` : ''}`}</title>
            {favori && (
              <circle cx={px} cy={py} r={r + 4.5} fill="rgb(var(--c-accent) / 0.16)" />
            )}
            <circle
              cx={px}
              cy={py}
              r={r}
              fill={favori ? 'rgb(var(--c-accent))' : 'rgb(28 32 30)'}
              stroke={favori ? 'none' : 'rgb(255 255 255 / 0.16)'}
              strokeWidth="1"
            />
            <text
              x={px}
              y={py}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={police}
              fontWeight={700}
              className="num"
              fill={favori ? 'rgb(var(--c-accent-ink))' : 'rgb(var(--c-ink) / 0.85)'}
            >
              {p.numero}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function AxePeloton({ course }: { course: Course }) {
  const partants = course.liste.filter((p) => p.pWin != null)
  // Sous quatre partants mesurables, l'axe ne montre rien que le tableau ne
  // dise mieux.
  if (partants.length < 4) return null

  return (
    <div className="card p-4 sm:p-5">
      <p className="label mb-1">La physionomie de la course</p>
      <Axe course={course} format="etroit" className="sm:hidden" />
      <Axe course={course} format="large" className="hidden sm:block" />
      <p className="text-xs text-faint leading-relaxed">
        Chaque dossard est posé à sa probabilité de victoire — plus il est à droite, plus le
        modèle y croit. Des dossards groupés disent une course ouverte&nbsp;; un dossard détaché,
        un favori net. La hauteur ne code rien&nbsp;: elle sépare seulement les voisins.
      </p>
    </div>
  )
}
