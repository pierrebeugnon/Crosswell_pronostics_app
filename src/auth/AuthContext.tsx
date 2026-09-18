import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, configure } from '@/lib/supabase'
import { DEMO } from '@/config/app'
import { lirePrenom, nettoyerPrenom } from '@/lib/prenom'

interface Auth {
  session: Session | null
  email: string | null
  /**
   * Le prénom saisi dans le compte (`user_metadata.prenom`), pour saluer le
   * client sur l'accueil. Le client peut écrire cette métadonnée lui-même : elle
   * ne sert à AUCUNE décision d'accès.
   */
  prenom: string | null
  /** Enregistre le prénom (nettoyé) ; une saisie vide l'efface. */
  changerPrenom: (prenom: string) => Promise<void>
  /** Tant qu'il est vrai, on ne sait pas encore si l'utilisateur est connecté. */
  chargement: boolean
  /** L'utilisateur a le droit de voir les pronostics (session ouverte, ou démo ouverte). */
  connecte: boolean
  connecter: (email: string, motDePasse: string) => Promise<void>
  /**
   * Crée le compte (page Inscription). `confirmationRequise` : le projet exige
   * la confirmation de l'adresse — aucune session tant que le client n'a pas
   * suivi le lien reçu, qui le ramène à l'étape « Formule ».
   */
  inscrire: (d: DonneesInscription) => Promise<{ confirmationRequise: boolean }>
  lienMagique: (email: string) => Promise<void>
  reinitialiser: (email: string) => Promise<void>
  changerMotDePasse: (motDePasse: string) => Promise<void>
  deconnecter: () => Promise<void>
}

export interface DonneesInscription {
  prenom: string
  email: string
  motDePasse: string
  /** 'AAAA-MM-JJ'. */
  naissance: string
}

const Contexte = createContext<Auth | null>(null)

/** Prénom de la démonstration, tant que le visiteur ne l'a pas changé. */
const PRENOM_DEMO = 'Camille'
const CLE_PRENOM_DEMO = 'crosswell.demo.prenom'

/**
 * En démo, rien ne part vers Supabase : le prénom vit dans le stockage de
 * SESSION du navigateur (fermer l'onglet le remet à « Camille »). Accès protégé :
 * un navigateur qui bloque le stockage ne doit pas casser la page.
 */
function lirePrenomDemo(): string | null {
  try {
    const v = window.sessionStorage.getItem(CLE_PRENOM_DEMO)
    if (v == null) return PRENOM_DEMO
    return lirePrenom(v)
  } catch {
    return PRENOM_DEMO
  }
}

/**
 * LA SESSION DE LA DÉMONSTRATION. La démo s'ouvre connectée ; « Se déconnecter »
 * mène à la page de connexion, où n'importe quels identifiants la rouvrent.
 * Même stockage de session que le prénom : fermer l'onglet remet à zéro.
 */
const CLE_DECONNECTE_DEMO = 'crosswell.demo.deconnecte'

function lireConnecteDemo(): boolean {
  try {
    return window.sessionStorage.getItem(CLE_DECONNECTE_DEMO) !== '1'
  } catch {
    return true
  }
}

function ecrireConnecteDemo(connecte: boolean) {
  try {
    if (connecte) window.sessionStorage.removeItem(CLE_DECONNECTE_DEMO)
    else window.sessionStorage.setItem(CLE_DECONNECTE_DEMO, '1')
  } catch {
    /* stockage bloqué : l'état vaut pour la page ouverte seulement */
  }
}

