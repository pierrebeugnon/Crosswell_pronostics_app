// Ce que partagent les fonctions Stripe de Crosswell Pronostics : clients Stripe
// et Supabase, CORS, réponses, lecture de l'utilisateur.
//
// CE FICHIER NE DÉCIDE RIEN. Les règles de facturation vivent dans `regles.ts`,
// qui n'importe rien et se teste depuis vitest (`tests/stripe/`). Ici, on ne
// garde que ce qui parle au réseau.
//
// NON DÉPLOYÉES tant que le fondateur ne l'a pas validé — voir README.md.

import Stripe from 'npm:stripe@16.12.0'
import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2.45.0'
import { DEVISE, MONTANTS_ATTENDUS, PASS, type LigneAbonnement, type Pass } from './regles.ts'

export {
  MONTANTS_ATTENDUS,
  NOMS_FORMULE,
  PASS,
  abonnementEnCours,
  abonnementImpaye,
  abonnementsAAnnuler,
  accesOffertSansEcheance,
  decisionAbonnement,
  decisionContestation,
  decisionPassJour,
  decisionRemboursement,
  formuleFacturee,
  statutDe,
  texteConsentement,
} from './regles.ts'
export type { AbonnementStripe, Decision, LigneAbonnement, Pass, Statut } from './regles.ts'

export function exiger(nom: string): string {
  const v = Deno.env.get(nom)
  if (!v) throw new Error(`Variable manquante : ${nom}`)
  return v
}

/**
 * Les identifiants de tarif, LUS AU CHARGEMENT. Lus à l'appel, un secret mal
 * saisi ne se voyait qu'au moment de payer : la formule devenait
 * « indéterminable » côté webhook, ce qui se classait en erreur définitive —
 * client débité, accès jamais ouvert. Ici, la fonction refuse de démarrer, et
 * c'est visible dans les journaux avant qu'un seul euro ne bouge.
 */
const PRIX: Record<Pass, string> = {
  jour: exiger('STRIPE_PRIX_JOUR'),
  mois: exiger('STRIPE_PRIX_MOIS'),
  an: exiger('STRIPE_PRIX_AN'),
}

export const prixStripe = (p: Pass) => PRIX[p]

/**
 * Version d'API figée : `current_period_end` y est porté par l'abonnement lui-même
 * (les versions de 2025 l'ont déplacé sur ses éléments).
 *
 * ATTENTION — CE FIGEAGE NE VAUT QUE POUR LES APPELS SORTANTS. Le corps d'un
 * webhook est sérialisé par Stripe à la version du POINT DE TERMINAISON, pas à
 * celle du SDK : `constructEventAsync` vérifie une signature, il ne transcode
 * rien. Un objet reçu dans un événement peut donc avoir une tout autre forme que
 * celui renvoyé par un `retrieve`. C'est la raison pour laquelle `stripe-webhook`
 * RELIT systématiquement l'abonnement au lieu de croire l'instantané reçu.
 */
export const stripe = new Stripe(exiger('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
})

/**
 * `price_…` → formule. Le webhook s'appuyait sur les métadonnées de
 * l'abonnement, avec un repli muet sur « mois » : tout abonnement créé au
 * tableau de bord était donc étiqueté mensuel, et la page Compte annonçait
 * « 12,99 € / mois » à un client facturé 99 €. On résout d'abord par le tarif,
 * qui est un fait ; les métadonnées ne servent plus que de repli explicite.
 */
export function passDuPrix(priceId: string | null | undefined): Pass | null {
  if (!priceId) return null
  return PASS.find((p) => PRIX[p] === priceId) ?? null
}

/** Vérifié une fois par instance : au-delà, le tarif ne change pas sous nos pieds. */
const tarifsVerifies = new Set<Pass>()

/**
 * LE GARDE-FOU DE TARIF. Il compare ce que Stripe facture à ce que l'application
 * affiche, avant d'ouvrir une page de paiement. C'est exactement l'erreur qui
 * s'était glissée dans le compte le 20/09/2026 : un Pass annuel créé à 99,99 €
 * en paiement unique, là où le site annonce 99 € par an.
 */
