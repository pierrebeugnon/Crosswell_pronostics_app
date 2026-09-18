# Fonctions Stripe — Crosswell Pronostics

Trois fonctions Supabase (Deno), écrites le 18/09/2026 et **non déployées** tant que le
fondateur ne l'a pas validé. Elles supposent la migration `db/007_abonnements_et_acces.sql`
appliquée (tables `abonnements`, `paiements_consentements`, `stripe_evenements`).

| Fonction | Appelée par | Rôle |
| --- | --- | --- |
| `paiement-session` | l'étape Paiement de l'inscription (`src/services/paiement.ts`) | Crée la page de paiement Stripe Checkout d'un Pass, garde la preuve du consentement. |
| `stripe-webhook` | Stripe | **Seule à ouvrir ou fermer l'accès** (`public.abonnements`), sur événement signé. |
| `portail-stripe` | la page Compte (`src/services/paiement.ts`) | Ouvre le portail client Stripe : carte, factures, **résiliation en ligne** (L215-1-1). |

Principes : aucune donnée de carte ne passe par l'app (pages hébergées par Stripe) ; la clé
secrète ne vit que dans les secrets Supabase ; une adresse de retour « succès » ne prouve
aucun paiement, seul le webhook fait foi.

## Mise en place (à faire par le fondateur)

1. **Stripe, mode test d'abord.** Créer trois produits et leurs prix TTC en euros :
   - Pass 1 jour : 4,99 €, **paiement unique** ;
   - Pass mensuel : 12,99 €, **récurrent, mensuel** ;
   - Pass annuel : 99 €, **récurrent, annuel**.
2. **Portail client** (Stripe → Paramètres → Facturation → Portail client) : autoriser la
   résiliation (à la fin de la période), la mise à jour de la carte et l'historique des
   factures.
3. **Webhook** (Stripe → Développeurs → Webhooks) : point de terminaison
   `https://erwypjqonrhwofzdbnbo.supabase.co/functions/v1/stripe-webhook`, événements
   `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`. Noter le secret de
   signature (`whsec_…`).
4. **Secrets Supabase** (Tableau de bord → Edge Functions → Secrets), saisis par le
   fondateur lui-même :

   | Secret | Valeur |
   | --- | --- |
   | `STRIPE_SECRET_KEY` | `sk_test_…` puis `sk_live_…` |
   | `STRIPE_WEBHOOK_SECRET` | `whsec_…` |
   | `STRIPE_PRIX_JOUR` / `STRIPE_PRIX_MOIS` / `STRIPE_PRIX_AN` | les identifiants `price_…` |
   | `APP_URL` | les origines de l'app, séparées par des virgules : `https://crosswell-pronostics.vercel.app,http://localhost:5190` |

   `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont fournis d'office aux fonctions.
5. **Déploiement** (Supabase CLI) :

   ```bash
   supabase functions deploy paiement-session --project-ref erwypjqonrhwofzdbnbo
   supabase functions deploy portail-stripe --project-ref erwypjqonrhwofzdbnbo
   supabase functions deploy stripe-webhook --project-ref erwypjqonrhwofzdbnbo --no-verify-jwt
   ```

   `--no-verify-jwt` pour le webhook SEULEMENT : Stripe n'a pas de session Supabase, la
   signature Stripe en tient lieu. Les deux autres exigent le jeton du client.

## Essayer en mode test

Carte `4242 4242 4242 4242`, n'importe quelle date future et n'importe quel cryptogramme.
Après le paiement, la ligne du compte dans `public.abonnements` doit passer à `actif` en
quelques secondes, et l'app débloquer toutes les courses. Les événements se rejouent depuis
le tableau de bord Stripe ; `stripe_evenements` empêche qu'ils s'appliquent deux fois.

## Avant de passer en mode réel

- Conditions générales de vente publiées sur le site (`/cgu`), textes de consentement
  (`src/lib/inscription.ts`, `texteConsentement`) validés par un juriste.
- Confirmer auprès de Stripe que l'activité (analyses statistiques hippiques, sans prise de
  pari ni gain) est acceptée : voir la note « Abonnement et paiement » du projet.
- Les e-mails de confirmation (reçus Stripe, rappel avant le renouvellement annuel) :
  activer les reçus et les rappels de renouvellement dans les paramètres Stripe.
