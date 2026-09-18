import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Search, SearchX } from 'lucide-react'
import type { Reunion } from '@/types'
import { FENETRE_JOURS } from '@/config/app'
import { useDonnees } from '@/data/DonneesContext'
import { resumeReunion } from '@/lib/avancee'
import { dateEnTete, decalerJour, hippodrome as formatHippodrome } from '@/lib/format'
import { bilan } from '@/lib/stats'
import { LIBELLE_VERDICT, lienCourse, verdictCourse, type Verdict } from '@/lib/programme'
import { useHeureParis } from '@/lib/useHeureParis'
import { SqueletteListe } from '@/components/ui/Chargement'
import { Erreur } from '@/components/ui/EtatVide'
import { Segmente, type Option } from '@/components/ui/Segmente'
import { CLASSE_CHAMP } from '@/components/ui/Champ'

type Periode = '7' | '30'
const OPTIONS_PERIODE: Option<Periode>[] = [
  { valeur: '7', libelle: '7 jours' },
  { valeur: '30', libelle: `${FENETRE_JOURS} jours` },
]

/** Le carré de verdict d'une course : plein (gagnant), bordé (placé), gris (manqué), creux (non jugée). */
const CARRE: Record<Verdict | 'attente', string> = {
  gagnant: 'bg-accent',
  place: 'border-2 border-accent',
  manque: 'bg-raised-2 border border-line-strong',
  sansSelection: 'bg-raised-2 border border-line-strong',
  attente: 'bg-track',
}

