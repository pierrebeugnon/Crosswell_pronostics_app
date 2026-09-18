import { INDICATEURS, DEFINITION_INDICATEUR, type FiltresResultats, type Indicateur } from '@/lib/resultats'

/**
 * La bascule d'indicateur (Gagnant · Placé · Top 3). Sur grand écran, des
 * pilules compactes à droite du titre ; sur téléphone, trois colonnes égales.
 */
export function BasculeIndicateur({
  valeur,
  onChange,
  className = '',
}: {
  valeur: Indicateur
  onChange: (i: Indicateur) => void
  className?: string
}) {
  return (
    <div
      role="group"
      aria-label="Indicateur"
      className={`grid grid-cols-3 lg:flex gap-1 p-1 rounded-full bg-well border border-line ${className}`}
    >
      {INDICATEURS.map((i) => (
        <button
          key={i}
          type="button"
          aria-pressed={valeur === i}
          onClick={() => onChange(i)}
          className={`h-11 lg:h-9 px-4 rounded-full text-[0.8125rem] font-bold transition-colors ${
            valeur === i ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink'
          }`}
        >
          {DEFINITION_INDICATEUR[i].libelle}
        </button>
      ))}
    </div>
  )
}

export interface OptionFiltre {
  valeur: string
  libelle: string
}

export interface DefinitionFiltre {
  cle: keyof FiltresResultats
  libelle: string
  /** Libellé de l'option « tout » : « Toutes », « Tous ». */
  tout: string
  options: OptionFiltre[]
}

/**
 * Les six filtres de la maquette, en listes déroulantes natives (accessibles,
 * et le sélecteur du téléphone fait le reste). Rangée sur grand écran, ruban
 * défilant sur téléphone.
 */
export function Filtres({
  definitions,
  valeurs,
  onChange,
  onReinitialiser,
  actifs,
}: {
  definitions: DefinitionFiltre[]
  valeurs: FiltresResultats
  onChange: (cle: keyof FiltresResultats, valeur: string) => void
  onReinitialiser: () => void
  actifs: number
}) {
  return (
    <div
      className="flex items-end gap-2 lg:gap-3 overflow-x-auto -mx-5 px-5 pb-1 lg:mx-0 lg:p-[1.125rem_1.25rem] lg:overflow-visible lg:rounded-[1.125rem] lg:bg-surface lg:border lg:border-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {definitions.map((d) => (
        <div key={d.cle} className="shrink-0 w-[8.75rem] lg:w-auto lg:flex-1 lg:basis-0 min-w-0 flex flex-col gap-1 lg:gap-1.5">
          <label htmlFor={`filtre-${d.cle}`} className="text-[0.6875rem] lg:text-xs font-semibold text-muted">
            {d.libelle}
          </label>
          <select
            id={`filtre-${d.cle}`}
            value={valeurs[d.cle]}
            onChange={(e) => onChange(d.cle, e.target.value)}
            className={`h-11 px-2.5 lg:px-3 rounded-xl bg-surface lg:bg-canvas border text-[0.8125rem] lg:text-sm font-semibold text-ink cursor-pointer ${
              valeurs[d.cle] ? 'border-accent' : 'border-line-strong'
            }`}
          >
            <option value="">{d.tout}</option>
            {d.options.map((o) => (
              <option key={o.valeur} value={o.valeur}>
                {o.libelle}
              </option>
            ))}
          </select>
        </div>
      ))}
      <button
        type="button"
        onClick={onReinitialiser}
        disabled={actifs === 0}
        className="btn-glass shrink-0 !h-11 lg:!px-[1.125rem]"
      >
        Réinitialiser
      </button>
    </div>
  )
}
