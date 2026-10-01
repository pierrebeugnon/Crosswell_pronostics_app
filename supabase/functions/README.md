# Fonctions Stripe — Crosswell Pronostics

Trois fonctions Supabase (Deno), écrites le 18/09/2026 et **non déployées** tant que le
fondateur ne l'a pas validé. Elles supposent la migration `db/007_abonnements_et_acces.sql`
appliquée (tables `abonnements`, `paiements_consentements`, `stripe_evenements`).

| Fonction | Appelée par | Rôle |
| --- | --- | --- |
| `paiement-session` | l'étape Paiement de l'inscription (`src/services/paiement.ts`) | Crée la page de paiement Stripe Checkout d'un Pass, garde la preuve du consentement. |
| `stripe-webhook` | Stripe | **Seule à ouvrir ou fermer l'accès** (`public.abonnements`), sur événement signé. |
| `portail-stripe` | la page Compte (`src/services/paiement.ts`) | Ouvre le portail client Stripe : carte, factures, **résiliation en ligne** (L215-1-1). |
| `supprimer-compte` | la page Compte (`src/services/compte.ts`) | Annule les abonnements Stripe, supprime le client, **puis** le compte — dans cet ordre (`db/011`). |

**L'ordre de `supprimer-compte` n'est pas une préférence.** `public.abonnements.user_id` est
en ON DELETE CASCADE et cette table est le seul endroit où vivent `stripe_customer_id` et
`stripe_subscription_id` : supprimer l'utilisateur en premier, c'est perdre le lien avec un
abonnement qui continue de prélever. Si l'annulation échoue, la fonction NE SUPPRIME RIEN —
un compte encore là se resupprime, un abonnement orphelin ne se retrouve plus. Ce qui reste
chez Stripe après coup, factures et encaissements, y reste exprès : dix ans (code de
commerce, L123-22).

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
   `https://erwypjqonrhwofzdbnbo.supabase.co/functions/v1/stripe-webhook`. Noter le secret
   de signature (`whsec_…`).

   Les **huit** événements à abonner :

   | Événement | Pourquoi |
   | --- | --- |
   | `checkout.session.completed` | le paiement abouti — ouvre l'accès |
   | `checkout.session.async_payment_succeeded` | son jumeau pour les moyens à notification différée. **Sans lui, un virement encaissé n'ouvre rien** |
   | `checkout.session.async_payment_failed` | pour tracer l'échec d'un paiement différé |
   | `customer.subscription.created` / `.updated` / `.deleted` | l'état de l'abonnement |
   | `charge.refunded` | un Pass 1 jour remboursé doit cesser d'ouvrir l'accès |
   | `charge.dispute.created` | tracé, pas tranché : couper l'accès sur contestation est une décision commerciale |

   **La version d'API du point de terminaison n'a pas à être réglée, et ne peut pas
   l'être.** Stripe ne propose, à la création, que sa version courante et la
   précédente — `2024-06-20`, celle du SDK, n'est plus sélectionnable — et le champ
   n'est pas modifiable après coup (l'API refuse le paramètre, vérifié le 20/09/2026).
   Le point de terminaison de test est en `2026-08-26.dahlia`.

   **C'est sans conséquence**, parce que le webhook ne lit QUE l'identifiant dans
   l'événement et relit chaque objet chez Stripe, qui le rend alors dans la forme du
   SDK. Ne pas « optimiser » en lisant les champs directement dans la charge utile :
   c'est exactement ce qui faisait planter tous les renouvellements avant le
   20/09/2026, `current_period_end` ayant migré sur les éléments de l'abonnement.
