import { dateCourte, pourcent } from '@/lib/format'
import type { PointJour, Segment, Tranche } from '@/lib/stats'

/**
 * Les trois graphiques de la page « Nos résultats ».
 *
 * TOUT EST EN SVG ÉCRIT À LA MAIN, sans librairie. Ce n'est pas un exercice de
 * style : les bibliothèques de graphes rendent difficile précisément ce dont
 * cette page a besoin — la moustache d'incertitude sur chaque barre, le rayon
 * proportionnel à l'effectif, la ligne de référence à zéro. Sans ces éléments,
 * un graphique de performances flatte toujours celui qui le publie.
 *
 * Le `viewBox` est de largeur fixe et l'image porte `w-full h-auto` : l'échelle
 * est donc uniforme, le texte compris. C'est ce qui garantit qu'aucune
 * étiquette ne s'étire ni ne se déforme selon la largeur de l'écran ; en
 * contrepartie, les libellés rétrécissent sur un téléphone, d'où des tailles
 * choisies au plus grand de ce que la mise en page tolère.
 */

const LARGEUR = 720
const GRILLE = 'rgb(255 255 255 / 0.07)'
const REPERE = 'rgb(255 255 255 / 0.2)'
const OR = 'rgb(var(--c-accent))'
const ENCRE = 'rgb(var(--c-ink))'
const SECOND = 'rgb(var(--c-muted))'
const TERTIAIRE = 'rgb(var(--c-faint))'

/* Les séries d'historique dépassent vite le millier de points ; un
   `Math.max(...serie)` les passerait en arguments et ferait sauter la pile. */
const maximum = (v: number[]) => v.reduce((m, x) => (x > m ? x : m), v[0])

const chemin = (pts: { x: number; y: number }[]) =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')

/** Plafond d'échelle arrondi à la dizaine de points au-dessus, borné à 100 %. */
const plafondTaux = (brut: number) => Math.min(1, Math.max(0.1, Math.ceil(brut * 10) / 10))


// ───────────────────────────────────────────────────────────────────────────
// (b) Taux par segment, avec intervalle de confiance
// ───────────────────────────────────────────────────────────────────────────

/**
 * La moustache n'est pas un ornement : c'est elle qui empêche la lecture fausse.
 * Un segment à 40 % sur 5 courses dessine la plus longue barre du graphique
 * alors qu'il ne dit rien — son intervalle court de 12 % à 77 %. Superposée à
 * la barre, l'incertitude se voit avant qu'on ait lu le chiffre.
 */
