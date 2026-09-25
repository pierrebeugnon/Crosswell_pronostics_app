import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, LogOut } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { CONTACT, DEMO } from '@/config/app'
import { MOIS_LONG, dateLongue, jourParis } from '@/lib/format'
import { useAcces } from '@/auth/AccesContext'
import { ACCES_SANS_FILTRE, libelleStatut, type Acces } from '@/lib/acces'
import { formule } from '@/config/formules'
import { LIEN_PASS } from '@/components/acces/Verrou'
import { ouvrirPortail } from '@/services/paiement'
import { PRENOM_MAX, initiales, nettoyerPrenom } from '@/lib/prenom'
import { Champ } from '@/components/ui/Champ'

/**
 * MON COMPTE — `design/screens/Account.dc.html`.
 *
 * La mise en page de la maquette (colonne d'identité et de sections à gauche,
 * cartes à droite). L'abonnement est lu dans la base (`db/007`) : un client
 * Stripe gère carte, factures, formule et résiliation dans le PORTAIL Stripe
 * (aucune donnée de carte dans l'app) ; un accès offert se gère par e-mail ; la
 * formule Gratuit mène au choix d'un Pass. Sans envoi d'alertes (A7), pas de
 * réglages de notifications. Nom, téléphone et pays ne sont pas collectés.
 */

const SECTIONS = [
  { id: 'abonnement', titre: 'Abonnement' },
  { id: 'informations', titre: 'Informations personnelles' },
  { id: 'assistance', titre: 'Assistance' },
  { id: 'resiliation', titre: 'Résiliation et données' },
] as const

const COMPRIS = [
  'Pronostics de toutes les courses du jour et du lendemain',
  'Arrivée prédite et pourcentages de chances',
  'Nos résultats, publiés sans filtre',
]

const mailto = (sujet: string) => `mailto:${CONTACT}?subject=${encodeURIComponent(sujet)}`

/** '2026-03-14T…' → 'mars 2026' */
function moisAnnee(iso: string | undefined): string | null {
  if (!iso) return null
  return `${MOIS_LONG[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`
}

function Carte({ id, titre, children, danger = false }: { id: string; titre?: ReactNode; children: ReactNode; danger?: boolean }) {
  return (
    <section
      id={id}
      className={`scroll-mt-28 flex flex-col gap-4 lg:gap-6 p-5 lg:p-7 rounded-[1.25rem] bg-surface border ${
        danger ? 'border-loss/25' : 'border-line'
      }`}
    >
      {titre && <h2 className="text-[1rem] lg:text-[1.1875rem] font-bold">{titre}</h2>}
      {children}
    </section>
  )
}

const BOUTON_DANGER =
  'inline-flex items-center justify-center h-[2.875rem] px-[1.375rem] rounded-full border border-loss/50 ' +
  'text-loss text-sm font-bold transition-colors hover:bg-loss/10'

