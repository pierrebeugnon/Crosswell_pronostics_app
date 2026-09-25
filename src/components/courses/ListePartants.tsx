import { Link } from 'react-router-dom'
import { ArrowDown, ChevronRight } from 'lucide-react'
import type { Course, Partant } from '@/types'
import { cote as formatCote, pourcent, rang as formatRang } from '@/lib/format'
import { LIBELLE_ECART } from '@/config/app'
import { DEPUIS_LA_COURSE, lienPartant } from '@/lib/programme'
import { BarreProba } from '@/components/ui/BarreProba'
import { FlecheCote, PastilleSimulee } from '@/components/courses/EvolutionCote'
import { flecheCote, heureMinute, type HistoriqueCote, type PointCote } from '@/lib/cotes'
import { CaseComparer, type Comparaison } from '@/components/courses/Comparateur'

/* Les colonnes de la maquette, avec ou sans la colonne « Arrivée ». La colonne
   de cases à cocher du comparateur n'y est pas : il n'existe pas encore. */
const COLONNES_AVANT = 'grid-cols-[2.75rem_2.5rem_minmax(0,1fr)_13.125rem_3.5rem_4.5rem_6.5rem]'
const COLONNES_APRES = 'grid-cols-[2.75rem_3.25rem_2.5rem_minmax(0,1fr)_11.25rem_3.5rem_4.5rem_6.5rem]'

/** Le marqueur d'écart au marché (MARGE_VALUE dépassée). */
function Ecart({ petit = false }: { petit?: boolean }) {
  return (
    <span
      className={`chip-accent shrink-0 ${petit ? '!text-[0.5625rem] !px-1.5 !py-0.5' : ''}`}
      title="Notre probabilité dépasse nettement celle que la cote implique"
    >
      {LIBELLE_ECART}
    </span>
  )
}

function NonPartant() {
  return (
    <span className="shrink-0 text-[0.625rem] font-extrabold uppercase tracking-[0.06em] text-ink border border-line-hover rounded-full px-[7px] py-0.5">
      Non-partant
    </span>
  )
}

/** Rang prédit : vert et gras pour nos trois premiers, éteint au-delà, tiret pour un non-partant. */
function Rang({ p, className = '' }: { p: Partant; className?: string }) {
  const notre = p.rang != null && p.rang <= 3
  return (
    <span className={`num font-extrabold ${notre ? 'text-accent' : 'text-dim'} ${className}`}>
      {p.nonPartant || p.rang == null ? '—' : p.rang}
    </span>
  )
}

function Arrivee({ p }: { p: Partant }) {
  if (p.arrivee == null) return <span className="num text-sm font-extrabold text-faint">{p.nonPartant ? '' : '—'}</span>
  return (
    <span className={`num text-sm font-extrabold ${p.arrivee <= 3 ? 'text-accent' : 'text-faint'}`}>
      {formatRang(p.arrivee)}
    </span>
  )
}

/**
 * « Tous les partants » — tableau sur grand écran, liste sur téléphone.
 * L'échelle des barres est relative au meilleur partant au départ (voir
 * BarreProba) ; un non-partant reste en bas, estompé, sans pourcentage.
 */
/**
 * La cote montrée : celle de CLÔTURE dès qu'elle existe (c'est elle qui sert
 * l'écart au marché), sinon le dernier relevé du jour, avec son heure — avant
 * la course, c'est la seule qu'on ait (`db/008`).
 */
function coteAffichee(
  p: Partant,
  dernieres: Map<number, PointCote> | null,
): { valeur: number; releve: string | null } | null {
  if (p.nonPartant) return null
  if (p.cote != null) return { valeur: p.cote, releve: null }
  const d = dernieres?.get(p.numero)
  return d ? { valeur: d.cote, releve: heureMinute(d.minute) } : null
}

