import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, configure } from '@/lib/supabase'
import { DEMO } from '@/config/app'

interface Auth {
  session: Session | null
  email: string | null
  /** Tant qu'il est vrai, on ne sait pas encore si l'utilisateur est connecté. */
  chargement: boolean
  connecter: (email: string, motDePasse: string) => Promise<void>
  lienMagique: (email: string) => Promise<void>
  reinitialiser: (email: string) => Promise<void>
  changerMotDePasse: (motDePasse: string) => Promise<void>
  deconnecter: () => Promise<void>
}

const Contexte = createContext<Auth | null>(null)

/** Les messages de Supabase sont en anglais et parlent de « credentials ». */
function message(brut: string): string {
  const m = brut.toLowerCase()
  if (m.includes('invalid login')) return 'E-mail ou mot de passe incorrect.'
  if (m.includes('email not confirmed')) return "Votre adresse n'est pas encore confirmée. Vérifiez votre boîte de réception."
  if (m.includes('rate limit') || m.includes('too many')) return 'Trop de tentatives. Patientez une minute avant de réessayer.'
  if (m.includes('user not found')) return 'Aucun compte ne correspond à cette adresse.'
  if (m.includes('network') || m.includes('fetch')) return 'Connexion impossible. Vérifiez votre réseau.'
  return "La connexion a échoué. Contactez-nous si le problème persiste."
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [chargement, setChargement] = useState(!DEMO)

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
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: motDePasse })
    if (error) throw new Error(message(error.message))
  }, [])

  const lienMagique = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      // Pas de création de compte à la volée : l'accès est vendu, pas ouvert.
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/` },
    })
    if (error) throw new Error(message(error.message))
  }, [])

  const reinitialiser = useCallback(async (email: string) => {
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

  const deconnecter = useCallback(async () => {
    await supabase.auth.signOut()
    setSession(null)
  }, [])

  const valeur = useMemo<Auth>(
    () => ({
      session,
      email: DEMO ? 'demo@crosswell.fr' : (session?.user.email ?? null),
      chargement,
      connecter,
      lienMagique,
      reinitialiser,
      changerMotDePasse,
      deconnecter,
    }),
    [session, chargement, connecter, lienMagique, reinitialiser, changerMotDePasse, deconnecter],
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
  const { session } = useAuth()
  return DEMO || Boolean(session)
}