4. **Secrets Supabase** (Tableau de bord → Edge Functions → Secrets), saisis par le
   fondateur lui-même :

   | Secret | Valeur |
   | --- | --- |
   | `STRIPE_SECRET_KEY` | `sk_test_…` puis `sk_live_…` |
   | `STRIPE_WEBHOOK_SECRET` | `whsec_…` |
   | `STRIPE_PRIX_JOUR` / `STRIPE_PRIX_MOIS` / `STRIPE_PRIX_AN` | les identifiants `price_…` |
   | `APP_URL` | les origines de l'app, séparées par des virgules. **En production, sans `localhost`** : cette liste sert aussi bien aux adresses de retour qu'aux en-têtes CORS, et y laisser `http://localhost:5190` revient à autoriser une page locale à parler à la fonction. En test : `https://crosswell-pronostics.vercel.app,http://localhost:5190` — en réel : `https://crosswell-pronostics.vercel.app` seul. |

   `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont fournis d'office aux fonctions.
5. **Déploiement** (Supabase CLI) :

   ```bash
   supabase functions deploy paiement-session --project-ref erwypjqonrhwofzdbnbo
   supabase functions deploy portail-stripe --project-ref erwypjqonrhwofzdbnbo
   supabase functions deploy supprimer-compte --project-ref erwypjqonrhwofzdbnbo
   supabase functions deploy stripe-webhook --project-ref erwypjqonrhwofzdbnbo --no-verify-jwt
   ```

   `--no-verify-jwt` pour le webhook SEULEMENT : Stripe n'a pas de session Supabase, la
   signature Stripe en tient lieu. Les trois autres exigent le jeton du client —
   `supprimer-compte` plus que tout autre.

   `supprimer-compte` suppose la migration `db/011_suppression_compte.sql` APPLIQUÉE :
   sans la table `public.suppressions_comptes`, la fonction s'arrête avant d'avoir rien
   touché (et c'est le bon sens de l'échec, mais plus aucune suppression ne passe).

## Deux règles tranchées par le fondateur le 20/09/2026

**Un Pass 1 jour ne se vend pas par-dessus un abonnement.** On EMPÊCHE le paiement, on ne
rembourse pas après coup. Deux gardes : celui de notre base (`abonnementEnCours`), et un
appel à Stripe pour le seul Pass 1 jour, parce que notre base ne sait rien tant que le
webhook n'est pas passé. Les pages de paiement expirent en une heure, pour qu'une page
laissée ouverte ne soit pas payée après coup.

**Pas de période de grâce sur un impayé : on coupe.** `db/007` ne rouvre pas l'accès sur
`impaye`, et c'est voulu. Les textes de la page Compte le disent désormais (« l'accès est
suspendu ») au lieu de promettre le contraire. Une contestation de paiement coupe également.

> Limite connue de la contestation : rien ne marque la ligne comme contestée, donc un
> événement d'abonnement ultérieur peut rouvrir l'accès. Le journal l'annonce en capitales.
> Le correctif durable est une colonne dédiée — à prévoir dans `db/008`.

## Où vivent les règles — et pourquoi elles n'ont pas d'entrée-sortie

`_shared/regles.ts` **n'importe rien** : ni Stripe, ni Supabase, ni `Deno`. C'est la condition
pour qu'il soit exécutable à la fois par les fonctions Edge et par la suite de tests de
l'application, sous Node. Les `index.ts` ne font plus que du transport : ils lisent
l'événement, vont chercher l'état chez Stripe et en base, passent le tout à une fonction
`decision…`, et écrivent ce qu'elle rend.

Ce n'est pas un goût d'architecture. Ce code touche à de l'argent et n'avait **aucun test**,
parce qu'il était inséparable de ses appels réseau. Une décision qui se calcule à partir d'un
état et rend un autre état se vérifie ; un `await` au milieu d'un `if`, non.

> **Règle pour la suite :** toute condition qui décide d'ouvrir, de fermer ou de facturer va
> dans `regles.ts`, avec son test. Un `index.ts` ne doit contenir que du transport.

## Vérifier avant de déployer

Trois contrôles, aucun ne remplace les deux autres.

```bash
npm test                    # les règles de facturation + la parité des tarifs
npm run typecheck           # l'application (ne couvre PAS supabase/, qui est du Deno)
cd supabase/functions && deno check --node-modules-dir=auto \
  stripe-webhook/index.ts paiement-session/index.ts portail-stripe/index.ts
