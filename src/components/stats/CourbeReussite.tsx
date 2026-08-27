import { useId } from 'react'
import type { PointReussite } from '@/lib/stats'
import { useDeploiement } from '@/lib/useDeploiement'

/**
 * Courbe d'illustration : victoires et places, cumulées.
 *
 * C'est une TOILE DE FOND, pas un panneau. La première intégration posait le
 * graphique à côté des chiffres, dans sa propre colonne : deux aires sombres
 * bord à bord, qui se lisaient comme une image collée sur la page. La courbe
 * passe désormais DERRIÈRE le bloc du héros, fondue par un masque sur sa
 * gauche et sa naissance — les chiffres se posent dessus, et le tout se lit
 * comme une seule surface.
 *
 * SANS AXES, DÉLIBÉRÉMENT. Ce n'est pas un instrument de mesure — la mesure,
 * avec ses intervalles de confiance et ses effectifs, vit sur « Nos
 * résultats ». Les deux valeurs courantes sont affichées en clair par le bloc
 * qui accueille cette toile : une courbe sans axes ET sans repère chiffré ne
 * serait pas sobre, elle serait creuse.
 *
 * Deux formats de viewBox, choisis PAR CSS et non par media query JS : le
 * ratio 720 × 132 rend 69 px de haut à 375 px de large, où les deux courbes
 * s'aplatissent en un trait. Les deux <svg> sont rendus, `sm:hidden` /
 * `hidden sm:block` n'en affichent qu'un — plus simple et plus sûr qu'un
 * écouteur de matchMedia pour deux nœuds sans coût.
 */

const FORMATS = {
  etroit: { L: 380, H: 150 },
  large: { L: 720, H: 132 },
} as const

const MARGE_H = 4
const MARGE_B = 6

/**
 * Lissage de Catmull-Rom converti en cubiques de Bézier. Une polyligne brute
 * sur trente points donne une ligne brisée qui suggère des ruptures là où il
 * n'y a qu'un jour de plus dans un cumul.
 */
function chemin(pts: [number, number][]): string {
  if (pts.length < 2) return ''
  const t = 0.18
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1x = p1[0] + (p2[0] - p0[0]) * t
    const c1y = p1[1] + (p2[1] - p0[1]) * t
    const c2x = p2[0] - (p3[0] - p1[0]) * t
    const c2y = p2[1] - (p3[1] - p1[1]) * t
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
  }
  return d
}

function Serie({
  pts,
  couleur,
  idAire,
  bas,
  trace: dessine,
  epaisseur = 2.25,
}: {
  pts: [number, number][]
  couleur: string
  idAire: string
  /** Ordonnée de fermeture de l'aire — le bas du viewBox courant. */
  bas: number
  /** Faux au premier rendu : la ligne se dessine alors de gauche à droite. */
  trace: boolean
  epaisseur?: number
}) {
  const trace = chemin(pts)
  if (!trace) return null
  const dernier = pts[pts.length - 1]
  const aire = `${trace} L ${dernier[0].toFixed(1)} ${bas} L ${pts[0][0].toFixed(1)} ${bas} Z`

  /*
   * LA LIGNE SE DESSINE à l'ouverture — première chose vue chaque soir.
   * `pathLength={1}` normalise la longueur du tracé : le couple dasharray 1 /
   * dashoffset 1→0 la déroule de gauche à droite sans mesurer le path, donc
   * sans librairie. L'aire et le point terminal suivent en fondu, légèrement
   * retardés : ils n'ont de sens qu'une fois la ligne arrivée.
   */
  return (
    <g>
      <path
        d={aire}
        fill={`url(#${idAire})`}
        opacity={dessine ? 1 : 0}
        style={{ transition: 'opacity .9s ease .5s' }}
      />
      <path
        d={trace}
        fill="none"
        stroke={couleur}
        strokeWidth={epaisseur}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray="1"
        strokeDashoffset={dessine ? 0 : 1}
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.22,1,.36,1)' }}
      />
      {/* Le point terminal ancre l'œil sur la valeur d'aujourd'hui, qui est la
          seule que le bloc commente. */}
      <g opacity={dessine ? 1 : 0} style={{ transition: 'opacity .4s ease 1s' }}>
        <circle cx={dernier[0]} cy={dernier[1]} r={7} fill={couleur} opacity={0.16} />
        <circle cx={dernier[0]} cy={dernier[1]} r={3.25} fill={couleur} />
      </g>
    </g>
  )
}

function Toile({
  points,
  format,
  className,
}: {
  points: PointReussite[]
  format: keyof typeof FORMATS
  className: string
}) {
  const id = useId()
  const dessine = useDeploiement()
  const { L, H } = FORMATS[format]

  const haut = Math.max(...points.map((p) => p.tauxPlace), 0.1) * 1.22
  const x = (i: number) => MARGE_H + (i / (points.length - 1)) * (L - MARGE_H * 2)
  const y = (v: number) => H - MARGE_B - (v / haut) * (H - MARGE_B)

  const victoires = points.map((p, i) => [x(i), y(p.tauxVictoire)] as [number, number])
  const places = points.map((p, i) => [x(i), y(p.tauxPlace)] as [number, number])

  return (
    <svg
      viewBox={`0 0 ${L} ${H}`}
      className={`w-full h-auto overflow-visible pointer-events-none ${className}`}
      role="img"
      aria-label={`Évolution cumulée de nos résultats sur ${points.length} journées de courses : ${Math.round(points[points.length - 1].tauxVictoire * 100)} % de victoires et ${Math.round(points[points.length - 1].tauxPlace * 100)} % de places.`}
    >
      <defs>
        {/*
          Opacités basses — la courbe vit sous du texte. Les valeurs d'origine
          (0,42 au sommet) tenaient pour un graphique autonome ; en toile de
          fond, elles fabriquaient un pavé sombre qui concurrençait les
          chiffres posés dessus. L'arrêt intermédiaire garde une masse sous la
          ligne sans fermer le bas.
        */}
        <linearGradient id={`${id}-place`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--c-info))" stopOpacity="0.20" />
          <stop offset="55%" stopColor="rgb(var(--c-info))" stopOpacity="0.08" />
          <stop offset="100%" stopColor="rgb(var(--c-info))" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-victoire`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--c-accent))" stopOpacity="0.26" />
          <stop offset="55%" stopColor="rgb(var(--c-accent))" stopOpacity="0.10" />
          <stop offset="100%" stopColor="rgb(var(--c-accent))" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* La série « placé » passe en premier : elle est au-dessus en valeur, et
          son aire recouvrirait celle des victoires si elle était tracée après. */}
      <Serie
        pts={places}
        couleur="rgb(var(--c-info) / 0.8)"
        idAire={`${id}-place`}
        bas={H}
        trace={dessine}
        epaisseur={1.75}
      />
      <Serie
        pts={victoires}
        couleur="rgb(var(--c-accent))"
        idAire={`${id}-victoire`}
        bas={H}
        trace={dessine}
      />
    </svg>
  )
}

export function CourbeReussite({ points }: { points: PointReussite[] }) {
  // Sous quatre journées, le cumul n'a pas encore de forme : deux segments
  // droits donneraient à voir une tendance qui n'existe pas.
  if (points.length < 4) return null

  return (
    <>
      <Toile points={points} format="etroit" className="sm:hidden" />
      <Toile points={points} format="large" className="hidden sm:block" />
    </>
  )
}
