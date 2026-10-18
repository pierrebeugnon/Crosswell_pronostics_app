import { Link } from 'react-router-dom'
import { distance as formatDistance, hippodrome as formatHippodrome, pourcent } from '@/lib/format'
import { URL_CONNEXION } from '@/config/site'
import {
  cheminCourse,
  etatCourse,
  favoriDe,
  LIBELLE_ETAT,
  type CoursePublique,
  type EtatCourse,
} from '@/lib/resultats'

/**
 * UNE COURSE DANS LA LISTE D'UNE JOURNÉE.
 *
 * Quatre états, et pas un de plus — voir `lib/resultats`. La maquette en
 * proposait un cinquième, « En cours · arrivée en cours d'officialisation » :
 * il est écarté parce que nous ne recevons aucun statut de société de courses.
 * « Départ donné » dit ce que nous savons, et rien de plus.
 *
 * CE QU'UN VISITEUR SANS COMPTE VOIT (arbitrage du fondateur, 18/10/2026) :
 * - course PASSÉE : notre favori, la probabilité que nous avions annoncée, et
 *   où il a terminé. Avant la course, cette probabilité est le produit ; après,
 *   c'est une mesure — et c'est ce qu'une page de résultats doit prouver.
 * - course À VENIR : l'heure, la distance, les partants, et un renvoi à la
 *   connexion. Aucune probabilité : l'absence est portée par la source, pas
 *   masquée ici.
 *
 * Le composant est PUREMENT PRÉSENTATIF : tout arrive en props, la navigation
 * passe par des liens, rien ne lit l'horloge. C'est ce qui permettra de le
 * rendre côté serveur sans y toucher.
 */

/** « Handicap · 2 400 m · 12 partants » — les champs absents disparaissent. */
function meta(c: CoursePublique): string {
  return [c.categorie, c.distance != null ? formatDistance(c.distance) : null, `${c.partants} partants`]
    .filter(Boolean)
    .join(' · ')
}

/** Ce que la colonne de droite annonce, selon l'état. */
function verdict(c: CoursePublique, etat: EtatCourse) {
  const f = favoriDe(c)
  if (!f) return { valeur: '—', ton: 'text-faint' }

  const annonce = `n°${f.numero} · ${pourcent(f.pWin)}`

  if (etat === 'terminee') {
    if (f.arrivee === null) return { valeur: 'Favori non classé', ton: 'text-faint' }
    const libelle = f.arrivee === 1 ? 'Gagnant' : `${f.arrivee}e`
    return { valeur: `${annonce} → ${libelle}`, ton: f.arrivee === 1 ? 'text-accent' : 'text-soft' }
  }
  return { valeur: annonce, ton: etat === 'nonRelevee' ? 'text-faint' : 'text-soft' }
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
  const v = verdict(course, etat)

  const corps = (
    <>
      <span className="num w-[3.375rem] shrink-0 flex flex-col gap-0.5">
        <span className="text-[1rem] font-bold">{course.heureDepart ?? '—'}</span>
        <span className="text-xs font-semibold text-faint">C{course.numero}</span>
      </span>
      <span className="flex-1 min-w-0 flex flex-col gap-[3px]">
        <span className="text-[0.9375rem] font-semibold truncate">{course.nom ?? `Course ${course.numero}`}</span>
        <span className="num text-xs font-medium text-faint truncate">{meta(course)}</span>
      </span>
      <span className="shrink-0 flex flex-col items-end gap-[3px] text-right">
        <span className="text-[0.625rem] font-bold uppercase tracking-[0.1em] text-faint">
          {LIBELLE_ETAT[etat]}
        </span>
        {aVenir ? (
          <span className="text-sm font-bold text-accent">Voir le pronostic</span>
        ) : (
          <span className={`num text-sm font-bold ${v.ton}`}>{v.valeur}</span>
        )}
      </span>
    </>
  )

  const classe =
    'flex items-center gap-3.5 w-full min-h-[4.125rem] px-4 py-3 rounded-xl border border-sep bg-sunken hover:border-line-hover transition-colors'

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

/** Les courses d'une journée, groupées par hippodrome, dans l'ordre horaire. */
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
          <h2 className="text-[0.9375rem] font-bold">{formatHippodrome(lieu)}</h2>
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
