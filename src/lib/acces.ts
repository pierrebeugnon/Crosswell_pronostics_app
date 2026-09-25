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
 * LE RANG D'UNE CATÉGORIE, du plus relevé au reste : Groupe I, II, III, Listed.
 * L'ordre des tests compte — « GR.III » commence par « GR.I ». Les libellés
 * viennent de France Galop et portent parfois un suffixe (« GR.I PA »,
 * « GR.III AQ ») ; le préfixe suffit à trancher.
 */
export function prestigeCategorie(categorie: string | null | undefined): number {
  const c = categorie ?? ''
  if (/^gr\.?\s*iii/i.test(c)) return 2
  if (/^gr\.?\s*ii/i.test(c)) return 3
  if (/^gr\.?\s*i/i.test(c)) return 4
  if (/listed/i.test(c)) return 1
  return 0
}

/**
 * LA COURSE OFFERTE du jour — même règle que la base (`db/009`), décision du
 * fondateur du 25/09/2026 : LA PLUS BELLE COURSE DU JOUR, c'est-à-dire le plus
 * gros peloton ; à égalité, la catégorie la plus relevée, puis la première au
 * départ, l'hippodrome et le numéro. Le champ `declares` est celui que la base
 * trie (`field_size`) ; il ne bouge pas quand un cheval est retiré, donc la
 * course offerte annoncée le matin reste la même toute la journée.
 *
 * ON NE REMPLACE PAS un nombre de déclarés absent par les partants au départ :
 * la base range ces courses en DERNIER (`NULLS LAST`), et cette fonction sert à
 * NOMMER la course que la base a ouverte. Deux règles qui divergent, et l'app
 * renvoie vers une course en fait verrouillée. (En production `field_size` est
 * toujours renseigné ; ce cas est celui de données incomplètes.)
 *
 * Null si le jour n'a pas de course.
 */
export function courseOfferte(duJour: readonly Course[]): Course | null {
  const peloton = (c: Course) => c.declares ?? -1
  const heure = (c: Course) => (c.heureDepart ? minutesDe(c.heureDepart) : Number.POSITIVE_INFINITY)
  return (
    [...duJour].sort(
      (a, b) =>
        peloton(b) - peloton(a) ||
        prestigeCategorie(b.categorie) - prestigeCategorie(a.categorie) ||
        heure(a) - heure(b) ||
        a.hippodrome.localeCompare(b.hippodrome) ||
        a.numero - b.numero,
    )[0] ?? null
  )
}

/**
 * DÉMONSTRATION SEULEMENT : la règle de `client_predictions` (`db/009`) appliquée
 * aux lignes fictives, pour montrer la formule Gratuit sans base. Une course à
 * venir (jour ≥ aujourd'hui, aucune place relevée) autre que la plus belle du
 * jour perd rang et probabilités, et porte `verrouille`.
 */
export function verrouillerLignes(lignes: readonly LignePrediction[], aujourdhui: string): LignePrediction[] {
  const cle = (l: LignePrediction) => `${l.reunion_date}|${l.hippodrome}|${l.course_num}`
  const jugees = new Set(lignes.filter((l) => l.actual_place != null).map(cle))
  const heure = (l: LignePrediction) => (l.heure_depart ? minutesDe(l.heure_depart.slice(0, 5)) : Number.POSITIVE_INFINITY)
  // Même ordre que `courseOfferte` et que la base : peloton, catégorie, heure.
  const devance = (l: LignePrediction, o: LignePrediction) =>
    (l.field_size ?? -1) - (o.field_size ?? -1) ||
    prestigeCategorie(l.categorie) - prestigeCategorie(o.categorie) ||
    heure(o) - heure(l) ||
    (o.hippodrome ?? '').localeCompare(l.hippodrome ?? '') ||
    o.course_num - l.course_num
  const offertes = new Map<string, LignePrediction>()
  for (const l of lignes) {
    if (l.reunion_date < aujourdhui || !l.hippodrome) continue
    const o = offertes.get(l.reunion_date)
    if (!o || devance(l, o) > 0) offertes.set(l.reunion_date, l)
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
