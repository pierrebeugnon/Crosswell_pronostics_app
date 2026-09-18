import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { useAuth, useConnecte } from '@/auth/AuthContext'
import { Chargement } from '@/components/ui/Chargement'
import { Champ } from '@/components/ui/Champ'
import { Logo } from '@/components/brand/Logo'
import { EncartMajeurs } from '@/components/layout/EncartMajeurs'
import { DEMO, RYTHME_PUBLICATION_COURT, URL_SITE } from '@/config/app'

const EMAIL_VALIDE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/** Le logo mène au site vitrine, comme sur la maquette (lien vers `Landing`). */
function LogoVersSite() {
  if (!URL_SITE) return <Logo />
  return (
    <a href={URL_SITE} aria-label="Crosswell Pronostics, le site">
      <Logo />
    </a>
  )
}

/**
 * CONNEXION — `design/screens/Login.dc.html`.
 *
 * Grand écran : une colonne de marque à gauche (logo, accroche, encart 18+),
 * le formulaire centré à droite. Téléphone : un bandeau avec le logo, puis le
 * formulaire et l'encart.
 *
 * Écarts à la maquette (design/INTEGRATION.md) :
 * - la connexion par lien reçu par e-mail est gardée, en lien discret sous le
 *   bouton : elle existe déjà et évite un mot de passe oublié ;
 * - « Créer un compte » mène à l'inscription (`pages/Inscription.tsx`, lot 8) ;
 * - pas de « cotes en direct » dans l'accroche : on n'en a pas ;
 * - sur téléphone, « Découvrir le service » double le logo pour aller au site
 *   vitrine (demande du fondateur du 18/09 : on arrivait ici sans voir le site).
 */
