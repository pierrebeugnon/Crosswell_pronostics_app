import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Encadre, H2, P, Tableau } from '@/components/blog/Corps'
import { SEUIL_ECHANTILLON } from '@/config/site'
import { hippodrome as formatHippodrome, jourSansSemaine, pourcent } from '@/lib/format'
import { useDonneesInitiales } from '@/lib/donnees-initiales'
import { teteStatistiques } from '@/lib/resultats-seo'
import { EFFECTIF_MINIMUM, type Segment, type Statistiques as Donnees } from '@/lib/statistiques'
import { chargerStatistiques } from '@/services/resultats'
import { useTitre } from '@/lib/useTitre'

/**
 * LES STATISTIQUES DES COURSES — `/statistiques`.
 *
 * Elles décrivent les courses de galop et le favori du marché. ELLES NE DISENT
 * RIEN DE NOTRE MODÈLE : voir `lib/statistiques.ts`. Aucun chiffre n'est écrit
 * dans le texte, tout vient du calcul : un taux figé serait faux le lendemain.
 *
 * Rendue par la fonction `api/resultats`, dont la charge est absorbée par le
 * CDN. Le chargement ci-dessous ne sert qu'en développement : les liens du site
 * ouvrent cette page par une vraie navigation (`externe` dans `Navigation.ts`),
 * pour ne pas lancer une requête par journée depuis le navigateur.
 */

/** Sous ce nombre de journées, la page prévient que la saison n'est pas complète. */
const JOURNEES_PAR_SAISON = 300

const entier = (n: number) => n.toLocaleString('fr-FR')
const decimale = (n: number) => n.toFixed(1).replace('.', ',')

/** Un taux, ou rien sous l'effectif minimum ; signalé sous le seuil d'échantillon. */
function Taux({ valeur, effectif }: { valeur: number | null; effectif: number }) {
  if (valeur == null || effectif < EFFECTIF_MINIMUM) return <span className="text-faint">—</span>
  return (
    <span className="num">
      {pourcent(valeur)}
      {effectif < SEUIL_ECHANTILLON && <span className="text-faint">*</span>}
    </span>
  )
}

function Tuile({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div className="flex flex-col gap-1.5 px-5 py-4 rounded-2xl bg-surface border border-line">
      <span className="num text-[1.625rem] lg:text-[1.875rem] font-extrabold tracking-[-0.02em] leading-none">{valeur}</span>
      <span className="text-[0.8125rem] font-medium leading-snug text-muted">{libelle}</span>
    </div>
  )
}

/** Le tableau du favori, partagé par la discipline, le peloton et le type de course. */
function TableauFavori({ titre, segments }: { titre: string; segments: Segment[] }) {
  return (
    <Tableau
      entetes={[titre, 'Courses', 'Partants', 'Favori gagnant', 'Hasard gagnant', 'Favori placé', 'Hasard placé']}
      lignes={segments.map((s) => [
        s.libelle,
        <span className="num">{entier(s.avecFavori)}</span>,
        <span className="num">{decimale(s.partantsMoyens)}</span>,
        <Taux valeur={s.gagne} effectif={s.avecFavori} />,
        <Taux valeur={s.hasardGagne} effectif={s.avecFavori} />,
        <Taux valeur={s.place} effectif={s.avecFavori} />,
        <Taux valeur={s.hasardPlace} effectif={s.avecFavori} />,
      ])}
    />
  )
}

function Cadre({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-w-[60rem] mx-auto px-5 lg:px-10 pt-7 lg:pt-12 pb-14 lg:pb-24 flex flex-col gap-6 lg:gap-7">
      {children}
    </div>
  )
}

