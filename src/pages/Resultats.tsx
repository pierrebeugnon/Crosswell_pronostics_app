import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, Award, CalendarDays, Info, Scale, Target, Trophy } from 'lucide-react'
import { SEUIL_ECHANTILLON } from '@/config/app'
import { chargerHistorique } from '@/services/predictions'
import { construireCourses, trancheCote, trancheDistance, tranchePeloton } from '@/lib/aggregate'
import { bilan, calibration, faceAuMarche, parJour, parSegment, wilson } from '@/lib/stats'
import { dateLongue, jourISO, points, pourcent } from '@/lib/format'
import { Carte, EnTeteCarte } from '@/components/ui/Carte'
import { SqueletteStats } from '@/components/ui/Chargement'
import { Erreur, EtatVide } from '@/components/ui/EtatVide'
import { Jauge } from '@/components/ui/Jauge'
import { Segmente } from '@/components/ui/Segmente'
import type { Option } from '@/components/ui/Segmente'
import { Stat } from '@/components/ui/Stat'
import { BarresSegment, CourbeCalibration, CourbeTaux } from '@/components/stats/Graphiques'
import type { LignePrediction } from '@/types'

type Periode = '7' | '30' | 'tout'
type Axe = 'type' | 'distance' | 'peloton' | 'cote'

const OPTIONS_PERIODE: Option<Periode>[] = [
  { valeur: '7', libelle: '7 jours' },
  { valeur: '30', libelle: '30 jours' },
  { valeur: 'tout', libelle: 'Tout' },
]

const OPTIONS_AXE: Option<Axe>[] = [
  { valeur: 'type', libelle: 'Type de course' },
  { valeur: 'distance', libelle: 'Distance' },
  { valeur: 'peloton', libelle: 'Peloton' },
  { valeur: 'cote', libelle: 'Cote' },
]

/**
 * Les ordres d'affichage sont dérivés des fonctions de tranche elles-mêmes, avec
 * une valeur représentative par tranche, plutôt que recopiés en toutes lettres.
 * Les libellés contiennent des espaces fines et des signes « ≤ » : un caractère
 * mal recopié ferait silencieusement retomber la tranche en fin de liste, sans
 * erreur visible. Ici, un déplacement de borne dans `aggregate.ts` reste sans
 * effet sur cette page.
 */
const ORDRE_DISTANCE = [1200, 1600, 2000, 2400, null].map(trancheDistance)
const ORDRE_PELOTON = [6, 11, 16, null].map(tranchePeloton)
const ORDRE_COTE = [2, 4, 7, 15, 30, null].map(trancheCote)

/** « intervalle 22 – 34 % » — l'unité une seule fois, sur la borne haute. */
function intervalle(ic: { bas: number; haut: number }): string {
  return `intervalle ${Math.round(ic.bas * 100)} – ${pourcent(ic.haut)}`
}

function decimal(v: number, decimales = 1): string {
  return v.toFixed(decimales).replace('.', ',')
}

