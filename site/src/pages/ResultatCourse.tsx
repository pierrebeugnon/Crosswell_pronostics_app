import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Categorie } from '@/components/resultats/LigneCourse'
import { URL_INSCRIPTION } from '@/config/site'
import { distance as formatDistance, hippodrome as formatHippodrome, jourLong, pourcent } from '@/lib/format'
import {
  allocation,
  arriveeConnue,
  cheminCourse,
  cheminJournee,
  etatCourse,
  favoriDe,
  instantParis,
  repereCourse,
  slug,
  type CoursePublique,
  type JourneePublique,
} from '@/lib/resultats'
import { chargerJournee } from '@/services/resultats'
import { useTitre } from '@/lib/useTitre'

/**
 * L'ARRIVÉE D'UNE COURSE — `/resultats/AAAA-MM-JJ/{hippodrome}/c{n}-{slug}`.
 * C'est la page d'atterrissage : celle que trouve quelqu'un qui cherche une
 * arrivée, et le seul endroit où notre annonce et le résultat se regardent.
 *
 * TROIS CHAMPS DE LA MAQUETTE SONT ABSENTS, et c'est assumé : l'ALLOCATION, le
 * TERRAIN et le NUMÉRO DE RÉUNION n'existent nulle part dans la base (relevé du
 * 10/10/2026 sur tout le schéma). Le H1 perd donc son « Allocation 364 000 € »
 * et son « R1C3 », et les huit cases de caractéristiques tombent à cinq. Mieux
 * vaut cinq cases justes que huit dont trois sont muettes sur 100 % des
 * journées.
 *
 * Le titre ne dit pas « officielle » : aucun statut de société de courses ne
 * nous parvient. Nous publions l'arrivée que nos relevés rapportent.
 *
 * LE TABLEAU COMPLET DES PARTANTS (jockey, entraîneur, poids, père × mère) vient
 * des performances France Galop et n'arrive que la nuit suivante — mesuré sur
 * cinq journées, écritures entre 3 h 38 et 3 h 39 UTC. Il viendra avec la source
 * réelle ; ici, le jeu d'exemple ne porte que l'arrivée et les cotes.
 */

function Case({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 rounded-xl bg-surface border border-line">
      <span className="text-[0.625rem] font-bold uppercase tracking-[0.1em] text-faint">{libelle}</span>
      <span className="num text-[0.9375rem] font-bold">{valeur}</span>
    </div>
  )
}