/** Le changement de mot de passe, déplié par « Modifier ». Il passe par Supabase Auth. */
function MotDePasse() {
  const { changerMotDePasse } = useAuth()
  const [ouvert, setOuvert] = useState(false)
  const [motDePasse, setMotDePasse] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [fait, setFait] = useState(false)

  async function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault()
    setErreur(null)
    setFait(false)
    if (motDePasse.length < 8) return setErreur('Huit caractères au minimum — un mot de passe court se devine.')
    if (motDePasse !== confirmation) return setErreur('Les deux saisies ne correspondent pas.')
    setEnCours(true)
    try {
      await changerMotDePasse(motDePasse)
      setFait(true)
      setOuvert(false)
      setMotDePasse('')
      setConfirmation('')
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Le changement a échoué.')
    } finally {
      setEnCours(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 px-[1.125rem] py-4 rounded-xl bg-canvas border border-track">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-[3px]">
          <span className="text-sm font-bold">Mot de passe</span>
          <span className="text-[0.8125rem] font-medium text-faint">
            {fait ? 'Changé : il vaut dès maintenant, sur tous vos appareils.' : 'Huit caractères au minimum.'}
          </span>
        </div>
        <button
          type="button"
          className="btn-glass !h-10 !px-4 !text-[0.8125rem] shrink-0"
          aria-expanded={ouvert}
          onClick={() => {
            setOuvert((o) => !o)
            setErreur(null)
          }}
        >
          {ouvert ? 'Annuler' : 'Modifier'}
        </button>
      </div>
      {ouvert && (
        <form onSubmit={soumettre} className="flex flex-col gap-4 pt-4 border-t border-track" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Champ
              id="nouveau-mdp"
              libelle="Nouveau mot de passe"
              type="password"
              autoComplete="new-password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
            />
            <Champ
              id="confirmation-mdp"
              libelle="Confirmer"
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </div>
          {erreur && (
            <p role="alert" className="text-xs font-semibold text-loss">
              {erreur}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className="btn-accent" disabled={enCours || DEMO}>
              {enCours ? 'Changement…' : 'Changer le mot de passe'}
            </button>
            {DEMO && <span className="text-xs text-faint">Indisponible en mode démonstration.</span>}
          </div>
        </form>
      )}
    </div>
  )
}

/** Le prénom (pour « Bonjour Camille ») et l'adresse de connexion, non modifiable ici. */
function Informations() {
  const { prenom, email, changerPrenom } = useAuth()
  const [saisie, setSaisie] = useState(prenom ?? '')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [fait, setFait] = useState<string | null>(null)

  async function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault()
    setErreur(null)
    setFait(null)
    const r = nettoyerPrenom(saisie)
    if (!r.ok) return setErreur(r.erreur)
    setEnCours(true)
    try {
      await changerPrenom(r.valeur)
      setSaisie(r.valeur)
      setFait(DEMO ? 'Enregistré pour cet onglet (mode démonstration).' : 'Modifications enregistrées')
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'L’enregistrement a échoué.')
    } finally {
      setEnCours(false)
    }
  }

  return (
    <Carte id="informations" titre="Informations personnelles">
      <form onSubmit={soumettre} className="flex flex-col gap-4 lg:gap-6" noValidate>
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-[1.125rem]">
          <Champ
            id="prenom"
            libelle="Prénom"
            type="text"
            autoComplete="given-name"
            autoCapitalize="words"
            spellCheck={false}
            maxLength={PRENOM_MAX * 2}
            value={saisie}
            onChange={(e) => {
              setSaisie(e.target.value)
              setFait(null)
            }}
            erreur={erreur}
            aide="Facultatif : l’accueil vous salue par votre prénom. Laissez vide pour l’effacer."
          />
          <Champ
            id="email-compte"
            libelle="Adresse e-mail"
            type="email"
            value={email ?? ''}
            disabled
            readOnly
            aide={
              <>
                Pour la changer,{' '}
                <a href={mailto('Changer mon adresse de connexion')} className="link">
                  écrivez-nous
                </a>{' '}
                : l’accès est nominatif, nous vérifions la demande.
              </>
            }
          />
        </div>

        <MotDePasse />

        <div className="flex flex-wrap items-center justify-end gap-4">
          {/* Région vivante TOUJOURS présente : un role=status qui naît avec son
              texte n'est pas annoncé par tous les lecteurs d'écran. */}
          <span role="status" className="text-[0.8125rem] font-semibold text-accent">
            {fait && (
              <span className="inline-flex items-center gap-1.5">
                <Check size={14} aria-hidden />
                {fait}
              </span>
            )}
          </span>
          <button type="submit" className="btn-accent !h-[2.875rem] w-full sm:w-auto" disabled={enCours}>
            {enCours ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </button>
        </div>
      </form>
    </Carte>
  )
}

/**
 * La section en cours de lecture, pour allumer son entrée dans la colonne de
 * gauche : la dernière dont le haut a passé le tiers de l'écran ; tout en bas
 * de page, la dernière section, même courte.
 */
function useSectionVisible(): string {
  const [actif, setActif] = useState<string>(SECTIONS[0].id)
  useEffect(() => {
    // Le navigateur ne déclenche qu'un événement de défilement par image : le
    // calcul (quatre mesures) peut s'y faire directement.
    const calculer = () => {
      const bas = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4
      if (bas) return setActif(SECTIONS[SECTIONS.length - 1].id)
      const seuil = window.innerHeight / 3
      let courant: string = SECTIONS[0].id
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id)
        if (el && el.getBoundingClientRect().top <= seuil) courant = s.id
      }
      setActif(courant)
    }
    calculer()
    window.addEventListener('scroll', calculer, { passive: true })
    window.addEventListener('resize', calculer)
    return () => {
      window.removeEventListener('scroll', calculer)
      window.removeEventListener('resize', calculer)
    }
  }, [])
  return actif
}

