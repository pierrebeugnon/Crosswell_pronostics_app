import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { H2, P } from '@/components/blog/Corps'
import { Accordeon, type Question } from '@/components/ui/Accordeon'
import { URL_INSCRIPTION } from '@/config/site'
import { TETE_OUTIL_COTE, lireCote, lireCotes, lireCourse, lireProbabilite, type Diagnostic } from '@/lib/cotes'
import { pourcent } from '@/lib/format'
import { useTitre } from '@/lib/useTitre'

/**
 * LE CONVERTISSEUR DE COTES — `/outils/cote-probabilite`.
 *
 * Une page outil : on y vient pour un calcul, on repart avec la manière de le
 * lire. Elle ne dit rien de notre modèle et ne recommande rien ; elle traduit
 * une cote, comme le fait la section « Cote et probabilité » de la méthode.
 *
 * Rendue AU BUILD comme les autres pages éditoriales, puis hydratée : l'état
 * initial des champs est fixe, le HTML servi et le premier rendu du navigateur
 * sont donc identiques.
 */

/** 2.5 → « 2,5 », 4 → « 4 » : une cote s'écrit comme on la lit. */
const coteLue = (v: number) => String(Math.round(v * 100) / 100).replace('.', ',')

const DIAGNOSTICS: Record<Diagnostic, string> = {
  incomplete:
    'La somme est trop basse pour une course complète : il manque probablement des partants dans la liste. Les probabilités nettes sont surestimées.',
  normale: 'La somme tombe dans la fourchette habituelle d’une course complète.',
  elevee: 'La somme est inhabituellement haute : vérifiez qu’aucune cote n’a été saisie deux fois ou mal recopiée.',
}

const QUESTIONS: Question[] = [
  {
    q: 'Comment convertir une cote en probabilité ?',
    r: 'Divisez 1 par la cote. Une cote de 4 annonce 1 ÷ 4 = 25 % de chances de victoire, une cote de 10 en annonce 10 %. C’est la lecture brute : elle contient encore la marge de l’opérateur.',
  },
  {
    q: 'Pourquoi la somme des probabilités dépasse-t-elle 100 % ?',
    r: 'Parce que les cotes intègrent la marge de l’opérateur. Sur une course complète, la somme des 1 ÷ cote tombe presque toujours entre 1,10 et 1,35. Pour obtenir des probabilités qui font 100 %, on divise chacune par cette somme : c’est ce que fait le calculateur « toute la course ».',
  },
  {
    q: 'Faut-il toutes les cotes de la course ?',
    r: 'Pour retirer la marge, oui. Avec une partie des cotes seulement, la somme est trop basse et chaque probabilité nette est surestimée. Le calculateur le signale quand la somme passe sous 1,10.',
  },
  {
    q: 'Une cote change-t-elle avant le départ ?',
    r: 'Oui. La cote évolue jusqu’au départ, et celle relevée tôt le matin bouge souvent beaucoup. La cote de clôture, figée au départ, est celle qui résume le mieux ce que le marché pensait de la course.',
  },
  {
    q: 'Une probabilité de 25 % veut-elle dire que le cheval va perdre ?',
    r: 'Elle dit qu’un cheval dans cette situation gagne environ une course sur quatre. Sur une seule course, il gagne ou il perd ; c’est sur un grand nombre de courses que la fréquence se vérifie.',
  },
  {
    q: 'Les probabilités de Crosswell viennent-elles des cotes ?',
    r: 'Non. Notre modèle ne lit aucune cote : il mesure la valeur des chevaux, leur forme, la distance, la catégorie, le peloton, le jockey et l’entraîneur. La cote sert ensuite de point de comparaison, jamais d’entrée de calcul.',
  },
]

function Champ({
  id,
  libelle,
  valeur,
  surChange,
  aide,
  erreur,
}: {
  id: string
  libelle: string
  valeur: string
  surChange: (v: string) => void
  aide?: string
  erreur?: string | null
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-semibold text-muted">
        {libelle}
      </label>
      <input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        value={valeur}
        onChange={(e) => surChange(e.target.value)}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={aide || erreur ? `${id}-aide` : undefined}
        className="num h-12 px-4 rounded-xl bg-canvas border border-line-strong text-[1.0625rem] font-bold focus:outline-none focus:border-accent"
      />
      {(aide || erreur) && (
        <span id={`${id}-aide`} className={`text-xs font-medium ${erreur ? 'text-loss' : 'text-faint'}`}>
          {erreur ?? aide}
        </span>
      )}
    </div>
  )
}

