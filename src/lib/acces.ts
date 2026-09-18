import { estFormule, type CleFormule } from '@/config/formules'
import { minutesDe } from '@/lib/journee'
import type { Course, LignePrediction } from '@/types'

/**
 * L'ACCÈS PAR FORMULE — ce que l'application sait du compte (`db/007`,
 * `crosswell_mon_acces()`), et, pour la démonstration seulement, la règle de la
 * base reproduite côté client. En vrai, c'est LA BASE qui masque les pronostics
 * réservés : l'application ne fait que l'afficher.
 */

export type StatutAbonnement = 'aucun' | 'offert' | 'actif' | 'resiliation_programmee' | 'impaye' | 'expire'
const STATUTS: readonly StatutAbonnement[] = ['aucun', 'offert', 'actif', 'resiliation_programmee', 'impaye', 'expire']

export interface Acces {
  /** Pass valide ou accès offert : tout est ouvert. */
  complet: boolean
  formule: CleFormule
  statut: StatutAbonnement
  /** Fin de la période payée, ISO ; null sans échéance. */
  accesJusqua: string | null
  /** Un client Stripe existe : le portail de gestion peut s'ouvrir. */
  clientStripe: boolean
}

/**
 * La réponse de repli si la lecture de l'accès échoue : on ne coupe pas un
 * client pour une panne de lecture. La base filtre quand même (`db/007`,
 * appliquée le 18/09) et les courses se verrouillent sur sa colonne
 * `verrouille`, pas sur ce repli : seuls le bandeau Gratuit et la carte des
 * fiches jockey et entraîneur en dépendent.
 */
export const ACCES_SANS_FILTRE: Acces = { complet: true, formule: 'gratuit', statut: 'offert', accesJusqua: null, clientStripe: false }

/** La réponse JSON de `crosswell_mon_acces()`, vérifiée champ par champ. */
export function lireAcces(brut: unknown): Acces {
  const o = (brut ?? {}) as Record<string, unknown>
  const formule = typeof o.formule === 'string' && estFormule(o.formule) ? o.formule : 'gratuit'
  const statut = STATUTS.includes(o.statut as StatutAbonnement) ? (o.statut as StatutAbonnement) : 'aucun'
  return {
    complet: o.complet === true,
    formule,
    statut,
    accesJusqua: typeof o.acces_jusqua === 'string' ? o.acces_jusqua : null,
    clientStripe: o.client_stripe === true,
  }
}

/**
 * LA COURSE OFFERTE du jour — même règle que la base (`db/007`) : la première
 * au départ, puis par hippodrome et numéro. Null si le jour n'a pas de course.
 */
export function courseOfferte(duJour: readonly Course[]): Course | null {
  const rang = (c: Course) => (c.heureDepart ? minutesDe(c.heureDepart) : Number.POSITIVE_INFINITY)
  return (
    [...duJour].sort((a, b) => rang(a) - rang(b) || a.hippodrome.localeCompare(b.hippodrome) || a.numero - b.numero)[0] ??
    null
  )
}

/**
 * DÉMONSTRATION SEULEMENT : la règle de `client_predictions` (`db/007`) appliquée
 * aux lignes fictives, pour montrer la formule Gratuit sans base. Une course à
 * venir (jour ≥ aujourd'hui, aucune place relevée) autre que la première du jour
 * perd rang et probabilités, et porte `verrouille`.
 */
export function verrouillerLignes(lignes: readonly LignePrediction[], aujourdhui: string): LignePrediction[] {
  const cle = (l: LignePrediction) => `${l.reunion_date}|${l.hippodrome}|${l.course_num}`
  const jugees = new Set(lignes.filter((l) => l.actual_place != null).map(cle))
  const heure = (l: LignePrediction) => (l.heure_depart ? minutesDe(l.heure_depart.slice(0, 5)) : Number.POSITIVE_INFINITY)
  const offertes = new Map<string, LignePrediction>()
  for (const l of lignes) {
    if (l.reunion_date < aujourdhui || !l.hippodrome) continue
    const o = offertes.get(l.reunion_date)
    const avant =
      !o ||
      heure(l) - heure(o) < 0 ||
      (heure(l) === heure(o) && (l.hippodrome.localeCompare(o.hippodrome ?? '') < 0 || (l.hippodrome === o.hippodrome && l.course_num < o.course_num)))
    if (avant) offertes.set(l.reunion_date, l)
  }
  const cleOfferte = new Set([...offertes.values()].map(cle))
  return lignes.map((l) => {
    const verrou = l.reunion_date >= aujourdhui && !jugees.has(cle(l)) && !cleOfferte.has(cle(l))
    return verrou
      ? { ...l, pred_rank: null, p_win: null, p_place: null, rang_effectif: null, verrouille: true }
      : { ...l, verrouille: false }
  })
}

/** « Pass mensuel · actif jusqu'au… » : le libellé de l'état, pour la page Compte. */
export function libelleStatut(a: Acces): string {
  switch (a.statut) {
    case 'offert':
      return 'Accès offert'
    case 'actif':
      return 'Actif'
    case 'resiliation_programmee':
      return 'Résiliation programmée'
    case 'impaye':
      return 'Paiement en attente'
    case 'expire':
      return 'Expiré'
    default:
      return 'Sans Pass'
  }
}
