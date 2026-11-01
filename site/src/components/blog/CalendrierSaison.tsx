import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

/**
 * LE CALENDRIER DE LA SAISON, d'après la maquette « Blog · Les grandes courses
 * de l'année » (26/10/2026) : bandeau de chiffres, barres par mois, filtres en
 * pilules, puis les courses groupées par mois en cartes sur deux colonnes.
 *
 * CE QUI S'ÉCARTE DE LA MAQUETTE, ET POURQUOI :
 *
 * 1. L'OBSTACLE NE COMMENCE QU'AU 17 SEPTEMBRE, et c'est la limite de nos
 *    données, pas celle du calendrier réel : plusieurs dizaines de courses de
 *    Groupe d'obstacle se courent avant, mais seules les 14 postérieures à
 *    cette date portent un nom chez nous. Le composant le DIT à l'écran dès que
 *    l'obstacle est affiché — un filtre « Obstacle » qui ne montrerait que
 *    septembre et octobre sans l'expliquer ferait croire à un calendrier vide.
 *
 *    AUCUN CHIFFRE PRÉCIS ICI, ET C'EST VOULU. Compter ces courses demande une
 *    clé de course, et `chevaux.performances` n'en a pas : son `course_id` est
 *    réutilisé — un seul identifiant y revient sur 93 dates, 13 hippodromes et
 *    48 années. La clé de repli (date + hippodrome + distance + spécialité +
 *    catégorie) fusionne deux courses de même distance le même jour, ce qui
 *    arrive à Auteuil. Tout total tiré de cette table est donc un plancher.
 *
 * 2. Les Listed ne sont pas servies. Aucune de nos sources ne les nomme : il
 *    faut rapprocher deux tables sur date + hippodrome + distance, et ce
 *    rapprochement se trompe. Mesuré : une minorité seulement des Listed de
 *    plat obtient un nom sans ambiguïté, et certaines héritaient du nom d'une
 *    course de GROUPE courue le même jour sur la même distance — une faute pire
 *    qu'une absence.
 *
 * 3. Ni mention des jeux d'argent, ni lien « Jeu responsable », que la maquette
 *    place en pied de page. Arbitrage du fondateur du 18/09/2026, voir
 *    `site/CLAUDE.md` : les maquettes assument l'univers du pari, nous non.
 *
 * Le composant ne connaît pas la provenance des courses : il affiche ce qu'on
 * lui donne. Élargir le périmètre se fera dans le fichier de données.
 */

export type Course = {
  d: string
  g: number
  n: string
  h: string
  m: number
  disc?: string
  a?: string
  s?: string
  p?: number
}

const MOIS_COURT = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.']
const MOIS_LONG = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const JOURS = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.']

const NIVEAU = ['', 'Groupe 1', 'Groupe 2', 'Groupe 3']

const AGE: Record<string, string> = {
  DEUX_ANS: '2 ans',
  DEUX_ANS_ET_PLUS: '2 ans et plus',
  TROIS_ANS: '3 ans',
  TROIS_ANS_ET_PLUS: '3 ans et plus',
  QUATRE_ANS_ET_PLUS: '4 ans et plus',
}

const SEXE: Record<string, string> = {
  TOUS_CHEVAUX: '',
  FEMELLES: 'femelles',
  MALES: 'mâles',
  MALES_ET_HONGRES: 'mâles et hongres',
  FEMELLES_ET_MALES: 'hongres exclus',
}

/** Les journées servies par les pages de résultats : avant, il n'y a pas de page. */
const PREMIER_JOUR_SERVI = '09-10'

const estPlat = (c: Course) => !c.disc || c.disc === 'Plat'

type Filtres = { niveau: number; public: string; discipline: string }

const PUBLICS: { cle: string; libelle: string; test: (c: Course) => boolean }[] = [
  { cle: 'tous', libelle: 'Toutes catégories', test: () => true },
  { cle: '2ans', libelle: '2 ans', test: (c) => !!c.a?.startsWith('DEUX_ANS') },
  { cle: '3ans', libelle: '3 ans', test: (c) => !!c.a?.startsWith('TROIS_ANS') },
  { cle: 'age', libelle: "Chevaux d'âge", test: (c) => c.a === 'QUATRE_ANS_ET_PLUS' },
  { cle: 'femelles', libelle: 'Femelles', test: (c) => c.s === 'FEMELLES' },
]

