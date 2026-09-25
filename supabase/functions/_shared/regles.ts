/**
 * LES RÈGLES DE FACTURATION, SANS AUCUNE ENTRÉE-SORTIE.
 *
 * Ce fichier n'importe RIEN : ni Stripe, ni Supabase, ni `Deno`. C'est la
 * condition pour qu'il soit exécutable à la fois par les fonctions Edge (Deno)
 * et par la suite de tests de l'application (vitest, sous Node) — voir
 * `tests/stripe/`. Les fonctions Edge ne gardent que la lecture des événements
 * et l'écriture en base ; tout ce qui DÉCIDE vit ici.
 *
 * La séparation n'est pas un goût d'architecture : ce code n'avait aucun test
 * parce qu'il était inséparable de ses appels réseau, et il touche à de
 * l'argent. Une décision qui se calcule à partir d'un état et rend un autre
 * état se vérifie ; un `await` au milieu d'un `if`, non.
 *
 * RÈGLE POUR LA SUITE : toute condition qui décide d'ouvrir, de fermer ou de
 * facturer se met ici, avec son test. L'index d'une fonction ne doit contenir
 * que du transport.
 */

export type Pass = 'jour' | 'mois' | 'an'
export const PASS: readonly Pass[] = ['jour', 'mois', 'an']

export type Statut = 'aucun' | 'offert' | 'actif' | 'resiliation_programmee' | 'impaye' | 'expire'

export interface LigneAbonnement {
  user_id: string
  formule: 'gratuit' | Pass
  statut: Statut
  acces_jusqua: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
}

/** Ce qu'une décision demande d'écrire — ou de ne pas écrire. */
export type Decision =
  | { action: 'ignorer'; motif: string }
  | {
      action: 'ecrire'
      ligne: Partial<LigneAbonnement> & { user_id: string }
      /** À journaliser : la décision est prise, mais elle mérite d'être vue. */
      avertissement?: string
    }

/** Les montants TTC attendus, en centimes. Copie de `src/config/formules.ts`. */
export const MONTANTS_ATTENDUS: Readonly<Record<Pass, number>> = { jour: 499, mois: 1299, an: 9900 }

/** Les noms publics. Copie de `src/config/formules.ts`. */
export const NOMS_FORMULE: Readonly<Record<Pass, string>> = {
  jour: 'Pass 1 jour',
  mois: 'Pass mensuel',
  an: 'Pass annuel',
}

export const DEVISE = 'eur'

const JOUR_MS = 24 * 3_600_000

/**
 * LE TEXTE DE CONSENTEMENT. Doit rester identique, au caractère près, à
 * `texteConsentement` de `src/lib/inscription.ts` : c'est ce texte-là que le
 * client a vu, et c'est celui que le serveur conserve comme preuve.
 *
 * Un test de parité (`tests/stripe/parite.test.ts`) compare les deux — il a été
 * écrit après qu'une espace insécable manquante a fait diverger les deux
 * versions d'un seul caractère, sans que rien ne le signale.
 */
export function texteConsentement(p: Pass): string {
  const nom = NOMS_FORMULE[p]
  return p === 'jour'
    ? `Je demande l’accès au ${nom} dès le paiement et je renonce expressément à mon droit de rétractation, que je perdrai une fois le pass pleinement exécuté, au bout de vingt-quatre heures.`
    : `Je demande que mon accès au ${nom} commence dès le paiement. Si j’exerce mon droit de rétractation dans les 14 jours, je paierai la part de l’accès déjà fournie.`
}

/** L'état Stripe d'un abonnement, dans notre vocabulaire. */
export function statutDe(statutStripe: string, resiliationEnFinDePeriode: boolean): Statut {
  if (statutStripe === 'active' || statutStripe === 'trialing') {
    return resiliationEnFinDePeriode ? 'resiliation_programmee' : 'actif'
  }
  if (statutStripe === 'past_due' || statutStripe === 'unpaid') return 'impaye'
  if (statutStripe === 'incomplete') return 'aucun'
  return 'expire' // canceled, incomplete_expired, paused
}

/**
 * Un accès ouvert à la main : `offert`, sans échéance.
 *
 * ATTENTION À LA PORTÉE : `db/007` a posé ce statut sur TOUS les comptes qui
 * existaient à la migration, « pour ne couper personne ». Une garde qui le
 * préserverait en toutes circonstances s'appliquerait donc aussi à de vrais
 * abonnés payants. Elle ne vaut que pour le Pass 1 jour — un abonnement Stripe
 * l'emporte toujours.
 */
export function accesOffertSansEcheance(a: LigneAbonnement | null): boolean {
  return Boolean(a && a.statut === 'offert' && a.acces_jusqua === null)
}

/**
 * Un abonnement mensuel ou annuel qui existe encore chez Stripe : on n'en ouvre
 * pas un second. `impaye` en fait partie — un impayé se régularise dans le
 * portail, il ne se rachète pas.
 */
