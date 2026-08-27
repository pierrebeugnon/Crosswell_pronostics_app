import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CalendarClock,
  Check,
  Flag,
  RotateCcw,
  Scale,
  ShieldAlert,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Carte } from '@/components/ui/Carte'
import { AVERTISSEMENT, MARGE_VALUE, NOM_SCORE, SEUIL_ECHANTILLON } from '@/config/app'
import { pourcent } from '@/lib/format'

/**
 * Page éditoriale, sans aucune donnée chargée : elle décrit le service, pas
 * une journée de courses.
 *
 * Les seuls chiffres qui y figurent sont lus dans `@/config/app`. C'est
 * volontaire : le jour où la marge d'écart au marché (MARGE_VALUE) ou le seuil d'échantillon
 * bouge, cette page suit. Recopier « 10 % » en clair reviendrait à publier une
 * promesse que le code aurait cessé de tenir — exactement ce que cette page
 * reproche aux vendeurs de pronostics.
 */

const SECTIONS = [
  { id: 'calcul', titre: 'Ce que nous calculons' },
  { id: 'entrees', titre: 'Ce qui entre dans le calcul' },
  { id: 'manques', titre: 'Ce que nous n’avons pas' },
  { id: 'parution', titre: 'Quand les pronostics paraissent' },
  { id: 'ecart', titre: 'Comment lire un écart au marché' },
  { id: 'publication', titre: 'Ce que nous publions sur nous-mêmes' },
  { id: 'limites', titre: 'Les limites, écrites noir sur blanc' },
  { id: 'positionnement', titre: 'Ce que ce service n’est pas' },
] as const

/** Un identifiant de section ne peut pas exister sans son entrée de sommaire. */
type IdSection = (typeof SECTIONS)[number]['id']

type Point = { titre: string; texte: string }

const REGARDE: Point[] = [
  {
    titre: 'La valeur intrinsèque du cheval',
    texte:
      'ce que ses courses passées disent de son niveau réel, une fois retirée la part de hasard qu’il y a dans une arrivée. Une victoire facile dans un lot faible ne vaut pas une troisième place tenue dans un lot dur.',
  },
  {
    titre: 'Sa forme récente',
    texte:
      'la façon dont ce niveau a bougé sur les dernières sorties, avec un poids qui décroît à mesure qu’on remonte le temps.',
  },
  {
    titre: 'L’adéquation aux conditions du jour',
    texte:
      'distance, catégorie de course, taille du peloton. Un cheval solide sur 1 600 m dans un lot de huit n’est pas le même sur 2 400 m à dix-huit partants.',
  },
  {
    titre: 'La qualité de l’entourage',
    texte:
      'jockey et entraîneur, mesurés sur une fenêtre glissante de résultats plutôt que sur une réputation ou un palmarès de carrière.',
  },
]

const IGNORE: Point[] = [
  {
    titre: 'La presse spécialisée',
    texte:
      'aucun avis de journaliste, aucun pronostic de la veille, aucune « pastille » ne pèse sur le calcul.',
  },
  {
    titre: 'Les informations d’écurie',
    texte:
      'nous n’en avons aucune : ni intention annoncée, ni travail du matin, ni confidence d’entourage. Nous ne sommes pas sur les hippodromes.',
  },
  {
    titre: 'Les cotes',
    texte:
      'elles n’entrent pas dans le modèle, et c’est délibéré : un modèle qui recopie le marché ne peut, par construction, jamais le battre. Les cotes ne servent qu’après coup, pour comparer notre estimation à celle du public.',
  },
]

const MANQUES: Point[] = [
  {
    titre: 'Pas de forme détaillée',
    texte:
      'nous ne publions ni l’historique course par course d’un cheval, ni les engagements en temps réel. L’application affiche une probabilité, pas un dossier.',
  },
  {
    titre: 'Des partants arrêtés la veille au soir',
    texte:
      'un non-partant de dernière minute n’est pas reflété. Nos probabilités décrivent le peloton tel qu’il était déclaré la veille — vérifiez toujours la liste officielle du jour.',
  },
  {
    titre: 'Des cotes de clôture, relevées après la course',
    texte:
      'elles décrivent le marché tel qu’il a fermé, pas tel qu’il évoluera en journée. Elles ne servent qu’à une chose : évaluer nos probabilités après coup, face au consensus du public.',
  },
]

