/**
 * L'étiquette qui accompagne TOUT exemple de pronostic sur le site.
 *
 * Le site vitrine ne lit pas la base : les exemples qu'il montre sont composés
 * avec des chevaux, des courses et des chiffres INVENTÉS. L'application refuse
 * qu'un chiffre inventé passe pour un chiffre mesuré ; le site tient la même
 * ligne, avec la phrase des maquettes.
 */
export function Fictif({ className = '' }: { className?: string }) {
  return <p className={`text-xs font-medium text-faint ${className}`}>Chevaux et chiffres fictifs, pour illustration.</p>
}