export function abonnementEnCours(a: LigneAbonnement | null): boolean {
  if (!a || (a.formule !== 'mois' && a.formule !== 'an')) return false
  return a.statut === 'actif' || a.statut === 'resiliation_programmee' || a.statut === 'impaye'
}

/** Un abonnement à régulariser plutôt qu'à racheter : le message doit différer. */
export function abonnementImpaye(a: LigneAbonnement | null): boolean {
  return Boolean(a && (a.formule === 'mois' || a.formule === 'an') && a.statut === 'impaye')
}

/**
 * La formule facturée. Elle se lit d'abord dans le TARIF, qui est un fait ; les
 * métadonnées ne sont qu'un repli, et le repli se dit. Sans cela, tout
 * abonnement créé au tableau de bord était étiqueté mensuel, et la page Compte
 * annonçait « 12,99 € / mois » à un client facturé 99 €.
 */
export function formuleFacturee(
  parLeTarif: Pass | null,
  formuleDesMetadonnees: string | null | undefined,
): { formule: Pass | null; repli: boolean } {
  if (parLeTarif) return { formule: parLeTarif, repli: false }
  const m = formuleDesMetadonnees
  if (m === 'an' || m === 'mois' || m === 'jour') return { formule: m, repli: true }
  return { formule: null, repli: false }
}

/** L'état d'un abonnement Stripe, réduit à ce dont la décision a besoin. */
export interface AbonnementStripe {
  id: string
  statut: Statut
  formule: Pass
  /** Fin de la période en cours, en SECONDES epoch. */
  echeanceSecondes: number
  clientStripe: string
}

/**
 * Que faire d'un événement d'abonnement.
 *
 * Deux garde-fous, et un seul chemin d'écriture :
 * - un événement d'un ANCIEN abonnement ne touche pas au courant. Un client qui
 *   a repris un abonnement après résiliation reçoit encore les événements de
 *   l'ancien ; un `deleted` tardif coupait l'accès de quelqu'un à jour.
 * - l'échéance doit être un nombre fini. Elle vient de `current_period_end`,
 *   que les versions d'API de 2025 ont déplacé sur les éléments de
 *   l'abonnement : un instantané d'une autre version donnait `undefined`, donc
 *   une date invalide, donc une erreur au milieu de l'écriture.
 */
export function decisionAbonnement(
  userId: string,
  actuel: LigneAbonnement | null,
  s: AbonnementStripe,
): Decision {
  if (!Number.isFinite(s.echeanceSecondes)) {
    throw new Error(`Abonnement ${s.id} sans échéance exploitable (current_period_end absent)`)
  }

  const autre = Boolean(actuel?.stripe_subscription_id && actuel.stripe_subscription_id !== s.id)
  const courantVivant = actuel?.statut === 'actif' || actuel?.statut === 'resiliation_programmee'
  if (autre && courantVivant && s.statut === 'expire') {
    return {
      action: 'ignorer',
      motif: `Événement d'un ancien abonnement (${s.id}) : ${actuel!.stripe_subscription_id} est en cours.`,
    }
  }

  return {
    action: 'ecrire',
    ligne: {
      user_id: userId,
      formule: s.formule,
      statut: s.statut,
      acces_jusqua: new Date(s.echeanceSecondes * 1000).toISOString(),
      stripe_customer_id: s.clientStripe,
      stripe_subscription_id: s.id,
    },
  }
}

/**
 * Que faire d'un Pass 1 jour payé.
 *
 * `maintenantMs` est injecté : une règle qui lit l'horloge elle-même ne se teste
 * pas, et c'est précisément le calcul d'échéance qu'on veut pouvoir vérifier.
 *
 * Le Pass encore valide se PROLONGE — comportement voulu pour deux achats
 * successifs. Il n'est sûr que parce que la réservation en amont empêche le même
 * événement d'être appliqué deux fois.
 */
