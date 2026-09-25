import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Fiche, PerformanceCheval, Partant } from '@/types'
import { chargerFiche } from '@/services/fiches'
import { lienPro } from '@/lib/professionnels'
import { dateCourte, hippodrome as formatHippodrome } from '@/lib/format'
import {
  carriere,
  discipline,
  euros,
  metres,
  musique,
  nomPropre,
  placeLisible,
  tonPlace,
  type TonPlace,
} from '@/lib/fiche'

export type EtatFiche =
  | { etat: 'chargement' }
  | { etat: 'ok'; fiche: Fiche }
  | { etat: 'indisponible' }

/**
 * La fiche France Galop d'un partant, chargée à l'ouverture. Un échec (vues de
 * `db/004` absentes, session expirée) ne casse rien : la fiche garde son
 * pronostic et dit que le reste est indisponible.
 */
export function useFiche(partant: Partant): EtatFiche {
  const [etat, setEtat] = useState<EtatFiche>({ etat: 'chargement' })
  useEffect(() => {
    if (!partant.idFg) {
      setEtat({ etat: 'indisponible' })
      return
    }
    let vivant = true
    setEtat({ etat: 'chargement' })
    chargerFiche(partant.idFg, partant.nom)
      .then((fiche) => vivant && setEtat({ etat: 'ok', fiche }))
      .catch(() => vivant && setEtat({ etat: 'indisponible' }))
    return () => {
      vivant = false
    }
  }, [partant.idFg, partant.nom])
  return etat
}

/** Les couleurs des cases de place, comme dans la maquette. */
export const TON_PLACE: Record<TonPlace, string> = {
  place: 'bg-accent text-accent-ink',
  neutre: 'bg-raised-2 text-ink border border-line-strong',
  loin: 'bg-raised text-dim border border-line',
}

function Titre({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h3 className="text-[0.9375rem] lg:text-[0.9375rem] font-bold">{children}</h3>
      {aside && <span className="text-xs font-medium text-faint text-right">{aside}</span>}
    </div>
  )
}

/**
 * L'entourage et les origines, en grille (3 colonnes, 2 sur téléphone). Le
 * jockey est celui de la DERNIÈRE course : la monte du jour n'est pas connue
 * (les engagements ne sont plus relevés).
 */
