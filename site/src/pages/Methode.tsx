import { useState, type ReactNode } from 'react'
import { Accordeon, type Question } from '@/components/ui/Accordeon'
import { Fictif } from '@/components/ui/Fictif'
import {
  LIBELLE_ECART,
  MARGE_ECART,
  NOTE_NON_PARTANTS,
  RYTHME_PUBLICATION_COURT,
  SEUILS_CONFIANCE,
  URL_INSCRIPTION,
  URL_RESULTATS,
} from '@/config/site'
import { EXEMPLE } from '@/lib/exemple'
import { pourcent } from '@/lib/format'
import { useTitre } from '@/lib/useTitre'

/**
 * COMMENT ÇA MARCHE — `design/screens/How.dc.html` et `HowMobile`.
 *
 * Sommaire collé à gauche (bandeau défilant sur téléphone), sept sections
 * numérotées, un calculateur, la FAQ et le bandeau vert final.
 *
 * Écarts à la maquette (design/INTEGRATION.md, lot 7) :
 * - le modèle ne lit PAS les cotes (la maquette les range parmi ses entrées),
 *   ni le terrain, la corde ou le poids : la liste est celle de nos entrées ;
 * - « Value » devient « Écart + », au seuil de l'application (10 %, pas 25 %),
 *   et la cote relevée est celle de clôture : l'écart se lit après la course ;
 * - les pourcentages ne sont PAS recalculés avant la course ;
 * - aucun vocabulaire du pari (positionnement strict, confirmé le 18/09/2026) ;
 * - pas de « [X ANNÉES] » : aucun chiffre qu'on ne peut pas sourcer.
 */

const SECTIONS = [
  { id: 'modele', court: 'Le modèle' },
  { id: 'lire', court: 'Lire un pronostic' },
  { id: 'cote', court: 'Cote et probabilité' },
  { id: 'ecart', court: 'L’écart au marché' },
  { id: 'confiance', court: 'La confiance' },
  { id: 'limites', court: 'Nos limites' },
  { id: 'questions', court: 'Questions' },
] as const

type IdSection = (typeof SECTIONS)[number]['id']

function Section({ id, titre, children }: { id: IdSection; titre: string; children: ReactNode }) {
  const rang = SECTIONS.findIndex((s) => s.id === id)
  const court = SECTIONS[rang].court
  return (
    <section id={id} aria-labelledby={`t-${id}`} className="flex flex-col gap-5 lg:gap-[1.375rem]">
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
      className={`num rounded-xl grid place-items-center font-extrabold ${grand ? 'w-10 h-10 text-[0.9375rem]' : 'w-[1.875rem] h-[1.875rem] rounded-[8px] text-[0.8125rem] font-bold'} ${
        accent ? 'bg-accent text-accent-ink' : grand ? 'bg-raised-2 border border-line-strong' : 'bg-raised border border-line-strong'
      }`}
    >
      {n}
    </span>
  )
}

/** Un repère ①②③ de la maquette. */
function Repere({ n }: { n: 1 | 2 | 3 }) {
  return <span className="text-[1.0625rem] font-extrabold text-accent">{['①', '②', '③'][n - 1]}</span>
}

/** Le calculateur « Essayez vous-même », au seuil d'écart de l'application. */
function Calculateur() {
  const [cote, setCote] = useState(8)
  const [modele, setModele] = useState(18)
  const implicite = 100 / cote
  const ecart = modele > implicite * (1 + MARGE_ECART)
  const fmt = (v: number) => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',').replace(',0', '')
  const marge = Math.round(MARGE_ECART * 100)
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
  return (
    <div className="flex flex-col gap-5 p-[1.375rem] lg:p-6 rounded-3xl bg-surface border border-line">
      <h3 className="text-[1.0625rem] font-extrabold">Essayez vous-même</h3>
      <div className="flex flex-col gap-2">
        <label htmlFor="calc-cote" className="flex justify-between text-sm font-semibold text-muted">
          <span>Cote du cheval</span>
          <span className="num text-[0.9375rem] font-extrabold text-ink">{fmt(cote)}</span>
        </label>
        <input
          id="calc-cote"
          type="range"
          min={1.5}
          max={30}
          step={0.5}
          value={cote}
          onChange={(e) => setCote(Number(e.target.value))}
          className="w-full h-8 accent-accent"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="calc-modele" className="flex justify-between text-sm font-semibold text-muted">
          <span>Chances selon le modèle</span>
          <span className="num text-[0.9375rem] font-extrabold text-accent">{modele}&nbsp;%</span>
        </label>
        <input
          id="calc-modele"
          type="range"
          min={1}
          max={50}
          step={1}
          value={modele}
          onChange={(e) => setModele(Number(e.target.value))}
          className="w-full h-8 accent-accent"
        />
      </div>
      <div className="flex flex-col gap-2.5 pt-3.5 border-t border-track">
        <div className="num grid grid-cols-[8.5rem_minmax(0,1fr)_3.5rem] lg:grid-cols-[9.375rem_minmax(0,1fr)_4rem] items-center gap-3 text-[0.8125rem] font-semibold text-muted">
          <span>Chances de la cote</span>
          {barre(implicite, false)}
          <span className="text-right font-extrabold text-ink">{fmt(implicite)}&nbsp;%</span>
        </div>
        <div className="num grid grid-cols-[8.5rem_minmax(0,1fr)_3.5rem] lg:grid-cols-[9.375rem_minmax(0,1fr)_4rem] items-center gap-3 text-[0.8125rem] font-semibold text-muted">
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
        Pour simplifier, la cote est lue ici sans retirer la marge de l’opérateur. L’application, elle, la retire.
      </p>
    </div>
  )
}

