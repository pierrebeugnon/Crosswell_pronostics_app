import type { CoursePublique, JourneePublique, PartantPublic } from '@/lib/resultats'

/**
 * LA JOURNÉE D'EXEMPLE des pages de résultats — chevaux et chiffres INVENTÉS.
 *
 * Elle existe pour monter les écrans avant que la source existe. Toute page qui
 * l'affiche porte `<Fictif />`, comme l'exemple de course de l'accueil.
 *
 * Elle est construite pour exercer LES CAS DIFFICILES, pas pour être jolie :
 * une course terminée dont notre favori gagne, une autre dont il échoue, une
 * course dont le départ est donné sans arrivée, une course jamais relevée, deux
 * courses à venir, un non-partant, une cote manquante, une catégorie absente,
 * et une course sans nom. Un jeu d'exemple qui ne montre que le cas heureux
 * laisse les états vides se découvrir en production.
 *
 * `JOUR_EXEMPLE` et `MAINTENANT_EXEMPLE` sont FIGÉS : les composants reçoivent
 * l'instant en paramètre et ne lisent jamais l'horloge, pour qu'un rendu serveur
 * et un rendu navigateur concluent la même chose.
 */

export const JOUR_EXEMPLE = '2026-10-16'
export const MAINTENANT_EXEMPLE = { jour: JOUR_EXEMPLE, minutes: 15 * 60 + 40 }

/** Un partant, écrit court — l'ordre des arguments suit celui des colonnes. */
function partant(
  numero: number,
  nom: string,
  rang: number | null,
  pWin: number | null,
  arrivee: number | null,
  cote: number | null,
  nonPartant = false,
): PartantPublic {
  return { numero, nom, rang, pWin, arrivee, cote, nonPartant }
}

const COURSES: CoursePublique[] = [
  {
    cle: `${JOUR_EXEMPLE}|DEAUVILLE|1`,
    date: JOUR_EXEMPLE,
    hippodrome: 'DEAUVILLE',
    numero: 1,
    nom: 'Prix de Morlaix',
    categorie: 'Handicap',
    discipline: 'Plat',
    distance: 2400,
    partants: 12,
    nonPartants: 1,
    heureDepart: '13:20',
    courue: true,
    liste: [
      partant(7, 'Iron Valley', 1, 0.34, 1, 3.5),
      partant(3, 'Belle de Cordes', 2, 0.19, 4, 6.0),
      partant(11, 'Orage Doré', 3, 0.12, 2, 9.0),
      partant(5, 'Sirocco Blue', 4, 0.09, 3, 14.0),
      partant(9, 'Vent du Nord', 5, 0.07, 5, 18.0),
      partant(2, 'Câline du Pré', 6, 0.06, 8, 22.0),
      // Un non-partant : aucun rang, aucune arrivée. La page ne doit ni le
      // compter dans l'arrivée ni le faire disparaître du tableau complet.
      partant(4, 'Nuit Blanche', null, null, null, null, true),
    ],
  },
  {
    cle: `${JOUR_EXEMPLE}|DEAUVILLE|2`,
    date: JOUR_EXEMPLE,
    hippodrome: 'DEAUVILLE',
    numero: 2,
    // Notre favori échoue : la page de résultats doit le montrer aussi nettement
    // qu'une réussite, sinon elle ne mesure rien.
    nom: 'Prix des Hautes Terres',
    categorie: 'Conditions',
    discipline: 'Plat',
    distance: 1600,
    partants: 9,
    nonPartants: 0,
    heureDepart: '13:55',
    courue: true,
    liste: [
      partant(6, 'Astre de Mai', 1, 0.28, 6, 4.2),
      partant(1, 'Lumière Franche', 2, 0.21, 1, 5.5),
      partant(8, 'Pas de Côté', 3, 0.14, 2, 8.5),
      partant(3, 'Gué du Moulin', 4, 0.11, 3, 11.0),
      partant(5, 'Reine Sienne', 5, 0.09, 4, 16.0),
    ],
  },
  {
    cle: `${JOUR_EXEMPLE}|SAINT-CLOUD|3`,
    date: JOUR_EXEMPLE,
    hippodrome: 'SAINT-CLOUD',
    numero: 3,
    // Catégorie absente : mesuré le 10/10/2026, 50 lignes sur 132 n'en portaient
    // aucune. L'affichage doit tenir sans elle.
    nom: null,
    categorie: null,
    discipline: 'Haies',
    distance: 2000,
    partants: 14,
    // Statut des non-partants pas encore vérifié : `null`, et surtout pas « 0 ».
    nonPartants: null,
    heureDepart: '15:10',
    courue: false,
    liste: [
      partant(2, 'Haut Perchoir', 1, 0.31, null, null),
      partant(10, 'Val d’Argent', 2, 0.18, null, null),
      partant(4, 'Souffle Court', 3, 0.13, null, null),
    ],
  },
  {
    cle: `${JOUR_EXEMPLE}|SAINT-CLOUD|4`,
    date: JOUR_EXEMPLE,
    hippodrome: 'SAINT-CLOUD',
    numero: 4,
    nom: 'Prix de la Futaie',
    categorie: 'Groupe III',
    discipline: 'Plat',
    distance: 2400,
    partants: 8,
    nonPartants: 0,
    heureDepart: '16:25',
    courue: false,
    liste: [
      partant(5, 'Comète Rousse', 1, 0.26, null, null),
      partant(1, 'Bois Joli', 2, 0.2, null, null),
      partant(7, 'Tambour Battant', 3, 0.15, null, null),
    ],
  },
  {
    cle: `${JOUR_EXEMPLE}|LYON-PARILLY|5`,
    date: JOUR_EXEMPLE,
    hippodrome: 'LYON-PARILLY',
    numero: 5,
    nom: 'Prix du Confluent',
    categorie: 'Handicap',
    discipline: 'Steeple',
    distance: 1800,
    partants: 16,
    nonPartants: 2,
    heureDepart: '17:05',
    courue: false,
    liste: [
      partant(12, 'Plein Travers', 1, 0.17, null, null),
      partant(6, 'Rive Gauche', 2, 0.15, null, null),
      partant(3, 'Sous le Vent', 3, 0.12, null, null),
    ],
  },
]

