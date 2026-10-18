import { Link, Navigate, useParams } from 'react-router-dom'
import { Fictif } from '@/components/ui/Fictif'
import { URL_INSCRIPTION } from '@/config/site'
import { distance as formatDistance, hippodrome as formatHippodrome, jourLong, pourcent } from '@/lib/format'
import { cheminCourse, cheminJournee, etatCourse, favoriDe, type CoursePublique } from '@/lib/resultats'
import { MAINTENANT_EXEMPLE, courseExemple, journeeExemple } from '@/lib/exemple-resultats'
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
        <table className="w-full min-w-[30rem] border-collapse text-[0.9375rem]">
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
                <td className="num py-3 pr-4 text-soft">{p.cote != null ? p.cote.toFixed(1) : 'relevée ce soir'}</td>
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
  const numero = Number((segment ?? '').replace(/^c/, '').split('-')[0])
  const course = jour && lieu && Number.isFinite(numero) ? courseExemple(jour, lieu, numero) : undefined

  useTitre(
    course
      ? `Arrivée du ${course.nom ?? `C${course.numero}`} — ${formatHippodrome(course.hippodrome)}`
      : 'Course introuvable',
  )

  if (!course) return <Navigate to="/resultats" replace />

  const etat = etatCourse(course, MAINTENANT_EXEMPLE)
  const favori = favoriDe(course)
  const journee = journeeExemple(course.date)
  const autres = (journee?.courses ?? []).filter(
    (c) => c.hippodrome === course.hippodrome && c.cle !== course.cle,
  )

  return (
    <div className="w-full max-w-[60rem] mx-auto px-5 lg:px-10 pt-7 lg:pt-12 pb-14 lg:pb-24 flex flex-col gap-7">
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
        {course.categorie && <span className="chip-neutral self-start">{course.categorie}</span>}
        <h1 className="text-[1.75rem] lg:text-[2.3125rem] font-extrabold tracking-[-0.03em] leading-[1.05]">
          Arrivée du {course.nom ?? `C${course.numero}`} — {formatHippodrome(course.hippodrome)} C{course.numero}
        </h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
        <Case libelle="Discipline" valeur="Galop" />
        <Case libelle="Distance" valeur={formatDistance(course.distance)} />
        <Case libelle="Partants" valeur={String(course.partants)} />
        <Case libelle="Départ" valeur={course.heureDepart ?? '—'} />
        {/* Un statut de non-partants pas encore vérifié n'est pas « 0 ». */}
        <Case libelle="Non-partants" valeur={course.nonPartants === null ? 'non vérifié' : String(course.nonPartants)} />
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-[1.1875rem] lg:text-[1.4375rem] font-extrabold tracking-[-0.02em]">
          {etat === 'terminee' ? 'L’arrivée' : 'Cette course n’a pas encore d’arrivée'}
        </h2>
        {etat === 'terminee' ? (
          <Arrivee course={course} />
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
        </section>
      )}

      <Fictif />

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
        <span className="text-[1.0625rem] font-bold">Voir les pronostics du jour</span>
        <a
          href={URL_INSCRIPTION}
          rel="noopener noreferrer"
          className="shrink-0 h-[3.25rem] px-[1.625rem] rounded-full bg-accent text-accent-ink flex items-center justify-center text-[0.9375rem] font-bold hover:bg-accent-hover transition-colors"
        >
          Essayer gratuitement
        </a>
      </section>
    </div>
  )
}
