// POST /functions/v1/portail-stripe — ouvre le portail client Stripe : carte,
// factures, résiliation. La résiliation en ligne, en quelques clics et sans
// obstacle, est une obligation (Code de la consommation, L215-1-1) : c'est ce
// portail qui la porte, depuis la page Compte.
//
// Corps : { retour: string } — Réponse : { url } ou { message }.

import { adresseAutorisee, enTetesCors, json, lireAbonnement, stripe, utilisateur } from '../_shared/commun.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: enTetesCors(req) })
  if (req.method !== 'POST') return json(req, { message: 'Méthode non permise.' }, 405)

  try {
    const moi = await utilisateur(req)
    if (!moi) return json(req, { message: 'Connectez-vous pour gérer votre abonnement.' }, 401)
    const corps = await req.json().catch(() => null)
    if (!adresseAutorisee(corps?.retour)) return json(req, { message: 'Adresse de retour refusée.' }, 400)

    const abonnement = await lireAbonnement(moi.id)
    if (!abonnement?.stripe_customer_id) {
      return json(req, { message: 'Aucun paiement Stripe n’est rattaché à ce compte.' }, 404)
    }
    const portail = await stripe.billingPortal.sessions.create({
      customer: abonnement.stripe_customer_id,
      return_url: corps.retour,
      locale: 'fr',
    })
    return json(req, { url: portail.url })
  } catch (e) {
    console.error('portail-stripe', e)
    return json(req, { message: 'Le portail de paiement n’a pas pu s’ouvrir. Réessayez dans un instant.' }, 500)
  }
})
