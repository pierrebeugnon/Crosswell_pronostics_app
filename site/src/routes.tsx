import type { RouteObject } from 'react-router-dom'
import { Coquille } from '@/components/layout/Coquille'
import Accueil from '@/pages/Accueil'
import Methode from '@/pages/Methode'
import MentionsLegales from '@/pages/MentionsLegales'
import Confidentialite from '@/pages/Confidentialite'
import ConditionsVente from '@/pages/ConditionsVente'
import Blog from '@/pages/Blog'
import Article from '@/pages/Article'
import Resultats from '@/pages/Resultats'
import ArchivesResultats from '@/pages/ArchivesResultats'
import Statistiques from '@/pages/Statistiques'
import ResultatCourse from '@/pages/ResultatCourse'
import NonTrouve from '@/pages/NonTrouve'

/**
 * LES ROUTES, ÉCRITES UNE FOIS POUR DEUX RENDUS.
 *
 * Le navigateur les monte dans un `createBrowserRouter` (`App.tsx`), le serveur
 * dans un `StaticRouter` (`entree-serveur.tsx`). Elles vivent ici pour que les
 * deux ne puissent pas diverger : une route ajoutée d'un seul côté donnerait
 * une page qui marche en local et renvoie autre chose en production — le genre
 * d'écart qu'on ne voit qu'une fois déployé.
 */
export const ROUTES: RouteObject[] = [
  {
    path: '/',
    element: <Coquille />,
    children: [
      { index: true, element: <Accueil /> },
      { path: 'methode', element: <Methode /> },
      { path: 'blog', element: <Blog /> },
      { path: 'blog/:slug', element: <Article /> },
      // Ces quatre routes sont ABSENTES de la table `PAGES` de
      // `scripts/apres-build.mjs` : elles n'ont pas de fichier HTML statique.
      // En production, c'est la fonction `api/resultats` qui les rend, par la
      // réécriture posée dans `vercel.json`.
      { path: 'resultats', element: <Resultats /> },
      { path: 'resultats/archives', element: <ArchivesResultats /> },
      { path: 'resultats/:jour', element: <Resultats /> },
      { path: 'resultats/:jour/:lieu/:course', element: <ResultatCourse /> },
      // Rendue par la même fonction, à partir des mêmes vues publiques.
      { path: 'statistiques', element: <Statistiques /> },
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
]