export default function Statistiques() {
  const initiales = useDonneesInitiales()
  const [s, setS] = useState<Donnees | null>(initiales?.statistiques ?? null)
  const [erreur, setErreur] = useState(false)

  useEffect(() => {
    if (initiales?.statistiques) return
    let vivant = true
    chargerStatistiques()
      .then((d) => vivant && setS(d))
      .catch(() => vivant && setErreur(true))
    return () => {
      vivant = false
    }
  }, [initiales])

  const tete = useMemo(() => teteStatistiques(''), [])
  useTitre(tete.titre, { suffixe: false })

  if (erreur || !s) {
    return (
      <Cadre>
        <h1 className="text-[1.75rem] font-extrabold tracking-[-0.03em]">Statistiques des courses de galop</h1>
        <p className="text-[0.9375rem] leading-relaxed text-muted" role="status">
          {erreur ? 'Les statistiques ne sont pas joignables pour le moment.' : 'Calcul des statistiques…'}
        </p>
      </Cadre>
    )
  }

  return (
    <Cadre>
      <nav aria-label="Fil d’Ariane" className="text-xs font-medium text-faint">
        <Link to="/" className="hover:text-ink">
          Accueil
        </Link>
        <span aria-hidden> / </span>
        <span className="text-soft">Statistiques</span>
      </nav>

      <div className="flex flex-col gap-3 max-w-[44rem]">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-accent">
          Du {jourSansSemaine(s.debut)} au {jourSansSemaine(s.fin)}
        </span>
        <h1 className="text-[1.75rem] lg:text-[2.3125rem] font-extrabold tracking-[-0.03em] leading-[1.05]">
          Statistiques des courses de galop
        </h1>
        <p className="text-[0.9375rem] lg:text-[1rem] font-medium leading-relaxed text-muted">
          Combien de partants au départ, à quelle fréquence le favori du marché gagne, et ce que change la discipline
          ou la taille du peloton. Chaque taux est calculé sur les arrivées et s’affiche avec son effectif.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <Tuile libelle="courses analysées" valeur={entier(s.courses)} />
        <Tuile libelle="partants au départ" valeur={entier(s.partants)} />
        <Tuile libelle={`hippodromes, sur ${entier(s.journees)} journées`} valeur={entier(s.hippodromes)} />
        <Tuile libelle="partants par course, en moyenne" valeur={decimale(s.ensemble.partantsMoyens)} />
      </div>

      <H2 id="favori">Le favori du marché gagne-t-il&nbsp;?</H2>
      <P>
        Ici, le favori est le partant à la cote de clôture la plus basse. À ne pas confondre avec «&nbsp;notre
        favori&nbsp;», le cheval que notre modèle classe premier. Sur {entier(s.ensemble.avecFavori)} courses, le favori
        du marché gagne {pourcent(s.ensemble.gagne)} du temps et finit dans les trois premiers{' '}
        {pourcent(s.ensemble.place)} du temps. Un partant tiré au sort ferait {pourcent(s.ensemble.hasardGagne)} et{' '}
        {pourcent(s.ensemble.hasardPlace)}.
      </P>
      <TableauFavori titre="Discipline" segments={s.disciplines} />

      <H2 id="peloton">Ce que change la taille du peloton</H2>
      <P>
        Plus il y a de partants, moins le hasard donne de chances à chacun. C’est pour cela qu’un taux se lit à côté de
        son repère&nbsp;: la même fréquence ne dit pas la même chose à six partants et à seize.
      </P>
      <TableauFavori titre="Peloton" segments={s.pelotons} />

      <H2 id="handicaps">Les handicaps</H2>
      <P>
        Dans un handicap, les poids sont attribués pour égaliser les chances. Le tableau compare ces courses à toutes
        les autres.
      </P>
      <TableauFavori titre="Type de course" segments={s.handicaps} />

      <H2 id="cote">Ce qu’annonce la cote, et ce qui arrive</H2>
      <P>
        Une cote se convertit en probabilité, une fois retirée la marge de l’opérateur. Le tableau met en face ce
        qu’annonce la cote du favori et la fréquence à laquelle il a réellement gagné.
      </P>
      <Tableau
        entetes={['Cote du favori', 'Courses', 'Annoncé par la cote', 'Favori gagnant']}
        lignes={s.cotes.map((c) => [
          c.libelle,
          <span className="num">{entier(c.avecFavori)}</span>,
          <Taux valeur={c.annonce} effectif={c.avecFavori} />,
          <Taux valeur={c.gagne} effectif={c.avecFavori} />,
        ])}
      />

      <H2 id="hippodromes">Les hippodromes les plus courus</H2>
      <P>
        Nous n’affichons pas ici le taux du favori&nbsp;: à l’échelle d’un hippodrome, il faut plusieurs saisons de courses
        pour qu’il veuille dire quelque chose.
      </P>
      <Tableau
        entetes={['Hippodrome', 'Courses', 'Journées', 'Partants par course']}
        lignes={s.lieux.map((l) => [
          formatHippodrome(l.hippodrome),
          <span className="num">{entier(l.courses)}</span>,
          <span className="num">{entier(l.journees)}</span>,
          <span className="num">{decimale(l.partantsMoyens)}</span>,
        ])}
      />

      <H2 id="lecture">Comment ces chiffres sont comptés</H2>
      <Encadre titre="Ce qu’il faut savoir avant de les citer">
        <ul className="flex flex-col gap-2">
          <li>
            {s.journees < JOURNEES_PAR_SAISON && 'La période ne couvre qu’une partie de la saison. '}Sur 100 courses, un
            taux de 30&nbsp;% peut s’écarter d’environ 9 points par le seul hasard.
          </li>
          <li>
            * signale un effectif sous {entier(SEUIL_ECHANTILLON)} courses. Sous {entier(EFFECTIF_MINIMUM)}, le taux ne
            s’affiche pas.
          </li>
          <li>
            Le favori se lit sur les {entier(s.coursesCotees)} courses dont tout le peloton a une cote de clôture. Les
            réunions sans cote et les cotes les plus basses à égalité sortent du calcul, pas des courses analysées.
          </li>
          <li>Un partant hors de l’arrivée publiée compte comme battu. Un non-partant ne compte pas.</li>
          <li>
            Les performances passées ne préjugent pas des résultats futurs. Ces statistiques décrivent des courses, elles
            ne recommandent rien.
          </li>
        </ul>
      </Encadre>

      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 rounded-2xl bg-surface border border-line">
        <span className="text-[0.9375rem] font-medium text-muted">
          Ces chiffres décrivent les courses, pas nos pronostics. Ceux-ci se lisent course par course, en face de chaque
          arrivée.
        </span>
        <Link to="/resultats" className="shrink-0 text-[0.9375rem] font-bold text-accent hover:text-accent-hover">
          Voir les résultats
        </Link>
      </section>
    </Cadre>
  )
}
