import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Categorie, Quinte } from '@/components/resultats/LigneCourse'
import { LIBELLE_ECART, MARGE_ECART, URL_INSCRIPTION } from '@/config/site'
import {
  distance as formatDistance,
  hippodrome as formatHippodrome,
  jourLong,
  nomCourse as formatNomCourse,
  pourcent,
} from '@/lib/format'
import {
  allocation,
  arriveeConnue,
  cheminCourse,
  ecartPlus,
  cheminJournee,
  etatCourse,
  favoriDe,
  instantParis,
  probasMarche,
  repereCourse,
  slug,
  tonCategorie,
  type CoursePublique,
  type JourneePublique,
} from '@/lib/resultats'
import { chargerJournee } from '@/services/resultats'
import { useDonneesInitiales } from '@/lib/donnees-initiales'
import { decrire } from '@/lib/resultats-seo'
import { useTitre } from '@/lib/useTitre'

/**
 * L'ARRIVÉE D'UNE COURSE — `/resultats/AAAA-MM-JJ/{hippodrome}/c{n}-{slug}`.
 * C'est la page d'atterrissage : celle que trouve quelqu'un qui cherche une
 * arrivée, et le seul endroit où notre annonce et le résultat se regardent.
 *
 * TROIS CHAMPS DE LA MAQUETTE NE SONT PAS SERVIS, et c’est assumé : l’ALLOCATION,
 * le TERRAIN et le NUMÉRO DE RÉUNION. La raison n’est pas qu’ils manquent à la
 * base — c’est que les vues publiques reproduisent EXACTEMENT ce que lit
 * l’application (db/013), et que l’application ne les affiche pas non plus.
 * Le H1 perd donc son « Allocation 364 000 € » et son « R1C3 », et les huit
 * cases de caractéristiques tombent à cinq. Le jour où l’app les affichera, la
 * vue les ajoutera et ces cases reparaîtront ici sans retoucher la page.
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

/** La pastille « Écart + » — le marqueur de l'app, jamais le mot « value ». */
function Ecart() {
  return (
    <span className="shrink-0 px-2 py-[3px] rounded-full bg-accent/[0.12] text-accent text-[0.6875rem] font-bold">
      {LIBELLE_ECART}
    </span>
  )
}

/**
 * TOUS LES PARTANTS — le tableau de la maquette, colonne pour colonne :
 * Préd. · Arrivée · N° · Cheval et jockey · Chances de victoire · Placé · Cote.
 *
 * Il remplace une version à quatre colonnes (Place, N°, Cheval, Cote), écrite
 * quand les vues publiques ne servaient ni jockey, ni probabilité de place, ni
 * poids. La migration db/016 les sert ; il n'y avait plus de raison de s'en
 * passer.
 *
 * L'ORDRE EST CELUI DE L'ARRIVÉE, pas celui du pronostic : c'est ce que le
 * lecteur vient chercher. Les non-partants ferment la liste, sans place.
 */
