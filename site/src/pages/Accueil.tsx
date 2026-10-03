import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ExempleCourse } from '@/components/accueil/ExempleCourse'
import { Accordeon, type Question } from '@/components/ui/Accordeon'
import {
  AVERTISSEMENT,
  CONTACT,
  FORMULES,
  HEURE_RELEVE,
  NOTE_NON_PARTANTS,
  RYTHME_PUBLICATION,
  URL_INSCRIPTION,
  URL_RESULTATS,
  inscrireAvec,
  type Formule,
} from '@/config/site'
import { useTitre } from '@/lib/useTitre'

/**
 * L'ACCUEIL PUBLIC — `design/screens/Landing.dc.html` et `LandingMobile`.
 *
 * Héros et exemple de course, quatre atouts, trois étapes, la transparence, les
 * tarifs, la mise en garde, la FAQ. Écarts à la maquette (design/INTEGRATION.md,
 * lot 7) : le vocabulaire du pari est banni (positionnement strict, confirmé le
 * 18/09/2026) ; « Value » devient l'écart au marché ; rien n'est promis que
 * l'application ne fasse — pas de cote « en direct », pas de facteurs du
 * pronostic, pas de suivis ni d'alertes ; le modèle ne lit pas les cotes.
 */

/** Titre de section : 25 px sur téléphone, 34 px sur grand écran (maquette : 28 et 40, réduits le 18/09). */
function TitreSection({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2 id={id} className="text-[1.5625rem] lg:text-[2.125rem] font-extrabold tracking-[-0.025em] leading-tight">
      {children}
    </h2>
  )
}

/** Les pictogrammes des atouts, tracés comme dans la maquette. */
const PICTOS = {
  arrivee: 'M5 20V12M12 20V5M19 20v-8',
  pourcentage: 'M12 3a9 9 0 1 0 9 9h-9z M14 3.3A9 9 0 0 1 20.7 10H14z',
  marche: 'M4 17l5-5 4 4 7-8M15 8h5v5',
  fiches: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z',
}

const ATOUTS: { picto: keyof typeof PICTOS; titre: string; texte: string }[] = [
  {
    picto: 'arrivee',
    titre: 'L’arrivée prédite, course par course',
    texte: 'Pour chaque course de galop du jour, l’ordre d’arrivée que notre modèle juge le plus probable.',
  },
  {
    picto: 'pourcentage',
    titre: 'Un pourcentage sur chaque partant',
    texte: 'Victoire et place chiffrées pour chacun, et un niveau de confiance sur la course entière. Vous voyez qui notre modèle attend devant, et de combien.',
  },
  {
    picto: 'marche',
    titre: 'La cote en face de nos chiffres',
    texte: 'Sur les réunions cotées, la cote de clôture de chaque partant à côté de nos pourcentages, et un marqueur sur ceux que notre modèle voit plus haut que le marché.',
  },
  {
    picto: 'fiches',
    titre: 'Le dossier de chaque partant',
    texte: 'La fiche du cheval, celle de son jockey, celle de son entraîneur, et un comparateur pour poser deux ou trois partants côte à côte.',
  },
]

const ETAPES: { titre: string; texte: string }[] = [
  {
    titre: 'Nous analysons chaque partant',
    texte: 'Valeur du cheval, forme récente, distance, catégorie, taille du peloton, jockey, entraîneur. Ni la presse, ni les informations d’écurie, ni les cotes.',
  },
  {
    titre: 'Nous chiffrons les chances de chacun',
    texte: 'Le résultat : un pourcentage pour chaque partant, en victoire et en place. Les pourcentages de victoire s’additionnent à 100 %.',
  },
  {
    titre: 'Vous lisez, et vous vérifiez',
    texte: 'Arrivée prédite, pourcentages, niveau de confiance, écart au marché : chaque chiffre est expliqué, et vérifiable dans nos résultats publiés.',
  },
]

const prixDe = (cle: string) => FORMULES.find((f) => f.cle === cle)?.prix ?? ''