export default function Resultats() {
  const [lignes, setLignes] = useState<LignePrediction[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [tentative, setTentative] = useState(0)

  const [periode, setPeriode] = useState<Periode>('tout')
  const [axe, setAxe] = useState<Axe>('type')

  /**
   * Cette page ignore volontairement la fenêtre de trente jours du contexte
   * partagé : une courbe de calibration n'a de sens que sur tout ce qui a été
   * jugé. Le chargement est donc long et local à la page.
   */
  useEffect(() => {
    let vivant = true
    setChargement(true)
    setErreur(null)
    chargerHistorique()
      .then((r) => {
        if (!vivant) return
        setLignes(r)
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

  const toutes = useMemo(() => construireCourses(lignes), [lignes])

  const courses = useMemo(() => {
    if (periode === 'tout') return toutes
    const depuis = periode === '7' ? jourISO(-6) : jourISO(-29)
    return toutes.filter((c) => c.date >= depuis)
  }, [toutes, periode])

  const synthese = useMemo(() => bilan(courses), [courses])
  const icVictoire = useMemo(() => wilson(synthese.gagnees, synthese.jugees), [synthese])
  const icPlace = useMemo(() => wilson(synthese.placees, synthese.jugees), [synthese])

  const bornes = useMemo(() => {
    const dates = courses
      .filter((c) => c.courue)
      .map((c) => c.date)
      .sort()
    return dates.length ? { debut: dates[0], fin: dates[dates.length - 1] } : null
  }, [courses])

  /**
   * Le repère de hasard se calcule sur la taille réelle des pelotons jugés.
   * Écrire « 8 % » en dur supposerait douze partants ; l'obstacle tourne souvent
   * à sept ou huit, et le repère deviendrait deux fois trop sévère.
   */
  const hasard = useMemo(() => {
    const tailles = courses.flatMap((c) => (c.courue && c.partants != null ? [c.partants] : []))
    if (!tailles.length) return null
    const moyenne = tailles.reduce((s, n) => s + n, 0) / tailles.length
    return { moyenne, victoire: 1 / moyenne, place: Math.min(1, 3 / moyenne) }
  }, [courses])

  const marche = useMemo(() => faceAuMarche(courses), [courses])
  const jours = useMemo(() => parJour(courses), [courses])
  const tranches = useMemo(() => calibration(courses), [courses])

  const segments = useMemo(() => {
    if (axe === 'distance')
      return parSegment(courses, (c) => trancheDistance(c.distance), ORDRE_DISTANCE)
    if (axe === 'peloton')
      return parSegment(courses, (c) => tranchePeloton(c.partants), ORDRE_PELOTON)
    if (axe === 'cote')
      return parSegment(courses, (c) => trancheCote(c.favori?.cote ?? null), ORDRE_COTE)
    return parSegment(courses, (c) => c.type)
  }, [courses, axe])

  if (chargement) {
    // Le chargement le plus long de l'app mérite mieux qu'un logo qui respire
    // au milieu du vide : le squelette épouse la vraie mise en page — en-tête,
    // grille de quatre tuiles, trois cartes de graphique — et la page semble
    // se révéler plutôt qu'apparaître.
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Chargement de l'historique">
        <div className="flex items-end justify-between gap-4">
          <div className="space-y-3">
            <div className="skeleton h-10 w-56" />
            <div className="skeleton h-4 w-72" />
          </div>
          <div className="skeleton h-10 w-44 rounded-full" />
        </div>
        <SqueletteStats />
        <div className="skeleton h-64 rounded-3xl" />
        <div className="skeleton h-72 rounded-3xl" />
        <div className="skeleton h-72 rounded-3xl" />
      </div>
    )
  }
  if (erreur) return <Erreur message={erreur} onReessayer={() => setTentative((t) => t + 1)} />

  const enTete = (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="titre-page">Nos résultats</h1>
        <p className="text-sm text-muted mt-2.5 leading-relaxed">
          {bornes ? (
            <>
              Du {dateLongue(bornes.debut)} au {dateLongue(bornes.fin)}
              <span className="text-faint"> · </span>
              <span className="num">{synthese.jugees}</span> course
              {synthese.jugees > 1 ? 's' : ''} jugée{synthese.jugees > 1 ? 's' : ''}
            </>
          ) : (
            'Aucune course jugée sur la période retenue.'
          )}
        </p>
      </div>
      <Segmente
        options={OPTIONS_PERIODE}
        valeur={periode}
        onChange={setPeriode}
        aria="Période analysée"
      />
    </header>
  )

  if (!synthese.jugees) {
    return (
      <div className="space-y-6">
        {enTete}
        <div className="card">
          <EtatVide
            icone={<CalendarDays size={20} />}
            titre="Aucun résultat sur cette période"
            texte="Les courses ne sont jugées qu'une fois l'arrivée publiée. Élargissez la période pour retrouver l'historique complet."
            action={
              <button className="btn-glass" onClick={() => setPeriode('tout')}>
                Voir tout l'historique
              </button>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {enTete}

      {synthese.jugees < SEUIL_ECHANTILLON && (
        <section className="card !border-info/25 p-4 sm:p-5 flex gap-3.5 animate-fade-up">
          <Info size={18} className="text-info shrink-0 mt-0.5" aria-hidden />
          <div className="text-sm text-muted leading-relaxed">
            <p className="text-ink font-medium">Échantillon encore court</p>
            <p className="mt-1.5">
              <span className="num">{synthese.jugees}</span> courses jugées, pour un seuil de
              lecture fixé à <span className="num">{SEUIL_ECHANTILLON}</span>. Les taux ci-dessous
              sont exacts, mais leur intervalle de confiance est large : lisez-les avec cet
              intervalle, indiqué sous chaque chiffre, et non comme une valeur fixe.
            </p>
          </div>
        </section>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          libelle="Taux de victoire"
          icone={<Trophy size={13} aria-hidden />}
          valeur={pourcent(synthese.tauxVictoire)}
          precision={intervalle(icVictoire)}
          note={
            <>
              <span className="num">{synthese.gagnees}</span> victoires de notre rang 1 sur{' '}
              <span className="num">{synthese.jugees}</span> courses.
            </>
          }
          accent
        />
        <Stat
          libelle="Dans les trois"
          icone={<Award size={13} aria-hidden />}
          valeur={pourcent(synthese.tauxPlace)}
          precision={intervalle(icPlace)}
          note={
            <>
              <span className="num">{synthese.placees}</span> arrivées dans les trois premiers pour
              notre rang 1.
            </>
          }
        />
        <Stat
          libelle="Nos trois dans l'arrivée"
          icone={<Target size={13} aria-hidden />}
          valeur={points(synthese.tauxTrio * 100)}
          note={
            <>
              Part de nos trois premiers retrouvés dans l'arrivée :{' '}
              <span className="num">{synthese.trio}</span> chevaux sur{' '}
              <span className="num">{synthese.jugees * 3}</span> possibles.
            </>
          }
        />
        <Stat
          libelle="Courses jugées"
          icone={<CalendarDays size={13} aria-hidden />}
          valeur={synthese.jugees}
          note={
            <>
              Réparties sur <span className="num">{synthese.reunions}</span> réunions.
            </>
          }
        />
      </div>

      <Carte className="animate-fade-up">
        <EnTeteCarte
          titre="Réussite en un coup d'œil"
          aide="Les mêmes chiffres que ci-dessus, sous une forme comparable d'un regard."
        />
        <div className="flex flex-wrap justify-around gap-6">
          <Jauge valeur={synthese.tauxVictoire} libelle="Victoire du rang 1" />
          <Jauge valeur={synthese.tauxPlace} libelle="Rang 1 dans les trois" />
          <Jauge valeur={synthese.tauxTrio} libelle="Nos trois dans l'arrivée" />
        </div>
        {hasard && (
          <p className="text-xs text-muted leading-relaxed mt-6 max-w-prose">
            Repère : sur des pelotons de <span className="num">{decimal(hasard.moyenne)}</span>{' '}
            partants en moyenne sur cette période, un cheval tiré au sort gagnerait environ{' '}
            <span className="num">{pourcent(hasard.victoire)}</span> des courses et finirait dans
            les trois environ <span className="num">{pourcent(hasard.place)}</span> du temps. Sans
            ce repère, un taux ne dit rien de la qualité du travail.
          </p>
        )}
      </Carte>

      {marche && (
        <Carte className="animate-fade-up">
          <EnTeteCarte
            titre="Face au marché"
            aide="Comparaison sur les seules courses cotées et arrivées, où les deux favoris sont mesurables."
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Stat
              libelle="Notre rang 1"
              icone={<Trophy size={13} aria-hidden />}
              valeur={pourcent(marche.tauxNous)}
              note={
                <>
                  <span className="num">{marche.nous}</span> victoires sur{' '}
                  <span className="num">{marche.n}</span> courses.
                </>
              }
            />
            <Stat
              libelle="Favori du marché"
              icone={<Scale size={13} aria-hidden />}
              valeur={pourcent(marche.tauxMarche)}
              note={
                <>
                  <span className="num">{marche.marche}</span> victoires du cheval le moins coté,
                  sur les mêmes courses.
                </>
              }
            />
            <Stat
              libelle="Accord entre les deux"
              icone={<Activity size={13} aria-hidden />}
              valeur={pourcent(marche.tauxAccord)}
              note={
                <>
                  Notre rang 1 est aussi le favori du marché dans{' '}
                  <span className="num">{marche.accord}</span> courses.
                </>
              }
            />
          </div>
          <div className="text-sm text-muted leading-relaxed mt-5 space-y-2.5 max-w-prose">
            <p>
              Le favori du marché est l'adversaire le plus exigeant qui soit : une cote de départ
              agrège l'avis du public et toute l'information disponible à cette heure-là. Cette
              comparaison mesure donc la qualité de notre classement face à ce consensus, sur
              exactement les mêmes courses — un taux brut, seul, ne dirait rien de la difficulté
              de l'exercice.
            </p>
            {marche.n < 60 && (
              <p className="text-faint">
                Sur <span className="num">{marche.n}</span> courses seulement, l'écart entre les
                deux taux tient dans la marge d'erreur : il ne constitue pas encore un verdict.
              </p>
            )}
          </div>
        </Carte>
      )}

      <Carte className="animate-fade-up">
        <EnTeteCarte
          titre="Évolution dans le temps"
          aide="Taux de victoire cumulé jour après jour, et volume de courses jugées."
        />
        <div className="card-nest p-3 sm:p-4">
          <CourbeTaux points={jours} />
        </div>
        <p className="text-sm text-muted leading-relaxed mt-5 max-w-prose">
          La ligne verte est <strong className="font-medium text-ink">cumulée</strong>, et non
          journalière. Sur une quinzaine de courses par jour, un taux quotidien passe de 0 % à 40 %
          d'un jour à l'autre sans qu'aucun modèle n'ait changé : il ne mesurerait que le hasard du
          calendrier. Le cumul, lui, montre vers quelle valeur le taux converge, et à quelle
          vitesse. Les barres grises rappellent le volume de chaque journée : une inflexion de la
          courbe sur un jour à trois courses ne vaut pas celle d'un samedi à trente.
        </p>
      </Carte>

      <Carte className="animate-fade-up">
        <EnTeteCarte
          titre="Là où le modèle réussit, et là où il échoue"
          aide="Taux de victoire du rang 1 par segment, avec son intervalle de confiance à 95 %."
        />
        <div className="scroll-x -mx-1 px-1 pb-1">
          <Segmente options={OPTIONS_AXE} valeur={axe} onChange={setAxe} aria="Axe d'analyse" />
        </div>
        <div className="card-nest p-3 sm:p-4 mt-4">
          <BarresSegment segments={segments} />
        </div>
        <p className="text-sm text-muted leading-relaxed mt-5 max-w-prose">
          Le trait fin qui traverse chaque barre est l'intervalle de confiance à 95 % : la plage
          dans laquelle se situerait le vrai taux si l'on rejouait indéfiniment ces courses. Plus
          l'effectif indiqué entre parenthèses est faible, plus ce trait est long. Un segment à 40 %
          sur cinq courses n'est pas meilleur qu'un segment à 28 % sur deux cents : son intervalle
          couvre les deux. Ne comparez deux segments que si leurs traits ne se chevauchent pas.
        </p>
      </Carte>

      <Carte className="animate-fade-up">
        <EnTeteCarte
          titre="Calibration des probabilités"
          aide="Sur les chevaux annoncés à 20 %, en gagnent-ils vraiment 20 % ?"
        />
        {tranches.length < 2 ? (
          <p className="text-sm text-muted leading-relaxed">
            Il faut au moins deux tranches de probabilité renseignées pour tracer une calibration.
            Élargissez la période.
          </p>
        ) : (
          <>
            <div className="card-nest p-3 sm:p-4">
              <CourbeCalibration tranches={tranches} />
            </div>
            <p className="text-sm text-muted leading-relaxed mt-5 max-w-prose">
              Un modèle bien calibré pose ses points sur la diagonale : ce qu'il annonce à 20 % se
              produit 20 % du temps. Un point au-dessus de la diagonale signale un modèle trop
              prudent, qui sous-estime ses chances ; un point en dessous, un modèle trop confiant,
              dont les probabilités affichées valent moins que ce qu'elles prétendent. La taille du
              point donne le nombre de partants observés dans la tranche : un point minuscule loin
              de la diagonale n'est probablement que du bruit. C'est la mesure qui décide si une
              probabilité affichée veut dire quelque chose — pas seulement si le classement est
              bon, mais si le niveau annoncé est le bon.
            </p>
          </>
        )}
      </Carte>

      <p className="text-xs text-faint leading-relaxed max-w-prose">
        Les performances passées ne préjugent pas des résultats futurs. Ces chiffres décrivent un
        historique mesuré sur les courses effectivement jugées, avec leurs tailles d'échantillon ;
        ce sont des analyses statistiques, ni une garantie ni un conseil. Ce qui est mesuré ici,
        et comment, est décrit dans{' '}
        <Link to="/methode" className="link">
          notre méthode
        </Link>
        .
      </p>
    </div>
  )
}