export function Entourage({ fiche }: { fiche: Fiche }) {
  const derniere = fiche.performances[0]
  const cases = [
    { libelle: 'Dernier jockey', valeur: nomPropre(derniere?.jockey ?? null), lien: derniere?.jockey ? lienPro('jockey', derniere.jockey) : null },
    { libelle: 'Entraîneur', valeur: nomPropre(derniere?.entraineur ?? null), lien: derniere?.entraineur ? lienPro('entraineur', derniere.entraineur) : null },
    { libelle: 'Père', valeur: nomPropre(fiche.profil?.pere ?? null) },
    { libelle: 'Mère', valeur: nomPropre(fiche.profil?.mere ?? null) },
    { libelle: 'Propriétaire', valeur: nomPropre(fiche.profil?.proprietaire ?? null) },
    { libelle: 'Éleveur', valeur: nomPropre(fiche.profil?.eleveur ?? null) },
  ].filter((c) => c.valeur)
  if (cases.length === 0) return null
  return (
    <dl className="grid grid-cols-2 lg:grid-cols-3 gap-x-3 lg:gap-x-4 gap-y-3.5 lg:gap-y-[1.125rem]">
      {cases.map((c) => (
        <div key={c.libelle} className="flex flex-col gap-[3px] lg:gap-1 min-w-0">
          <dt className="text-[0.625rem] lg:text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-faint">{c.libelle}</dt>
          <dd className="text-sm font-semibold truncate" title={c.valeur ?? undefined}>
            {'lien' in c && c.lien ? (
              <Link to={c.lien} className="underline decoration-line-strong underline-offset-[3px] hover:text-accent hover:decoration-accent">
                {c.valeur}
              </Link>
            ) : (
              c.valeur
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function Musique({ fiche }: { fiche: Fiche }) {
  const cases = musique(fiche.performances)
  if (cases.length === 0) return null
  return (
    <section className="flex flex-col gap-3.5">
      <Titre aside={`${cases.length} dernière${cases.length > 1 ? 's' : ''} course${cases.length > 1 ? 's' : ''} · la plus récente à gauche`}>
        Musique
      </Titre>
      <div className="grid grid-cols-6 lg:flex gap-1.5 lg:gap-2">
        {cases.map((c, i) => (
          <span
            key={i}
            className={`num h-[1.625rem] lg:h-[2.625rem] lg:min-w-[2.875rem] px-0.5 lg:px-2 rounded-[8px] lg:rounded-[10px] grid place-items-center text-[0.625rem] lg:text-[0.9375rem] font-extrabold ${TON_PLACE[c.ton]}`}
          >
            {c.libelle}
          </span>
        ))}
      </div>
    </section>
  )
}

export function Carriere({ fiche }: { fiche: Fiche }) {
  const c = carriere(fiche.performances)
  if (c.courses === 0) return null
  const cases = [
    { libelle: 'Courses', valeur: String(c.courses) },
    { libelle: 'Victoires', valeur: String(c.victoires) },
    { libelle: 'Places', valeur: String(c.places) },
    { libelle: 'Allocations', valeur: euros(c.allocations) },
  ]
  return (
    <section className="flex flex-col gap-3.5">
      <Titre>Carrière</Titre>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-2.5">
        {cases.map((x) => (
          <div key={x.libelle} className="flex flex-col gap-1 p-3.5 rounded-xl bg-surface border border-line min-w-0">
            <span className="num text-[1.0625rem] lg:text-[1.1875rem] font-extrabold whitespace-nowrap">{x.valeur}</span>
            <span className="text-xs font-semibold text-faint">{x.libelle}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function LignePerformance({ p }: { p: PerformanceCheval }) {
  const m = metres(p.distance)
  const course = [discipline(p.specialite), m != null ? `${m.toLocaleString('fr-FR')} m` : null, p.categorie]
    .filter(Boolean)
    .join(' · ')
  return (
    <div className="num grid grid-cols-[4.25rem_minmax(0,1fr)_auto] lg:grid-cols-[4.75rem_minmax(0,1fr)_minmax(0,9rem)_3.5rem] items-center gap-3 lg:gap-3.5 min-h-[3.25rem] py-2 border-t border-track text-sm">
      <span className="font-semibold">{p.date ? dateCourte(p.date) : '—'}</span>
      <span className="min-w-0 flex flex-col gap-0.5">
        <span className="font-medium text-muted truncate">{formatHippodrome(p.hippodrome)}</span>
        <span className="text-xs font-medium text-faint truncate">
          <span className="lg:hidden">{course}</span>
          {p.jockey && (
            <Link to={lienPro('jockey', p.jockey)} className="hidden lg:inline hover:text-accent hover:underline">
              {nomPropre(p.jockey)}
            </Link>
          )}
        </span>
      </span>
      <span className="hidden lg:block text-[0.8125rem] font-medium text-faint truncate">{course}</span>
      <span
        className={`justify-self-end min-w-[2.75rem] h-[1.875rem] px-2 rounded-[10px] grid place-items-center text-xs font-extrabold ${TON_PLACE[tonPlace(p.place)]}`}
        title={placeLisible(p.place)}
      >
        {placeLisible(p.place)}
      </span>
    </div>
  )
}

/** Les dernières courses : cinq, puis toutes celles relevées. */
export function DernieresCourses({ fiche }: { fiche: Fiche }) {
  const [tout, setTout] = useState(false)
  const n = fiche.performances.length
  if (n === 0) return null
  const visibles = tout ? fiche.performances : fiche.performances.slice(0, 5)
  return (
    <section className="flex flex-col gap-1.5">
      <Titre aside={n > 5 && !tout ? `${n} courses relevées` : undefined}>Dernières courses</Titre>
      <div className="mt-2">
        {visibles.map((p, i) => (
          <LignePerformance key={`${p.date}-${i}`} p={p} />
        ))}
      </div>
      {n > 5 && (
        <button type="button" className="btn-glass self-start mt-2 !h-10 !text-[0.8125rem]" onClick={() => setTout((t) => !t)}>
          {tout ? 'Réduire' : `Voir les ${n} courses`}
        </button>
      )}
    </section>
  )
}

/** Le squelette des sections France Galop, pendant le chargement. */
export function SqueletteFiche() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Chargement de la fiche">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton h-10" />
        ))}
      </div>
      <div className="skeleton h-12" />
      <div className="skeleton h-40" />
    </div>
  )
}