export const JOURNEE_EXEMPLE: JourneePublique = { jour: JOUR_EXEMPLE, courses: COURSES }

/**
 * La veille, pour montrer une journée entièrement jugée — dont une course que
 * nos relevés n'ont jamais rapportée.
 */
export const VEILLE_EXEMPLE: JourneePublique = {
  jour: '2026-10-15',
  courses: [
    {
      cle: '2026-10-15|CHANTILLY|1',
      date: '2026-10-15',
      hippodrome: 'CHANTILLY',
      numero: 1,
      nom: 'Prix des Aigles',
      categorie: 'Listed',
      discipline: 'Plat',
      distance: 1400,
      partants: 10,
      nonPartants: 0,
      heureDepart: '13:40',
      courue: true,
      liste: [
        partant(8, 'Trait de Plume', 1, 0.3, 1, 4.0),
        partant(2, 'Brume Légère', 2, 0.22, 3, 6.5),
        partant(5, 'Sable Fin', 3, 0.16, 2, 9.5),
      ],
    },
    {
      cle: '2026-10-15|CHANTILLY|2',
      date: '2026-10-15',
      hippodrome: 'CHANTILLY',
      numero: 2,
      // Jamais relevée : la journée est passée et l'arrivée n'est pas arrivée.
      // Environ quatre réunions sur dix ne sont pas cotées, et il manque des
      // arrivées : le dire vaut mieux qu'un tiret muet.
      nom: 'Prix du Grand Parquet',
      categorie: 'Conditions',
      discipline: 'Haies',
      distance: 2100,
      partants: 11,
      nonPartants: null,
      heureDepart: '14:15',
      courue: false,
      liste: [partant(4, 'Pierre de Lune', 1, 0.24, null, null)],
    },
  ],
}

/** Les journées servies par l'exemple, de la plus récente à la plus ancienne. */
export const JOURNEES_EXEMPLE: JourneePublique[] = [JOURNEE_EXEMPLE, VEILLE_EXEMPLE]

export const journeeExemple = (jour: string): JourneePublique | undefined =>
  JOURNEES_EXEMPLE.find((j) => j.jour === jour)

export const courseExemple = (jour: string, hippodromeSlug: string, numero: number) =>
  journeeExemple(jour)?.courses.find(
    (c) =>
      c.numero === numero &&
      c.hippodrome
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-') === hippodromeSlug,
  )