/** Recherche d'hippodrome tolérante : sans accents, sans casse, sans ponctuation. */
function normalise(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`

function LigneReunion({ reunion }: { reunion: Reunion }) {
  const b = bilan(reunion.courses)
  const premiere = reunion.courses[0]
  const carres = (
    <span className="flex flex-wrap gap-1" aria-hidden>
      {reunion.courses.map((c) => {
        const v = verdictCourse(c)
        return (
          <span
            key={c.cle}
            title={`C${c.numero} · ${v ? LIBELLE_VERDICT[v] : 'arrivée non relevée'}`}
            className={`w-3.5 h-3.5 rounded-[4px] ${CARRE[v ?? 'attente']}`}
          />
        )
      })}
    </span>
  )
  const resultat = b.jugees
    ? `${pluriel(b.gagnees, 'gagnée')} · ${pluriel(b.placees, 'placée')} sur ${b.jugees}`
    : 'Arrivées non relevées'

  return (
    <Link
      to={lienCourse(premiere)}
      aria-label={`${formatHippodrome(reunion.hippodrome)} : ${resultat}`}
      className="grid grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_13rem_1rem] items-center gap-x-4 gap-y-2.5 px-4 lg:px-6 py-3.5 lg:h-[4.25rem] border-t border-track first:border-t-0 transition-colors hover:bg-sunken"
    >
      <span className="min-w-0 flex flex-col gap-0.5">
        <span className="text-[0.9375rem] font-bold truncate">{formatHippodrome(reunion.hippodrome)}</span>
        <span className="num text-xs font-medium text-faint">{resumeReunion(reunion)}</span>
      </span>
      <span className="hidden lg:block">{carres}</span>
      <span className={`num text-right text-[0.8125rem] font-bold ${b.gagnees > 0 ? 'text-accent' : 'text-muted'}`}>
        {resultat}
      </span>
      <ChevronRight size={16} className="hidden lg:block text-dim" aria-hidden />
      <span className="lg:hidden col-span-2">{carres}</span>
    </Link>
  )
}

/**
 * RÉUNIONS PASSÉES — sans maquette (design/INTEGRATION.md) ; composée avec les
 * pièces des autres écrans. Aujourd'hui et demain vivent dans Courses ; ici,
 * les jours déjà courus de la fenêtre chargée, réunion par réunion, avec un
 * carré par course pour le verdict. Une réunion ouvre sa première course dans
 * la page Courses, qui montre alors le programme de ce jour-là.
 */
export default function Reunions() {
  const { reunions, pret, erreur, rafraichir } = useDonnees()
  const { jour: aujourdhui } = useHeureParis()
  const [periode, setPeriode] = useState<Periode>('7')
  const [recherche, setRecherche] = useState('')

  const jours = useMemo(() => {
    const depuis = decalerJour(aujourdhui, periode === '7' ? -7 : -FENETRE_JOURS)
    const requete = normalise(recherche)
    const retenues = reunions.filter(
      (r) => r.date < aujourdhui && r.date >= depuis && (!requete || normalise(r.hippodrome).includes(requete)),
    )
    const parJour = new Map<string, Reunion[]>()
    for (const r of retenues) parJour.set(r.date, [...(parJour.get(r.date) ?? []), r])
    return [...parJour.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, liste]) => ({ date, liste: liste.sort((a, b) => a.hippodrome.localeCompare(b.hippodrome, 'fr')) }))
  }, [reunions, aujourdhui, periode, recherche])

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      <header className="flex flex-col gap-1.5 lg:gap-2">
        <h1 className="text-[1.4375rem] lg:text-[2.3125rem] font-extrabold tracking-[-0.03em] leading-[1.05]">Réunions passées</h1>
        <p className="text-[0.8125rem] lg:text-[0.9375rem] font-medium text-faint">
          Les jours déjà courus, réunion par réunion. Pour aujourd’hui et demain, voyez{' '}
          <Link to="/courses" className="text-accent font-bold hover:text-accent-hover">
            Courses
          </Link>
          .
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 lg:p-[1.125rem_1.25rem] lg:rounded-[1.125rem] lg:bg-surface lg:border lg:border-line">
        <Segmente options={OPTIONS_PERIODE} valeur={periode} onChange={setPeriode} aria="Période affichée" />
        <label className="relative flex-1 min-w-[13rem]">
          <span className="sr-only">Rechercher un hippodrome</span>
          <Search size={16} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un hippodrome…"
            className={`${CLASSE_CHAMP} border-line-strong !h-11 pl-10`}
          />
        </label>
      </div>

      {erreur ? (
        <Erreur message={erreur} onReessayer={rafraichir} />
      ) : !pret ? (
        <SqueletteListe lignes={6} />
      ) : jours.length === 0 ? (
        <div className="flex flex-col items-center gap-3 text-center p-8 lg:p-12 rounded-[1.125rem] bg-surface border border-line">
          <SearchX size={22} className="text-faint" aria-hidden />
          <p className="font-bold">Aucune réunion ne correspond</p>
          <p className="text-sm text-muted max-w-sm">Élargissez la période ou effacez la recherche.</p>
        </div>
      ) : (
        <>
          {jours.map(({ date, liste }) => (
            <section key={date} className="flex flex-col gap-2.5" aria-label={dateEnTete(date)}>
              <div className="flex items-baseline justify-between gap-3 px-1">
                <h2 className="text-[0.9375rem] lg:text-[1.0625rem] font-bold">{dateEnTete(date)}</h2>
                <span className="num text-xs font-medium text-faint">
                  {pluriel(liste.length, 'réunion')} · {pluriel(liste.reduce((n, r) => n + r.courses.length, 0), 'course')}
                </span>
              </div>
              <div className="rounded-2xl bg-surface border border-line overflow-hidden">
                {liste.map((r) => (
                  <LigneReunion key={r.cle} reunion={r} />
                ))}
              </div>
            </section>
          ))}

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-xs font-semibold text-faint" aria-label="Légende">
            {(['gagnant', 'place', 'manque'] as const).map((v) => (
              <span key={v} className="flex items-center gap-2">
                <span className={`w-3.5 h-3.5 rounded-[4px] ${CARRE[v]}`} aria-hidden />
                {v === 'place' ? 'Placé (dans les 3)' : LIBELLE_VERDICT[v]}
              </span>
            ))}
            <span className="flex items-center gap-2">
              <span className={`w-3.5 h-3.5 rounded-[4px] ${CARRE.attente}`} aria-hidden />
              Arrivée non relevée
            </span>
          </div>
        </>
      )}

      <p className="text-xs text-faint leading-relaxed">
        La consultation couvre les {FENETRE_JOURS} derniers jours. L’historique complet, filtrable, est dans{' '}
        <Link to="/resultats" className="link">
          Nos résultats
        </Link>
        .
      </p>
    </div>
  )
}