/** 'AAAA-MM-JJTHH:MM…' → « samedi 18 octobre 2026 » (jour de Paris). */
const dateEcheance = (iso: string) => dateLongue(jourParis(new Date(iso)))

/** Le libellé de l'échéance, selon l'état de l'abonnement. */
function echeance(a: Acces): string {
  const fin = a.accesJusqua
  // `inconnu` : la lecture a échoué. On garde l'accès ouvert, mais on ne
  // raconte rien sur l'abonnement — c'est ce mensonge-là qu'on vient d'enlever.
  if (a.statut === 'inconnu') {
    return 'Nous n’avons pas pu lire votre abonnement. Votre accès reste ouvert ; rechargez la page dans un instant.'
  }
  if (a.statut === 'offert') return 'Accès ouvert par notre équipe.'
  // PAS DE PÉRIODE DE GRÂCE : décision du fondateur du 20/09/2026, « si retard
  // de paiement, on coupe ». `db/007` ne rouvre pas l'accès sur `impaye`, et ce
  // texte doit le dire — il promettait auparavant de « garder l'accès » alors
  // qu'il était déjà fermé.
  if (a.statut === 'impaye') return 'Le dernier paiement a échoué : l’accès est suspendu. Mettez votre carte à jour pour le rouvrir.'
  if (!a.complet) return a.statut === 'expire' ? 'Votre Pass est terminé : 1 pronostic offert par jour, en attendant le suivant.' : '1 pronostic offert par jour.'
  if (!fin) return 'Accès complet.'
  if (a.formule === 'jour') {
    const heure = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' }).format(new Date(fin))
    return `Actif jusqu’au ${dateEcheance(fin)}, ${heure.replace(':', ' h ')}.`
  }
  if (a.statut === 'resiliation_programmee') return `Résiliation programmée : accès jusqu’au ${dateEcheance(fin)}, puis plus aucun prélèvement.`
  return `Prochain renouvellement le ${dateEcheance(fin)}.`
}

const COMPRIS_GRATUIT = ['1 course offerte chaque jour, pronostic complet', 'Programme du jour et du lendemain', 'Nos résultats, en toute transparence']

/**
 * L'ABONNEMENT — lu dans la base (`db/007`, `crosswell_mon_acces()`). Un
 * client Stripe gère carte, factures et résiliation dans le portail Stripe ;
 * un accès offert se gère par e-mail, comme avant ; la formule Gratuit mène au
 * choix d'un Pass.
 */
