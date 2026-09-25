import { useEffect } from 'react'
import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom'
import { EnTete } from '@/components/layout/EnTete'
import { PiedDePage } from '@/components/layout/PiedDePage'

/**
 * La coquille du site.
 *
 * `key={pathname}` : chaque navigation remonte le <main>, et le fondu maison
 * remplace la coupe sèche entre pages. `fondu-route` et non une animation de
 * transform : voir son commentaire dans index.css.
 */
export function Coquille() {
  const { pathname, hash } = useLocation()

  /*
   * Défilement vers un fragment à l'arrivée depuis une autre page (`/#produit`
   * depuis /methode). Le routeur remonte la page ; le navigateur, lui, ne
   * traite le fragment qu'au chargement initial. Une frame plus tard, la
   * section est montée et l'on peut y aller — le `scroll-mt-20` des sections
   * laisse la place de la barre collée.
   */
  useEffect(() => {
    if (!hash) return
    const id = requestAnimationFrame(() => {
      document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })
    })
    return () => cancelAnimationFrame(id)
  }, [pathname, hash])

  return (
    <div className="min-h-full flex flex-col">
      <EnTete />
      <main key={pathname} className="fondu-route flex-1 w-full">
        <Outlet />
      </main>
      <PiedDePage />
      <ScrollRestoration />
    </div>
  )
}
