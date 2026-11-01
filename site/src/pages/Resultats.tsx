import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Calendrier } from '@/components/resultats/Calendrier'
import { ListeJournee } from '@/components/resultats/LigneCourse'
import { Accordeon, type Question } from '@/components/ui/Accordeon'
import {
  LIBELLE_ECART,
  NOTE_NON_PARTANTS,
  RYTHME_PUBLICATION_COURT,
  URL_CONNEXION,
  URL_INSCRIPTION,
} from '@/config/site'
import { jourLong } from '@/lib/format'
import { CHEMIN_ARCHIVES, cheminJournee, compterJournee, instantParis, type JourneePublique } from '@/lib/resultats'
import { chargerJournee, chargerJourneesDisponibles } from '@/services/resultats'
import { useDonneesInitiales } from '@/lib/donnees-initiales'
import { decrire } from '@/lib/resultats-seo'
import { useTitre } from '@/lib/useTitre'

/**
 * LES RÉSULTATS D'UNE JOURNÉE — `/resultats` et `/resultats/AAAA-MM-JJ`.
 *
 * Les données viennent des vues publiques `resultats_publics` et
 * `programme_public` (migrations db/013 et db/014). Le verrou est en base :
 * une course pas encore jugée n'a aucune probabilité à montrer, parce qu'elle
 * n'en a aucune dans la vue.
 *
 * LA ROUTE RESTE ABSENTE DE `PAGES` dans `scripts/apres-build.mjs` : sans
 * fichier HTML, elle répond 404 en production. On l'ouvrira avec le rendu
 * serveur — publier aujourd'hui une page dont le HTML servi est vide
 * reviendrait à offrir à Google des milliers d'adresses sans contenu.
 *
 * L'instant de Paris est lu ICI, une fois, et passé en props : voir
 * `instantParis`.
 */

const QUESTIONS: Question[] = [
  {
    q: 'Quand les résultats paraissent-ils ?',
    r: `L’arrivée est publiée dès que nos relevés la rapportent, dans la journée de la course. ${RYTHME_PUBLICATION_COURT} Une fois publiées, les probabilités ne sont jamais recalculées : ce que vous lisez après la course est exactement ce que nous avions annoncé avant.`,
  },
  {
    q: 'Pourquoi certaines courses n’affichent-elles pas de pronostic ?',
    r: 'Le pronostic détaillé des courses à venir est réservé aux détenteurs d’un Pass. Une course complète est offerte chaque jour, sans carte bancaire. Les courses déjà courues, elles, sont consultables par tout le monde : notre favori, la probabilité que nous avions annoncée, et sa place réelle.',
  },
  {
    q: 'Que signifie « notre favori » ?',
    r: 'C’est le cheval que notre modèle classe premier, avec sa probabilité de victoire. Il est publié le matin même, avant la course. Un favori annoncé à 30 % gagne environ trois courses sur dix : le pourcentage décrit une fréquence attendue, pas une issue.',
  },
  {
    q: 'Pourquoi certaines cotes sont-elles absentes ?',
    r: 'Les cotes que nous affichons sont des cotes de clôture, relevées après la course : elles n’existent donc pas le jour même, et environ quatre réunions sur dix n’en ont aucune (constat d’août 2026). Notre modèle ne les lit pas — elles servent de point de comparaison, jamais d’entrée de calcul.',
  },
  { q: 'Comment les non-partants sont-ils traités ?', r: NOTE_NON_PARTANTS },
]

