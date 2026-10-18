import { Link } from 'react-router-dom'
import { distance as formatDistance, hippodrome as formatHippodrome, pourcent } from '@/lib/format'
import { URL_CONNEXION } from '@/config/site'
import {
  cheminCourse,
  allocation,
  arriveeConnue,
  cinqPremiers,
  disciplinesDe,
  etatCourse,
  favoriDe,
  LIBELLE_ETAT,
  repereCourse,
  tonCategorie,
  type CoursePublique,
} from '@/lib/resultats'

/**
 * UNE COURSE DANS LA LISTE D'UNE JOURNÉE.
 *
 * Quatre états, et pas un de plus — voir `lib/resultats`. La maquette en
 * proposait un cinquième, « En cours · arrivée en cours d'officialisation » :
 * écarté, parce que nous ne recevons aucun statut de société de courses.
 *
 * CE QUE LE VISITEUR VOIT (arbitrage du fondateur, 18/10/2026) : sur une course
 * PASSÉE, l'arrivée des cinq premiers, le nom du gagnant, notre favori, la
 * probabilité annoncée et sa place réelle. Avant la course, cette probabilité
 * est le produit ; après, c'est une mesure.
 *
 * L'ARRIVÉE EN PASTILLES manquait à la première version de ce composant, et
 * c'était le manque le plus grave : une page de résultats qui n'affiche pas les
 * résultats. La maquette a raison — c'est la première chose que cherche un
 * lecteur, avant même notre pronostic.
 *
 * Composant PUREMENT PRÉSENTATIF : tout arrive en props, la navigation passe
 * par des liens, rien ne lit l'horloge. C'est ce qui permettra de le rendre
 * côté serveur sans y toucher.
 */

/** « Plat · 2 400 m · 12 partants » — les champs absents disparaissent. */
function meta(c: CoursePublique): string {
  return [c.discipline, c.distance != null ? formatDistance(c.distance) : null, `${c.partants} partants`]
    .filter(Boolean)
    .join(' · ')
}

/** L'étiquette de catégorie, hiérarchisée comme la maquette. */
export function Categorie({ valeur }: { valeur: string | null }) {
  const ton = tonCategorie(valeur)
  if (!ton || !valeur) return null
  const classe =
    ton === 'groupe'
      ? 'bg-accent text-accent-ink'
      : ton === 'listed'
        ? 'border border-accent text-accent'
        : 'bg-raised text-soft border border-line'
  return (
    <span className={`shrink-0 px-2 py-[3px] rounded-full text-[0.625rem] font-extrabold uppercase tracking-[0.04em] ${classe}`}>
      {valeur}
    </span>
  )
}

/** Les cinq premiers, en pastilles ; le gagnant en vert. */
function Podium({ course }: { course: CoursePublique }) {
  const cinq = cinqPremiers(course)
  if (!cinq.length) return null
  return (
    <span className="flex items-center gap-1" aria-label={`Arrivée : ${cinq.map((p) => p.numero).join(', ')}`}>
      {cinq.map((p) => (
        <span
          key={p.numero}
          className={`num w-7 h-7 rounded-lg grid place-items-center text-[0.75rem] font-extrabold ${
            p.arrivee === 1 ? 'bg-accent text-accent-ink' : 'bg-raised text-soft border border-line'
          }`}
        >
          {p.numero}
        </span>
      ))}
    </span>
  )
}