```

`tests/stripe/` contient deux fichiers :

| Fichier | Ce qu'il tient |
| --- | --- |
| `regles.test.ts` | chaque décision, cas par cas. Les tests marqués `RÉGRESSION` correspondent à un défaut réellement trouvé en relecture : ils sont là pour qu'il ne revienne pas. |
| `parite.test.ts` | les tarifs et les textes de consentement, égaux entre `src/config/formules.ts`, `site/src/config/site.ts` et `regles.ts`. Écrit après qu'une espace insécable a fait diverger le serveur du client d'un seul caractère. |

Le quatrième porteur des tarifs, **Stripe**, est hors du dépôt : `verifierTarif` le compare à
l'exécution, avant d'ouvrir une page de paiement.

**Ce que ces tests ne prouvent pas :** rien du transport — signature, réservation,
déploiement, réseau. Seul le parcours complet en mode test le montre.

## Essayer en mode test

Carte `4242 4242 4242 4242`, n'importe quelle date future et n'importe quel cryptogramme.
Après le paiement, la ligne du compte dans `public.abonnements` doit passer à `actif` en
quelques secondes, et l'app débloquer toutes les courses. Les événements se rejouent depuis
le tableau de bord Stripe ; `stripe_evenements` empêche qu'ils s'appliquent deux fois.

## Passer en mode réel — la marche à suivre (25/09/2026)

**Rien ne se copie d'un bac à sable vers le mode réel** : produits, tarifs, portail, webhook et
clés sont propres à chaque environnement. Les `price_…` créés le 20/09 sont ceux du bac à sable
et feront échouer `verifierTarif` en production. Tout ce qui suit est saisi PAR LE FONDATEUR :
aucune clé, aucun secret, aucune coordonnée bancaire ne passe par une conversation ni par le
dépôt.

L'identité à déclarer, relevée au registre et vérifiée le 25/09/2026 : **CROSSWELL**, SAS au
capital de 1 €, 47 rue Vivienne 75002 Paris, SIREN 105 309 322, SIRET 105 309 322 00011, TVA
**FR45 105 309 322**, APE 62.01Z. L'objet social des statuts couvre la vente d'analyses par
abonnement (vérifié par le fondateur).

1. **Le site doit être examinable.** Stripe regarde le site avant d'activer un compte : CGV,
   tarifs, mentions légales et résiliation en ligne doivent être visibles à l'adresse déclarée.
2. **Activer le compte réel** (identité du représentant, bénéficiaires effectifs, pièce
   d'identité, compte bancaire de versement).
3. **Décrire l'activité** avec le texte ci-dessous, mot pour mot. **Catégorie retenue le
   01/10/2026 : logiciel en tant que service (SaaS)** — cohérente avec le code APE 62.01Z, et
   c'est bien un accès applicatif récurrent qui est vendu. Jamais « conseil » (nos propres CGV
   l'excluent, et c'est la lecture qui mène à la requalification en pronostics payants), jamais
   « jeux d'argent et paris ». Libellé sur le relevé bancaire : `CROSSWELL` (un libellé illisible
   produit des contestations, et une contestation coupe l'accès sans période de grâce).
4. **Obtenir de Stripe une confirmation ÉCRITE** de l'acceptation et du code d'activité (MCC),
   AVANT le premier euro. Le risque n'est pas le refus : c'est l'acceptation suivie d'une
   requalification, compte gelé et fonds retenus, avec des abonnés payants en face.
   Voir `docs/stripe-declaration-activite.md`.
5. **Créer les trois produits et leurs tarifs**, en euros, avec l'option **« taxe incluse dans
   le prix »** — réglage IMMUABLE après création, un tarif mal réglé se remplace :
   Pass 1 jour 4,99 € en paiement unique (499), Pass mensuel 12,99 € récurrent (1299),
   Pass annuel 99 € récurrent annuel (9900).
6. **Configurer le portail client** (carte, factures, résiliation en ligne).
7. **Créer le webhook** sur `https://erwypjqonrhwofzdbnbo.supabase.co/functions/v1/stripe-webhook`
   et l'abonner aux **huit** événements du tableau plus haut — les trois `checkout.session.*`,
   les trois `customer.subscription.*`, `charge.refunded` et `charge.dispute.created`.
8. **Stripe Tax : obligatoire, désormais.** Déclarer l'immatriculation TVA France
   (FR45 105 309 322) et renseigner l'adresse de l'établissement d'origine. Depuis le 25/09,
   la session Checkout demande le calcul de la taxe (`automatic_tax`) et `verifierTva` **refuse
   d'ouvrir une page de paiement en mode réel** tant que le calcul n'est pas actif et qu'aucune
   immatriculation n'est active — sans quoi on encaisserait du TTC sans rien collecter. Hors
   mode réel, ce contrôle se contente d'un avertissement dans les journaux.
9. **Activer les reçus de paiement et le rappel avant renouvellement annuel** (L215-1) : le code
   n'envoie aucun e-mail.
10. **Saisir les six secrets** dans Supabase (Edge Functions → Secrets), en valeurs de mode réel :
    `STRIPE_SECRET_KEY` (`sk_live_…`), `STRIPE_WEBHOOK_SECRET` (`whsec_…` du webhook réel),
    `STRIPE_PRIX_JOUR`, `STRIPE_PRIX_MOIS`, `STRIPE_PRIX_AN` (les nouveaux `price_…`), et
    `APP_URL` = `https://crosswell-pronostics.vercel.app` **seul, sans `localhost`** : la même
    liste sert aux adresses de retour et aux en-têtes CORS.