export function BarresSegment({ segments }: { segments: Segment[] }) {
  if (!segments.length) return null

  const LIGNE = 34
  const H = 10
  const B = 24
  /* La colonne de gauche est dimensionnée sur le plus long libellé de tranche
     — « Intermédiaire (1 800 – 2 200 m) » — car un texte SVG qui déborde du
     `viewBox` n'est pas ramené à la ligne : il est coupé net. */
  const G = 214
  const D = 100
  const hauteur = H + segments.length * LIGNE + B
  const largeurTrace = LARGEUR - G - D

  const plafond = plafondTaux(maximum(segments.flatMap((s) => [s.taux, s.haut])))
  const x = (v: number) => G + (Math.min(v, plafond) / plafond) * largeurTrace
  const reperes = [0, plafond / 2, plafond]

  return (
    <svg
      viewBox={`0 0 ${LARGEUR} ${hauteur}`}
      className="w-full h-auto"
      role="img"
      aria-label="Taux de victoire par segment, avec son intervalle de confiance à 95 %"
    >
      {reperes.map((v) => (
        <g key={v}>
          <line x1={x(v)} x2={x(v)} y1={H} y2={H + segments.length * LIGNE} stroke={GRILLE} />
          <text
            x={x(v)}
            y={hauteur - 7}
            textAnchor="middle"
            fontSize={11}
            fill={TERTIAIRE}
            className="num"
          >
            {pourcent(v)}
          </text>
        </g>
      ))}

      {segments.map((s, i) => {
        const cy = H + i * LIGNE + LIGNE / 2
        return (
          <g key={s.label}>
            <text x={G - 14} y={cy + 4} textAnchor="end" fontSize={11} fill={SECOND}>
              {s.label}
            </text>

            <rect
              x={G}
              y={cy - 7}
              width={Math.max(1, x(s.taux) - G)}
              height={14}
              rx={3}
              fill="rgb(var(--c-accent) / 0.45)"
            />

            <line x1={x(s.bas)} x2={x(s.haut)} y1={cy} y2={cy} stroke={ENCRE} strokeWidth={1.25} />
            <line x1={x(s.bas)} x2={x(s.bas)} y1={cy - 6} y2={cy + 6} stroke={ENCRE} strokeWidth={1.25} />
            <line
              x1={x(s.haut)}
              x2={x(s.haut)}
              y1={cy - 6}
              y2={cy + 6}
              stroke={ENCRE}
              strokeWidth={1.25}
            />

            <text x={LARGEUR - D + 12} y={cy + 4} fontSize={12} fill={ENCRE} className="num">
              {pourcent(s.taux)}
            </text>
            <text x={LARGEUR - D + 58} y={cy + 4} fontSize={11} fill={TERTIAIRE} className="num">
              ({s.n})
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ───────────────────────────────────────────────────────────────────────────
// (c) Calibration
// ───────────────────────────────────────────────────────────────────────────

/**
 * Le rayon suit la RACINE de l'effectif, pas l'effectif : à surface constante,
 * une tranche de 900 partants ferait sinon un disque soixante-quinze fois plus
 * large qu'une tranche de 12 et écraserait le nuage. Bornes 4 et 14 px pour que
 * les petites tranches restent visibles sans jamais peser autant.
 */
export function CourbeCalibration({ tranches }: { tranches: Tranche[] }) {
  if (tranches.length < 2) return null

  const COTE = 300
  const G = 62
  const H = 14
  const hauteur = H + COTE + 40

  const plafond = plafondTaux(maximum(tranches.flatMap((t) => [t.annonce, t.observe])))
  const x = (v: number) => G + (Math.min(v, plafond) / plafond) * COTE
  const y = (v: number) => H + COTE - (Math.min(v, plafond) / plafond) * COTE
  const reperes = [0, plafond / 4, plafond / 2, (plafond * 3) / 4, plafond]

  const legende = G + COTE + 46

  return (
    <svg
      viewBox={`0 0 ${LARGEUR} ${hauteur}`}
      className="w-full h-auto"
      role="img"
      aria-label="Calibration : probabilité annoncée en abscisse, fréquence observée en ordonnée"
    >
      {reperes.map((v) => (
        <g key={v}>
          <line x1={G} x2={G + COTE} y1={y(v)} y2={y(v)} stroke={GRILLE} />
          <line x1={x(v)} x2={x(v)} y1={H} y2={H + COTE} stroke={GRILLE} />
          <text
            x={G - 10}
            y={y(v) + 3.5}
            textAnchor="end"
            fontSize={11}
            fill={TERTIAIRE}
            className="num"
          >
            {pourcent(v)}
          </text>
          <text
            x={x(v)}
            y={H + COTE + 16}
            textAnchor="middle"
            fontSize={11}
            fill={TERTIAIRE}
            className="num"
          >
            {pourcent(v)}
          </text>
        </g>
      ))}

      <line
        x1={x(0)}
        y1={y(0)}
        x2={x(plafond)}
        y2={y(plafond)}
        stroke={REPERE}
        strokeWidth={1}
        strokeDasharray="5 5"
      />

      {tranches.map((t) => {
        const r = Math.max(4, Math.min(14, Math.sqrt(t.n)))
        const cx = x(t.annonce)
        const cy = y(t.observe)
        const aDroite = cx + r + 60 < G + COTE
        return (
          <g key={t.label}>
            <circle cx={cx} cy={cy} r={r} fill="rgb(var(--c-accent) / 0.3)" stroke={OR} strokeWidth={1.25} />
            {t.n >= 30 && (
              <text
                x={aDroite ? cx + r + 6 : cx - r - 6}
                y={cy + 3.5}
                textAnchor={aDroite ? 'start' : 'end'}
                fontSize={11}
                fill={TERTIAIRE}
                className="num"
              >
                {t.label}
              </text>
            )}
          </g>
        )
      })}

      <text x={G + COTE / 2} y={hauteur - 6} textAnchor="middle" fontSize={11} fill={SECOND}>
        Probabilité annoncée
      </text>
      <text
        x={16}
        y={H + COTE / 2}
        textAnchor="middle"
        fontSize={11}
        fill={SECOND}
        transform={`rotate(-90 16 ${H + COTE / 2})`}
      >
        Fréquence observée
      </text>

      <line
        x1={legende}
        x2={legende + 40}
        y1={H + 56}
        y2={H + 56}
        stroke={REPERE}
        strokeDasharray="5 5"
      />
      <text x={legende + 50} y={H + 60} fontSize={11} fill={TERTIAIRE}>
        Calibration parfaite
      </text>
      <circle cx={legende + 8} cy={H + 106} r={4} fill="rgb(var(--c-accent) / 0.3)" stroke={OR} />
      <circle cx={legende + 34} cy={H + 106} r={12} fill="rgb(var(--c-accent) / 0.3)" stroke={OR} />
      <text x={legende + 54} y={H + 110} fontSize={11} fill={TERTIAIRE}>
        Partants observés dans la tranche
      </text>
    </svg>
  )
}

// ───────────────────────────────────────────────────────────────────────────
// (d) Volume quotidien et taux cumulé
// ───────────────────────────────────────────────────────────────────────────

/**
 * Le taux tracé est CUMULÉ, pas journalier. Sur une douzaine de courses par
 * jour, un taux quotidien saute de 0 % à 40 % d'une journée à l'autre sans que
 * rien n'ait changé dans le modèle : la courbe donnerait à voir du bruit et
 * inviterait à commenter des variations qui n'existent pas. Le cumul, lui,
 * montre ce qui compte : la convergence, et sa vitesse.
 *
 * L'échelle des ordonnées épouse toute la plage du cumul, y compris les
 * premiers jours où il vaut 0 ou 100 %. Tronquer ce début lisserait justement
 * l'instabilité que la courbe est censée rendre visible.
 */
export function CourbeTaux({ points }: { points: PointJour[] }) {
  if (points.length < 2) return null

  const hauteur = 230
  const G = 52
  const D = 54
  const H = 16
  const B = 30
  const largeurTrace = LARGEUR - G - D
  const hauteurTrace = hauteur - H - B

  let cumulN = 0
  let cumulG = 0
  const cumul = points.map((p) => {
    cumulN += p.jugees
    cumulG += p.gagnees
    return cumulN ? cumulG / cumulN : 0
  })

  const plafond = plafondTaux(maximum(cumul))
  const volumeMax = Math.max(1, maximum(points.map((p) => p.jugees)))
  const hauteurVolume = hauteurTrace * 0.55

  const pas = largeurTrace / points.length
  const cx = (i: number) => G + pas * (i + 0.5)
  const y = (v: number) => H + hauteurTrace - (Math.min(v, plafond) / plafond) * hauteurTrace
  const yVolume = (v: number) => H + hauteurTrace - (v / volumeMax) * hauteurVolume
  const largeurBarre = Math.max(2, Math.min(9, pas * 0.55))

  const final = cumul[cumul.length - 1]

  return (
    <svg
      viewBox={`0 0 ${LARGEUR} ${hauteur}`}
      className="w-full h-auto"
      role="img"
      aria-label={`Taux de victoire cumulé jour après jour, ${pourcent(final)} à l'arrivée, et volume de courses jugées par jour`}
    >
      {[0, plafond].map((v) => (
        <g key={v}>
          <line x1={G} x2={LARGEUR - D} y1={y(v)} y2={y(v)} stroke={GRILLE} />
          <text
            x={G - 10}
            y={y(v) + 3.5}
            textAnchor="end"
            fontSize={11}
            fill={TERTIAIRE}
            className="num"
          >
            {pourcent(v)}
          </text>
        </g>
      ))}

      {points.map((p, i) => (
        <rect
          key={p.date}
          x={cx(i) - largeurBarre / 2}
          y={yVolume(p.jugees)}
          width={largeurBarre}
          height={Math.max(1, H + hauteurTrace - yVolume(p.jugees))}
          rx={1.5}
          fill="rgb(255 255 255 / 0.12)"
        />
      ))}

      <line
        x1={G}
        x2={LARGEUR - D}
        y1={y(final)}
        y2={y(final)}
        stroke="rgb(var(--c-accent) / 0.35)"
        strokeDasharray="4 4"
      />
      <text
        x={LARGEUR - D - 4}
        y={y(final) - 7}
        textAnchor="end"
        fontSize={11}
        fill={OR}
        className="num"
      >
        {pourcent(final, 1)}
      </text>

      <path
        d={chemin(cumul.map((v, i) => ({ x: cx(i), y: y(v) })))}
        fill="none"
        stroke={OR}
        strokeWidth={1.75}
        strokeLinejoin="round"
      />

      <text x={LARGEUR - D + 10} y={yVolume(volumeMax) + 3.5} fontSize={11} fill={TERTIAIRE} className="num">
        {volumeMax}
      </text>
      <text x={LARGEUR - D + 10} y={H + hauteurTrace + 3.5} fontSize={11} fill={TERTIAIRE} className="num">
        0
      </text>
      <text x={LARGEUR - D + 10} y={hauteur - 8} fontSize={11} fill={TERTIAIRE}>
        courses/j
      </text>

      <text x={G} y={hauteur - 8} fontSize={11} fill={TERTIAIRE}>
        {dateCourte(points[0].date)}
      </text>
      <text x={LARGEUR - D - 4} y={hauteur - 8} textAnchor="end" fontSize={11} fill={TERTIAIRE}>
        {dateCourte(points[points.length - 1].date)}
      </text>
    </svg>
  )
}
