import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { CalendarClock, History, Info, SearchX } from 'lucide-react'
import type { Course } from '@/types'
import { NOTE_NON_PARTANTS, RYTHME_PUBLICATION, RYTHME_PUBLICATION_COURT } from '@/config/app'
import { useDonnees } from '@/data/DonneesContext'
import { chargerCourse } from '@/services/predictions'
import { cleCourse, construireCourses } from '@/lib/aggregate'
import { jourDemande, jourParDefaut, reunionsDuJour } from '@/lib/avancee'
import { dateLongue, decalerJour } from '@/lib/format'
import { courseParDefaut, coursesDuJour, lienCourse } from '@/lib/programme'
import { useHeureParis } from '@/lib/useHeureParis'
import { Erreur, EtatVide } from '@/components/ui/EtatVide'
import { BasculeJour, type Jour } from '@/components/courses/BasculeJour'
import { Programme, RubanCourses } from '@/components/courses/Programme'
import { EnTeteCourse } from '@/components/courses/EnTeteCourse'
import { ArriveePredite } from '@/components/courses/ArriveePredite'
import { FaceArrivee } from '@/components/courses/FaceArrivee'
import { ListePartants } from '@/components/courses/ListePartants'
import { FicheCheval } from '@/components/courses/FicheCheval'
import { MouvementsCote, useCotes } from '@/components/courses/EvolutionCote'
import { BandeauGratuit, CartePass } from '@/components/acces/Verrou'
import { useAcces } from '@/auth/AccesContext'
import { courseOfferte } from '@/lib/acces'
import {
  BarreComparateur,
  Comparateur,
  useComparaison,
  type Comparaison,
} from '@/components/courses/Comparateur'

/**
 * La course demandée par l'adresse : d'abord dans la fenêtre partagée (trente
 * jours et demain), sinon par une requête dédiée — un lien plus ancien, gardé
 * en favori ou envoyé par un autre client, doit s'ouvrir quand même.
 */
function useCourse(date: string, hippodrome: string, numero: number, actif: boolean) {
  const { courses, pret } = useDonnees()
  const valide = actif && Number.isInteger(numero)

  const dansLaFenetre = useMemo(
    () =>
      valide
        ? (courses.find((c) => c.date === date && c.hippodrome === hippodrome && c.numero === numero) ?? null)
        : null,
    [courses, date, hippodrome, numero, valide],
  )

  const [aLaDemande, setALaDemande] = useState<Course | null>(null)
  // Vrai au départ : sans quoi la page clignoterait sur « introuvable » le
  // temps que l'effet de chargement démarre.
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [essai, setEssai] = useState(0)

  useEffect(() => {
    if (!valide || dansLaFenetre || !pret) return
    let annule = false
    setChargement(true)
    setErreur(null)
    chargerCourse(date, hippodrome, numero)
      .then((lignes) => {
        // Par CLÉ, jamais `lot[0]` : la démonstration renvoie tout son jeu.
        if (!annule) setALaDemande(construireCourses(lignes).find((c) => c.cle === cleCourse(date, hippodrome, numero)) ?? null)
      })
      .catch((e: unknown) => {
        if (!annule) setErreur(e instanceof Error ? e.message : 'Erreur inconnue')
      })
      .finally(() => {
        if (!annule) setChargement(false)
      })
    return () => {
      annule = true
    }
  }, [date, hippodrome, numero, valide, dansLaFenetre, pret, essai])

  return {
    course: dansLaFenetre ?? aLaDemande,
    valide,
    chargement: !pret || (chargement && !dansLaFenetre),
    erreur,
    reessayer: () => setEssai((n) => n + 1),
  }
}

/**
 * L'avis de non-partant, en tête de course. Il dit ce qui s'est passé ET ce
 * que cela change : les pourcentages ne sont PAS recalculés après un retrait
 * (la maquette annonce le contraire ; ce n'est pas ce que fait le pipeline).
 */