function Resultat({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div role="status" className="flex items-baseline justify-between gap-3 px-4 py-3.5 rounded-xl bg-canvas border border-track">
      <span className="text-sm font-semibold text-muted">{libelle}</span>
      <span className="num text-[1.5rem] font-extrabold text-accent">{valeur}</span>
    </div>
  )
}

function Carte({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 p-[1.375rem] lg:p-6 rounded-3xl bg-surface border border-line">
      <h3 className="text-[1.0625rem] font-extrabold">{titre}</h3>
      {children}
    </div>
  )
}

export default function OutilCote() {
  useTitre(TETE_OUTIL_COTE.titre, { suffixe: false })

  const [cote, setCote] = useState('4')
  const [proba, setProba] = useState('25')
  // Une course complète de huit partants, somme 1,19 : l'exemple doit montrer le
  // cas normal, pas déclencher l'alerte d'une liste incomplète.
  const [liste, setListe] = useState('2,5 4 6 8 10 15 20 30')

  const coteValide = lireCote(cote)
  const probaValide = lireProbabilite(proba)
  const { cotes, rejetees } = useMemo(() => lireCotes(liste), [liste])
  const course = useMemo(() => lireCourse(cotes), [cotes])

  return (
    <div className="w-full max-w-[60rem] mx-auto px-5 lg:px-10 pt-7 lg:pt-12 pb-14 lg:pb-24 flex flex-col gap-6 lg:gap-7">
      <nav aria-label="Fil d’Ariane" className="text-xs font-medium text-faint">
        <Link to="/" className="hover:text-ink">
          Accueil
        </Link>
        <span aria-hidden> / </span>
        <span className="text-soft">Convertir une cote</span>
      </nav>

      <div className="flex flex-col gap-3 max-w-[44rem]">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Outil gratuit</span>
        <h1 className="text-[1.75rem] lg:text-[2.3125rem] font-extrabold tracking-[-0.03em] leading-[1.05]">
          Convertir une cote en probabilité
        </h1>
        <p className="text-[0.9375rem] lg:text-[1rem] font-medium leading-relaxed text-muted">
          Une cote dit ce que le marché pense des chances d’un cheval. Ce calculateur la traduit en pourcentage, et
          retire la marge de l’opérateur quand vous lui donnez toute la course.
        </p>
      </div>

      <div className="grid gap-3.5 lg:grid-cols-2 items-start">
        <Carte titre="Une cote">
          <Champ
            id="outil-cote"
            libelle="Cote du cheval"
            valeur={cote}
            surChange={setCote}
            erreur={coteValide == null ? 'Une cote est un nombre supérieur à 1, par exemple 3,5.' : null}
          />
          <Resultat libelle="Chances annoncées" valeur={coteValide == null ? '—' : pourcent(1 / coteValide, 1)} />
          <p className="text-xs font-medium leading-relaxed text-faint">1 ÷ cote, marge de l’opérateur comprise.</p>
        </Carte>

        <Carte titre="Une probabilité">
          <Champ
            id="outil-proba"
            libelle="Probabilité de victoire, en %"
            valeur={proba}
            surChange={setProba}
            erreur={probaValide == null ? 'Un pourcentage entre 0 et 100, par exemple 25.' : null}
          />
          <Resultat libelle="Cote équivalente" valeur={probaValide == null ? '—' : coteLue(1 / probaValide)} />
          <p className="text-xs font-medium leading-relaxed text-faint">1 ÷ probabilité, sans marge.</p>
        </Carte>
      </div>

      <Carte titre="Toute la course">
        <Champ
          id="outil-course"
          libelle="Les cotes de tous les partants, séparées par des espaces"
          valeur={liste}
          surChange={setListe}
          aide={
            rejetees.length
              ? `Ignoré : ${rejetees.join(' ')}. Une cote est un nombre supérieur à 1 ; la virgule sert de décimale.`
              : 'La virgule sert de décimale : « 2,5 4 6 » se lit 2,5 ; 4 ; 6.'
          }
        />
        {course ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[22rem] border-collapse text-[0.9375rem]">
                <thead>
                  <tr className="border-b border-line-strong">
                    {['Partant', 'Cote', 'Annoncé', 'Marge retirée'].map((e) => (
                      <th key={e} className="text-left font-bold py-2.5 pr-4 text-[0.75rem] uppercase tracking-[0.08em] text-faint">
                        {e}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {course.partants.map((p, i) => (
                    <tr key={i} className="border-b border-track">
                      <td className="num py-2.5 pr-4 font-semibold text-soft">{i + 1}</td>
                      <td className="num py-2.5 pr-4 font-semibold">{coteLue(p.cote)}</td>
                      <td className="num py-2.5 pr-4 text-soft">{pourcent(p.annoncee, 1)}</td>
                      <td className="num py-2.5 pr-4 font-extrabold text-accent">{pourcent(p.nette, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div role="status" className="flex flex-col gap-1.5 px-4 py-3.5 rounded-xl bg-canvas border border-track">
              <span className="num text-sm font-bold">
                Somme des 1 ÷ cote&nbsp;: {course.somme.toFixed(2).replace('.', ',')}
                {/* Sous 1, il n'y a pas de marge négative : il manque des partants. */}
                {course.somme >= 1 && `, soit une marge de ${pourcent(course.somme - 1)}`}
              </span>
              <span className="text-sm font-medium leading-normal text-muted">{DIAGNOSTICS[course.diagnostic]}</span>
            </div>
            <p className="text-xs font-medium text-faint">Les cotes affichées au départ sont des cotes d’exemple.</p>
          </>
        ) : (
          <p className="text-sm font-medium text-muted">Saisissez au moins deux cotes.</p>
        )}
      </Carte>

      <H2 id="formule">La formule, en deux temps</H2>
      <P>
        Une cote est un prix&nbsp;: plus elle est basse, plus le marché juge le cheval capable de gagner. Une cote de 4
        correspond à des chances de 1 ÷ 4, soit 25&nbsp;%. Cette division suffit pour lire une cote isolée.
      </P>
      <P>
        Additionnez ces pourcentages sur tous les partants&nbsp;: le total dépasse 100&nbsp;%, en général de 10 à
        35&nbsp;%. L’excédent est la marge de l’opérateur. Pour la retirer, divisez la probabilité de chaque partant par
        ce total. Avec des cotes de 2, 4, 4 et 5, le total vaut 1,20&nbsp;; le premier partant passe de 50&nbsp;% à
        42&nbsp;%.
      </P>

      <H2 id="lire">Ce qu’un pourcentage veut dire</H2>
      <P>
        Un pourcentage décrit une fréquence attendue sur un grand nombre de courses, pas l’issue d’une course précise.
        Le marché est d’ailleurs bien calibré&nbsp;: nos{' '}
        <a href="/statistiques#cote" className="text-accent hover:text-accent-hover">
          statistiques des courses de galop
        </a>{' '}
        mettent en face, tranche par tranche, ce qu’annonce la cote du favori et la fréquence à laquelle il gagne.
      </P>
      <P>
        Nos propres probabilités ne viennent pas des cotes&nbsp;: notre modèle ne les lit pas. La{' '}
        <Link to="/methode#cote" className="text-accent hover:text-accent-hover">
          méthode
        </Link>{' '}
        explique comment nous comparons ensuite les deux lectures.
      </P>

      <section aria-labelledby="t-faq-cote" className="flex flex-col gap-5 pt-2">
        <h2 id="t-faq-cote" className="text-[1.4375rem] lg:text-[1.8125rem] font-extrabold tracking-[-0.02em]">
          Questions fréquentes
        </h2>
        <Accordeon questions={QUESTIONS} nom="faq-cote" />
      </section>

      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-[1.375rem] py-6 rounded-3xl bg-surface border border-line">
        <div className="flex flex-col gap-1.5">
          <span className="text-[1.0625rem] font-bold">Les probabilités de chaque partant, chaque matin</span>
          <span className="text-[0.9375rem] font-medium text-muted">
            Une course offerte chaque jour, pronostic complet, sans carte bancaire.
          </span>
        </div>
        <a
          href={URL_INSCRIPTION}
          className="shrink-0 h-[3.25rem] px-[1.625rem] rounded-full bg-accent text-accent-ink flex items-center justify-center text-[0.9375rem] font-bold hover:bg-accent-hover transition-colors"
        >
          Essayer gratuitement
        </a>
      </section>
    </div>
  )
}
