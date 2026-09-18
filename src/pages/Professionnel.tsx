import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft, UserX } from 'lucide-react'
import type { Course, Partant, ProfilPro, RangPro, RolePro } from '@/types'
import { useDonnees } from '@/data/DonneesContext'
import { useAcces } from '@/auth/AccesContext'
import { CartePass } from '@/components/acces/Verrou'
import { PASS_MOINS_CHER } from '@/config/formules'
import { chargerProfilPro } from '@/services/professionnels'
import { MOIS_LONG, dateCourte, hippodrome as formatHippodrome, pourcent, rang as formatRang } from '@/lib/format'
import { discipline, euros, metres, nomPropre, placeLisible, tonPlace, type TonPlace } from '@/lib/fiche'
import {
  LIBELLES_ROLE,
  grade,
  indicateurs,
  initialesPro,
  lienPro,
  parDiscipline,
  parHippodrome,
  specialitePrincipale,
  victoiresParMois,
} from '@/lib/professionnels'
import { DEPUIS_LA_COURSE, lienPartant } from '@/lib/programme'
import { MOIS_COURT } from '@/lib/resultats'
import { useHeureParis } from '@/lib/useHeureParis'
import { Erreur, EtatVide } from '@/components/ui/EtatVide'
import { LignesBarres, Panneau } from '@/components/resultats/Panneaux'

const TON: Record<TonPlace, string> = {
  place: 'bg-accent text-accent-ink',
  neutre: 'bg-raised-2 text-soft border border-line-strong',
  loin: 'bg-raised-2 text-soft border border-line-strong',
}

/** « 2,6 M€ », « 412 k€ », « 950 € » : les allocations d'une saison, en tuile. */
function allocationsCourtes(v: number): string {
  if (v >= 1_000_000) return euros(v)
  if (v >= 10_000) return `${Math.round(v / 1000).toLocaleString('fr-FR')} k€`
  return euros(v)
}

function Squelette() {
  return (
    <div className="flex flex-col gap-5" aria-busy="true" aria-label="Chargement de la fiche">
      <div className="flex items-center gap-5">
        <div className="skeleton w-[5.5rem] h-[5.5rem] !rounded-full" />
        <div className="flex flex-col gap-2">
          <div className="skeleton h-5 w-40" />
          <div className="skeleton h-10 w-64" />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="skeleton h-24" />
        ))}
      </div>
      <div className="skeleton h-72" />
    </div>
  )
}

