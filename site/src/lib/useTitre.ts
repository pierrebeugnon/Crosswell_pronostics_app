import { useEffect } from 'react'

const SUFFIXE = 'Crosswell Pronostics'

/** Titre d'onglet par page. `null` pour la page d'accueil, qui porte le titre complet. */
export function useTitre(titre: string | null) {
  useEffect(() => {
    document.title = titre
      ? `${titre} — ${SUFFIXE}`
      : `${SUFFIXE} — Chaque course, l’arrivée la plus probable`
  }, [titre])
}
