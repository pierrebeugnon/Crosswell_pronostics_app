import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp } from 'lucide-react'
import type { Course, Partant } from '@/types'
import { COTES_SIMULEES } from '@/config/app'
import { cote as formatCote } from '@/lib/format'
import {
  COTES_VIDES,
  cotesDeCourse,
  flecheCote,
  heureMinute,
  historiqueSimule,
  tendanceCote,
  tracer,
  type CotesCourse,
  type HistoriqueCote,
  type SensCote,
} from '@/lib/cotes'
import { chargerCotes } from '@/services/cotes'
import { DEPUIS_LA_COURSE, lienPartant } from '@/lib/programme'
import { useHeureParis } from '@/lib/useHeureParis'
import { Panneau } from '@/components/resultats/Panneaux'

/**
 * L'ÉVOLUTION DE LA COTE — `design/screens/Main.dc.html` (fiche, « Évolution
 * de la cote »), flèches du tableau des partants, et un panneau de course qui
 * reprend les mini-courbes du comparateur de la maquette.
 *
 * Les relevés sont RÉELS depuis le 25/09/2026 (`services/cotes.ts`, toutes les
 * 30 minutes de 11 h à 19 h). La DÉMONSTRATION, qui n'a pas de base, garde la
 * courbe simulée : elle le dit, pastille « Simulée » et phrase d'explication.
 */

export const TON_SENS: Record<SensCote, string> = {
  stable: 'text-soft',
  baisse: 'text-accent',
  hausse: 'text-loss',
}

/** Les relevés déjà lus, par course : une course ouverte, lue une fois. */
const lues = new Map<string, { a: number; cotes: CotesCourse }>()
const enCours = new Map<string, Promise<CotesCourse>>()

/** Au-delà, une course du jour non courue se relit : un relevé toutes les 30 minutes. */
const FRAICHEUR = 10

/**
 * Les relevés de cote d'une course. Une seule requête sert le tableau, la
 * fiche, le comparateur et le panneau ; une course du jour se relit toutes les
 * dix minutes, une course courue ou passée jamais. Une lecture en échec (vue
 * absente, session refusée) laisse la course sans cote du jour, sans rien
 * casser.
 */
