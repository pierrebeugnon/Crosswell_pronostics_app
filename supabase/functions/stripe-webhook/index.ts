// POST /functions/v1/stripe-webhook — les notifications de Stripe. C'EST ICI, et
// nulle part ailleurs, que l'accès s'ouvre ou se ferme (`public.abonnements`).
//
// À déployer SANS vérification de jeton (`--no-verify-jwt`) : Stripe n'a pas de
// session Supabase. La signature Stripe (`STRIPE_WEBHOOK_SECRET`) en tient lieu,
// et toute requête qui ne la porte pas est refusée.
//
// CE FICHIER NE DÉCIDE RIEN. Il lit un événement, va chercher l'état chez
// Stripe et en base, passe le tout à `_shared/regles.ts`, et écrit ce qu'on lui
// dit d'écrire. Toutes les règles — qui ouvre, qui ferme, jusqu'à quand — sont
// dans `regles.ts`, qui n'importe rien et se teste (`tests/stripe/`).
//
// DEUX PRINCIPES, tirés de la relecture du 20/09/2026 :
//
// 1. ON NE LIT QUE L'IDENTIFIANT DANS L'ÉVÉNEMENT. Session, abonnement, paiement,
//    litige : chaque objet est RELU chez Stripe avant toute décision.
//
//    Pourquoi : le corps d'un événement est sérialisé à la version d'API du
//    POINT DE TERMINAISON, pas à celle du SDK — `constructEventAsync` vérifie
//    une signature, il ne transcode rien. Or cette version ne peut pas être
//    choisie librement : Stripe ne propose, à la création d'un point de
//    terminaison, que sa version courante et la précédente. Le nôtre est en
//    `2026-08-26.dahlia` quand le SDK est figé sur `2024-06-20`, et c'est
//    **sans conséquence** précisément parce qu'on relit tout : chaque objet
//    nous revient dans la forme du SDK, quelle que soit celle de l'événement.
//    C'est aussi ce qui règle l'ordre d'arrivée, qui n'est pas garanti.
//
//    Le coût est d'un appel d'API par événement. Sur de la facturation, c'est
//    le meilleur rapport qu'on puisse trouver.
//
// 2. LA RÉSERVATION PRÉCÈDE LE TRAITEMENT. La clé primaire de `stripe_evenements`
//    sert de verrou : c'est elle qui rend l'opération idempotente, pas une
//    lecture préalable qui laissait une fenêtre entre le test et l'écriture.

import Stripe from 'npm:stripe@16.12.0'
import {
  admin,
  decisionAbonnement,
  decisionContestation,
  decisionPassJour,
  decisionRemboursement,
  exiger,
  formuleFacturee,
  lireAbonnement,
  passDuPrix,
  statutDe,
  stripe,
  type Decision,
  type LigneAbonnement,
} from '../_shared/commun.ts'

const cryptographie = Stripe.createSubtleCryptoProvider()

/** La version d'API à laquelle ce code s'attend — voir `_shared/commun.ts`. */
const VERSION_API = '2024-06-20'

/** L'écart de version n'est signalé qu'une fois par instance. */
let versionSignalee = false

/**
 * Une erreur que le REJEU NE RÉPARERA PAS : métadonnée absente sur un abonnement
 * créé à la main, compte supprimé entre-temps…
 *
 * Tout partait en 500, donc en « rejouez », donc en trois jours de tentatives,
 * d'alertes, et un point de terminaison que Stripe finit par désactiver — ce qui
 * coupe alors les VRAIS clients. Une erreur définitive se journalise et se
 * répond 200, réservation libérée pour qu'un « Renvoyer » manuel reste possible
 * une fois la cause corrigée. Une erreur transitoire (panne de lecture, Stripe
 * indisponible) continue de rendre 500, parce qu'elle, le rejeu la répare.
 */
class ErreurDefinitive extends Error {}

async function compteDe(clientStripe: string, metadata: Stripe.Metadata | null): Promise<string | null> {
  if (metadata?.user_id) return metadata.user_id
  const { data, error } = await admin
    .from('abonnements')
    .select('user_id')
    .eq('stripe_customer_id', clientStripe)
    .maybeSingle()
  // L'erreur était avalée : une panne de lecture passagère devenait « compte
  // introuvable », c'est-à-dire un problème définitif. Elle doit au contraire
  // remonter, pour que Stripe rejoue l'événement.
  if (error) throw error
  return data?.user_id ?? null
}

