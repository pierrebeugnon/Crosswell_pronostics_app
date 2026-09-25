import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AVERTISSEMENT, DATE_CORRECTION_MESURE, SEUIL_ECHANTILLON, SEUIL_TRANCHE } from '@/config/app'
import type { LignePrediction } from '@/types'
import { chargerHistorique } from '@/services/predictions'
import { construireCourses } from '@/lib/aggregate'
import { calibration } from '@/lib/stats'
import { MOIS_LONG, dateCourte, hippodrome as formatHippodrome, pourcent } from '@/lib/format'
import { useEffacerParametres, useParametreUrl } from '@/lib/useParametreUrl'
import {
  DEFINITION_INDICATEUR,
  INDICATEURS,
  JOURS_SEMAINE,
  NIVEAUX_CONFIANCE,
  TRANCHES_DISTANCE,
  TYPES,
  anneesDisponibles,
  axes,
  decoupage,
  dernieres,
  etendue,
  filtrer,
  hasard,
  parMois,
  pistesLesPlusCourues,
  taux,
  type FiltresResultats,
  type Indicateur,
  type LigneDecoupage,
} from '@/lib/resultats'
import { Erreur } from '@/components/ui/EtatVide'
import { BasculeIndicateur, Filtres, type DefinitionFiltre } from '@/components/resultats/Commandes'
import { LignesBarres, Panneau, type LigneBarre } from '@/components/resultats/Panneaux'
import { GraphiqueMois } from '@/components/resultats/GraphiqueMois'
import { DernieresCourses } from '@/components/resultats/DernieresCourses'

const CLES_FILTRES = ['annee', 'mois', 'jour', 'type', 'distance', 'piste'] as const
const index = (n: number) => Array.from({ length: n }, (_, i) => String(i))
const capitale = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const nombre = (n: number) => n.toLocaleString('fr-FR')
const courses_ = (n: number) => `${nombre(n)} course${n > 1 ? 's' : ''}`

/** « Au hasard » — ce que dit la tuile, selon l'indicateur choisi. */
const SOUS_TITRE_HASARD: Record<Indicateur, string> = {
  gagnant: 'un cheval tiré au sort gagne',
  place: 'un cheval tiré au sort finit dans les 3',
  top3: 'un trio tiré au sort est le bon',
}

/** Des lignes de découpage aux lignes à barre : échelle commune, moyenne en pointillés. */
function versBarres(lignes: LigneDecoupage[], moyenne: number): LigneBarre[] {
  const echelle = Math.max(0.05, moyenne, ...lignes.map((l) => l.taux)) * 1.1
  return lignes.map((l) => ({
    libelle: l.libelle,
    valeur: pourcent(l.taux),
    complement: courses_(l.n),
    part: l.taux / echelle,
    repere: moyenne / echelle,
  }))
}

function Squelette() {
  return (
    <div className="flex flex-col gap-4" role="status" aria-busy="true" aria-label="Chargement de l'historique">
      <div className="skeleton h-24 rounded-[1.125rem]" />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="skeleton h-28 rounded-[1.125rem]" />
        ))}
      </div>
      <div className="skeleton h-96 rounded-[1.25rem]" />
    </div>
  )
}

/**
 * « NOS RÉSULTATS » — `design/screens/Results.dc.html`.
 *
 * Toutes les courses jugées, filtrables par année, mois, jour, type, distance
 * et hippodrome, lues selon un indicateur (gagnant, placé, top 3). Filtres et
 * indicateur vivent dans l'adresse : une vue se partage et survit au retour.
 *
 * Deux écarts voulus à la maquette (design/INTEGRATION.md) : la tuile « ROI »
 * cède la place au repère du hasard — le vocabulaire du rendement est banni
 * (config/app.ts) —, et un panneau « Fiabilité des pourcentages » garde la
 * preuve que nos probabilités disent ce qu'elles annoncent.
 *
 * LE PASSÉ JUGÉ EST OUVERT À TOUS : le jour où les formules verrouilleront
 * l'avenir, rien ne se verrouillera ici.
 */