function VictoiresParMois({ profil, jour }: { profil: ProfilPro; jour: string }) {
  const [actif, setActif] = useState<number | null>(null)
  const mois = victoiresParMois(profil.stats, profil.annee, jour)
  const max = Math.max(1, ...mois.map((m) => m.victoires))
  const detail = actif != null ? mois[actif] : null
  const u = LIBELLES_ROLE[profil.role]
  return (
    <Panneau
      titre={`Victoires par mois · ${profil.annee}`}
      sousTitre={
        <span role="status" className="text-[0.8125rem] font-semibold text-muted">
          {detail
            ? `${MOIS_LONG[detail.mois - 1].replace(/^./, (x) => x.toUpperCase())} ${profil.annee} · ${detail.victoires} victoire${detail.victoires > 1 ? 's' : ''} sur ${detail.montes} ${detail.montes > 1 ? u.unite : u.uniteSingulier}`
            : 'Survolez ou touchez une barre pour le détail'}
        </span>
      }
    >
      <div className="flex flex-col" onMouseLeave={() => setActif(null)}>
        <div className="h-[9.5rem] lg:h-[12.5rem] flex items-end gap-1.5 lg:gap-2.5 border-b border-line-strong">
          {mois.map((m, i) => (
            <button
              key={m.mois}
              type="button"
              aria-label={`${MOIS_LONG[m.mois - 1]} : ${m.victoires} victoire${m.victoires > 1 ? 's' : ''}`}
              onMouseEnter={() => setActif(i)}
              onFocus={() => setActif(i)}
              onClick={() => setActif(i)}
              className="flex-1 basis-0 min-w-0 h-full flex items-end justify-center"
            >
              <span
                className={`block w-full max-w-[1.375rem] lg:max-w-10 rounded-t transition-colors ${
                  actif == null || actif === i ? 'bg-accent' : 'bg-accent-dim'
                }`}
                style={{ height: `${Math.max(2, (m.victoires / max) * 100)}%` }}
              />
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 lg:gap-2.5 pt-2" aria-hidden>
          {mois.map((m) => (
            <span key={m.mois} className="flex-1 basis-0 min-w-0 text-center text-[0.625rem] lg:text-[0.6875rem] font-semibold text-faint">
              <span className="lg:hidden">{MOIS_COURT[m.mois - 1].charAt(0).toUpperCase()}</span>
              <span className="hidden lg:inline">{MOIS_COURT[m.mois - 1]}</span>
            </span>
          ))}
        </div>
      </div>
    </Panneau>
  )
}

function Classement({ profil }: { profil: ProfilPro }) {
  const [critere, setCritere] = useState<'victoires' | 'allocations'>('victoires')
  const cle = critere === 'victoires' ? 'rangVictoires' : 'rangAllocations'
  const tete = [...profil.classement].filter((r) => r[cle] <= 8).sort((a, b) => a[cle] - b[cle] || b.montes - a.montes).slice(0, 8)
  const moi = profil.moi
  const dehors = moi && !tete.some((r) => r.nom === moi.nom)
  const u = LIBELLES_ROLE[profil.role]
  const ligne = (r: RangPro) => {
    const courant = r.nom === profil.nom
    return (
      <li key={r.nom}>
        <Link
          to={lienPro(profil.role, r.nom)}
          aria-current={courant ? 'page' : undefined}
          className={`grid grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-2.5 min-h-11 px-2.5 rounded-[10px] transition-colors ${
            courant ? 'bg-accent/[0.12] text-accent' : 'hover:bg-sunken'
          }`}
        >
          <span className="num text-[0.8125rem] font-extrabold text-faint">{r[cle]}</span>
          <span className={`text-sm truncate ${courant ? 'font-extrabold' : 'font-semibold'}`}>{nomPropre(r.nom)}</span>
          <span className="num text-[0.8125rem] font-bold">
            {critere === 'victoires' ? `${r.victoires} vict.` : allocationsCourtes(r.allocations)}
          </span>
        </Link>
      </li>
    )
  }
  return (
    <Panneau titre={`Classement ${profil.annee}`}>
      {moi ? (
        <div className="flex items-baseline gap-2.5">
          <span className="num text-[2.125rem] font-extrabold tracking-[-0.03em] text-accent leading-none">{formatRang(moi[cle])}</span>
          <span className="num text-[0.8125rem] font-medium text-muted">
            sur {moi.effectif.toLocaleString('fr-FR')} {u.pluriel} · {critere === 'victoires' ? 'aux victoires' : 'aux allocations'}
          </span>
        </div>
      ) : (
        <p className="text-sm text-muted">Pas encore classé cette saison.</p>
      )}
      <div role="group" aria-label="Critère du classement" className="grid grid-cols-2 gap-1 p-1 rounded-full bg-canvas border border-line">
        {(['victoires', 'allocations'] as const).map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={critere === c}
            onClick={() => setCritere(c)}
            className={`h-9 rounded-full text-[0.8125rem] font-bold transition-colors ${critere === c ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink'}`}
          >
            {c === 'victoires' ? 'Victoires' : 'Allocations'}
          </button>
        ))}
      </div>
      <ol className="flex flex-col gap-0.5" aria-label={critere === 'victoires' ? 'Au nombre de victoires' : 'Aux allocations'}>
        {tete.map(ligne)}
        {dehors && moi && (
          <>
            <li aria-hidden className="text-center text-faint leading-none py-1">…</li>
            {ligne(moi)}
          </>
        )}
      </ol>
      <p className="text-[0.6875rem] font-medium text-faint">
        Tous les {u.pluriel} de galop en France, saison {profil.annee}, d’après les performances France Galop.
      </p>
    </Panneau>
  )
}

/** Au-delà, une ligne de compte plutôt qu'une liste qui écrase la colonne. */
const PROGRAMME_VISIBLE = 6

/** Entraîneur : ses chevaux au programme, avec notre pronostic. */
function Programme({ profil, courses, jour }: { profil: ProfilPro; courses: Course[]; jour: string }) {
  const ids = new Set(profil.programme)
  const lignes = courses
    .filter((c) => c.date >= jour)
    .flatMap((c) => c.liste.filter((p) => p.idFg && ids.has(p.idFg) && !p.nonPartant).map((p) => ({ c, p })))
    .sort((a, b) => a.c.date.localeCompare(b.c.date) || (a.c.heureDepart ?? '').localeCompare(b.c.heureDepart ?? ''))
  const quand = (c: Course) => `${c.date === jour ? 'Aujourd’hui' : dateCourte(c.date)}${c.heureDepart ? ` · ${c.heureDepart}` : ''}`
  return (
    <Panneau titre="Ses chevaux au programme" sousTitre="D’après l’entraîneur de leur dernière course">
      {lignes.length === 0 ? (
        <p className="text-sm font-medium leading-relaxed text-faint">Aucun de ses chevaux au programme d’aujourd’hui ni de demain.</p>
      ) : (
        <div className="flex flex-col">
          {lignes.slice(0, PROGRAMME_VISIBLE).map(({ c, p }: { c: Course; p: Partant }) => (
            <Link
              key={`${c.cle}|${p.numero}`}
              to={lienPartant(c, p)}
              state={DEPUIS_LA_COURSE}
              className="flex flex-col gap-1.5 py-3.5 border-t border-track first:border-t-0"
            >
              <span className="num text-xs font-bold text-accent">{quand(c)}</span>
              <span className="text-[0.8125rem] font-medium text-muted truncate">
                C{c.numero} · {formatHippodrome(c.hippodrome)} · {c.nom ?? `Course ${c.numero}`}
              </span>
              <span className="flex items-center justify-between gap-2.5">
                <span className="flex items-center gap-2.5 min-w-0">
                  <span className="num shrink-0 w-[1.875rem] h-[1.875rem] rounded-[8px] bg-raised border border-line-strong grid place-items-center text-[0.8125rem] font-bold">
                    {p.numero}
                  </span>
                  <span className="text-[0.9375rem] font-bold truncate">{p.nom}</span>
                </span>
                <span className={`num shrink-0 text-[0.8125rem] font-bold ${p.rang != null && p.rang <= 3 ? 'text-accent' : 'text-muted'}`}>
                  {p.rang != null ? `${formatRang(p.rang)} prédit · ${pourcent(p.pWin)}` : pourcent(p.pWin)}
                </span>
              </span>
            </Link>
          ))}
          {lignes.length > PROGRAMME_VISIBLE && (
            <p className="pt-3.5 border-t border-track text-[0.8125rem] font-medium text-faint">
              Et {lignes.length - PROGRAMME_VISIBLE} autre{lignes.length - PROGRAMME_VISIBLE > 1 ? 's' : ''} au programme, dans le détail des courses.
            </p>
          )}
        </div>
      )}
    </Panneau>
  )
}

/**
 * FICHE JOCKEY / ENTRAÎNEUR — `design/screens/Jockey.dc.html` et `Trainer.dc.html`,
 * une seule page pour les deux rôles (la maquette aussi n'en a qu'une).
 *
 * Données France Galop agrégées par la base (`db/005_fiches_professionnels.sql`).
 * Écarts à la maquette (design/INTEGRATION.md) : pas de bouton Suivre (A7), pas
 * de « licence depuis » ni de base d'écurie (non relevés), pas de « prochaines
 * montes » pour un jockey (la monte du jour n'est pas relevée) ; « Gains »
 * devient « Allocations », et le palmarès cite la catégorie et la distance
 * faute du nom de la course.
 */
export default function Professionnel({ role }: { role: RolePro }) {
  const { nom: brut = '' } = useParams()
  const nom = decodeURIComponent(brut)
  const naviguer = useNavigate()
  const { key } = useLocation()
  const { courses } = useDonnees()
  const { jour } = useHeureParis()
  const [profil, setProfil] = useState<ProfilPro | null>(null)
  const [etat, setEtat] = useState<'chargement' | 'ok' | 'erreur'>('chargement')
  const [essai, setEssai] = useState(0)
  const u = LIBELLES_ROLE[role]
  const { complet } = useAcces()

  useEffect(() => {
    let vivant = true
    setEtat('chargement')
    chargerProfilPro(role, nom)
      .then((p) => {
        if (!vivant) return
        setProfil(p)
        setEtat('ok')
      })
      .catch(() => vivant && setEtat('erreur'))
    return () => {
      vivant = false
    }
  }, [role, nom, essai])

  const i = useMemo(() => (profil ? indicateurs(profil.stats) : null), [profil])
  const retour = () => (key !== 'default' ? naviguer(-1) : naviguer('/courses'))

  const enTeteRetour = (
    <button type="button" onClick={retour} className="self-start min-h-8 inline-flex items-center gap-2 text-[0.8125rem] font-bold text-muted hover:text-ink">
      <ChevronLeft size={16} aria-hidden />
      Retour
    </button>
  )

  // Réservées aux Pass : la base ne les donne qu'avec l'accès complet (`db/007`).
  if (!complet)
    return (
      <div className="flex flex-col gap-6">
        {enTeteRetour}
        <CartePass
          titre={`La fiche ${role === 'jockey' ? 'jockey' : 'entraîneur'} est réservée aux Pass`}
          texte={`Victoires, réussite par discipline et par hippodrome, palmarès, classement de la saison : les fiches des jockeys et des entraîneurs sont ouvertes avec chaque Pass, dès ${PASS_MOINS_CHER.prix}.`}
        />
      </div>
    )
  if (etat === 'chargement') return <div className="flex flex-col gap-6">{enTeteRetour}<Squelette /></div>
  if (etat === 'erreur' || !profil || !i)
    return (
      <div className="flex flex-col gap-6">
        {enTeteRetour}
        <Erreur message="Cette fiche est indisponible pour le moment." onReessayer={() => setEssai((n) => n + 1)} />
      </div>
    )
  if (i.montes === 0 && profil.montes.length === 0)
    return (
      <div className="flex flex-col gap-6">
        {enTeteRetour}
        <div className="card">
          <EtatVide
            icone={<UserX size={20} />}
            titre={`Aucune course relevée pour ${nomPropre(nom)}`}
            texte={`Nous n’avons pas de course de ce ${u.titre.toLowerCase()} sur les deux dernières saisons.`}
          />
        </div>
      </div>
    )

  const disciplines = parDiscipline(profil.stats)
  const pistes = parHippodrome(profil.stats)
  const barres = (l: typeof disciplines) => {
    const max = Math.max(0.05, ...l.map((t) => t.reussite)) * 1.1
    return l.map((t) => ({ libelle: discipline(t.libelle) ?? formatHippodrome(t.libelle), valeur: pourcent(t.reussite), complement: `${t.montes} ${u.unite}`, part: t.reussite / max }))
  }
  const specialite = specialitePrincipale(profil.stats)
  const principal = pistes[0] ? formatHippodrome(pistes[0].libelle) : null
  const autre: RolePro = role === 'jockey' ? 'entraineur' : 'jockey'
  const associations = profil.associations
    .filter((a) => a.montes >= 5)
    .sort((a, b) => (role === 'jockey' ? b.victoires / b.montes - a.victoires / a.montes : b.montes - a.montes))
    .slice(0, 4)

  const tuiles = [
    { libelle: u.titre === 'Jockey' ? 'Montes' : 'Partants', valeur: i.montes.toLocaleString('fr-FR'), sous: `saison ${profil.annee}` },
    { libelle: 'Victoires', valeur: String(i.victoires), sous: '' },
    { libelle: 'Réussite', valeur: pourcent(i.reussite), sous: 'de victoires' },
    { libelle: 'Placé', valeur: pourcent(i.place), sous: 'dans les 3 premiers' },
    { libelle: 'Allocations', valeur: allocationsCourtes(i.allocations), sous: `saison ${profil.annee}` },
  ]

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      {enTeteRetour}

      <header className="flex items-center gap-4 lg:gap-[1.375rem]">
        <span
          className="shrink-0 w-16 h-16 lg:w-[5.5rem] lg:h-[5.5rem] rounded-full bg-raised border-2 border-accent grid place-items-center text-[1.1875rem] lg:text-[1.625rem] font-extrabold"
          aria-hidden
        >
          {initialesPro(nom)}
        </span>
        <div className="flex flex-col gap-1.5 lg:gap-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[0.6875rem] font-extrabold uppercase tracking-[0.1em] text-accent-ink bg-accent rounded-full px-[9px] py-[3px]">
              {u.titre}
            </span>
            {specialite && (
              <span className="text-xs font-bold text-soft border border-line-strong rounded-full px-[9px] py-0.5">{specialite}</span>
            )}
          </div>
          <h1 className="text-[1.5625rem] lg:text-[2.3125rem] font-extrabold tracking-[-0.03em] leading-[1.05] break-words">{nomPropre(nom)}</h1>
          {principal && (
            <p className="text-[0.8125rem] font-medium text-faint">
              {role === 'jockey' ? 'Monte' : 'Ses chevaux courent'} surtout à {principal} · saison {profil.annee}
            </p>
          )}
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_25rem] items-start">
        <div className="flex flex-col gap-5 min-w-0">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 lg:gap-3">
            {tuiles.map((t, n) => (
              <div
                key={t.libelle}
                className={`flex flex-col gap-1 p-3.5 lg:p-[1.125rem] rounded-2xl bg-surface border border-line min-w-0 ${n === 0 ? 'col-span-2 lg:col-span-1' : ''}`}
              >
                <span className="text-xs font-semibold text-muted">{t.libelle}</span>
                <span className="num text-[1.3125rem] lg:text-[1.5625rem] font-extrabold tracking-[-0.02em] whitespace-nowrap">{t.valeur}</span>
                {t.sous && <span className="text-[0.6875rem] font-medium text-faint">{t.sous}</span>}
              </div>
            ))}
          </div>

          <VictoiresParMois profil={profil} jour={jour} />

          <div className="grid gap-5 lg:grid-cols-2">
            <Panneau titre="Réussite par discipline">
              <LignesBarres lignes={barres(disciplines)} />
            </Panneau>
            <Panneau titre="Réussite par hippodrome">
              <LignesBarres lignes={barres(pistes)} />
            </Panneau>
          </div>

          <Panneau titre="Palmarès" sousTitre="Victoires dans les courses de Groupe et Listed">
            {profil.palmares.length === 0 ? (
              <p className="text-sm font-medium text-faint">Aucune victoire de Groupe ou Listed relevée.</p>
            ) : (
              <div className="flex flex-col">
                {profil.palmares.map((p, n) => {
                  const m = metres(p.distance)
                  return (
                    <div
                      key={`${p.date}-${n}`}
                      className="num grid grid-cols-[3rem_minmax(0,1fr)_auto] lg:grid-cols-[3.5rem_minmax(0,1fr)_9.375rem_10.625rem_4.375rem] items-center gap-3 min-h-[3.25rem] py-2 border-t border-track"
                    >
                      <span className="text-sm font-extrabold">{p.date.slice(0, 4)}</span>
                      <span className="min-w-0 flex flex-col gap-0.5">
                        <span className="text-sm font-bold truncate">
                          {[discipline(p.specialite), m != null ? `${m.toLocaleString('fr-FR')} m` : null].filter(Boolean).join(' · ') || 'Course de Groupe'}
                        </span>
                        <span className="lg:hidden text-xs font-medium text-faint truncate">
                          {formatHippodrome(p.hippodrome)} · {nomPropre(p.cheval) ?? '—'}
                        </span>
                      </span>
                      <span className="hidden lg:block text-[0.8125rem] font-medium text-muted truncate">{formatHippodrome(p.hippodrome)}</span>
                      <span className="hidden lg:block text-[0.8125rem] font-semibold truncate">{nomPropre(p.cheval) ?? '—'}</span>
                      <span
                        className={`justify-self-end text-[0.6875rem] font-extrabold rounded-full px-2 py-[3px] whitespace-nowrap ${
                          grade(p.categorie).startsWith('Gr. 1') ? 'bg-accent text-accent-ink' : 'bg-raised-2 text-soft border border-line-strong'
                        }`}
                      >
                        {grade(p.categorie)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </Panneau>

          <Panneau titre="Derniers résultats">
            <div className="flex flex-col">
              {profil.montes.map((m, n) => (
                <div key={`${m.date}-${n}`} className="num grid grid-cols-[4.375rem_minmax(0,1fr)_auto] items-center gap-3 min-h-12 py-1.5 border-t border-track">
                  <span className="text-[0.8125rem] font-semibold">{dateCourte(m.date)}</span>
                  <span className="min-w-0 flex flex-col">
                    <span className="text-sm font-bold truncate">{nomPropre(m.cheval) ?? '—'}</span>
                    <span className="text-xs font-medium text-faint truncate">
                      {formatHippodrome(m.hippodrome)}
                      {role === 'entraineur' && m.jockey && ` · ${nomPropre(m.jockey)}`}
                    </span>
                  </span>
                  <span className={`min-w-10 h-7 px-2 rounded-[8px] grid place-items-center text-xs font-extrabold ${TON[tonPlace(m.place)]}`}>
                    {placeLisible(m.place)}
                  </span>
                </div>
              ))}
            </div>
          </Panneau>
        </div>

        <div className="flex flex-col gap-5">
          <Classement profil={profil} />
          {role === 'entraineur' && <Programme profil={profil} courses={courses} jour={jour} />}
          {associations.length > 0 && (
            <Panneau
              titre={role === 'jockey' ? 'Meilleures associations avec les entraîneurs' : 'Jockeys les plus utilisés'}
              sousTitre={`Saison ${profil.annee}, cinq ${u.unite} au moins`}
            >
              <div className="flex flex-col">
                {associations.map((a) => (
                  <Link
                    key={a.partenaire}
                    to={lienPro(autre, a.partenaire)}
                    className="num grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 min-h-[3.25rem] py-1.5 border-t border-track first:border-t-0 hover:text-accent"
                  >
                    <span className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-bold truncate">{nomPropre(a.partenaire)}</span>
                      <span className="text-xs font-medium text-faint">
                        {a.montes} {u.unite} · {a.victoires} vict.
                      </span>
                    </span>
                    <span className="text-[0.9375rem] font-extrabold text-accent">{pourcent(a.victoires / a.montes)}</span>
                  </Link>
                ))}
              </div>
            </Panneau>
          )}
        </div>
      </div>

      <p className="text-xs text-faint leading-relaxed">
        Source : performances France Galop, saison {profil.annee}. Les statistiques couvrent toutes les courses de
        galop relevées, pas seulement celles que nous pronostiquons.
      </p>
    </div>
  )
}
