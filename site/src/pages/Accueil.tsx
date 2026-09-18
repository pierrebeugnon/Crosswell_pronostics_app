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
    titre: 'L’arrivée la plus probable',
    texte: 'Pour chaque course du jour et du lendemain, l’ordre d’arrivée que le modèle juge le plus probable.',
  },
  {
    picto: 'pourcentage',
    titre: 'Des chances en pourcentage',
    texte: 'Chaque partant a son pourcentage de victoire et de place. Vous voyez qui est attendu devant, et avec quel écart.',
  },
  {
    picto: 'marche',
    titre: 'Cotes et écarts au marché',
    texte: 'La cote relevée de chaque partant, et ceux que le modèle voit plus haut que ce qu’elle implique.',
  },
  {
    picto: 'fiches',
    titre: 'Fiches et comparateur',
    texte: 'La fiche de chaque cheval, de son jockey et de son entraîneur, et un comparateur pour mettre deux ou trois partants côte à côte.',
  },
]

const ETAPES: { titre: string; texte: string }[] = [
  {
    titre: 'Le modèle analyse chaque partant',
    texte: 'Valeur du cheval, forme récente, distance, catégorie, taille du peloton, jockey, entraîneur. Il ne regarde pas les cotes.',
  },
  {
    titre: 'Il estime les chances de chacun',
    texte: 'Le résultat : une probabilité de victoire par cheval. Elles s’additionnent à 100 %.',
  },
  {
    titre: 'Vous lisez, vous jugez',
    texte: 'Arrivée prédite, niveau de confiance, écart au marché : tout est expliqué, rien n’est promis.',
  },
]

const prixDe = (cle: string) => FORMULES.find((f) => f.cle === cle)?.prix ?? ''

