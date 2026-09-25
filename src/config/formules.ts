/**
 * LES FORMULES — celles des maquettes, retenues par le fondateur le 18/09/2026.
 * Elles DOIVENT rester égales à `FORMULES` de `site/src/config/site.ts` : la
 * vitrine affiche ce que l'inscription vend.
 *
 * Le paiement passera par Stripe (décision du 18/09/2026), sur ses pages
 * hébergées : l'app ne voit jamais une donnée de carte. Voir
 * `services/paiement.ts`.
 */
export type CleFormule = 'gratuit' | 'jour' | 'mois' | 'an'

export interface Formule {
  cle: CleFormule
  nom: string
  /** Prix affiché, TTC. */
  prix: string
  prixCentimes: number
  periode: string
  /** La ligne de la liste de l'inscription. */
  description: string
  vedette?: boolean
}

export const FORMULES: readonly Formule[] = [
  { cle: 'gratuit', nom: 'Gratuit', prix: '0 €', prixCentimes: 0, periode: 'pour toujours', description: '1 course offerte chaque jour' },
  { cle: 'jour', nom: 'Pass 1 jour', prix: '4,99 €', prixCentimes: 499, periode: '/ 24 h', description: '24 h d’accès complet · sans abonnement' },
  {
    cle: 'mois',
    nom: 'Pass mensuel',
    prix: '12,99 €',
    prixCentimes: 1299,
    periode: '/ mois',
    description: 'Tout débloqué · sans engagement',
    vedette: true,
  },
  { cle: 'an', nom: 'Pass annuel', prix: '99 €', prixCentimes: 9900, periode: '/ an', description: 'Soit 8,25 € / mois · 36 % moins cher' },
]

export const formule = (cle: CleFormule): Formule => FORMULES.find((f) => f.cle === cle)!

export const estFormule = (v: string | null): v is CleFormule => FORMULES.some((f) => f.cle === v)

/** Le moins cher des Pass, pour « dès 4,99 € ». */
export const PASS_MOINS_CHER = FORMULES.filter((f) => f.prixCentimes > 0).sort((a, b) => a.prixCentimes - b.prixCentimes)[0]
