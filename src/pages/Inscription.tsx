import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Check, Lock, MailCheck } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { useAcces } from '@/auth/AccesContext'
import { Logo } from '@/components/brand/Logo'
import { EncartMajeurs } from '@/components/layout/EncartMajeurs'
import { Champ } from '@/components/ui/Champ'
import { Chargement } from '@/components/ui/Chargement'
import { AVERTISSEMENT, CONTACT, DEMO, URL_SITE } from '@/config/app'
import { FORMULES, estFormule, formule, type CleFormule } from '@/config/formules'
import {
  formaterSaisieDate,
  libellePaiement,
  lignesRecapitulatif,
  lireDateNaissance,
  MOT_DE_PASSE_MIN,
  phraseBienvenue,
  texteConsentement,
  validerCompte,
  type ChampsCompte,
  type ErreursCompte,
  type Pass,
} from '@/lib/inscription'
import { useHeureParis } from '@/lib/useHeureParis'
import { demarrerPaiement } from '@/services/paiement'

/**
 * INSCRIPTION — `design/screens/Signup.dc.html`, `SignupPlans`, `SignupPay` et
 * leurs versions mobiles : Compte → Formule → Paiement → Bienvenue.
 *
 * Développée « comme si tout était prêt » (demande du fondateur, 18/09/2026) :
 * le compte est réellement créé (Supabase), le paiement part vers Stripe
 * Checkout (`services/paiement.ts`, fonctions dans `supabase/functions/`), et
 * la bienvenue attend la confirmation du webhook avant de dire le Pass actif.
 * L'étape vit dans
 * l'ADRESSE (`?etape=formule&formule=mois`) : le lien de confirmation d'e-mail
 * et le retour de Stripe retombent sur la bonne étape, et le retour arrière
 * fonctionne.
 *
 * Écarts à la maquette (design/INTEGRATION.md, lot 8) :
 * - pas de champs de carte : Stripe les affiche sur sa page hébergée ;
 * - une étape « Vérifiez vos e-mails » : le projet exige la confirmation de
 *   l'adresse avant d'ouvrir une session ;
 * - pas de « Recevoir les pronostics par e-mail » : aucun envoi n'existe (A7) ;
 * - pas de « Personnaliser mon app » (l'onboarding n'existe pas), ni de
 *   « Si vous pariez… » (vocabulaire banni) ;
 * - pas de bouton « Retour » à l'étape Formule : le compte est déjà créé.
 */

type Etape = 'compte' | 'confirmation' | 'formule' | 'paiement' | 'bienvenue'
const ETAPES: readonly Etape[] = ['compte', 'confirmation', 'formule', 'paiement', 'bienvenue']
const estEtape = (v: string | null): v is Etape => ETAPES.includes(v as Etape)

/** Les trois points de la maquette. La confirmation d'e-mail compte comme « Compte ». */
function Etapes({ courante }: { courante: Etape }) {
  const rang = courante === 'formule' ? 1 : courante === 'paiement' ? 2 : 0
  return (
    <ol aria-label="Étapes de l’inscription" className="flex items-center gap-4">
      {['Compte', 'Formule', 'Paiement'].map((libelle, i) => {
        const fait = i < rang
        const actif = i === rang
        return (
          <li key={libelle} aria-current={actif ? 'step' : undefined} className="flex items-center gap-2">
            <span
              className={`num w-[1.875rem] h-[1.875rem] rounded-full grid place-items-center text-[0.8125rem] font-extrabold ${
                fait || actif ? 'bg-accent text-accent-ink' : 'border border-line-strong text-faint'
              }`}
            >
              {fait ? <Check size={14} strokeWidth={3} aria-hidden /> : i + 1}
            </span>
            <span className={`text-[0.8125rem] font-bold ${fait || actif ? 'text-ink' : 'text-faint'}`}>{libelle}</span>
          </li>
        )
      })}
    </ol>
  )
}

function Titre({ titre, sous }: { titre: string; sous: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-[1.5625rem] lg:text-[1.8125rem] font-extrabold tracking-[-0.025em] leading-tight">{titre}</h1>
      <p className="text-sm font-medium text-muted leading-relaxed">{sous}</p>
    </div>
  )
}

function Alerte({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-xl bg-loss/10 border border-loss/40 text-loss text-sm font-medium px-4 py-3 leading-relaxed">
      {children}
    </p>
  )
}

