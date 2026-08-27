import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Flag, Medal, SearchX, Trophy } from 'lucide-react'
import type { Course as CourseHippique, Partant } from '@/types'
import { useDonnees } from '@/data/DonneesContext'
import { chargerCourse } from '@/services/predictions'
import { cleCourse, construireCourses } from '@/lib/aggregate'
import { ambianceDe } from '@/lib/ambiance'
import {
  cote as formatCote,
  dateRelative,
  distance as formatDistance,
  hippodrome as formatHippodrome,
  pourcent,
  rang as formatRang,
} from '@/lib/format'
import { Aide } from '@/components/ui/Aide'
import { Dossard } from '@/components/ui/Dossard'
import { Carte, EnTeteCarte } from '@/components/ui/Carte'
import { Erreur, EtatVide } from '@/components/ui/EtatVide'
import { EtiquetteStatut, EtiquetteType } from '@/components/ui/Etiquettes'
import { AxePeloton } from '@/components/course/AxePeloton'
import { Podium } from '@/components/course/Podium'
import { TablePartants } from '@/components/course/TablePartants'

const lienReunion = (date: string, nom: string) => `/reunions/${date}/${encodeURIComponent(nom)}`

const lienCourse = (c: CourseHippique) =>
  `/courses/${c.date}/${encodeURIComponent(c.hippodrome)}/${c.numero}`

function Introuvable() {
  return (
    <div className="card">
      <EtatVide
        icone={<SearchX size={20} />}
        titre="Course introuvable"
        texte="Cette course n'existe pas dans nos pronostics, ou son adresse est incomplète."
        action={
          <Link to="/reunions" className="btn-glass">
            Voir les réunions
          </Link>
        }
      />
    </div>
  )
}

/**
 * Le verdict, dit avant l'arrivée elle-même.
 *
 * Le client vient vérifier UNE chose : est-ce que ce qu'on lui a donné hier
 * soir a tenu ? Enterrer la réponse sous un tableau d'arrivée reviendrait à
 * la rendre moins visible quand elle est mauvaise — ce qui arrive dans près de
 * trois courses sur quatre.
 */
function Verdict({ course }: { course: CourseHippique }) {
  const f = course.favori
  if (!f) {
    return (
      <p className="text-sm text-muted">
        Aucune sélection n'avait été publiée sur cette course.
      </p>
    )
  }

  const gagne = course.gagne
  const place = !gagne && course.place

  const teinte = gagne ? 'text-win' : place ? 'text-info' : 'text-muted'
  const fond = gagne
    ? 'bg-win/[0.15] border-win/25 text-win'
    : place
      ? 'bg-info/[0.15] border-info/25 text-info'
      : 'bg-white/[0.05] border-white/10 text-faint'

  const titre = gagne
    ? 'Notre sélection a gagné'
    : place
      ? `Notre sélection est arrivée ${formatRang(f.arrivee)}`
      : 'Notre sélection a été battue'

  return (
    <div className="flex items-start gap-3.5">
      <span
        className={`w-11 h-11 rounded-2xl border grid place-items-center shrink-0 ${fond}`}
        aria-hidden
      >
        {gagne ? <Trophy size={18} /> : place ? <Medal size={18} /> : <Flag size={18} />}
      </span>

      <div className="min-w-0">
        <p className={`font-semibold tracking-tight ${teinte}`}>{titre}</p>
        <p className="text-sm text-muted mt-1.5">
          <Dossard numero={f.numero} className="mr-1.5 -mt-0.5" />
          <span className="font-medium text-ink">{f.nom}</span>
          {!gagne && !place && (
            <>
              <span className="text-faint"> · </span>
              {f.arrivee == null ? (
                'non classée'
              ) : (
                <>
                  <span className="num">{formatRang(f.arrivee)}</span> sur{' '}
                  <span className="num">{course.partants ?? course.liste.length}</span> partants
                </>
              )}
            </>
          )}
        </p>

        {/* Affichée quel que soit le verdict : réservée aux jours de réussite,
            cette ligne deviendrait un trophée — exactement la sélection
            rétrospective que la page Résultats se targue de ne pas faire. */}
        {f.cote != null && (
          <p className="text-sm mt-1.5 text-muted">
            Cote de clôture <span className="num font-semibold text-ink">{formatCote(f.cote)}</span>
            {f.pMarche != null && (
              <>
                {' '}
                — le public lui accordait{' '}
                <span className="num font-semibold text-ink">{pourcent(f.pMarche)}</span> de
                chances
              </>
            )}
            .
          </p>
        )}
      </div>
    </div>
  )
}

