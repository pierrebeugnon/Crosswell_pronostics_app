import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronLeft, X } from 'lucide-react'
import type { Course, Fiche, Partant } from '@/types'
import { LIBELLE_ECART } from '@/config/app'
import { cote as formatCote, pourcent, rang as formatRang } from '@/lib/format'
import { carriere, euros, ligneIdentite, musique } from '@/lib/fiche'
import {
  MAX_COMPARES,
  MIN_COMPARES,
  basculer as basculerNumero,
  indiceComparaison,
  meilleure,
  partantsCompares,
} from '@/lib/comparaison'
import { tendanceCote } from '@/lib/cotes'
import { DEPUIS_LA_COURSE, lienPartant } from '@/lib/programme'
import { useHeureParis } from '@/lib/useHeureParis'
import { chargerFiche } from '@/services/fiches'
import { TON_PLACE } from '@/components/courses/FicheDetails'
import { MiniCourbe, PastilleSimulee, TON_SENS, useHistoriques } from '@/components/courses/EvolutionCote'

/**
 * LE COMPARATEUR — `design/screens/MainCompare.dc.html` et `MobileCompare`.
 *
 * On coche deux ou trois partants d'une course (tableau ou fiche), une barre
 * les rappelle en bas de l'écran, et « Comparer » ouvre la comparaison :
 * fenêtre sur grand écran, plein écran sur téléphone.
 *
 * La sélection vit dans la page Courses et dans le stockage de session : elle
 * survit à l'ouverture d'une fiche, d'une fiche jockey, ou d'un rechargement.
 *
 * Écarts à la maquette (design/INTEGRATION.md) : pas de jockey du jour sous le
 * nom (non relevé) mais l'âge, le sexe et la robe ; pas de facteurs du
 * pronostic (non exportés par le modèle) ; « Value » devient « Écart au
 * marché » et « Gains » « Allocations » ; la tendance de cote est simulée et
 * le dit.
 */

const CLE_STOCKAGE = 'crosswell.comparateur'

interface EtatComparaison {
  cle: string | null
  numeros: number[]
  ouvert: boolean
}

function lireStockage(): EtatComparaison {
  try {
    const v = JSON.parse(sessionStorage.getItem(CLE_STOCKAGE) ?? 'null') as Partial<EtatComparaison> | null
    if (v && typeof v.cle === 'string' && Array.isArray(v.numeros)) {
      return { cle: v.cle, numeros: v.numeros.filter(Number.isInteger).slice(0, MAX_COMPARES), ouvert: false }
    }
  } catch {
    // Stockage indisponible (navigation privée) : on repart de zéro.
  }
  return { cle: null, numeros: [], ouvert: false }
}

export interface Comparaison {
  /** Les numéros retenus pour la course affichée, dans l'ordre de sélection. */
  numeros: number[]
  ouvert: boolean
  plein: boolean
  contient: (numero: number) => boolean
  basculer: (numero: number) => void
  vider: () => void
  ouvrir: () => void
  fermer: () => void
}

/** La sélection du comparateur pour la course affichée ; une autre course repart de zéro. */
export function useComparaison(course: Course | null): Comparaison {
  const [etat, setEtat] = useState<EtatComparaison>(lireStockage)
  const cle = course?.cle ?? null
  const actuelle = cle != null && etat.cle === cle

  const numeros = useMemo(
    () => (actuelle && course ? partantsCompares(course.liste, etat.numeros).map((p) => p.numero) : []),
    [actuelle, course, etat.numeros],
  )

  useEffect(() => {
    try {
      sessionStorage.setItem(CLE_STOCKAGE, JSON.stringify({ cle: etat.cle, numeros: etat.numeros }))
    } catch {
      // Sans stockage, la sélection vit le temps de la page.
    }
  }, [etat.cle, etat.numeros])

  const basculer = useCallback(
    (numero: number) => {
      if (!cle) return
      setEtat((e) => {
        const memeCourse = e.cle === cle
        const suivants = basculerNumero(memeCourse ? e.numeros : [], numero)
        // Sous deux chevaux, la comparaison ouverte se referme (comme la maquette).
        return { cle, numeros: suivants, ouvert: memeCourse && e.ouvert && suivants.length >= MIN_COMPARES }
      })
    },
    [cle],
  )
  const vider = useCallback(() => setEtat((e) => ({ ...e, numeros: [], ouvert: false })), [])
  const ouvrir = useCallback(() => setEtat((e) => ({ ...e, ouvert: true })), [])
  const fermer = useCallback(() => setEtat((e) => ({ ...e, ouvert: false })), [])

  return {
    numeros,
    ouvert: actuelle && etat.ouvert && numeros.length >= MIN_COMPARES,
    plein: numeros.length >= MAX_COMPARES,
    contient: (n) => numeros.includes(n),
    basculer,
    vider,
    ouvrir,
    fermer,
  }
}

