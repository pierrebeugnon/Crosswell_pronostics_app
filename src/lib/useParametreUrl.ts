import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { lireParmi } from '@/lib/periodes'

/**
 * UN FILTRE QUI VIT DANS L'URL — lu, validé, écrit sans effet de bord.
 *
 * Un filtre dans l'URL se partage, survit à un rechargement et se retrouve au
 * retour d'une course. Trois règles, identiques pour tous les écrans :
 *
 * - la valeur lue est VALIDÉE (`lireParmi`) : un lien ancien retombe sur le
 *   défaut ;
 * - la valeur par défaut est RETIRÉE de l'URL : `/resultats` reste propre, et
 *   un lien sans paramètre montre l'écran tel qu'on l'ouvre ;
 * - l'écriture REMPLACE l'entrée d'historique et NE RÉINITIALISE PAS le
 *   défilement. Sans `preventScrollReset`, `<ScrollRestoration />` voit une
 *   nouvelle entrée sans position mémorisée et renvoie en haut de page : le
 *   client qui filtrait un graphique à trois écrans de défilement le perdait de
 *   vue à chaque clic.
 */
export function useParametreUrl<T extends string>(
  nom: string,
  permises: readonly T[],
  defaut: T,
): [T, (valeur: T) => void] {
  const [parametres, setParametres] = useSearchParams()
  const valeur = lireParmi(parametres.get(nom), permises, defaut)

  const ecrire = useCallback(
    (suivante: T) => {
      setParametres(
        (actuels) => {
          const prochains = new URLSearchParams(actuels)
          if (suivante === defaut) prochains.delete(nom)
          else prochains.set(nom, suivante)
          return prochains
        },
        { replace: true, preventScrollReset: true },
      )
    },
    [nom, defaut, setParametres],
  )

  return [valeur, ecrire]
}

/**
 * Retire plusieurs paramètres d'un coup (« Réinitialiser »), avec les mêmes
 * règles d'écriture.
 */
export function useEffacerParametres(): (noms: readonly string[]) => void {
  const [, setParametres] = useSearchParams()
  return useCallback(
    (noms) => {
      setParametres(
        (actuels) => {
          const prochains = new URLSearchParams(actuels)
          for (const nom of noms) prochains.delete(nom)
          return prochains
        },
        { replace: true, preventScrollReset: true },
      )
    },
    [setParametres],
  )
}
