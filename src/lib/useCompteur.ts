import { useEffect, useRef, useState } from 'react'

/** L'easing maison — celui de fade-up et des déploiements de barres. */
function sortieExpo(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/**
 * Compte de zéro vers la valeur cible, en ~600 ms.
 *
 * Réservé aux chiffres qui SONT la page — la conviction du soir, le taux de
 * victoire, le cœur d'une jauge. Un chiffre secondaire qui compterait aussi
 * transformerait l'écran en machine à sous : l'effet ne vaut que raréfié.
 *
 * Le compteur rejoue quand la CIBLE change (bascule aujourd'hui/demain,
 * changement de période) : c'est voulu, le chiffre se recompose pour dire que
 * la question posée a changé. Mouvement réduit : la valeur est rendue
 * directement, sans détour.
 */
export function useCompteur(cible: number, duree = 600): number {
  const reduit =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const [valeur, setValeur] = useState(reduit ? cible : 0)
  const brut = useRef(0)

  useEffect(() => {
    if (reduit) {
      setValeur(cible)
      return
    }
    const depart = performance.now()
    const origine = brut.current
    let id = 0
    const pas = (maintenant: number) => {
      const t = Math.min(1, (maintenant - depart) / duree)
      const v = origine + (cible - origine) * sortieExpo(t)
      brut.current = v
      setValeur(v)
      if (t < 1) id = requestAnimationFrame(pas)
    }
    id = requestAnimationFrame(pas)
    return () => cancelAnimationFrame(id)
  }, [cible, duree, reduit])

  return valeur
}
