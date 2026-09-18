import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { cote as formatCote, distance as formatDistance, hippodrome as formatHippodrome, pourcent, rang } from '@/lib/format'
import { minutesAvantDepart, texteDepart, type Prochaine } from '@/lib/accueil'
import { arriveePredite, confianceCourse, lienCourse } from '@/lib/programme'
import type { InstantParis } from '@/lib/journee'
import { BarresConfiance } from '@/components/courses/EnTeteCourse'
import { TuileNumero } from '@/components/ui/TuileNumero'
import { AvecUnPass } from '@/components/acces/Verrou'

/**
 * La grande carte « Prochaine course » : son nom, son heure, le délai avant le
 * départ, nos cinq premiers et la confiance. Quand plus rien n'est à venir
 * aujourd'hui, elle présente la première course de demain ; le soir, tant que
 * demain n'est pas publié, la dernière course du jour avec son arrivée.
 */
export function ProchaineCourse({ prochaine, maintenant }: { prochaine: Prochaine; maintenant: InstantParis }) {
  const c = prochaine.course
  const cinq = arriveePredite(c)
  const confiance = confianceCourse(c)
  const minutes = minutesAvantDepart(c, maintenant)
  // Pour demain, le titre dit déjà le jour ; pour une course terminée, le
  // délai serait négatif (« imminent ») : pas de pastille de délai.
  const delai = !prochaine.demain && !prochaine.terminee && minutes != null ? texteDepart(minutes) : null
  const titre = prochaine.terminee ? 'Dernière course du jour' : prochaine.demain ? 'Première course de demain' : 'Prochaine course'
  const statut = prochaine.terminee ? (c.courue ? 'Terminée · arrivée relevée' : 'Terminée') : null
  // Formule Gratuit : la base n'a donné ni arrivée prédite ni confiance (`db/007`).
  const verrou = c.verrouillee
  const action = prochaine.terminee ? 'Voir le résultat' : verrou ? 'Voir la course' : null
  /** La place réelle d'un de nos cinq, une fois l'arrivée relevée. */
  const arrivee = (p: (typeof cinq)[number]) =>
    prochaine.terminee && c.courue ? (
      <span className={`num text-xs font-extrabold ${p.arrivee != null && p.arrivee <= 3 ? 'text-accent' : 'text-faint'}`}>
        {p.arrivee != null ? `Arrivé ${rang(p.arrivee)}` : 'Au-delà'}
      </span>
    ) : null
  const meta = [c.type, c.distance != null ? formatDistance(c.distance) : null, `${c.partants} partants`]
    .filter(Boolean)
    .join(' · ')

  return (
    <>
      {/* Grand écran */}
      <section className="hidden lg:flex flex-col gap-7 p-8 rounded-[1.5rem] bg-surface border border-line min-w-0">
        <div className="flex items-start justify-between gap-6">
          <div className="flex flex-col gap-2.5 min-w-0">
            <p className="num flex items-center gap-2 text-[0.8125rem] font-semibold text-faint">
              <span className="text-accent">{titre}</span>
              <span aria-hidden>·</span>
              <span>C{c.numero}</span>
              <span aria-hidden>·</span>
              <span className="truncate">{formatHippodrome(c.hippodrome)}</span>
            </p>
            <h2 className="text-[1.8125rem] font-extrabold tracking-[-0.02em] leading-[1.1]">{c.nom ?? `Course ${c.numero}`}</h2>
            <p className="num text-sm font-medium text-faint">{meta}</p>
          </div>
          <div className="num shrink-0 flex flex-col items-end gap-1">
            {c.heureDepart && (
              <span className="text-[2.125rem] font-extrabold tracking-[-0.02em] leading-none">{c.heureDepart}</span>
            )}
            {delai && (
              <span className="text-[0.8125rem] font-bold rounded-full px-[0.6875rem] py-[5px] bg-accent text-accent-ink">
                Départ {delai}
              </span>
            )}
            {statut && (
              <span className="text-[0.8125rem] font-bold rounded-full px-[0.6875rem] py-[5px] bg-raised-2 border border-line-strong text-soft">
                {statut}
              </span>
            )}
          </div>
        </div>

        {cinq.length > 0 && (
          <div className="flex flex-col gap-3.5">
            <span className="label">Arrivée prédite</span>
            <div className="grid grid-cols-5 gap-3">
              {cinq.map((p, i) => (
                <div key={p.numero} className="flex flex-col items-start gap-2.5 min-w-0">
                  <span className="text-xs font-bold text-faint">{rang(i + 1)}</span>
                  <TuileNumero numero={p.numero} taille="lg" accent={i === 0} />
                  <span className="max-w-full text-[0.8125rem] font-semibold truncate">{p.nom}</span>
                  <span className={`num text-xs font-bold ${i === 0 ? 'text-accent' : 'text-faint'}`}>
                    {pourcent(p.pWin)}
                    {p.cote != null && ` · cote ${formatCote(p.cote)}`}
                  </span>
                  {arrivee(p)}
                </div>
              ))}
            </div>
          </div>
        )}

        {verrou && (
          <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-sunken border border-line">
            <AvecUnPass className="!text-sm shrink-0" />
            <span className="text-sm font-medium text-muted">L’arrivée prédite, les pourcentages et la confiance de cette course.</span>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 pt-1">
          {verrou ? (
            <span />
          ) : (
            <span className="flex items-center gap-2.5">
              <BarresConfiance confiance={confiance} petit />
              <span className="text-sm font-semibold text-soft">
                Confiance {confiance ? confiance.libelle.toLowerCase() : 'non évaluée'}
              </span>
            </span>
          )}
          <Link to={lienCourse(c)} className="btn-accent !h-12 !px-6 !text-[0.9375rem]">
            {action ?? 'Voir le pronostic complet'}
            <ArrowRight size={18} aria-hidden />
          </Link>
        </div>
      </section>

      {/* Téléphone : toute la carte est un lien. */}
      <Link
        to={lienCourse(c)}
        className="lg:hidden flex flex-col gap-[1.125rem] p-5 rounded-[1.375rem] bg-surface border border-accent"
      >
        <span className="flex items-center justify-between gap-3">
          <span className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-accent">{titre}</span>
          {delai && (
            <span className="num text-xs font-bold rounded-full px-2.5 py-1 bg-accent text-accent-ink">{delai}</span>
          )}
          {statut && (
            <span className="text-xs font-bold rounded-full px-2.5 py-1 bg-raised-2 border border-line-strong text-soft">Terminée</span>
          )}
        </span>
        <span className="flex items-start justify-between gap-3">
          <span className="flex flex-col gap-1.5 min-w-0">
            <span className="num text-xs font-semibold text-faint">
              C{c.numero} · {formatHippodrome(c.hippodrome)}
            </span>
            <span className="text-[1.25rem] font-extrabold tracking-[-0.02em] leading-[1.15]">
              {c.nom ?? `Course ${c.numero}`}
            </span>
          </span>
          {c.heureDepart && (
            <span className="num shrink-0 text-[1.4375rem] font-extrabold tracking-[-0.02em]">{c.heureDepart}</span>
          )}
        </span>
        {cinq.length > 0 && (
          <span className="flex flex-col gap-2.5">
            <span className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-faint">Arrivée prédite</span>
            <span className="grid grid-cols-5 gap-2">
              {cinq.map((p, i) => (
                <span key={p.numero} className="flex flex-col items-center gap-1.5">
                  <span
                    className={`num w-full max-w-[3.25rem] aspect-square rounded-[13px] grid place-items-center text-[1.0625rem] font-extrabold ${
                      i === 0 ? 'bg-accent text-accent-ink' : 'bg-raised-2 text-ink border border-line-strong'
                    }`}
                  >
                    {p.numero}
                  </span>
                  <span className={`num text-xs font-bold ${i === 0 ? 'text-accent' : 'text-faint'}`}>{pourcent(p.pWin)}</span>
                  {arrivee(p)}
                </span>
              ))}
            </span>
          </span>
        )}
        {verrou && <AvecUnPass />}
        <span className="h-12 rounded-full bg-accent text-accent-ink flex items-center justify-center gap-2 text-[0.9375rem] font-bold">
          {action ?? 'Voir le pronostic'}
          <ArrowRight size={18} aria-hidden />
        </span>
      </Link>
    </>
  )
}
