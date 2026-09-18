import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Coquille } from '@/components/layout/Coquille'
import Accueil from '@/pages/Accueil'
import Methode from '@/pages/Methode'
import MentionsLegales from '@/pages/MentionsLegales'
import Confidentialite from '@/pages/Confidentialite'
import NonTrouve from '@/pages/NonTrouve'

const routeur = createBrowserRouter(
  [
    {
      path: '/',
      element: <Coquille />,
      children: [
        { index: true, element: <Accueil /> },
        { path: 'methode', element: <Methode /> },
        { path: 'mentions-legales', element: <MentionsLegales /> },
        { path: 'confidentialite', element: <Confidentialite /> },
        { path: '*', element: <NonTrouve /> },
      ],
    },
  ],
  {
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
  return <RouterProvider router={routeur} future={{ v7_startTransition: true }} />
}
