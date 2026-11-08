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

export type TypeAlerte = 'pronostics_jour' | 'confiance_elevee' | 'test'

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

/** Les heures où pg_cron peut appeler utilement (Paris) : rien la nuit. */
export function heureUtile(heureParis: number): boolean {
  return heureParis >= 8 && heureParis < 22
}
