/**
 * Les icônes de la navigation, redessinées d'après les tracés des maquettes
 * (`design/screens/Mobile.dc.html`, barre d'onglets). Traits de 1,9 à 2,2 px
 * sur une grille de 24, couleur héritée : l'onglet actif passe au vert par sa
 * seule couleur de texte.
 */
type PropsIcone = { size?: number; strokeWidth?: number; className?: string }

function Svg({ size = 22, className, children }: PropsIcone & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {children}
    </svg>
  )
}

export function IconeAccueil(p: PropsIcone) {
  return (
    <Svg {...p}>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" strokeWidth={p.strokeWidth ?? 1.9} />
    </Svg>
  )
}

export function IconeCourses(p: PropsIcone) {
  return (
    <Svg {...p}>
      <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" strokeWidth={p.strokeWidth ?? 2} />
    </Svg>
  )
}

export function IconeResultats(p: PropsIcone) {
  return (
    <Svg {...p}>
      <path d="M5 20V12M12 20V5M19 20v-8" strokeWidth={p.strokeWidth ?? 2.2} />
    </Svg>
  )
}

export function IconeCompte(p: PropsIcone) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="8.5" r="3.8" strokeWidth={p.strokeWidth ?? 1.9} />
      <path d="M4.5 20c1.2-3.6 4-5.4 7.5-5.4s6.3 1.8 7.5 5.4" strokeWidth={p.strokeWidth ?? 1.9} />
    </Svg>
  )
}

/** Le calendrier de l'en-tête, devant la date du jour. */
export function IconeCalendrier(p: PropsIcone) {
  return (
    <Svg {...p}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" strokeWidth={p.strokeWidth ?? 1.8} />
      <path d="M3.5 10h17M8 3v4M16 3v4" strokeWidth={p.strokeWidth ?? 1.8} />
    </Svg>
  )
}
