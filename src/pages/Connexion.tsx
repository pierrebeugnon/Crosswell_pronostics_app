import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import { useAuth, useConnecte } from '@/auth/AuthContext'
import { Chargement } from '@/components/ui/Chargement'
import { Logo } from '@/components/brand/Logo'
import { AVERTISSEMENT } from '@/config/app'

const CHAMP =
  'w-full h-11 px-4 rounded-2xl bg-white/[0.05] border border-white/10 text-ink ' +
  'placeholder:text-faint transition-colors focus:border-accent/40 focus:outline-none ' +
  'focus:ring-2 focus:ring-accent/70'

export default function Connexion() {
  const { connecter, lienMagique, reinitialiser, chargement } = useAuth()
  const connecte = useConnecte()
  const naviguer = useNavigate()
  const emplacement = useLocation()

  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [modeLien, setModeLien] = useState(false)
  const [lienEnvoye, setLienEnvoye] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  // Posé par ProtectedRoute quand un lien profond a été intercepté : le client
  // qui ouvre le pronostic d'une course reçu par message doit retomber dessus,
  // pas sur l'accueil.
  const etat = emplacement.state as { retour?: string } | null
  const retour = etat?.retour ?? '/'

  async function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault()
    setErreur(null)
    setInfo(null)
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
      setErreur(e instanceof Error ? e.message : "La connexion a échoué.")
    } finally {
      setEnCours(false)
    }
  }

  async function motDePasseOublie() {
    setErreur(null)
    setInfo(null)
    if (!email.trim()) {
      setErreur('Saisissez d’abord votre adresse e-mail.')
      return
    }
    setEnCours(true)
    try {
      await reinitialiser(email)
      // Formulation volontairement conditionnelle : confirmer l'envoi
      // reviendrait à révéler quelles adresses ont un compte chez nous.
      setInfo('Si un compte existe pour cette adresse, un lien de réinitialisation vient de partir.')
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "L’envoi a échoué.")
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-7 px-4 py-14">
      <Logo />

      <div className="glass-strong rounded-3xl w-full max-w-[26rem] p-6 sm:p-8 animate-fade-up">
        {lienEnvoye ? (
          <div className="text-center">
            <div className="mx-auto mb-5 w-12 h-12 rounded-2xl glass-nest grid place-items-center text-accent">
              <MailCheck size={20} aria-hidden />
            </div>
            <h1 className="font-display font-semibold text-2xl tracking-tight">Vérifiez votre boîte de réception</h1>
            <p className="text-sm text-muted mt-3 leading-relaxed">
              Un lien de connexion a été envoyé à{' '}
              <span className="text-ink break-all">{email.trim()}</span>. Il n’est valable qu’une
              seule fois, et pour une durée limitée.
            </p>
            <button
              type="button"
              className="btn-ghost mt-6"
              onClick={() => {
                setLienEnvoye(false)
                setModeLien(false)
              }}
            >
              Revenir au formulaire
            </button>
          </div>
        ) : (
          <>
            <h1 className="font-display font-semibold text-2xl tracking-tight">Accès client</h1>
            <p className="text-sm text-muted mt-2.5 leading-relaxed">
              Les pronostics du lendemain sont publiés chaque soir vers 19&nbsp;h.
            </p>

            <form onSubmit={soumettre} className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className="label block mb-2">
                  Adresse e-mail
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.fr"
                  className={CHAMP}
                />
              </div>

              {!modeLien && (
                <div>
                  <label htmlFor="motDePasse" className="label block mb-2">
                    Mot de passe
                  </label>
                  <input
                    id="motDePasse"
                    type="password"
                    autoComplete="current-password"
                    value={motDePasse}
                    onChange={(e) => setMotDePasse(e.target.value)}
                    className={CHAMP}
                  />
                </div>
              )}

              {erreur && (
                <p
                  role="alert"
                  className="rounded-2xl bg-loss/10 border border-loss/25 text-loss text-sm px-4 py-3 leading-relaxed"
                >
                  {erreur}
                </p>
              )}

              {info && (
                <p className="rounded-2xl bg-white/[0.05] border border-white/10 text-muted text-sm px-4 py-3 leading-relaxed">
                  {info}
                </p>
              )}

              <button type="submit" className="btn-accent w-full" disabled={enCours}>
                {enCours
                  ? modeLien
                    ? 'Envoi…'
                    : 'Connexion…'
                  : modeLien
                    ? 'Recevoir le lien'
                    : 'Se connecter'}
              </button>
            </form>

            <div className="mt-5 flex flex-col items-center gap-2.5 text-sm">
              <button
                type="button"
                className="text-muted hover:text-ink transition-colors"
                onClick={() => {
                  setModeLien(!modeLien)
                  setErreur(null)
                  setInfo(null)
                }}
              >
                {modeLien ? 'Utiliser mon mot de passe' : 'Recevoir un lien de connexion'}
              </button>
              {!modeLien && (
                <button
                  type="button"
                  className="text-faint hover:text-ink transition-colors"
                  onClick={motDePasseOublie}
                  disabled={enCours}
                >
                  Mot de passe oublié&nbsp;?
                </button>
              )}
            </div>
          </>
        )}

        <div className="mt-7 pt-5 border-t border-white/[0.07] text-center text-sm text-faint">
          Pas encore client&nbsp;?{' '}
          <a href="mailto:contact@crosswell.fr" className="link">
            contact@crosswell.fr
          </a>
        </div>
      </div>

      <p className="text-xs text-faint text-center max-w-md leading-relaxed">
        {AVERTISSEMENT.texte} Service réservé aux personnes majeures (
        {AVERTISSEMENT.ageMinimum}&nbsp;ans et plus).
      </p>
    </div>
  )
}
