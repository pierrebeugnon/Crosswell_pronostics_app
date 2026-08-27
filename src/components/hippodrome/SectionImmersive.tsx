import type { ReactNode } from 'react'
import { useRevelation } from '@/components/hippodrome/useRevelation'

/**
 * Sections immersives à séparateurs courbes, à la manière des applications de
 * méditation : grand titre centré, contenu dessous, une vague pour ouvrir.
 *
 * LA VAGUE PEINT SES DEUX RIVES. Un séparateur qui ne remplit que le dessous
 * de sa courbe laisse au-dessus une bande où le fond de page réapparaît : la
 * section précédente se terminait alors sur une arête droite parfaitement
 * visible, et chaque frontière montrait ses coutures. Ici, le SVG reçoit en
 * fond la couleur de la surface PRÉCÉDENTE (`precedent`) et remplit sa courbe
 * avec la sienne (`fond`) : la transition appartient à un seul élément, il n'y
 * a plus de zone que personne ne peint. D'où la règle d'usage : les sections
 * s'enchaînent en se passant leur couleur, via `chaineSections` ci-dessous.
 *
 * `preserveAspectRatio="none"` est ici SANS DANGER, contrairement aux
 * graphiques : il n'y a ni trait à épaissir ni cercle à ovaliser, seulement
 * une surface pleine dont on veut précisément qu'elle s'étire.
 */
const COURBES = [
  'M0,64 C240,8 420,116 720,84 C1010,54 1210,4 1440,44',
  'M0,28 C280,110 520,10 780,58 C1030,104 1240,120 1440,72',
  'M0,96 C200,40 460,132 760,96 C1060,60 1260,24 1440,96',
]

export function SeparateurCourbe({
  variante,
  fond,
  precedent,
  sens,
}: {
  variante: number
  /** Couleur de la surface que la vague ouvre (ou referme). */
  fond: string
  /** Couleur de la surface au-dessus — 'transparent' laisse voir le canvas. */
  precedent: string
  /** 'ouvre' : la courbe remplit vers le bas. 'ferme' : vers le haut. */
  sens: 'ouvre' | 'ferme'
}) {
  const courbe = COURBES[variante % COURBES.length]
  const plein =
    sens === 'ouvre' ? `${courbe} L1440,140 L0,140 Z` : `${courbe} L1440,0 L0,0 Z`

  return (
    <svg
      viewBox="0 0 1440 140"
      preserveAspectRatio="none"
      className="block w-full h-[68px] sm:h-[104px]"
      style={sens === 'ouvre' ? { background: precedent } : undefined}
      aria-hidden
      focusable="false"
    >
      <path d={plein} fill={fond} />
      {/* Le filet clair qui court sur l'arête : c'est lui qui fait lire la
          courbe comme un pli de lumière et non comme un aplat décalé. */}
      <path
        d={courbe}
        fill="none"
        stroke="rgb(255 255 255 / 0.10)"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

export interface SectionImmersiveProps {
  titre: string
  soustitre?: string
  /** Fond opaque de la section — `ambiance.bande1` ou `bande2`. */
  fond: string
  /** Fond de la section précédente ; 'transparent' au-dessus du canvas. */
  precedent?: string
  /** Referme la dernière bande par une vague vers le canvas, au lieu d'une arête. */
  fermer?: boolean
  variante?: number
  children?: ReactNode
}

/**
 * `w-screen` et le recentrage manuel sortent du conteneur de contenu : sans
 * eux, la courbe s'arrêterait à 76 rem au milieu de l'écran. Le débordement
 * horizontal que `w-screen` provoque (il inclut la barre de défilement) est
 * neutralisé par `overflow-x: clip` posé sur le body.
 */
export function SectionImmersive({
  titre,
  soustitre,
  fond,
  precedent = 'transparent',
  fermer = false,
  variante = 0,
  children,
}: SectionImmersiveProps) {
  const { ref, visible } = useRevelation<HTMLElement>()

  return (
    <section ref={ref} className="relative w-screen left-1/2 -translate-x-1/2" aria-label={titre}>
      <SeparateurCourbe variante={variante} fond={fond} precedent={precedent} sens="ouvre" />

      {/* `-mt-px` soude le corps à la vague ; les deux surfaces étant opaques
          et de même couleur, le recouvrement est invisible. */}
      <div style={{ background: fond }} className="pb-16 sm:pb-24 -mt-px">
        <div
          className={`mx-auto max-w-content px-4 sm:px-6 transition-all duration-700 ease-out ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <header className="text-center max-w-2xl mx-auto">
            <h2 className="font-display font-semibold tracking-[-0.03em] text-[2rem] sm:text-[2.75rem] leading-[1.05]">
              {titre}
            </h2>
            {soustitre && (
              <p className="text-sm sm:text-base text-muted mt-3 leading-relaxed">{soustitre}</p>
            )}
          </header>

          {children && <div className="mt-10 sm:mt-14">{children}</div>}
        </div>
      </div>

      {fermer && (
        <div className="-mt-px">
          <SeparateurCourbe
            variante={variante + 1}
            fond={fond}
            precedent="transparent"
            sens="ferme"
          />
        </div>
      )}
    </section>
  )
}

/**
 * Attribue à une suite de sections leurs couleurs enchaînées : bandes
 * alternées, chacune connaissant celle qui la précède, la dernière refermée
 * sur le canvas. Centralisé ici parce que les pages composent leurs sections
 * conditionnellement : recalculer l'alternance à la main à chaque `&&` serait
 * exactement le genre de comptabilité qu'on finit par fausser.
 */
export function chaineSections(
  nombre: number,
  bandes: [string, string],
): { fond: string; precedent: string; fermer: boolean }[] {
  return Array.from({ length: nombre }, (_, i) => ({
    fond: bandes[i % 2],
    precedent: i === 0 ? 'transparent' : bandes[(i - 1) % 2],
    fermer: i === nombre - 1,
  }))
}