11. **Redéployer les trois fonctions** (voir plus haut ; `--no-verify-jwt` pour le webhook seul).
    Les fonctions en production datent du 20/09 et ne portent ni les correctifs de facturation
    relus le 25/09, ni la TVA.
12. **Essayer de bout en bout** avec un vrai paiement, remboursé ensuite : Pass 1 jour, Pass
    mensuel, résiliation depuis le portail, remboursement. Vérifier sur la facture que la TVA
    est ventilée, et dans `stripe_evenements` qu'un événement n'est traité qu'une fois.

### Le texte à coller dans Stripe

Écrit pour la catégorie **logiciel en tant que service** (retenue le 01/10/2026) : c'est l'accès à
l'application qui est vendu, et le texte le dit dans ces termes. Les mots du jeu d'argent n'y
figurent qu'en négation — la seule forme qu'autorise le positionnement (`src/config/app.ts`,
AVERTISSEMENT).

> Crosswell édite une application web d'analyse statistique des courses hippiques françaises,
> vendue par abonnement (logiciel en tant que service). Pour chaque partant d'une course, un
> modèle probabiliste calcule ses chances de victoire et de place, exprimées en pourcentage. Les
> résultats sont publiés le matin même, pour les courses du jour, et le taux de réussite
> réellement constaté est publié après les courses. L'abonnement donne accès à l'application :
> formule gratuite, accès 24 heures à 4,99 €, abonnement mensuel à 12,99 €, abonnement annuel à
> 99 €, prix TTC, résiliables en ligne depuis l'espace client. Crosswell n'est pas opérateur de
> jeux d'argent et de hasard, ne détient aucun agrément de l'Autorité nationale des jeux,
> n'accepte aucune mise, ne détient aucun fonds de joueur et ne verse aucun gain.

Version longue, pour le message au support qui demande la confirmation écrite. Elle ajoute
l'identité de la société, le détail du produit, le fait qu'aucune donnée de carte ne transite par
nos serveurs, et ce que Crosswell n'est pas :

> CROSSWELL (SAS, SIREN 105 309 322, 47 rue Vivienne, 75002 Paris) édite une application web
> d'analyse statistique des courses hippiques françaises, vendue aux particuliers par abonnement
> — un logiciel en tant que service, au sens de la catégorie déclarée.
>
> **Ce que fait l'application.** Un modèle probabiliste, entraîné sur l'historique des courses,
> calcule pour chaque partant ses chances de victoire et de place, exprimées en pourcentage. Ces
> calculs sont publiés le matin même, pour les courses du jour. L'application affiche aussi le
> taux de réussite réellement constaté du modèle, publié après les courses et sans sélection : le
> produit se mesure, et publie ses mesures.
>
> **Ce que le client achète.** Un accès à l'application, facturé de façon récurrente : une
> formule gratuite, un accès de 24 heures à 4,99 € en paiement unique, un abonnement mensuel à
> 12,99 € et un abonnement annuel à 99 €, prix TTC. La résiliation se fait en ligne depuis
> l'espace client, sans démarche écrite. Les paiements passent exclusivement par les pages
> hébergées de Stripe : aucune donnée de carte ne transite par nos serveurs ni n'y est conservée.
>
> **Ce que Crosswell n'est pas.** Nous ne sommes pas opérateur de jeux d'argent et de hasard et
> ne détenons aucun agrément de l'Autorité nationale des jeux. Nous n'acceptons aucune mise, ne
> détenons aucun fonds de joueur, ne versons aucun gain, et ne sommes intéressés d'aucune façon à
> l'issue des courses. Nous ne fournissons ni conseil en investissement, ni recommandation
> personnalisée, et ne promettons aucune performance : une probabilité décrit une fréquence
> attendue sur un grand nombre de courses, pas l'issue d'une course déterminée. Notre seule
> source de revenus est l'abonnement à l'application.

### Ce qui reste bloquant, hors Stripe

- **CGV** : publiées le 25/09 en version de travail (`/cgv` et `/cgu`), identité de la société
  comblée. Restent le médiateur de la consommation, les quatre délais et la date d'entrée en
  vigueur — puis la relecture par un juriste.
- **Suppression de compte** : aucune n'existe dans le code (un `mailto:` dans Mon compte). Une
  suppression faite à la main en base laisse l'abonnement Stripe prélever. Plan prêt, arbitrages
  en attente (remboursement ou non, suppression ou anonymisation du client Stripe).
- **Preuve de consentement** : la ligne ne porte ni montant, ni devise, ni version du texte, et
  n'est jamais confirmée après paiement. Plan prêt, arbitrages en attente.
