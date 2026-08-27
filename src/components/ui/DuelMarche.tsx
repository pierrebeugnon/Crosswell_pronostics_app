import { pourcent } from '@/lib/format'
import { useDeploiement } from '@/lib/useDeploiement'

/**
 * LE duel nous / marché — la comparaison qui justifie l'abonnement, et qui
 * était rendue par des grammaires différentes selon la page (barres jumelles
 * d'un côté, barres étiquetées de l'autre, teintes divergentes). Un seul
 * composant désormais : le lecteur apprend la forme une fois et la reconnaît
 * partout — verte, notre estimation ; grise, celle du public.
 *
 * Les deux barres partagent UNE échelle, celle du plus grand des deux chiffres
 * (avec une marge) : chacune à sa propre échelle, elles seraient toujours
 * pleines et la comparaison — seul objet du composant — disparaîtrait. Et
 * elles SE DÉPLOIENT à l'apparition, comme toutes les barres du site.
 */
export function DuelMarche({
  pNous,
  pMarche,
  decimales = 0,
}: {
  pNous: number | null
  pMarche: number | null
  /** 1 pour la fiche partant, où le dixième de point compte. */
  decimales?: number
}) {
  const pret = useDeploiement()
  const echelle = Math.max(pNous ?? 0, pMarche ?? 0, 0.01) * 1.12
  const largeur = (v: number | null) =>
    !pret || v == null ? 0 : Math.min(100, Math.max(3, (v / echelle) * 100))

  const lignes = [
    { libelle: 'Nous', valeur: pNous, accent: true },
    { libelle: 'Marché', valeur: pMarche, accent: false },
  ]

  return (
    <dl className="space-y-2.5">
      {lignes.map(({ libelle, valeur, accent }) => (
        <div key={libelle} className="flex items-center gap-3">
          <dt
            className={`label !text-[0.625rem] w-14 shrink-0 ${accent ? '!text-accent' : ''}`}
          >
            {libelle}
          </dt>
          <dd className="flex-1 flex items-center gap-2.5 min-w-0">
            <span className="h-2 flex-1 rounded-full bg-white/[0.08] overflow-hidden">
              <span
                className="block h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(.22,1,.36,1)]"
                style={{
                  width: `${largeur(valeur)}%`,
                  background: accent
                    ? 'linear-gradient(90deg, rgb(var(--c-accent-lo)), rgb(var(--c-accent-hi)))'
                    : 'rgb(255 255 255 / 0.3)',
                }}
              />
            </span>
            <span
              className={`num text-sm font-semibold w-12 text-right shrink-0 ${
                accent ? 'text-accent' : 'text-muted'
              }`}
            >
              {pourcent(valeur, decimales)}
            </span>
          </dd>
        </div>
      ))}
    </dl>
  )
}
