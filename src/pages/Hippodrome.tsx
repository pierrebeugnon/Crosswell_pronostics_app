import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Activity, ArrowRight, ChevronLeft, ChevronDown, Gauge, Info, MapPin, Timer } from 'lucide-react'
import type { ProfilPiste, VitesseParDistance } from '@/types'
import { chargerDistances, chargerProfils, vitesseDeReference } from '@/services/hippodromes'
import { useDonnees } from '@/data/DonneesContext'
import { ambianceDe } from '@/lib/ambiance'
import { bilan, parSegment, wilson } from '@/lib/stats'
import { trancheDistance } from '@/lib/aggregate'
import {
  dateCourte,
  distance as formatDistance,
  aHippodrome,
  hippodrome as formatHippodrome,
  trancheComplete,
  pourcent,
} from '@/lib/format'
import { Chargement } from '@/components/ui/Chargement'
import { Erreur, EtatVide } from '@/components/ui/EtatVide'
import { SectionImmersive, chaineSections } from '@/components/hippodrome/SectionImmersive'
import { CarteReunion } from '@/components/course/CarteReunion'

/**
 * Sous ce nombre de courses jugées, on n'affiche PAS de taux pour la piste.
 *
 * Vingt n'est pas un seuil de confort : sur six courses, l'intervalle de Wilson
 * couvre quarante points. Publier « 67 % de victoires » sur cet échantillon
 * serait une affirmation que les données ne portent pas, et le premier client
 * qui la vérifierait aurait raison contre nous. La page dit alors combien de
 * courses il manque, ce qui est une information ; un pourcentage inventé n'en
 * serait pas une.
 */
const SEUIL_PISTE = 20

/** Échelle de lecture des vitesses de plat, en km/h. */
const ECHELLE = { min: 53.5, max: 59 }

function Chiffre({
  valeur,
  unite,
  libelle,
  note,
}: {
  valeur: string
  unite?: string
  libelle: string
  note?: string
}) {
  return (
    <div className="text-center">
      <p className="num font-display font-bold tracking-tight text-[2rem] sm:text-[2.5rem] leading-none">
        {valeur}
        {unite && <span className="text-base sm:text-lg text-faint ml-1 font-sans">{unite}</span>}
      </p>
      <p className="text-xs text-muted mt-2">{libelle}</p>
      {note && <p className="num text-[0.6875rem] text-faint mt-1">{note}</p>}
    </div>
  )
}

/**
 * Position de la piste sur l'échelle nationale des vitesses.
 *
 * Une vitesse moyenne seule ne dit rien : 55,2 km/h est un chiffre, « la piste
 * la plus lente du panel » est une information. Le repère national est donc
 * dessiné sur la même règle, et c'est l'écart entre les deux marqueurs qui
 * porte le message.
 */
function ReglerVitesse({
  vitesse,
  reference,
}: {
  vitesse: number
  reference: number | null
}) {
  const position = (v: number) =>
    Math.max(0, Math.min(100, ((v - ECHELLE.min) / (ECHELLE.max - ECHELLE.min)) * 100))

  return (
    <div className="mt-8 max-w-xl mx-auto">
      <div className="relative h-2 rounded-full bg-white/[0.08]">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-accent/70"
          style={{ width: `${position(vitesse)}%` }}
        />
        {reference != null && (
          <span
            className="absolute -top-1 w-0.5 h-4 bg-white/45 rounded-full"
            style={{ left: `${position(reference)}%` }}
            aria-hidden
          />
        )}
      </div>

      <div className="flex justify-between num text-[0.6875rem] text-faint mt-2.5">
        <span>{ECHELLE.min.toFixed(1).replace('.', ',')} km/h</span>
        {reference != null && (
          <span className="text-muted">
            moyenne des pistes {reference.toFixed(1).replace('.', ',')}
          </span>
        )}
        <span>{ECHELLE.max.toFixed(1).replace('.', ',')} km/h</span>
      </div>
    </div>
  )
}