export async function verifierTarif(p: Pass): Promise<void> {
  if (tarifsVerifies.has(p)) return
  const prix = await stripe.prices.retrieve(prixStripe(p))
  const attendu = MONTANTS_ATTENDUS[p]
  if (prix.unit_amount !== attendu || prix.currency !== DEVISE) {
    throw new Error(
      `Tarif ${p} incohérent : Stripe annonce ${prix.unit_amount} ${prix.currency}, l'application ${attendu} ${DEVISE}.`,
    )
  }
  if ((p !== 'jour') !== Boolean(prix.recurring)) {
    throw new Error(`Tarif ${p} incohérent : ${prix.recurring ? 'récurrent' : 'ponctuel'} chez Stripe.`)
  }
  /*
   * DEVENU BLOQUANT EN MODE RÉEL, depuis que la session demande le calcul de la
   * TVA (`automatic_tax`). Tant que Stripe Tax dormait, un tarif mal réglé
   * n'avait aucun effet : rien ne s'ajoutait. Maintenant qu'il calcule, un
   * tarif « exclusive » ferait payer la TVA EN PLUS du prix annoncé — 5,99 €
   * encaissés sur un Pass 1 jour affiché 4,99 € dans l'app, sur le site et à
   * l'article 5 des CGV. « unspecified » retombe sur le réglage par défaut du
   * compte, c'est-à-dire sur quelque chose qui peut changer sans nous.
   *
   * ET CELA NE SE RATTRAPE PAS : `tax_behavior` ne se règle qu'une fois.
   * « unspecified » → « inclusive » reste possible ; un tarif déjà
   * « exclusive » impose de créer un nouveau `price_…` et de changer le secret
   * `STRIPE_PRIX_*` correspondant.
   */
  if (prix.tax_behavior !== 'inclusive') {
    const message = `Tarif ${p} : tax_behavior=${prix.tax_behavior}, attendu « inclusive » (prix annoncés TTC).`
    if (MODE_REEL) throw new Error(message)
    console.warn(`${message} Toléré hors mode réel.`)
  }
  tarifsVerifies.add(p)
}

/**
 * LE MODE RÉEL SE RECONNAÎT À LA CLÉ. Les garde-fous fiscaux ne doivent pas
 * bloquer un bac à sable mal réglé — on y essaie, justement —, mais ils ne
 * doivent rien laisser passer dès qu'un vrai euro est en jeu.
 */
export const MODE_REEL = exiger('STRIPE_SECRET_KEY').startsWith('sk_live_')

/** Vérifié une fois par instance, comme les tarifs. */
let tvaVerifiee = false

/**
 * LE GARDE-FOU DE TVA. Stripe Tax ne proteste jamais tout seul : mal réglé, il
 * calcule zéro, le paiement passe, et on encaisse du TTC sans jamais rien
 * ventiler — une erreur qui ne se voit qu'au contrôle, des mois plus tard.
 *
 * Deux conditions, et elles sont distinctes : le calcul doit être ACTIF (une
 * adresse de siège renseignée chez Stripe), et il faut au moins une
 * IMMATRICULATION à la TVA, sans quoi Stripe calcule un taux de zéro en toute
 * légalité apparente.
 *
 * Hors mode réel, on se contente de le dire : un bac à sable sans
 * immatriculation doit rester utilisable pour essayer le parcours.
 */
export async function verifierTva(): Promise<void> {
  if (tvaVerifiee) return
  try {
    const reglages = await stripe.tax.settings.retrieve()
    const immatriculations = await stripe.tax.registrations.list({ status: 'active', limit: 1 })
    const actif = reglages.status === 'active'
    const immatricule = immatriculations.data.length > 0
    if (!actif || !immatricule) {
      const manque = !actif ? 'le calcul de la taxe n’est pas actif (adresse de l’établissement d’origine ?)' : 'aucune immatriculation à la TVA n’est active'
      const message = `Stripe Tax : ${manque}. Les prix sont annoncés TTC : sans cela, on encaisse sans collecter.`
      if (MODE_REEL) throw new Error(message)
      console.warn(`${message} Toléré hors mode réel.`)
    }
  } catch (e) {
    // Une panne de lecture n'est pas une preuve de bon réglage : en mode réel,
    // on refuse d'ouvrir une page de paiement plutôt que de supposer.
    if (MODE_REEL) throw e
    console.warn(`Stripe Tax : contrôle impossible (${e instanceof Error ? e.message : e}). Toléré hors mode réel.`)
  }
  tvaVerifiee = true
}

