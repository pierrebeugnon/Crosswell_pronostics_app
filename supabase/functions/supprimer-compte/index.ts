// POST /functions/v1/supprimer-compte — la suppression d'un compte, et de tout
// ce qui prélèverait après lui.
//
// À déployer AVEC vérification du jeton (contrairement au webhook) : c'est le
// client connecté, et lui seul, qui supprime son compte.
//
// Corps : { confirmation: 'SUPPRIMER' } — Réponse : { ok: true } ou { message }.
//
// L'ORDRE EST LA SEULE CHOSE QUI COMPTE ICI. `public.abonnements.user_id` est en
// ON DELETE CASCADE (`db/007`) et cette table est le SEUL endroit du système où
// vivent nos identifiants Stripe. Supprimer l'utilisateur en premier, c'est
// perdre le lien avec l'abonnement qui continue de prélever. D'où :
//
//   1. lire le client Stripe dans notre base, tant qu'elle le porte encore ;
//   2. écrire la PIERRE TOMBALE (`public.suppressions_comptes`, db/011), qui
//      survit au compte et permet de reprendre si l'on s'arrête en chemin ;
//   3. ANNULER chez Stripe tous les abonnements encore vivants — et ABANDONNER
//      la suppression si l'un d'eux résiste : un compte encore là se resupprime,
//      un abonnement resté vivant sans compte ne se retrouve plus ;
//   4. supprimer le client Stripe ;
//   5. seulement alors, supprimer l'utilisateur.
//
// CE QUI N'EST PAS SUPPRIMÉ, ET POURQUOI. Les factures et les paiements restent
// chez Stripe : supprimer un client n'efface ni ses factures ni ses
// encaissements, et c'est heureux — le code de commerce (L123-22) impose de les
// conserver DIX ANS, le livre des procédures fiscales (L102 B) six ans pour le
// fisc. `public.paiements_consentements` reste aussi : sa clé passe à NULL
// (db/007) mais elle garde l'e-mail, parce que c'est la preuve de la demande
// d'accès immédiat (code de la consommation, L221-28). Les deux relèvent de
// l'article 17.3.b du RGPD — l'obligation légale — et la politique de
// confidentialité doit le dire, sans quoi elle promet ce qu'on ne fait pas.

import {
  CONFIGURATION_COMPLETE,
  abonnementsAAnnuler,
  admin,
  configurationIncomplete,
  enTetesCors,
  json,
  lireAbonnement,
  stripe,
  utilisateur,
} from '../_shared/commun.ts'

/** Ce que la pierre tombale retient d'une étape franchie. */
async function tracer(userId: string, champs: Record<string, unknown>): Promise<void> {
  const { error } = await admin
    .from('suppressions_comptes')
    .upsert({ user_id: userId, ...champs }, { onConflict: 'user_id' })
  if (error) throw error
}

/** Journaliser un échec de trace, jamais le laisser masquer l'échec réel. */
const tracerSansLever = (userId: string, champs: Record<string, unknown>) =>
  tracer(userId, champs).catch((e) => console.error('supprimer-compte : trace impossible', userId, e))

const texte = (e: unknown) => (e instanceof Error ? e.message : String(e))

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: enTetesCors(req) })
  if (req.method !== 'POST') return json(req, { message: 'Méthode non permise.' }, 405)
  if (!CONFIGURATION_COMPLETE) return configurationIncomplete(req)

  const moi = await utilisateur(req)
  if (!moi) return json(req, { message: 'Connectez-vous pour supprimer votre compte.' }, 401)

  // Une suppression ne part pas d'un appel nu : le mot est tapé par le client, à
  // l'écran, et renvoyé tel quel. C'est peu, et c'est volontairement visible —
  // la vraie garde est côté écran.
  const corps = await req.json().catch(() => null)
  if (corps?.confirmation !== 'SUPPRIMER') return json(req, { message: 'Confirmation manquante.' }, 400)

  let client: string | null = null

  // ÉTAPES 1 À 3 — tant qu'un prélèvement peut survivre, un échec arrête tout.
  try {
    const abonnement = await lireAbonnement(moi.id)
    client = abonnement?.stripe_customer_id ?? null

    // La pierre tombale AVANT le moindre appel à Stripe : c'est elle qui gardera
    // le `cus_…` quand la ligne d'abonnement aura été emportée par la cascade.
    await tracer(moi.id, { stripe_customer_id: client, demande_le: new Date().toISOString(), erreur: null })

    if (client) {
      // La liste vient de STRIPE, pas de notre colonne : elle ne garde que le
      // dernier abonnement vu, or un client qui a résilié puis repris en a eu deux.
      const existants = await stripe.subscriptions.list({ customer: client, status: 'all', limit: 100 })
      const aAnnuler = abonnementsAAnnuler(existants.data)
      for (const id of aAnnuler) {
        // IMMÉDIATEMENT, pas en fin de période : il n'y aura plus de compte pour
        // en profiter. Pas de clé d'idempotence — c'est une requête DELETE, elle
        // l'est par nature, et le filtre sur les statuts vivants empêche de
        // rejouer une annulation déjà faite.
        await stripe.subscriptions.cancel(id)
      }
      await tracer(moi.id, { abonnements_annules: aAnnuler, annule_le: new Date().toISOString() })
    }
  } catch (e) {
    console.error('supprimer-compte : annulation impossible, RIEN n’a été supprimé', moi.id, e)
    await tracerSansLever(moi.id, { erreur: `annulation : ${texte(e)}` })
    return json(
      req,
      { message: 'Nous n’avons pas pu arrêter votre abonnement, et nous n’avons donc rien supprimé. Réessayez dans un instant, ou écrivez-nous.' },
      500,
    )
  }

  // ÉTAPE 4 — à partir d'ici, plus rien ne prélève. Un échec ne doit PLUS
  // arrêter la suppression : on garderait alors le compte ET les données. On
  // trace, et l'index des suppressions inachevées (db/011) le rattrapera.
  if (client) {
    try {
      await stripe.customers.del(client)
      await tracer(moi.id, { client_supprime_le: new Date().toISOString() })
    } catch (e) {
      console.error('supprimer-compte : client Stripe NON supprimé, à reprendre à la main', client, e)
      await tracerSansLever(moi.id, { erreur: `client Stripe : ${texte(e)}` })
    }
  }

  // ÉTAPE 5 — LE COMPTE, EN DERNIER. La cascade de db/007 emporte `abonnements`,
  // celle de db/010 `comptes_internes`. `paiements_consentements` passe à NULL
  // et reste : c'est une preuve, elle ne nous appartient pas.
  const { error } = await admin.auth.admin.deleteUser(moi.id)
  if (error) {
    console.error('supprimer-compte : utilisateur NON supprimé', moi.id, error)
    await tracerSansLever(moi.id, { erreur: `compte : ${error.message}` })
    return json(
      req,
      { message: 'Votre abonnement est arrêté et ne sera plus prélevé, mais le compte n’a pas pu être supprimé. Écrivez-nous : nous terminons à la main.' },
      500,
    )
  }
  await tracerSansLever(moi.id, { compte_supprime_le: new Date().toISOString(), erreur: null })

  return json(req, { ok: true })
})