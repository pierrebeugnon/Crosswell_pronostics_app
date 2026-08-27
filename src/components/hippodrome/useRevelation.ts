import { useEffect, useRef, useState } from 'react'

/**
 * Révèle un élément quand il entre dans la fenêtre, une seule fois.
 *
 * `IntersectionObserver` plutôt qu'un écouteur de défilement : l'écouteur se
 * déclenche à chaque pixel parcouru et impose de mesurer l'élément à la main,
 * ce qui provoque un recalcul de mise en page à chaque image. L'observateur ne
 * réveille le fil principal qu'au franchissement du seuil.
 *
 * L'observation est COUPÉE dès la révélation. Sans cela, une page de six
 * sections garde six observateurs actifs pendant toute la visite, pour un effet
 * qui ne se joue qu'une fois.
 *
 * Si l'utilisateur a demandé moins d'animations, on révèle immédiatement : le
 * contenu ne doit jamais dépendre d'un effet qu'on vient de désactiver.
 */
export function useRevelation<T extends HTMLElement>(marge = '0px 0px -12% 0px') {
  const ref = useRef<T | null>(null)
  const [visible, setVisible] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const cible = ref.current
    if (!cible || visible) return

    // Navigateur sans IntersectionObserver : on affiche, plutôt que de laisser
    // la page vide pour l'éternité.
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }

    const observateur = new IntersectionObserver(
      (entrees) => {
        if (entrees.some((e) => e.isIntersecting)) {
          setVisible(true)
          observateur.disconnect()
        }
      },
      { rootMargin: marge, threshold: 0.08 },
    )
    observateur.observe(cible)

    /*
     * FILET DE SÉCURITÉ. Un document caché ne fait pas tourner la boucle
     * d'intersection : ouvert dans un onglet d'arrière-plan, préchargé, ou
     * rendu par un moteur qui n'a rien à composer, l'observateur ne tire
     * jamais et la section reste à opacité zéro. Du contenu qu'on facture ne
     * peut pas dépendre du bon vouloir d'une animation.
     *
     * Deux secondes ne coûtent rien à l'effet : une section révélée hors écran
     * ne se voit pas, et celle qu'on regarde a déjà été révélée par
     * l'observateur bien avant l'échéance.
     */
    const filet = window.setTimeout(() => setVisible(true), 2000)

    return () => {
      observateur.disconnect()
      window.clearTimeout(filet)
    }
  }, [marge, visible])

  return { ref, visible }
}