function AvisNonPartant({ course }: { course: Course }) {
  const retires = course.liste.filter((p) => p.nonPartant)
  if (retires.length === 0) return null
  const r = course.favoriRetire
  const liste = retires.map((p) => `n°${p.numero} ${p.nom}`).join(', ')

  return (
    <div role="status" className="flex items-start gap-3 px-4 py-3.5 rounded-xl bg-accent/[0.06] border border-accent/35">
      <Info size={20} className="text-accent shrink-0 mt-px" aria-hidden />
      <span className="flex flex-col gap-[3px]">
        <span className="text-sm font-extrabold">
          {retires.length > 1 ? `${retires.length} non-partants` : 'Un non-partant'}
        </span>
        <span className="text-xs lg:text-[0.8125rem] font-medium leading-normal text-soft">
          {r
            ? `Notre 1er prédit, le n°${r.numero} ${r.nom}, ${
                course.courue
                  ? 'n’a pas couru : la course est jugée sur le cheval suivant de notre classement.'
                  : 'ne court pas : sa place revient au cheval suivant de notre classement.'
              }`
            : retires.length > 1
              ? `Les ${liste} ont été déclarés non-partants.`
              : `Le ${liste} a été déclaré non-partant.`}{' '}
          Les pourcentages affichés restent ceux du calcul initial.
        </span>
      </span>
    </div>
  )
}

/** Le panneau d'un jour sans course : la carte « en attente » de la maquette. */
function JourVide({ demain }: { demain: boolean }) {
  return (
    <section className="flex flex-col gap-5 p-5 lg:p-8 rounded-3xl bg-surface border border-line">
      <div className="flex items-start gap-4">
        <span className="shrink-0 w-12 h-12 rounded-xl bg-accent/[0.12] grid place-items-center text-accent" aria-hidden>
          <CalendarClock size={24} />
        </span>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[1.125rem] lg:text-[1.3125rem] font-extrabold tracking-[-0.01em]">
            {demain ? 'Les pronostics de demain ne sont pas encore publiés' : 'Aucune course aujourd’hui'}
          </h2>
          <p className="max-w-[38.75rem] text-[0.8125rem] lg:text-[0.9375rem] font-medium leading-relaxed text-muted">
            {RYTHME_PUBLICATION_COURT}
          </p>
        </div>
      </div>
    </section>
  )
}

function Introuvable() {
  return (
    <div className="card">
      <EtatVide
        icone={<SearchX size={20} />}
        titre="Course introuvable"
        texte="Cette course n'existe pas dans nos pronostics, ou son adresse est incomplète."
        action={
          <Link to="/courses" className="btn-glass">
            Voir les courses du jour
          </Link>
        }
      />
    </div>
  )
}

function Squelette() {
  return (
    <div className="flex flex-col gap-6 lg:gap-9" aria-busy="true" aria-label="Chargement de la course">
      <div className="flex flex-col gap-3">
        <div className="skeleton h-4 w-48" />
        <div className="skeleton h-10 w-80 max-w-full" />
        <div className="skeleton h-8 w-64" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="skeleton h-40 rounded-2xl last:hidden lg:last:block" />
        ))}
      </div>
      <div className="skeleton h-96 rounded-2xl" />
    </div>
  )
}