const ETAPES: { icone: LucideIcon; quand: string; texte: string }[] = [
  {
    icone: CalendarClock,
    quand: 'Chaque soir, vers 19 h',
    texte:
      'Les probabilités du lendemain sont publiées, une fois les partants déclarés connus. Le matin d’une réunion, tout est déjà en ligne : rien n’est ajouté dans la journée.',
  },
  {
    icone: Flag,
    quand: 'Le lendemain, en fin de journée',
    texte:
      'Les arrivées officielles sont rapatriées, puis rapprochées de ce que nous avions annoncé. Une course courue l’après-midi n’a donc pas son résultat dans la minute.',
  },
  {
    icone: RotateCcw,
    quand: 'Si une journée a été manquée',
    texte:
      'Elle est rattrapée automatiquement au passage suivant. Une source indisponible un soir ne laisse pas de trou définitif dans l’historique.',
  },
]

const LIMITES: Point[] = [
  {
    titre: 'Une probabilité est une estimation, pas une prédiction',
    texte:
      'elle décrit une fréquence attendue sur un grand nombre de courses. Elle ne dit rien de l’issue de celle que vous regardez.',
  },
  {
    titre: 'L’historique est encore court',
    texte: `les intervalles de confiance sont larges et un taux peut bouger de plusieurs points d’une semaine à l’autre. Sous ${SEUIL_ECHANTILLON} courses jugées, nous le signalons explicitement au lieu de laisser croire au chiffre.`,
  },
  {
    titre: 'Un modèle bien calibré se trompe le plus souvent sur le vainqueur',
    texte:
      'notre premier choix gagne loin d’une course sur deux. La plupart de nos rangs 1 sont donc battus — y compris quand le modèle a annoncé le bon niveau de probabilité.',
  },
  {
    titre: 'Battre le consensus du marché est rare, et fragile',
    texte:
      'une cote agrège l’information de milliers d’observateurs. Faire durablement mieux que ce consensus est difficile, rien ne garantit que nous y parvenions — c’est précisément pour cela que nous publions la comparaison.',
  },
  {
    titre: 'Un résultat passé ne garantit rien',
    texte:
      'une bonne série ne prouve pas que le modèle est bon, une mauvaise ne prouve pas qu’il est cassé. Seul le cumul, sur la durée, veut dire quelque chose.',
  },
]

function Section({
  id,
  className = '',
  children,
}: {
  id: IdSection
  className?: string
  children: ReactNode
}) {
  const rang = SECTIONS.findIndex((s) => s.id === id)
  const titre = SECTIONS[rang]?.titre ?? ''

  return (
    <Carte
      id={id}
      className={`scroll-mt-24 animate-fade-up ${className}`}
      style={{ animationDelay: `${rang * 40}ms` }}
    >
      <h2 className="font-display font-semibold text-xl sm:text-[1.375rem] tracking-tight leading-snug">
        {titre}
      </h2>
      <div className="mt-4 space-y-4 text-[0.9375rem] text-muted leading-relaxed">{children}</div>
    </Carte>
  )
}

function ListePoints({
  points,
  icone: Icone,
  teinte,
}: {
  points: Point[]
  icone: LucideIcon
  teinte: string
}) {
  return (
    <ul className="space-y-3">
      {points.map((p) => (
        <li key={p.titre} className="flex gap-3">
          <Icone size={15} className={`mt-1 shrink-0 ${teinte}`} aria-hidden />
          <p>
            <span className="text-ink font-medium">{p.titre}</span> — {p.texte}
          </p>
        </li>
      ))}
    </ul>
  )
}

