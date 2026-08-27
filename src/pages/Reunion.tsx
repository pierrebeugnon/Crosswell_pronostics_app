import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowRight, ChevronLeft, MapPinOff } from 'lucide-react'
import type { Reunion as ReunionCourses } from '@/types'
import { SEUIL_ECHANTILLON } from '@/config/app'
import { useDonnees } from '@/data/DonneesContext'
import { chargerReunion } from '@/services/predictions'
import { construireCourses, construireReunions } from '@/lib/aggregate'
import { ambianceDe } from '@/lib/ambiance'
import { dateLongue, hippodrome as formatHippodrome, points, pourcent } from '@/lib/format'
import { bilan } from '@/lib/stats'
import { LigneCourse } from '@/components/course/LigneCourse'
import { Aide } from '@/components/ui/Aide'
import { Chargement } from '@/components/ui/Chargement'
import { Erreur, EtatVide } from '@/components/ui/EtatVide'
import { Stat } from '@/components/ui/Stat'

/**
 * Une recherche à la demande, mémorisée AVEC la clé de réunion qu'elle
 * concerne. Sans cette clé, passer d'une réunion à l'autre afficherait un
 * instant la précédente — ou pire, un « introuvable » hérité de l'ancienne
 * requête.
 */
interface Demande {
  cle: string
  etat: 'chargement' | 'fini' | 'echec'
  reunion: ReunionCourses | null
  message: string | null
}

function FilAriane() {
  return (
    <Link to="/reunions" className="btn-ghost -ml-3">
      <ChevronLeft size={16} aria-hidden />
      Toutes les réunions
    </Link>
  )
}

