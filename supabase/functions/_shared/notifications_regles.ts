/**
 * LES RÈGLES DES NOTIFICATIONS PUSH, SANS AUCUNE ENTRÉE-SORTIE.
 *
 * Même principe que `regles.ts` : ce fichier n'importe rien, pour être lu à la
 * fois par la fonction Edge (Deno) et par les tests de l'application (vitest,
 * `tests/notifications/`). La fonction ne garde que le transport.
 */

/**
 * Le seuil « Élevée ». COPIE de `SEUILS_CONFIANCE.elevee` (src/config/app.ts) :
 * la fonction Edge ne peut pas importer l'application. Un test de parité
 * compare les deux — un seuil qui diverge enverrait « Élevée » pour une course
 * que l'app affiche « Moyenne ».
 */
export const SEUIL_ELEVEE = 0.41

/**
 * « Belle victoire » : notre 1er gagne à une cote d'au moins ce chiffre
 * (décision du fondateur, 08/11/2026). À 10 : 7 courses du 11/09 au 07/11,
 * environ une par semaine ; à 7, on en aurait eu 16.
 */
export const COTE_BELLE_VICTOIRE = 10

export type TypeAlerte = 'course_offerte' | 'confiance_elevee' | 'belle_victoire' | 'test'

export interface Evenement {
  type: TypeAlerte
  cle: string
  titre: string
  corps: string
  url: string
}

/** Ce que reçoit le service worker (`public/sw.js`). */
export interface Charge {
  titre: string
  corps: string
  url: string
  /** Une alerte de même étiquette remplace la précédente sur l'appareil. */
  etiquette: string
}

export function charge(e: Evenement): Charge {
  return { titre: e.titre, corps: e.corps, url: e.url, etiquette: `${e.type}:${e.cle}` }
}

/**
 * Le verdict d'un envoi, d'après le code HTTP du service de push.
 * 404 et 410 : l'abonnement n'existe plus (désinstallation, permission
 * retirée) — on supprime l'appareil. 2xx : réussi. Le reste (429, 5xx, réseau)
 * est un échec passager : on compte, et l'appareil n'est plus servi après 3.
 */
export type Verdict = 'reussi' | 'supprimer' | 'echec'

export function verdict(statut: number | null): Verdict {
  if (statut !== null && statut >= 200 && statut < 300) return 'reussi'
  if (statut === 404 || statut === 410) return 'supprimer'
  return 'echec'
}

/**
 * L'heure de Paris, de 0 à 23. Par `formatToParts` et non `Number(format())` :
 * en français, `format` rend « 22 h », que `Number` lit NaN — et la fonction
 * jugeait alors TOUTE heure « hors des heures utiles », sans jamais rien
 * envoyer (premier passage de pg_cron, 08/11/2026 à 22h00).
 */
export function heureParis(instant: Date): number {
  const h = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', hourCycle: 'h23' })
    .formatToParts(instant)
    .find((p) => p.type === 'hour')?.value
  return Number(h)
}

/** Les heures où pg_cron peut appeler utilement (Paris) : rien la nuit. */
export function heureUtile(heureParis: number): boolean {
  return heureParis >= 8 && heureParis < 22
}