const QUESTIONS: Question[] = [
  {
    // La première question est ouverte par défaut : elle dit ce que le lecteur reçoit.
    // Le positionnement, posé SANS le vocabulaire banni, ferme la liste.
    q: 'Que contient un pronostic ?',
    r: 'Pour chaque course de galop du jour, en France : l’arrivée que notre modèle juge la plus probable, et pour chaque partant son pourcentage de victoire et son pourcentage de place. S’y ajoutent le niveau de confiance de la course, les fiches du cheval, du jockey et de l’entraîneur, et un comparateur de deux ou trois partants. Sur les réunions cotées, nous publions ensuite la cote de clôture en regard de nos pourcentages.',
  },
  {
    q: 'Comment lire un pourcentage ?',
    r: 'Comme une fréquence attendue. 34 % signifie que sur 100 courses semblables, ce cheval en gagnerait environ 34. L’essentiel est la distance entre notre favori et les suivants, qui montre à quel point il se détache.',
  },
  {
    q: 'Quand paraissent les pronostics ?',
    r: `${RYTHME_PUBLICATION} Les probabilités publiées sont définitives. Nous ne les recalculons jamais, même après un retrait. Les arrivées sont relevées le jour même, puis complétées le soir vers ${HEURE_RELEVE}. ${NOTE_NON_PARTANTS}`,
  },
  {
    q: 'D’où viennent les données ?',
    r: 'Des programmes et des résultats officiels des courses françaises de galop, et des performances publiées par France Galop pour les fiches des chevaux, des jockeys et des entraîneurs. Nous ne sommes pas partenaires de France Galop. Les cotes sont celles de clôture, relevées après la course ; depuis août 2026, environ quatre réunions sur dix n’en ont pas.',
  },
  {
    q: 'Quelle différence entre les Pass ?',
    r: `Les trois Pass ouvrent exactement les mêmes pronostics, sur toutes les courses du jour. Le Pass 1 jour (${prixDe('jour')}) est un paiement unique qui donne accès à tout pendant 24 h, sans renouvellement. Le Pass mensuel (${prixDe('mois')}) et le Pass annuel (${prixDe('an')}, soit 8,25 € par mois) se renouvellent aussi longtemps que vous le souhaitez.`,
  },
  {
    q: 'Puis-je résilier à tout moment ?',
    r: `Oui, en ligne et en quelques clics. Les Pass mensuel et annuel sont sans engagement : depuis Mon compte, le portail de paiement vous laisse changer de formule ou résilier vous-même. Vous gardez l’accès jusqu’au bout de la période payée. Une question sur votre abonnement, écrivez-nous à ${CONTACT}. Le Pass 1 jour, lui, s’arrête tout seul au bout de 24 h.`,
  },
  {
    q: 'Sommes-nous un opérateur de jeux ou un service de conseil ?',
    r: 'Non, et c’est ce qui fonde notre indépendance. Crosswell est un éditeur d’analyses statistiques. Nous ne recevons aucune somme liée à l’issue des courses, et nous ne recommandons aucune action. Nous publions des probabilités mesurées et l’historique de leur réussite. Ce que chacun fait de ces analyses lui appartient entièrement.',
  },
]

function Coche() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden className="shrink-0 mt-px">
      <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="rgb(var(--c-accent))" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CarteFormule({ f }: { f: Formule }) {
  return (
    <div
      className={`relative flex flex-col gap-5 p-6 lg:p-7 rounded-[1.375rem] bg-surface border ${f.vedette ? 'border-accent' : 'border-line'}`}
    >
      {f.vedette && (
        <span className="absolute -top-[0.8125rem] left-6 lg:left-7 text-[0.6875rem] font-extrabold uppercase tracking-[0.08em] text-accent-ink bg-accent rounded-full px-2.5 py-[5px]">
          Recommandé
        </span>
      )}
      <h3 className="text-[1.0625rem] font-bold">{f.nom}</h3>
      <div className="num flex items-baseline gap-1.5">
        <span className="text-[1.875rem] font-extrabold tracking-[-0.02em] leading-none">{f.prix}</span>
        <span className="text-sm font-semibold text-faint">{f.periode}</span>
      </div>
      <span className="num -mt-3 min-h-5 text-[0.8125rem] font-semibold text-accent">{f.precision}</span>
      <ul className="flex flex-col gap-2.5 grow">
        {f.points.map((p) => (
          <li key={p} className="flex gap-2.5 text-sm font-medium leading-normal text-soft">
            <Coche />
            {p}
          </li>
        ))}
      </ul>
      {/* L'inscription de l'app, la formule déjà cochée. */}
      <a
        href={inscrireAvec(f.cle)}
        className={`h-12 rounded-full flex items-center justify-center text-[0.9375rem] font-bold transition-colors ${
          f.vedette ? 'bg-accent text-accent-ink hover:bg-accent-hover' : 'border border-line-strong hover:border-line-hover'
        }`}
      >
        {f.action}
      </a>
    </div>
  )
}

