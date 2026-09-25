import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronLeft, X } from 'lucide-react'
import type { Course, Partant } from '@/types'
import { LIBELLE_ECART, NOTE_NON_PARTANTS } from '@/config/app'
import { cote as formatCote, dateCourte, hippodrome as formatHippodrome, pourcent, rang as formatRang } from '@/lib/format'
import { lienPartant } from '@/lib/programme'
import { ligneIdentite } from '@/lib/fiche'
import { useHeureParis } from '@/lib/useHeureParis'
import { BarreProba } from '@/components/ui/BarreProba'
import { Carriere, DernieresCourses, Entourage, Musique, SqueletteFiche, useFiche } from '@/components/courses/FicheDetails'
import { EvolutionCote, useCotes } from '@/components/courses/EvolutionCote'
import { heureMinute } from '@/lib/cotes'
import { BoutonComparer, type Comparaison } from '@/components/courses/Comparateur'

/** Une valeur de la grille « Pronostic pour cette course ». */
function Chiffre({ valeur, libelle, accent = false }: { valeur: string; libelle: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-1 min-w-0">
      <span className={`num text-[1.25rem] lg:text-[1.5625rem] font-extrabold tracking-[-0.02em] ${accent ? 'text-accent' : ''}`}>
        {valeur}
      </span>
      <span className="text-xs font-semibold text-faint">{libelle}</span>
    </div>
  )
}

/**
 * LA FICHE D'UN PARTANT — le tiroir de `design/screens/MainFiche.dc.html`.
 *
 * Grand écran : un panneau de 600 px glissé à droite, sur la page Courses
 * assombrie. Téléphone : plein écran, avec un bouton retour. Échap, le fond
 * et la croix ferment la fiche ; elle vit dans l'adresse
 * (`/courses/…/partants/:cheval`), donc le retour arrière la ferme aussi.
 *
 * Contenu : notre pronostic et la lecture de la cote, puis — depuis la
 * décision du fondateur du 18/09/2026 — le profil, l'entourage, les origines,
 * la musique, la carrière et les dernières courses (données France Galop,
 * `db/004_fiche_cheval.sql`). L'évolution de la cote est relevée toutes les
 * 30 minutes depuis le 25/09/2026 (`db/008`, simulée en démonstration seule) ;
 * avant la course, le chiffre « Cote » est le dernier relevé, avec son heure,
 * et la comparaison au marché attend la clôture. Pas encore de facteurs du
 * pronostic, ni de bouton Suivre (A7). « Comparer » alimente le comparateur.
 */
