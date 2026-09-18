// POST /functions/v1/paiement-session — ouvre la page de paiement Stripe
// (Checkout, hébergée par Stripe) pour un Pass. Appelée par l'étape « Paiement »
// de l'inscription (`src/services/paiement.ts`), avec le jeton de session du client.
//
// Corps : { formule: 'jour'|'mois'|'an', consentement: { demandeAccesImmediat: true,
//           formulation: string }, retour: string, annulation: string }
// Réponse : { url } — ou { message } avec un statut d'erreur.
//
// Rien n'est activé ici : c'est le webhook (`stripe-webhook`) qui ouvre l'accès,
// sur la confirmation de Stripe. Une adresse de retour ne prouve aucun paiement.

import {
  PASS,
  abonnementEnCours,
  admin,
  adresseAutorisee,
  enTetesCors,
  json,
  lireAbonnement,
  prixStripe,
  stripe,
  utilisateur,
  type Pass,
} from '../_shared/commun.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: enTetesCors(req) })
  if (req.method !== 'POST') return json(req, { message: 'Méthode non permise.' }, 405)

  try {
    const moi = await utilisateur(req)
    if (!moi) return json(req, { message: 'Connectez-vous pour payer.' }, 401)

    const corps = await req.json().catch(() => null)
    const formule = corps?.formule as Pass
    const formulation = corps?.consentement?.formulation
    if (!PASS.includes(formule)) return json(req, { message: 'Formule inconnue.' }, 400)
    if (corps?.consentement?.demandeAccesImmediat !== true || typeof formulation !== 'string' || formulation.length < 40) {
      return json(req, { message: 'La demande d’accès immédiat est requise.' }, 400)
    }
    if (!adresseAutorisee(corps?.retour) || !adresseAutorisee(corps?.annulation)) {
      return json(req, { message: 'Adresse de retour refusée.' }, 400)
    }

    const abonnement = await lireAbonnement(moi.id)
    if (abonnementEnCours(abonnement)) {
      return json(req, { message: 'Vous avez déjà un abonnement en cours : gérez-le depuis Mon compte.' }, 409)
    }

    // Le client Stripe du compte, créé une fois et gardé.
    let client = abonnement?.stripe_customer_id ?? null
    if (!client) {
      const c = await stripe.customers.create({ email: moi.email, metadata: { user_id: moi.id } })
      client = c.id
      const { error } = await admin
        .from('abonnements')
        .upsert({ user_id: moi.id, stripe_customer_id: client, mis_a_jour_le: new Date().toISOString() }, { onConflict: 'user_id' })
      if (error) throw error
    }

    const metadata = { user_id: moi.id, formule }
    const retour = `${corps.retour}${corps.retour.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`
    const session = await stripe.checkout.sessions.create({
      mode: formule === 'jour' ? 'payment' : 'subscription',
      customer: client,
      client_reference_id: moi.id,
      line_items: [{ price: prixStripe(formule), quantity: 1 }],
      success_url: retour,
      cancel_url: corps.annulation,
      locale: 'fr',
      metadata,
      ...(formule === 'jour'
        ? { invoice_creation: { enabled: true }, payment_intent_data: { metadata } }
        : { subscription_data: { metadata } }),
    })

    // La preuve de la demande d'accès immédiat, texte exact et horodaté.
    const { error: erreurConsentement } = await admin.from('paiements_consentements').insert({
      user_id: moi.id,
      email: moi.email,
      formule,
      formulation,
      stripe_session_id: session.id,
    })
    if (erreurConsentement) throw erreurConsentement

    return json(req, { url: session.url })
  } catch (e) {
    console.error('paiement-session', e)
    return json(req, { message: 'Le paiement n’a pas pu démarrer. Réessayez dans un instant.' }, 500)
  }
})
