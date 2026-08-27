import { AlertTriangle } from 'lucide-react'
import { DEMO } from '@/config/app'

/**
 * Volontairement voyant, et non refermable. Une démonstration prise pour la
 * réalité serait la panne la plus coûteuse de ce produit : quelqu'un fonderait
 * une décision sur des chiffres inventés. C'est le seul endroit de
 * l'application où la couleur est opaque plutôt que translucide — il ne doit
 * pas se fondre.
 */
export function BandeauDemo() {
  if (!DEMO) return null
  return (
    <div className="bg-loss text-canvas" role="alert">
      <div className="mx-auto max-w-content px-4 sm:px-6 py-2 flex items-center gap-2 text-xs font-semibold">
        <AlertTriangle size={14} className="shrink-0" />
        <span>
          Mode démonstration — toutes les courses, cotes et statistiques affichées sont fictives.
          N'en tirez aucune conclusion.
        </span>
      </div>
    </div>
  )
}