/** Exécute ce qu'une règle a décidé — le seul chemin d'écriture du fichier. */
async function appliquer(d: Decision): Promise<void> {
  if (d.action === 'ignorer') {
    console.warn(d.motif)
    return
  }
  if (d.avertissement) console.warn(d.avertissement)
  const { error } = await admin
    .from('abonnements')
    .upsert({ ...d.ligne, mis_a_jour_le: new Date().toISOString() }, { onConflict: 'user_id' })
  if (!error) return
  // 23503 : clé étrangère violée, donc le compte a été supprimé. La colonne
  // `user_id` est en CASCADE et c'est le seul endroit où vivent nos
  // identifiants Stripe : aucun rejeu ne fera revenir le compte.
  if (error.code === '23503') {
    throw new ErreurDefinitive(`Compte ${d.ligne.user_id} supprimé : abonnement Stripe à annuler à la main.`)
  }
  throw error
}

/** L'identifiant du client Stripe porté par une session, s'il y en a un. */
function clientDe(session: Stripe.Checkout.Session): string | null {
  if (typeof session.customer === 'string') return session.customer
  return session.customer?.id ?? null
}

/** Un abonnement mensuel ou annuel créé, renouvelé, résilié, impayé ou terminé. */
async function suivreAbonnement(reference: string | Stripe.Subscription) {
  const id = typeof reference === 'string' ? reference : reference.id

  // LA RELECTURE. Elle règle deux choses d'un coup : la forme de l'objet, qui
  // dépend de la version d'API du point de terminaison et non du SDK ; et
  // l'ordre d'arrivée, qui n'est pas garanti.
  const s = await stripe.subscriptions.retrieve(id)

  const client = typeof s.customer === 'string' ? s.customer : s.customer.id
  const userId = await compteDe(client, s.metadata)
  if (!userId) throw new ErreurDefinitive(`Abonnement ${s.id} sans compte associé`)

  const { formule, repli } = formuleFacturee(passDuPrix(s.items.data[0]?.price?.id), s.metadata?.formule)
  if (repli) console.warn(`Abonnement ${s.id} : tarif inconnu, formule « ${formule} » lue dans les métadonnées.`)
  if (!formule || formule === 'jour') {
    throw new ErreurDefinitive(`Abonnement ${s.id} : formule indéterminable (tarif ${s.items.data[0]?.price?.id ?? '—'}).`)
  }

  const statut = statutDe(s.status, s.cancel_at_period_end)
  const actuel = await lireAbonnement(userId)
  await appliquer(
    decisionAbonnement(userId, actuel, {
      id: s.id,
      statut,
      formule,
      // Un abonnement terminé porte sa date de fin réelle ; les autres, la fin
      // de la période en cours.
      echeanceSecondes: statut === 'expire' && s.ended_at ? s.ended_at : s.current_period_end,
      clientStripe: client,
    }),
  )
}

/** Une page de paiement aboutie : Pass 1 jour, abonnement, ou paiement en attente. */
async function traiterSession(id: string) {
  const session = await stripe.checkout.sessions.retrieve(id)

  if (session.payment_status === 'unpaid') {
    console.warn('Session terminée mais non payée : rien ouvert, en attente du paiement différé', session.id)
    return
  }
  if (session.mode === 'subscription' && session.subscription) {
    await suivreAbonnement(typeof session.subscription === 'string' ? session.subscription : session.subscription.id)
    return
  }
  if (session.mode === 'payment' && session.payment_status === 'paid' && session.metadata?.formule === 'jour') {
    await ouvrirPassJour(session)
    return
  }
  console.warn('Session payée sans suite connue : ni abonnement, ni Pass 1 jour', session.id, session.mode)
}

/** Un Pass 1 jour payé : vingt-quatre heures à partir de l'ACTIVATION. */
async function ouvrirPassJour(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id ?? session.metadata?.user_id
  if (!userId) throw new ErreurDefinitive(`Session ${session.id} sans compte associé`)
  const actuel = await lireAbonnement(userId)
  await appliquer(decisionPassJour(userId, actuel, clientDe(session), Date.now()))
}

/** Un remboursement : le Pass 1 jour intégralement rendu cesse d'ouvrir l'accès. */
async function fermerSurRemboursement(idCharge: string) {
  const charge = await stripe.charges.retrieve(idCharge)
  const pi = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id
  if (!pi) return
  const intention = await stripe.paymentIntents.retrieve(pi)
  const userId = intention.metadata?.user_id ?? null
  const actuel = userId ? await lireAbonnement(userId) : null
  await appliquer(
    decisionRemboursement(
      userId,
      actuel,
      { montant: charge.amount, montantRembourse: charge.amount_refunded },
      intention.metadata?.formule,
      Date.now(),
    ),
  )
}