export default function Connexion() {
  const { connecter, lienMagique, reinitialiser, chargement } = useAuth()
  const connecte = useConnecte()
  const naviguer = useNavigate()
  const emplacement = useLocation()

  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [visible, setVisible] = useState(false)
  const [modeLien, setModeLien] = useState(false)
  const [lienEnvoye, setLienEnvoye] = useState(false)
  const [erreurs, setErreurs] = useState<{ email?: string; motDePasse?: string }>({})
  const [erreur, setErreur] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  // Posé par ProtectedRoute quand un lien profond a été intercepté : le client
  // qui ouvre le pronostic d'une course reçu par message doit retomber dessus,
  // pas sur l'accueil.
  const etat = emplacement.state as { retour?: string } | null
  const retour = etat?.retour ?? '/'

  function valider(): boolean {
    const e: typeof erreurs = {}
    if (!EMAIL_VALIDE.test(email.trim())) e.email = 'Adresse e-mail invalide.'
    if (!modeLien && !motDePasse) e.motDePasse = 'Indiquez votre mot de passe.'
    setErreurs(e)
    return Object.keys(e).length === 0
  }

  async function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault()
    setErreur(null)
    setInfo(null)
    if (!valider()) return
    setEnCours(true)
    try {
      if (modeLien) {
        await lienMagique(email)
        setLienEnvoye(true)
      } else {
        await connecter(email, motDePasse)
        naviguer(retour, { replace: true })
      }
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'La connexion a échoué.')
    } finally {
      setEnCours(false)
    }
  }

  async function motDePasseOublie() {
    setErreur(null)
    setInfo(null)
    if (!EMAIL_VALIDE.test(email.trim())) {
      setErreurs({ email: 'Saisissez d’abord votre adresse e-mail.' })
      return
    }
    setErreurs({})
    setEnCours(true)
    try {
      await reinitialiser(email)
      // Formulation volontairement conditionnelle : confirmer l'envoi
      // reviendrait à révéler quelles adresses ont un compte chez nous.
      setInfo('Si un compte existe pour cette adresse, un lien de réinitialisation vient de partir.')
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'L’envoi a échoué.')
    } finally {
      setEnCours(false)
    }
  }

  if (chargement) {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <Chargement />
      </div>
    )
  }
  if (connecte) return <Navigate to="/" replace />

  const formulaire = lienEnvoye ? (
    <div className="flex flex-col gap-5" role="status">
      <span className="w-12 h-12 rounded-xl bg-accent/[0.12] grid place-items-center text-accent" aria-hidden>
        <MailCheck size={22} />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="text-[1.5625rem] lg:text-[1.875rem] font-extrabold tracking-[-0.025em]">Vérifiez vos e-mails</h1>
        <p className="text-sm font-medium text-muted leading-relaxed">
          Un lien de connexion a été envoyé à <span className="text-ink break-all">{email.trim()}</span>. Il
          n’est valable qu’une seule fois, et pour une durée limitée.
        </p>
      </div>
      <button
        type="button"
        className="btn-glass self-start"
        onClick={() => {
          setLienEnvoye(false)
          setModeLien(false)
        }}
      >
        Revenir au formulaire
      </button>
    </div>
  ) : (
    <form onSubmit={soumettre} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <h1 className="text-[1.5625rem] lg:text-[1.875rem] font-extrabold tracking-[-0.025em]">Se connecter</h1>
        <p className="text-sm font-medium text-muted">
          {modeLien ? 'Recevez un lien de connexion par e-mail.' : 'Content de vous revoir.'}
        </p>
      </div>

      {DEMO && (
        <p role="note" className="rounded-xl bg-loss/10 border border-loss/40 text-loss text-[0.8125rem] font-semibold px-4 py-3 leading-relaxed">
          Mode démonstration : n’importe quelle adresse et n’importe quel mot de passe ouvrent la démo.
        </p>
      )}

      <Champ
        id="email"
        libelle="Adresse e-mail"
        type="email"
        autoComplete="email"
        autoFocus
        value={email}
        onChange={(e) => {
          setEmail(e.target.value)
          setErreurs({})
        }}
        erreur={erreurs.email}
      />

      {!modeLien && (
        <Champ
          id="motDePasse"
          libelle="Mot de passe"
          type={visible ? 'text' : 'password'}
          autoComplete="current-password"
          value={motDePasse}
          onChange={(e) => {
            setMotDePasse(e.target.value)
            setErreurs({})
          }}
          erreur={erreurs.motDePasse}
          action={
            <button
              type="button"
              onClick={motDePasseOublie}
              disabled={enCours}
              className="text-[0.8125rem] font-bold text-accent hover:text-accent-hover"
            >
              Mot de passe oublié&nbsp;?
            </button>
          }
          suffixe={
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              aria-pressed={visible}
              className="h-10 px-3 rounded-[10px] text-[0.8125rem] font-bold text-muted hover:text-ink"
            >
              {visible ? 'Masquer' : 'Afficher'}
            </button>
          }
        />
      )}

      {erreur && (
        <p role="alert" className="rounded-xl bg-loss/10 border border-loss/40 text-loss text-sm font-medium px-4 py-3 leading-relaxed">
          {erreur}
        </p>
      )}
      {info && (
        <p role="status" className="rounded-xl bg-surface border border-line text-muted text-sm font-medium px-4 py-3 leading-relaxed">
          {info}
        </p>
      )}

      <button type="submit" className="btn-accent !h-[3.25rem] !text-[0.9375rem]" disabled={enCours}>
        {enCours ? (modeLien ? 'Envoi…' : 'Connexion…') : modeLien ? 'Recevoir le lien' : 'Se connecter'}
      </button>

      <button
        type="button"
        className="self-center text-sm font-semibold text-muted hover:text-ink transition-colors"
        onClick={() => {
          setModeLien(!modeLien)
          setErreur(null)
          setInfo(null)
          setErreurs({})
        }}
      >
        {modeLien ? 'Utiliser mon mot de passe' : 'Recevoir plutôt un lien par e-mail'}
      </button>

      <p className="text-sm font-medium text-muted text-center">
        Pas encore de compte&nbsp;?{' '}
        <Link to="/inscription" className="text-accent font-bold hover:text-accent-hover">
          Créer un compte
        </Link>
      </p>
    </form>
  )

  return (
    <div className="min-h-screen flex flex-col lg:grid lg:grid-cols-[35rem_minmax(0,1fr)]">
      {/* Grand écran : la colonne de marque. */}
      <aside className="hidden lg:flex flex-col justify-between gap-10 px-12 pt-10 pb-12 bg-surface border-r border-sep">
        <LogoVersSite />
        <div className="flex flex-col gap-[1.125rem]">
          <p className="text-[2.3125rem] font-extrabold tracking-[-0.03em] leading-[1.05]">
            Les pronostics du jour vous attendent.
          </p>
          <p className="text-[0.9375rem] font-medium leading-relaxed text-muted">
            Arrivée prédite et chances en pourcentage, pour chaque course. {RYTHME_PUBLICATION_COURT}
          </p>
        </div>
        <EncartMajeurs lienMethode={false} />
      </aside>

      {/* Téléphone : le bandeau. Un logo cliquable se devine mal au doigt : le
          lien vers le site est aussi écrit en toutes lettres (écart à la maquette). */}
      <header className="lg:hidden h-16 shrink-0 px-5 flex items-center justify-between gap-4 border-b border-sep">
        <LogoVersSite />
        {URL_SITE && (
          <a href={URL_SITE} className="inline-flex items-center min-h-11 text-[0.8125rem] font-bold text-accent hover:text-accent-hover">
            Découvrir le service
          </a>
        )}
      </header>

      <main className="flex-1 flex flex-col lg:items-center lg:justify-center gap-10 px-5 pt-10 pb-8 lg:p-10">
        <div className="w-full lg:w-[26.25rem] animate-fade-up">{formulaire}</div>
        <div className="lg:hidden mt-auto">
          <EncartMajeurs lienMethode={false} />
        </div>
      </main>
    </div>
  )
}