function Resume({ journee, maintenant }: { journee: JourneePublique; maintenant: { jour: string; minutes: number } }) {
  const c = compterJournee(journee, maintenant)
  const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`
  const bouts = [
    c.definitives > 0 ? pluriel(c.definitives, 'course terminée', 'courses terminées') : null,
    c.provisoires > 0 ? pluriel(c.provisoires, 'arrivée provisoire', 'arrivées provisoires') : null,
    c.departDonne > 0 ? pluriel(c.departDonne, 'départ donné', 'départs donnés') : null,
    c.aVenir > 0 ? `${c.aVenir} à venir` : null,
    c.nonRelevees > 0 ? pluriel(c.nonRelevees, 'non relevée', 'non relevées') : null,
  ].filter(Boolean)

  return <p className="text-[0.9375rem] font-medium text-muted">{bouts.join(' · ') || 'Aucune course ce jour-là.'}</p>
}

function Bandeau({ nombre }: { nombre: number }) {
  if (nombre === 0) return null
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 rounded-2xl bg-surface border border-line">
      {/* Le texte de la maquette, moins le mot « Value » : c'est « Écart + »
          qui le remplace partout (LIBELLE_ECART), et « sans carte bancaire »
          dit ce que « formule gratuite » laissait deviner. */}
      <span className="flex flex-col gap-1 min-w-0">
        <span className="text-[0.9375rem] font-semibold">
          {nombre} course{nombre > 1 ? 's' : ''} à venir aujourd’hui
        </span>
        <span className="text-[0.8125rem] font-medium leading-relaxed text-muted">
          Arrivée prédite, pourcentages et {LIBELLE_ECART} sont réservés aux membres. Une course est offerte chaque
          jour, sans carte bancaire.
        </span>
      </span>
      <span className="flex gap-2.5 shrink-0">
        <a
          href={URL_INSCRIPTION}
          rel="noopener noreferrer"
          className="h-11 px-5 rounded-full bg-accent text-accent-ink flex items-center text-[0.875rem] font-bold hover:bg-accent-hover transition-colors"
        >
          Essayer gratuitement
        </a>
        <a
          href={URL_CONNEXION}
          rel="noopener noreferrer"
          className="h-11 px-5 rounded-full border border-line-strong flex items-center text-[0.875rem] font-bold hover:border-line-hover transition-colors"
        >
          Se connecter
        </a>
      </span>
    </div>
  )
}

export default function Resultats() {
  const { jour } = useParams()
  // Un seul calcul par montage : sans cela, chaque rendu décale les minutes.
  const maintenant = useMemo(instantParis, [])
  // Ce que le rendu serveur a déjà lu pour cette adresse, s'il y en a.
  const initiales = useDonneesInitiales()

  const [journees, setJournees] = useState<string[] | null>(initiales?.journees ?? null)
  const [journee, setJournee] = useState<JourneePublique | null>(initiales?.journee ?? null)
  const [erreur, setErreur] = useState<string | null>(null)

  // La journée demandée, ou CELLE DU JOUR. Même règle que la fonction
  // `api/resultats`, et c'est la condition pour que `/resultats` ne montre pas
  // deux jours différents selon qu'elle est rendue au serveur ou ici.
  //
  // Le repli sur la journée la plus récente est plus bas, après chargement :
  // il faut avoir vu qu'aujourd'hui n'a aucune course pour s'en détourner, et
  // `journees` ne le dit pas — cette liste ne connaît que les jours DÉJÀ jugés,
  // alors qu'aujourd'hui a un programme dès le matin.
  const demande = jour ?? maintenant.jour

  useEffect(() => {
    if (initiales?.journees) return
    let vivant = true
    chargerJourneesDisponibles()
      .then((j) => vivant && setJournees(j))
      .catch(() => vivant && setErreur('Les résultats ne sont pas joignables pour le moment.'))
    return () => {
      vivant = false
    }
  }, [initiales])

  useEffect(() => {
    if (!demande) return
    if (initiales?.journee?.jour === demande) return
    let vivant = true
    setJournee(null)
    chargerJournee(demande)
      // Un jour sans aucune course — un lundi de janvier — et pas de date dans
      // l'adresse : on retombe sur la journée servie la plus récente, plutôt
      // que d'ouvrir la rubrique sur une page vide.
      .then(async (j) => {
        if (j.courses.length === 0 && !jour && journees?.[0] && journees[0] !== demande) {
          return chargerJournee(journees[0])
        }
        return j
      })
      .then((j) => vivant && setJournee(j))
      .catch(() => vivant && setErreur('Les résultats ne sont pas joignables pour le moment.'))
    return () => {
      vivant = false
    }
  }, [demande, initiales, jour, journees])

  // LE MÊME TITRE QUE LE HTML SERVI, calculé par le même code. `api/resultats`
  // appelle `decrire` pour écrire la balise `<title>` ; si cette page en posait
  // un autre, le robot recevrait un titre et en lirait un second après avoir
  // exécuté le JavaScript. D'où `suffixe: false` : le titre de `decrire` porte
  // déjà la marque et tient sous soixante signes. Même règle que les articles.
  //
  // `jour` vient de l'adresse, PAS de la journée affichée : sur `/resultats`
  // sans date, le serveur sert le titre de la rubrique, et l'onglet doit dire
  // la même chose même si le corps montre les courses du jour.
  const tete = useMemo(
    () => decrire({ jour: jour ?? null, lieu: null, numero: null }, journee),
    [jour, journee],
  )
  useTitre(tete ? tete.titre : 'Résultats des courses', { suffixe: !tete })

  const cadre = 'w-full max-w-[75rem] mx-auto px-5 lg:px-10 pt-7 lg:pt-12 pb-14 lg:pb-24 flex flex-col gap-7 lg:gap-9'

  if (erreur) {
    return (
      <div className={cadre}>
        <h1 className="text-[1.75rem] font-extrabold tracking-[-0.03em]">Résultats des courses</h1>
        <p className="text-[0.9375rem] leading-relaxed text-muted">{erreur}</p>
      </div>
    )
  }

  if (!journee) {
    return (
      <div className={cadre}>
        <p className="text-[0.9375rem] text-faint" role="status">
          Chargement des résultats…
        </p>
      </div>
    )
  }

  const compte = compterJournee(journee, maintenant)
  const precedentes = (journees ?? []).filter((j) => j < journee.jour).slice(0, 6)

  return (
    <div className={cadre}>
      <nav aria-label="Fil d’Ariane" className="text-xs font-medium text-faint">
        <Link to="/" className="hover:text-ink">
          Accueil
        </Link>
        <span aria-hidden> / </span>
        <span className="text-soft">Résultats des courses</span>
      </nav>

      {/* Le calendrier est À DROITE DU TITRE, comme la maquette. Il était passé
          sous le titre en pleine largeur le 21/10, le temps où je l'avais
          remplacé par un rail de pastilles — une maquette plus ancienne n'en
          montrait pas, celle qui fait foi en a un. */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="flex flex-col gap-3 max-w-[42rem]">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Résultats des courses</span>
          <h1 className="text-[1.75rem] lg:text-[2.3125rem] font-extrabold tracking-[-0.03em] leading-[1.05] first-letter:uppercase">
            Courses du {jourLong(journee.jour)}
          </h1>
          <p className="text-[0.9375rem] lg:text-[1rem] font-medium leading-relaxed text-muted">
            L’arrivée de chaque course de galop, réunion par réunion — et, en face, ce que notre modèle avait annoncé
            le matin même, qu’il ait eu raison ou non.
          </p>
          <Resume journee={journee} maintenant={maintenant} />
        </div>
        <Calendrier jourCourant={journee.jour} aujourdhui={maintenant.jour} journees={journees ?? []} />
      </div>

      <Bandeau nombre={compte.aVenir} />

      {journee.courses.length > 0 ? (
        <ListeJournee courses={journee.courses} maintenant={maintenant} />
      ) : (
        <p className="text-[0.9375rem] leading-relaxed text-muted">Aucune course publiée ce jour-là.</p>
      )}

      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-[1.375rem] py-6 lg:px-10 lg:py-8 rounded-3xl bg-surface border border-line">
        <div className="flex flex-col gap-2 max-w-[38rem]">
          <h2 className="text-[1.1875rem] lg:text-[1.4375rem] font-extrabold tracking-[-0.02em]">
            Nos résultats, mesurés
          </h2>
          <p className="text-[0.9375rem] font-medium leading-relaxed text-muted">
            Comptés sur toutes les courses publiées, sans en écarter aucune, et affichés avec leur effectif. Le détail,
            filtre par filtre, est dans l’application.
          </p>
        </div>
        <a
          href={URL_INSCRIPTION}
          rel="noopener noreferrer"
          className="shrink-0 h-[3.25rem] px-[1.625rem] rounded-full border border-line-strong flex items-center justify-center text-[0.9375rem] font-bold hover:border-line-hover transition-colors"
        >
          Le détail, filtre par filtre
        </a>
      </section>

      {precedentes.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-[1.0625rem] font-bold">Journées précédentes</h2>
          <div className="flex flex-wrap gap-2">
            {precedentes.map((j) => (
              <Link
                key={j}
                to={cheminJournee(j)}
                className="px-4 h-11 rounded-full bg-surface border border-line flex items-center text-[0.875rem] font-semibold text-soft hover:border-line-hover transition-colors first-letter:uppercase"
              >
                {jourLong(j)}
              </Link>
            ))}
          </div>
          <Link to={CHEMIN_ARCHIVES} className="self-start text-[0.9375rem] font-bold text-accent hover:text-accent-hover">
            Toutes les journées
          </Link>
        </section>
      )}

      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 rounded-2xl bg-surface border border-line">
        <span className="text-[0.9375rem] font-medium text-muted">
          Disciplines, tailles de peloton, favori du marché&nbsp;: toutes ces courses, mises en chiffres.
        </span>
        <a href="/statistiques" className="shrink-0 text-[0.9375rem] font-bold text-accent hover:text-accent-hover">
          Voir les statistiques
        </a>
      </section>

      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 rounded-2xl bg-surface border border-line">
        <span className="text-[0.9375rem] font-medium text-muted">
          Comprendre ce que vous lisez&nbsp;: nos articles expliquent les pourcentages et la façon dont nous les
          mesurons.
        </span>
        <Link to="/blog" className="shrink-0 text-[0.9375rem] font-bold text-accent hover:text-accent-hover">
          Aller au blog
        </Link>
      </section>

      <section aria-labelledby="t-faq-resultats" className="flex flex-col gap-5 pt-2">
        <h2 id="t-faq-resultats" className="text-[1.4375rem] lg:text-[1.8125rem] font-extrabold tracking-[-0.02em]">
          Questions fréquentes
        </h2>
        <Accordeon questions={QUESTIONS} />
      </section>
    </div>
  )
}
