import { useEffect, useState } from 'react'
import { instantParis, type InstantParis } from '@/lib/journee'

/**
 * L'heure de Paris, à la minute. La minuterie est calée sur le changement de
 * minute et recalculée au retour d'onglet : un téléphone sorti de la poche à
 * 15 h ne doit pas montrer une réunion « commence à 13 h » figée depuis midi.
 */
export function useHeureParis(): InstantParis {
  const [maintenant, setMaintenant] = useState<InstantParis>(() => instantParis())

  useEffect(() => {
    let minuterie: number
    const appliquer = () =>
      setMaintenant((avant) => {
        const n = instantParis()
        return n.jour === avant.jour && n.minutes === avant.minutes ? avant : n
      })
    const tic = () => {
      appliquer()
      minuterie = window.setTimeout(tic, 60000 - (Date.now() % 60000) + 50)
    }
    minuterie = window.setTimeout(tic, 60000 - (Date.now() % 60000) + 50)
    const auRetour = () => {
      if (document.visibilityState === 'visible') appliquer()
    }
    document.addEventListener('visibilitychange', auRetour)
    return () => {
      window.clearTimeout(minuterie)
      document.removeEventListener('visibilitychange', auRetour)
    }
  }, [])

  return maintenant
}