export default function Accueil() {
  useTitre(null)

  return (
    <div className="flex flex-col">
      {/* ── Héros ─────────────────────────────────────────────────────────── */}
      <section className="grid gap-8 lg:gap-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] items-center px-5 lg:px-20 pt-9 lg:pt-[5.5rem] pb-2 lg:pb-10">
        <div className="flex flex-col gap-5 lg:gap-6 animate-fade-up">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-accent">
            Pronostics hippiques · toutes les courses de galop du jour
          </span>
          <h1 className="text-[2.125rem] lg:text-[3.3125rem] font-extrabold tracking-[-0.035em] leading-[1.02] [text-wrap:balance]">
            Chaque matin, l’arrivée la plus probable.
          </h1>
          <p className="max-w-[33.75rem] text-[0.9375rem] lg:text-[1.125rem] font-medium leading-relaxed text-muted">
            Notre modèle chiffre les chances de chaque partant&nbsp;: pourcentage de victoire, pourcentage de place,
            niveau de confiance par course. Il ne lit ni les cotes, ni la presse. Vous lisez des nombres, pas des impressions.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={URL_INSCRIPTION}
              className="h-[3.375rem] px-7 rounded-full bg-accent text-accent-ink flex items-center justify-center text-[0.9375rem] font-bold hover:bg-accent-hover transition-colors"
            >
              Essayer gratuitement
            </a>
            <Link
              to="/methode"
              className="h-[3.375rem] px-7 rounded-full border border-line-strong flex items-center justify-center text-[0.9375rem] font-bold hover:border-line-hover transition-colors"
            >
              Comment ça marche
            </Link>
          </div>
          <span className="text-[0.8125rem] font-medium text-faint">
            Un pronostic complet offert chaque jour · sans carte bancaire · accès à partir de {AVERTISSEMENT.ageMinimum}&nbsp;ans
          </span>
        </div>
        {/* L'EXEMPLE DE COURSE N'EXISTE QUE SUR GRAND ÉCRAN. Sur téléphone, il
            poussait les tarifs et les arguments sous un écran entier de chiffres
            fictifs, avant même d'avoir dit ce que fait le produit — et il
            n'illustre rien qu'un visiteur ne découvre mieux dans l'application.
            Arbitrage du fondateur, 03/10/2026. */}
        <div className="hidden lg:block animate-fade-up [animation-delay:80ms]">
          <ExempleCourse />
        </div>
      </section>

      {/* ── Atouts ────────────────────────────────────────────────────────── */}
      <section aria-labelledby="t-atouts" className="flex flex-col gap-7 px-5 lg:px-20 pt-14 lg:pt-24">
        <TitreSection id="t-atouts">Ce que vous lisez sur chaque course</TitreSection>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {ATOUTS.map((a) => (
            <div key={a.titre} className="flex flex-col gap-3 p-6 rounded-3xl bg-surface border border-line">
              <span className="w-11 h-11 rounded-xl bg-accent/[0.12] grid place-items-center">
                <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
                  <path d={PICTOS[a.picto]} fill="none" stroke="rgb(var(--c-accent))" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <h3 className="text-[1.0625rem] font-bold">{a.titre}</h3>
              <p className="text-sm font-medium leading-relaxed text-muted">{a.texte}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Comment ça marche ─────────────────────────────────────────────── */}
      <section aria-labelledby="t-etapes" className="flex flex-col gap-7 px-5 lg:px-20 pt-14 lg:pt-24">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 sm:gap-6">
          <TitreSection id="t-etapes">Comment nous arrivons à ces chiffres</TitreSection>
          <Link to="/methode" className="text-[0.9375rem] font-bold text-accent hover:text-accent-hover">
            Entrer dans le détail de la méthode
          </Link>
        </div>
        <ol className="grid gap-3.5 lg:grid-cols-3">
          {ETAPES.map((e, i) => (
            <li key={e.titre} className="flex flex-col gap-3 p-6 rounded-3xl border border-line">
              <span className="num w-10 h-10 rounded-full bg-accent text-accent-ink grid place-items-center text-[1rem] font-extrabold">
                {i + 1}
              </span>
              <h3 className="text-[1.0625rem] font-bold">{e.titre}</h3>
              <p className="text-sm font-medium leading-relaxed text-muted">{e.texte}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Transparence ──────────────────────────────────────────────────── */}
      <section className="mx-5 lg:mx-20 mt-14 lg:mt-24 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 lg:gap-12 px-[1.375rem] py-7 lg:px-14 lg:py-12 rounded-4xl bg-surface border border-line">
        <div className="flex flex-col gap-3 max-w-[43.75rem]">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Résultats publiés</span>
          <h2 className="text-[1.4375rem] lg:text-[1.8125rem] font-extrabold tracking-[-0.02em] leading-[1.15]">
            Jugez-nous sur pièces&nbsp;: tous nos pronostics confrontés à l’arrivée officielle, et publiés. Tous, sans tri.
          </h2>
          <p className="text-[0.9375rem] font-medium leading-relaxed text-muted">
            Filtrez par période, type de course, distance ou hippodrome. Chaque taux s’affiche avec son effectif.
          </p>
        </div>
        <a
          href={URL_RESULTATS}
          className="shrink-0 h-[3.25rem] px-[1.625rem] rounded-full border border-line-strong flex items-center justify-center text-[0.9375rem] font-bold hover:border-line-hover transition-colors"
        >
          Voir tous nos résultats
        </a>
      </section>

      {/* ── Tarifs ────────────────────────────────────────────────────────── */}
      <section id="tarifs" aria-labelledby="t-tarifs" className="flex flex-col gap-8 px-5 lg:px-20 pt-14 lg:pt-24">
        <div className="flex flex-col gap-2.5">
          <TitreSection id="t-tarifs">Des tarifs clairs, sans engagement</TitreSection>
          <p className="text-[0.9375rem] font-medium text-muted">
            Une course offerte chaque jour, sans carte bancaire. Un Pass ouvre toutes les courses du jour, le temps d’une
            journée, d’un mois ou d’une année.
          </p>
        </div>
        <div className="grid gap-3.5 pt-2 sm:grid-cols-2 lg:grid-cols-4">
          {FORMULES.map((f) => (
            <CarteFormule key={f.cle} f={f} />
          ))}
        </div>
        <p className="-mt-2 text-[0.8125rem] font-medium leading-relaxed text-faint">
          Prix TTC. Paiement sécurisé par Stripe&nbsp;: aucune donnée bancaire ne transite par Crosswell. Carte, factures, changement de formule et résiliation se gèrent en ligne, depuis Mon compte.
        </p>
      </section>

      {/* ── Mise en garde ─────────────────────────────────────────────────── */}
      <section className="mx-5 lg:mx-20 mt-10 lg:mt-14 flex gap-4 px-6 py-[1.375rem] rounded-2xl border border-dashed border-line-strong">
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden className="shrink-0">
          <path d="M12 3l9 16H3zM12 10v4M12 17h.01" fill="none" stroke="rgb(var(--c-ink))" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="text-sm font-medium leading-relaxed text-soft">
          <strong className="text-ink">Pour lire nos pourcentages comme nous les écrivons</strong>&nbsp;: une probabilité est une estimation,
          aucun résultat n’est garanti, et les performances passées ne
          préjugent pas des résultats futurs. C’est pour cela que nous mesurons chaque pronostic, et que nous publions ce qu’il a donné.
        </p>
      </section>

      {/* ── Questions ─────────────────────────────────────────────────────── */}
      <section aria-labelledby="t-faq" className="flex flex-col gap-5 px-5 lg:px-20 pt-14 lg:pt-24 pb-14 lg:pb-24">
        <TitreSection id="t-faq">Questions fréquentes</TitreSection>
        <Accordeon questions={QUESTIONS} />
      </section>
    </div>
  )
}
