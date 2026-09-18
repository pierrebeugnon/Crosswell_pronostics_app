import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { History } from 'lucide-react'
import { Accordeon, type Question } from '@/components/ui/Accordeon'
import {
  DATE_CORRECTION_MESURE,
  LIBELLE_ECART,
  MARGE_VALUE,
  NOTE_NON_PARTANTS,
  RYTHME_PUBLICATION_COURT,
  SEUIL_ECHANTILLON,
  SEUILS_CONFIANCE,
} from '@/config/app'
import { dateCourte, dateLongue, pourcent } from '@/lib/format'
import { PERIODES, bornesPeriode } from '@/lib/periodes'

/**
 * MÉTHODE — `design/screens/How.dc.html` et `HowMobile` (« Comment ça marche »),
 * la même page que celle du site vitrine (`site/src/pages/Methode.tsx`), plus une
 * huitième section propre à l'application : « Comment nos résultats sont
 * comptés » (#mesure), vers laquelle pointe « Nos résultats ».
 *
 * Page éditoriale, sans donnée chargée. Les seuils (écart, confiance,
 * échantillon) et les phrases de publication se lisent dans `@/config/app` :
 * recopiés en clair, ils deviendraient faux dès qu'ils bougent.
 *
 * Écarts à la maquette (design/INTEGRATION.md, lot 7) : le modèle ne lit pas
 * les cotes ; « Value » devient « Écart + » au seuil de MARGE_VALUE (10 %, pas
 * 25 %) et se lit après la course (cotes de clôture) ; les pourcentages ne sont
 * pas recalculés ; aucun vocabulaire du pari ; le bandeau final renvoie aux
 * courses plutôt qu'à l'inscription — le lecteur est déjà client.
 */

const SECTIONS = [
  { id: 'modele', court: 'Le modèle' },
  { id: 'lire', court: 'Lire un pronostic' },
  { id: 'cote', court: 'Cote et probabilité' },
  { id: 'ecart', court: 'L’écart au marché' },
  { id: 'confiance', court: 'La confiance' },
  { id: 'limites', court: 'Nos limites' },
  { id: 'mesure', court: 'La mesure' },
  { id: 'questions', court: 'Questions' },
] as const

type IdSection = (typeof SECTIONS)[number]['id']

/** L'exemple fictif des maquettes (« Prix de Morlaix »). */
const EXEMPLE = { course: 'C3', nom: 'Prix de Morlaix', arrivee: [7, 3, 11, 5], numero: 7, cheval: 'Iron Valley', victoire: 0.34, place: 0.71 }

function Section({ id, titre, children }: { id: IdSection; titre: string; children: ReactNode }) {
  const rang = SECTIONS.findIndex((s) => s.id === id)
  const court = SECTIONS[rang].court
  return (
    <section id={id} aria-labelledby={`t-${id}`} className="scroll-mt-24 flex flex-col gap-5 lg:gap-[1.375rem]">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-accent">
          {id === 'questions' ? court : `${rang + 1} · ${court}`}
        </span>
        <h2 id={`t-${id}`} className="text-[1.4375rem] lg:text-[1.8125rem] font-extrabold tracking-[-0.025em] leading-[1.15]">
          {titre}
        </h2>
      </div>
      {children}
    </section>
  )
}

function Paragraphe({ children }: { children: ReactNode }) {
  return <p className="max-w-[47.5rem] text-[0.9375rem] lg:text-[0.9375rem] font-medium leading-[1.7] text-soft">{children}</p>
}

const ENTREES = ['Valeur du cheval', 'Forme récente', 'Distance', 'Catégorie de course', 'Taille du peloton', 'Jockey', 'Entraîneur']

