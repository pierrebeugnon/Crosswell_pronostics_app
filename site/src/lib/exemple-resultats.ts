import type { CoursePublique, JourneePublique, PartantPublic } from '@/lib/resultats'

/**
 * LA JOURNÉE D'EXEMPLE des pages de résultats — chevaux et chiffres INVENTÉS.
 *
 * Elle existe pour monter les écrans avant que la source soit branchée. Toute
 * page qui l'affiche porte `<Fictif />`.
 *
 * Elle exerce LES CAS DIFFICILES, pas le cas heureux : favori gagnant et favori
 * battu, arrivée définitive et arrivée provisoire, départ donné sans statut,
 * course jamais relevée, courses à venir, non-partant, cote absente, catégorie
 * absente, course sans nom, poids manquant — le poids n'est renseigné que sur
 * 43 % des lignes réelles, l'affichage doit tenir sans lui.
 *
 * `MAINTENANT_EXEMPLE` est FIGÉ : les composants reçoivent l'instant en
 * paramètre et ne lisent jamais l'horloge, pour qu'un rendu serveur et un rendu
 * navigateur concluent la même chose.
 */

export const JOUR_EXEMPLE = '2026-10-16'
export const MAINTENANT_EXEMPLE = { jour: JOUR_EXEMPLE, minutes: 15 * 60 + 40 }

function partant(
  numero: number,
  nom: string,
  age: number | null,
  sexe: string | null,
  poids: number | null,
  rang: number | null,
  pWin: number | null,
  arrivee: number | null,
  cote: number | null,
  nonPartant = false,
): PartantPublic {
  return { numero, nom, age, sexe, poids, rang, pWin, arrivee, cote, nonPartant }
}

const COURSES: CoursePublique[] = [
  {
    cle: `${JOUR_EXEMPLE}|DEAUVILLE|1`,
    date: JOUR_EXEMPLE,
    hippodrome: 'DEAUVILLE',
    reunion: 1,
    numero: 1,
    nom: 'Prix de Morlaix',
    categorie: 'Handicap',
    discipline: 'Plat',
    distance: 2400,
    allocation: 26000,
    terrain: 'Bon souple',
    statut: 'ARRIVEE_DEFINITIVE_COMPLETE',
    partants: 12,
    nonPartants: 1,
    heureDepart: '13:20',
    courue: true,
    liste: [
      partant(7, 'Iron Valley', 4, 'Femelle', 58.5, 1, 0.34, 1, 3.5),
      partant(3, 'Belle de Cordes', 5, 'Hongre', 59, 2, 0.19, 4, 6.0),
      partant(11, 'Orage Doré', 5, 'Mâle', 59.5, 3, 0.12, 2, 9.0),
      partant(5, 'Sirocco Blue', 6, 'Hongre', 55.5, 4, 0.09, 3, 14.0),
      // Poids manquant : la colonne reste, la case se dit vide.
      partant(9, 'Vent du Nord', 3, 'Mâle', null, 5, 0.07, 5, 18.0),
      partant(2, 'Câline du Pré', 4, 'Femelle', 56.5, 6, 0.06, 8, 22.0),
      partant(4, 'Nuit Blanche', 5, 'Hongre', 57.5, null, null, null, null, true),
    ],
  },
  {
    cle: `${JOUR_EXEMPLE}|DEAUVILLE|2`,
    date: JOUR_EXEMPLE,
    hippodrome: 'DEAUVILLE',
    reunion: 1,
    numero: 2,
    // Notre favori échoue : montré aussi nettement qu'une réussite.
    nom: 'Prix des Hautes Terres',
    categorie: 'Conditions',
    discipline: 'Plat',
    distance: 1600,
    allocation: 24000,
    terrain: 'Bon souple',
    statut: 'ARRIVEE_DEFINITIVE_COMPLETE',
    partants: 9,
    nonPartants: 0,
    heureDepart: '13:55',
    courue: true,
    liste: [
      partant(6, 'Astre de Mai', 5, 'Mâle', 58, 1, 0.28, 6, 4.2),
      partant(1, 'Lumière Franche', 4, 'Femelle', 56, 2, 0.21, 1, 5.5),
      partant(8, 'Pas de Côté', 6, 'Hongre', 57.5, 3, 0.14, 2, 8.5),
      partant(3, 'Gué du Moulin', 3, 'Mâle', 54.5, 4, 0.11, 3, 11.0),
      partant(5, 'Reine Sienne', 4, 'Femelle', 55, 5, 0.09, 4, 16.0),
    ],
  },
  {
    cle: `${JOUR_EXEMPLE}|DEAUVILLE|3`,
    date: JOUR_EXEMPLE,
    hippodrome: 'DEAUVILLE',
    reunion: 1,
    numero: 3,
    // Arrivée PROVISOIRE : `FIN_COURSE`, la course est courue mais l'arrivée
    // n'est pas encore définitive. 108 courses sur 389 en trente jours.
    nom: 'Prix du Bocage',
    categorie: 'Groupe III',
    discipline: 'Plat',
    distance: 1800,
    allocation: 139000,
    terrain: 'Bon souple',
    statut: 'FIN_COURSE',
    partants: 10,
    nonPartants: 0,
    heureDepart: '14:30',
    courue: true,
    liste: [
      partant(4, 'Tambour Battant', 5, 'Hongre', 58, 1, 0.26, 2, 5.0),
      partant(9, 'Haut Perchoir', 4, 'Mâle', 57, 2, 0.19, 1, 7.5),
      partant(2, 'Val d’Argent', 6, 'Hongre', 56, 3, 0.15, 4, 12.0),
    ],
  },
  {
    cle: `${JOUR_EXEMPLE}|SAINT-CLOUD|4`,
    date: JOUR_EXEMPLE,
    hippodrome: 'SAINT-CLOUD',
    reunion: 2,
    numero: 4,
    // Catégorie absente : une ligne sur trois en réalité.
    nom: null,
    categorie: null,
    discipline: 'Haies',
    distance: 3600,
    allocation: 22000,
    terrain: 'Souple',
    statut: null,
    partants: 14,
    // Non-partants pas encore vérifiés : `null`, surtout pas « 0 ».
    nonPartants: null,
    heureDepart: '15:10',
    courue: false,
    liste: [
      partant(2, 'Pierre de Lune', 6, 'Hongre', null, 1, 0.31, null, null),
      partant(10, 'Souffle Court', 5, 'Mâle', null, 2, 0.18, null, null),
      partant(4, 'Bois Joli', 7, 'Hongre', null, 3, 0.13, null, null),
    ],
  },
  {
    cle: `${JOUR_EXEMPLE}|SAINT-CLOUD|5`,
    date: JOUR_EXEMPLE,
    hippodrome: 'SAINT-CLOUD',
    reunion: 2,
    numero: 5,
    nom: 'Prix de la Futaie',
    categorie: 'Listed',
    discipline: 'Plat',
    distance: 2400,
    allocation: 52000,
    terrain: 'Souple',
    statut: null,
    partants: 8,
    nonPartants: 0,
    heureDepart: '16:25',
    courue: false,
    liste: [
      partant(5, 'Comète Rousse', 4, 'Femelle', 56, 1, 0.26, null, null),
      partant(1, 'Rive Gauche', 5, 'Hongre', 58, 2, 0.2, null, null),
      partant(7, 'Plein Travers', 3, 'Mâle', 54, 3, 0.15, null, null),
    ],
  },
  {
    cle: `${JOUR_EXEMPLE}|LYON-PARILLY|6`,
    date: JOUR_EXEMPLE,
    hippodrome: 'LYON-PARILLY',
    reunion: 3,
    numero: 6,
    nom: 'Prix du Confluent',
    categorie: 'Handicap',
    discipline: 'Steeple',
    distance: 4100,
    allocation: 33000,
    terrain: 'Très souple',
    statut: null,
    partants: 16,
    nonPartants: 2,
    heureDepart: '17:05',
    courue: false,
    liste: [
      partant(12, 'Sous le Vent', 7, 'Hongre', 68, 1, 0.17, null, null),
      partant(6, 'Écho des Pins', 6, 'Mâle', 70, 2, 0.15, null, null),
      partant(3, 'Fée Clochette', 5, 'Femelle', 66, 3, 0.12, null, null),
    ],
  },
]