export function ListePartants({
  course,
  historiques = null,
  dernieres = null,
  comparaison = null,
}: {
  course: Course
  /** Évolution de la cote de chaque partant (`services/cotes.ts`) : les flèches. */
  historiques?: Map<number, HistoriqueCote> | null
  /** Le dernier relevé de chaque partant : la cote du moment, avant la course. */
  dernieres?: Map<number, PointCote> | null
  /** Le comparateur : une case à cocher en tête de chaque ligne. */
  comparaison?: Comparaison | null
}) {
  const c = course
  const maximum = Math.max(...c.liste.filter((p) => !p.nonPartant).map((p) => p.pWin ?? 0), 0.0001)
  const colonnes = c.courue ? COLONNES_APRES : COLONNES_AVANT
  const avecValue = c.liste.some((p) => p.value)
  const avecFleches = historiques != null && [...historiques.values()].some((h) => flecheCote(h.variation) != null)
  const cotesSimulees = historiques != null && [...historiques.values()].some((h) => h.simulee)
  // Avec les cases, chaque ligne = la case + le lien vers la fiche (deux cibles distinctes).
  const ligneBureau = comparaison ? 'grid grid-cols-[3.5rem_minmax(0,1fr)] items-center' : ''
  const ligneTelephone = comparaison ? 'grid grid-cols-[2.25rem_minmax(0,1fr)] items-center' : ''

  return (
    <section className="flex flex-col gap-1 lg:gap-4" aria-labelledby="tous-les-partants">
      <div className="flex flex-wrap items-baseline lg:items-center justify-between gap-x-4 gap-y-2 pb-2 lg:pb-0">
        <h2
          id="tous-les-partants"
          className="label lg:normal-case lg:tracking-[-0.01em] lg:text-[1.25rem] lg:font-bold lg:text-ink"
        >
          <span className="lg:hidden">Partants</span>
          <span className="hidden lg:inline">Tous les partants</span>
        </h2>
        {comparaison && <span className="lg:hidden text-xs font-medium text-faint">Cochez pour comparer</span>}
        {(avecValue || avecFleches) && (
          <span
            className={`flex flex-wrap items-center lg:justify-end gap-x-4 gap-y-1.5 text-xs lg:text-[0.8125rem] font-medium text-faint ${
              comparaison ? 'basis-full lg:basis-auto' : ''
            }`}
          >
            {avecValue && (
              <span className="flex items-center gap-2">
                <Ecart />
                Chances du modèle &gt; cote
              </span>
            )}
            {avecFleches && (
              <span className="hidden lg:flex items-center gap-1.5">
                <ArrowDown size={14} strokeWidth={2.6} className="text-accent" aria-hidden />
                Cote en baisse depuis le {cotesSimulees ? 'matin' : 'premier relevé'}
                {cotesSimulees && <PastilleSimulee />}
              </span>
            )}
          </span>
        )}
      </div>

      {/* Grand écran : le tableau. */}
      <div className="hidden lg:block rounded-2xl border border-sep overflow-hidden">
        <div className={`${ligneBureau} bg-surface`}>
          {/* Une vraie cellule : un élément `sr-only` seul sortirait de la grille. */}
          {comparaison && (
            <span>
              <span className="sr-only">Comparer</span>
            </span>
          )}
          <div
            className={`grid ${colonnes} items-center gap-4 ${comparaison ? '' : 'pl-5'} pr-5 py-3 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-faint`}
          >
            <span>Préd.</span>
            {c.courue && <span>Arrivée</span>}
            <span>N°</span>
            <span>Cheval</span>
            <span>Chances de victoire</span>
            <span className="text-right">Placé</span>
            <span className="text-right">Cote</span>
            <span />
          </div>
        </div>
        {c.liste.map((p) => {
          const cote = coteAffichee(p, dernieres)
          return (
          <div key={p.numero} className={`${ligneBureau} border-t border-track ${p.nonPartant ? 'opacity-[0.45]' : ''}`}>
            {comparaison && <CaseComparer partant={p} comparaison={comparaison} className="w-14 h-[3.375rem] pl-4" />}
            <Link
              to={lienPartant(c, p)}
              state={DEPUIS_LA_COURSE}
              preventScrollReset
              className={`grid ${colonnes} items-center gap-4 ${comparaison ? '' : 'pl-5'} pr-5 h-[3.375rem] transition-colors hover:bg-sunken`}
            >
              <Rang p={p} className="text-[0.9375rem]" />
              {c.courue && <Arrivee p={p} />}
              <span className="num w-[2.125rem] h-[2.125rem] rounded-[9px] bg-raised border border-line-strong grid place-items-center text-sm font-bold">
                {p.numero}
              </span>
              <span className="min-w-0 flex items-center gap-2">
                <span className="text-[0.9375rem] font-semibold truncate">{p.nom}</span>
                {p.nonPartant && <NonPartant />}
              </span>
              <span className="flex items-center gap-3">
                <BarreProba
                  valeur={p.nonPartant ? null : p.pWin}
                  maximum={maximum}
                  accent={p.rang != null && p.rang <= 3}
                  className="flex-1"
                />
                <span className="num w-[2.625rem] text-right text-[0.9375rem] font-bold">
                  {p.nonPartant ? '—' : pourcent(p.pWin)}
                </span>
              </span>
              <span className="num text-right text-sm font-medium text-muted">
                {p.nonPartant ? '—' : pourcent(p.pPlace)}
              </span>
              <span
                className="num flex items-center justify-end gap-1 text-[0.9375rem] font-bold"
                title={cote?.releve ? `Cote relevée à ${cote.releve}` : undefined}
              >
                {!p.nonPartant && <FlecheCote historique={historiques?.get(p.numero)} />}
                {cote ? formatCote(cote.valeur) : '—'}
              </span>
              <span className="flex items-center justify-end gap-2">
                {p.value && <Ecart />}
                <ChevronRight size={16} className="text-dim shrink-0" aria-hidden />
              </span>
            </Link>
          </div>
          )
        })}
      </div>

      {/* Téléphone : la liste. */}
      <div className="lg:hidden">
        {c.liste.map((p) => {
          const cote = coteAffichee(p, dernieres)
          return (
          <div key={p.numero} className={`${ligneTelephone} border-t border-track ${p.nonPartant ? 'opacity-[0.45]' : ''}`}>
            {comparaison && <CaseComparer partant={p} comparaison={comparaison} className="w-9 self-stretch min-h-[3.75rem]" />}
            <Link
              to={lienPartant(c, p)}
              state={DEPUIS_LA_COURSE}
              preventScrollReset
              className="grid grid-cols-[1.125rem_2rem_minmax(0,1fr)_4rem] items-center gap-2.5 py-3"
            >
              <Rang p={p} className="text-sm" />
              <span className="num w-8 h-8 rounded-[9px] bg-raised border border-line-strong grid place-items-center text-[0.8125rem] font-bold">
                {p.numero}
              </span>
              <span className="min-w-0 flex flex-col gap-1.5">
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[0.9375rem] font-semibold truncate">{p.nom}</span>
                  {p.nonPartant && <NonPartant />}
                  {p.value && <Ecart petit />}
                </span>
                <BarreProba
                  valeur={p.nonPartant ? null : p.pWin}
                  maximum={maximum}
                  accent={p.rang != null && p.rang <= 3}
                  className="!h-1.5"
                />
              </span>
              <span className="flex flex-col items-end gap-0.5">
                <span className="num text-[0.9375rem] font-extrabold">{p.nonPartant ? '—' : pourcent(p.pWin)}</span>
                {cote && (
                  <span
                    className="num flex items-center gap-0.5 text-xs font-semibold text-faint"
                    title={cote.releve ? `Cote relevée à ${cote.releve}` : undefined}
                  >
                    <FlecheCote historique={historiques?.get(p.numero)} />
                    {formatCote(cote.valeur)}
                  </span>
                )}
                {c.courue && p.arrivee != null && (
                  <span className={`num text-xs font-extrabold ${p.arrivee <= 3 ? 'text-accent' : 'text-faint'}`}>
                    Arr. {formatRang(p.arrivee)}
                  </span>
                )}
              </span>
            </Link>
          </div>
          )
        })}
      </div>
    </section>
  )
}