export default function Methode() {
  return (
    <div className="lg:flex lg:items-start lg:gap-10">
      {/*
       * Sommaire d'ancres, desktop uniquement. Les liens sont des <a> et non
       * des <Link> : un fragment se résout dans la page courante, et le passer
       * au routeur ferait intervenir ScrollRestoration là où le navigateur
       * fait déjà exactement ce qu'il faut.
       */}
      <nav
        aria-label="Sommaire de la page"
        className="hidden lg:block order-last shrink-0 w-56 sticky top-24 self-start"
      >
        <p className="label">Sur cette page</p>
        <ol className="mt-3 space-y-2.5 border-l border-white/10 pl-4">
          {SECTIONS.map((s, i) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="flex gap-2 text-sm text-muted hover:text-ink transition-colors"
              >
                <span className="num text-faint">{i + 1}</span>
                <span>{s.titre}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="min-w-0 max-w-3xl space-y-5">
        <header className="animate-fade-up">
          <h1 className="titre-page">Notre méthode</h1>

          {/*
           * Sommaire mobile, en bandeau défilant sous le titre.
           *
           * La page fait près de dix écrans sur un téléphone. Sans point
           * d'entrée, la seule façon d'atteindre « Les limites » ou le
           * positionnement du service est de faire défiler à l'aveugle — et
           * ce sont justement les sections qu'on vient chercher. La colonne de
           * droite ne pouvait pas servir : à 375 px, il n'y a pas de colonne
           * de droite. Le bandeau horizontal reprend les mêmes ancres dans
           * l'ordre, sans occuper de hauteur.
           */}
          <nav
            aria-label="Sections de la page"
            className="lg:hidden -mx-4 sm:-mx-6 mt-5 px-4 sm:px-6 scroll-x fade-r"
          >
            <ol className="flex gap-2 w-max pb-1">
              {SECTIONS.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="chip-neutral min-h-11 !py-2.5 !px-4">
                    <span className="num text-faint">{i + 1}</span>
                    <span>{s.titre}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <p className="mt-4 text-[0.9375rem] sm:text-base text-muted leading-relaxed">
            Crosswell ne vend pas des pronostics : il vend des{' '}
            <span className="text-ink font-medium">probabilités mesurées</span> — et publie ce
            qu’elles valent. Cette page dit ce que le modèle calcule, ce qu’il ignore, ce qu’il ne
            sait pas faire, et où aller vérifier nos chiffres.
          </p>
        </header>

        <Section id="calcul">
          <p>
            Pour chaque course, le modèle attribue à chaque partant deux nombres : sa{' '}
            <span className="text-ink font-medium">probabilité de gagner</span> et sa{' '}
            <span className="text-ink font-medium">probabilité de finir dans les trois premiers</span>
            .
          </p>
          <p>
            La somme des probabilités de victoire d’une course vaut 1. Ce sont des parts d’un même
            gâteau, pas des notes indépendantes : ce qu’un cheval prend, les autres le perdent. Un
            partant à <span className="num">30 %</span> dans un lot de six ne raconte donc pas la
            même histoire qu’un partant à <span className="num">30 %</span> dans un handicap à
            dix-huit.
          </p>
          <p>
            Le classement qui découle de ces probabilités est ce que nous appelons le{' '}
            <span className="text-ink font-medium">{NOM_SCORE}</span>. Le rang 1 désigne le cheval
            que le modèle juge le plus probable vainqueur de la course — rien de plus, et surtout
            pas un cheval qui devrait gagner.
          </p>

          <div className="card-nest p-4">
            <p className="label">Ce que veut dire une probabilité de 28 %</p>
            <p className="mt-2">
              Sur cent courses où nous annonçons <span className="num">28 %</span>, nous en attendons
              environ <span className="text-ink font-medium">vingt-huit gagnées</span> — et donc{' '}
              <span className="text-ink font-medium">soixante-douze perdues</span>. Un favori battu
              n’est pas une erreur du modèle : c’est le fonctionnement normal d’une probabilité. Un
              modèle ne se juge pas sur une course, mais sur des centaines, en comparant ce qu’il a
              annoncé à ce qui est arrivé.
            </p>
          </div>
        </Section>

        <Section id="entrees">
          <p>
            Voici les familles d’information qui pèsent sur le calcul. Nous en donnons la nature, pas
            la pondération : c’est le seul endroit de cette page où nous gardons quelque chose pour
            nous.
          </p>
          <ListePoints points={REGARDE} icone={Check} teinte="text-win" />

          <div className="card-nest p-4">
            <p className="label">Ce qui n’entre pas dans le calcul</p>
            <div className="mt-3">
              <ListePoints points={IGNORE} icone={X} teinte="text-loss" />
            </div>
          </div>
        </Section>

        <Section id="manques">
          <p>
            Nous n’avons{' '}
            <span className="text-ink font-medium">pas de partenariat France Galop à ce jour</span>.
            Cela a trois conséquences concrètes, et il vaut mieux les connaître avant de vous
            appuyer sur nos chiffres.
          </p>
          <ListePoints points={MANQUES} icone={X} teinte="text-faint" />
        </Section>

        <Section id="parution">
          <div className="card-nest hairline-y">
            {ETAPES.map(({ icone: Icone, quand, texte }) => (
              <div key={quand} className="p-4 flex gap-3.5">
                <span className="shrink-0 w-9 h-9 rounded-2xl bg-white/[0.06] grid place-items-center text-accent">
                  <Icone size={16} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="label">{quand}</p>
                  <p className="mt-1.5">{texte}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section id="ecart">
          <p>
            La cote d’un cheval contient une{' '}
            <span className="text-ink font-medium">probabilité implicite</span> : celle que le
            public, collectivement, lui accorde. On l’obtient en inversant la cote, puis en
            retirant la marge de l’opérateur.
          </p>

          <div className="card-nest p-4 flex gap-3.5">
            <span className="shrink-0 w-9 h-9 rounded-2xl bg-white/[0.06] grid place-items-center text-accent">
              <Scale size={16} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="label">Le calcul, en clair</p>
              <p className="mt-1.5">
                Une cote de <span className="num">4,0</span> vaut{' '}
                <span className="num">1 / 4,0</span>, soit <span className="num">25 %</span>.
                Additionnées sur toute la course, ces valeurs dépassent 1 d’environ{' '}
                <span className="num">20 %</span> : c’est la marge de l’opérateur. On ramène donc la
                somme de la course à 1, et ce qui reste est la probabilité implicite du public.
              </p>
            </div>
          </div>

          <p>
            Quand notre probabilité dépasse cette implicite de plus de{' '}
            <span className="num text-ink font-medium">{pourcent(MARGE_VALUE)}</span> de sa valeur,
            le partant est marqué <span className="text-ink font-medium">« écart »</span>. En deçà,
            la différence tient au bruit d’estimation plus qu’à un désaccord réel, et nous ne
            signalons rien.
          </p>
          <p>
            <span className="text-ink font-medium">Ce n’est pas un conseil.</span> C’est un
            désaccord entre notre analyse et le consensus du public, et rien ne dit a priori qui a
            tort — le marché a souvent raison. Un écart signale simplement l’endroit où nos
            probabilités s’éloignent le plus de l’avis général, et donc le premier endroit où
            vérifier ce qu’elles valent. C’est précisément ce que la page{' '}
            <Link to="/resultats" className="link">
              Nos résultats
            </Link>{' '}
            permet de faire, calibration à l’appui.
          </p>
          <p>
            Enfin, environ deux réunions sur trois ne sont pas cotées. Sur celles-là, aucune
            probabilité implicite n’existe : l’écart n’est pas nul, il est{' '}
            <span className="text-ink font-medium">absent</span>, et l’application laisse la place
            vide plutôt que d’inventer un chiffre.
          </p>
        </Section>

        <Section id="publication">
          <p>
            Un service de probabilités qui ne publie pas ses résultats demande à être cru sur parole.
            Nous publions donc les nôtres : taux de victoire, taux de place, comparaison au favori
            du marché, calibration — chaque taux accompagné de son{' '}
            <span className="text-ink font-medium">intervalle de confiance à 95 %</span> et du nombre
            de courses sur lequel il est calculé.
          </p>
          <p>
            Les chiffres publiés sont les <span className="text-ink font-medium">chiffres réels</span>,
            y compris quand ils sont mauvais. Nous ne sélectionnons pas rétrospectivement les
            périodes qui nous arrangent, ni les hippodromes qui nous réussissent : la fenêtre est
            la même pour tout le monde, et les courses perdues y figurent au même titre que les
            autres.
          </p>

          <Link
            to="/resultats"
            className="card-nest p-4 flex items-center justify-between gap-3 hover:bg-white/[0.09] transition-colors"
          >
            <span>
              <span className="block text-sm font-medium text-ink">Nos résultats, en détail</span>
              <span className="text-sm text-muted">
                Taux, calibration et comparaison au marché, avec les effectifs.
              </span>
            </span>
            <ArrowRight size={16} className="shrink-0 text-faint" aria-hidden />
          </Link>
        </Section>

        <Section id="limites" className="!border-info/25">
          <div className="flex items-center gap-2.5 text-info">
            <ShieldAlert size={16} aria-hidden />
            <p className="label !text-info">À lire avant d’utiliser nos probabilités</p>
          </div>
          <ListePoints points={LIMITES} icone={X} teinte="text-info" />
        </Section>

        <Section id="positionnement">
          <p>
            Crosswell publie des{' '}
            <span className="text-ink font-medium">analyses statistiques</span> sur les courses
            hippiques françaises : des probabilités mesurées, accompagnées de leur historique de
            réussite. C’est tout, et c’est déjà beaucoup.
          </p>
          <p>
            Ce service n’est <span className="text-ink font-medium">ni un opérateur de jeux, ni
            un service de conseil</span>. Nous ne recueillons aucun enjeu, nous ne recommandons
            aucune action, et nous ne faisons aucune promesse de résultat — une probabilité, même
            juste, reste une probabilité. Ce que chacun fait de nos analyses lui appartient
            entièrement, et n’engage que lui.
          </p>
          <p className="text-sm text-faint">
            {AVERTISSEMENT.texte} Service réservé aux personnes majeures (
            {AVERTISSEMENT.ageMinimum}&nbsp;ans et plus).
          </p>
        </Section>
      </div>
    </div>
  )
}
