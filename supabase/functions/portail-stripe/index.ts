// POST /functions/v1/portail-stripe — ouvre le portail client Stripe : carte,
// factures, résiliation. La résiliation en ligne, en quelques clics et sans
// obstacle, est une obligation (Code de la consommation, L215-1-1) : c'est ce
// portail qui la porte, depuis la page Compte.
//
// Corps : { retour: string } — Réponse : { url } ou { message }.

import {
  CONFIGURATION_COMPLETE,
  adresseAutorisee,
  configurationIncomplete,
  enTetesCors,
  json,
  lireAbonnement,
  stripe,
  utilisateur,
} from '../_shared/commun.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: enTetesCors(req) })
  if (req.method !== 'POST') return json(req, { message: 'Méthode non permise.' }, 405)
  if (!CONFIGURATION_COMPLETE) return configurationIncomplete(req)

  try {
    const moi = await utilisateur(req)
    if (!moi) return json(req, { message: 'Connectez-vous pour gérer votre abonnement.' }, 401)
    const corps = await req.json().catch(() => null)
    if (!adresseAutorisee(corps?.retour)) return json(req, { message: 'Adresse de retour refusée.' }, 400)

    const abonnement = await lireAbonnement(moi.id)
    if (!abonnement?.stripe_customer_id) {
      return json(req, { message: 'Aucun paiement Stripe n’est rattaché à ce compte.' }, 404)
    }

    // L'INTENTION MÈNE DIRECTEMENT À L'ÉCRAN VOULU. Sans `flow_data`, « Gérer
    // mon abonnement » et « Résilier en ligne » ouvraient exactement la même
    // page d'accueil du portail, à charge pour le client de trouver la sortie.
    // L215-1-1 demande une résiliation accessible « en quelques clics » : elle
    // doit donc être le PREMIER écran quand c'est ce qu'on a demandé.
    const resilier = corps?.intention === 'resilier' && Boolean(abonnement.stripe_subscription_id)

    const portail = await stripe.billingPortal.sessions.create({
      customer: abonnement.stripe_customer_id,
      return_url: corps.retour,
      locale: 'fr',
      ...(resilier
        ? {
            flow_data: {
              type: 'subscription_cancel' as const,
              subscription_cancel: { subscription: abonnement.stripe_subscription_id! },
              after_completion: { type: 'redirect' as const, redirect: { return_url: corps.retour } },
            },
          }
        : {}),
    })
    return json(req, { url: portail.url })
  } catch (e) {
    console.error('portail-stripe', e)
    return json(req, { message: 'Le portail de paiement n’a pas pu s’ouvrir. Réessayez dans un instant.' }, 500)
  }
})
