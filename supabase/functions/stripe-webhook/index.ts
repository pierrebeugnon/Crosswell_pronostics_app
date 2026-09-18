// POST /functions/v1/stripe-webhook — les notifications de Stripe. C'EST ICI, et
// nulle part ailleurs, que l'accès s'ouvre ou se ferme (`public.abonnements`).
//
// À déployer SANS vérification de jeton (`--no-verify-jwt`) : Stripe n'a pas de
// session Supabase. La signature Stripe (`STRIPE_WEBHOOK_SECRET`) en tient lieu,
// et toute requête qui ne la porte pas est refusée.
//
// Événements à abonner dans Stripe : checkout.session.completed,
// customer.subscription.created, customer.subscription.updated,
// customer.subscription.deleted.

import Stripe from 'npm:stripe@16.12.0'
import { admin, exiger, lireAbonnement, stripe, type LigneAbonnement, type Pass } from '../_shared/commun.ts'

const cryptographie = Stripe.createSubtleCryptoProvider()
const JOUR_MS = 24 * 3_600_000

type Statut = LigneAbonnement['statut']

/** L'état Stripe d'un abonnement, dans notre vocabulaire. */
function statutDe(s: Stripe.Subscription): Statut {
  if (s.status === 'active' || s.status === 'trialing') return s.cancel_at_period_end ? 'resiliation_programmee' : 'actif'
  if (s.status === 'past_due' || s.status === 'unpaid') return 'impaye'
  if (s.status === 'incomplete') return 'aucun'
  return 'expire' // canceled, incomplete_expired, paused
}

async function compteDe(clientStripe: string, metadata: Stripe.Metadata | null): Promise<string | null> {
  if (metadata?.user_id) return metadata.user_id
  const { data } = await admin.from('abonnements').select('user_id').eq('stripe_customer_id', clientStripe).maybeSingle()
  return data?.user_id ?? null
}

async function enregistrer(ligne: Partial<LigneAbonnement> & { user_id: string }) {
  const { error } = await admin
    .from('abonnements')
    .upsert({ ...ligne, mis_a_jour_le: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw error
}

/** Un abonnement mensuel ou annuel créé, renouvelé, résilié, impayé ou terminé. */
async function suivreAbonnement(s: Stripe.Subscription) {
  const client = typeof s.customer === 'string' ? s.customer : s.customer.id
  const userId = await compteDe(client, s.metadata)
  if (!userId) throw new Error(`Abonnement ${s.id} sans compte associé`)
  const formule = (s.metadata?.formule === 'an' ? 'an' : 'mois') as Pass
  const statut = statutDe(s)
  const fin = statut === 'expire' && s.ended_at ? s.ended_at : s.current_period_end
  await enregistrer({
    user_id: userId,
    formule,
    statut,
    acces_jusqua: new Date(fin * 1000).toISOString(),
    stripe_customer_id: client,
    stripe_subscription_id: s.id,
  })
}

/**
 * Un Pass 1 jour payé : vingt-quatre heures à partir de l'ACTIVATION. Un
 * webhook reçu en retard (Stripe réessaie pendant des heures) ne mange pas le
 * Pass du client.
 */
async function ouvrirPassJour(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id ?? session.metadata?.user_id
  if (!userId) throw new Error(`Session ${session.id} sans compte associé`)
  const actuel = await lireAbonnement(userId)
  // Un abonnement en cours va plus loin qu'un Pass 1 jour : on ne le rétrograde pas.
  if (actuel && (actuel.formule === 'mois' || actuel.formule === 'an') && (actuel.statut === 'actif' || actuel.statut === 'resiliation_programmee')) {
    console.warn('Pass 1 jour payé pendant un abonnement en cours', session.id)
    return
  }
  const fin = new Date(Date.now() + JOUR_MS)
  // Un Pass encore valide se prolonge au lieu d'être écrasé.
  const finActuelle = actuel?.formule === 'jour' && actuel.acces_jusqua ? new Date(actuel.acces_jusqua) : null
  const nouvelleFin = finActuelle && finActuelle > new Date() ? new Date(finActuelle.getTime() + JOUR_MS) : fin
  await enregistrer({
    user_id: userId,
    formule: 'jour',
    statut: 'actif',
    acces_jusqua: nouvelleFin.toISOString(),
    stripe_customer_id: typeof session.customer === 'string' ? session.customer : (session.customer?.id ?? null),
  })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Méthode non permise', { status: 405 })

  const signature = req.headers.get('stripe-signature')
  const corps = await req.text()
  let evenement: Stripe.Event
  try {
    evenement = await stripe.webhooks.constructEventAsync(corps, signature ?? '', exiger('STRIPE_WEBHOOK_SECRET'), undefined, cryptographie)
  } catch (e) {
    console.error('Signature Stripe refusée', e)
    return new Response('Signature invalide', { status: 400 })
  }

  // Déjà traité : Stripe le renvoie parfois, on ne l'applique qu'une fois.
  const { data: deja } = await admin.from('stripe_evenements').select('id').eq('id', evenement.id).maybeSingle()
  if (deja) return new Response('déjà traité', { status: 200 })

  try {
    switch (evenement.type) {
      case 'checkout.session.completed': {
        const session = evenement.data.object as Stripe.Checkout.Session
        if (session.mode === 'payment' && session.payment_status === 'paid' && session.metadata?.formule === 'jour') {
          await ouvrirPassJour(session)
        } else if (session.mode === 'subscription' && session.subscription) {
          const id = typeof session.subscription === 'string' ? session.subscription : session.subscription.id
          await suivreAbonnement(await stripe.subscriptions.retrieve(id))
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await suivreAbonnement(evenement.data.object as Stripe.Subscription)
        break
      default:
        // Les autres événements ne changent rien à l'accès.
        break
    }
  } catch (e) {
    // 500 : Stripe renverra l'événement plus tard, et il n'est pas marqué traité.
    console.error('stripe-webhook', evenement.type, evenement.id, e)
    return new Response('Erreur de traitement', { status: 500 })
  }

  await admin.from('stripe_evenements').insert({ id: evenement.id, type: evenement.type })
  return new Response('ok', { status: 200 })
})
