import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth, useConnecte } from '@/auth/AuthContext'
import { Chargement } from '@/components/ui/Chargement'

/**
 * Porte d'entrée. Tant que la session n'est pas résolue on n'affiche NI la page
 * NI la redirection : rediriger trop tôt renverrait vers l'écran de connexion
 * un client déjà connecté, à chaque rechargement de page.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { chargement } = useAuth()
  const connecte = useConnecte()
  const emplacement = useLocation()

  if (chargement) return <Chargement plein />
  if (!connecte) return <Navigate to="/connexion" replace state={{ retour: emplacement.pathname }} />
  return <>{children}</>
}