export function useCotes(course: Course): CotesCourse {
  const m = useHeureParis()
  const vivante = course.date >= m.jour && !course.courue
  const fenetre = vivante ? Math.floor(m.minutes / FRAICHEUR) : 0
  const [reelles, setReelles] = useState<CotesCourse>(() => lues.get(course.cle)?.cotes ?? COTES_VIDES)

  useEffect(() => {
    if (COTES_SIMULEES) return
    let attendue = true
    const deja = lues.get(course.cle)
    if (deja && (!vivante || m.minutes - deja.a < FRAICHEUR)) {
      setReelles(deja.cotes)
      return
    }
    let demande = enCours.get(course.cle)
    if (!demande) {
      demande = chargerCotes(course)
        .then((releves) => {
          const cotes = cotesDeCourse(releves, course)
          lues.set(course.cle, { a: m.minutes, cotes })
          return cotes
        })
        .catch(() => lues.get(course.cle)?.cotes ?? COTES_VIDES)
        .finally(() => enCours.delete(course.cle))
      enCours.set(course.cle, demande)
    }
    void demande.then((cotes) => {
      if (attendue) setReelles(cotes)
    })
    return () => {
      attendue = false
    }
    // `fenetre` rythme la relecture ; `m.minutes` ne doit pas la déclencher.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course, vivante, fenetre])

  // La démonstration n'a pas de relevés : la courbe simulée en tient lieu.
  return useMemo(() => {
    if (!COTES_SIMULEES) return reelles
    if (!course.cotee) return COTES_VIDES
    const historiques = new Map<number, HistoriqueCote>()
    for (const p of course.liste) {
      const h = historiqueSimule(course, p, m)
      if (h) historiques.set(p.numero, h)
    }
    return { dernier: new Map(), historiques }
  }, [course, m, reelles])
}

/** Les historiques de tous les partants d'une course, par numéro. */
export function useHistoriques(course: Course): Map<number, HistoriqueCote> | null {
  const { historiques } = useCotes(course)
  return historiques.size > 0 ? historiques : null
}

export function useHistorique(course: Course, partant: Partant): HistoriqueCote | null {
  return useCotes(course).historiques.get(partant.numero) ?? null
}

export function PastilleSimulee() {
  return (
    <span
      className="shrink-0 text-[0.625rem] font-extrabold uppercase tracking-[0.08em] text-warn border border-warn/40 bg-warn/10 rounded-full px-2 py-0.5"
      title="L’historique des cotes n’est pas encore enregistré : cette évolution est simulée."
    >
      Simulée
    </span>
  )
}

/**
 * L'heure de chaque point. Le dernier porte le nom de ce qu'il est : l'heure
 * de son relevé (cotes réelles), « Maintenant » ou « Départ 15:10 » (courbe
 * simulée, qui s'arrête à l'un ou l'autre).
 */
function libellesTemps(h: HistoriqueCote): string[] {
  const n = h.points.length
  return h.points.map((p, i) => {
    if (i < n - 1 || h.fin === 'releve') return heureMinute(p.minute)
    if (h.fin === 'maintenant') return 'Maintenant'
    return h.heureConnue ? `Départ ${heureMinute(p.minute)}` : 'Départ'
  })
}

const L = 520
const H = 140

/** La courbe d'un partant, dans la fiche. */
export function EvolutionCote({ historique: h }: { historique: HistoriqueCote }) {
  const [actif, setActif] = useState<number | null>(null)
  const n = h.points.length
  const pts = tracer(h, L, H)
  const temps = libellesTemps(h)
  const i = actif ?? n - 1
  const tendance = tendanceCote(h.variation)
  const valeurs = h.points.map((p) => p.cote)

  return (
    <section className="flex flex-col gap-2.5 lg:gap-3.5" aria-labelledby="evolution-cote">
      <div className="flex items-baseline justify-between gap-2.5 lg:gap-4">
        <h3 id="evolution-cote" className="flex items-center gap-2 text-[0.9375rem] lg:text-[0.9375rem] font-bold">
          Évolution de la cote
          {h.simulee && <PastilleSimulee />}
        </h3>
        <span className={`num text-xs lg:text-[0.8125rem] font-extrabold whitespace-nowrap ${TON_SENS[tendance.sens]}`}>
          {tendance.libelle}
        </span>
      </div>
      <span className="num text-xs lg:text-[0.8125rem] font-medium text-muted">
        {h.fin === 'releve' ? (
          <>
            Cote {formatCote(h.matin)} à {temps[0]} → {formatCote(h.derniere)} à {temps[n - 1]}
          </>
        ) : (
          <>
            Cote du matin {formatCote(h.matin)} → {h.fin === 'depart' ? 'au départ' : 'maintenant'}{' '}
            {formatCote(h.derniere)}
          </>
        )}
      </span>

      <div className="flex gap-2.5 mt-[1.875rem] lg:mt-0">
        <div
          className="num hidden lg:flex flex-col justify-between w-[2.125rem] pt-1 pb-[1.625rem] text-[0.6875rem] font-semibold text-muted text-right"
          aria-hidden
        >
          <span>{formatCote(Math.max(...valeurs))}</span>
          <span>{formatCote(Math.min(...valeurs))}</span>
        </div>
        <div className="grow min-w-0 flex flex-col gap-2">
          <div className="relative h-[7.5rem] lg:h-[9.375rem] border-b border-line-strong" onMouseLeave={() => setActif(null)}>
            <div className="absolute inset-x-0 top-[5px] h-[6.875rem] lg:h-[8.75rem]">
              <svg viewBox={`0 0 ${L} ${H}`} preserveAspectRatio="none" aria-hidden className="absolute inset-0 w-full h-full overflow-visible">
                <polyline
                  points={pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
                  fill="none"
                  stroke="rgb(var(--c-accent))"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <span
                className="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full bg-accent shadow-[0_0_0_3px_rgb(var(--c-canvas))] pointer-events-none"
                style={{ left: `${((i / (n - 1)) * 100).toFixed(2)}%`, top: `${((pts[i].y / H) * 100).toFixed(2)}%` }}
              />
            </div>
            <div className="absolute inset-0 flex">
              {h.points.map((p, k) => (
                <button
                  key={k}
                  type="button"
                  aria-label={`${temps[k]} : cote ${formatCote(p.cote)}`}
                  onMouseEnter={() => setActif(k)}
                  onFocus={() => setActif(k)}
                  onBlur={() => setActif(null)}
                  onClick={() => setActif(k)}
                  className="flex-1 basis-0 h-full"
                />
              ))}
            </div>
            <span
              className="num absolute right-0 -top-[1.875rem] text-xs lg:text-[0.8125rem] font-bold px-2.5 py-1 rounded-lg bg-raised-2 border border-line-strong whitespace-nowrap pointer-events-none"
              aria-live="polite"
            >
              {temps[i]} · cote {formatCote(valeurs[i])}
            </span>
          </div>
          {/* Trois repères de temps — deux seulement quand il n'y a que deux
              relevés, sinon le milieu répéterait le premier. */}
          <div className="num flex justify-between text-[0.625rem] lg:text-[0.6875rem] font-semibold text-muted" aria-hidden>
            <span>{temps[0]}</span>
            {n > 2 && <span>{temps[Math.floor((n - 1) / 2)]}</span>}
            <span>{temps[n - 1]}</span>
          </div>
        </div>
      </div>
      <p className="text-[0.6875rem] lg:text-xs font-medium text-faint leading-relaxed">
        {h.simulee
          ? 'Courbe simulée à partir de la cote relevée : l’historique des cotes n’est pas encore enregistré.'
          : `Cote relevée toutes les 30 minutes, de 11 h à 19 h. ${h.points.length} relevés pour ce partant.`}
      </p>
    </section>
  )
}

/** La flèche du tableau : baisse (verte) ou hausse (éteinte) de 8 % au moins depuis le matin. */
export function FlecheCote({ historique: h }: { historique: HistoriqueCote | undefined }) {
  if (!h) return null
  const sens = flecheCote(h.variation)
  if (!sens) return null
  const depuis = h.fin === 'releve' ? `depuis ${heureMinute(h.points[0].minute)}` : 'depuis le matin'
  const texte = `Cote en ${sens} ${depuis}, ${formatCote(h.matin)} → ${formatCote(h.derniere)}${h.simulee ? ' (simulation)' : ''}`
  const Icone = sens === 'baisse' ? ArrowDown : ArrowUp
  return (
    <span role="img" aria-label={texte} title={texte} className={`shrink-0 inline-flex ${sens === 'baisse' ? 'text-accent' : 'text-dim'}`}>
      <Icone size={14} strokeWidth={2.6} aria-hidden />
    </span>
  )
}

/** Une mini-courbe : panneau de course (colorée selon le sens) et comparateur (verte). */
export function MiniCourbe({
  h,
  sens = 'baisse',
  className = 'h-7',
}: {
  h: HistoriqueCote
  sens?: SensCote
  className?: string
}) {
  const pts = tracer(h, L, H)
  return (
    <svg viewBox={`0 0 ${L} ${H}`} preserveAspectRatio="none" aria-hidden className={`w-full overflow-visible ${className}`}>
      <polyline
        points={pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
        fill="none"
        stroke={sens === 'hausse' ? 'rgb(var(--c-loss))' : 'rgb(var(--c-accent))'}
        strokeWidth={2}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

const PAR_SENS = 3

/**
 * Le panneau de la course : les plus fortes baisses et hausses de cote depuis
 * le matin, chacune vers la fiche du partant.
 */
export function MouvementsCote({ course, historiques }: { course: Course; historiques: Map<number, HistoriqueCote> }) {
  const lignes = course.liste
    .filter((p) => historiques.has(p.numero))
    .map((p) => ({ p, h: historiques.get(p.numero)! }))
  const baisses = lignes
    .filter((x) => tendanceCote(x.h.variation).sens === 'baisse')
    .sort((a, b) => a.h.variation - b.h.variation)
    .slice(0, PAR_SENS)
  const hausses = lignes
    .filter((x) => tendanceCote(x.h.variation).sens === 'hausse')
    .sort((a, b) => b.h.variation - a.h.variation)
    .slice(0, PAR_SENS)
  const premier = lignes[0]?.h
  const simulee = premier?.simulee === true
  const partie = premier?.fin === 'depart'
  const depuis = simulee
    ? `Depuis 9 h ${partie ? 'jusqu’au départ' : 'jusqu’à maintenant'}`
    : `Depuis le relevé de ${heureMinute(premier?.points[0].minute ?? 0)}`

  const colonne = (titre: string, sens: SensCote, liste: typeof lignes) => (
    <div className="flex flex-col min-w-0">
      <h3 className="label pb-2">{titre}</h3>
      {liste.length === 0 ? (
        <p className="py-3 border-t border-track text-[0.8125rem] font-medium text-faint">Aucune.</p>
      ) : (
        liste.map(({ p, h }) => (
          <Link
            key={p.numero}
            to={lienPartant(course, p)}
            state={DEPUIS_LA_COURSE}
            preventScrollReset
            className="num grid grid-cols-[2rem_minmax(0,1fr)_4.5rem_3.25rem] items-center gap-3 min-h-14 py-2 border-t border-track hover:bg-sunken transition-colors"
          >
            <span className="w-8 h-8 rounded-[9px] bg-raised border border-line-strong grid place-items-center text-[0.8125rem] font-bold">
              {p.numero}
            </span>
            <span className="flex flex-col gap-0.5 min-w-0">
              <span className="text-sm font-semibold truncate">{p.nom}</span>
              <span className="text-xs font-medium text-faint">
                {formatCote(h.matin)} → {formatCote(h.derniere)}
              </span>
            </span>
            <MiniCourbe h={h} sens={sens} />
            <span className={`text-right text-sm font-extrabold ${TON_SENS[sens]}`}>
              {h.variation < 0 ? '−' : '+'}
              {Math.round(Math.abs(h.variation) * 100)} %
            </span>
          </Link>
        ))
      )}
    </div>
  )

  return (
    <Panneau
      titre={
        <span className="flex items-center gap-2">
          Évolution des cotes
          {simulee && <PastilleSimulee />}
        </span>
      }
      sousTitre={`${depuis} · les plus fortes baisses et hausses`}
    >
      <div className="grid gap-5 lg:grid-cols-2 lg:gap-8">
        {colonne('Cote en baisse', 'baisse', baisses)}
        {colonne('Cote en hausse', 'hausse', hausses)}
      </div>
      <p className="text-[0.6875rem] lg:text-xs font-medium text-faint leading-relaxed">
        {simulee
          ? 'Évolution simulée à partir de la cote relevée : l’historique des cotes n’est pas encore enregistré.'
          : 'Cotes relevées toutes les 30 minutes, de 11 h à 19 h. Elles disent le marché, pas notre pronostic.'}
      </p>
    </Panneau>
  )
}
