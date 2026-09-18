/**
 * LA COURSE D'EXEMPLE des maquettes (« Prix de Morlaix »), partagée par
 * l'accueil et « Comment ça marche ». FICTIVE de bout en bout : chevaux,
 * pourcentages et cotes sont inventés, et chaque affichage porte `<Fictif />`.
 *
 * Pas de « R1 » devant « C3 » : l'application n'affiche pas le numéro de
 * réunion (il n'est pas dans nos relevés), l'exemple non plus.
 */
export interface PartantExemple {
  rang: number
  numero: number
  nom: string
  victoire: number
  place: number
  cote: number
}

export const EXEMPLE = {
  course: 'C3',
  hippodrome: 'Compiègne',
  heure: '15:15',
  nom: 'Prix de Morlaix',
  arrivee: [7, 3, 11, 5, 9],
  partants: [
    { rang: 1, numero: 7, nom: 'Iron Valley', victoire: 0.34, place: 0.71, cote: 3.5 },
    { rang: 2, numero: 3, nom: 'Belle de Cordes', victoire: 0.19, place: 0.52, cote: 6 },
    { rang: 3, numero: 11, nom: 'Orage Doré', victoire: 0.12, place: 0.38, cote: 9 },
    { rang: 4, numero: 5, nom: 'Sirocco Blue', victoire: 0.09, place: 0.3, cote: 14 },
  ] satisfies PartantExemple[],
} as const

/** 3.5 → « 3,5 », comme la cote de l'application. */
export const cote = (v: number) => v.toFixed(1).replace('.', ',')
