/**
 * LE CONTRAT DES MODULES CONSTRUITS, pour la fonction `api/resultats`.
 *
 * Elle importe trois fichiers qui n'existent qu'APRÈS le build :
 * `dist-serveur/entree-serveur.js` (le rendu), `dist-serveur/coquille.js` et
 * `dist-serveur/introuvable.js` (les enveloppes HTML, écrites par
 * `scripts/apres-build.mjs`).
 *
 * Sans ces déclarations, `tsc --noEmit` — qui tourne AVANT le build, en tête de
 * `npm run build` — échouerait sur trois modules introuvables. Les déclarer
 * ici, à la main, met le contrat sous revue de code : si le rendu change de
 * signature, c'est ce fichier qu'il faut mettre à jour, et l'oubli se voit.
 *
 * Les types réels vivent dans `src/` ; ceux-ci les recopient au strict
 * nécessaire, en structures, pour ne pas créer une dépendance de `api/` vers
 * `src/` que le bundle a justement pour rôle d'éviter.
 */

declare module '*/dist-serveur/entree-serveur.js' {
  export interface PartantPublic {
    numero: number
    nom: string
    rang: number | null
    pWin: number | null
    arrivee: number | null
    cote: number | null
    nonPartant: boolean
  }

  export interface CoursePublique {
    cle: string
    date: string
    hippodrome: string
    numero: number
    nom: string | null
    categorie: string | null
    distance: number | null
    partants: number
    nonPartants: number
    heureDepart: string | null
    courue: boolean
    liste: PartantPublic[]
  }

  export interface JourneePublique {
    jour: string
    courses: CoursePublique[]
  }

  /** Opaque ici : la fonction les charge et les transmet, sans les lire. */
  export interface Statistiques {
    debut: string
    fin: string
  }

  export interface DonneesInitiales {
    journee?: JourneePublique
    journees?: string[]
    statistiques?: Statistiques
  }

  export interface Demande {
    jour: string | null
    lieu: string | null
    numero: number | null
    archives?: boolean
  }

  export interface AdresseCourse {
    date: string
    hippodrome: string
    reunion: number | null
    numero: number
    nom: string | null
  }

  export interface Tete {
    titre: string
    description: string
    canonique: string
    donneesStructurees: string[]
  }

  export interface Rendu {
    corps: string
    donnees: string
  }

  export function rendre(url: string, donnees: DonneesInitiales): Rendu
  export function analyser(chemin: string): Demande | null
  export function courseDemandee(journee: JourneePublique, d: Demande): CoursePublique | undefined
  export function decrire(d: Demande, journee: JourneePublique | null, origine?: string): Tete | null
  export function teteRubrique(): Tete
  export function teteStatistiques(origine: string, donnees?: Statistiques): Tete
  export function chargerStatistiques(): Promise<Statistiques>
  export const TETE_OUTIL_COTE: { chemin: string; titre: string; description: string }
  export function chargerJournee(jour: string): Promise<JourneePublique>
  export function chargerJourneesDisponibles(limite?: number): Promise<string[]>
  export function chargerAdressesCourses(journees: string[]): Promise<AdresseCourse[]>
  export const TOUTES_LES_JOURNEES: number
  export const CHEMIN_ARCHIVES: string
  export function cheminCourse(course: AdresseCourse): string
  export function cheminJournee(jour: string): string
  export function instantParis(): { jour: string; minutes: number }
}

declare module '*/dist-serveur/coquille.js' {
  /** Le HTML servi aux pages de résultats, tête déjà posée, `#root` vide. */
  export const COQUILLE: string
}

declare module '*/dist-serveur/introuvable.js' {
  /** Le HTML du 404, identique à `dist/404.html`. */
  export const INTROUVABLE: string
}
