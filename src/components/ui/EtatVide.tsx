import type { ReactNode } from 'react'
import Monogramme from '@/components/brand/Monogramme'

/**
 * Un vide qui porte la marque. La fleur Crosswell en filigrane derrière le
 * message : l'absence de contenu n'est plus un gabarit d'empty state générique
 * mais un écran qui reste le nôtre. Le filigrane est purement décoratif
 * (aria-hidden) et assez discret pour ne jamais gêner la lecture du titre.
 */
export function EtatVide({
  titre,
  texte,
  action,
  icone,
}: {
  titre: string
  texte?: string
  action?: ReactNode
  icone?: ReactNode
}) {
  return (
    <div className="relative overflow-hidden text-center py-16 px-6">
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.045]"
      >
        <Monogramme size={220} color="rgb(var(--c-ink))" />
      </span>

      <div className="relative">
        {icone && (
          <div className="mx-auto mb-5 w-12 h-12 rounded-2xl glass-nest grid place-items-center text-faint">
            {icone}
          </div>
        )}
        <p className="font-medium">{titre}</p>
        {texte && (
          <p className="text-sm text-muted mt-2 max-w-sm mx-auto leading-relaxed">{texte}</p>
        )}
        {action && <div className="mt-6">{action}</div>}
      </div>
    </div>
  )
}

export function Erreur({ message, onReessayer }: { message: string; onReessayer?: () => void }) {
  return (
    <div className="card p-8 text-center !border-loss/25">
      <p className="font-medium text-loss">Impossible d'afficher les pronostics</p>
      <p className="text-sm text-muted mt-2.5 max-w-md mx-auto leading-relaxed">{message}</p>
      {onReessayer && (
        <button className="btn-glass mt-6" onClick={onReessayer}>
          Réessayer
        </button>
      )}
    </div>
  )
}
