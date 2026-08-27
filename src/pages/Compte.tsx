import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Check,
  Flag,
  KeyRound,
  LifeBuoy,
  LineChart,
  LogOut,
  Mail,
  ShieldAlert,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Carte, EnTeteCarte } from '@/components/ui/Carte'
import { useAuth } from '@/auth/AuthContext'
import { AVERTISSEMENT, DEMO } from '@/config/app'
import { dateLongue } from '@/lib/format'

/**
 * La page compte est le GUICHET UNIQUE du client : abonnement, identifiants,
 * sécurité, contact, résiliation — tout ce qui concerne sa relation avec nous
 * vit ici, et nulle part ailleurs.
 *
 * PAS DE FAUSSE MACHINERIE. Il n'existe pas encore de portail de paiement en
 * ligne : la carte Abonnement le dit et route vers l'équipe, plutôt que de
 * mimer un écran Stripe vide. Le jour où le portail arrive, seule cette carte
 * change. Le changement de mot de passe, lui, est bien réel — il passe par
 * Supabase Auth, dont c'est la session courante qui est modifiée.
 */

const CONTACT = 'contact@crosswell.fr'

const LIVRAISONS: { icone: LucideIcon; titre: string; texte: string }[] = [
  {
    icone: CalendarClock,
    titre: 'Les pronostics du lendemain',
    texte:
      'Publiés chaque soir vers 19 h, dès que les partants définitifs sont connus. Probabilité de victoire et de place pour chaque cheval.',
  },
  {
    icone: Flag,
    titre: 'Les arrivées et les cotes',
    texte:
      'Rapatriées le lendemain, une fois les courses courues. Deux réunions sur trois ne sont pas cotées : dans ce cas, l’arrivée est affichée sans cote.',
  },
  {
    icone: LineChart,
    titre: 'L’historique de nos résultats',
    texte:
      'Taux de victoire, taux de place, calibration — consultables à tout moment, sur l’ensemble des courses jugées, y compris quand ils sont mauvais.',
  },
]

const CHAMP =
  'w-full h-11 px-4 rounded-2xl bg-white/[0.05] border border-white/10 text-ink text-base ' +
  'placeholder:text-faint transition-colors focus:border-accent/40 focus:outline-none ' +
  'focus:ring-2 focus:ring-accent/70'

/** '2026-08-27T09:12:33Z' → 'jeudi 27 août 2026', sans bruit d'heure. */
function jourDe(iso: string | undefined): string | null {
  if (!iso) return null
  return dateLongue(iso.slice(0, 10))
}

function FormulaireMotDePasse() {
  const { changerMotDePasse } = useAuth()
  const [motDePasse, setMotDePasse] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [fait, setFait] = useState(false)

  async function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault()
    setErreur(null)
    setFait(false)
    if (motDePasse.length < 8) {
      setErreur('Huit caractères au minimum — un mot de passe court se devine.')
      return
    }
    if (motDePasse !== confirmation) {
      setErreur('Les deux saisies ne correspondent pas.')
      return
    }
    setEnCours(true)
    try {
      await changerMotDePasse(motDePasse)
      setFait(true)
      setMotDePasse('')
      setConfirmation('')
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Le changement a échoué.')
    } finally {
      setEnCours(false)
    }
  }

  return (
    <form onSubmit={soumettre} className="mt-5 pt-5 border-t border-white/[0.07]">
      <p className="label mb-3 flex items-center gap-2">
        <KeyRound size={13} aria-hidden />
        Changer de mot de passe
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="sr-only">Nouveau mot de passe</span>
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Nouveau mot de passe"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            className={CHAMP}
            required
            minLength={8}
          />
        </label>
        <label className="block">
          <span className="sr-only">Confirmer le mot de passe</span>
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Confirmer"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            className={CHAMP}
            required
          />
        </label>
      </div>

      {erreur && (
        <p role="alert" className="mt-3 text-sm text-loss">
          {erreur}
        </p>
      )}
      {fait && (
        <p role="status" className="mt-3 text-sm text-win flex items-center gap-1.5">
          <Check size={14} aria-hidden />
          Mot de passe changé. Il vaut dès maintenant, sur tous vos appareils.
        </p>
      )}

      <button type="submit" className="btn-glass mt-4" disabled={enCours}>
        {enCours ? 'Changement…' : 'Changer le mot de passe'}
      </button>
      {DEMO && (
        <p className="mt-2 text-xs text-faint">Indisponible en mode démonstration.</p>
      )}
    </form>
  )
}