function LigneArrivee({ partant, index }: { partant: Partant; index: number }) {
  const p = partant
  const notre = p.rang != null && p.rang <= 3
  return (
    <li
      className="card-nest p-3.5 flex items-center gap-3 animate-fade-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <span
        className={`num w-8 h-8 rounded-xl grid place-items-center text-xs font-bold shrink-0 ${
          p.arrivee === 1 ? 'bg-accent text-accent-ink' : 'glass-nest text-muted'
        }`}
      >
        {p.arrivee}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">
          <Dossard numero={p.numero} className="mr-1.5 -mt-0.5" />
          {p.nom}
        </p>
        <p className={`num text-xs mt-1 ${notre ? 'text-accent' : 'text-faint'}`}>
          {p.rang == null ? 'hors de notre classement' : `notre rang ${p.rang}`}
        </p>
      </div>
    </li>
  )
}

function FaceAuMarche({
  course,
  favori,
  marche,
}: {
  course: CourseHippique
  favori: Partant
  marche: Partant
}) {
  const meme = favori.numero === marche.numero

  return (
    <Carte className="animate-fade-up">
      <EnTeteCarte
        titre="Face au marché"
        aide="La cote la plus basse désigne le favori du public. Comparer notre rang 1 à ce favori dit en un coup d'œil si nous suivons le consensus ou si nous nous en écartons."
      />

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div className="card-nest p-4">
          <p className="label">Notre favori</p>
          <p className="mt-2.5 font-semibold tracking-tight truncate">
            <Dossard numero={favori.numero} accent className="mr-1.5 -mt-0.5" />
            {favori.nom}
          </p>
          <p className="mt-3 flex items-baseline gap-1.5">
            <span className="num text-2xl font-bold text-accent">{pourcent(favori.pWin)}</span>
            <span className="text-xs text-faint">de victoire</span>
          </p>
          <p className="text-xs text-muted mt-2">
            {favori.cote == null ? (
              <span className="text-faint">Cote non relevée</span>
            ) : (
              <>
                Cote <span className="num">{formatCote(favori.cote)}</span>
              </>
            )}
          </p>
        </div>

        <div className="grid place-items-center py-1">
          <span className={meme ? 'chip-win' : 'chip-accent'}>
            {meme ? 'Même cheval' : 'Nous divergeons'}
          </span>
        </div>

        <div className="card-nest p-4">
          <p className="label">Favori du marché</p>
          <p className="mt-2.5 font-semibold tracking-tight truncate">
            <Dossard numero={marche.numero} className="mr-1.5 -mt-0.5" />
            {marche.nom}
          </p>
          <p className="mt-3 flex items-baseline gap-1.5">
            <span className="num text-2xl font-bold">{formatCote(marche.cote)}</span>
            <span className="text-xs text-faint">de cote</span>
          </p>
          <p className="text-xs text-muted mt-2">
            Soit <span className="num">{pourcent(marche.pMarche)}</span> de chances implicites
          </p>
        </div>
      </div>

      <p className="text-xs text-muted leading-relaxed mt-4 max-w-prose">
        {meme ? (
          <>
            Nous rejoignons ici le consensus : notre lecture de la course et celle du public
            désignent le même cheval. Les deux peuvent avoir tort ensemble.
          </>
        ) : (
          <>
            C'est sur ce désaccord que notre analyse se distingue — ou se trompe. La cote agrège
            déjà toute l'information publique : quand nous en divergeons, c'est que notre modèle
            lit la course autrement. Ce n'est pas une garantie, seulement l'endroit où nos
            probabilités s'écartent le plus de l'avis général.
          </>
        )}
      </p>

      {!course.courue && (
        <p className="text-xs text-faint mt-2">
          Les cotes évoluent jusqu'au départ ; celle-ci n'est qu'un instantané.
        </p>
      )}
    </Carte>
  )
}