export default function Resultats() {
  const [lignes, setLignes] = useState<LignePrediction[]>([])
  const [tronque, setTronque] = useState(false)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [tentative, setTentative] = useState(0)

  // L'historique est chargé une fois ; chaque filtre n'en est qu'une vue.
  useEffect(() => {
    let vivant = true
    setChargement(true)
    setErreur(null)
    chargerHistorique()
      .then((r) => {
        if (!vivant) return
        setLignes(r.lignes)
        setTronque(r.tronque)
        setChargement(false)
      })
      .catch((e: unknown) => {
        if (!vivant) return
        setErreur(e instanceof Error ? e.message : "L'historique n'a pas pu être chargé.")
        setChargement(false)
      })
    return () => {
      vivant = false
    }
  }, [tentative])

  // Un chargement tronqué coupe sa plus ancienne journée : on l'écarte entière.
  const plusAncienne = useMemo(
    () => (lignes.length ? lignes.reduce((m, l) => (l.reunion_date < m ? l.reunion_date : m), lignes[0].reunion_date) : null),
    [lignes],
  )
  const toutes = useMemo(
    () => construireCourses(tronque && plusAncienne ? lignes.filter((l) => l.reunion_date > plusAncienne) : lignes),
    [lignes, tronque, plusAncienne],
  )

  const annees = useMemo(() => anneesDisponibles(toutes), [toutes])
  const pistes = useMemo(
    () => [...new Set(toutes.map((c) => c.hippodrome))].sort((a, b) => formatHippodrome(a).localeCompare(formatHippodrome(b), 'fr')),
    [toutes],
  )

  const [indicateur, setIndicateur] = useParametreUrl('indicateur', INDICATEURS, 'gagnant')
  const [annee, setAnnee] = useParametreUrl('annee', ['', ...annees], '')
  const [mois, setMois] = useParametreUrl('mois', ['', ...index(12)], '')
  const [jour, setJour] = useParametreUrl('jour', ['', ...index(7)], '')
  const [type, setType] = useParametreUrl<string>('type', ['', ...TYPES], '')
  const [distance, setDistance] = useParametreUrl('distance', ['', ...index(TRANCHES_DISTANCE.length)], '')
  const [piste, setPiste] = useParametreUrl('piste', ['', ...pistes], '')
  const effacer = useEffacerParametres()

  const filtres: FiltresResultats = { annee, mois, jour, type, distance, piste }
  const ecrire: Record<keyof FiltresResultats, (v: string) => void> = {
    annee: setAnnee,
    mois: setMois,
    jour: setJour,
    type: setType,
    distance: setDistance,
    piste: setPiste,
  }
  const actifs = CLES_FILTRES.filter((k) => filtres[k] !== '').length
  const reinitialiser = () => effacer(CLES_FILTRES)

  const definitions: DefinitionFiltre[] = [
    { cle: 'annee', libelle: 'Année', tout: 'Toutes', options: annees.map((a) => ({ valeur: a, libelle: a })) },
    { cle: 'mois', libelle: 'Mois', tout: 'Tous', options: MOIS_LONG.map((m, i) => ({ valeur: String(i), libelle: capitale(m) })) },
    { cle: 'jour', libelle: 'Jour', tout: 'Tous', options: JOURS_SEMAINE.map((j, i) => ({ valeur: String(i), libelle: j })) },
    { cle: 'type', libelle: 'Type de course', tout: 'Tous', options: TYPES.map((t) => ({ valeur: t, libelle: t })) },
    { cle: 'distance', libelle: 'Distance', tout: 'Toutes', options: TRANCHES_DISTANCE.map((d, i) => ({ valeur: String(i), libelle: d })) },
    { cle: 'piste', libelle: 'Hippodrome', tout: 'Tous', options: pistes.map((p) => ({ valeur: p, libelle: formatHippodrome(p) })) },
  ]

  const courses = useMemo(
    () => filtrer(toutes, { annee, mois, jour, type, distance, piste }),
    [toutes, annee, mois, jour, type, distance, piste],
  )
  const jugees = useMemo(() => courses.filter((c) => c.courue).length, [courses])
  const moyenne = useMemo(() => taux(courses, indicateur), [courses, indicateur])
  const serie = useMemo(() => parMois(courses, indicateur), [courses, indicateur])
  const recentes = useMemo(() => dernieres(courses), [courses])
  const topPistes = useMemo(() => pistesLesPlusCourues(courses), [courses])
  const tranches = useMemo(() => calibration(courses), [courses])

  const def = DEFINITION_INDICATEUR[indicateur]
  const legende = `Pointillés : moyenne de la sélection (${pourcent(moyenne, 1)})`
  const barres = (axe: (c: (typeof courses)[number]) => string | null, ordre: readonly string[]) =>
    versBarres(decoupage(courses, indicateur, axe, ordre), moyenne)

  const tuiles = [
    { cle: 'n', libelle: 'Courses analysées', valeur: nombre(jugees), sous: 'avec un pronostic publié', mobile: false },
    { cle: 'gagnant', libelle: 'Gagnant', valeur: pourcent(taux(courses, 'gagnant'), 1), sous: 'le 1er prédit gagne', mobile: true },
    { cle: 'place', libelle: 'Placé', valeur: pourcent(taux(courses, 'place'), 1), sous: 'le 1er prédit dans le top 3', mobile: true },
    { cle: 'top3', libelle: 'Top 3 désordre', valeur: pourcent(taux(courses, 'top3'), 1), sous: 'trio d’arrivée trouvé', mobile: true },
    { cle: 'hasard', libelle: 'Au hasard', valeur: pourcent(hasard(courses, indicateur), 1), sous: SOUS_TITRE_HASARD[indicateur], mobile: true },
  ]

  const fiabilite: LigneBarre[] = (() => {
    const echelle = Math.max(0.05, ...tranches.flatMap((t) => [t.annonce, t.observe])) * 1.1
    return tranches.map((t) => ({
      libelle: `Annoncé ${t.label}`,
      valeur: `${pourcent(t.observe)} observé`,
      complement: `${nombre(t.n)} partants${t.n < SEUIL_TRANCHE ? ' · échantillon court' : ''}`,
      part: t.observe / echelle,
      repere: t.annonce / echelle,
    }))
  })()

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3.5 lg:gap-6 pb-1">
        <div className="flex flex-col gap-1.5 lg:gap-2">
          <h1 className="text-[1.4375rem] lg:text-[2.3125rem] font-extrabold tracking-[-0.03em] leading-[1.05]">Nos résultats</h1>
          <p className="text-[0.8125rem] lg:text-[0.9375rem] font-medium text-faint">
            Toutes les courses pronostiquées par le modèle, vérifiées après l’arrivée.
            {!chargement && !erreur && <span className="num lg:hidden"> {courses_(jugees)} analysées.</span>}
          </p>
        </div>
        <div className="flex flex-col lg:items-end gap-2">
          <span className="hidden lg:block label">Indicateur</span>
          <BasculeIndicateur valeur={indicateur} onChange={setIndicateur} />
        </div>
      </header>

      {chargement ? (
        <Squelette />
      ) : erreur ? (
        <Erreur message={erreur} onReessayer={() => setTentative((t) => t + 1)} />
      ) : (
        <>
          <Filtres
            definitions={definitions}
            valeurs={filtres}
            onChange={(cle, v) => ecrire[cle](v)}
            onReinitialiser={reinitialiser}
            actifs={actifs}
          />

          {jugees === 0 ? (
            <div className="flex flex-col items-center gap-3 text-center p-7 lg:p-12 rounded-[1.125rem] bg-surface border border-line">
              <p className="text-[0.9375rem] lg:text-[1.0625rem] font-bold">Aucune course ne correspond à ces filtres</p>
              <p className="text-sm text-muted max-w-md">Une course entre dans nos résultats une fois son arrivée relevée.</p>
              {actifs > 0 && (
                <button type="button" className="btn-accent" onClick={reinitialiser}>
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 lg:gap-3">
                {tuiles.map((t) => (
                  <div
                    key={t.cle}
                    className={`${t.mobile ? 'flex' : 'hidden lg:flex'} flex-col gap-1 lg:gap-1.5 p-3.5 lg:p-5 rounded-[1.125rem] bg-surface border min-w-0 ${
                      t.cle === indicateur ? 'border-accent' : 'border-line'
                    }`}
                  >
                    <span className="text-xs lg:text-[0.8125rem] font-semibold text-muted">{t.libelle}</span>
                    <span className="num text-[1.3125rem] lg:text-[1.8125rem] font-extrabold tracking-[-0.02em] leading-[1.1]">
                      {t.valeur}
                    </span>
                    <span className="text-[0.6875rem] lg:text-xs font-medium text-faint">{t.sous}</span>
                  </div>
                ))}
              </div>

              {/* Promis par Méthode (« Les seuils de lecture ») : sous ce seuil, on le dit. */}
              {jugees < SEUIL_ECHANTILLON && (
                <p role="note" className="rounded-xl bg-surface border border-line px-4 py-3 text-[0.8125rem] font-medium text-muted leading-relaxed">
                  <span className="text-ink font-bold">Échantillon court.</span> Moins de {SEUIL_ECHANTILLON} courses
                  jugées avec ces filtres : les taux peuvent bouger de plusieurs points d’une semaine à l’autre.
                </p>
              )}

              <GraphiqueMois
                serie={serie}
                moyenne={moyenne}
                titre={`Taux de réussite ${def.libelle.toLowerCase()} par mois`}
                sousTitre={`${def.long} · ${etendue(serie)}`}
              />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Panneau titre="Par type de course" sousTitre={legende}>
                  <LignesBarres lignes={barres(axes.type, TYPES)} />
                </Panneau>
                <Panneau titre="Par distance" sousTitre={legende}>
                  <LignesBarres lignes={barres(axes.distance, TRANCHES_DISTANCE)} />
                </Panneau>
                <Panneau titre="Par niveau de confiance" sousTitre={legende}>
                  <LignesBarres lignes={barres(axes.confiance, NIVEAUX_CONFIANCE)} />
                </Panneau>
              </div>

              <div className="hidden lg:grid grid-cols-2 gap-4">
                <Panneau titre="Par jour de la semaine" sousTitre={legende}>
                  <LignesBarres lignes={barres(axes.jour, JOURS_SEMAINE)} />
                </Panneau>
                <Panneau titre="Par hippodrome · les 6 plus courus" sousTitre={legende}>
                  <LignesBarres
                    lignes={barres(axes.piste, topPistes).map((l) => ({ ...l, libelle: formatHippodrome(l.libelle) }))}
                  />
                </Panneau>
              </div>

              {fiabilite.length > 0 && (
                <Panneau
                  titre="Fiabilité des pourcentages"
                  sousTitre="Quand le modèle annonce 20 %, le cheval gagne-t-il une fois sur cinq ? Barre : part de gagnants observée · pointillés : pourcentage annoncé."
                >
                  <div className="grid lg:grid-cols-2 gap-x-10">
                    <LignesBarres lignes={fiabilite.slice(0, Math.ceil(fiabilite.length / 2))} />
                    <div className="mt-3.5 lg:mt-0">
                      <LignesBarres lignes={fiabilite.slice(Math.ceil(fiabilite.length / 2))} />
                    </div>
                  </div>
                </Panneau>
              )}

              <DernieresCourses key={JSON.stringify(filtres)} courses={recentes} />
            </>
          )}

          <p className="text-xs text-muted leading-relaxed pt-2">
            {tronque && 'Historique partiel : les courses les plus anciennes ne sont pas toutes chargées. '}
            Mesure mise à jour le {dateCourte(DATE_CORRECTION_MESURE)} {DATE_CORRECTION_MESURE.slice(0, 4)} ·{' '}
            <Link to="/methode#mesure" className="link">
              Méthode
            </Link>{' '}
            · {AVERTISSEMENT.texte}
          </p>
        </>
      )}
    </div>
  )
}