/** L'arrivée relevée : tous les partants classés, le gagnant en vert. */
function Arrivee({ course }: { course: CoursePublique }) {
  const classes = course.liste
    .filter((p) => p.arrivee !== null)
    .sort((a, b) => (a.arrivee ?? 99) - (b.arrivee ?? 99))

  if (!classes.length) {
    return (
      <p className="text-[0.9375rem] leading-relaxed text-muted">
        Nos relevés n’ont pas rapporté l’arrivée de cette course.
      </p>
    )
  }

  const nonPartants = course.liste.filter((p) => p.nonPartant)

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto -mx-5 px-5 lg:mx-0 lg:px-0">
        <table className="w-full min-w-[26rem] border-collapse text-[0.9375rem]">
          <thead>
            <tr className="border-b border-line-strong">
              {['Place', 'N°', 'Cheval', 'Cote'].map((e) => (
                <th
                  key={e}
                  className="text-left font-bold py-2.5 pr-4 text-[0.75rem] uppercase tracking-[0.08em] text-faint"
                >
                  {e}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {classes.map((p) => (
              <tr key={p.numero} className="border-b border-track">
                <td className={`num py-3 pr-4 font-extrabold ${p.arrivee === 1 ? 'text-accent' : 'text-soft'}`}>
                  {p.arrivee}
                </td>
                <td className="num py-3 pr-4 font-semibold text-soft">{p.numero}</td>
                <td className="py-3 pr-4 font-semibold text-ink">{p.nom}</td>
                {/* Une cote absente le jour même se dit, elle ne devient pas un
                    tiret muet : 0 ligne sur 132 le jour courant, 209 sur 210 la
                    veille (relevé du 10/10/2026). */}
                <td className="num py-3 pr-4 text-soft">
                  {p.cote != null ? p.cote.toFixed(1) : <span className="text-dim">relevée ce soir</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {nonPartants.length > 0 && (
        <p className="text-[0.8125rem] font-medium text-faint">
          Non-partant{nonPartants.length > 1 ? 's' : ''} :{' '}
          {nonPartants.map((p) => `n°${p.numero} ${p.nom}`).join(', ')}.
        </p>
      )}
      <p className="text-xs font-medium leading-relaxed text-faint">
        Les cotes affichées sont des cotes de clôture, relevées après la course. Notre modèle ne les lit pas.
      </p>
    </div>
  )
}

/** Ce que nous avions annoncé, et ce que la course en a fait. */
function CeQueNousAvionsAnnonce({ course }: { course: CoursePublique }) {
  const trio = course.liste
    .filter((p) => p.rang !== null && !p.nonPartant)
    .sort((a, b) => (a.rang ?? 99) - (b.rang ?? 99))
    .slice(0, 3)

  if (!trio.length) return null

  return (
    <div className="flex flex-col gap-3">
      {trio.map((p) => {
        const reussi = p.arrivee === 1
        return (
          <div
            key={p.numero}
            className="flex items-center gap-3.5 px-4 py-3 rounded-xl bg-surface border border-line"
          >
            <span className="num w-9 h-9 shrink-0 rounded-full bg-raised grid place-items-center text-[0.8125rem] font-extrabold text-soft">
              {p.rang}
            </span>
            <span className="flex-1 min-w-0 flex flex-col gap-[3px]">
              <span className="text-[0.9375rem] font-semibold truncate">
                n°{p.numero} · {p.nom}
              </span>
              <span className="num text-xs font-medium text-faint">{pourcent(p.pWin)} de chances de victoire</span>
            </span>
            <span className={`num text-sm font-bold shrink-0 ${reussi ? 'text-accent' : 'text-soft'}`}>
              {p.arrivee === null ? 'Non classé' : p.arrivee === 1 ? 'Gagnant' : `${p.arrivee}e`}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function ResultatCourse() {
  const { jour, lieu, course: segment } = useParams()
  // `r1c3-prix-du-bocage` → 3. Le `r{n}` est toléré et ignoré : c'est le
  // couple hippodrome + numéro de course qui identifie, le reste est lisible.
  const numero = Number((segment ?? '').match(/^(?:r\d+)?c(\d+)/)?.[1] ?? NaN)
  const maintenant = useMemo(instantParis, [])

  const [journee, setJournee] = useState<JourneePublique | null>(null)
  const [erreur, setErreur] = useState(false)

  // On charge LA JOURNÉE, pas la seule course : l'adresse porte un slug
  // d'hippodrome (`la-roche-posay`) alors que la base garde la graphie source
  // (`LA-ROCHE-POSAY`). Replier la journée évite d'inventer une table de
  // correspondance — et donne les autres courses de la réunion sans requête
  // supplémentaire.
  useEffect(() => {
    if (!jour) return
    let vivant = true
    chargerJournee(jour)
      .then((j) => vivant && setJournee(j))
      .catch(() => vivant && setErreur(true))
    return () => {
      vivant = false
    }
  }, [jour])

  const course = journee?.courses.find((c) => c.numero === numero && slug(c.hippodrome) === lieu)

  useTitre(
    course
      ? `Arrivée du ${course.nom ?? repereCourse(course)} — ${formatHippodrome(course.hippodrome)}`
      : 'Résultat d’une course',
  )

  const cadre = 'w-full max-w-[60rem] mx-auto px-5 lg:px-10 pt-7 lg:pt-12 pb-14 lg:pb-24 flex flex-col gap-7'

  if (erreur) {
    return (
      <div className={cadre}>
        <p className="text-[0.9375rem] leading-relaxed text-muted">
          Cette arrivée n’est pas joignable pour le moment.{' '}
          <Link to="/resultats" className="text-accent">
            Revenir aux résultats
          </Link>
          .
        </p>
      </div>
    )
  }

  if (!journee) {
    return (
      <div className={cadre}>
        <p className="text-[0.9375rem] text-faint" role="status">
          Chargement de l’arrivée…
        </p>
      </div>
    )
  }

  // Une adresse qui ne désigne aucune course jugée n'est pas une page vide :
  // c'est une page qui n'existe pas. En production, le rendu serveur devra
  // répondre un vrai 404 ici.
  if (!course) {
    return (
      <div className={cadre}>
        <h1 className="text-[1.75rem] font-extrabold tracking-[-0.03em]">Cette course n’a pas de résultat</h1>
        <p className="text-[0.9375rem] leading-relaxed text-muted">
          Elle n’a pas encore été courue, ou son arrivée ne nous est pas parvenue.{' '}
          <Link to={cheminJournee(jour ?? '')} className="text-accent">
            Voir la journée
          </Link>
          .
        </p>
      </div>
    )
  }

  const etat = etatCourse(course, maintenant)
  const favori = favoriDe(course)
  const autres = journee.courses.filter(
    (c) => c.hippodrome === course.hippodrome && c.cle !== course.cle,
  )

  return (
    <div className={cadre}>
      <nav aria-label="Fil d’Ariane" className="text-xs font-medium text-faint">
        <Link to="/resultats" className="hover:text-ink">
          Résultats
        </Link>
        <span aria-hidden> / </span>
        <Link to={cheminJournee(course.date)} className="hover:text-ink">
          {jourLong(course.date)}
        </Link>
        <span aria-hidden> / </span>
        <span className="text-soft">{formatHippodrome(course.hippodrome)}</span>
      </nav>

      <div className="flex flex-col gap-3">
        <Categorie valeur={course.categorie} />
        <h1 className="text-[1.75rem] lg:text-[2.3125rem] font-extrabold tracking-[-0.03em] leading-[1.05]">
          Arrivée du {course.nom ?? `C${course.numero}`} — {formatHippodrome(course.hippodrome)} {repereCourse(course)}
        </h1>
        {/* Le récapitulatif en une ligne de la maquette, moins l'allocation. */}
        <p className="num text-[0.9375rem] font-medium text-muted">
          {[
            course.categorie,
            course.discipline,
            course.distance != null ? formatDistance(course.distance) : null,
            `${course.partants} partants`,
            course.heureDepart ? `départ à ${course.heureDepart}` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>

      {/* ON N'AFFICHE QUE CE QU'ON A. La maquette dessine huit cases, dont
          allocation, discipline et terrain : aucune de ces trois n'est servie
          par les vues publiques, et l'en-tête de course de l'application ne les
          montre pas davantage. Quatre cases vides sur huit valent moins que
          quatre cases pleines — chacune se rend donc seulement si elle a une
          valeur, et la grille se referme sur ce qui reste. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {course.categorie && <Case libelle="Catégorie" valeur={course.categorie} />}
        {course.allocation != null && <Case libelle="Allocation" valeur={allocation(course.allocation)!} />}
        {course.discipline && <Case libelle="Discipline" valeur={course.discipline} />}
        {course.distance != null && <Case libelle="Distance" valeur={formatDistance(course.distance)} />}
        <Case libelle="Partants" valeur={String(course.partants)} />
        {course.terrain && <Case libelle="Terrain" valeur={course.terrain} />}
        {course.heureDepart && <Case libelle="Départ" valeur={course.heureDepart} />}
        {/* Un statut de non-partants pas encore vérifié n'est pas « 0 » — mais
            ici la vue les compte vraiment, donc zéro veut dire zéro. */}
        {course.nonPartants !== null && course.nonPartants > 0 && (
          <Case libelle="Non-partants" valeur={String(course.nonPartants)} />
        )}
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-[1.1875rem] lg:text-[1.4375rem] font-extrabold tracking-[-0.02em]">
            {arriveeConnue(etat) ? 'L’arrivée' : 'Cette course n’a pas encore d’arrivée'}
          </h2>
          {/* « Arrivée provisoire » vient du statut `FIN_COURSE`, pas d'une
              heure comparée à l'horloge comme le devinait la maquette. */}
          {etat === 'provisoire' && (
            <span className="px-2.5 py-1 rounded-full bg-raised border border-line-strong text-[0.6875rem] font-bold uppercase tracking-[0.06em] text-soft">
              Arrivée provisoire
            </span>
          )}
        </div>
        {arriveeConnue(etat) ? (
          <>
            <Arrivee course={course} />
            {etat === 'provisoire' && (
              <p className="text-[0.8125rem] font-medium text-faint">
                Cette arrivée n’est pas encore définitive&nbsp;: elle peut être modifiée.
              </p>
            )}
          </>
        ) : (
          <p className="text-[0.9375rem] leading-relaxed text-muted">
            {etat === 'departDonne'
              ? 'Le départ est donné. L’arrivée paraîtra ici dès que nos relevés la rapportent.'
              : 'Nos relevés n’ont pas rapporté l’arrivée de cette course.'}
          </p>
        )}
      </section>

      {favori && (
        <section className="flex flex-col gap-4">
          <h2 className="text-[1.1875rem] lg:text-[1.4375rem] font-extrabold tracking-[-0.02em]">
            Ce que nous avions annoncé
          </h2>
          <p className="text-[0.9375rem] leading-relaxed text-muted">
            Publié le matin même, avant la course, et jamais recalculé depuis.
          </p>
          <CeQueNousAvionsAnnonce course={course} />
          {/* La maquette écrivait ici « un cheval annoncé à 34 % perd deux fois
              sur trois » et « y compris celles que le modèle rate ». Même fait,
              sans se dévaloriser : on décrit ce qu'un pourcentage est. */}
          <p className="text-[0.8125rem] leading-relaxed text-faint">
            Un pourcentage décrit une fréquence attendue sur un grand nombre de courses, pas l’issue d’une course
            précise. Nous publions toutes les courses, sans en écarter aucune.
          </p>
        </section>
      )}


      {autres.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[1.0625rem] font-bold">
            Les autres courses de {formatHippodrome(course.hippodrome)}
          </h2>
          <div className="flex flex-wrap gap-2">
            {autres.map((c) => (
              <Link
                key={c.cle}
                to={cheminCourse(c)}
                className="num px-3.5 h-10 rounded-full bg-surface border border-line flex items-center text-[0.8125rem] font-semibold text-soft hover:border-line-hover transition-colors"
              >
                C{c.numero} · {c.heureDepart ?? '—'}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-[1.375rem] py-6 rounded-3xl bg-surface border border-line">
        <div className="flex flex-col gap-1.5">
          <span className="text-[1.0625rem] font-bold">Et les courses d’aujourd’hui&nbsp;?</span>
          {/* La maquette promettait ici « les pourcentages ET LES FACTEURS du
              pronostic ». Le modèle n'exporte pas ses facteurs — cette promesse
              avait déjà été retirée de l'accueil une fois. */}
          <span className="text-[0.9375rem] font-medium text-muted">
            Une course offerte chaque jour, pronostic complet, sans carte bancaire.
          </span>
        </div>
        <a
          href={URL_INSCRIPTION}
          rel="noopener noreferrer"
          className="shrink-0 h-[3.25rem] px-[1.625rem] rounded-full bg-accent text-accent-ink flex items-center justify-center text-[0.9375rem] font-bold hover:bg-accent-hover transition-colors"
        >
          Voir les pronostics du jour
        </a>
      </section>

      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 rounded-2xl bg-surface border border-line">
        <span className="text-[0.9375rem] font-medium text-muted">
          Comment lire une arrivée&nbsp;? Les pourcentages, l’écart au marché et nos limites sont expliqués sur le
          blog.
        </span>
        <Link to="/blog" className="shrink-0 text-[0.9375rem] font-bold text-accent hover:text-accent-hover">
          Lire les articles
        </Link>
      </section>
    </div>
  )
}
