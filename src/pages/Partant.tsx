import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, Search } from 'lucide-react'
import type { Course, Partant as PartantCourse } from '@/types'
import { cleCourse, construireCourses } from '@/lib/aggregate'
import { chargerCourse } from '@/services/predictions'
import { useDonnees } from '@/data/DonneesContext'
import {
  cote as formatCote,
  dateLongue,
  distance as formatDistance,
  hippodrome as formatHippodrome,
  pourcent,
  rang as formatRang,
  signe,
} from '@/lib/format'
import { Carte, EnTeteCarte } from '@/components/ui/Carte'
import { Dossard } from '@/components/ui/Dossard'
import { Stat } from '@/components/ui/Stat'
import { Aide } from '@/components/ui/Aide'
import { BarreProba } from '@/components/ui/BarreProba'
import { EtiquetteArrivee } from '@/components/ui/Etiquettes'
import { DuelMarche } from '@/components/ui/DuelMarche'
import { EtatVide, Erreur } from '@/components/ui/EtatVide'

function LignePeloton({
  course,
  partant,
  maximum,
  courant,
  delai,
}: {
  course: Course
  partant: PartantCourse
  maximum: number
  courant: boolean
  delai: number
}) {
  const contenu = (
    <>
      <span
        className={`num w-6 h-6 rounded-lg grid place-items-center text-[0.6875rem] font-bold ${
          partant.rang === 1 ? 'bg-accent text-accent-ink' : 'glass-nest text-faint'
        }`}
      >
        {partant.rang ?? '—'}
      </span>

      <div className="min-w-0">
        <p className={`text-sm truncate ${courant ? 'font-semibold' : 'font-medium'}`}>
          <Dossard numero={partant.numero} className="mr-1.5 -mt-0.5" />
          {partant.nom}
        </p>
        <BarreProba
          valeur={partant.pWin}
          maximum={maximum}
          accent={courant}
          className="mt-2 max-w-[16rem]"
        />
      </div>

      <span className="num text-sm font-semibold text-right">{pourcent(partant.pWin)}</span>
    </>
  )

  const grille =
    'grid grid-cols-[1.75rem_1fr_3.25rem] items-center gap-x-3 px-4 sm:px-5 py-3 border-l-2 animate-fade-up'

  if (courant) {
    return (
      <div
        className={`${grille} border-accent bg-accent/10`}
        style={{ animationDelay: `${delai}ms` }}
        aria-current="true"
      >
        {contenu}
      </div>
    )
  }

  return (
    <Link
      to={`/courses/${course.date}/${encodeURIComponent(course.hippodrome)}/${course.numero}/partants/${partant.numero}`}
      className={`${grille} border-transparent transition-colors hover:bg-white/[0.05] active:bg-white/[0.08]`}
      style={{ animationDelay: `${delai}ms` }}
    >
      {contenu}
    </Link>
  )
}