export default function Reunion() {
  const parametres = useParams<{ date: string; hippodrome: string }>()
  const date = parametres.date ?? ''
  const nom = parametres.hippodrome ? decodeURIComponent(parametres.hippodrome) : ''
  const cle = `${date}|${nom}`

  const { reunions, pret } = useDonnees()
  const [demande, setDemande] = useState<Demande | null>(null)
  const [tentative, setTentative] = useState(0)

  const dansLaFenetre = useMemo(
    () => reunions.find((r) => r.date === date && r.hippodrome === nom) ?? null,
    [reunions, date, nom],
  )

  /**
   * Le contexte ne garde que trente jours. Une réunion plus ancienne doit
   * rester consultable par lien direct : sans ce chargement de repli, toute
   * URL partagée casserait au bout d'un mois, y compris nos propres liens de
   * résultats.
   */
  useEffect(() => {
    if (!pret || dansLaFenetre || !date || !nom) return
    let vivant = true
    setDemande({ cle, etat: 'chargement', reunion: null, message: null })
    chargerReunion(date, nom)
      .then((lignes) => {
        if (!vivant) return
        const trouvees = construireReunions(construireCourses(lignes))
        setDemande({ cle, etat: 'fini', reunion: trouvees[0] ?? null, message: null })
      })
      .catch((e: unknown) => {
        if (!vivant) return
        setDemande({
          cle,
          etat: 'echec',
          reunion: null,
          message: e instanceof Error ? e.message : 'Les pronostics sont momentanément indisponibles.',
        })
      })
    return () => {
      vivant = false
    }
  }, [pret, dansLaFenetre, date, nom, cle, tentative])

  const courante = demande !== null && demande.cle === cle ? demande : null
  const reunion = dansLaFenetre ?? (courante?.etat === 'fini' ? courante.reunion : null)

  if (!reunion) {
    const enChargement =
      Boolean(date) && Boolean(nom) && (courante === null || courante.etat === 'chargement')
    return (
      <div className="space-y-6">
        <FilAriane />
        {courante?.etat === 'echec' && courante.message ? (
          <Erreur message={courante.message} onReessayer={() => setTentative((t) => t + 1)} />
        ) : enChargement ? (
          <Chargement texte="Chargement de la réunion…" />
        ) : (
          <div className="card">
            <h1 className="sr-only">Réunion introuvable</h1>
            <EtatVide
              icone={<MapPinOff size={20} />}
              titre="Réunion introuvable"
              texte="Aucune réunion ne correspond à cette adresse. Elle a peut-être été annulée, ou le lien est incomplet."
              action={
                <Link to="/reunions" className="btn-glass">
                  Voir toutes les réunions
                </Link>
              }
            />
          </div>
        )}
      </div>
    )
  }

  const total = reunion.courses.length
  const { courues, gagnees } = reunion
  const b = bilan(reunion.courses)
  const ambiance = ambianceDe(reunion.hippodrome)

  /**
   * La prochaine course à courir — le point de reprise du fil. Le matin, en
   * revenant sur une réunion entamée, on ne devrait pas avoir à scanner les
   * chips de statut pour retrouver où en est la journée.
   */
  const prochaine =
    courues > 0 && courues < total ? (reunion.courses.find((c) => !c.courue) ?? null) : null

  return (
    <div className="space-y-6">
      <FilAriane />

      {/* La lumière de la piste (voir ambianceDe) : l'en-tête baigne dans les
          halos de son hippodrome, comme la fiche de piste et la page course. */}
      <div className="relative overflow-hidden rounded-3xl -mx-2 px-2 py-2 sm:-mx-3 sm:px-3">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{ background: ambiance.halos }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-6 top-0 h-px"
          style={{ background: ambiance.filet }}
        />
      <header className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="titre-page">{formatHippodrome(reunion.hippodrome)}</h1>
          <p className="text-sm text-muted mt-2 first-letter:uppercase">
            {dateLongue(reunion.date)}
          </p>
          <Link
            to={`/hippodromes/${encodeURIComponent(reunion.hippodrome)}`}
            className="btn-ghost !px-0 mt-2 !h-9"
          >
            Le profil de la piste
            <ArrowRight size={15} aria-hidden />
          </Link>
        </div>

        {courues > 0 ? (
          <div className="card-nest px-5 py-3 flex items-center gap-5 self-start sm:self-auto">
            <div className="text-center">
              <p className="num text-lg font-semibold leading-none">{total}</p>
              <p className="label !text-[0.625rem] mt-1.5">Courses</p>
            </div>
            <span className="w-px h-8 bg-white/10" aria-hidden />
            <div className="text-center">
              <p className="num text-lg font-semibold leading-none">{courues}</p>
              <p className="label !text-[0.625rem] mt-1.5">Courues</p>
            </div>
            <span className="w-px h-8 bg-white/10" aria-hidden />
            <div className="text-center">
              <p
                className={`num text-lg font-semibold leading-none ${
                  gagnees > 0 ? 'text-win' : 'text-muted'
                }`}
              >
                {gagnees}
              </p>
              <p className="label !text-[0.625rem] mt-1.5">Gagnées</p>
            </div>
          </div>
        ) : (
          <span className="chip-wait self-start sm:self-auto">
            Pronostics publiés, arrivées à venir
          </span>
        )}
      </header>
      </div>

      {courues > 0 && (
        <section aria-label="Bilan de la réunion" className="space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat
              libelle="Courses jugées"
              valeur={b.jugees}
              unite={`/ ${total}`}
              precision={total > b.jugees ? 'arrivées partielles' : 'réunion terminée'}
            />
            <Stat
              accent
              libelle="Victoires du rang 1"
              valeur={b.gagnees}
              unite={`/ ${b.jugees}`}
              precision={pourcent(b.tauxVictoire)}
            />
            <Stat
              libelle="Dans les trois"
              valeur={b.placees}
              unite={`/ ${b.jugees}`}
              precision={pourcent(b.tauxPlace)}
            />
            <Stat
              libelle="Nos trois dans l'arrivée"
              valeur={points(b.tauxTrio * 100)}
              note={
                <span className="inline-flex items-center gap-1.5">
                  Nos trois dans l'arrivée
                  <Aide>
                    Sur chaque course jugée, on compte combien de nos trois premiers se
                    retrouvent dans l'arrivée à trois, puis on en fait la moyenne sur les{' '}
                    {b.jugees} course{b.jugees > 1 ? 's' : ''} jugée{b.jugees > 1 ? 's' : ''} de la
                    réunion. 100 % voudrait dire : le trio exact, à chaque course.
                  </Aide>
                </span>
              }
            />
          </div>

          {/* Une réunion, c'est huit courses au plus : afficher ces taux sans dire
              qu'ils ne mesurent rien serait leur prêter une autorité qu'ils n'ont pas. */}
          <p className="text-xs text-faint leading-relaxed">
            Ces taux portent sur <span className="num">{b.jugees}</span> course
            {b.jugees > 1 ? 's' : ''} : bien trop peu pour juger le modèle. Le bilan sur au moins{' '}
            <span className="num">{SEUIL_ECHANTILLON}</span> courses, intervalles de confiance et
            comparaison au marché comprise, est sur{' '}
            <Link to="/resultats" className="link">
              Nos résultats
            </Link>
            .
          </p>
        </section>
      )}

      <section className="card overflow-hidden">
        <header className="px-5 py-3 border-b border-white/[0.07] flex items-center justify-between gap-3">
          <h2 className="label">Programme</h2>
          {prochaine && (
            <Link
              to={`/courses/${prochaine.date}/${encodeURIComponent(prochaine.hippodrome)}/${prochaine.numero}`}
              className="tap num text-xs font-medium text-accent hover:underline underline-offset-4"
            >
              Prochaine course — n° {prochaine.numero}
              <ArrowRight size={13} className="inline ml-1 -mt-0.5" aria-hidden />
            </Link>
          )}
        </header>
        <div className="hairline-y">
          {reunion.courses.map((course, i) => (
            <div
              key={course.cle}
              className="animate-fade-up"
              style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}
            >
              {/* Le repère de reprise : la frontière courues / à venir, marquée
                  dans le fil au lieu d'être laissée à la déduction. */}
              {prochaine?.cle === course.cle && (
                <p
                  className="flex items-center gap-3 px-5 pt-3 pb-1 label !text-accent !normal-case
                             !tracking-normal !text-[0.6875rem]"
                >
                  <span className="h-px flex-1 bg-accent/25" aria-hidden />
                  Reprise — course {course.numero}
                  <span className="h-px flex-1 bg-accent/25" aria-hidden />
                </p>
              )}
              <LigneCourse course={course} />
            </div>
          ))}
        </div>
      </section>

      <p className="text-xs text-faint leading-relaxed">
        Les probabilités sont calculées la veille au soir, sur les partants déclarés à cette
        heure-là. Un non-partant de dernière minute n'y est pas reflété : la course réelle compte
        alors un cheval de moins que celle que le modèle a évaluée, et les probabilités affichées
        restent celles du champ initial.
      </p>
    </div>
  )
}