/** La case à cocher d'une ligne du tableau. Rien pour un non-partant. */
export function CaseComparer({
  partant,
  comparaison,
  className = '',
}: {
  partant: Partant
  comparaison: Comparaison
  className?: string
}) {
  if (partant.nonPartant) return <span aria-hidden className={className} />
  const coche = comparaison.contient(partant.numero)
  const bloque = !coche && comparaison.plein
  return (
    <button
      type="button"
      aria-pressed={coche}
      aria-disabled={bloque || undefined}
      aria-label={
        coche
          ? `Retirer ${partant.nom} du comparateur`
          : bloque
            ? `${partant.nom} : 3 chevaux maximum dans le comparateur`
            : `Ajouter ${partant.nom} au comparateur`
      }
      onClick={() => !bloque && comparaison.basculer(partant.numero)}
      className={`group flex items-center ${bloque ? 'cursor-not-allowed' : ''} ${className}`}
    >
      <span
        className={`w-[1.375rem] h-[1.375rem] rounded-[6px] grid place-items-center transition-colors ${
          coche ? 'bg-accent' : 'border-[1.5px] border-line-hover group-hover:border-faint'
        } ${bloque ? 'opacity-35' : ''}`}
      >
        {coche && <Check size={14} strokeWidth={3} className="text-accent-ink" aria-hidden />}
      </span>
    </button>
  )
}

/** La barre du bas : les numéros retenus, l'indication, Vider et Comparer. */
export function BarreComparateur({ course, comparaison }: { course: Course; comparaison: Comparaison }) {
  const choisis = partantsCompares(course.liste, comparaison.numeros)
  if (choisis.length === 0 || comparaison.ouvert) return null
  const pret = choisis.length >= MIN_COMPARES
  return (
    <div className="sticky z-30 bottom-[calc(4.25rem+env(safe-area-inset-bottom)+0.75rem)] md:bottom-7 mt-6 flex justify-center pointer-events-none">
      <div
        role="region"
        aria-label="Comparateur"
        className="pointer-events-auto w-full lg:w-auto flex items-center gap-2.5 lg:gap-[1.125rem] py-2.5 pr-2.5 pl-3.5 lg:py-3 lg:pr-3 lg:pl-[1.375rem] rounded-[1.25rem] lg:rounded-full bg-raised border border-line-strong shadow-[0_12px_40px_rgba(0,0,0,0.5)]"
      >
        <span className="hidden lg:inline text-sm font-bold">Comparateur</span>
        <span className="flex gap-1 lg:gap-1.5">
          {choisis.map((p) => (
            <span
              key={p.numero}
              className="num w-7 h-7 lg:w-8 lg:h-8 rounded-[8px] lg:rounded-[9px] bg-accent text-accent-ink grid place-items-center text-xs lg:text-sm font-extrabold"
            >
              {p.numero}
            </span>
          ))}
        </span>
        <span role="status" className="grow lg:grow-0 min-w-0 text-[0.6875rem] lg:text-[0.8125rem] font-medium leading-snug text-faint">
          {indiceComparaison(choisis.length)}
        </span>
        <button
          type="button"
          onClick={comparaison.vider}
          aria-label="Vider le comparateur"
          className="shrink-0 w-11 h-11 lg:w-auto lg:px-4 rounded-full border border-line-strong grid place-items-center text-[0.8125rem] font-bold hover:border-line-hover"
        >
          <X size={14} strokeWidth={2.2} className="lg:hidden text-muted" aria-hidden />
          <span className="hidden lg:inline" aria-hidden>
            Vider
          </span>
        </button>
        <button
          type="button"
          onClick={pret ? comparaison.ouvrir : undefined}
          aria-disabled={!pret || undefined}
          className={`shrink-0 h-11 px-4 lg:px-[1.375rem] rounded-full text-sm font-bold transition-colors ${
            pret ? 'bg-accent text-accent-ink hover:bg-accent-hover' : 'bg-line-strong text-faint cursor-not-allowed'
          }`}
        >
          {pret ? (
            <>
              <span className="lg:hidden">Comparer</span>
              <span className="hidden lg:inline">Comparer {choisis.length} chevaux</span>
            </>
          ) : (
            'Comparer'
          )}
        </button>
      </div>
    </div>
  )
}