export function decisionPassJour(
  userId: string,
  actuel: LigneAbonnement | null,
  clientStripe: string | null,
  maintenantMs: number,
): Decision {
  if (accesOffertSansEcheance(actuel)) {
    // On ne rétrograde pas un accès sans terme à vingt-quatre heures — mais on
    // garde le lien vers le client Stripe, sans quoi le portail lui resterait
    // fermé.
    if (clientStripe) {
      return {
        action: 'ecrire',
        ligne: { user_id: userId, stripe_customer_id: clientStripe },
        avertissement: 'Pass 1 jour payé sur un accès offert : accès laissé intact.',
      }
    }
    return { action: 'ignorer', motif: 'Pass 1 jour payé sur un accès offert.' }
  }

  if (actuel && (actuel.formule === 'mois' || actuel.formule === 'an') && (actuel.statut === 'actif' || actuel.statut === 'resiliation_programmee')) {
    return { action: 'ignorer', motif: 'Pass 1 jour payé pendant un abonnement en cours.' }
  }

  const finActuelle = actuel?.formule === 'jour' && actuel.acces_jusqua ? new Date(actuel.acces_jusqua).getTime() : null
  const prolonge = finActuelle !== null && Number.isFinite(finActuelle) && finActuelle > maintenantMs
  const nouvelleFin = prolonge ? finActuelle! + JOUR_MS : maintenantMs + JOUR_MS

  return {
    action: 'ecrire',
    ligne: {
      user_id: userId,
      formule: 'jour',
      statut: 'actif',
      acces_jusqua: new Date(nouvelleFin).toISOString(),
      // La colonne n'est écrite QUE si la session porte un client : un `?? null`
      // dans l'écriture remettait `stripe_customer_id` à NULL, et le compte
      // perdait « Résilier en ligne ».
      ...(clientStripe ? { stripe_customer_id: clientStripe } : {}),
    },
  }
}

/**
 * Que faire d'un remboursement. Un remboursement PARTIEL ne ferme rien : un
 * euro rendu sur 4,99 € fermait les vingt-quatre heures entières.
 */
export function decisionRemboursement(
  userId: string | null,
  actuel: LigneAbonnement | null,
  charge: { montant: number; montantRembourse: number },
  formuleDuPaiement: string | null | undefined,
  maintenantMs: number,
): Decision {
  if (charge.montantRembourse < charge.montant) {
    return {
      action: 'ignorer',
      motif: `Remboursement partiel (${charge.montantRembourse}/${charge.montant}) : accès laissé ouvert.`,
    }
  }
  if (!userId || formuleDuPaiement !== 'jour') {
    return { action: 'ignorer', motif: 'Remboursement hors Pass 1 jour : à traiter à la main.' }
  }
  if (accesOffertSansEcheance(actuel)) {
    return { action: 'ignorer', motif: 'Remboursement sur un accès offert : accès laissé intact.' }
  }
  if (actuel?.formule !== 'jour') {
    return { action: 'ignorer', motif: 'Pass 1 jour remboursé, mais l’accès courant n’en est plus un.' }
  }
  return {
    action: 'ecrire',
    ligne: {
      user_id: userId,
      formule: 'jour',
      statut: 'expire',
      acces_jusqua: new Date(maintenantMs).toISOString(),
    },
  }
}

/**
 * Que faire d'une contestation de paiement : on coupe (décision du fondateur du
 * 20/09/2026, étendue de sa règle sur les retards de paiement).
 *
 * LIMITE CONNUE : rien ne marque la ligne comme contestée, donc un événement
 * d'abonnement ultérieur peut rouvrir l'accès — Stripe ne change pas le statut
 * d'un abonnement pour une contestation. Une colonne dédiée est à prévoir dans
 * `db/008`.
 */
export function decisionContestation(
  userId: string,
  actuel: LigneAbonnement | null,
  maintenantMs: number,
): Decision {
  if (accesOffertSansEcheance(actuel)) {
    return { action: 'ignorer', motif: 'Contestation sur un accès offert : accès laissé intact.' }
  }
  return {
    action: 'ecrire',
    ligne: { user_id: userId, statut: 'impaye', acces_jusqua: new Date(maintenantMs).toISOString() },
    avertissement:
      'CONTESTATION : accès coupé. Un futur événement d’abonnement peut le rouvrir — vérifier à la main.',
  }
}

/**
 * LES STATUTS STRIPE QUI PRÉLÈVENT ENCORE, ou qui le peuvent.
 *
 * `incomplete` en fait partie : la première facture peut encore aboutir.
 * `paused` aussi — une collecte en pause ne débite rien aujourd'hui, mais un
 * compte supprimé ne doit plus rien laisser de vivant chez Stripe. Sont exclus
 * `canceled` et `incomplete_expired` : `subscriptions.cancel` lèverait sur un
 * abonnement déjà mort, et ferait échouer la suppression pour rien.
 */
export const STATUTS_VIVANTS: readonly string[] = [
  'active',
  'trialing',
  'past_due',
  'unpaid',
  'incomplete',
  'paused',
]

/**
 * Les abonnements Stripe à annuler quand un compte disparaît.
 *
 * ON NE SE FIE PAS À `abonnements.stripe_subscription_id` : cette colonne ne
 * garde que le DERNIER abonnement vu. Un client qui a résilié puis repris en a
 * eu deux, et c'est la liste renvoyée par Stripe qui fait foi — sinon un
 * abonnement survit à la suppression, et c'est précisément le défaut qu'on
 * corrige.
 */
export function abonnementsAAnnuler(
  abonnements: readonly { id: string; status: string }[],
): string[] {
  return abonnements.filter((a) => STATUTS_VIVANTS.includes(a.status)).map((a) => a.id)
}