/** Le client de SERVICE : il écrit l'état d'abonnement, que les clients ne font que lire. */
export const admin: SupabaseClient = createClient(exiger('SUPABASE_URL'), exiger('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
})

/**
 * Les origines de l'application, séparées par des virgules (`APP_URL`), par
 * exemple « https://crosswell-pronostics.vercel.app,http://localhost:5190 ».
 * Les adresses de retour envoyées par l'app doivent en faire partie : sans ce
 * contrôle, la fonction servirait de redirection ouverte.
 *
 * LUES UNE FOIS, AU CHARGEMENT DU MODULE, ET SANS JAMAIS LEVER. `origines()`
 * appelait `exiger('APP_URL')` à chaque usage, donc aussi depuis `enTetesCors`,
 * donc depuis `json()` — y compris dans les `catch`. Une variable absente ou
 * mal orthographiée faisait échapper l'exception hors de `Deno.serve` : réponse
 * 500 nue, sans CORS ni JSON, que le client traduisait par « Le paiement en
 * ligne n'est pas encore ouvert. Écrivez-nous… ». Rassurant, et faux : on
 * cherchait un problème de produit là où il n'y avait qu'un secret manquant.
 */
const ORIGINES: readonly string[] = (Deno.env.get('APP_URL') ?? '')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean)

/** Faux si `APP_URL` est absente ou vide : les fonctions répondent alors 503. */
export const CONFIGURATION_COMPLETE = ORIGINES.length > 0

export function origines(): readonly string[] {
  return ORIGINES
}

export function adresseAutorisee(url: unknown): url is string {
  if (typeof url !== 'string') return false
  try {
    return ORIGINES.includes(new URL(url).origin)
  } catch {
    return false
  }
}

export function enTetesCors(req: Request): Record<string, string> {
  const origine = req.headers.get('origin') ?? ''
  // Si `APP_URL` manque, la liste est vide et l'en-tête l'était aussi : le
  // navigateur bloquait alors la réponse 503, et le client retombait sur le
  // message trompeur « le paiement n'est pas encore ouvert ». On renvoie donc
  // l'origine de la requête dans ce seul cas — la fonction refuse de toute
  // façon toute opération quand elle n'est pas configurée, la réponse ne porte
  // qu'un message d'erreur, et c'est le message qu'on veut faire lire.
  const permise = ORIGINES.includes(origine) ? origine : (ORIGINES[0] ?? origine)
  return {
    'Access-Control-Allow-Origin': permise,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

/**
 * La réponse à servir quand un secret de configuration manque. 503 et non 500 :
 * ce n'est pas une panne, c'est un déploiement incomplet — et le message doit
 * nommer la variable, sans quoi on cherche des heures.
 */
export function configurationIncomplete(req: Request): Response {
  console.error('APP_URL absente ou vide : fonction non configurée.')
  return json(req, { message: 'Configuration du serveur incomplète (APP_URL).' }, 503)
}

export function json(req: Request, corps: unknown, statut = 200): Response {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { ...enTetesCors(req), 'Content-Type': 'application/json' },
  })
}

/** L'utilisateur du jeton de session joint par `supabase.functions.invoke`. */
export async function utilisateur(req: Request): Promise<User | null> {
  const jeton = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!jeton) return null
  const { data, error } = await admin.auth.getUser(jeton)
  return error ? null : data.user
}

export async function lireAbonnement(userId: string): Promise<LigneAbonnement | null> {
  const { data, error } = await admin.from('abonnements').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data as LigneAbonnement | null
}
