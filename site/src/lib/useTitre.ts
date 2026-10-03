import { useEffect } from 'react'

const SUFFIXE = 'Crosswell Pronostics'

/**
 * Le titre de l'accueil, calibré sous 60 signes pour ne pas être tronqué dans
 * les résultats de recherche. Il est RECOPIÉ de `TITRE_ACCUEIL` dans
 * `scripts/apres-build.mjs`, qui l'écrit dans le HTML servi : le titre vu par
 * le robot et celui posé ici doivent dire la même chose.
 */
const TITRE_ACCUEIL = 'Crosswell — Pronostics hippiques de toutes les courses'

/**
 * Titre d'onglet par page. `null` pour la page d'accueil, qui porte le titre
 * complet.
 *
 * `suffixe: false` POUR LES ARTICLES DU BLOG : leur `seo.titre` est déjà écrit
 * pour un moteur de recherche, marque comprise, et calibré sous 60 signes.
 * Lui ajouter « — Crosswell Pronostics » le porterait à près de 80, donc
 * tronqué dans les résultats, et répéterait la marque. Surtout,
 * `scripts/apres-build.mjs` écrit le `<title>` du HTML servi à partir du même
 * `seo.titre`, sans suffixe : le titre vu par le robot et celui que pose ce
 * crochet doivent dire LA MÊME CHOSE.
 */
export function useTitre(titre: string | null, { suffixe = true }: { suffixe?: boolean } = {}) {
  useEffect(() => {
    if (!titre) {
      document.title = TITRE_ACCUEIL
      return
    }
    document.title = suffixe ? `${titre} — ${SUFFIXE}` : titre
  }, [titre, suffixe])
}