export default function Partant() {
  const params = useParams()
  const date = params.date ?? ''
  const nomHippodrome = params.hippodrome ?? ''
  const numeroCourse = Number(params.numero)
  const numeroCheval = Number(params.cheval)

  const { courses, pret, erreur: erreurGlobale, rafraichir } = useDonnees()
  const [horsFenetre, setHorsFenetre] = useState<Course | null>(null)
  const [chargementLocal, setChargementLocal] = useState(false)
  const [erreurLocale, setErreurLocale] = useState<string | null>(null)
  const [essai, setEssai] = useState(0)

  const dansLaFenetre = useMemo(
    () => courses.find((c) => c.cle === cleCourse(date, nomHippodrome, numeroCourse)) ?? null,
    [courses, date, nomHippodrome, numeroCourse],
  )

  /**
   * La fenêtre partagée ne couvre que trente jours : une fiche ouverte depuis
   * un lien ancien doit aller chercher sa course elle-même. On attend `pret`
   * pour ne pas doubler la requête du contexte au premier rendu.
   */
  useEffect(() => {
    if (dansLaFenetre || !pret || !Number.isFinite(numeroCourse)) return
    let vivant = true
    setChargementLocal(true)
    chargerCourse(date, nomHippodrome, numeroCourse)
      .then((lignes) => {
        if (!vivant) return
        // Par CLÉ, jamais `[0]` : rien ne garantit que la réponse ne contient
        // que la course demandée (le mode démonstration renvoie tout son jeu),
        // et la première du lot serait une autre course.
        const lot = construireCourses(lignes)
        setHorsFenetre(
          lot.find((c) => c.cle === cleCourse(date, nomHippodrome, numeroCourse)) ?? null,
        )
        setErreurLocale(null)
      })
      .catch((e: unknown) => {
        if (vivant) setErreurLocale(e instanceof Error ? e.message : 'Erreur inconnue')
      })
      .finally(() => {
        if (vivant) setChargementLocal(false)
      })
    return () => {
      vivant = false
    }
  }, [dansLaFenetre, pret, date, nomHippodrome, numeroCourse, essai])

  const course = dansLaFenetre ?? horsFenetre
  const partant = course?.liste.find((p) => p.numero === numeroCheval) ?? null
  const urlCourse = `/courses/${date}/${encodeURIComponent(nomHippodrome)}/${numeroCourse}`

  if (!course && (!pret || chargementLocal)) {
    return (
      // Squelette fidèle : fil d'ariane, en-tête, grille de quatre chiffres,
      // carte de comparaison — la fiche se révèle au lieu d'apparaître.
      <div className="space-y-6" aria-busy="true" aria-label="Chargement du partant">
        <div className="skeleton h-9 w-44 rounded-full" />
        <div className="flex items-center gap-4">
          <div className="skeleton h-14 w-14 rounded-full" />
          <div className="space-y-2.5">
            <div className="skeleton h-9 w-56" />
            <div className="skeleton h-5 w-72 max-w-[60vw]" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="skeleton h-28 rounded-2xl" />
          <div className="skeleton h-28 rounded-2xl" />
          <div className="skeleton h-28 rounded-2xl" />
          <div className="skeleton h-28 rounded-2xl" />
        </div>
        <div className="skeleton h-56 rounded-3xl" />
      </div>
    )
  }

  const messageErreur = erreurLocale ?? erreurGlobale
  if (!course && messageErreur) {
    return (
      <Erreur
        message={messageErreur}
        onReessayer={() => {
          setErreurLocale(null)
          setEssai((n) => n + 1)
          rafraichir()
        }}
      />
    )
  }

  if (!course || !partant) {
    return (
      <div className="card">
        <EtatVide
          icone={<Search size={20} />}
          titre={course ? 'Ce partant est introuvable' : 'Cette course est introuvable'}
          texte={
            course
              ? "Aucun cheval ne porte ce numéro dans la course. La composition a pu changer depuis l'envoi du lien."
              : "Nous n'avons pas de pronostic pour cette course : elle est hors de notre périmètre, ou l'adresse est incomplète."
          }
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              {course && (
                <Link to={urlCourse} className="btn-glass">
                  Voir la course
                </Link>
              )}
              <Link to="/reunions" className={course ? 'btn-ghost' : 'btn-glass'}>
                Toutes les réunions
              </Link>
            </div>
          }
        />
      </div>
    )
  }

  const nomCourse = course.nom ?? `Course ${course.numero}`
  const nbPartants = course.partants ?? course.liste.length
  const notreChoix = partant.rang === 1
  const arrivee = partant.arrivee
  const pMarche = partant.pMarche
  const ecart = partant.ecartMarche
  const maximum = Math.max(...course.liste.map((p) => p.pWin ?? 0), 0.0001)

  return (
    <div className="space-y-5 sm:space-y-6">
      <Link to={urlCourse} className="btn-ghost -ml-3 max-w-full">
        <ChevronLeft size={16} aria-hidden />
        <span className="truncate">{nomCourse}</span>
      </Link>

      <header className="animate-fade-up">
        <div className="flex items-start gap-4">
          <div
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full grid place-items-center shrink-0 ${
              notreChoix ? 'card-accent text-accent halo-accent' : 'glass-nest text-muted'
            }`}
          >
            <span className="num text-xl sm:text-2xl font-bold">
              <span className="sr-only">Numéro </span>
              {partant.numero}
            </span>
          </div>

          <div className="min-w-0">
            <p className="text-xs text-faint">{dateLongue(course.date)}</p>
            <h1 className="titre-page mt-1 break-words">{partant.nom}</h1>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {partant.rang != null ? (
            <span className={notreChoix ? 'chip-accent' : 'chip-neutral'}>
              Notre rang <span className="num">{partant.rang}</span>
            </span>
          ) : (
            <span className="chip-wait">Non classé par le modèle</span>
          )}
          <span className="chip-neutral">{formatHippodrome(course.hippodrome)}</span>
          <span className="chip-neutral">
            Course <span className="num">{course.numero}</span>
          </span>
          {course.distance != null && (
            <span className="chip-neutral num">{formatDistance(course.distance)}</span>
          )}
          {course.courue && <EtiquetteArrivee place={arrivee} />}
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          libelle="Probabilité de victoire"
          valeur={pourcent(partant.pWin)}
          accent={notreChoix}
          note={notreChoix ? 'Notre premier choix sur cette course' : undefined}
        />
        <Stat
          libelle="Probabilité d'être placé"
          valeur={pourcent(partant.pPlace)}
          note={
            <span className="inline-flex items-center gap-1.5">
              Dans les trois premiers
              <Aide>
                Nous appelons « placé » une arrivée dans les trois premiers, quelle que soit la
                taille du peloton. C'est notre convention de mesure, appliquée uniformément à
                toutes les courses pour que les taux restent comparables.
              </Aide>
            </span>
          }
        />
        <Stat
          libelle="Cote"
          valeur={formatCote(partant.cote)}
          note={
            partant.cote == null
              ? course.cotee
                ? 'Aucune cote pour ce partant'
                : 'Réunion non cotée'
              : undefined
          }
        />
        <Stat
          libelle="Rang du modèle"
          valeur={formatRang(partant.rang)}
          precision={`sur ${nbPartants} partants`}
        />
      </div>

      {pMarche != null && (
        <Carte className="animate-fade-up">
          <EnTeteCarte
            titre="Nous face au marché"
            aide="Notre probabilité, comparée à celle que la cote laisse entendre."
          />

          <DuelMarche pNous={partant.pWin} pMarche={pMarche} decimales={1} />

          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="label">Écart</span>
            <span
              className={`num text-lg font-semibold ${
                ecart == null ? 'text-faint' : ecart > 0 ? 'text-win' : 'text-loss'
              }`}
            >
              {ecart == null ? '—' : `${signe(ecart)} pt`}
            </span>
            {partant.value && <span className="chip-win">Écart significatif</span>}
          </div>

          <p className="mt-4 text-sm text-muted leading-relaxed max-w-prose">
            La probabilité du marché est déduite de la cote, après retrait de la marge de
            l'opérateur — environ 20 % — et renormalisation sur l'ensemble des partants. Un écart
            positif signifie que nous estimons ce cheval meilleur que ne le fait le public :
            c'est là que notre analyse s'éloigne le plus du consensus. Un écart n'est pas pour
            autant une certitude — sur une course donnée, c'est peut-être notre estimation qui se
            trompe, et non celle du marché.
          </p>
        </Carte>
      )}

      <section className="card overflow-hidden">
        <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4">
          <h2 className="text-[0.95rem] font-semibold tracking-tight">Sa place dans le peloton</h2>
          <p className="text-xs text-faint mt-1.5 leading-relaxed max-w-prose">
            Tous les partants de la course, à l'échelle du meilleur d'entre eux. Vous voyez d'un
            coup d'œil si ce cheval se détache, s'il tient dans un mouchoir avec les autres, ou
            s'il est distancé.
          </p>
        </div>
        <div className="hairline-y border-t border-white/[0.07]">
          {course.liste.map((p, i) => (
            <LignePeloton
              key={p.numero}
              course={course}
              partant={p}
              maximum={maximum}
              courant={p.numero === partant.numero}
              delai={i * 18}
            />
          ))}
        </div>
      </section>

      {course.courue && (
        <Carte className="animate-fade-up">
          <EnTeteCarte titre="Résultat" />

          {arrivee == null ? (
            <p className="text-sm text-muted leading-relaxed max-w-prose">
              Ce cheval n'apparaît pas dans l'arrivée officielle : non-partant, ou non classé.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="card-nest p-4">
                <div className="label">Arrivée</div>
                <div className="num mt-2 text-2xl font-bold leading-none">
                  {formatRang(arrivee)}
                </div>
                <p className="text-xs text-muted mt-2">sur {nbPartants} partants</p>
              </div>

              {partant.cote != null && (
                <div className="card-nest p-4">
                  <div className="label">Cote de clôture</div>
                  <div className="num mt-2 text-2xl font-bold leading-none">
                    {formatCote(partant.cote)}
                  </div>
                  <p className="text-xs text-muted mt-2">relevée après la course</p>
                </div>
              )}

              {partant.pMarche != null && (
                <div className="card-nest p-4">
                  <div className="label">Avis du public</div>
                  <div className="num mt-2 text-2xl font-bold leading-none">
                    {pourcent(partant.pMarche)}
                  </div>
                  <p className="text-xs text-muted mt-2">
                    contre <span className="num">{pourcent(partant.pWin)}</span> pour nous
                  </p>
                </div>
              )}
            </div>
          )}

          {arrivee != null && partant.cote == null && (
            <p className="mt-4 text-xs text-faint leading-relaxed">
              Aucune cote n'est connue pour cette course : deux réunions sur trois ne sont pas
              cotées dans nos données.
            </p>
          )}
        </Carte>
      )}

      <p className="text-xs text-faint leading-relaxed max-w-prose">
        Cette fiche repose sur les seules données de prédiction et sur la course elle-même. Nous ne
        publions pas la forme détaillée des chevaux, ni leur jockey, leur entraînement ou leurs
        origines.
      </p>
    </div>
  )
}
