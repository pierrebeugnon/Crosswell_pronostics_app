import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom'
import { BandeauDemo } from '@/components/layout/BandeauDemo'
import { BarreBasse } from '@/components/layout/BarreBasse'
import { BarreHaute } from '@/components/layout/BarreHaute'
import { PiedDePage } from '@/components/layout/PiedDePage'
import { ToastArrivees } from '@/components/layout/ToastArrivees'

export function AppShell() {
  const { pathname } = useLocation()

  return (
    <div className="min-h-full flex flex-col">
      <BandeauDemo />
      <BarreHaute />
      {/*
        pb-32 sur mobile : la pastille de navigation flotte par-dessus le
        contenu et masquerait la dernière carte d'une liste.

        `key={pathname}` : chaque navigation remonte le <main>, et le fondu
        maison remplace la coupe sèche entre pages. `fondu-route` et non
        `animate-fade-up` : voir son commentaire dans index.css — une animation
        de transform à fill permanent sur cet ancêtre corrompait les
        backdrop-filter de toutes les cartes. Le coût (perte d'état interne des
        pages au changement d'URL) est nul ici : chaque page recharge de toute
        façon son contenu depuis l'URL.
      */}
      <main
        key={pathname}
        className="fondu-route flex-1 mx-auto w-full max-w-content px-4 sm:px-6 py-6 sm:py-10 pb-32 md:pb-10"
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
