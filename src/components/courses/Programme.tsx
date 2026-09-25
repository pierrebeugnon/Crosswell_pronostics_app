import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import type { Course, Reunion } from '@/types'
import { etatCourse, type InstantParis } from '@/lib/journee'
import { resumeReunion } from '@/lib/avancee'
import { distance as formatDistance, hippodrome as formatHippodrome, pourcent } from '@/lib/format'
import { LIBELLE_VERDICT, lienCourse, verdictCourse, verdictReussi } from '@/lib/programme'
import { AvecUnPass, Cadenas, Offert } from '@/components/acces/Verrou'

/**
 * Ce que la colonne de droite d'un élément du programme dit de la course :
 * une étiquette en capitales et une valeur, colorée selon qu'elle réjouit
 * (vert), informe (clair) ou s'est éteinte (gris).
 */
function statut(c: Course, m: InstantParis): { etiquette: string; valeur: string; ton: string } {
  const f = c.favori
  const favori = f ? `n°${f.numero} · ${pourcent(f.pWin)}` : '—'
  switch (etatCourse(c, m)) {
    case 'terminee': {
      const v = verdictCourse(c)!
      return { etiquette: 'Terminée', valeur: LIBELLE_VERDICT[v], ton: verdictReussi(v) ? 'text-accent' : 'text-faint' }
    }
    case 'departPasse':
      return { etiquette: 'Départ donné', valeur: favori, ton: 'text-soft' }
    case 'nonRelevee':
      return { etiquette: 'Non relevée', valeur: favori, ton: 'text-faint' }
    default:
      return { etiquette: 'Favori', valeur: favori, ton: 'text-accent' }
  }
}

/** « Handicap · 2 400 m · 12 partants » */
function meta(c: Course): string {
  return [c.type, c.distance != null ? formatDistance(c.distance) : null, `${c.partants} partants`]
    .filter(Boolean)
    .join(' · ')
}

/**
 * Le programme de la journée, en colonne (grand écran) : les réunions dans
 * l'ordre de leur première course, et sous chacune ses courses. La course
 * affichée à droite est bordée de vert.
 *
 * Pas de pastille « R1 » comme dans la maquette : la base ne connaît pas le
 * numéro de réunion PMU, et en inventer un par l'heure contredirait celui des
 * programmes officiels.
 */
export function Programme({
  reunions,
  choisie,
  maintenant,
  offerte = null,
}: {
  reunions: Reunion[]
  choisie: string | null
  maintenant: InstantParis
  /** Formule Gratuit : la clé de la course offerte du jour, marquée « Offert ». */
  offerte?: string | null
}) {
  const liste = useRef<HTMLDivElement>(null)

  // La course choisie reste visible dans la colonne, même en bas d'un long programme.
  useEffect(() => {
    liste.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest' })
  }, [choisie])

  return (
    <div ref={liste} className="flex flex-col gap-7">
      {reunions.map((r) => (
        <section key={r.cle} className="flex flex-col gap-2.5" aria-label={formatHippodrome(r.hippodrome)}>
          <div className="flex items-baseline gap-2.5 min-w-0">
            <h3 className="text-[0.9375rem] font-bold truncate">{formatHippodrome(r.hippodrome)}</h3>
            <span className="num text-[0.8125rem] font-medium text-faint shrink-0">{resumeReunion(r)}</span>
          </div>
          {r.courses.map((c) => {
            const actif = c.cle === choisie
            const s = statut(c, maintenant)
            return (
              <Link
                key={c.cle}
                to={lienCourse(c)}
                aria-current={actif ? 'page' : undefined}
                className={`flex items-center gap-3.5 w-full min-h-[4.125rem] px-4 py-3 rounded-xl border transition-colors ${
                  actif
                    ? 'border-accent bg-accent-deep'
                    : `border-sep bg-sunken hover:border-line-hover ${c.courue ? 'opacity-80' : ''}`
                }`}
              >
                <span className="num w-[3.375rem] shrink-0 flex flex-col gap-0.5">
                  <span className="text-[1rem] font-bold">{c.heureDepart ?? '—'}</span>
                  <span className="text-xs font-semibold text-faint">C{c.numero}</span>
                </span>
                <span className="flex-1 min-w-0 flex flex-col gap-[3px]">
                  <span className="text-[0.9375rem] font-semibold truncate">{c.nom ?? `Course ${c.numero}`}</span>
                  <span className="num text-xs font-medium text-faint truncate">{meta(c)}</span>
                </span>
                <span className="shrink-0 flex flex-col items-end gap-[3px]">
                  {c.verrouillee ? (
                    <AvecUnPass />
                  ) : (
                    <>
                      {c.cle === offerte ? (
                        <Offert />
                      ) : (
                        <span className="text-[0.625rem] font-bold uppercase tracking-[0.1em] text-faint">{s.etiquette}</span>
                      )}
                      <span className={`num text-sm font-bold ${s.ton}`}>{s.valeur}</span>
                    </>
                  )}
                </span>
              </Link>
            )
          })}
        </section>
      ))}
    </div>
  )
}

/**
 * Le même programme en ruban horizontal (téléphone) : une pastille par course,
 * l'heure en gros et, dessous, le numéro de course ou le verdict. Les courses
 * restent groupées par réunion, le nom de l'hippodrome ouvrant chaque groupe.
 */
export function RubanCourses({
  reunions,
  choisie,
  offerte = null,
  className = '',
}: {
  reunions: Reunion[]
  choisie: string | null
  /** Formule Gratuit : la clé de la course offerte du jour. */
  offerte?: string | null
  className?: string
}) {
  const ruban = useRef<HTMLElement>(null)

  // Centre la pastille choisie sans faire défiler la page verticalement.
  useEffect(() => {
    const el = ruban.current
    const cible = el?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!el || !cible) return
    el.scrollLeft = cible.offsetLeft - el.clientWidth / 2 + cible.offsetWidth / 2
  }, [choisie])

  return (
    <nav
      ref={ruban}
      aria-label="Courses du jour"
      className={`flex items-end gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
    >
      {reunions.map((r) => (
        <div key={r.cle} className="flex flex-col gap-1.5 shrink-0">
          {/* Collé à gauche : le nom de la réunion reste lisible quand le
              ruban est défilé jusqu'à ses dernières courses. */}
          <span className="sticky left-0 self-start text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-faint px-0.5 truncate max-w-[10rem]">
            {formatHippodrome(r.hippodrome)}
          </span>
          <div className="flex gap-2">
            {r.courses.map((c) => {
              const actif = c.cle === choisie
              const v = verdictCourse(c)
              return (
                <Link
                  key={c.cle}
                  to={lienCourse(c)}
                  aria-current={actif ? 'page' : undefined}
                  aria-label={`${formatHippodrome(c.hippodrome)}, course ${c.numero}${c.heureDepart ? `, ${c.heureDepart}` : ''}`}
                  className={`num shrink-0 min-w-[4.75rem] h-[3.625rem] px-3 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-colors ${
                    actif ? 'bg-accent text-accent-ink border-accent' : 'bg-surface text-ink border-line'
                  }`}
                >
                  <span className="text-[0.9375rem] font-bold">{c.heureDepart ?? `C${c.numero}`}</span>
                  <span className="flex items-center gap-1 text-[0.6875rem] font-semibold opacity-70">
                    {v ? (
                      LIBELLE_VERDICT[v]
                    ) : c.verrouillee ? (
                      <>
                        <Cadenas taille={11} />
                        Pass
                      </>
                    ) : c.cle === offerte ? (
                      'Offert'
                    ) : (
                      `C${c.numero}`
                    )}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}