/** Une case à cocher de la maquette : 20 px, libellé cliquable, erreur en retrait. */
function Case({
  coche,
  onChange,
  erreur,
  children,
}: {
  coche: boolean
  onChange: (v: boolean) => void
  erreur?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-start gap-3 text-sm font-medium leading-normal text-soft cursor-pointer">
        <input
          type="checkbox"
          checked={coche}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={erreur ? true : undefined}
          className="w-5 h-5 mt-px shrink-0 accent-accent cursor-pointer"
        />
        <span>{children}</span>
      </label>
      {erreur && (
        <span role="alert" className="pl-8 text-xs font-semibold text-loss">
          {erreur}
        </span>
      )}
    </div>
  )
}

/** Un lien vers une page légale du site vitrine, ou le seul texte si l'adresse du site manque. */
function LienSite({ chemin, children }: { chemin: string; children: ReactNode }) {
  if (!URL_SITE) return <strong className="text-ink font-bold">{children}</strong>
  return (
    <a href={`${URL_SITE}${chemin}`} target="_blank" rel="noopener noreferrer" className="text-accent font-bold hover:text-accent-hover">
      {children}
    </a>
  )
}

const VIDE: ChampsCompte = { prenom: '', email: '', motDePasse: '', naissance: '', majeur: false, conditions: false }

function EtapeCompte({ onCree }: { onCree: (email: string, confirmationRequise: boolean) => void }) {
  const { inscrire } = useAuth()
  const { jour } = useHeureParis()
  const [c, setC] = useState<ChampsCompte>(VIDE)
  const [erreurs, setErreurs] = useState<ErreursCompte>({})
  const [erreur, setErreur] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)
  const [enCours, setEnCours] = useState(false)

  const changer = <K extends keyof ChampsCompte>(cle: K, valeur: ChampsCompte[K]) => {
    setC((x) => ({ ...x, [cle]: valeur }))
    setErreurs((e) => ({ ...e, [cle]: undefined }))
  }

  async function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault()
    setErreur(null)
    const e = validerCompte(c, jour)
    setErreurs(e)
    if (Object.keys(e).length > 0) {
      // Le premier champ fautif prend le focus : sur téléphone, l'erreur peut
      // être hors de l'écran.
      const premier = (['prenom', 'email', 'motDePasse', 'naissance'] as const).find((k) => e[k])
      if (premier) document.getElementById(`su-${premier}`)?.focus()
      return
    }
    setEnCours(true)
    try {
      const r = await inscrire({ prenom: c.prenom, email: c.email, motDePasse: c.motDePasse, naissance: lireDateNaissance(c.naissance)! })
      onCree(c.email.trim(), r.confirmationRequise)
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'L’inscription a échoué.')
    } finally {
      setEnCours(false)
    }
  }

  return (
    <form onSubmit={soumettre} noValidate className="w-full max-w-[35rem] flex flex-col gap-5 animate-fade-up">
      <Titre titre="Créer votre compte" sous="Gratuit, sans carte bancaire. Vous choisirez votre formule ensuite." />
      {DEMO && (
        <p role="note" className="rounded-xl bg-loss/10 border border-loss/40 text-loss text-[0.8125rem] font-semibold px-4 py-3 leading-relaxed">
          Mode démonstration : aucun compte n’est créé, et le paiement sera simulé.
        </p>
      )}
      <Champ id="su-prenom" libelle="Prénom" autoComplete="given-name" value={c.prenom} onChange={(e) => changer('prenom', e.target.value)} erreur={erreurs.prenom} />
      <Champ
        id="su-email"
        libelle="Adresse e-mail"
        type="email"
        autoComplete="email"
        value={c.email}
        onChange={(e) => changer('email', e.target.value)}
        erreur={erreurs.email}
      />
      <Champ
        id="su-motDePasse"
        libelle="Mot de passe"
        type={visible ? 'text' : 'password'}
        autoComplete="new-password"
        value={c.motDePasse}
        onChange={(e) => changer('motDePasse', e.target.value)}
        aide={`${MOT_DE_PASSE_MIN} caractères minimum`}
        erreur={erreurs.motDePasse}
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
      <Champ
        id="su-naissance"
        libelle="Date de naissance"
        inputMode="numeric"
        autoComplete="bday"
        placeholder="JJ/MM/AAAA"
        value={c.naissance}
        onChange={(e) => changer('naissance', formaterSaisieDate(e.target.value))}
        aide="Nécessaire pour vérifier que vous êtes majeur."
        erreur={erreurs.naissance}
      />
      <div className="flex flex-col gap-3.5 p-[1.125rem] rounded-xl bg-surface border border-line">
        <Case coche={c.majeur} onChange={(v) => changer('majeur', v)} erreur={erreurs.majeur}>
          Je certifie avoir <strong className="text-ink">{AVERTISSEMENT.ageMinimum}&nbsp;ans ou plus</strong>. Crosswell
          peut me demander un justificatif.
        </Case>
        <Case coche={c.conditions} onChange={(v) => changer('conditions', v)} erreur={erreurs.conditions}>
          J’accepte les <LienSite chemin="/cgu">conditions générales</LienSite> et la{' '}
          <LienSite chemin="/confidentialite">politique de confidentialité</LienSite>.
        </Case>
      </div>
      {erreur && <Alerte>{erreur}</Alerte>}
      <button type="submit" className="btn-accent !h-[3.25rem] !text-[0.9375rem] w-full" disabled={enCours}>
        {enCours ? 'Création du compte…' : 'Continuer'}
      </button>
    </form>
  )
}

