import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom'
import { BandeauDemo } from '@/components/layout/BandeauDemo'
import { BarreBasse } from '@/components/layout/BarreBasse'
import { BarreHaute } from '@/components/layout/BarreHaute'
import { PiedDePage } from '@/components/layout/PiedDePage'
import { ToastArrivees } from '@/components/layout/ToastArrivees'

/**
 * La clé de remontage du <main>. D'une course à l'autre, et à l'ouverture de
 * la fiche d'un partant (un tiroir posé sur la course), la page Courses garde
 * son programme en place : la remonter à chaque clic ferait clignoter la
 * colonne de gauche et perdre sa position de défilement.
 */
function cleDePage(pathname: string): string {
  return pathname.startsWith('/courses') ? '/courses' : pathname
}

export function AppShell() {
  const { pathname } = useLocation()

  return (
    <div className="min-h-full flex flex-col">
      <BandeauDemo />
      <BarreHaute />
      {/*
        pb-28 sur mobile : la barre d'onglets est fixée en bas et masquerait
        la dernière carte d'une liste. Marges de la maquette : 20 px sur
        téléphone, 40 px sur grand écran.

        `key` : chaque navigation remonte le <main> (sauf d'une course à
        l'autre, voir `cleDePage`), et le fondu maison remplace la coupe sèche
        entre pages. `fondu-route` et non `animate-fade-up` : voir son
        commentaire dans index.css. Le coût (perte d'état interne des pages au
        changement d'URL) est nul ici : chaque page recharge de toute façon son
        contenu depuis l'URL.
      */}
      <main
        key={cleDePage(pathname)}
        className="fondu-route flex-1 mx-auto w-full max-w-content px-5 md:px-10 pt-6 md:pt-8 pb-28 md:pb-10"
      >
        <Outlet />
      </main>
      <PiedDePage />
      <BarreBasse />
      <ToastArrivees />
      <ScrollRestoration />
    </div>
  )
}