/** Une contestation de paiement coupe l'accès — décision du fondateur, 20/09/2026. */
async function fermerSurContestation(idLitige: string) {
  const litige = await stripe.disputes.retrieve(idLitige)
  const chargeId = typeof litige.charge === 'string' ? litige.charge : litige.charge.id
  const charge = await stripe.charges.retrieve(chargeId)
  const client = typeof charge.customer === 'string' ? charge.customer : charge.customer?.id
  if (!client) {
    console.warn('CONTESTATION sans client Stripe rattaché : à traiter à la main', litige.id)
    return
  }
  const userId = await compteDe(client, null)
  if (!userId) throw new ErreurDefinitive(`Contestation ${litige.id} : client ${client} sans compte associé`)
  const actuel: LigneAbonnement | null = await lireAbonnement(userId)
  await appliquer(decisionContestation(userId, actuel, Date.now()))
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Méthode non permise', { status: 405 })

  const signature = req.headers.get('stripe-signature')
  const corps = await req.text()
  let evenement: Stripe.Event
  try {
    evenement = await stripe.webhooks.constructEventAsync(
      corps,
      signature ?? '',
      exiger('STRIPE_WEBHOOK_SECRET'),
      undefined,
      cryptographie,
    )
  } catch (e) {
    console.error('Signature Stripe refusée', e)
    return new Response('Signature invalide', { status: 400 })
  }

  // UNE SEULE FOIS PAR INSTANCE, et à titre d'information. L'écart de version
  // est attendu — il n'est pas réglable, Stripe ne propose que ses deux
  // dernières versions à la création d'un point de terminaison — et il est sans
  // effet puisque tout est relu. En journaliser un par événement noierait les
  // vrais messages ; n'en journaliser aucun priverait d'un repère utile le jour
  // où un champ se mettra à manquer.
  if (!versionSignalee && evenement.api_version && evenement.api_version !== VERSION_API) {
    versionSignalee = true
    console.info(
      `Point de terminaison en ${evenement.api_version}, SDK figé sur ${VERSION_API} : sans effet, les objets sont relus.`,
    )
  }

  // RÉSERVATION, AVANT TOUT EFFET DE BORD. L'insertion échoue en 23505 si
  // l'événement est déjà connu : c'est le verrou. L'ancien couple « lire puis
  // écrire à la fin » laissait passer deux livraisons simultanées.
  const { error: reservation } = await admin
    .from('stripe_evenements')
    .insert({ id: evenement.id, type: evenement.type })
  if (reservation) {
    if (reservation.code === '23505') return new Response('déjà traité', { status: 200 })
    console.error('stripe-webhook : réservation impossible', evenement.id, reservation)
    return new Response('Réservation impossible', { status: 500 })
  }

  try {
    switch (evenement.type) {
      // `async_payment_succeeded` est le JUMEAU de `completed` pour les moyens de
      // paiement à notification différée (virement, prélèvement…). Sans lui, la
      // session se terminait en `payment_status: 'unpaid'`, tombait dans le
      // `default`, était marquée traitée, et le client était débité sans que
      // rien ne s'ouvre — aucun signal d'erreur nulle part.
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        // Seul l'IDENTIFIANT est lu dans l'événement ; l'objet est relu chez
        // Stripe, à notre version d'API — voir l'en-tête du fichier.
        await traiterSession((evenement.data.object as { id: string }).id)
        break
      }
      case 'checkout.session.async_payment_failed':
        console.warn('Paiement différé échoué', (evenement.data.object as { id: string }).id)
        break
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await suivreAbonnement((evenement.data.object as { id: string }).id)
        break
      case 'charge.refunded':
        await fermerSurRemboursement((evenement.data.object as { id: string }).id)
        break
      case 'charge.dispute.created':
        await fermerSurContestation((evenement.data.object as { id: string }).id)
        break
      default:
        // Les autres événements ne changent rien à l'accès.
        break
    }
  } catch (e) {
    // La réservation est LIBÉRÉE dans les deux branches. Sans ça, le rejeu de
    // Stripe — automatique ou déclenché à la main depuis le tableau de bord —
    // serait pris pour un doublon et l'événement perdu définitivement.
    const { error: liberation } = await admin.from('stripe_evenements').delete().eq('id', evenement.id)
    if (liberation) console.error('stripe-webhook : réservation non libérée', evenement.id, liberation)

    if (e instanceof ErreurDefinitive) {
      // 200 : les rejeux automatiques n'y changeraient rien. Le « Renvoyer » du
      // tableau de bord reste possible une fois la cause corrigée.
      console.error('stripe-webhook : erreur définitive, à traiter à la main', evenement.type, evenement.id, e.message)
      return new Response('erreur définitive, à reprendre à la main', { status: 200 })
    }
    console.error('stripe-webhook', evenement.type, evenement.id, e)
    return new Response('Erreur de traitement', { status: 500 })
  }

  return new Response('ok', { status: 200 })
})