export function FicheCheval({
  course,
  partant,
  onFermer,
  comparaison = null,
}: {
  course: Course
  partant: Partant
  onFermer: () => void
  /** Le comparateur de la page : le bouton « Comparer » de la maquette. */
  comparaison?: Comparaison | null
}) {
  const fermer = useRef<HTMLButtonElement>(null)
  // Passer d'une fiche à l'autre REMPLACE l'entrée d'historique en gardant son
  // état : la fermeture revient toujours à la course.
  const { state } = useLocation()
  const { jour } = useHeureParis()
  const details = useFiche(partant)
  const fiche = details.etat === 'ok' ? details.fiche : null
  const p = partant
  const np = p.nonPartant
  const cotes = useCotes(course)
  const historique = cotes.historiques.get(p.numero) ?? null
  // Avant la course, la cote de clôture manque : on montre le dernier relevé
  // du jour, avec son heure. La comparaison au marché, elle, ne bouge pas.
  const dernier = cotes.dernier.get(p.numero) ?? null
  const coteDuJour = p.cote ?? dernier?.cote ?? null
  const heureCote = dernier ? heureMinute(dernier.minute) : ''
  const maximum = Math.max(...course.liste.filter((x) => !x.nonPartant).map((x) => x.pWin ?? 0), 0.0001)

  // La dernière fonction de fermeture, sans relancer l'effet à chaque rendu :
  // la page se redessine chaque minute, et le focus ne doit pas sauter.
  const surFermeture = useRef(onFermer)
  surFermeture.current = onFermer

  // À l'ouverture : Échap ferme, le focus part sur la fermeture, la page
  // dessous ne défile plus.
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

  const repere = [`C${course.numero}`, course.nom ?? `Course ${course.numero}`, course.heureDepart].filter(Boolean).join(' · ')
  const identite =
    ligneIdentite(fiche?.profil ?? null, jour) ||
    `${formatHippodrome(course.hippodrome)} · ${dateCourte(course.date)} · ${course.partants} partants`

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Fermer la fiche"
        onClick={onFermer}
        className="hidden lg:block flex-1 bg-canvas/[0.72] cursor-default"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="fiche-titre"
        className="w-full lg:w-[37.5rem] shrink-0 h-full overflow-y-auto [scrollbar-width:thin] bg-canvas lg:bg-sunken lg:border-l border-line flex flex-col gap-6 lg:gap-8 px-5 pt-4 pb-10 lg:px-9 lg:pt-6 lg:pb-12 animate-fade-up"
      >
        <div className="flex items-center gap-3 lg:justify-between">
          <button
            ref={fermer}
            type="button"
            onClick={onFermer}
            aria-label="Fermer la fiche"
            className="lg:order-2 w-11 h-11 shrink-0 rounded-full border border-line-strong grid place-items-center hover:border-line-hover"
          >
            <ChevronLeft size={18} className="lg:hidden" aria-hidden />
            <X size={18} className="hidden lg:block" aria-hidden />
          </button>
          <span className="label !text-xs !tracking-[0.14em]">Fiche cheval</span>
        </div>

        <div className="flex items-center gap-3.5 lg:gap-[1.125rem]">
          <span
            className={`num shrink-0 w-14 h-14 lg:w-[4.25rem] lg:h-[4.25rem] rounded-2xl lg:rounded-[1.125rem] grid place-items-center text-[1.3125rem] lg:text-[1.625rem] font-extrabold ${
              np ? 'bg-raised-2 text-faint border border-line-strong' : 'bg-accent text-accent-ink'
            }`}
          >
            <span className="sr-only">n°</span>
            {p.numero}
          </span>
          <div className="min-w-0 flex flex-col gap-1 lg:gap-1.5">
            <h2 id="fiche-titre" className="text-[1.3125rem] lg:text-[1.6875rem] font-extrabold tracking-[-0.025em] leading-[1.1] break-words">
              {p.nom}
            </h2>
            <span className="num text-[0.8125rem] lg:text-sm font-medium text-faint">{identite}</span>
          </div>
        </div>

        {comparaison && <BoutonComparer partant={p} comparaison={comparaison} onComparer={onFermer} />}

        {np && (
          <p role="status" className="px-4 py-3.5 rounded-xl bg-accent/[0.06] border border-accent/35 text-[0.8125rem] font-medium leading-normal text-soft">
            <span className="block text-sm font-extrabold text-ink mb-0.5">Non-partant</span>
            Ce cheval ne court pas{course.courue ? ' : il n’entre pas dans la mesure de nos probabilités.' : '.'} Les
            pourcentages ci-dessous sont ceux du calcul initial.
          </p>
        )}

        {details.etat === 'chargement' && <SqueletteFiche />}
        {fiche && <Entourage fiche={fiche} />}
        {details.etat === 'indisponible' && (
          <p className="text-[0.8125rem] font-medium text-faint">
            Profil et performances indisponibles pour ce cheval pour le moment.
          </p>
        )}

        <section className="flex flex-col gap-3.5 p-[1.125rem] lg:p-5 rounded-2xl bg-surface border border-line">
          <div className="flex flex-col gap-[3px]">
            <h3 className="text-[0.9375rem] lg:text-[0.9375rem] font-bold">Pronostic pour cette course</h3>
            <span className="num text-xs lg:text-[0.8125rem] font-medium text-faint">{repere}</span>
            {course.courue && !np && (
              <span className={`text-[0.8125rem] lg:text-sm font-extrabold ${p.arrivee != null && p.arrivee <= 3 ? 'text-accent' : 'text-faint'}`}>
                {p.arrivee != null ? `Arrivé ${formatRang(p.arrivee)} sur ${course.partants}` : 'Arrivé au-delà des places relevées'}
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2 lg:gap-3">
            <Chiffre valeur={formatRang(np ? p.rangInitial : p.rang)} libelle={np ? 'Rang publié' : 'Rang prédit'} />
            <Chiffre valeur={pourcent(p.pWin)} libelle="Victoire" accent={!np} />
            <Chiffre valeur={pourcent(p.pPlace)} libelle="Placé" />
            <Chiffre
              valeur={np || coteDuJour == null ? '—' : formatCote(coteDuJour)}
              libelle={p.cote == null && coteDuJour != null ? `Cote à ${heureCote}` : 'Cote'}
            />
          </div>
          <div className="flex items-center gap-2.5 pt-3.5 border-t border-track">
            {p.value && !np && <span className="chip-accent shrink-0">{LIBELLE_ECART}</span>}
            <span className="num text-xs lg:text-[0.8125rem] font-medium text-muted leading-normal">
              {np
                ? 'Retiré : sa cote sort de la comparaison au marché.'
                : p.pMarche != null
                  ? `La cote implique environ ${pourcent(p.pMarche)} de chances de victoire, le modèle en donne ${pourcent(p.pWin)}.`
                  : dernier
                    ? 'La comparaison au marché se fait sur la cote de clôture, après la course.'
                    : course.cotee
                      ? 'Aucune cote relevée pour ce partant.'
                      : 'Réunion sans cote : pas de comparaison au marché.'}
            </span>
          </div>
        </section>

        {historique && <EvolutionCote historique={historique} />}

        {fiche && (
          <>
            <Musique fiche={fiche} />
            <Carriere fiche={fiche} />
            <DernieresCourses fiche={fiche} />
          </>
        )}

        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="text-[0.9375rem] lg:text-[0.9375rem] font-bold">Sa place dans le peloton</h3>
            <p className="text-xs lg:text-[0.8125rem] font-medium text-faint">
              Tous les partants, à l’échelle du meilleur d’entre eux.
            </p>
          </div>
          <div>
            {course.liste.map((x) => {
              const courant = x.numero === p.numero
              const contenu = (
                <>
                  <span className={`num text-sm font-extrabold ${x.rang != null && x.rang <= 3 && !x.nonPartant ? 'text-accent' : 'text-dim'}`}>
                    {x.nonPartant || x.rang == null ? '—' : x.rang}
                  </span>
                  <span className="num w-8 h-8 rounded-[9px] bg-raised border border-line-strong grid place-items-center text-[0.8125rem] font-bold">
                    {x.numero}
                  </span>
                  <span className="min-w-0 flex flex-col gap-1.5">
                    <span className={`text-sm truncate ${courant ? 'font-bold' : 'font-semibold'}`}>{x.nom}</span>
                    <BarreProba valeur={x.nonPartant ? null : x.pWin} maximum={maximum} accent={courant} className="!h-1.5" />
                  </span>
                  <span className="num text-sm font-extrabold text-right">{x.nonPartant ? '—' : pourcent(x.pWin)}</span>
                </>
              )
              const classe = `grid grid-cols-[1.125rem_2rem_minmax(0,1fr)_3.25rem] items-center gap-2.5 px-2 py-2.5 border-t border-track rounded-lg ${
                x.nonPartant ? 'opacity-[0.45]' : ''
              }`
              return courant ? (
                <div key={x.numero} className={`${classe} bg-accent-deep`} aria-current="true">
                  {contenu}
                </div>
              ) : (
                <Link
                  key={x.numero}
                  to={lienPartant(course, x)}
                  replace
                  state={state}
                  preventScrollReset
                  className={`${classe} transition-colors hover:bg-surface`}
                >
                  {contenu}
                </Link>
              )
            })}
          </div>
        </section>

        <p className="text-xs text-faint leading-relaxed">
          Profil, origines, entourage et performances : source France Galop. La monte du jour n’est pas connue :
          le jockey indiqué est celui de la dernière course. {NOTE_NON_PARTANTS}
        </p>
      </aside>
    </div>
  )
}