function Fleche() {
  return (
    <span className="grid place-items-center h-10 lg:h-auto" aria-hidden>
      <svg width="22" height="22" viewBox="0 0 24 24" className="rotate-90 lg:rotate-0">
        <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="rgb(var(--c-dim))" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

function Boite({ libelle, children }: { libelle: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 p-[1.375rem] rounded-3xl bg-surface border border-line">
      <span className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-faint">{libelle}</span>
      {children}
    </div>
  )
}

function Case({ n, accent = false, grand = false }: { n: number; accent?: boolean; grand?: boolean }) {
  return (
    <span
      className={`num grid place-items-center ${grand ? 'w-10 h-10 rounded-xl text-[0.9375rem] font-extrabold' : 'w-[1.875rem] h-[1.875rem] rounded-[8px] text-[0.8125rem] font-bold'} ${
        accent ? 'bg-accent text-accent-ink' : grand ? 'bg-raised-2 border border-line-strong' : 'bg-raised border border-line-strong'
      }`}
    >
      {n}
    </span>
  )
}

function Repere({ n }: { n: 1 | 2 | 3 }) {
  return <span className="text-[1.0625rem] font-extrabold text-accent">{['①', '②', '③'][n - 1]}</span>
}

/** Le calculateur « Essayez vous-même », au seuil d'écart de l'application. */
function Calculateur() {
  const [cote, setCote] = useState(8)
  const [modele, setModele] = useState(18)
  const implicite = 100 / cote
  const ecart = modele > implicite * (1 + MARGE_VALUE)
  const fmt = (v: number) => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',').replace(',0', '')
  const marge = Math.round(MARGE_VALUE * 100)
  const verdict = ecart
    ? `Le modèle donne ${modele} %, plus que les ${fmt(implicite)} % de la cote, au-delà de la marge de ${marge} %.`
    : modele <= implicite
      ? `Pas d’écart : le modèle (${modele} %) ne voit pas le cheval plus haut que la cote (${fmt(implicite)} %).`
      : `Pas d’écart : le modèle (${modele} %) dépasse la cote (${fmt(implicite)} %), mais de moins de ${marge} %.`
  const barre = (v: number, accent: boolean) => (
    <span className="block h-2.5 rounded-full bg-track overflow-hidden">
      <span className={`block h-full rounded-full ${accent ? 'bg-accent' : 'bg-faint'}`} style={{ width: `${Math.min(100, v * 2)}%` }} />
    </span>
  )
  const ligne = 'num grid grid-cols-[8.5rem_minmax(0,1fr)_3.5rem] lg:grid-cols-[9.375rem_minmax(0,1fr)_4rem] items-center gap-3 text-[0.8125rem] font-semibold text-muted'
  return (
    <div className="flex flex-col gap-5 p-[1.375rem] lg:p-6 rounded-3xl bg-surface border border-line">
      <h3 className="text-[1.0625rem] font-extrabold">Essayez vous-même</h3>
      <div className="flex flex-col gap-2">
        <label htmlFor="calc-cote" className="flex justify-between text-sm font-semibold text-muted">
          <span>Cote du cheval</span>
          <span className="num text-[0.9375rem] font-extrabold text-ink">{fmt(cote)}</span>
        </label>
        <input id="calc-cote" type="range" min={1.5} max={30} step={0.5} value={cote} onChange={(e) => setCote(Number(e.target.value))} className="w-full h-8 accent-accent" />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="calc-modele" className="flex justify-between text-sm font-semibold text-muted">
          <span>Chances selon le modèle</span>
          <span className="num text-[0.9375rem] font-extrabold text-accent">{modele}&nbsp;%</span>
        </label>
        <input id="calc-modele" type="range" min={1} max={50} step={1} value={modele} onChange={(e) => setModele(Number(e.target.value))} className="w-full h-8 accent-accent" />
      </div>
      <div className="flex flex-col gap-2.5 pt-3.5 border-t border-track">
        <div className={ligne}>
          <span>Chances de la cote</span>
          {barre(implicite, false)}
          <span className="text-right font-extrabold text-ink">{fmt(implicite)}&nbsp;%</span>
        </div>
        <div className={ligne}>
          <span>Chances du modèle</span>
          {barre(modele, true)}
          <span className="text-right font-extrabold text-accent">{modele}&nbsp;%</span>
        </div>
      </div>
      <div role="status" className="flex items-start gap-2.5 px-4 py-3.5 rounded-xl bg-canvas border border-track">
        {ecart && <span className="chip-accent shrink-0">{LIBELLE_ECART}</span>}
        <span className="text-sm font-semibold leading-normal">{verdict}</span>
      </div>
      <p className="text-xs font-medium leading-relaxed text-faint">
        Pour simplifier, la cote est lue ici sans retirer la marge de l’opérateur. Les pages de course, elles, la retirent.
      </p>
    </div>
  )
}

const NIVEAUX = [
  { niveau: 3, libelle: 'Élevée', texte: `Le favori du modèle a au moins ${pourcent(SEUILS_CONFIANCE.elevee)} de chances. Il se détache nettement.` },
  {
    niveau: 2,
    libelle: 'Moyenne',
    texte: `Le favori a entre ${Math.round(SEUILS_CONFIANCE.moyenne * 100)} et ${Math.round(SEUILS_CONFIANCE.elevee * 100) - 1} % de chances. Quelques chevaux se tiennent.`,
  },
  { niveau: 1, libelle: 'Faible', texte: `Le favori a moins de ${pourcent(SEUILS_CONFIANCE.moyenne)} de chances. Course très ouverte.` },
]

const LIMITES = [
  'Une course comporte toujours une part d’imprévu : départ manqué, incident de course, disqualification, changement de terrain.',
  'Certaines informations arrivent tard ou pas du tout : état de forme du jour, consignes d’écurie. Le modèle ne les voit pas.',
  'Nos probabilités portent sur les partants connus au moment du calcul, et ne sont pas recalculées après un retrait : vérifiez toujours la liste officielle.',
  'Une probabilité se juge sur la durée, pas sur une course : c’est le cumul des arrivées, sur des centaines de courses, qui dit si le niveau annoncé était le bon.',
  'Aucun résultat n’est garanti. Les performances passées ne préjugent pas des résultats futurs.',
]

const QUESTIONS: Question[] = [
  {
    q: 'Pourquoi le 1er prédit ne gagne-t-il pas à chaque fois ?',
    r: 'Parce qu’une course reste incertaine. Même un favori très net, à 40 %, gagne moins d’une course sur deux. Le modèle se juge « en moyenne », sur des centaines de courses : c’est ce que montre la page Nos résultats, avec ses intervalles de confiance.',
  },
  {
    q: 'Les pourcentages évoluent-ils avant la course ?',
    r: `Non. ${RYTHME_PUBLICATION_COURT} Une fois publiés, les pourcentages ne sont plus recalculés, même après un retrait. ${NOTE_NON_PARTANTS}`,
  },
  {
    q: 'Pourquoi la somme des probabilités des cotes dépasse-t-elle 100 % ?',
    r: 'Parce que les cotes intègrent la marge de l’opérateur. Additionnez 1 ÷ cote pour tous les partants : l’excédent au-delà de 100 % correspond à cette marge.',
  },
  {
    q: 'Crosswell recommande-t-il un cheval ?',
    r: 'Non. Nous publions des probabilités et nous les expliquons. Ce que chacun en fait lui appartient entièrement.',
  },
]

/** Une règle de compte de la section « mesure ». */
function Definition({ terme, children }: { terme: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 py-4 border-t border-sep first:border-t-0">
      <dt className="text-[0.9375rem] font-bold text-ink">{terme}</dt>
      <dd className="text-sm font-medium leading-relaxed text-muted">{children}</dd>
    </div>
  )
}

export default function Methode() {
  const { hash } = useLocation()
  // Les bornes réelles de « 30 jours », calculées par le socle : un exemple écrit
  // en dur serait faux dès le lendemain.
  const trenteJours = bornesPeriode('30j')

  // Une ancre (`/methode#mesure` depuis « Nos résultats ») : le navigateur ne la
  // suit qu'au chargement d'une page, pas après une navigation interne.
  useEffect(() => {
    if (!hash) return
    const id = window.setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' }), 50)
    return () => window.clearTimeout(id)
  }, [hash])

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-4 animate-fade-up">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Méthodologie</span>
        <h1 className="text-[1.875rem] lg:text-[2.75rem] font-extrabold tracking-[-0.035em] leading-[1.05]">Comment ça marche</h1>
        <p className="max-w-[47.5rem] text-[0.9375rem] lg:text-[0.9375rem] font-medium leading-[1.7] text-soft">
          Tout ce qu’il faut pour lire un pronostic Crosswell, sans être data scientist&nbsp;: d’où viennent les
          pourcentages, ce que dit une cote, ce que veut dire l’écart au marché, comment nos résultats sont comptés, et
          les limites de l’exercice.
        </p>
      </div>

      <div className="grid gap-8 lg:gap-14 lg:grid-cols-[13.75rem_minmax(0,1fr)] items-start pt-6 lg:pt-14">
        <nav
          aria-label="Sommaire"
          className="flex lg:flex-col gap-2 lg:gap-0.5 overflow-x-auto [scrollbar-width:none] -mx-5 px-5 lg:mx-0 lg:px-0 lg:sticky lg:top-24"
        >
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => {
                // Pas de changement d'adresse : le défilement suffit, et le
                // retour arrière reste celui de la page précédente.
                e.preventDefault()
                document.getElementById(s.id)?.scrollIntoView({ block: 'start' })
              }}
              className="shrink-0 h-10 px-3.5 rounded-full lg:rounded-[10px] border border-line-strong lg:border-0 flex items-center text-[0.8125rem] lg:text-sm font-semibold text-soft lg:text-muted hover:text-accent transition-colors"
            >
              {s.court}
            </a>
          ))}
        </nav>

        <div className="flex flex-col gap-12 lg:gap-[4.5rem] min-w-0">
          <Section id="modele" titre="Ce que fait le modèle">
            <Paragraphe>
              Pour chaque course, le modèle passe en revue tous les partants et combine de nombreux indicateurs. Il a
              appris, sur plusieurs saisons de courses françaises, quels indicateurs comptent et à quel point.
              Résultat&nbsp;: une probabilité de victoire pour chaque cheval. Les probabilités de tous les partants
              s’additionnent à 100&nbsp;%.
            </Paragraphe>
            <div className="grid lg:grid-cols-[minmax(0,1.3fr)_3.75rem_minmax(0,1fr)_3.75rem_minmax(0,1fr)] items-center">
              <Boite libelle="Ce qu’il regarde">
                <ul className="flex flex-wrap gap-2">
                  {ENTREES.map((e) => (
                    <li key={e} className="text-[0.8125rem] font-semibold px-3 py-1.5 rounded-full bg-raised border border-line-strong">
                      {e}
                    </li>
                  ))}
                </ul>
              </Boite>
              <Fleche />
              <Boite libelle="Ce qu’il calcule">
                <span className="flex flex-col gap-1">
                  <span className="text-[1rem] font-bold">La force relative de chaque partant</span>
                  <span className="text-[0.8125rem] font-medium text-faint">Comparée à celle des autres chevaux de la même course.</span>
                </span>
              </Boite>
              <Fleche />
              <Boite libelle="Ce qu’il vous donne">
                <span className="flex flex-col gap-1">
                  <span className="text-[1rem] font-bold">Un % de victoire par cheval</span>
                  <span className="text-[0.8125rem] font-medium text-faint">Et, à partir de là, l’arrivée la plus probable.</span>
                </span>
              </Boite>
            </div>
            <Paragraphe>
              <strong className="text-ink">Ce qu’il ignore</strong>&nbsp;: la presse, les informations d’écurie, et les
              cotes. Les cotes n’entrent pas dans le calcul, et c’est délibéré&nbsp;: elles servent ensuite de repère pour
              juger nos pourcentages.
            </Paragraphe>
          </Section>

          <Section id="lire" titre="Ce que veulent dire les chiffres">
            <div className="grid gap-6 lg:grid-cols-2 items-start">
              <div className="flex flex-col gap-4 p-[1.375rem] rounded-3xl bg-surface border border-line">
                <div className="flex items-center justify-between gap-3">
                  <span className="num text-xs font-semibold text-faint">
                    Exemple · {EXEMPLE.course} · {EXEMPLE.nom}
                  </span>
                  <span className="text-[0.625rem] font-extrabold uppercase tracking-[0.1em] text-faint border border-line-strong rounded-full px-2 py-0.5">
                    Fictif
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Repere n={1} />
                  <span className="flex gap-1.5">
                    {EXEMPLE.arrivee.map((n, i) => (
                      <Case key={n} n={n} accent={i === 0} grand />
                    ))}
                  </span>
                </div>
                <div className="grid grid-cols-[1.75rem_1.875rem_minmax(0,1fr)_auto_auto] items-center gap-2.5 pt-3 border-t border-track">
                  <span />
                  <Case n={EXEMPLE.numero} />
                  <span className="text-[0.9375rem] font-bold truncate">{EXEMPLE.cheval}</span>
                  <span className="num flex items-center gap-1.5 text-[0.9375rem] font-extrabold">
                    <Repere n={2} />
                    {pourcent(EXEMPLE.victoire)}
                  </span>
                  <span className="num flex items-center gap-1.5 text-sm font-bold text-muted">
                    <Repere n={3} />
                    {pourcent(EXEMPLE.place)}
                  </span>
                </div>
                <p className="text-xs font-medium text-faint">Chevaux et chiffres fictifs, pour illustration.</p>
              </div>
              <dl className="flex flex-col gap-4">
                {[
                  { n: 1 as const, t: 'Arrivée prédite', d: 'Les chevaux classés du plus probable au moins probable. C’est un ordre de probabilités, pas une promesse d’arrivée.' },
                  {
                    n: 2 as const,
                    t: '% de victoire',
                    d: `${pourcent(EXEMPLE.victoire)} : si cette course se courait 100 fois dans les mêmes conditions, ce cheval en gagnerait environ ${Math.round(EXEMPLE.victoire * 100)}. Pas les ${100 - Math.round(EXEMPLE.victoire * 100)} autres.`,
                  },
                  { n: 3 as const, t: '% placé', d: 'Les chances de finir dans les 3 premiers. Toujours plus élevé que le % de victoire.' },
                ].map((x) => (
                  <div key={x.n} className="flex gap-3">
                    <Repere n={x.n} />
                    <div className="flex flex-col gap-1">
                      <dt className="text-[0.9375rem] font-bold">{x.t}</dt>
                      <dd className="text-sm font-medium leading-relaxed text-muted">{x.d}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </div>
          </Section>

          <Section id="cote" titre="Une cote, c’est aussi une probabilité">
            <div className="grid gap-6 lg:grid-cols-2 items-start">
              <div className="flex flex-col gap-5">
                <Paragraphe>
                  Une cote est un prix de marché. Elle dit aussi ce que le marché pense des chances du cheval&nbsp;: il
                  suffit de calculer <strong className="text-ink num">1 ÷ cote</strong>.
                </Paragraphe>
                <ul className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[2, 4, 10, 20].map((c) => (
                    <li key={c} className="num flex flex-col items-center gap-0.5 py-3 rounded-xl bg-surface border border-line">
                      <span className="text-xs font-semibold text-faint">cote {c}</span>
                      <span className="text-[1.0625rem] font-extrabold">{pourcent(1 / c)}</span>
                    </li>
                  ))}
                </ul>
                <Paragraphe>
                  Petite subtilité&nbsp;: additionnés sur tous les partants d’une course, ces pourcentages dépassent
                  100&nbsp;%. L’excédent est la marge de l’opérateur, environ 20&nbsp;% relevés en septembre 2026. Les
                  chances «&nbsp;réelles&nbsp;» d’après la cote sont donc un peu plus faibles que 1 ÷ cote&nbsp;: les pages
                  de course retirent cette marge avant de comparer.
                </Paragraphe>
              </div>
              <Calculateur />
            </div>
          </Section>

          <Section id="ecart" titre="Quand le modèle voit plus haut que la cote">
            <Paragraphe>
              Un partant est marqué <span className="chip-accent align-middle">{LIBELLE_ECART}</span> quand ses chances
              selon le modèle dépassent d’au moins {Math.round(MARGE_VALUE * 100)}&nbsp;% celles qu’implique sa cote (en
              relatif&nbsp;: 23&nbsp;% contre 20&nbsp;%, par exemple). Autrement dit, le modèle le voit plus haut que le
              marché.
            </Paragraphe>
            <Paragraphe>
              {LIBELLE_ECART} ne veut pas dire «&nbsp;va gagner&nbsp;»&nbsp;: un partant marqué à 10&nbsp;% gagne, en
              moyenne, une course sur dix. L’écart décrit une différence entre deux estimations, pas une certitude. Et
              comme nos cotes sont celles de clôture, relevées après la course, il se lit après coup, sur les réunions
              cotées seulement.
            </Paragraphe>
          </Section>

          <Section id="confiance" titre="Une course lisible… ou très ouverte">
            <Paragraphe>
              Le niveau de confiance résume à quel point le modèle distingue un favori. Il dépend uniquement des chances
              du cheval classé 1er.
            </Paragraphe>
            <div className="grid gap-3.5 lg:grid-cols-3">
              {NIVEAUX.map((n) => (
                <div key={n.libelle} className="flex flex-col gap-3 p-[1.375rem] rounded-3xl bg-surface border border-line">
                  <span className="flex items-end gap-3">
                    <span className="flex items-end gap-1 h-[1.625rem]" aria-hidden>
                      {[1, 2, 3].map((i) => (
                        <span key={i} className={`block w-2 rounded-[3px] ${i <= n.niveau ? 'bg-accent' : 'bg-line-strong'}`} style={{ height: 8 + i * 6 }} />
                      ))}
                    </span>
                    <span className="text-[1.0625rem] font-extrabold">{n.libelle}</span>
                  </span>
                  <p className="text-sm font-medium leading-relaxed text-muted">{n.texte}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section id="limites" titre="Les limites de l’exercice">
            <ul className="flex flex-col">
              {LIMITES.map((l) => (
                <li key={l} className="flex gap-3 py-3.5 border-t border-sep first:border-t-0 text-[0.9375rem] font-medium leading-relaxed text-soft">
                  <span className="shrink-0 mt-[0.5625rem] w-1.5 h-1.5 rounded-full bg-accent" aria-hidden />
                  {l}
                </li>
              ))}
            </ul>
            <Link to="/resultats" className="self-start text-[0.9375rem] font-bold text-accent hover:text-accent-hover">
              Voir tous nos résultats publiés
            </Link>
          </Section>

          <Section id="mesure" titre="Comment nos résultats sont comptés">
            <Paragraphe>
              Un taux ne vaut que par sa règle de calcul. Voici celles qu’appliquent tous les taux et tous les comptes de
              courses jugées de l’application, sur «&nbsp;Nos résultats&nbsp;», l’accueil et les pages de course.
            </Paragraphe>
            <dl className="flex flex-col px-5 py-1 rounded-3xl bg-surface border border-line">
              <Definition terme="Une course jugée">
                une course dont au moins une place de l’arrivée a été relevée. Une course à venir, ou dont l’arrivée n’est
                pas encore rapatriée, n’entre dans aucun taux.
              </Definition>
              <Definition terme="Notre rang 1">
                le premier cheval <strong className="text-ink font-semibold">au départ</strong> de notre classement, celui
                que les pages de course appellent notre favori. Si le rang 1 publié est déclaré non partant, le cheval
                suivant du classement devient notre rang 1 pour la mesure, et la course le signale. Un retrait ne compte
                donc pas comme un échec du modèle&nbsp;: la course est jugée sur un cheval qui a couru.
              </Definition>
              {/* `lib/aggregate` : pred_rank NULL ⇒ aucun rang, même si la vue SQL
                  en attribue un (rank() range les NULL ex æquo en fin de liste). */}
              <Definition terme="Un cheval non classé">
                un cheval que le modèle n’a pas classé n’a pas de rang&nbsp;: il ne peut être ni notre rang&nbsp;1, ni l’un
                de nos trois premiers. Une course où le modèle n’a classé aucun cheval reste une course jugée, sans victoire
                ni place pour nous.
              </Definition>
              <Definition terme="Dans les trois">
                notre rang 1 termine 1<sup>er</sup>, 2<sup>e</sup> ou 3<sup>e</sup>, quel que soit le nombre de partants.
                C’est ce que compte le taux de place. Dans un petit peloton, c’est plus facile — le repère du hasard en tient
                compte.
              </Definition>
              <Definition terme="Les places relevées">
                nous ne relevons que les premières places de l’arrivée, en général jusqu’au 5<sup>e</sup> ou au 7
                <sup>e</sup> selon la source. Dans une course jugée, un cheval sans place relevée a donc été battu&nbsp;: il
                compte comme tel, jamais comme une donnée manquante. Sur de rares courses dont l’arrivée n’est relevée que
                jusqu’au 2<sup>e</sup>, un rang&nbsp;1 sans place relevée compte donc comme hors des trois.
              </Definition>
              {/* `lib/aggregate` et `lib/stats` : gagné = arrivé 1er ; un dead heat
                  donne la victoire à chaque ex æquo. */}
              <Definition terme="Une arrivée ex æquo">
                sur une arrivée ex æquo à la première place, chaque cheval classé 1<sup>er</sup> a gagné&nbsp;: si notre
                rang&nbsp;1 en fait partie, la course compte comme gagnée.
              </Definition>
              <Definition terme="La calibration">
                chaque cheval au départ d’une course jugée compte&nbsp;: sa probabilité annoncée d’un côté, sa victoire ou
                non de l’autre. Les non-partants ne comptent pas — ils n’ont pas pu gagner, et les compter battus ferait
                paraître nos probabilités trop hautes.
              </Definition>
              <Definition terme="Le repère du hasard">
                ce qu’obtiendrait un cheval tiré au sort&nbsp;: la moyenne, course par course, de 1 sur le nombre de
                partants au départ — et de 3 sur ce nombre, sans dépasser <span className="num">100&nbsp;%</span>, pour
                «&nbsp;dans les trois&nbsp;». Deux courses à 6 et à 16 partants donnent{' '}
                <span className="num">{pourcent((1 / 6 + 1 / 16) / 2, 1)}</span>, et non 1 sur la taille moyenne de 11 (
                <span className="num">{pourcent(1 / 11, 1)}</span>)&nbsp;: diviser par le peloton moyen sous-estimerait
                toujours le hasard.
              </Definition>
              <Definition terme="Les périodes">
                {/* « inclus » après la date de fin : `dateCourte` abrège les mois par un
                    point (« sept. »), qu'un point final redoublerait. */}
                «&nbsp;{PERIODES['7j'].libelle}&nbsp;», «&nbsp;{PERIODES['30j'].libelle}&nbsp;»&nbsp;: les 7 ou les 30
                derniers jours, <strong className="text-ink font-semibold">aujourd’hui compris</strong>. Aujourd’hui, par
                exemple, «&nbsp;{PERIODES['30j'].libelle}&nbsp;» va du{' '}
                <span className="num">{dateCourte(trenteJours.depuis ?? trenteJours.jusqua)}</span> au{' '}
                <span className="num">{dateCourte(trenteJours.jusqua)}</span> inclus. Le jour en cours n’apporte que ses
                courses déjà jugées, et une période de mesure s’arrête à aujourd’hui. Ces bornes sont les mêmes pour tous
                les taux et tous les comptes de courses jugées, sur tous les écrans, et les jours sont ceux de Paris. Les
                listes de réunions montrent aussi demain, dont les pronostics sont publiés dès la veille&nbsp;: ses courses
                n’entrent dans aucun taux tant qu’elles ne sont pas jugées.
              </Definition>
              <Definition terme="Les seuils de lecture">
                sous <span className="num">{SEUIL_ECHANTILLON}</span> courses jugées, «&nbsp;Nos résultats&nbsp;» signale
                que l’échantillon est court.
              </Definition>
            </dl>
            {/* La note est celle de `config/app` (NOTE_NON_PARTANTS), reprise telle
                quelle ; la suite dit la règle de compte qui en découle
                (`non_partant` NULL = jamais vérifié = au départ). */}
            <p className="text-sm font-medium leading-relaxed text-faint">
              {NOTE_NON_PARTANTS} Un cheval dont le statut n’a pas été vérifié est compté au départ.
            </p>

            {/* L'ENCADRÉ DATÉ. Des chiffres qui baissent sans explication ressemblent
                à une retouche ; la même baisse, datée et motivée, est une correction. */}
            <div className="flex gap-3.5 p-5 rounded-3xl bg-surface border border-line">
              <span className="shrink-0 w-9 h-9 rounded-xl bg-raised grid place-items-center text-accent">
                <History size={16} aria-hidden />
              </span>
              <div className="min-w-0 flex flex-col gap-3 text-sm font-medium leading-relaxed text-muted">
                <p className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-faint">
                  Correction du {dateLongue(DATE_CORRECTION_MESURE)}
                </p>
                <p>
                  Ce jour-là, trois règles de calcul ont été corrigées, et tout l’historique a été recalculé selon les
                  définitions ci-dessus.
                </p>
                <ul className="flex flex-col gap-2">
                  <li>
                    <strong className="text-ink font-semibold">Les non-partants.</strong> Un rang 1 publié puis retiré
                    comptait comme une course perdue. Il est désormais remplacé par le cheval suivant de notre classement.
                  </li>
                  <li>
                    <strong className="text-ink font-semibold">La calibration.</strong> Les chevaux arrivés au-delà des
                    places relevées en étaient écartés, comme des données manquantes. Ce sont presque tous des perdants à
                    faible probabilité&nbsp;: la fréquence de victoire observée dans les tranches basses était surestimée.
                    Ils comptent désormais comme battus, et les non-partants sont exclus.
                  </li>
                  <li>
                    <strong className="text-ink font-semibold">Le repère du hasard.</strong> Il valait 1 sur la taille
                    moyenne des pelotons déclarés, ce qui le sous-estimait. C’est désormais la moyenne course par course,
                    sur les partants au départ.
                  </li>
                </ul>
                <p>
                  Dans le même temps, les périodes ont reçu une définition unique&nbsp;: «&nbsp;{PERIODES['30j'].libelle}
                  &nbsp;» n’avait pas les mêmes bornes sur l’accueil et sur «&nbsp;Nos résultats&nbsp;».
                </p>
                <p>
                  <strong className="text-ink font-semibold">Effet&nbsp;: certains chiffres baissent.</strong> Sur
                  l’historique disponible ce jour-là, la fréquence observée sous <span className="num">10&nbsp;%</span> de
                  probabilité a été divisée par deux environ, et le repère du hasard a monté de près de deux points — notre
                  avance sur lui se réduit d’autant. Les taux de notre rang 1 bougent peu. C’est voulu&nbsp;: ces chiffres
                  décrivent plus fidèlement ce que valent nos probabilités.
                </p>
              </div>
            </div>
          </Section>

          <Section id="questions" titre="Vous vous demandez peut-être">
            <Accordeon questions={QUESTIONS} nom="faq-methode" compact />
          </Section>

          <section className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 lg:gap-8 px-6 py-7 lg:px-10 lg:py-9 rounded-[1.5rem] bg-accent text-accent-ink">
            <span className="text-[1.25rem] lg:text-[1.5625rem] font-extrabold tracking-[-0.02em] leading-tight">
              Prêt à lire les pronostics du jour&nbsp;?
            </span>
            <Link
              to="/courses"
              className="shrink-0 h-[3.25rem] px-[1.625rem] rounded-full bg-accent-ink text-accent flex items-center justify-center text-[0.9375rem] font-bold hover:opacity-90 transition-opacity"
            >
              Voir les courses
            </Link>
          </section>
        </div>
      </div>
    </div>
  )
}
