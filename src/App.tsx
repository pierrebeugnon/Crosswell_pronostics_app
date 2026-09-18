import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthContext'
import { AccesProvider } from '@/auth/AccesContext'
import { ProtectedRoute } from '@/auth/ProtectedRoute'
import { DonneesProvider } from '@/data/DonneesContext'
import { AppShell } from '@/components/layout/AppShell'

import Connexion from '@/pages/Connexion'
import Inscription from '@/pages/Inscription'
import Aujourdhui from '@/pages/Aujourdhui'
import Reunions from '@/pages/Reunions'
import Reunion from '@/pages/Reunion'
import Courses from '@/pages/Courses'
import Professionnel from '@/pages/Professionnel'
import Resultats from '@/pages/Resultats'
import Methode from '@/pages/Methode'
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
    { path: '/inscription', element: <Inscription /> },
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
        { path: 'courses', element: <Courses /> },
        { path: 'courses/:date/:hippodrome/:numero', element: <Courses /> },
        { path: 'courses/:date/:hippodrome/:numero/partants/:cheval', element: <Courses /> },
        { path: 'jockeys/:nom', element: <Professionnel key="jockey" role="jockey" /> },
        { path: 'entraineurs/:nom', element: <Professionnel key="entraineur" role="entraineur" /> },
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
      <AccesProvider>
        <RouterProvider router={routeur} future={{ v7_startTransition: true }} />
      </AccesProvider>
    </AuthProvider>
  )
}