const DISCIPLINES = [
  { cle: 'tout', libelle: 'Plat et obstacle' },
  { cle: 'plat', libelle: 'Plat' },
  { cle: 'obstacle', libelle: 'Obstacle' },
]

export default function CalendrierSaison({ courses, saison }: { courses: Course[]; saison: number }) {
  const [filtres, setFiltres] = useState<Filtres>({ niveau: 0, public: 'tous', discipline: 'tout' })

  const triees = useMemo(() => [...courses].sort((a, b) => a.d.localeCompare(b.d) || a.n.localeCompare(b.n)), [courses])

  const retenues = useMemo(() => {
    const parPublic = PUBLICS.find((p) => p.cle === filtres.public) ?? PUBLICS[0]
    return triees.filter(
      (c) =>
        (filtres.niveau === 0 || c.g === filtres.niveau) &&
        (filtres.discipline === 'tout' || (filtres.discipline === 'plat' ? estPlat(c) : !estPlat(c))) &&
        parPublic.test(c),
    )
  }, [triees, filtres])

  const parMois = useMemo(() => {
    const groupes = new Map<number, Course[]>()
    for (const c of retenues) {
      const mois = Number(c.d.slice(0, 2)) - 1
      if (!groupes.has(mois)) groupes.set(mois, [])
      groupes.get(mois)!.push(c)
    }
    return [...groupes.entries()].sort((a, b) => a[0] - b[0])
  }, [retenues])

  /** Les barres comptent TOUTES les courses, pas seulement les retenues : le
   *  relief de la saison ne doit pas bouger quand on change de filtre. */
  const parMoisTotal = useMemo(() => {
    const n = new Array(12).fill(0) as number[]
    for (const c of courses) n[Number(c.d.slice(0, 2)) - 1] += 1
    return n
  }, [courses])

  const sommet = Math.max(...parMoisTotal, 1)
  const plat = courses.filter(estPlat).length
  const obstacle = courses.length - plat
  const compte = (niveau: number) => courses.filter((c) => c.g === niveau).length

  return (
    <div className="flex flex-col gap-8 lg:gap-10">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="flex flex-col gap-1 px-5 py-4 rounded-2xl bg-accent text-black">
          <span className="num text-[2rem] font-extrabold leading-none">{courses.length}</span>
          <span className="text-[0.8125rem] font-semibold leading-tight">courses de Groupe en {saison}</span>
        </div>
        {[
          { valeur: plat, libelle: 'sur le plat' },
          { valeur: obstacle, libelle: "en obstacle" },
          { valeur: compte(1), libelle: 'Groupe 1' },
        ].map((t) => (
          <div key={t.libelle} className="flex flex-col gap-1 px-5 py-4 rounded-2xl bg-surface border border-line">
            <span className="num text-[2rem] font-extrabold leading-none">{t.valeur}</span>
            <span className="text-[0.8125rem] text-muted leading-tight">{t.libelle}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-5">
        <Barres mois={parMoisTotal} sommet={sommet} />
        <Pilules filtres={filtres} changer={setFiltres} compte={compte} />
      </div>

      {parMois.length === 0 ? (
        <p className="text-[0.9375rem] text-muted">Aucune course ne répond à ce filtre.</p>
      ) : (
        parMois.map(([mois, liste]) => (
          <section key={mois} className="flex flex-col gap-4">
            <header className="flex items-baseline justify-between gap-4 border-b border-line pb-2">
              <h3 className="font-display font-extrabold text-[1.25rem] lg:text-[1.375rem] tracking-[-0.01em]">
                {MOIS_LONG[mois]} {saison}
              </h3>
              <span className="text-xs text-faint shrink-0">
                {liste.length} course{liste.length > 1 ? 's' : ''}
              </span>
            </header>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {liste.map((c) => (
                <Carte key={`${c.d}-${c.n}`} course={c} saison={saison} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  )
}

function Barres({ mois, sommet }: { mois: number[]; sommet: number }) {
  return (
    <div className="grid grid-cols-12 gap-1.5 lg:gap-2">
      {mois.map((n, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5">
          <div className="w-full h-16 flex items-end">
            <div
              className={`w-full rounded-t-[0.25rem] ${n > 0 ? 'bg-accent' : 'bg-track'}`}
              style={{ height: `${n > 0 ? Math.max(8, (n / sommet) * 100) : 4}%` }}
            />
          </div>
          <span className="text-[0.625rem] text-faint leading-none">{MOIS_COURT[i]}</span>
          <span className={`text-[0.6875rem] leading-none ${n > 0 ? 'text-soft font-semibold' : 'text-faint'}`}>
            {n > 0 ? n : '—'}
          </span>
        </div>
      ))}
    </div>
  )
}

function Pilules({
  filtres,
  changer,
  compte,
}: {
  filtres: Filtres
  changer: (f: Filtres) => void
  compte: (niveau: number) => number
}) {
  const pilule = (actif: boolean) =>
    `px-3.5 py-1.5 rounded-full text-[0.8125rem] leading-none transition-colors ${
      actif ? 'bg-accent text-black font-semibold' : 'bg-surface border border-line text-muted hover:text-ink'
    }`

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap gap-2">
        {DISCIPLINES.map((d) => (
          <button key={d.cle} type="button" className={pilule(filtres.discipline === d.cle)} onClick={() => changer({ ...filtres, discipline: d.cle })}>
            {d.libelle}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={pilule(filtres.niveau === 0)} onClick={() => changer({ ...filtres, niveau: 0 })}>
          Tous les niveaux
        </button>
        {[1, 2, 3].map((n) => (
          <button key={n} type="button" className={pilule(filtres.niveau === n)} onClick={() => changer({ ...filtres, niveau: n })}>
            {NIVEAU[n]} <span className="opacity-60">{compte(n)}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {PUBLICS.map((p) => (
          <button key={p.cle} type="button" className={pilule(filtres.public === p.cle)} onClick={() => changer({ ...filtres, public: p.cle })}>
            {p.libelle}
          </button>
        ))}
      </div>
    </div>
  )
}

function Carte({ course, saison }: { course: Course; saison: number }) {
  const [mm, jj] = course.d.split('-')
  const jour = new Date(`${saison}-${mm}-${jj}T12:00:00Z`)
  const servie = course.d >= PREMIER_JOUR_SERVI
  const conditions = [course.a ? AGE[course.a] : '', course.s ? SEXE[course.s] : ''].filter(Boolean).join(', ')

  return (
    <article className="flex items-start gap-3.5 px-4 py-3.5 rounded-2xl bg-surface border border-line">
      <div className="flex flex-col items-center justify-center w-[3.25rem] shrink-0 py-1.5 rounded-xl bg-raised">
        <span className="text-[0.625rem] text-faint leading-none">{JOURS[jour.getUTCDay()]}</span>
        <span className="num text-[1.25rem] font-extrabold leading-tight">{Number(jj)}</span>
        <span className="text-[0.625rem] text-faint leading-none">{MOIS_COURT[Number(mm) - 1]}</span>
      </div>

      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex px-2 py-0.5 rounded-full bg-accent/[0.12] text-accent text-[0.6875rem] font-semibold leading-none">
            {NIVEAU[course.g]}
          </span>
          {!estPlat(course) && (
            <span className="inline-flex px-2 py-0.5 rounded-full bg-raised border border-line text-faint text-[0.6875rem] leading-none">
              {course.disc}
            </span>
          )}
        </span>
        {/* Le nom arrive déjà écrit : c'est l'article qui corrige accents et sigles. */}
        <h4 className="font-semibold text-[0.9375rem] leading-snug">{course.n}</h4>
        <p className="text-[0.8125rem] text-muted leading-snug">
          {course.h} · {course.m.toLocaleString('fr-FR')}&nbsp;m{conditions ? ` · ${conditions}` : ''}
        </p>
      </div>

      {servie && (
        <Link
          to={`/resultats/${saison}-${mm}-${jj}`}
          className="shrink-0 self-center text-[0.8125rem] text-accent hover:underline"
        >
          Résultat
        </Link>
      )}
    </article>
  )
}