export default function Course() {
  const params = useParams()
  const date = params.date ?? ''
  const nomHippodrome = decodeURIComponent(params.hippodrome ?? '')
  const numero = Number(params.numero)
  const numeroValide = Number.isInteger(numero)

  const { courses, pret } = useDonnees()

  const dansLaFenetre = useMemo(
    () =>
      courses.find(
        (c) => c.date === date && c.hippodrome === nomHippodrome && c.numero === numero,
      ) ?? null,
    [courses, date, nomHippodrome, numero],
  )

  const [aLaDemande, setALaDemande] = useState<CourseHippique | null>(null)
  // Vrai au départ, sans quoi la page clignoterait sur « introuvable » le temps
  // que l'effet de chargement démarre.
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [essai, setEssai] = useState(0)

  useEffect(() => {
    // La fenêtre partagée ne couvre que trente jours. Un lien plus ancien —
    // gardé en favori, envoyé par un autre client — doit s'ouvrir quand même,
    // quitte à payer une requête dédiée.
    if (!numeroValide || dansLaFenetre || !pret) return
    let annule = false
    setChargement(true)
    setErreur(null)
    chargerCourse(date, nomHippodrome, numero)
      .then((lignes) => {
        if (annule) return
        // Par CLÉ, jamais `lot[0]` : rien ne garantit que la réponse ne
        // contient que la course demandée (le mode démonstration renvoie tout
        // son jeu), et la première du lot serait alors une autre course,
        // affichée sous la mauvaise adresse sans un mot d'erreur.
        const lot = construireCourses(lignes)
        setALaDemande(lot.find((c) => c.cle === cleCourse(date, nomHippodrome, numero)) ?? null)
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
  }, [date, nomHippodrome, numero, numeroValide, dansLaFenetre, pret, essai])

  const voisines = useMemo(
    () =>
      courses
        .filter((c) => c.date === date && c.hippodrome === nomHippodrome)
        .sort((a, b) => a.numero - b.numero),
    [courses, date, nomHippodrome],
  )

  const course = dansLaFenetre ?? aLaDemande

  if (!numeroValide) return <Introuvable />
  if (!course) {
    if (chargement || !pret)
      return (
        // Squelette fidèle : fil d'ariane, en-tête à pastille, podium à trois
        // cartes, tableau — la page se révèle au lieu d'apparaître.
        <div className="space-y-6" aria-busy="true" aria-label="Chargement de la course">
          <div className="skeleton h-9 w-40 rounded-full" />
          <div className="flex items-center gap-4">
            <div className="skeleton h-12 w-12 rounded-2xl" />
            <div className="space-y-2.5">
              <div className="skeleton h-9 w-64" />
              <div className="skeleton h-5 w-80 max-w-[60vw]" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="skeleton h-40 rounded-3xl" />
            <div className="skeleton h-40 rounded-3xl" />
            <div className="skeleton h-40 rounded-3xl" />
          </div>
          <div className="skeleton h-80 rounded-3xl" />
        </div>
      )
    if (erreur) return <Erreur message={erreur} onReessayer={() => setEssai((n) => n + 1)} />
    return <Introuvable />
  }

  const rangDansReunion = voisines.findIndex((c) => c.numero === numero)
  // Sans la réunion en mémoire, des flèches désactivées laisseraient croire
  // qu'il n'existe pas d'autre course : mieux vaut ne rien afficher.
  const navigable = rangDansReunion >= 0 && voisines.length > 1
  const precedente = rangDansReunion > 0 ? voisines[rangDansReunion - 1] : null
  const suivante =
    rangDansReunion >= 0 && rangDansReunion < voisines.length - 1
      ? voisines[rangDansReunion + 1]
      : null

  const nombrePartants = course.partants ?? course.liste.length
  const arriveeTrois = course.liste
    .filter((p) => p.arrivee != null && p.arrivee <= 3)
    .sort((a, b) => (a.arrivee ?? 99) - (b.arrivee ?? 99))

  /**
   * La lumière de la piste suit la course hors de sa page : les halos dérivés
   * du nom de l'hippodrome — jusqu'ici réservés aux fiches de piste — teintent
   * l'en-tête. Deauville n'a plus la même lumière que Vincennes, et l'habitué
   * le sent avant d'avoir lu le nom. Opacité contenue : c'est une ambiance,
   * pas un décor, et le filet haut signe la provenance.
   */
  const ambiance = ambianceDe(course.hippodrome)

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="relative overflow-hidden rounded-3xl -mx-2 px-2 pb-2 sm:-mx-3 sm:px-3">
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
        <div className="relative">
        <Link
          to={lienReunion(course.date, course.hippodrome)}
          className="btn-ghost -ml-2 max-w-full"
        >
          <ChevronLeft size={16} />
          <span className="truncate">{formatHippodrome(course.hippodrome)}</span>
          <span className="text-faint shrink-0">· {dateRelative(course.date)}</span>
        </Link>

        <header className="mt-3 flex items-start gap-4">
          <span
            className="num shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full glass-nest
                       grid place-items-center text-lg sm:text-xl font-semibold text-muted"
            aria-hidden
          >
            {course.numero}
          </span>

          <div className="min-w-0 flex-1">
            <h1 className="titre-page">
              <span className="sr-only">Course {course.numero} — </span>
              {course.nom ?? `Course ${course.numero}`}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <EtiquetteType type={course.type} />
              {course.distance != null && (
                <span className="chip-neutral num">{formatDistance(course.distance)}</span>
              )}
              <span className="chip-neutral num">{nombrePartants} partants</span>
              {/* `type` vaut déjà « Handicap » dans la plupart des cas : afficher
                  deux fois le même mot ne dit rien de plus. */}
              {course.handicap && course.type !== 'Handicap' && (
                <span className="chip-info">Handicap</span>
              )}
              <EtiquetteStatut course={course} />
            </div>
          </div>

          {navigable && (
            <nav className="hidden md:flex items-center gap-2 shrink-0" aria-label="Courses de la réunion">
              {precedente ? (
                <Link
                  to={lienCourse(precedente)}
                  className="btn-glass w-10 !px-0"
                  aria-label={`Course précédente : course ${precedente.numero}`}
                >
                  <ChevronLeft size={18} />
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="btn-glass w-10 !px-0"
                  aria-label="Aucune course précédente dans cette réunion"
                >
                  <ChevronLeft size={18} />
                </button>
              )}
              {suivante ? (
                <Link
                  to={lienCourse(suivante)}
                  className="btn-glass w-10 !px-0"
                  aria-label={`Course suivante : course ${suivante.numero}`}
                >
                  <ChevronRight size={18} />
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="btn-glass w-10 !px-0"
                  aria-label="Aucune course suivante dans cette réunion"
                >
                  <ChevronRight size={18} />
                </button>
              )}
            </nav>
          )}
        </header>
        </div>
      </div>

      {course.courue && (
        <Carte className="animate-fade-up">
          <Verdict course={course} />

          {arriveeTrois.length > 0 && (
            <div className="mt-5 pt-5 border-t border-white/[0.07]">
              <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
                <h2 className="label">Arrivée</h2>
                <p className="num text-xs text-muted">
                  {course.dansLeTrio} de nos 3 dans le trio d'arrivée
                </p>
              </div>
              <ol className="grid gap-2 sm:grid-cols-3">
                {arriveeTrois.map((p, i) => (
                  <LigneArrivee key={p.numero} partant={p} index={i} />
                ))}
              </ol>
            </div>
          )}
        </Carte>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          Notre pronostic
          <Aide>
            Une probabilité de victoire de 30 % signifie que si cette course était rejouée un
            grand nombre de fois, ce cheval en gagnerait environ trente sur cent. Ce n'est donc
            pas l'annonce d'un vainqueur : le plus souvent, notre rang 1 ne gagne pas.
          </Aide>
        </h2>
        <Podium course={course} />
      </section>

      {course.cotee && course.favoriMarche && course.favori && (
        <FaceAuMarche
          course={course}
          favori={course.favori}
          marche={course.favoriMarche}
        />
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">
          Les <span className="num">{course.liste.length}</span> partants
        </h2>
        <AxePeloton course={course} />
        <TablePartants course={course} />
      </section>

      {/*
        Pagination de bas de page, réservée au téléphone. La navigation de
        l'en-tête est inatteignable sur mobile une fois le tableau des partants
        parcouru : il faudrait remonter huit écrans pour passer à la course
        suivante, alors que c'est exactement ce qu'on veut faire en arrivant au
        bas de la page. On la répète donc là où le pouce se trouve, avec le
        numéro de la course visée plutôt qu'une flèche muette.
      */}
      {navigable && (
        <nav className="md:hidden grid grid-cols-2 gap-3" aria-label="Courses de la réunion">
          {precedente ? (
            <Link to={lienCourse(precedente)} className="btn-glass !justify-start w-full">
              <ChevronLeft size={16} className="shrink-0" />
              <span className="num truncate">Course {precedente.numero}</span>
            </Link>
          ) : (
            <span className="btn-glass w-full opacity-40 pointer-events-none">Début</span>
          )}
          {suivante ? (
            <Link to={lienCourse(suivante)} className="btn-glass !justify-end w-full">
              <span className="num truncate">Course {suivante.numero}</span>
              <ChevronRight size={16} className="shrink-0" />
            </Link>
          ) : (
            <span className="btn-glass w-full opacity-40 pointer-events-none">Fin</span>
          )}
        </nav>
      )}

      <p className="text-xs text-faint leading-relaxed max-w-prose">
        Les probabilités sont calculées la veille au soir, sur les partants déclarés à cette
        heure-là : un non-partant du matin n'y est pas répercuté. Les cotes affichées sont les
        cotes de clôture relevées après la course lorsqu'elles existent — elles décrivent le
        marché tel qu'il a fermé et ne servent qu'à évaluer nos probabilités après coup.
      </p>
    </div>
  )
}
