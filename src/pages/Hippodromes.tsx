import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, MapPin, Search } from 'lucide-react'
import type { ProfilPiste } from '@/types'
import { chargerProfils, vitesseDeReference } from '@/services/hippodromes'
import { useDonnees } from '@/data/DonneesContext'
import { ambianceDe } from '@/lib/ambiance'
import { hippodrome as formatHippodrome } from '@/lib/format'
import { Chargement, SqueletteListe } from '@/components/ui/Chargement'
import { Erreur, EtatVide } from '@/components/ui/EtatVide'

/** Sans accents ni casse : « clairefontaine » doit trouver « CLAIREFONTAINE »,
 *  et « mont de marsan » doit trouver « MONT-DE-MARSAN ». */
function normalise(t: string): string {
  return t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase()
}

function CartePiste({
  profil,
  reference,
  nosCourses,
}: {
  profil: ProfilPiste
  reference: number | null
  nosCourses: number
}) {
  const ambiance = useMemo(() => ambianceDe(profil.hippodrome), [profil.hippodrome])
  const chrono = profil.coursesChronometrees > 0 && profil.vitesseMoy != null
  const ecart = chrono && reference != null ? profil.vitesseMoy! - reference : null

  return (
    <Link
      to={`/hippodromes/${encodeURIComponent(profil.hippodrome)}`}
      className="group relative overflow-hidden rounded-3xl border border-white/10 p-5 sm:p-6
                 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20
                 hover:shadow-lift animate-fade-up"
    >
      {/* L'ambiance propre à la piste, en fond de carte : c'est elle qui rend
          une grille de vingt-six noms reconnaissable au coup d'œil. */}
      <span
        aria-hidden
        className="absolute inset-0 opacity-70 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: ambiance.halos }}
      />
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: ambiance.filet }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display font-semibold text-lg tracking-tight truncate">
            {formatHippodrome(profil.hippodrome)}
          </h2>
          <p className="num text-xs text-muted mt-1.5">
            {profil.courses.toLocaleString('fr-FR')} courses relevées
            {nosCourses > 0 && (
              <>
                <span className="text-faint"> · </span>
                {nosCourses} chez nous
              </>
            )}
          </p>
        </div>
        <ArrowUpRight
          size={18}
          className="text-faint group-hover:text-accent transition-colors shrink-0"
        />
      </div>

      <div className="relative flex items-end gap-6 mt-6">
        <div>
          <p className="num font-display font-bold text-2xl leading-none">
            {chrono ? profil.vitesseMoy!.toFixed(1).replace('.', ',') : '—'}
            {chrono && <span className="text-xs text-faint font-sans ml-1">km/h</span>}
          </p>
          <p className="text-[0.6875rem] text-faint mt-1.5">
            {chrono ? 'vitesse moyenne' : 'piste non chronométrée'}
          </p>
        </div>

        {ecart != null && Math.abs(ecart) >= 0.2 && (
          <p
            className={`num text-xs mb-1 ${ecart > 0 ? 'text-accent' : 'text-info'}`}
            title="Écart à la moyenne de toutes les pistes relevées"
          >
            {ecart > 0 ? '+' : '−'}
            {Math.abs(ecart).toFixed(1).replace('.', ',')} km/h
          </p>
        )}
      </div>
    </Link>
  )
}

export default function Hippodromes() {
  const { courses, pret } = useDonnees()
  const [profils, setProfils] = useState<ProfilPiste[] | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [essai, setEssai] = useState(0)
  const [recherche, setRecherche] = useState('')

  useEffect(() => {
    let vivant = true
    setErreur(null)
    chargerProfils()
      .then((p) => vivant && setProfils(p))
      .catch((e) => {
        if (!vivant) return
        setErreur(e instanceof Error ? e.message : 'Erreur inconnue')
        setProfils([])
      })
    return () => {
      vivant = false
    }
  }, [essai])

  const reference = useMemo(() => (profils ? vitesseDeReference(profils) : null), [profils])

  /** Combien de courses nous avons pronostiquées sur chaque piste. */
  const nosVolumes = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of courses) m.set(c.hippodrome, (m.get(c.hippodrome) ?? 0) + 1)
    return m
  }, [courses])

  const filtres = useMemo(() => {
    if (!profils) return []
    const q = normalise(recherche)
    if (!q) return profils
    return profils.filter((p) => normalise(p.hippodrome).includes(q))
  }, [profils, recherche])

  if (erreur) return <Erreur message={erreur} onReessayer={() => setEssai((n) => n + 1)} />
  if (profils == null) return <Chargement plein texte="Chargement des pistes…" />

  return (
    <div className="space-y-6">
      <header>
        <h1 className="titre-page">Hippodromes</h1>
        <p className="text-sm text-muted mt-2.5 max-w-2xl leading-relaxed">
          Le profil de chaque piste, relevé sur plusieurs saisons de chronos — et ce que nos
          pronostics y ont donné. {profils.length} pistes profilées
          {reference != null && (
            <>
              , pour une vitesse moyenne de{' '}
              <span className="num text-ink">{reference.toFixed(1).replace('.', ',')} km/h</span>
            </>
          )}
          .
        </p>
      </header>

      <div className="relative max-w-sm">
        <Search
          size={16}
          aria-hidden
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint"
        />
        <input
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher une piste…"
          aria-label="Rechercher une piste"
          className="glass-nest w-full h-11 sm:h-10 rounded-full pl-10 pr-4 text-sm text-ink
                     placeholder:text-faint"
        />
      </div>

      {!pret && <SqueletteListe lignes={3} />}

      {filtres.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtres.map((p) => (
            <CartePiste
              key={p.hippodrome}
              profil={p}
              reference={reference}
              nosCourses={nosVolumes.get(p.hippodrome) ?? 0}
            />
          ))}
        </div>
      ) : (
        <div className="card">
          <EtatVide
            icone={<MapPin size={20} aria-hidden />}
            titre="Aucune piste ne correspond"
            texte="Seules les pistes comptant au moins vingt courses relevées sont profilées."
            action={
              <button className="btn-glass" onClick={() => setRecherche('')}>
                Effacer la recherche
              </button>
            }
          />
        </div>
      )}

      <p className="text-xs text-faint leading-relaxed max-w-2xl">
        Les profils sont des moyennes de chronos agrégées par piste, sans aucune donnée
        individuelle. Le tracé et l'état du terrain n'y figurent pas : ces informations ne sont pas
        dans nos sources.
      </p>
    </div>
  )
}
