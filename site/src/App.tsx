import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Coquille } from '@/components/layout/Coquille'
import Accueil from '@/pages/Accueil'
import Methode from '@/pages/Methode'
import MentionsLegales from '@/pages/MentionsLegales'
import Confidentialite from '@/pages/Confidentialite'
import ConditionsVente from '@/pages/ConditionsVente'
import Blog from '@/pages/Blog'
import Article from '@/pages/Article'
import Resultats from '@/pages/Resultats'
import ResultatCourse from '@/pages/ResultatCourse'
import NonTrouve from '@/pages/NonTrouve'

const routeur = createBrowserRouter(
  [
    {
      path: '/',
      element: <Coquille />,
      children: [
        { index: true, element: <Accueil /> },
        { path: 'methode', element: <Methode /> },
        { path: 'blog', element: <Blog /> },
        { path: 'blog/:slug', element: <Article /> },
        // LES RÉSULTATS SONT DÉCLARÉS ICI MAIS ABSENTS DE `PAGES` dans
        // `scripts/apres-build.mjs`, DÉLIBÉRÉMENT : sans fichier HTML, elles
        // répondent 404 en production. Le lot 1 monte les écrans sur un jeu
        // d'exemple ; on ne les ouvre qu'une fois la source réelle branchée et
        // le rendu serveur en place, sinon le site publie des pages fictives
        // sur des adresses indexables.
        { path: 'resultats', element: <Resultats /> },
        { path: 'resultats/:jour', element: <Resultats /> },
        { path: 'resultats/:jour/:lieu/:course', element: <ResultatCourse /> },
        { path: 'mentions-legales', element: <MentionsLegales /> },
        { path: 'confidentialite', element: <Confidentialite /> },
        // L'app renvoie vers `/cgu` depuis la case de l'inscription ; le
        // document s'appelle CGV. Les deux adresses servent la même page
        // plutôt que d'en laisser une tomber en 404.
        { path: 'cgv', element: <ConditionsVente /> },
        { path: 'cgu', element: <ConditionsVente /> },
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