/** Un cadenas discret, pour une course dont le pronostic n'est pas ouvert. */
function Cadenas() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <path
        d="M6 11V8a6 6 0 0 1 12 0v3M5 11h14v10H5z"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function LigneCourse({
  course,
  maintenant,
}: {
  course: CoursePublique
  maintenant: { jour: string; minutes: number }
}) {
  const etat = etatCourse(course, maintenant)
  const aVenir = etat === 'aVenir'
  const favori = favoriDe(course)
  const gagnant = course.liste.find((p) => p.arrivee === 1) ?? null

  const corps = (
    <>
      <span className="num w-[3.375rem] shrink-0 flex flex-col gap-0.5">
        <span className="text-[1rem] font-bold">{course.heureDepart ?? '—'}</span>
        <span className="text-xs font-semibold text-faint">{repereCourse(course)}</span>
      </span>

      <span className="flex-1 min-w-0 flex flex-col gap-1.5">
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-[0.9375rem] font-semibold truncate">{course.nom ?? `Course ${course.numero}`}</span>
          <Categorie valeur={course.categorie} />
          {/* L'allocation, que la maquette porte sur chaque ligne. Elle existe
              à 100 % dans `pmu_courses.montant_prix` — je l'avais retirée en
              croyant l'inverse. */}
          {allocation(course.allocation) && (
            <span className="num shrink-0 text-xs font-semibold text-faint">{allocation(course.allocation)}</span>
          )}
        </span>
        <span className="num text-xs font-medium text-faint truncate">{meta(course)}</span>

        {/* L'arrivée, sur la ligne : la première chose que cherche un lecteur. */}
        {arriveeConnue(etat) && (
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-0.5">
            <Podium course={course} />
            {gagnant && (
              <span className="text-[0.8125rem] font-semibold text-soft truncate">
                1<sup>er</sup> : {gagnant.nom}
              </span>
            )}
          </span>
        )}

        {aVenir && (
          <span className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-faint">
            <Cadenas />
            Pronostic réservé aux membres
          </span>
        )}
      </span>

      <span className="shrink-0 flex flex-col items-end gap-[3px] text-right">
        <span className="text-[0.625rem] font-bold uppercase tracking-[0.1em] text-faint">{LIBELLE_ETAT[etat]}</span>
        {aVenir ? (
          <span className="text-sm font-bold text-accent">Voir le pronostic</span>
        ) : favori ? (
          <>
            <span className={`num text-sm font-bold ${favori.arrivee === 1 ? 'text-accent' : 'text-soft'}`}>
              {favori.arrivee === null
                ? arriveeConnue(etat)
                  ? 'Non classé'
                  : '—'
                : favori.arrivee === 1
                  ? 'Gagnant'
                  : `${favori.arrivee}e`}
            </span>
            <span className="num text-[0.6875rem] font-medium text-faint">
              Prédit&nbsp;: n°{favori.numero} · {pourcent(favori.pWin)} annoncés
            </span>
          </>
        ) : (
          <span className="num text-sm font-bold text-faint">—</span>
        )}
      </span>
    </>
  )

  const classe =
    'flex items-start gap-3.5 w-full px-4 py-3.5 rounded-xl border border-sep bg-sunken hover:border-line-hover transition-colors'

  // Une course pas encore courue n'a pas de page : elle n'a rien à montrer, et
  // publier une adresse vide sur un site indexable est pire que pas d'adresse.
  if (aVenir) {
    return (
      <a href={URL_CONNEXION} rel="noopener noreferrer" className={classe}>
        {corps}
      </a>
    )
  }

  return (
    <Link
      to={cheminCourse(course)}
      className={classe}
      aria-label={`${formatHippodrome(course.hippodrome)}, course ${course.numero}, ${LIBELLE_ETAT[etat].toLowerCase()}`}
    >
      {corps}
    </Link>
  )
}

/**
 * Les courses d'une journée, groupées par hippodrome, dans l'ordre horaire.
 *
 * L'en-tête d'une réunion porte ses disciplines et son nombre de courses, comme
 * la maquette — mais PAS son numéro de réunion : aucune colonne de la base ne
 * le connaît, et l'inventer contredirait les programmes officiels.
 */
export function ListeJournee({
  courses,
  maintenant,
}: {
  courses: CoursePublique[]
  maintenant: { jour: string; minutes: number }
}) {
  const parHippodrome = courses.reduce<Record<string, CoursePublique[]>>((acc, c) => {
    ;(acc[c.hippodrome] ??= []).push(c)
    return acc
  }, {})

  const groupes = Object.entries(parHippodrome).sort(
    ([, a], [, b]) => (a[0].heureDepart ?? '').localeCompare(b[0].heureDepart ?? ''),
  )

  return (
    <div className="flex flex-col gap-7">
      {groupes.map(([lieu, liste]) => (
        <section key={lieu} className="flex flex-col gap-2.5" aria-label={formatHippodrome(lieu)}>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-[0.9375rem] font-bold">{formatHippodrome(lieu)}</h2>
            {disciplinesDe(liste).map((d) => (
              <span
                key={d}
                className="px-2 py-[3px] rounded-full bg-raised border border-line text-[0.625rem] font-bold uppercase tracking-[0.06em] text-soft"
              >
                {d}
              </span>
            ))}
            <span className="num text-[0.8125rem] font-medium text-faint">
              {liste.length} course{liste.length > 1 ? 's' : ''}
            </span>
          </div>
          {liste
            .slice()
            .sort((a, b) => a.numero - b.numero)
            .map((c) => (
              <LigneCourse key={c.cle} course={c} maintenant={maintenant} />
            ))}
        </section>
      ))}
    </div>
  )
}