const NIVEAUX = [
  {
    niveau: 3,
    libelle: 'Élevée',
    texte: `Le favori du modèle a au moins ${pourcent(SEUILS_CONFIANCE.elevee)} de chances. Il se détache nettement.`,
  },
  {
    niveau: 2,
    libelle: 'Moyenne',
    texte: `Le favori a entre ${Math.round(SEUILS_CONFIANCE.moyenne * 100)} et ${Math.round(SEUILS_CONFIANCE.elevee * 100) - 1} % de chances. Quelques chevaux se tiennent.`,
  },
  {
    niveau: 1,
    libelle: 'Faible',
    texte: `Le favori a moins de ${pourcent(SEUILS_CONFIANCE.moyenne)} de chances. Course très ouverte.`,
  },
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

export default function Methode() {
  useTitre('Comment ça marche')
  const tete = EXEMPLE.partants[0]

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-4 px-5 lg:px-20 pt-9 lg:pt-[4.5rem] animate-fade-up">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Méthodologie</span>
        <h1 className="text-[1.875rem] lg:text-[2.75rem] font-extrabold tracking-[-0.035em] leading-[1.05]">Comment ça marche</h1>
        <p className="max-w-[47.5rem] text-[0.9375rem] lg:text-[0.9375rem] font-medium leading-[1.7] text-soft">
          Tout ce qu’il faut pour lire un pronostic Crosswell, sans être data scientist&nbsp;: d’où viennent les
          pourcentages, ce que dit une cote, ce que veut dire l’écart au marché, et les limites de l’exercice.
        </p>
      </div>

      <div className="grid gap-8 lg:gap-14 lg:grid-cols-[13.75rem_minmax(0,1fr)] items-start px-5 lg:px-20 pt-6 lg:pt-14 pb-14 lg:pb-24">
        <nav
          aria-label="Sommaire"
          className="flex lg:flex-col gap-2 lg:gap-0.5 overflow-x-auto [scrollbar-width:none] -mx-5 px-5 lg:mx-0 lg:px-0 lg:sticky lg:top-24"
        >
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
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
                    {EXEMPLE.arrivee.slice(0, 4).map((n, i) => (
                      <Case key={n} n={n} accent={i === 0} grand />
                    ))}
                  </span>
                </div>
                <div className="grid grid-cols-[1.75rem_1.875rem_minmax(0,1fr)_auto_auto] items-center gap-2.5 pt-3 border-t border-track">
                  <span />
                  <Case n={tete.numero} />
                  <span className="text-[0.9375rem] font-bold truncate">{tete.nom}</span>
                  <span className="num flex items-center gap-1.5 text-[0.9375rem] font-extrabold">
                    <Repere n={2} />
                    {pourcent(tete.victoire)}
                  </span>
                  <span className="num flex items-center gap-1.5 text-sm font-bold text-muted">
                    <Repere n={3} />
                    {pourcent(tete.place)}
                  </span>
                </div>
                <Fictif />
              </div>
              <dl className="flex flex-col gap-4">
                {[
                  {
                    n: 1 as const,
                    t: 'Arrivée prédite',
                    d: 'Les chevaux classés du plus probable au moins probable. C’est un ordre de probabilités, pas une promesse d’arrivée.',
                  },
                  {
                    n: 2 as const,
                    t: '% de victoire',
                    d: `${pourcent(tete.victoire)} : si cette course se courait 100 fois dans les mêmes conditions, ce cheval en gagnerait environ ${Math.round(tete.victoire * 100)}. Pas les ${100 - Math.round(tete.victoire * 100)} autres.`,
                  },
                  {
                    n: 3 as const,
                    t: '% placé',
                    d: 'Les chances de finir dans les 3 premiers. Toujours plus élevé que le % de victoire.',
                  },
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
                  chances «&nbsp;réelles&nbsp;» d’après la cote sont donc un peu plus faibles que 1 ÷ cote&nbsp;:
                  l’application retire cette marge avant de comparer.
                </Paragraphe>
              </div>
              <Calculateur />
            </div>
          </Section>

          <Section id="ecart" titre="Quand le modèle voit plus haut que la cote">
            <Paragraphe>
              Un partant est marqué <span className="chip-accent align-middle">{LIBELLE_ECART}</span> quand ses chances
              selon le modèle dépassent d’au moins {Math.round(MARGE_ECART * 100)}&nbsp;% celles qu’implique sa cote (en
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
                        <span
                          key={i}
                          className={`block w-2 rounded-[3px] ${i <= n.niveau ? 'bg-accent' : 'bg-line-strong'}`}
                          style={{ height: 8 + i * 6 }}
                        />
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
            <a href={URL_RESULTATS} className="self-start text-[0.9375rem] font-bold text-accent hover:text-accent-hover">
              Voir tous nos résultats publiés
            </a>
          </Section>

          <Section id="questions" titre="Vous vous demandez peut-être">
            <Accordeon questions={QUESTIONS} nom="faq-methode" compact />
          </Section>

          <section className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 lg:gap-8 px-6 py-7 lg:px-10 lg:py-9 rounded-[1.5rem] bg-accent text-accent-ink">
            <span className="text-[1.25rem] lg:text-[1.5625rem] font-extrabold tracking-[-0.02em] leading-tight">
              Prêt à lire votre premier pronostic&nbsp;?
            </span>
            <a
              href={URL_INSCRIPTION}
              className="shrink-0 h-[3.25rem] px-[1.625rem] rounded-full bg-accent-ink text-accent flex items-center justify-center text-[0.9375rem] font-bold hover:opacity-90 transition-opacity"
            >
              Essayer gratuitement
            </a>
          </section>
        </div>
      </div>
    </div>
  )
}
