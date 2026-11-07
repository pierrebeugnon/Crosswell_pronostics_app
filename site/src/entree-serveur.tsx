import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import { useRoutes } from 'react-router-dom'
import { ROUTES } from '@/routes'
import {
  CLE_DONNEES,
  FournisseurDonnees,
  serialiser,
  type DonneesInitiales,
} from '@/lib/donnees-initiales'

/**
 * LE RENDU CÔTÉ SERVEUR, à deux moments.
 *
 * Pourquoi il existe : sans lui, le HTML que sert ce site est une coquille vide —
 * un `<div id="root">` que React remplit dans le navigateur. Google exécute le
 * JavaScript, mais sur un domaine jeune ce rendu est différé et parfois sauté.
 * Pour des pages dont tout l'intérêt est d'être trouvées, c'était un plafond.
 *
 * LES RÉSULTATS sont rendus à la demande par la fonction `api/resultats` : ils
 * changent chaque jour. LES PAGES ÉDITORIALES sont rendues une fois, au build,
 * par `scripts/apres-build.mjs`, qui écrit leurs fichiers HTML statiques. La
 * réécriture de `vercel.json` ne porte que sur `/resultats/*` et le sitemap.
 *
 * Les routes viennent de `routes.tsx`, partagées avec le navigateur, pour
 * qu'une page ne puisse pas exister d'un côté et manquer de l'autre.
 *
 * CE MODULE EST LA SEULE PORTE de la fonction `api/resultats` : elle n'importe
 * rien de `src/` directement, et c'est voulu. Les sources lisent
 * `import.meta.env.VITE_…`, que Vite remplace à la construction et que Node ne
 * connaît pas ; passer par le bundle, c'est passer par du code où ces valeurs
 * sont déjà résolues. D'où les réexports ci-dessous : lecture, analyse
 * d'adresse et têtes de page sortent d'ici, pas de deux chemins parallèles.
 */

export {
  TOUTES_LES_JOURNEES,
  chargerAdressesCourses,
  chargerJournee,
  chargerJourneesDisponibles,
  chargerStatistiques,
} from '@/services/resultats'
export { analyser, courseDemandee, decrire, teteRubrique, teteStatistiques } from '@/lib/resultats-seo'
export { TETE_OUTIL_COTE } from '@/lib/cotes'
export type { Demande, Tete } from '@/lib/resultats-seo'
export type { DonneesInitiales } from '@/lib/donnees-initiales'
export type { CoursePublique, JourneePublique } from '@/lib/resultats'
export { CHEMIN_ARCHIVES, cheminCourse, cheminJournee, instantParis } from '@/lib/resultats'

function Application() {
  return useRoutes(ROUTES)
}

export interface Rendu {
  /** Le balisage du `<div id="root">`. */
  corps: string
  /** La balise `<script>` qui porte les données déjà lues. */
  donnees: string
}

/**
 * Rend une adresse en HTML, avec les données que l'appelant a déjà chargées.
 *
 * `renderToString` n'exécute aucun `useEffect` : sans `donnees`, les pages
 * rendraient leur état « Chargement… », c'est-à-dire exactement ce que le
 * robot ne doit pas lire. C'est pour cela que la fonction interroge la base
 * AVANT d'appeler ce rendu, au lieu de laisser les composants s'en charger.
 */
export function rendre(url: string, donnees: DonneesInitiales): Rendu {
  const corps = renderToString(
    <FournisseurDonnees donnees={donnees}>
      <StaticRouter location={url}>
        <Application />
      </StaticRouter>
    </FournisseurDonnees>,
  )

  return {
    corps,
    donnees: `<script>window.${CLE_DONNEES}=${serialiser(donnees)}</script>`,
  }
}