/** L'icône de la maquette : deux colonnes décalées. */
function IconeComparer() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path d="M4 6h7v14H4zM13 4h7v16h-7z" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" />
    </svg>
  )
}

/** Le bouton de la fiche cheval, et de quoi lancer la comparaison sans repasser par le tableau. */
export function BoutonComparer({
  partant,
  comparaison,
  onComparer,
}: {
  partant: Partant
  comparaison: Comparaison
  onComparer: () => void
}) {
  if (partant.nonPartant) return null
  const coche = comparaison.contient(partant.numero)
  const bloque = !coche && comparaison.plein
  const n = comparaison.numeros.length
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 -mt-2 lg:-mt-3">
      <button
        type="button"
        aria-pressed={coche}
        aria-disabled={bloque || undefined}
        onClick={() => !bloque && comparaison.basculer(partant.numero)}
        className={`h-11 lg:h-9 px-3.5 rounded-full inline-flex items-center gap-1.5 text-[0.8125rem] font-bold border transition-colors ${
          coche ? 'bg-accent/[0.12] text-accent border-accent/50' : 'border-line-strong hover:border-line-hover'
        } ${bloque ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <IconeComparer />
        {coche ? 'Dans le comparateur' : 'Comparer'}
      </button>
      {bloque && <span className="text-xs font-medium text-faint">3 chevaux maximum : retirez-en un d’abord.</span>}
      {coche && n < MIN_COMPARES && <span className="text-xs font-medium text-faint">Cochez au moins un autre partant.</span>}
      {coche && n >= MIN_COMPARES && (
        <button
          type="button"
          onClick={() => {
            comparaison.ouvrir()
            onComparer()
          }}
          className="text-[0.8125rem] font-bold text-accent hover:underline"
        >
          Comparer les {n} chevaux
        </button>
      )}
    </div>
  )
}

type EtatFicheComparee = 'chargement' | Fiche | null

/** Les fiches France Galop des chevaux comparés : musique, carrière. */
function useFiches(partants: Partant[]): (p: Partant) => EtatFicheComparee {
  const [fiches, setFiches] = useState<Map<string, Fiche | null>>(() => new Map())
  const ids = partants.map((p) => p.idFg ?? '').join('|')
  const connues = useRef(fiches)
  connues.current = fiches

  useEffect(() => {
    let vivant = true
    for (const p of partants) {
      const id = p.idFg
      if (!id || connues.current.has(id)) continue
      chargerFiche(id, p.nom)
        .then((f) => vivant && setFiches((m) => new Map(m).set(id, f)))
        .catch(() => vivant && setFiches((m) => new Map(m).set(id, null)))
    }
    return () => {
      vivant = false
    }
    // Les partants ne changent qu'avec leurs identifiants.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids])

  return (p) => (!p.idFg ? null : fiches.has(p.idFg) ? (fiches.get(p.idFg) ?? null) : 'chargement')
}

/**
 * Une ligne : libellé à gauche et une colonne par cheval sur grand écran ;
 * libellé au-dessus et une grille de colonnes sur téléphone.
 */
function Ligne({ libelle, children, className = '' }: { libelle: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div
      className={`flex flex-col gap-2 lg:grid lg:gap-5 lg:items-center lg:py-3.5 lg:border-t lg:border-track lg:[grid-template-columns:11.875rem_repeat(var(--n),minmax(0,1fr))] ${className}`}
    >
      <span className="flex items-center gap-2 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-faint lg:normal-case lg:tracking-normal lg:text-[0.8125rem] lg:font-semibold lg:text-muted">
        {libelle}
      </span>
      <div className="grid gap-2.5 [grid-template-columns:repeat(var(--n),minmax(0,1fr))] lg:contents">{children}</div>
    </div>
  )
}

function Tiret() {
  return <span className="text-sm font-semibold text-dim">—</span>
}

function ParFiche({ etat, children }: { etat: EtatFicheComparee; children: (f: Fiche) => ReactNode }) {
  if (etat === 'chargement') return <span className="skeleton block h-[1.625rem] lg:h-[1.875rem] w-full max-w-[12rem]" />
  if (!etat) return <Tiret />
  return <>{children(etat)}</>
}

/** La comparaison elle-même. */
export function Comparateur({ course, comparaison }: { course: Course; comparaison: Comparaison }) {
  const choisis = partantsCompares(course.liste, comparaison.numeros)
  const historiques = useHistoriques(course)
  const fiche = useFiches(choisis)
  const { jour } = useHeureParis()
  const fermer = useRef<HTMLButtonElement>(null)
  const surFermeture = useRef(comparaison.fermer)
  surFermeture.current = comparaison.fermer

  // Comme la fiche : Échap ferme, le focus part sur la fermeture, la page dessous ne défile plus.
  useEffect(() => {
    const clavier = (e: KeyboardEvent) => {
      if (e.key === 'Escape') surFermeture.current()
    }
    document.addEventListener('keydown', clavier)
    const avant = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    fermer.current?.focus()
    return () => {
      document.removeEventListener('keydown', clavier)
      document.documentElement.style.overflow = avant
    }
  }, [])

  const n = choisis.length
  const victoireMax = meilleure(choisis.map((p) => p.pWin))
  const placeMax = meilleure(choisis.map((p) => p.pPlace))
  const echelle = Math.max(...choisis.map((p) => p.pWin ?? 0), 0.0001)
  const avecCote = choisis.some((p) => p.cote != null)
  const avecSimulation = choisis.some((p) => historiques?.has(p.numero))
  const repere = [`C${course.numero}`, course.nom ?? `Course ${course.numero}`, course.heureDepart].filter(Boolean).join(' · ')

  return (
    <div className="fixed inset-0 z-50 flex justify-center lg:items-center lg:p-10 bg-canvas lg:bg-[rgb(4_6_5/0.78)]">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Fermer le comparateur"
        onClick={comparaison.fermer}
        className="hidden lg:block absolute inset-0 cursor-default"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="comparateur-titre"
        className="relative w-full lg:max-w-[72.5rem] h-full lg:h-auto lg:max-h-full overflow-y-auto [scrollbar-width:thin] bg-canvas lg:bg-sunken lg:border border-line lg:rounded-3xl flex flex-col px-5 pt-4 pb-8 lg:px-9 lg:pt-7 lg:pb-9 animate-fade-up"
      >
        <div className="flex items-center gap-3 lg:justify-between lg:gap-6 pb-4 lg:pb-5">
          <button
            ref={fermer}
            type="button"
            onClick={comparaison.fermer}
            aria-label="Fermer le comparateur"
            className="lg:order-2 w-11 h-11 shrink-0 rounded-full border border-line-strong grid place-items-center hover:border-line-hover"
          >
            <ChevronLeft size={18} className="lg:hidden" aria-hidden />
            <X size={18} className="hidden lg:block" aria-hidden />
          </button>
          <div className="flex flex-col gap-0.5 lg:gap-1 min-w-0">
            <h2 id="comparateur-titre" className="text-[1.0625rem] lg:text-[1.4375rem] font-extrabold tracking-[-0.02em]">
              Comparateur
            </h2>
            <span className="num text-xs lg:text-[0.8125rem] font-medium text-faint truncate">{repere}</span>
          </div>
        </div>

        <div className="flex flex-col gap-[1.125rem] lg:gap-0" style={{ '--n': n } as CSSProperties}>
          {/* Les chevaux : cartes sur téléphone, en-têtes de colonne sur grand écran. */}
          <div className="grid gap-2.5 [grid-template-columns:repeat(var(--n),minmax(0,1fr))] lg:gap-5 lg:items-center lg:pb-3.5 lg:[grid-template-columns:11.875rem_repeat(var(--n),minmax(0,1fr))]">
            <span className="hidden lg:block" />
            {choisis.map((p) => {
              const f = fiche(p)
              const identite = f && f !== 'chargement' ? ligneIdentite(f.profil, jour) : ''
              return (
                <div
                  key={p.numero}
                  className="relative min-w-0 flex flex-col items-center gap-1.5 px-1.5 py-3 rounded-[14px] bg-surface border border-line lg:flex-row lg:gap-3 lg:p-0 lg:bg-transparent lg:border-0 lg:rounded-none"
                >
                  <span className="num shrink-0 w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-[14px] bg-accent text-accent-ink grid place-items-center text-[1.0625rem] lg:text-[1.1875rem] font-extrabold">
                    {p.numero}
                  </span>
                  <Link
                    to={lienPartant(course, p)}
                    state={DEPUIS_LA_COURSE}
                    preventScrollReset
                    onClick={comparaison.fermer}
                    className="max-w-full lg:grow min-w-0 flex flex-col items-center lg:items-start gap-0.5 hover:text-accent"
                  >
                    <span className="max-w-full text-[0.8125rem] lg:text-[1rem] font-bold lg:font-extrabold truncate">{p.nom}</span>
                    <span className="lg:hidden text-[0.6875rem] font-semibold text-faint">{formatRang(p.rang)} prédit</span>
                    <span className="hidden lg:block max-w-full text-xs font-medium text-faint truncate">{identite || ' '}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => comparaison.basculer(p.numero)}
                    aria-label={`Retirer ${p.nom} du comparateur`}
                    className="absolute top-0.5 right-0.5 w-8 h-8 grid place-items-center text-faint hover:text-ink lg:static lg:shrink-0 lg:w-9 lg:h-9 lg:rounded-full lg:border lg:border-line-strong lg:text-muted lg:hover:border-line-hover"
                  >
                    <X size={13} strokeWidth={2.4} aria-hidden />
                  </button>
                </div>
              )
            })}
          </div>

          <Ligne libelle="Pronostic" className="hidden">
            {choisis.map((p) => (
              <span key={p.numero} className="flex flex-col gap-0.5">
                <span className="num text-[0.9375rem] font-extrabold">{formatRang(p.rang)} prédit</span>
                {course.courue && (
                  <span className={`num text-xs font-bold ${p.arrivee != null && p.arrivee <= 3 ? 'text-accent' : 'text-faint'}`}>
                    {p.arrivee != null ? `Arrivée : ${formatRang(p.arrivee)}` : 'Arrivée : au-delà des places relevées'}
                  </span>
                )}
              </span>
            ))}
          </Ligne>

          <Ligne libelle="Chances de victoire">
            {choisis.map((p) => (
              <span key={p.numero} className="flex flex-col gap-1.5 lg:gap-2">
                <span className={`num text-[1.1875rem] lg:text-[1.3125rem] font-extrabold ${p.pWin != null && p.pWin === victoireMax ? 'text-accent' : ''}`}>
                  {pourcent(p.pWin)}
                </span>
                <span className="block h-1.5 lg:h-2 rounded-full bg-track overflow-hidden">
                  <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.round(((p.pWin ?? 0) / echelle) * 100)}%` }} />
                </span>
              </span>
            ))}
          </Ligne>

          <Ligne libelle="Chances d’être placé">
            {choisis.map((p) => (
              <span
                key={p.numero}
                className={`num text-[0.9375rem] lg:text-[1.0625rem] font-extrabold ${p.pPlace != null && p.pPlace === placeMax ? 'text-accent' : ''}`}
              >
                {pourcent(p.pPlace)}
              </span>
            ))}
          </Ligne>

          {avecCote && (
            <Ligne
              libelle={
                <>
                  Cote et tendance
                  {avecSimulation && <PastilleSimulee />}
                </>
              }
            >
              {choisis.map((p) => {
                const h = historiques?.get(p.numero)
                const t = h ? tendanceCote(h.variation) : null
                const court = t ? (t.sens === 'stable' ? 'Stable' : `${t.sens === 'baisse' ? '↓' : '↑'} ${Math.round(Math.abs(h!.variation) * 100)} %`) : null
                return (
                  <span key={p.numero} className="flex flex-col gap-1 lg:gap-1.5 min-w-0">
                    <span className="num flex items-baseline gap-2.5">
                      <span className="text-[0.9375rem] lg:text-[1.0625rem] font-extrabold">{p.cote != null ? formatCote(p.cote) : '—'}</span>
                      {t && <span className={`hidden lg:inline text-[0.8125rem] font-extrabold ${TON_SENS[t.sens]}`}>{t.libelle}</span>}
                    </span>
                    {h && <MiniCourbe h={h} className="h-[2.125rem] lg:h-11" />}
                    {t && <span className={`lg:hidden num text-xs font-extrabold ${TON_SENS[t.sens]}`}>{court}</span>}
                  </span>
                )
              })}
            </Ligne>
          )}

          {avecCote && (
            <Ligne libelle="Écart au marché">
              {choisis.map((p) => (
                <span key={p.numero}>
                  {p.value ? <span className="chip-accent">{LIBELLE_ECART}</span> : <Tiret />}
                </span>
              ))}
            </Ligne>
          )}

          <Ligne libelle="Musique">
            {choisis.map((p) => (
              <span key={p.numero} className="min-w-0">
                <ParFiche etat={fiche(p)}>
                  {(f) => {
                    const cases = musique(f.performances)
                    if (cases.length === 0) return <Tiret />
                    return (
                      <span className="grid grid-cols-3 gap-[3px] lg:flex lg:flex-wrap lg:gap-[5px]">
                        {cases.map((c, i) => (
                          <span
                            key={i}
                            className={`num h-[1.625rem] lg:h-[1.875rem] lg:min-w-[2.125rem] px-0.5 rounded-[6px] lg:rounded-[8px] grid place-items-center text-[0.625rem] lg:text-xs font-extrabold ${TON_PLACE[c.ton]}`}
                          >
                            {c.libelle}
                          </span>
                        ))}
                      </span>
                    )
                  }}
                </ParFiche>
              </span>
            ))}
          </Ligne>

          <Ligne libelle="Victoires / courses">
            {choisis.map((p) => (
              <span key={p.numero}>
                <ParFiche etat={fiche(p)}>
                  {(f) => {
                    const c = carriere(f.performances)
                    return (
                      <span className="num text-sm lg:text-[0.9375rem] font-bold">
                        {c.victoires} / {c.courses}
                      </span>
                    )
                  }}
                </ParFiche>
              </span>
            ))}
          </Ligne>

          <Ligne libelle="Allocations">
            {choisis.map((p) => (
              <span key={p.numero}>
                <ParFiche etat={fiche(p)}>
                  {(f) => <span className="num text-sm lg:text-[0.9375rem] font-bold">{euros(carriere(f.performances).allocations)}</span>}
                </ParFiche>
              </span>
            ))}
          </Ligne>
        </div>

        <p className="pt-5 lg:pt-4 text-[0.6875rem] lg:text-xs font-medium leading-relaxed text-faint">
          En vert : la meilleure valeur entre les chevaux comparés.{' '}
          <span className="lg:hidden">Touchez</span>
          <span className="hidden lg:inline">Cliquez sur</span> un nom pour ouvrir sa fiche.
          {avecSimulation && ' L’évolution des cotes est simulée : leur historique n’est pas encore enregistré.'}
        </p>
      </div>
    </div>
  )
}