const QUESTIONS: Question[] = [
  {
    // Posée SANS le vocabulaire banni, même pour le nier : « opérateur de jeux »
    // est la formule que le site emploie déjà.
    q: 'Est-ce un opérateur de jeux ou un service de conseil ?',
    r: 'Non. Crosswell publie des analyses statistiques sur les courses hippiques : des probabilités mesurées, accompagnées de leur historique de réussite. Nous ne recevons aucune somme liée à l’issue des courses et ne recommandons aucune action. Ce que chacun fait de ces analyses lui appartient entièrement.',
  },
  {
    q: 'Un pourcentage élevé veut-il dire que le cheval va gagner ?',
    r: 'Non. 34 % signifie que sur 100 courses semblables, ce cheval en gagnerait environ 34, et pas les 66 autres. Un pronostic reste une probabilité, jamais une certitude.',
  },
  {
    q: 'Quand paraissent les pronostics ?',
    r: `${RYTHME_PUBLICATION} Une fois publiées, les probabilités ne sont plus recalculées. Les arrivées sont relevées le jour même, puis complétées le soir vers ${HEURE_RELEVE}. ${NOTE_NON_PARTANTS}`,
  },
  {
    q: 'D’où viennent les données ?',
    r: 'Des programmes et des résultats officiels des courses françaises de galop, et des performances publiées par France Galop pour les fiches des chevaux, des jockeys et des entraîneurs. Nous ne sommes pas partenaires de France Galop. Les cotes sont celles de clôture, relevées après la course ; depuis août 2026, environ quatre réunions sur dix n’en ont pas.',
  },
  {
    q: 'Quelle différence entre les Pass ?',
    r: `Les trois Pass ouvrent exactement les mêmes pronostics. Le Pass 1 jour (${prixDe('jour')}) est un paiement unique qui donne accès à tout pendant 24 h, sans renouvellement. Le Pass mensuel (${prixDe('mois')}) et le Pass annuel (${prixDe('an')}, soit 8,25 € par mois) se renouvellent jusqu’à leur résiliation.`,
  },
  {
    q: 'Puis-je résilier à tout moment ?',
    r: `Oui. Les Pass mensuel et annuel sont sans engagement : écrivez-nous, depuis Mon compte ou à ${CONTACT}, et nous vous confirmons la date de fin. Vous gardez l’accès jusqu’au bout de la période payée. Le Pass 1 jour, lui, s’arrête tout seul au bout de 24 h.`,
  },
  {
    q: 'Qu’est-ce que la formule gratuite ?',
    r: 'Un pronostic complet offert chaque jour, sans carte bancaire. Les autres courses restent visibles, mais leur pronostic détaillé est réservé aux détenteurs d’un Pass.',
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
            Pronostics hippiques · modèle statistique
          </span>
          <h1 className="text-[2.125rem] lg:text-[3.3125rem] font-extrabold tracking-[-0.035em] leading-[1.02] [text-wrap:balance]">
            Chaque course, l’arrivée la plus probable.
          </h1>
          <p className="max-w-[33.75rem] text-[0.9375rem] lg:text-[1.125rem] font-medium leading-relaxed text-muted">
            Crosswell analyse tous les partants et estime les chances de chacun, en pourcentage. Vous voyez
            clairement qui le modèle attend devant, et avec quel écart.
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
            1 pronostic offert chaque jour · sans carte bancaire · réservé aux {AVERTISSEMENT.ageMinimum}&nbsp;ans et plus
          </span>
        </div>
        <div className="animate-fade-up [animation-delay:80ms]">
          <ExempleCourse />
        </div>
      </section>

      {/* ── Atouts ────────────────────────────────────────────────────────── */}
      <section aria-labelledby="t-atouts" className="flex flex-col gap-7 px-5 lg:px-20 pt-14 lg:pt-24">
        <TitreSection id="t-atouts">Tout ce qu’il faut pour lire une course</TitreSection>
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
          <TitreSection id="t-etapes">Comment ça marche</TitreSection>
          <Link to="/methode" className="text-[0.9375rem] font-bold text-accent hover:text-accent-hover">
            Tout comprendre sur la méthode
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
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Transparence</span>
          <h2 className="text-[1.4375rem] lg:text-[1.8125rem] font-extrabold tracking-[-0.02em] leading-[1.15]">
            Tous nos pronostics sont vérifiés après l’arrivée officielle, et publiés. Tous, sans tri.
          </h2>
          <p className="text-[0.9375rem] font-medium leading-relaxed text-muted">
            Filtrez par période, type de course, distance ou hippodrome, et jugez par vous-même.
          </p>
        </div>
        <a
          href={URL_RESULTATS}
          className="shrink-0 h-[3.25rem] px-[1.625rem] rounded-full border border-line-strong flex items-center justify-center text-[0.9375rem] font-bold hover:border-line-hover transition-colors"
        >
          Voir nos résultats
        </a>
      </section>

      {/* ── Tarifs ────────────────────────────────────────────────────────── */}
      <section id="tarifs" aria-labelledby="t-tarifs" className="flex flex-col gap-8 px-5 lg:px-20 pt-14 lg:pt-24">
        <div className="flex flex-col gap-2.5">
          <TitreSection id="t-tarifs">Tarifs</TitreSection>
          <p className="text-[0.9375rem] font-medium text-muted">
            Une course offerte chaque jour. Un Pass pour tout débloquer, le temps d’une journée, d’un mois ou d’une
            année.
          </p>
        </div>
        <div className="grid gap-3.5 pt-2 sm:grid-cols-2 lg:grid-cols-4">
          {FORMULES.map((f) => (
            <CarteFormule key={f.cle} f={f} />
          ))}
        </div>
        <p className="-mt-2 text-[0.8125rem] font-medium leading-relaxed text-faint">
          Prix TTC. Paiement sécurisé par Stripe&nbsp;: aucune donnée bancaire ne transite par Crosswell.
        </p>
      </section>

      {/* ── Mise en garde ─────────────────────────────────────────────────── */}
      <section className="mx-5 lg:mx-20 mt-10 lg:mt-14 flex gap-4 px-6 py-[1.375rem] rounded-2xl border border-dashed border-line-strong">
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden className="shrink-0">
          <path d="M12 3l9 16H3zM12 10v4M12 17h.01" fill="none" stroke="rgb(var(--c-ink))" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="text-sm font-medium leading-relaxed text-soft">
          <strong className="text-ink">Un pronostic reste une probabilité</strong>, c’est-à-dire une estimation. Aucun résultat n’est garanti&nbsp;: un
          cheval annoncé à 34&nbsp;% gagne, en moyenne, environ une course sur trois. Les performances passées ne
          préjugent pas des résultats futurs.
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