function EtapeConfirmation({ email }: { email: string | null }) {
  return (
    <div role="status" className="w-full max-w-[35rem] flex flex-col gap-5 animate-fade-up">
      <span className="w-12 h-12 rounded-xl bg-accent/[0.12] grid place-items-center text-accent" aria-hidden>
        <MailCheck size={22} />
      </span>
      <Titre
        titre="Vérifiez vos e-mails"
        sous={
          <>
            Un lien de confirmation vient de partir{email ? <> à <span className="text-ink break-all">{email}</span></> : null}. Il
            vous ramène ici, connecté, pour choisir votre formule.
          </>
        }
      />
      <p className="text-[0.8125rem] font-medium text-faint leading-relaxed">
        Rien reçu d’ici quelques minutes&nbsp;? Regardez dans les indésirables, ou écrivez-nous à{' '}
        <a href={`mailto:${CONTACT}`} className="text-accent font-bold hover:text-accent-hover">
          {CONTACT}
        </a>
        .
      </p>
    </div>
  )
}

function EtapeFormule({ choisie, onChoisir, onContinuer }: { choisie: CleFormule; onChoisir: (c: CleFormule) => void; onContinuer: () => void }) {
  return (
    <div className="w-full max-w-[45rem] flex flex-col gap-5 animate-fade-up">
      <Titre
        titre="Choisissez votre formule"
        sous="Une course offerte chaque jour, ou un Pass pour tout débloquer. Les Pass mensuel et annuel sont sans engagement."
      />
      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">Formule</legend>
        {FORMULES.map((f) => {
          const coche = f.cle === choisie
          return (
            <label
              key={f.cle}
              htmlFor={`formule-${f.cle}`}
              className={`flex items-center gap-4 px-[1.125rem] py-4 rounded-2xl border cursor-pointer transition-colors ${
                coche ? 'border-accent bg-accent/[0.06]' : 'border-line bg-surface hover:border-line-hover'
              }`}
            >
              <input
                id={`formule-${f.cle}`}
                type="radio"
                name="formule"
                checked={coche}
                onChange={() => onChoisir(f.cle)}
                className="w-5 h-5 shrink-0 accent-accent"
              />
              <span className="grow min-w-0 flex flex-col gap-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-[1rem] font-extrabold">{f.nom}</span>
                  {f.vedette && (
                    <span className="text-[0.625rem] font-extrabold uppercase tracking-[0.08em] text-accent-ink bg-accent rounded-full px-2 py-[3px]">
                      Recommandé
                    </span>
                  )}
                </span>
                <span className="text-[0.8125rem] font-medium leading-normal text-muted">{f.description}</span>
              </span>
              <span className="num shrink-0 flex flex-col items-end">
                <span className="text-[1.25rem] font-extrabold whitespace-nowrap">{f.prix}</span>
                <span className="text-xs font-semibold text-faint whitespace-nowrap">{f.periode}</span>
              </span>
            </label>
          )
        })}
      </fieldset>
      <button type="button" onClick={onContinuer} className="btn-accent !h-[3.25rem] !text-[0.9375rem] w-full">
        {choisie === 'gratuit' ? 'Continuer gratuitement' : 'Continuer vers le paiement'}
      </button>
    </div>
  )
}

