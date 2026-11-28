import { estFormule, type CleFormule } from '@/config/formules'
import { minutesDe } from '@/lib/journee'
import type { Course, LignePrediction } from '@/types'

/**
 * L'ACCÈS PAR FORMULE — ce que l'application sait du compte (`db/007`,
 * `crosswell_mon_acces()`), et, pour la démonstration seulement, la règle de la
 * base reproduite côté client. En vrai, c'est LA BASE qui masque les pronostics
 * réservés : l'application ne fait que l'afficher.
 */

/**
 * `inconnu` N'EXISTE PAS EN BASE : il est réservé au repli, quand la lecture a
 * échoué. Il est donc volontairement ABSENT de `STATUTS`, la liste blanche du
 * parseur — aucune valeur venue de la base ne peut le produire.
 */
export type StatutAbonnement =
  | 'aucun'
  | 'offert'
  | 'actif'
  | 'resiliation_programmee'
  | 'impaye'
  | 'expire'
  | 'inconnu'
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
 *
 * LE STATUT EST `inconnu`, PAS `offert`. Il valait `offert` : la page Compte
 * affichait alors « Accès complet · Accès offert » et renvoyait la gestion de
 * l'abonnement vers un courriel — soit, mot pour mot, l'écran d'un compte
 * réellement ouvert à la main. Une panne de lecture était indiscernable d'un
 * accès offert, et a fait chercher au mauvais endroit le 20/09/2026.
 *
 * Le repli reste OUVERT (`complet: true`) : ne pas couper un client pour une
 * panne de lecture. Mais il ne prétend plus savoir pourquoi.
 */
export const ACCES_SANS_FILTRE: Acces = { complet: true, formule: 'gratuit', statut: 'inconnu', accesJusqua: null, clientStripe: false }

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
 * LA COURSE OFFERTE du jour, telle que la BASE la désigne (colonne `offerte`
 * de `client_predictions`, `db/024`). Décision du fondateur du 28/11/2026 : la
 * course où notre 1er a la plus forte chance de gagner (elle remplace « le plus
 * gros peloton » de `db/009`).
 *
 * ON NE REFAIT PAS LE CALCUL ICI : un compte Gratuit ne reçoit pas les
 * probabilités des courses verrouillées, il ne pourrait pas trouver la plus
 * forte. Deux règles qui divergent, et l'app renverrait vers une course en
 * fait verrouillée.
 *
 * Null si le jour n'a pas de course, ou sur une base où `db/024` manque.
 */
export function courseOfferte(duJour: readonly Course[]): Course | null {
  return duJour.find((c) => c.offerte) ?? null
}

/**
 * DÉMONSTRATION SEULEMENT : la règle de `db/024` appliquée aux lignes fictives,
 * pour montrer la formule Gratuit sans base. Par jour à venir, la course offerte
 * est celle où la plus haute probabilité de victoire est la plus haute (toutes
 * lignes comprises, non-partants aussi, comme la base), puis la première au
 * départ, l'hippodrome et le numéro. Une course à venir (aucune place relevée)
 * autre que celle-là perd rang et probabilités, et porte `verrouille`.
 *
 * Le critère « réunion PMU d'abord » de `db/025` n'est pas reproduit : les
 * lignes de `client_predictions` (et donc celles de la démo) n'ont pas de cote
 * du matin. La base retombe sur la même règle quand aucune réunion n'en a.
 */
export function verrouillerLignes(lignes: readonly LignePrediction[], aujourdhui: string): LignePrediction[] {
  const cle = (l: LignePrediction) => `${l.reunion_date}|${l.hippodrome}|${l.course_num}`
  const jugees = new Set(lignes.filter((l) => l.actual_place != null).map(cle))
  const heure = (l: LignePrediction) => (l.heure_depart ? minutesDe(l.heure_depart.slice(0, 5)) : Number.POSITIVE_INFINITY)

  // Une course : sa plus haute probabilité, sa première heure de départ.
  interface Candidate {
    ligne: LignePrediction
    p1: number
    heure: number
  }
  const courses = new Map<string, Candidate>()
  for (const l of lignes) {
    if (l.reunion_date < aujourdhui || !l.hippodrome) continue
    const c = courses.get(cle(l))
    const p = l.p_win ?? Number.NEGATIVE_INFINITY
    if (!c) courses.set(cle(l), { ligne: l, p1: p, heure: heure(l) })
    else {
      c.p1 = Math.max(c.p1, p)
      c.heure = Math.min(c.heure, heure(l))
    }
  }
  // Même ordre que la base : probabilité, heure, hippodrome, numéro.
  const devance = (a: Candidate, b: Candidate) =>
    a.p1 - b.p1 ||
    b.heure - a.heure ||
    (b.ligne.hippodrome ?? '').localeCompare(a.ligne.hippodrome ?? '') ||
    b.ligne.course_num - a.ligne.course_num
  const parJour = new Map<string, Candidate>()
  for (const c of courses.values()) {
    const o = parJour.get(c.ligne.reunion_date)
    if (!o || devance(c, o) > 0) parJour.set(c.ligne.reunion_date, c)
  }
  const cleOfferte = new Set([...parJour.values()].map((c) => cle(c.ligne)))

  return lignes.map((l) => {
    const offerte = cleOfferte.has(cle(l))
    const verrou = l.reunion_date >= aujourdhui && !jugees.has(cle(l)) && !offerte
    return verrou
      ? { ...l, pred_rank: null, p_win: null, p_place: null, rang_effectif: null, verrouille: true, offerte }
      : { ...l, verrouille: false, offerte }
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
      // « Paiement en attente » laissait croire que l'accès tenait encore. Il
      // est coupé dès l'échec (pas de période de grâce, décision du 20/09/2026).
      return 'Accès suspendu'
    case 'inconnu':
      return 'État indisponible'
    case 'expire':
      return 'Expiré'
    default:
      return 'Sans Pass'
  }
}