function Abonnement() {
  const { acces } = useAcces()
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  const a = acces ?? ACCES_SANS_FILTRE
  const f = a.formule !== 'gratuit' ? formule(a.formule) : null
  const titre =
    a.statut === 'inconnu'
      ? 'Votre abonnement'
      : a.statut === 'offert'
        ? 'Accès complet'
        : a.complet && f
          ? f.nom
          : 'Formule gratuite'
  const tonChip =
    a.statut === 'impaye'
      ? 'chip-loss'
      : a.statut === 'inconnu'
        ? 'chip-neutral'
        : a.complet && a.statut !== 'resiliation_programmee'
          ? 'chip-accent'
          : 'chip-neutral'

  async function portail() {
    setErreur(null)
    setEnCours(true)
    try {
      window.location.assign((await ouvrirPortail()).redirection)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Le portail n’a pas pu s’ouvrir.')
      setEnCours(false)
    }
  }

  return (
    <Carte id="abonnement">
      <div className="flex flex-col gap-2.5">
        <span className="label">Abonnement</span>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-[1.4375rem] lg:text-[1.625rem] font-extrabold tracking-[-0.02em]">{titre}</h2>
          <span className={tonChip}>{libelleStatut(a)}</span>
        </div>
        <p className="text-sm font-medium text-muted">{echeance(a)}</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-3">
        {(a.complet ? COMPRIS : COMPRIS_GRATUIT).map((c) => (
          <li key={c} className="flex items-start gap-2.5 p-4 rounded-xl bg-canvas border border-track">
            <Check size={20} strokeWidth={2.4} className="shrink-0 text-accent" aria-hidden />
            <span className="text-[0.8125rem] font-semibold leading-[1.45]">{c}</span>
          </li>
        ))}
      </ul>
      {erreur && (
        <p role="alert" className="rounded-xl bg-loss/10 border border-loss/40 text-loss text-sm font-medium px-4 py-3 leading-relaxed">
          {erreur}
        </p>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <p className="text-[0.8125rem] font-medium text-faint leading-relaxed max-w-md">
          {a.clientStripe
            ? 'Carte, factures, changement de formule et résiliation : tout se gère en ligne, sur la page sécurisée de Stripe.'
            : a.complet
              ? 'Changement de formule, facture, résiliation : un e-mail suffit.'
              : 'Un Pass ouvre toutes les courses : pour un jour, un mois ou un an.'}
        </p>
        <div className="flex flex-wrap gap-2.5 shrink-0">
          {!a.complet && (
            <Link to={LIEN_PASS} className="btn-accent !h-11">
              Choisir un Pass
            </Link>
          )}
          {a.clientStripe ? (
            <button type="button" onClick={portail} disabled={enCours} className="btn-glass !h-11">
              {enCours ? 'Ouverture…' : 'Gérer mon abonnement'}
            </button>
          ) : (
            a.complet && (
              <a href={mailto('Mon abonnement Crosswell')} className="btn-glass !h-11">
                Gérer mon abonnement
              </a>
            )
          )}
        </div>
      </div>
    </Carte>
  )
}

/**
 * La résiliation : en ligne, dans le portail Stripe, pour un abonnement payé
 * (obligation de résiliation « en trois clics », L215-1-1) ; par e-mail pour
 * un accès offert.
 */
function Resiliation() {
  const { acces } = useAcces()
  const [erreur, setErreur] = useState<string | null>(null)
  // `impaye` et `resiliation_programmee` DOIVENT rester résiliables en ligne.
  // La condition `statut === 'actif'` les renvoyait vers un `mailto:` : en
  // impayé, l'abonnement Stripe est pourtant bien vivant et continue ses
  // relances, et le client ne pouvait pas l'arrêter lui-même. Le portail
  // Stripe, lui, sait résilier un abonnement en attente de paiement.
  const enLigne = Boolean(
    acces?.clientStripe &&
      (acces.formule === 'mois' || acces.formule === 'an') &&
      (acces.statut === 'actif' || acces.statut === 'resiliation_programmee' || acces.statut === 'impaye'),
  )
  if (!enLigne) {
    return (
      <>
        <p className="text-sm font-medium leading-[1.55] text-muted max-w-[30rem]">
          Sans engagement. Écrivez-nous pour résilier&nbsp;: notre équipe s’en occupe et vous confirme la date de fin
          d’accès.
        </p>
        <a href={mailto('Résilier mon abonnement')} className={`${BOUTON_DANGER} shrink-0`}>
          Demander la résiliation
        </a>
      </>
    )
  }
  return (
    <>
      <p className="text-sm font-medium leading-[1.55] text-muted max-w-[30rem]">
        Sans engagement. La résiliation prend effet à la fin de la période payée, sans frais : vous gardez l’accès
        jusque-là.
        {erreur && <span className="block mt-2 text-loss">{erreur}</span>}
      </p>
      <button
        type="button"
        onClick={() =>
          ouvrirPortail('resilier')
            .then((r) => window.location.assign(r.redirection))
            .catch((e) => setErreur(e instanceof Error ? e.message : 'Le portail n’a pas pu s’ouvrir.'))
        }
        className={`${BOUTON_DANGER} shrink-0`}
      >
        Résilier en ligne
      </button>
    </>
  )
}

/**
 * AU RETOUR DU PORTAIL STRIPE, ON RELIT PLUSIEURS FOIS.
 *
 * Stripe redirige le navigateur et envoie son webhook en parallèle. La lecture
 * unique faite au chargement gagne souvent la course : la page affiche alors
 * l'état d'AVANT la résiliation, et le client en conclut qu'elle a échoué.
 *
 * Trois relectures espacées suffisent — le webhook arrive en une à trois
 * secondes. L'adresse est nettoyée aussitôt pour qu'un rechargement manuel ne
 * relance pas la série, et les minuteurs sont annulés au démontage.
 */
function useRelectureApresPortail() {
  const { recharger } = useAcces()
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('maj') !== 'portail') return
    window.history.replaceState({}, '', window.location.pathname)
    const minuteurs = [1_500, 4_000, 8_000].map((delai) => setTimeout(() => void recharger(), delai))
    return () => minuteurs.forEach(clearTimeout)
  }, [recharger])
}