function EtapePaiement({ pass, onRetour }: { pass: Pass; onRetour: () => void }) {
  const naviguer = useNavigate()
  const f = formule(pass)
  const [accord, setAccord] = useState(false)
  const [erreurAccord, setErreurAccord] = useState<string | undefined>()
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  async function payer() {
    setErreur(null)
    if (!accord) {
      setErreurAccord('Cochez cette case pour continuer.')
      return
    }
    setEnCours(true)
    try {
      const r = await demarrerPaiement({ formule: pass, consentement: texteConsentement(pass) })
      if (r.externe) window.location.assign(r.redirection)
      else naviguer(r.redirection)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Le paiement n’a pas pu démarrer.')
      setEnCours(false)
    }
  }

  return (
    <div className="w-full max-w-[55rem] grid gap-6 lg:grid-cols-[minmax(0,1fr)_18.75rem] items-start animate-fade-up">
      <div className="flex flex-col gap-[1.125rem]">
        <Titre
          titre="Paiement"
          sous={
            <span className="flex items-center gap-2">
              <Lock size={16} className="text-accent shrink-0" aria-hidden />
              Paiement sécurisé par Stripe
            </span>
          }
        />
        <p className="text-sm font-medium leading-relaxed text-soft">
          Vous allez être redirigé vers la page de paiement sécurisée de Stripe pour saisir votre carte. Aucune donnée
          bancaire ne transite par Crosswell.
        </p>
        {DEMO && (
          <p role="note" className="rounded-xl bg-loss/10 border border-loss/40 text-loss text-[0.8125rem] font-semibold px-4 py-3 leading-relaxed">
            Mode démonstration : le paiement est simulé, aucune page Stripe ne s’ouvre.
          </p>
        )}
        <div className="p-[1.125rem] rounded-xl bg-surface border border-line">
          <Case
            coche={accord}
            onChange={(v) => {
              setAccord(v)
              setErreurAccord(undefined)
            }}
            erreur={erreurAccord}
          >
            {texteConsentement(pass)}
          </Case>
        </div>
        {erreur && <Alerte>{erreur}</Alerte>}
        <div className="flex gap-3">
          <button type="button" onClick={onRetour} className="btn-glass !h-[3.25rem] !px-[1.375rem] shrink-0">
            Retour
          </button>
          <button type="button" onClick={payer} disabled={enCours} className="btn-accent !h-[3.25rem] !text-[0.9375rem] grow">
            {enCours ? 'Ouverture du paiement…' : libellePaiement(pass)}
          </button>
        </div>
      </div>
      <aside aria-label="Récapitulatif" className="flex flex-col gap-3.5 p-[1.375rem] rounded-2xl bg-surface border border-line">
        <span className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-faint">Récapitulatif</span>
        <span className="text-[1rem] font-extrabold">{f.nom}</span>
        <span className="num flex items-baseline gap-1.5">
          <span className="text-[1.4375rem] font-extrabold">{f.prix}</span>
          <span className="text-[0.8125rem] font-semibold text-faint">{f.periode} · TTC</span>
        </span>
        <ul className="flex flex-col gap-2 pt-3.5 border-t border-track text-[0.8125rem] font-medium leading-normal text-muted">
          {lignesRecapitulatif(pass).map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </aside>
    </div>
  )
}

/** Combien de fois, et à quel rythme, relire l'accès en attendant la confirmation de Stripe. */
const ESSAIS_CONFIRMATION = 15
const RYTHME_CONFIRMATION_MS = 2000

function EtapeBienvenue({ choisie }: { choisie: CleFormule }) {
  const { prenom } = useAuth()
  const { recharger } = useAcces()
  // Un Pass ne s'ouvre qu'à la confirmation de Stripe (webhook, `db/007`) :
  // on relit l'accès jusqu'à la voir, sans jamais la supposer.
  const [confirmation, setConfirmation] = useState<'attente' | 'ok' | 'retard'>(choisie === 'gratuit' ? 'ok' : 'attente')

  useEffect(() => {
    if (DEMO) {
      // La démonstration bascule l'accès fictif sur la formule choisie.
      try {
        window.sessionStorage.setItem('crosswell.demo.acces', choisie === 'gratuit' ? 'gratuit' : 'pass')
      } catch {
        /* stockage bloqué : l'accès fictif reste celui de l'onglet */
      }
      void recharger()
      if (choisie !== 'gratuit') setConfirmation('ok')
      return
    }
    if (choisie === 'gratuit') return
    let essais = 0
    let minuterie = 0
    let vivant = true
    const tic = async () => {
      const a = await recharger()
      if (!vivant) return
      if (a?.complet && a.formule !== 'gratuit') setConfirmation('ok')
      else if (++essais >= ESSAIS_CONFIRMATION) setConfirmation('retard')
      else minuterie = window.setTimeout(tic, RYTHME_CONFIRMATION_MS)
    }
    minuterie = window.setTimeout(tic, 1000)
    return () => {
      vivant = false
      window.clearTimeout(minuterie)
    }
  }, [choisie, recharger])

  return (
    <div className="w-full max-w-[35rem] flex flex-col items-center gap-[1.125rem] text-center pt-6 animate-fade-up">
      <span className="w-[4.5rem] h-[4.5rem] rounded-full bg-accent grid place-items-center text-accent-ink" aria-hidden>
        <Check size={34} strokeWidth={3} />
      </span>
      <h1 className="text-[1.5625rem] lg:text-[1.8125rem] font-extrabold tracking-[-0.025em] leading-tight">
        {prenom ? `Bienvenue, ${prenom}` : 'Bienvenue parmi nous'}
      </h1>
      <p className="text-[0.9375rem] font-medium leading-relaxed text-muted">{phraseBienvenue(choisie)}</p>
      {choisie !== 'gratuit' && (
        <p role="status" className={`text-[0.8125rem] font-bold ${confirmation === 'ok' ? 'text-accent' : 'text-faint'}`}>
          {confirmation === 'ok'
            ? 'Paiement confirmé : votre Pass est actif.'
            : confirmation === 'attente'
              ? 'Confirmation du paiement par Stripe…'
              : `La confirmation tarde : votre Pass s’activera dans quelques instants. S’il ne l’est pas d’ici une heure, écrivez-nous à ${CONTACT}.`}
        </p>
      )}
      <Link to="/courses" className="btn-accent !h-[3.25rem] !text-[0.9375rem] !px-7">
        Voir les pronostics du jour
      </Link>
      <Link to="/" className="min-h-11 flex items-center text-sm font-bold text-muted hover:text-ink">
        Aller à l’accueil
      </Link>
    </div>
  )
}

export default function Inscription() {
  const { connecte, chargement } = useAuth()
  const [params, setParams] = useSearchParams()
  const [emailEnvoye, setEmailEnvoye] = useState<string | null>(null)

  const brute = params.get('etape')
  const demandee: Etape = estEtape(brute) ? brute : 'compte'
  const brutFormule = params.get('formule')
  const choisie: CleFormule = estFormule(brutFormule) ? brutFormule : 'mois'

  const aller = (etape: Etape, f: CleFormule = choisie) => {
    setParams({ etape, formule: f })
    window.scrollTo({ top: 0 })
  }

  if (chargement) {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <Chargement />
      </div>
    )
  }

  // Formule, paiement et bienvenue demandent une session : sans elle, on
  // revient au compte (la formule choisie sur le site est gardée). Un client
  // déjà connecté, lui, passe directement au choix de la formule.
  let etape = demandee
  if (!connecte && (etape === 'formule' || etape === 'paiement' || etape === 'bienvenue')) {
    return <Navigate to={`/inscription?formule=${choisie}`} replace />
  }
  if (connecte && etape === 'compte') etape = 'formule'
  if (etape === 'paiement' && choisie === 'gratuit') etape = 'formule'

  let contenu: ReactNode
  if (etape === 'compte')
    contenu = <EtapeCompte onCree={(email, confirmation) => (confirmation ? (setEmailEnvoye(email), aller('confirmation')) : aller('formule'))} />
  else if (etape === 'confirmation') contenu = <EtapeConfirmation email={emailEnvoye} />
  else if (etape === 'formule')
    contenu = (
      <EtapeFormule
        choisie={choisie}
        onChoisir={(f) => setParams({ etape: 'formule', formule: f }, { replace: true })}
        onContinuer={() => aller(choisie === 'gratuit' ? 'bienvenue' : 'paiement')}
      />
    )
  else if (etape === 'paiement') contenu = <EtapePaiement pass={choisie as Pass} onRetour={() => aller('formule')} />
  else contenu = <EtapeBienvenue choisie={choisie} />

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-16 lg:h-[4.75rem] shrink-0 px-5 lg:px-10 flex items-center justify-between gap-4 border-b border-sep">
        {URL_SITE ? (
          <a href={URL_SITE} aria-label="Crosswell Pronostics, le site">
            <Logo />
          </a>
        ) : (
          <Logo />
        )}
        {etape !== 'bienvenue' && !connecte && (
          <span className="text-[0.8125rem] font-medium text-faint text-right">
            Déjà inscrit&nbsp;?{' '}
            <Link to="/connexion" className="text-accent font-bold hover:text-accent-hover">
              Se connecter
            </Link>
          </span>
        )}
      </header>
      <main className="flex-1 flex flex-col items-center gap-8 px-5 lg:px-10 pt-8 lg:pt-11 pb-10 lg:pb-12">
        {etape !== 'bienvenue' && <Etapes courante={etape} />}
        {contenu}
        <div className="w-full max-w-[45rem] mt-auto">
          <EncartMajeurs lienMethode={false} />
        </div>
      </main>
    </div>
  )
}
