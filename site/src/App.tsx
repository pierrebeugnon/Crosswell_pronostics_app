import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { ROUTES } from '@/routes'

/**
 * Le routeur du NAVIGATEUR. Les routes elles-mêmes vivent dans `routes.tsx`,
 * partagées avec le rendu serveur (`entree-serveur.tsx`) : voir le commentaire
 * de ce fichier pour la raison.
 */
const routeur = createBrowserRouter(ROUTES, {
  future: {
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true,
  },
})

export default function App() {
  return <RouterProvider router={routeur} future={{ v7_startTransition: true }} />
}