function TousLesPartants({ course }: { course: CoursePublique }) {
  const marche = probasMarche(course)

  const lignes = [...course.liste].sort((a, b) => {
    if (a.nonPartant !== b.nonPartant) return a.nonPartant ? 1 : -1
    return (a.arrivee ?? 99) - (b.arrivee ?? 99) || a.numero - b.numero
  })

  if (!lignes.length) {
    return (
      <p className="text-[0.9375rem] leading-relaxed text-muted">
        Nos relevés n’ont pas rapporté la composition de cette course.
      </p>
    )
  }

  // Une colonne qui serait vide sur TOUTE la course ne s'affiche pas : mieux
  // vaut six colonnes pleines que huit dont deux sont muettes. C'est ce qui
  // fait que la page du jour et celle de la veille n'ont pas la même largeur,
  // et c'est voulu — le jockey n'arrive que la nuit suivante.
  const avecJockey = lignes.some((p) => p.jockey)
  const avecPlace = lignes.some((p) => p.pPlace != null)
  const avecCote = lignes.some((p) => p.cote != null)

  const colonnes = [
    'Préd.',
    'Arrivée',
    'N°',
    avecJockey ? 'Cheval · Jockey' : 'Cheval',
    'Chances de victoire',
    ...(avecPlace ? ['Placé'] : []),
    ...(avecCote ? ['Cote'] : []),
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto -mx-5 px-5 lg:mx-0 lg:px-0">
        <table className="w-full min-w-[40rem] border-collapse text-[0.9375rem]">
          <thead>
            <tr className="border-b border-line-strong">
              {colonnes.map((e) => (
                <th
                  key={e}
                  className="text-left font-bold py-2.5 pr-4 text-[0.75rem] uppercase tracking-[0.08em] text-faint whitespace-nowrap"
                >
                  {e}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lignes.map((p) => {
              const gagnant = p.arrivee === 1
              return (
                <tr key={p.numero} className={`border-b border-track ${p.nonPartant ? 'opacity-55' : ''}`}>
                  <td className="num py-3 pr-4 font-semibold text-faint">{p.rang ?? '—'}</td>
                  <td className={`num py-3 pr-4 font-extrabold ${gagnant ? 'text-accent' : 'text-soft'}`}>
                    {p.nonPartant ? 'NP' : (p.arrivee ?? '—')}
                  </td>
                  <td className="num py-3 pr-4 font-semibold text-soft">{p.numero}</td>
                  <td className="py-3 pr-4">
                    <span className="flex flex-col gap-[2px]">
                      <span className="font-semibold text-ink">{p.nom}</span>
                      {avecJockey && (
                        <span className="text-xs font-medium text-faint">
                          {p.jockey ?? '—'}
                          {p.poids != null && <span className="num"> · {p.poids} kg</span>}
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="flex items-center gap-2">
                      <span className="num font-semibold text-soft">{pourcent(p.pWin)}</span>
                      {ecartPlus(p.pWin, marche.get(p.numero)) && <Ecart />}
                    </span>
                  </td>
                  {avecPlace && <td className="num py-3 pr-4 text-soft">{pourcent(p.pPlace)}</td>}
                  {avecCote && (
                    // Une cote absente se dit, elle ne devient pas un tiret
                    // muet : elle est relevée APRÈS la course.
                    <td className="num py-3 pr-4 text-soft">
                      {p.cote != null ? p.cote.toFixed(1) : <span className="text-dim">non relevée</span>}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs font-medium leading-relaxed text-faint">
        «&nbsp;Préd.&nbsp;» est le rang que nous avions publié le matin même.{' '}
        {avecCote && 'Les cotes sont des cotes de clôture, relevées après la course : notre modèle ne les lit pas. '}
        {LIBELLE_ECART} signale que notre probabilité dépasse d’au moins {pourcent(MARGE_ECART)} celle qu’implique la
        cote, marge de l’opérateur retirée. Un pourcentage décrit une fréquence attendue, pas l’issue d’une course.
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

  // Ce que le rendu serveur a déjà lu, s’il porte bien SUR CETTE JOURNÉE :
  // au navigateur, une navigation interne vers une autre date retomberait
  // sinon sur la journée semée au premier chargement.
  const semee = useDonneesInitiales()?.journee
  const preparee = semee && jour && semee.jour === jour ? semee : null

  const [journee, setJournee] = useState<JourneePublique | null>(preparee)
  const [erreur, setErreur] = useState(false)

  // On charge LA JOURNÉE, pas la seule course : l'adresse porte un slug
  // d'hippodrome (`la-roche-posay`) alors que la base garde la graphie source
  // (`LA-ROCHE-POSAY`). Replier la journée évite d'inventer une table de
  // correspondance — et donne les autres courses de la réunion sans requête
  // supplémentaire.
  useEffect(() => {
    if (!jour || preparee) return
    let vivant = true
    chargerJournee(jour)
      .then((j) => vivant && setJournee(j))
      .catch(() => vivant && setErreur(true))
    return () => {
      vivant = false
    }
  }, [jour, preparee])

  const course = journee?.courses.find((c) => c.numero === numero && slug(c.hippodrome) === lieu)

  // LE MÊME TITRE QUE LE HTML SERVI — voir le commentaire jumeau dans
  // `Resultats.tsx`. `numero` peut être `NaN` sur une adresse mal formée : on
  // ne demande alors aucune tête, sinon `decrire` renverrait celle de la
  // journée sur une page qui n'existe pas.
  const tete = useMemo(
    () =>
      Number.isInteger(numero)
        ? decrire({ jour: jour ?? null, lieu: lieu ?? null, numero }, journee)
        : null,
    [jour, lieu, numero, journee],
  )
  useTitre(tete ? tete.titre : 'Résultat d’une course', { suffixe: !tete })

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
        {(tonCategorie(course.categorie) || course.quinte) && (
          <span className="flex flex-wrap items-center gap-2">
            <Categorie valeur={course.categorie} />
            {course.quinte && <Quinte />}
          </span>
        )}
        <h1 className="text-[1.75rem] lg:text-[2.3125rem] font-extrabold tracking-[-0.03em] leading-[1.05]">
          {arriveeConnue(etat) ? 'Arrivée' : 'Programme'} du {formatNomCourse(course.nom, course.numero)} —{' '}
          {formatHippodrome(course.hippodrome)}{' '}
          {repereCourse(course)}
        </h1>
        {/* Le récapitulatif en une ligne de la maquette. */}
        <p className="num text-[0.9375rem] font-medium text-muted">
          {[
            course.categorie,
            course.handicap ? 'Handicap' : null,
            course.discipline,
            course.distance != null ? formatDistance(course.distance) : null,
            `${course.partants} partants`,
            course.heureDepart ? `départ à ${course.heureDepart}` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>

      {/* ON N'AFFICHE QUE CE QU'ON A, et la règle survit au fait que la base
          en donne désormais beaucoup plus (db/016). Discipline et allocation
          ne sont plus les cases mortes qu'elles étaient : la discipline sort à
          100 %, l'allocation et le terrain seulement là où la source les joint
          — environ un tiers des courses aujourd'hui, le plat uniquement. Une
          case sans valeur ne se rend pas, et la grille se referme : c'est ce
          qui permet d'ajouter une source partielle sans dégrader la page des
          courses qu'elle ne couvre pas. */}
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
            {arriveeConnue(etat) ? 'Tous les partants' : 'Cette course n’a pas encore d’arrivée'}
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
            <TousLesPartants course={course} />
            {etat === 'provisoire' && (
              <p className="text-[0.8125rem] font-medium text-faint">
                Cette arrivée n’est pas encore définitive&nbsp;: elle peut être modifiée.
              </p>
            )}
          </>
        ) : (
          <p className="text-[0.9375rem] leading-relaxed text-muted">
            {etat === 'aVenir'
              ? 'Le départ n’est pas encore donné. L’arrivée paraîtra ici dès que nos relevés la rapportent.'
              : etat === 'departDonne'
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
