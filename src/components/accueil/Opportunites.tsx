import { Link } from 'react-router-dom'
import { LIBELLE_ECART, TITRE_ECARTS } from '@/config/app'
import { cote as formatCote, hippodrome as formatHippodrome, pourcent, rang } from '@/lib/format'
import type { Opportunite, Opportunites as Liste } from '@/lib/accueil'
import { lienCourse } from '@/lib/programme'
import { TuileNumero } from '@/components/ui/TuileNumero'

/** « Auj. 15:15 · C3 Compiègne » */
function repere(o: Opportunite, aujourdhui: string): string {
  const c = o.course
  const jour = c.date === aujourdhui ? 'Auj.' : 'Dem.'
  return [`${jour}${c.heureDepart ? ` ${c.heureDepart}` : ''}`, `C${c.numero} ${formatHippodrome(c.hippodrome)}`].join(' · ')
}

/** Sur une course courue, ce que le cheval a fait : l'opportunité n'est plus une promesse. */
function Issue({ o }: { o: Opportunite }) {
  if (!o.course.courue) return null
  const a = o.partant.arrivee
  return (
    <span className={`num text-xs font-bold ${a != null && a <= 3 ? 'text-accent' : 'text-faint'}`}>
      {a == null ? 'non classé' : `arrivé ${rang(a)}`}
    </span>
  )
}

/**
 * « Écarts au marché » (« Opportunités · Value » dans la maquette : mots
 * bannis, voir LIBELLE_ECART) — les partants que le modèle voit mieux que
 * leur cote. Carte en colonne sur grand écran, ruban de vignettes sur téléphone.
 */
export function Opportunites({ opportunites, aujourdhui }: { opportunites: Liste; aujourdhui: string }) {
  const { liste, courues } = opportunites
  const sousTitre = courues
    ? 'Sur les courses déjà courues aujourd’hui, face à la cote de clôture'
    : 'Chevaux que le modèle voit mieux que leur cote'

  const pastille = (
    <span className="chip-accent" title="Notre probabilité dépasse nettement celle que la cote implique">
      {LIBELLE_ECART}
    </span>
  )

  return (
    <>
      {/* Grand écran */}
      <section className="hidden lg:flex flex-col gap-[1.125rem] p-7 rounded-[1.5rem] bg-surface border border-line min-w-0">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[1.1875rem] font-bold">{TITRE_ECARTS}</h2>
            {pastille}
          </div>
          <p className="text-[0.8125rem] font-medium text-faint">{sousTitre}</p>
        </div>
        {liste.length === 0 ? (
          <p className="text-sm text-muted leading-relaxed">
            Aucun partant ne se détache de sa cote pour le moment.
          </p>
        ) : (
          <div className="flex flex-col">
            {liste.map((o) => (
              <Link
                key={`${o.course.cle}|${o.partant.numero}`}
                to={lienCourse(o.course)}
                className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3.5 px-2 py-3.5 border-t border-track rounded-[10px] transition-colors hover:bg-sunken"
              >
                <TuileNumero numero={o.partant.numero} taille="md" />
                <span className="min-w-0 flex flex-col gap-[3px]">
                  <span className="text-[0.9375rem] font-bold truncate">{o.partant.nom}</span>
                  <span className="num text-xs font-medium text-faint truncate">{repere(o, aujourdhui)}</span>
                </span>
                <span className="num flex flex-col items-end gap-[3px]">
                  <span className="text-[0.9375rem] font-extrabold text-accent">{pourcent(o.partant.pWin)}</span>
                  {o.partant.cote != null && (
                    <span className="text-xs font-semibold text-faint">cote {formatCote(o.partant.cote)}</span>
                  )}
                  <Issue o={o} />
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Téléphone : un ruban de vignettes. */}
      <section className="lg:hidden flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="label">{TITRE_ECARTS}</h2>
          {pastille}
        </div>
        {courues && liste.length > 0 && <p className="text-xs font-medium text-faint -mt-1">{sousTitre}</p>}
        {liste.length === 0 ? (
          <p className="text-[0.8125rem] text-muted">Aucun partant ne se détache de sa cote pour le moment.</p>
        ) : (
          <div className="flex gap-2.5 overflow-x-auto -mx-5 px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {liste.map((o) => (
              <Link
                key={`${o.course.cle}|${o.partant.numero}`}
                to={lienCourse(o.course)}
                className="shrink-0 w-[12.5rem] flex flex-col gap-3 p-4 rounded-2xl bg-surface border border-line"
              >
                <span className="flex items-center justify-between">
                  <TuileNumero numero={o.partant.numero} taille="md" className="!w-9 !h-9 !rounded-[10px] !text-[0.9375rem]" />
                  <span className="num text-[1.0625rem] font-extrabold text-accent">{pourcent(o.partant.pWin)}</span>
                </span>
                <span className="flex flex-col gap-[3px] min-w-0">
                  <span className="text-[0.9375rem] font-bold truncate">{o.partant.nom}</span>
                  <span className="num text-xs font-medium text-faint truncate">{repere(o, aujourdhui)}</span>
                  {o.partant.cote != null && (
                    <span className="num text-xs font-semibold text-soft">cote {formatCote(o.partant.cote)}</span>
                  )}
                  <Issue o={o} />
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