export default function Compte() {
  const { email, session, deconnecter } = useAuth()
  const naviguer = useNavigate()
  const [deconnexion, setDeconnexion] = useState(false)

  const membreDepuis = jourDe(session?.user.created_at)
  const derniereConnexion = jourDe(session?.user.last_sign_in_at)

  async function seDeconnecter() {
    setDeconnexion(true)
    await deconnecter()
    naviguer('/connexion', { replace: true })
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="titre-page">Votre compte</h1>
        <p className="text-sm text-muted mt-2">
          Abonnement, identifiants, sécurité et contact — tout se gère ici.
        </p>
      </header>

      {/* ─────────────────────────── Abonnement ─────────────────────────── */}
      <Carte className="animate-fade-up">
        <EnTeteCarte
          titre="Votre abonnement"
          action={
            <span className="chip-accent">
              <BadgeCheck size={13} aria-hidden />
              Accès actif
            </span>
          }
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="card-nest p-4">
            <p className="label">Formule</p>
            <p className="mt-1.5 font-medium">Crosswell Pronostics</p>
            <p className="text-xs text-muted mt-1">
              Accès complet : pronostics quotidiens, historique, résultats.
            </p>
          </div>
          <div className="card-nest p-4">
            <p className="label">Membre depuis</p>
            <p className="mt-1.5 font-medium first-letter:uppercase">
              {membreDepuis ?? 'Compte de démonstration'}
            </p>
            {derniereConnexion && (
              <p className="text-xs text-muted mt-1 first-letter:uppercase">
                Dernier accès : {derniereConnexion}
              </p>
            )}
          </div>
          <div className="card-nest p-4">
            <p className="label">Titulaire</p>
            <p className="mt-1.5 font-medium break-all">{email ?? '—'}</p>
            <p className="text-xs text-muted mt-1">Accès nominatif : une adresse, un client.</p>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <p className="text-sm text-muted leading-relaxed max-w-xl">
            La facturation est gérée en direct avec notre équipe — changement de formule,
            facture, résiliation : un e-mail suffit, nous nous occupons du reste. Le portail de
            gestion en ligne arrivera dans une prochaine version.
          </p>
          <a
            href={`mailto:${CONTACT}?subject=Mon abonnement Crosswell`}
            className="btn-accent shrink-0"
          >
            Gérer mon abonnement
          </a>
        </div>
      </Carte>

      {/* ───────────────────── Identifiants & sécurité ───────────────────── */}
      <Carte className="animate-fade-up" style={{ animationDelay: '50ms' }}>
        <EnTeteCarte
          titre="Identifiants et sécurité"
          aide="L'adresse de connexion est aussi celle où nous vous écrivons."
        />

        <div className="card-nest p-4 flex items-center gap-3.5">
          <span className="shrink-0 w-9 h-9 rounded-2xl bg-white/[0.06] grid place-items-center text-accent">
            <Mail size={16} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="label">Adresse de connexion</p>
            <p className="mt-1 break-all">{email ?? 'Adresse indisponible'}</p>
          </div>
        </div>
        <p className="text-xs text-faint mt-3 leading-relaxed">
          Pour changer d'adresse, écrivez-nous : l'accès étant nominatif, nous vérifions la
          demande avant de la déplacer.
        </p>

        <FormulaireMotDePasse />

        <div className="mt-5 pt-5 border-t border-white/[0.07]">
          <button
            type="button"
            className="btn-glass"
            onClick={seDeconnecter}
            disabled={deconnexion}
          >
            <LogOut size={15} aria-hidden />
            {deconnexion ? 'Déconnexion…' : 'Se déconnecter de cet appareil'}
          </button>
        </div>
      </Carte>

      {/* ─────────────────────── Ce que vous recevez ─────────────────────── */}
      <Carte className="animate-fade-up" style={{ animationDelay: '100ms' }}>
        <EnTeteCarte titre="Ce que votre accès comprend" />
        <ul className="space-y-3">
          {LIVRAISONS.map(({ icone: Icone, titre, texte }) => (
            <li key={titre} className="card-nest p-4 flex gap-3.5">
              <span className="shrink-0 w-9 h-9 rounded-2xl bg-white/[0.06] grid place-items-center text-accent">
                <Icone size={17} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">{titre}</p>
                <p className="text-sm text-muted mt-1 leading-relaxed">{texte}</p>
              </div>
            </li>
          ))}
        </ul>
      </Carte>

      {/* ─────────────────────────── Assistance ─────────────────────────── */}
      <Carte className="animate-fade-up" style={{ animationDelay: '150ms' }}>
        <EnTeteCarte
          titre="Une question, un problème ?"
          aide="Un pronostic manquant, une arrivée absente, un doute sur un chiffre : écrivez-nous."
        />
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div className="flex items-center gap-3.5 min-w-0">
            <span className="shrink-0 w-9 h-9 rounded-2xl bg-white/[0.06] grid place-items-center text-accent">
              <LifeBuoy size={16} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">{CONTACT}</p>
              <p className="text-xs text-muted mt-0.5">
                Précisez la date et la course concernées : la réponse n'en sera que plus rapide.
              </p>
            </div>
          </div>
          <a href={`mailto:${CONTACT}`} className="btn-glass shrink-0">
            Nous écrire
          </a>
        </div>
      </Carte>

      {/* ─────────────────── Positionnement du service ─────────────────── */}
      <Carte className="animate-fade-up" style={{ animationDelay: '200ms' }}>
        <EnTeteCarte titre="Ce que ce service est — et n'est pas" />
        <p className="text-sm text-muted leading-relaxed">
          Crosswell publie des <span className="text-ink font-medium">analyses statistiques</span> :
          des probabilités mesurées, accompagnées de leur historique de réussite. Ce n'est ni un
          opérateur de jeux, ni un service de conseil — ce que vous faites de ces analyses vous
          appartient entièrement.
        </p>
        <p className="text-sm text-muted mt-3 leading-relaxed">
          Aucune de nos estimations n'est une promesse : ce sont des probabilités, et un cheval
          annoncé à 30&nbsp;% ne s'impose pas sept fois sur dix. {AVERTISSEMENT.texte}
        </p>
      </Carte>

      {/* ─────────────────── Données personnelles ─────────────────── */}
      <Carte className="!border-info/25 animate-fade-up" style={{ animationDelay: '250ms' }}>
        <div className="flex gap-3.5">
          <ShieldAlert size={18} className="text-info shrink-0 mt-0.5" aria-hidden />
          <div className="text-sm text-muted leading-relaxed">
            <p>
              <span className="text-ink font-medium">Vos données.</span> Nous ne conservons que
              votre adresse de connexion — aucune donnée de navigation revendue, aucun profil
              publicitaire. Pour obtenir une copie de vos données ou{' '}
              <span className="text-ink font-medium">supprimer votre compte</span>, écrivez-nous à{' '}
              <a href={`mailto:${CONTACT}?subject=Mes données personnelles`} className="link">
                {CONTACT}
              </a>{' '}
              : la demande est traitée manuellement, et la suppression est définitive.
            </p>
          </div>
        </div>
      </Carte>

      <Link
        to="/methode"
        className="card p-4 flex items-center justify-between gap-3 hover:bg-white/[0.07]
                   active:bg-white/[0.09] transition-colors animate-fade-up"
        style={{ animationDelay: '300ms' }}
      >
        <span>
          <span className="text-sm font-medium block">Comment ces probabilités sont calculées</span>
          <span className="text-sm text-muted">Notre méthode, et ses limites.</span>
        </span>
        <ArrowRight size={16} className="shrink-0 text-faint" aria-hidden />
      </Link>
    </div>
  )
}