/** Les messages de Supabase sont en anglais et parlent de « credentials ». */
function message(brut: string): string {
  const m = brut.toLowerCase()
  if (m.includes('invalid login')) return 'E-mail ou mot de passe incorrect.'
  if (m.includes('email not confirmed')) return "Votre adresse n'est pas encore confirmée. Vérifiez votre boîte de réception."
  if (m.includes('rate limit') || m.includes('too many')) return 'Trop de tentatives. Patientez une minute avant de réessayer.'
  if (m.includes('user not found')) return 'Aucun compte ne correspond à cette adresse.'
  if (m.includes('network') || m.includes('fetch')) return 'Connexion impossible. Vérifiez votre réseau.'
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'Un compte existe déjà pour cette adresse. Connectez-vous, ou demandez un nouveau mot de passe.'
  if (m.includes('signups not allowed') || m.includes('signup is disabled'))
    return 'Les inscriptions sont fermées pour le moment. Écrivez-nous pour ouvrir un accès.'
  if (m.includes('password') && (m.includes('weak') || m.includes('at least')))
    return 'Ce mot de passe est trop faible : allongez-le ou variez les caractères.'
  return "La connexion a échoué. Contactez-nous si le problème persiste."
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [chargement, setChargement] = useState(!DEMO)
  const [prenomDemo, setPrenomDemo] = useState<string | null>(() => (DEMO ? lirePrenomDemo() : null))
  const [connecteDemo, setConnecteDemo] = useState<boolean>(() => (DEMO ? lireConnecteDemo() : false))
  const basculerDemo = useCallback((connecte: boolean) => {
    ecrireConnecteDemo(connecte)
    setConnecteDemo(connecte)
  }, [])

  useEffect(() => {
    if (DEMO || !configure) {
      setChargement(false)
      return
    }
    let vivant = true
    supabase.auth.getSession().then(({ data }) => {
      if (!vivant) return
      setSession(data.session)
      setChargement(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => {
      vivant = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const connecter = useCallback(async (email: string, motDePasse: string) => {
    if (DEMO) return basculerDemo(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: motDePasse })
    if (error) throw new Error(message(error.message))
  }, [basculerDemo])

  const inscrire = useCallback(
    async (d: DonneesInscription) => {
      const prenom = nettoyerPrenom(d.prenom)
      if (DEMO) {
        try {
          window.sessionStorage.setItem(CLE_PRENOM_DEMO, prenom.ok ? prenom.valeur : d.prenom.trim())
        } catch {
          /* stockage bloqué : le prénom vaut pour la page ouverte seulement */
        }
        setPrenomDemo(prenom.ok ? prenom.valeur || null : null)
        basculerDemo(true)
        return { confirmationRequise: false }
      }
      const maintenant = new Date().toISOString()
      const { data, error } = await supabase.auth.signUp({
        email: d.email.trim(),
        password: d.motDePasse,
        options: {
          // Ce que le client déclare, horodaté : la preuve de ses engagements
          // (majorité, conditions). Métadonnées du CLIENT, qu'il peut réécrire :
          // elles ne décident d'aucun accès.
          data: {
            prenom: prenom.ok ? prenom.valeur || null : null,
            date_naissance: d.naissance,
            majorite_attestee_le: maintenant,
            conditions_acceptees_le: maintenant,
          },
          emailRedirectTo: `${window.location.origin}/inscription?etape=formule`,
        },
      })
      if (error) throw new Error(message(error.message))
      if (data.session) setSession(data.session)
      return { confirmationRequise: !data.session }
    },
    [basculerDemo],
  )

  const lienMagique = useCallback(async (email: string) => {
    if (DEMO) throw new Error('Indisponible en mode démonstration : connectez-vous avec le mot de passe de votre choix.')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      // Pas de création de compte à la volée : l'accès est vendu, pas ouvert.
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/` },
    })
    if (error) throw new Error(message(error.message))
  }, [])

  const reinitialiser = useCallback(async (email: string) => {
    if (DEMO) throw new Error('Indisponible en mode démonstration : connectez-vous avec le mot de passe de votre choix.')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/compte`,
    })
    if (error) throw new Error(message(error.message))
  }, [])

  const changerMotDePasse = useCallback(async (motDePasse: string) => {
    if (DEMO) throw new Error('Indisponible en mode démonstration.')
    const { error } = await supabase.auth.updateUser({ password: motDePasse })
    if (error) {
      const m = error.message.toLowerCase()
      if (m.includes('should be different'))
        throw new Error("Le nouveau mot de passe doit être différent de l'ancien.")
      if (m.includes('at least'))
        throw new Error('Le mot de passe est trop court pour être accepté.')
      throw new Error(message(error.message))
    }
  }, [])

  const changerPrenom = useCallback(async (saisie: string) => {
    const r = nettoyerPrenom(saisie)
    if (!r.ok) throw new Error(r.erreur)
    if (DEMO) {
      try {
        window.sessionStorage.setItem(CLE_PRENOM_DEMO, r.valeur)
      } catch {
        /* stockage bloqué : le prénom vaut pour la page ouverte seulement */
      }
      setPrenomDemo(r.valeur || null)
      return
    }
    // `null` plutôt qu'une chaîne vide : un prénom effacé n'est plus stocké.
    const { data, error } = await supabase.auth.updateUser({ data: { prenom: r.valeur || null } })
    if (error) throw new Error(message(error.message))
    // L'événement USER_UPDATED rafraîchit aussi la session ; on n'attend pas
    // son arrivée pour que l'accueil salue tout de suite le bon prénom.
    if (data.user) setSession((s) => (s ? { ...s, user: data.user } : s))
  }, [])

  const deconnecter = useCallback(async () => {
    if (DEMO) return basculerDemo(false)
    await supabase.auth.signOut()
    setSession(null)
  }, [basculerDemo])

  const valeur = useMemo<Auth>(
    () => ({
      session,
      email: DEMO ? 'demo@crosswell.fr' : (session?.user.email ?? null),
      prenom: DEMO ? prenomDemo : lirePrenom(session?.user.user_metadata?.prenom),
      changerPrenom,
      chargement,
      connecte: DEMO ? connecteDemo : Boolean(session),
      connecter,
      inscrire,
      lienMagique,
      reinitialiser,
      changerMotDePasse,
      deconnecter,
    }),
    [session, prenomDemo, connecteDemo, chargement, changerPrenom, connecter, inscrire, lienMagique, reinitialiser, changerMotDePasse, deconnecter],
  )

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>
}

export function useAuth(): Auth {
  const c = useContext(Contexte)
  if (!c) throw new Error('useAuth doit être utilisé dans <AuthProvider>')
  return c
}

/** Vrai si l'utilisateur a le droit de voir les pronostics. */
export function useConnecte(): boolean {
  return useAuth().connecte
}
