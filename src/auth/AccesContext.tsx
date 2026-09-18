import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '@/auth/AuthContext'
import { ACCES_SANS_FILTRE, type Acces } from '@/lib/acces'
import { chargerAcces } from '@/services/acces'

interface EtatAcces {
  /** Null tant que l'accès n'est pas lu (ou sans session). */
  acces: Acces | null
  /** Tout est ouvert : Pass valide, accès offert, ou base sans filtre. */
  complet: boolean
  chargement: boolean
  /** Relit l'accès (retour de paiement, retour du portail Stripe). */
  recharger: () => Promise<Acces | null>
}

const Contexte = createContext<EtatAcces | null>(null)

/**
 * L'ACCÈS PAR FORMULE, lu une fois par session. C'est LA BASE qui masque les
 * pronostics réservés (`db/007`) ; ce contexte ne sert qu'à l'AFFICHER : bandeau
 * « Formule gratuite », cartes « Avec un Pass », page Compte.
 */
export function AccesProvider({ children }: { children: ReactNode }) {
  const { connecte, session } = useAuth()
  const [acces, setAcces] = useState<Acces | null>(null)
  const [chargement, setChargement] = useState(false)
  const utilisateur = session?.user.id ?? null

  const recharger = useCallback(async () => {
    if (!connecte) {
      setAcces(null)
      return null
    }
    setChargement(true)
    try {
      const a = await chargerAcces()
      setAcces(a)
      return a
    } catch {
      setAcces(ACCES_SANS_FILTRE)
      return ACCES_SANS_FILTRE
    } finally {
      setChargement(false)
    }
  }, [connecte])

  // Une lecture à la connexion, et à chaque changement de compte.
  useEffect(() => {
    void recharger()
  }, [recharger, utilisateur])

  const valeur = useMemo<EtatAcces>(
    () => ({ acces, complet: acces?.complet ?? true, chargement, recharger }),
    [acces, chargement, recharger],
  )
  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>
}

export function useAcces(): EtatAcces {
  const c = useContext(Contexte)
  if (!c) throw new Error('useAcces doit être utilisé dans <AccesProvider>')
  return c
}