export default function Hippodrome() {
  const { nom } = useParams()
  const cible = (nom ?? '').toUpperCase()
  const { courses, pret } = useDonnees()

  const [profils, setProfils] = useState<ProfilPiste[] | null>(null)
  const [distances, setDistances] = useState<VitesseParDistance[]>([])
  const [erreur, setErreur] = useState<string | null>(null)
  const [essai, setEssai] = useState(0)

  useEffect(() => {
    let vivant = true
    setErreur(null)
    Promise.all([chargerProfils(), chargerDistances(cible)])
      .then(([p, d]) => {
        if (!vivant) return
        setProfils(p)
        setDistances(d)
      })
      .catch((e) => {
        if (!vivant) return
        setErreur(e instanceof Error ? e.message : 'Erreur inconnue')
        setProfils([])
      })
    return () => {
      vivant = false
    }
  }, [cible, essai])

  const profil = useMemo(
    () => profils?.find((p) => p.hippodrome === cible) ?? null,
    [profils, cible],
  )
  const reference = useMemo(() => (profils ? vitesseDeReference(profils) : null), [profils])

  /** Nos courses sur cette piste, dans la fenêtre chargée. */
  const notres = useMemo(() => courses.filter((c) => c.hippodrome === cible), [courses, cible])
  const notreBilan = useMemo(() => bilan(notres), [notres])
  const parType = useMemo(() => parSegment(notres, (c) => c.type), [notres])
  const parDistance = useMemo(
    () => parSegment(notres, (c) => trancheDistance(c.distance)),
    [notres],
  )
  const reunions = useMemo(() => {
    const m = new Map<string, (typeof notres)[number][]>()
    for (const c of notres) {
      const g = m.get(c.date) ?? []
      g.push(c)
      m.set(c.date, g)
    }
    return [...m.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 4)
      .map(([date, cs]) => ({
        cle: `${date}|${cible}`,
        date,
        hippodrome: cible,
        courses: [...cs].sort((a, b) => a.numero - b.numero),
        courues: cs.filter((c) => c.courue).length,
        gagnees: cs.filter((c) => c.gagne).length,
      }))
  }, [notres, cible])

  const ambiance = useMemo(() => ambianceDe(cible), [cible])

  if (erreur) return <Erreur message={erreur} onReessayer={() => setEssai((n) => n + 1)} />
  if (profils == null || !pret) return <Chargement plein texte="Chargement de la piste…" />

  if (!profil && notres.length === 0) {
    return (
      <div className="card">
        <EtatVide
          icone={<MapPin size={20} aria-hidden />}
          titre="Hippodrome inconnu"
          texte="Cette piste n'a ni profil relevé ni course dans notre fenêtre de consultation."
          action={
            <Link className="btn-glass" to="/hippodromes">
              Tous les hippodromes
            </Link>
          }
        />
      </div>
    )
  }

  const titre = formatHippodrome(cible)
  const chrono = profil && profil.coursesChronometrees > 0 && profil.vitesseMoy != null
  const assez = notreBilan.jugees >= SEUIL_PISTE
  const ic = assez ? wilson(notreBilan.gagnees, notreBilan.jugees) : null

  // L'alternance des bandes — et la couleur que chaque vague doit peindre
  // au-dessus d'elle — dépend des sections réellement AFFICHÉES, or quatre des
  // cinq sont conditionnelles. On les compte donc ici, dans le même ordre que
  // le JSX, plutôt que de câbler l'enchaînement à la main sous chaque `&&` :
  // c'est exactement la comptabilité qu'on finirait par fausser en ajoutant
  // une section.
  const affichees = [
    true, // Nos résultats ici
    Boolean(profil && chrono), // Le profil de la piste
    distances.length > 1, // Les distances
    parDistance.length > 0 && notreBilan.jugees > 0, // Ce que nous y avons pronostiqué
    reunions.length > 0, // Les dernières réunions
  ]
  const chaine = chaineSections(affichees.filter(Boolean).length, [
    ambiance.bande1,
    ambiance.bande2,
  ])
  let prochaine = 0
  const bandes = affichees.map((visible) => (visible ? chaine[prochaine++] : null))

  return (
    <div className="-mt-6 sm:-mt-10">
      {/* ───────────────────────── Ouverture ───────────────────────── */}
      <section className="relative w-screen left-1/2 -translate-x-1/2 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: ambiance.halos }} />

        <div className="relative mx-auto max-w-content px-4 sm:px-6 pt-6 pb-20 sm:pt-10 sm:pb-28">
          <Link to="/hippodromes" className="btn-ghost !px-0 mb-10">
            <ChevronLeft size={16} aria-hidden />
            Tous les hippodromes
          </Link>

          <div className="text-center max-w-2xl mx-auto animate-fade-up">
            <p className="label">Hippodrome</p>
            <h1 className="font-display font-semibold tracking-[-0.035em] text-[2.75rem] sm:text-[4.5rem] leading-[0.95] mt-3">
              {titre}
            </h1>
            {profil ? (
              <p className="num text-sm sm:text-base text-muted mt-5 leading-relaxed">
                {profil.courses.toLocaleString('fr-FR')} courses relevées depuis{' '}
                {profil.depuis.slice(0, 4)}
                {profil.partantsMoy != null && (
                  <>
                    <span className="text-faint"> · </span>
                    {profil.partantsMoy.toString().replace('.', ',')} partants en moyenne
                  </>
                )}
              </p>
            ) : (
              <p className="text-sm text-muted mt-5">
                Piste sans relevé de tracking — seules nos courses y sont décrites.
              </p>
            )}
          </div>

          {profil && (
            <div className="grid grid-cols-3 gap-4 mt-12 max-w-lg mx-auto animate-fade-up">
              <Chiffre
                valeur={chrono ? profil.vitesseMoy!.toFixed(1).replace('.', ',') : '—'}
                unite={chrono ? 'km/h' : undefined}
                libelle="vitesse moyenne"
              />
              <Chiffre
                valeur={
                  profil.train600 != null ? profil.train600.toFixed(1).replace('.', ',') : '—'
                }
                unite={profil.train600 != null ? 's' : undefined}
                libelle="train des 600 m"
              />
              <Chiffre
                valeur={
                  profil.distanceMoy != null
                    ? profil.distanceMoy.toLocaleString('fr-FR')
                    : '—'
                }
                unite="m"
                libelle="distance moyenne"
              />
            </div>
          )}

          <p className="flex justify-center mt-12 text-faint animate-fade-up" aria-hidden>
            <ChevronDown size={20} />
          </p>
        </div>
      </section>

      {/* ───────────────────────── Nos résultats ───────────────────────── */}
      <SectionImmersive
        titre="Nos résultats ici"
        soustitre={
          assez
            ? `Sur les ${notreBilan.jugees} courses que nous avons jugées ${aHippodrome(cible)}.`
            : `Nous n'avons encore jugé que ${notreBilan.jugees} course${notreBilan.jugees > 1 ? 's' : ''} sur cette piste.`
        }
        {...bandes[0]!}
        variante={0}
      >
        {assez ? (
          <>
            <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
              <Chiffre
                valeur={pourcent(notreBilan.tauxVictoire)}
                libelle="victoires du rang 1"
                note={
                  ic
                    ? `intervalle ${Math.round(ic.bas * 100)} – ${Math.round(ic.haut * 100)} %`
                    : undefined
                }
              />
              <Chiffre valeur={pourcent(notreBilan.tauxPlace)} libelle="dans les trois" />
              <Chiffre
                valeur={String(notreBilan.jugees)}
                libelle="courses jugées"
                note={`${notreBilan.reunions} réunion${notreBilan.reunions > 1 ? 's' : ''}`}
              />
            </div>

            {parType.length > 1 && (
              <div className="mt-12 max-w-2xl mx-auto space-y-2.5">
                <p className="label text-center mb-4">Par type de course</p>
                {parType.map((s) => (
                  <div key={s.label} className="flex items-center gap-3">
                    <span className="text-xs text-muted w-32 shrink-0 truncate">{s.label}</span>
                    <span className="h-2 flex-1 rounded-full bg-white/[0.08] overflow-hidden">
                      <span
                        className="block h-full rounded-full bg-accent/80"
                        style={{ width: `${Math.max(2, s.taux * 100 * 2)}%` }}
                      />
                    </span>
                    <span className="num text-xs w-20 text-right shrink-0">
                      {pourcent(s.taux)}
                      <span className="text-faint"> ({s.n})</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="max-w-md mx-auto text-center">
            <p className="num font-display font-bold text-[3rem] leading-none">
              {notreBilan.jugees}
            </p>
            <p className="text-sm text-muted mt-3 leading-relaxed">
              Il en faut au moins {SEUIL_PISTE} pour qu'un taux veuille dire quelque chose. En
              dessous, l'incertitude dépasse largement l'écart qu'on chercherait à mesurer — nous
              préférons ne rien afficher plutôt qu'un chiffre que la suite démentira.
            </p>
            <Link to="/resultats" className="btn-glass mt-6">
              Nos résultats, toutes pistes confondues
              <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        )}
      </SectionImmersive>

      {/* ───────────────────────── Profil de la piste ───────────────────────── */}
      {profil && chrono && (
        <SectionImmersive
          titre="Le profil de la piste"
          soustitre={`Mesuré sur ${profil.coursesChronometrees.toLocaleString('fr-FR')} courses chronométrées, de ${profil.depuis.slice(0, 4)} à ${profil.jusqua.slice(0, 4)}.`}
          {...bandes[1]!}
          variante={1}
        >
          <ReglerVitesse vitesse={profil.vitesseMoy!} reference={reference} />

          <div className="grid gap-3 sm:grid-cols-3 mt-12 max-w-3xl mx-auto">
            <div className="card-nest p-5 text-center">
              <Gauge size={18} className="mx-auto text-accent mb-3" aria-hidden />
              <p className="num text-xl font-semibold">
                {profil.vitesseMoy!.toFixed(2).replace('.', ',')} km/h
              </p>
              <p className="text-xs text-muted mt-2 leading-relaxed">
                {reference != null && profil.vitesseMoy! > reference
                  ? `${(profil.vitesseMoy! - reference).toFixed(1).replace('.', ',')} km/h au-dessus de la moyenne des pistes`
                  : reference != null
                    ? `${(reference - profil.vitesseMoy!).toFixed(1).replace('.', ',')} km/h en dessous de la moyenne des pistes`
                    : 'vitesse moyenne relevée'}
              </p>
            </div>

            <div className="card-nest p-5 text-center">
              <Timer size={18} className="mx-auto text-accent mb-3" aria-hidden />
              <p className="num text-xl font-semibold">
                {profil.train600 != null ? `${profil.train600.toFixed(2).replace('.', ',')} s` : '—'}
              </p>
              <p className="text-xs text-muted mt-2 leading-relaxed">
                sur les derniers 600 m. Plus ce temps est court, plus la piste se gagne en
                terminant vite.
              </p>
            </div>

            <div className="card-nest p-5 text-center">
              <Activity size={18} className="mx-auto text-accent mb-3" aria-hidden />
              <p className="num text-xl font-semibold">
                {profil.vitesseEcartType != null
                  ? `± ${profil.vitesseEcartType.toFixed(2).replace('.', ',')}`
                  : '—'}
              </p>
              <p className="text-xs text-muted mt-2 leading-relaxed">
                d'écart-type. Une piste régulière varie peu d'un jour à l'autre&nbsp;; au-delà de
                3, le terrain pèse lourd sur le chrono.
              </p>
            </div>
          </div>

          <p className="num text-xs text-faint text-center mt-8">
            Piste courue de {formatDistance(profil.distanceMin)} à{' '}
            {formatDistance(profil.distanceMax)}
          </p>
        </SectionImmersive>
      )}

      {/* ───────────────────────── Distances ───────────────────────── */}
      {distances.length > 1 && (
        <SectionImmersive
          titre="Les distances"
          soustitre="La vitesse moyenne relevée sur chaque tranche. Un sprint se court toujours plus vite qu'une course de tenue : ce qui compte est l'ampleur de l'écart d'une piste à l'autre."
          {...bandes[2]!}
          variante={2}
        >
          <div className="max-w-2xl mx-auto space-y-4">
            {distances.map((d) => {
              const largeur =
                d.vitesseMoy == null
                  ? 0
                  : Math.max(
                      4,
                      Math.min(
                        100,
                        ((d.vitesseMoy - ECHELLE.min) / (ECHELLE.max - ECHELLE.min)) * 100,
                      ),
                    )
              return (
                <div key={d.tranche}>
                  <div className="flex items-baseline justify-between gap-3 mb-2">
                    <span className="text-sm font-medium">{trancheComplete(d.tranche)}</span>
                    <span className="num text-sm">
                      {d.vitesseMoy != null
                        ? `${d.vitesseMoy.toFixed(1).replace('.', ',')} km/h`
                        : '—'}
                      <span className="text-faint text-xs"> · {d.courses} courses</span>
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-white/[0.08] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent/75 transition-[width] duration-700"
                      style={{ width: `${largeur}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </SectionImmersive>
      )}

      {/* ───────────────────────── Ce qu'on y court ───────────────────────── */}
      {parDistance.length > 0 && notreBilan.jugees > 0 && (
        <SectionImmersive
          titre="Ce que nous y avons pronostiqué"
          soustitre="La répartition de nos courses jugées sur cette piste, par tranche de distance."
          {...bandes[3]!}
          variante={0}
        >
          <div className="flex flex-wrap justify-center gap-3 max-w-2xl mx-auto">
            {parDistance.map((s) => (
              <div key={s.label} className="card-nest px-5 py-4 text-center min-w-[9rem]">
                <p className="num text-2xl font-semibold">{s.n}</p>
                <p className="text-xs text-muted mt-1.5">{s.label}</p>
                {s.n >= 10 && (
                  <p className="num text-[0.6875rem] text-accent mt-1">
                    {pourcent(s.taux)} de victoires
                  </p>
                )}
              </div>
            ))}
          </div>
        </SectionImmersive>
      )}

      {/* ───────────────────────── Réunions ───────────────────────── */}
      {reunions.length > 0 && (
        <SectionImmersive
          titre="Les dernières réunions"
          soustitre={`Ce que nous avons pronostiqué ${aHippodrome(cible)}, dans notre fenêtre de consultation.`}
          {...bandes[4]!}
          variante={1}
        >
          <div className="grid gap-3 lg:grid-cols-2 max-w-4xl mx-auto">
            {reunions.map((r) => (
              <CarteReunion key={r.cle} reunion={r} montrerDate />
            ))}
          </div>
        </SectionImmersive>
      )}

      {/* ───────────────────────── Ce que nous n'avons pas ───────────────────────── */}
      <section className="mt-16">
        <div className="card-nest p-5 max-w-2xl mx-auto flex gap-3.5">
          <Info size={18} className="text-info shrink-0 mt-0.5" aria-hidden />
          <div className="text-xs text-muted leading-relaxed space-y-2">
            <p>
              <span className="text-ink font-medium">Ni tracé, ni terrain.</span> Nous ne publions
              ni la corde, ni la longueur de la ligne droite, ni le dénivelé, ni l'état du terrain
              le jour de la course. Ces données ne sont pas dans nos sources — nous préférons le
              dire plutôt que de les approximer.
            </p>
            <p>
              Le profil ci-dessus est un relevé de chronos, agrégé sur plusieurs saisons. Il décrit
              ce que la piste produit en moyenne, pas ce qu'elle sera cet après-midi.
            </p>
          </div>
        </div>

        {profil && (
          <p className="num text-xs text-faint text-center mt-5">
            Relevés du {dateCourte(profil.depuis)} {profil.depuis.slice(0, 4)} au{' '}
            {dateCourte(profil.jusqua)} {profil.jusqua.slice(0, 4)}
          </p>
        )}
      </section>
    </div>
  )
}