function DetailCourse({
  course,
  comparaison,
  offerte,
}: {
  course: Course
  comparaison: Comparaison
  /** Formule Gratuit : la course offerte du jour, proposée depuis la carte « Pass ». */
  offerte: Course | null
}) {
  const { historiques, dernier } = useCotes(course)
  // Pronostic réservé aux Pass : la base n'en a rien donné (`db/007`).
  if (course.verrouillee) {
    return (
      <div className="flex flex-col gap-6 lg:gap-9">
        <EnTeteCourse course={course} />
        <CartePass offerte={offerte && offerte.cle !== course.cle ? offerte : null} />
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-6 lg:gap-9">
      <EnTeteCourse course={course} />
      <AvisNonPartant course={course} />
      {course.courue ? <FaceArrivee course={course} /> : <ArriveePredite course={course} />}
      <ListePartants course={course} historiques={historiques} dernieres={dernier} comparaison={comparaison} />
      {historiques.size > 0 && <MouvementsCote course={course} historiques={historiques} />}
      {/* Les textes de `config/app`, repris tels quels : une formulation propre
          à cette page finirait par contredire l'accueil et Méthode. */}
      <p className="text-xs text-faint leading-relaxed max-w-prose">
        {RYTHME_PUBLICATION} Les probabilités portent sur les partants connus au moment du calcul et ne
        sont pas recalculées après un retrait. {NOTE_NON_PARTANTS} Les cotes affichées sont les cotes de
        clôture relevées après la course lorsqu'elles existent — elles décrivent le marché tel qu'il a
        fermé et ne servent qu'à évaluer nos probabilités après coup.
      </p>
    </div>
  )
}

/**
 * COURSES — l'écran principal de la maquette (`design/screens/Main.dc.html`).
 *
 * Grand écran : le programme du jour en colonne à gauche, la course choisie à
 * droite. Téléphone : la bascule de jour, un ruban de courses, puis la course.
 *
 * La course affichée vit dans l'ADRESSE (`/courses/:date/:hippodrome/:numero`),
 * pas dans un état : un lien se partage, le retour arrière revient à la course
 * précédente. `/courses` seul — ou `/courses?jour=AAAA-MM-JJ` après un clic
 * sur la bascule — ouvre la prochaine course à partir du jour.
 */
export default function Courses() {
  const params = useParams()
  const navigate = useNavigate()
  const { state } = useLocation()
  const [recherche] = useSearchParams()
  const maintenant = useHeureParis()
  const { reunions, pret, erreur, rafraichir } = useDonnees()

  const aujourdhui = maintenant.jour
  const demain = decalerJour(aujourdhui, 1)

  const avecCourse = params.numero != null
  const date = params.date ?? ''
  const hippodrome = decodeURIComponent(params.hippodrome ?? '')
  const { course, valide, chargement, erreur: erreurCourse, reessayer } = useCourse(
    date,
    hippodrome,
    Number(params.numero),
    avecCourse,
  )

  const jour = avecCourse ? date : (jourDemande(recherche.get('jour')) ?? jourParDefaut(reunions, aujourdhui, demain))
  const reunionsJour = useMemo(() => reunionsDuJour(reunions, jour), [reunions, jour])
  const nbCourses = useMemo(() => coursesDuJour(reunions, jour).length, [reunions, jour])
  const actif: Jour | null = jour === aujourdhui ? 'aujourdhui' : jour === demain ? 'demain' : null

  // La fiche d'un partant (`/courses/…/partants/:cheval`), posée sur la course.
  const numeroCheval = params.cheval != null ? Number(params.cheval) : null
  const partant = course && numeroCheval != null ? (course.liste.find((p) => p.numero === numeroCheval) ?? null) : null
  const ouverteDepuisLaCourse = Boolean((state as { depuisLaCourse?: boolean } | null)?.depuisLaCourse)
  const fermerFiche = useCallback(() => {
    if (!course) return
    if (ouverteDepuisLaCourse) navigate(-1)
    else navigate(lienCourse(course), { replace: true, preventScrollReset: true })
  }, [course, ouverteDepuisLaCourse, navigate])

  // Le comparateur : sa sélection suit la course affichée.
  const comparaison = useComparaison(course)

  // Formule Gratuit : la course offerte du jour affiché, et le bandeau.
  const { complet } = useAcces()
  const offerte = useMemo(() => (complet ? null : courseOfferte(coursesDuJour(reunions, jour))), [complet, reunions, jour])

  // Un numéro de cheval absent de la course : on revient à la course seule.
  if (course && numeroCheval != null && !partant) return <Navigate to={lienCourse(course)} replace />

  // Sans course dans l'adresse : ouvrir la prochaine course du jour.
  const parDefaut = !avecCourse && pret ? courseParDefaut(coursesDuJour(reunions, jour), maintenant) : null
  if (parDefaut) return <Navigate to={lienCourse(parDefaut)} replace />

  const choisirJour = (j: Jour) => navigate(`/courses?jour=${j === 'aujourdhui' ? aujourdhui : demain}`)
  const titreProgramme = actif ? 'Programme' : `Programme du ${dateLongue(jour)}`

  let detail
  if (erreur) detail = <Erreur message={erreur} onReessayer={rafraichir} />
  else if (!avecCourse) detail = pret ? <JourVide demain={jour === demain} /> : <Squelette />
  else if (course) detail = <DetailCourse course={course} comparaison={comparaison} offerte={offerte} />
  else if (valide && chargement) detail = <Squelette />
  else if (erreurCourse) detail = <Erreur message={erreurCourse} onReessayer={reessayer} />
  else detail = <Introuvable />

  return (
    <div className="lg:grid lg:grid-cols-[23.75rem_minmax(0,1fr)] lg:-mt-8">
      <aside
        aria-label="Programme"
        className="hidden lg:flex flex-col gap-7 py-7 pr-6 border-r border-sep sticky top-[4.8125rem] h-[calc(100dvh-4.8125rem)] overflow-y-auto [scrollbar-width:thin]"
      >
        <BasculeJour actif={actif} onChoisir={choisirJour} />
        {!complet && <BandeauGratuit offerte={offerte} />}
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-faint">{titreProgramme}</h2>
          {nbCourses > 0 && (
            <span className="num text-[0.8125rem] font-medium text-faint shrink-0">{nbCourses} courses</span>
          )}
        </div>
        {!pret ? (
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="skeleton h-[4.125rem] rounded-xl" />
            ))}
          </div>
        ) : reunionsJour.length > 0 ? (
          <Programme reunions={reunionsJour} choisie={course?.cle ?? null} maintenant={maintenant} offerte={offerte?.cle ?? null} />
        ) : (
          <p className="text-sm text-muted">Aucune course au programme ce jour-là.</p>
        )}
        <Link
          to="/reunions"
          className="mt-auto inline-flex items-center gap-2 text-[0.8125rem] font-bold text-muted hover:text-accent"
        >
          <History size={16} aria-hidden />
          Réunions des jours passés
        </Link>
      </aside>

      <div className="min-w-0 lg:pl-10 lg:pt-8">
        {/* Téléphone : la bascule et le ruban restent collés sous l'en-tête, comme
            dans la maquette mobile — au bas d'une longue liste de partants, on
            passe à la course suivante sans remonter. */}
        <div className="lg:hidden sticky top-16 z-30 -mx-5 px-5 -mt-6 pt-4 pb-3 mb-6 flex flex-col gap-3 bg-canvas border-b border-sep">
          <BasculeJour actif={actif} onChoisir={choisirJour} />
          {pret && reunionsJour.length > 0 && (
            <RubanCourses reunions={reunionsJour} choisie={course?.cle ?? null} offerte={offerte?.cle ?? null} className="-mx-5 px-5 pb-1" />
          )}
          {!actif && <p className="text-[0.8125rem] font-semibold text-faint">{titreProgramme}</p>}
        </div>
        {!complet && <BandeauGratuit className="lg:hidden mb-6" offerte={offerte} />}
        {detail}
        {/* Collée en bas de l'écran tant que la colonne défile, puis posée
            sous la liste : elle ne masque jamais le dernier partant. */}
        {course && !partant && <BarreComparateur course={course} comparaison={comparaison} />}
      </div>
      {course && partant && (
        <FicheCheval course={course} partant={partant} onFermer={fermerFiche} comparaison={comparaison} />
      )}
      {course && !partant && comparaison.ouvert && <Comparateur course={course} comparaison={comparaison} />}
    </div>
  )
}
