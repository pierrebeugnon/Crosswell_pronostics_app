import { useEffect, useState } from 'react'

/**
 * Arme les transitions d'entrée : renvoie `false` le temps du premier rendu,
 * puis `true` une frame plus tard.
 *
 * POURQUOI CE DÉTOUR. Les barres de probabilité et les jauges portent depuis
 * le début une transition CSS (largeur, arc) — qui ne se jouait JAMAIS : les
 * composants étaient rendus directement à leur valeur finale, et une
 * transition sans changement d'état est invisible. Ce hook fournit l'état
 * initial qui manquait : le composant se peint d'abord à zéro, puis passe à
 * sa valeur, et la transition déjà écrite fait le reste.
 *
 * DOUBLE requestAnimationFrame, et ce n'est pas un tic : un seul rAF peut se
 * déclencher avant que le navigateur ait peint l'état « zéro », et la
 * transition saute alors comme avant. Le second garantit une frame peinte
 * entre les deux états.
 *
 * Mouvement réduit : on renvoie `true` immédiatement — la valeur s'affiche
 * sans détour, et le kill global de index.css neutralise de toute façon la
 * durée de transition.
 */
export function useDeploiement(): boolean {
  const [pret, setPret] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    if (pret) return
    let id2 = 0
    const id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => setPret(true))
    })
    return () => {
      cancelAnimationFrame(id1)
      cancelAnimationFrame(id2)
    }
    // volontairement au montage seul : les changements de valeur ultérieurs
    // (resynchronisation) transitionnent d'eux-mêmes, d'une valeur à l'autre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return pret
}
