import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { RotateCcw, Search, SearchX } from 'lucide-react'
import { FENETRE_JOURS } from '@/config/app'
import { useDonnees } from '@/data/DonneesContext'
import { CarteReunion } from '@/components/course/CarteReunion'
import { SqueletteListe } from '@/components/ui/Chargement'
import { Erreur, EtatVide } from '@/components/ui/EtatVide'
import { Segmente } from '@/components/ui/Segmente'
import type { Option } from '@/components/ui/Segmente'
import { dateLongue, jourISO } from '@/lib/format'
import type { Reunion } from '@/types'

type Periode = 'avenir' | '7' | '30'
type Statut = 'toutes' | 'courues' | 'avenir'

const PERIODE_DEFAUT: Periode = '7'
const STATUT_DEFAUT: Statut = 'toutes'

const OPTIONS_PERIODE: Option<Periode>[] = [
  { valeur: 'avenir', libelle: 'À venir' },
  { valeur: '7', libelle: '7 jours' },
  { valeur: '30', libelle: '30 jours' },
]

const OPTIONS_STATUT: Option<Statut>[] = [
  { valeur: 'toutes', libelle: 'Toutes' },
  { valeur: 'courues', libelle: 'Courues' },
  { valeur: 'avenir', libelle: 'À venir' },
]

/**
 * Les hippodromes arrivent en capitales accentuées et ponctuées à la française
 * (« MONT-DE-MARSAN », « CLAIREFONTAINE »). Une recherche naïve rate donc
 * « mont de marsan » comme « clairefontaine ». On ramène les deux côtés à une
 * forme sans diacritiques, sans casse et sans ponctuation avant de comparer.
 */
function normalise(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function capitalise(texte: string): string {
  return texte.charAt(0).toLocaleUpperCase('fr') + texte.slice(1)
}

export default function Reunions() {
  const { reunions, pret, erreur, rafraichir } = useDonnees()

  const [periode, setPeriode] = useState<Periode>(PERIODE_DEFAUT)
  const [statut, setStatut] = useState<Statut>(STATUT_DEFAUT)
  const [recherche, setRecherche] = useState('')

  const aujourdhui = jourISO(0)
  const filtreActif = periode !== PERIODE_DEFAUT || statut !== STATUT_DEFAUT || recherche.trim() !== ''

  function reinitialiser() {
    setPeriode(PERIODE_DEFAUT)
    setStatut(STATUT_DEFAUT)
    setRecherche('')
  }

  const filtrees = useMemo(() => {
    /* « 7 jours » et « 30 jours » ne posent qu'une borne BASSE : la journée de
       demain, qui est le cœur du produit, reste visible dans les trois vues. */
    const depuis =
      periode === 'avenir' ? aujourdhui : periode === '7' ? jourISO(-6) : jourISO(-FENETRE_JOURS)
    const requete = normalise(recherche)

    return reunions.filter((r) => {
      if (r.date < depuis) return false
      // Une réunion est « courue » dès la première course jugée : le matin,
      // une réunion entamée doit rester joignable depuis les deux filtres.
      if (statut === 'courues' && r.courues === 0) return false
      if (statut === 'avenir' && r.courues > 0) return false
      if (requete !== '' && !normalise(r.hippodrome).includes(requete)) return false
      return true
    })
  }, [reunions, periode, statut, recherche, aujourdhui])

  const totaux = useMemo(
    () => ({
      reunions: filtrees.length,
      courses: filtrees.reduce((n, r) => n + r.courses.length, 0),
    }),
    [filtrees],
  )

  const groupes = useMemo(() => {
    const parDate = new Map<string, Reunion[]>()
    for (const r of filtrees) {
      const liste = parDate.get(r.date)
      if (liste) liste.push(r)
      else parDate.set(r.date, [r])
    }
    return Array.from(parDate, ([date, liste]) => ({
      date,
      liste: [...liste].sort((a, b) => a.hippodrome.localeCompare(b.hippodrome, 'fr')),
    })).sort((a, b) => b.date.localeCompare(a.date))
  }, [filtrees])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="titre-page">Réunions</h1>
        {pret && !erreur ? (
          <p className="text-sm text-muted mt-2.5">
            <span className="num">{totaux.reunions}</span> réunion
            {totaux.reunions > 1 ? 's' : ''}
            <span className="text-faint"> · </span>
            <span className="num">{totaux.courses}</span> course{totaux.courses > 1 ? 's' : ''}
          </p>
        ) : (
          <p className="text-sm text-muted mt-2.5">
            Toutes les réunions des {FENETRE_JOURS} derniers jours et de demain.
          </p>
        )}
      </header>

      {erreur ? (
        <Erreur message={erreur} onReessayer={rafraichir} />
      ) : !pret ? (
        <SqueletteListe lignes={6} />
      ) : (
        <>
          <div className="card-nest p-3 sm:p-4 flex flex-wrap items-center gap-3">
            <Segmente
              options={OPTIONS_PERIODE}
              valeur={periode}
              onChange={setPeriode}
              aria="Période affichée"
            />

            <div className="relative flex-1 min-w-[13rem]">
              <Search
                size={16}
                aria-hidden
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint"
              />
              <input
                type="search"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher un hippodrome…"
                aria-label="Rechercher un hippodrome"
                className="glass-nest w-full h-11 sm:h-10 rounded-full pl-10 pr-4 text-sm text-ink
                           placeholder:text-faint"
              />
            </div>

            <Segmente
              options={OPTIONS_STATUT}
              valeur={statut}
              onChange={setStatut}
              aria="Statut des réunions"
            />

            {filtreActif && (
              <button className="btn-ghost" onClick={reinitialiser}>
                <RotateCcw size={15} aria-hidden />
                Réinitialiser
              </button>
            )}
          </div>

          {groupes.length === 0 ? (
            <div className="card">
              <EtatVide
                icone={<SearchX size={20} />}
                titre="Aucune réunion ne correspond"
                texte="Élargissez la période ou effacez la recherche pour retrouver les réunions de la fenêtre chargée."
                action={
                  <button className="btn-glass" onClick={reinitialiser}>
                    Réinitialiser les filtres
                  </button>
                }
              />
            </div>
          ) : (
            <div className="space-y-6">
              {groupes.map((groupe) => {
                const relatif =
                  groupe.date === aujourdhui
                    ? "aujourd'hui"
                    : groupe.date === jourISO(1)
                      ? 'demain'
                      : groupe.date === jourISO(-1)
                        ? 'hier'
                        : null

                return (
                  <section key={groupe.date}>
                    <div className="sticky top-16 z-10 py-2">
                      <div
                        className="inline-flex items-center gap-2 rounded-full bg-canvas/70
                                   backdrop-blur-xl border border-white/[0.07] pl-4 pr-3 py-1.5"
                      >
                        <h2 className="text-sm font-medium">{capitalise(dateLongue(groupe.date))}</h2>
                        {relatif && <span className="chip-neutral">{relatif}</span>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {groupe.liste.map((r) => (
                        <CarteReunion key={r.cle} reunion={r} />
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>
          )}

          <p className="text-xs text-faint leading-relaxed">
            La consultation directe couvre les {FENETRE_JOURS} derniers jours ainsi que la journée
            de demain. Au-delà, l'historique complet — taux de réussite, calibration et comparaison au marché,
            avec leurs tailles d'échantillon — est repris dans{' '}
            <Link to="/resultats" className="link">
              nos résultats
            </Link>
            .
          </p>
        </>
      )}
    </div>
  )
}
