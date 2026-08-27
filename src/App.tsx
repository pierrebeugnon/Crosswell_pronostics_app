import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthContext'
import { ProtectedRoute } from '@/auth/ProtectedRoute'
import { DonneesProvider } from '@/data/DonneesContext'
import { AppShell } from '@/components/layout/AppShell'

import Connexion from '@/pages/Connexion'
import Aujourdhui from '@/pages/Aujourdhui'
import Reunions from '@/pages/Reunions'
import Reunion from '@/pages/Reunion'
import Course from '@/pages/Course'
import Partant from '@/pages/Partant'
import Resultats from '@/pages/Resultats'
import Methode from '@/pages/Methode'
import Hippodromes from '@/pages/Hippodromes'
import Hippodrome from '@/pages/Hippodrome'
import Compte from '@/pages/Compte'
import NonTrouve from '@/pages/NonTrouve'

/**
 * `DonneesProvider` est monté SOUS la porte d'authentification : il déclenche
 * une requête dès son montage, et un visiteur non connecté n'a pas à provoquer
 * un appel que la base refusera de toute façon.
 */
const routeur = createBrowserRouter(
  [
    { path: '/connexion', element: <Connexion /> },
    {
      path: '/',
      element: (
        <ProtectedRoute>
          <DonneesProvider>
            <AppShell />
          </DonneesProvider>
        </ProtectedRoute>
      ),
      children: [
        { index: true, element: <Aujourdhui /> },
        { path: 'reunions', element: <Reunions /> },
        { path: 'reunions/:date/:hippodrome', element: <Reunion /> },
        { path: 'courses/:date/:hippodrome/:numero', element: <Course /> },
        { path: 'courses/:date/:hippodrome/:numero/partants/:cheval', element: <Partant /> },
        { path: 'hippodromes', element: <Hippodromes /> },
        { path: 'hippodromes/:nom', element: <Hippodrome /> },
        { path: 'resultats', element: <Resultats /> },
        { path: 'methode', element: <Methode /> },
        { path: 'compte', element: <Compte /> },
        { path: '*', element: <NonTrouve /> },
      ],
    },
  ],
  {
    /* Comportements de la v7 activés dès maintenant : ils ne changent rien au
       rendu et évitent que la console d'un client soit polluée d'avertissements
       de migration à chaque chargement. */
    future: {
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true,
    },
  },
)

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={routeur} future={{ v7_startTransition: true }} />
    </AuthProvider>
  )
}