export const JOURNEE_EXEMPLE: JourneePublique = { jour: JOUR_EXEMPLE, courses: COURSES }

/** La veille, entièrement jugée — dont une course jamais relevée. */
export const VEILLE_EXEMPLE: JourneePublique = {
  jour: '2026-10-15',
  courses: [
    {
      cle: '2026-10-15|CHANTILLY|1',
      date: '2026-10-15',
      hippodrome: 'CHANTILLY',
      reunion: 1,
      numero: 1,
      nom: 'Prix des Aigles',
      categorie: 'Groupe I',
      discipline: 'Plat',
      distance: 1400,
      allocation: 414000,
      terrain: 'Bon',
      statut: 'ARRIVEE_DEFINITIVE_COMPLETE',
      partants: 10,
      nonPartants: 0,
      heureDepart: '13:40',
      courue: true,
      liste: [
        partant(8, 'Trait de Plume', 4, 'Mâle', 58, 1, 0.3, 1, 4.0),
        partant(2, 'Brume Légère', 5, 'Femelle', 56.5, 2, 0.22, 3, 6.5),
        partant(5, 'Sable Fin', 4, 'Hongre', 57, 3, 0.16, 2, 9.5),
      ],
    },
    {
      cle: '2026-10-15|CHANTILLY|2',
      date: '2026-10-15',
      hippodrome: 'CHANTILLY',
      reunion: 1,
      numero: 2,
      // Jamais relevée : la journée est passée, l'arrivée n'est pas venue.
      nom: 'Prix du Grand Parquet',
      categorie: 'Conditions',
      discipline: 'Haies',
      distance: 3100,
      allocation: 27000,
      terrain: 'Bon',
      statut: null,
      partants: 11,
      nonPartants: null,
      heureDepart: '14:15',
      courue: false,
      liste: [partant(4, 'Grand Vizir', 6, 'Hongre', 67, 1, 0.24, null, null)],
    },
  ],
}

export const JOURNEES_EXEMPLE: JourneePublique[] = [JOURNEE_EXEMPLE, VEILLE_EXEMPLE]

export const journeeExemple = (jour: string): JourneePublique | undefined =>
  JOURNEES_EXEMPLE.find((j) => j.jour === jour)

/** Retrouve une course depuis les segments d'adresse `{lieu}/r{n}c{n}-{slug}`. */
export function courseExemple(jour: string, lieuSlug: string, numero: number) {
  return journeeExemple(jour)?.courses.find(
    (c) =>
      c.numero === numero &&
      c.hippodrome
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-') === lieuSlug,
  )
}
