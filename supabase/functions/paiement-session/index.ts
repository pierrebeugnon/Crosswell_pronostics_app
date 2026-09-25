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
  CONFIGURATION_COMPLETE,
  PASS,
  abonnementEnCours,
  abonnementImpaye,
  admin,
  adresseAutorisee,
  configurationIncomplete,
  enTetesCors,
  json,
  lireAbonnement,
  prixStripe,
  stripe,
  texteConsentement,
  utilisateur,
  verifierTarif,
  verifierTva,
  type Pass,
} from '../_shared/commun.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: enTetesCors(req) })
  if (req.method !== 'POST') return json(req, { message: 'Méthode non permise.' }, 405)
  // Avant tout le reste : une `APP_URL` absente rendrait toutes les adresses de
  // retour « refusées », ce qui enverrait chercher un défaut côté application.
  if (!CONFIGURATION_COMPLETE) return configurationIncomplete(req)

  try {
    const moi = await utilisateur(req)
    if (!moi) return json(req, { message: 'Connectez-vous pour payer.' }, 401)

    const corps = await req.json().catch(() => null)
    const formule = corps?.formule as Pass
    if (!PASS.includes(formule)) return json(req, { message: 'Formule inconnue.' }, 400)
    if (corps?.consentement?.demandeAccesImmediat !== true) {
      return json(req, { message: 'La demande d’accès immédiat est requise.' }, 400)
    }
    if (!adresseAutorisee(corps?.retour) || !adresseAutorisee(corps?.annulation)) {
      return json(req, { message: 'Adresse de retour refusée.' }, 400)
    }

    // LA PREUVE EST ÉCRITE PAR LE SERVEUR, jamais par le navigateur. Le texte
    // envoyé par le client ne sert plus qu'à détecter une dérive entre les deux.
    const formulation = texteConsentement(formule)
    if (typeof corps?.consentement?.formulation === 'string' && corps.consentement.formulation !== formulation) {
      console.warn('Texte de consentement du client différent de celui du serveur : src/lib/inscription.ts a dérivé.')
    }

    // Ce que Stripe facture doit être ce que l'application affiche. Contrôlé une
    // fois par instance, avant d'envoyer qui que ce soit sur une page de paiement.
    await verifierTarif(formule)

    // ET LA TVA DOIT ÊTRE COLLECTABLE. Stripe Tax mal réglé calcule zéro sans
    // rien dire : on encaisserait du TTC sans jamais rien ventiler. Bloquant en
    // mode réel seulement — un bac à sable doit rester utilisable.
    await verifierTva()

    const abonnement = await lireAbonnement(moi.id)
    if (abonnementImpaye(abonnement)) {
      return json(
        req,
        { message: 'Votre abonnement est en attente de paiement : mettez votre carte à jour depuis Mon compte plutôt que d’en reprendre un.' },
        409,
      )
    }
    if (abonnementEnCours(abonnement)) {
      return json(req, { message: 'Vous avez déjà un abonnement en cours : gérez-le depuis Mon compte.' }, 409)
    }

    /*
     * LE PASS 1 JOUR NE SE FACTURE PAS PAR-DESSUS UN ABONNEMENT.
     *
     * Décision du fondateur, 20/09/2026 : on EMPÊCHE le paiement plutôt que de
     * rembourser après coup. Le garde ci-dessus lit NOTRE base, que seul le
     * webhook remplit : entre le paiement d'un abonnement et l'arrivée de
     * l'événement, elle ne sait encore rien. On interroge donc Stripe, qui, lui,
     * fait foi — et seulement pour le Pass 1 jour, le seul cas où l'on
     * encaisserait sans rien ouvrir de plus.
     */
    if (formule === 'jour' && abonnement?.stripe_customer_id) {
      const existants = await stripe.subscriptions.list({
        customer: abonnement.stripe_customer_id,
        status: 'all',
        limit: 10,
      })
      const vivant = existants.data.find((s) =>
        ['active', 'trialing', 'past_due', 'unpaid'].includes(s.status),
      )
      if (vivant) {
        return json(
          req,
          { message: 'Votre abonnement couvre déjà toutes les courses : un Pass 1 jour n’y ajouterait rien. Gérez-le depuis Mon compte.' },
          409,
        )
      }
    }

    // Le client Stripe du compte, créé une fois et gardé. La clé d'idempotence
    // est stable par compte : deux appels simultanés ne créent qu'un client.
    let client = abonnement?.stripe_customer_id ?? null
    if (!client) {
      const c = await stripe.customers.create(
        { email: moi.email, metadata: { user_id: moi.id } },
        { idempotencyKey: `client-${moi.id}` },
      )
      client = c.id
      const { error } = await admin
        .from('abonnements')
        .upsert({ user_id: moi.id, stripe_customer_id: client, mis_a_jour_le: new Date().toISOString() }, { onConflict: 'user_id' })
      if (error) throw error
    }

    const metadata = { user_id: moi.id, formule }
    const retour = `${corps.retour}${corps.retour.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`
    // FENÊTRE D'IDEMPOTENCE DE CINQ MINUTES. Deux onglets ouverts sur la page de
    // paiement créaient deux sessions, donc deux abonnements à 12,99 €, dont un
    // seul arrivait dans notre base : le second facturait dans le vide. Une clé
    // stable par compte et par formule bloquerait en revanche un second achat
    // légitime — un Pass 1 jour se rachète pour prolonger. D'où le seau de temps.
    const seau = Math.floor(Date.now() / 300_000)
    const session = await stripe.checkout.sessions.create(
      {
        mode: formule === 'jour' ? 'payment' : 'subscription',
        customer: client,
        client_reference_id: moi.id,
        line_items: [{ price: prixStripe(formule), quantity: 1 }],
        success_url: retour,
        cancel_url: corps.annulation,
        locale: 'fr',
        metadata,
        /*
         * LA TVA SE CALCULE CHEZ STRIPE, PAS CHEZ NOUS.
         *
         * Les deux modes en ont besoin, pour deux raisons différentes :
         * - `payment` (Pass 1 jour) émet une facture (`invoice_creation` plus
         *   bas), et une facture doit ventiler la taxe ;
         * - `subscription` transmet le réglage à l'abonnement créé, donc à tous
         *   ses renouvellements. C'est le seul endroit où on peut le poser : le
         *   deuxième mois se facture sans nous.
         *
         * Les tarifs étant en « taxe incluse » (`verifierTarif` le refuse
         * autrement en mode réel), le total encaissé reste 4,99 / 12,99 / 99 € :
         * la TVA est prise DEDANS, elle ne s'ajoute pas au prix annoncé.
         */
        automatic_tax: { enabled: true },
        /*
         * SANS CECI, L'ADRESSE SAISIE À LA CAISSE EST JETÉE. Le client Stripe
         * est créé avec l'e-mail seul ; Checkout demande le pays (et le code
         * postal avec la carte), ce qui suffit à déterminer le taux dans l'UE,
         * mais ne l'écrit sur le client que si on l'y autorise. Or les factures
         * de renouvellement se calculent sur l'adresse DU CLIENT : sans elle,
         * le deuxième mois partirait sans TVA. `name` suit la même logique :
         * une facture porte le nom de l'acheteur.
         *
         * Pas de `billing_address_collection: 'required'` : avec le calcul
         * automatique, Checkout demande déjà ce qu'il lui faut, et la TVA se
         * décide au pays. Trois champs de plus n'y changeraient rien.
         */
        customer_update: { address: 'auto', name: 'auto' },
        // Environ une heure, au lieu des vingt-quatre par défaut. Une page de
        // paiement laissée ouverte reste payable : un client pouvait ouvrir un
        // Pass 1 jour, souscrire un abonnement, puis revenir payer l'ancienne
        // page — et le contrôle ci-dessus, fait à la création, n'y pouvait rien.
        //
        // DÉRIVÉ DU SEAU, pas de `Date.now()`. Calculée à la seconde, cette
        // valeur changeait entre deux appels partageant la même clé
        // d'idempotence : Stripe refuse une clé rejouée avec des paramètres
        // différents, et le client recevait un 500 générique. Ici, tous les
        // appels d'un même seau produisent exactement la même requête.
        expires_at: seau * 300 + 3_600,
        ...(formule === 'jour'
          ? { invoice_creation: { enabled: true }, payment_intent_data: { metadata } }
          : { subscription_data: { metadata } }),
      },
      { idempotencyKey: `session-${moi.id}-${formule}-${seau}` },
    )

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