export default function Compte() {
  const { email, prenom, session, deconnecter } = useAuth()
  const naviguer = useNavigate()
  useRelectureApresPortail()
  const [deconnexion, setDeconnexion] = useState(false)
  const actif = useSectionVisible()

  const lettres = initiales(prenom, email)
  const nom = prenom ?? email ?? 'Votre compte'
  const depuis = moisAnnee(session?.user.created_at)
  const membre = depuis ? `Membre depuis ${depuis}` : DEMO ? 'Compte de démonstration' : null

  async function seDeconnecter() {
    setDeconnexion(true)
    await deconnecter()
    naviguer('/connexion', { replace: true })
  }

  const identite = (grand: boolean) => (
    <div className="flex items-center gap-3.5 min-w-0">
      <span
        className={`shrink-0 rounded-full bg-accent text-accent-ink grid place-items-center font-extrabold ${
          grand ? 'w-14 h-14 text-[1.1875rem]' : 'w-12 h-12 text-[1.0625rem]'
        }`}
        aria-hidden
      >
        {lettres ?? '?'}
      </span>
      <span className="min-w-0 flex flex-col gap-[3px]">
        <span className="text-[1rem] font-bold truncate">{nom}</span>
        {membre && <span className="text-[0.8125rem] font-medium text-faint truncate">{membre}</span>}
      </span>
    </div>
  )

  return (
    <div className="flex flex-col lg:flex-row lg:justify-center gap-6 lg:gap-14 lg:pt-4">
      {/* Grand écran : identité, sections, déconnexion. */}
      <aside className="hidden lg:flex w-[16.25rem] shrink-0 flex-col gap-7 sticky top-28 self-start">
        {identite(true)}
        <nav aria-label="Sections du compte" className="flex flex-col gap-0.5">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              aria-current={actif === s.id ? 'location' : undefined}
              className={`h-11 px-3.5 rounded-xl flex items-center text-sm transition-colors ${
                actif === s.id ? 'bg-raised text-ink font-bold' : 'text-muted font-semibold hover:text-ink'
              }`}
            >
              {s.titre}
            </a>
          ))}
        </nav>
        <button type="button" className="btn-glass self-start !h-11" onClick={seDeconnecter} disabled={deconnexion}>
          <LogOut size={18} aria-hidden />
          {deconnexion ? 'Déconnexion…' : 'Se déconnecter'}
        </button>
      </aside>

      <div className="w-full lg:w-[50rem] lg:shrink-0 flex flex-col gap-4 lg:gap-6">
        <header className="flex flex-col gap-4 lg:gap-2 lg:pb-2">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-[1.4375rem] lg:text-[2.125rem] font-extrabold tracking-[-0.03em]">Mon compte</h1>
            <button
              type="button"
              className="lg:hidden btn-glass !w-11 !h-11 !px-0 shrink-0"
              onClick={seDeconnecter}
              disabled={deconnexion}
              aria-label="Se déconnecter"
            >
              <LogOut size={18} aria-hidden />
            </button>
          </div>
          <p className="hidden lg:block text-[0.9375rem] font-medium text-faint">
            Gérez votre abonnement, vos informations et vos données.
          </p>
          <div className="lg:hidden">{identite(false)}</div>
        </header>

        <Abonnement />

        <Informations />

        <Carte id="assistance" titre="Une question, un problème ?">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
            <p className="text-sm font-medium text-muted leading-relaxed max-w-lg">
              Un pronostic manquant, une arrivée absente, un doute sur un chiffre&nbsp;: écrivez-nous à{' '}
              <span className="text-ink font-semibold">{CONTACT}</span>, en précisant la date et la course.
            </p>
            <a href={`mailto:${CONTACT}`} className="btn-glass !h-11 shrink-0">
              Nous écrire
            </a>
          </div>
        </Carte>

        <Carte id="resiliation" titre="Résilier l’abonnement" danger>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
            <Resiliation />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between pt-4 lg:pt-6 border-t border-track">
            <p className="text-sm font-medium leading-[1.55] text-muted max-w-[30rem]">
              Nous ne conservons que votre adresse de connexion et, si vous l’avez saisi, votre prénom. La
              suppression du compte et de ces données est définitive.
            </p>
            <a
              href={mailto('Supprimer mon compte et mes données')}
              className="self-center sm:self-auto shrink-0 h-11 inline-flex items-center text-[0.8125rem] font-bold text-loss underline underline-offset-4"
            >
              Supprimer mon compte
            </a>
          </div>
        </Carte>
      </div>
    </div>
  )
}
