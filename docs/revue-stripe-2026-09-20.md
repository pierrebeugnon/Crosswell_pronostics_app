> Relecture de l'intégration Stripe, 20 septembre 2026.
> Code écrit le 18/09, **jamais déployé ni exécuté**. Quatre relectures indépendantes,
> chaque constat soumis à une passe de réfutation ; les constats réfutés ont été retirés.
> Trois constats bloquants (1.1, et les deux du Pass 1 jour) ont été revérifiés à la main.

# Relecture Stripe — Crosswell Pronostics (compte rendu de synthèse)

Base : 4 relectures + leurs réfutations, revérifiées fichier par fichier. Code jamais déployé ni exécuté ; `db/007` appliquée en prod.

---

## 1. Bloque la PREMIÈRE EXÉCUTION en mode test

### 1.1 `current_period_end` absent des charges utiles d'abonnement → 500 en boucle
`supabase/functions/stripe-webhook/index.ts:48` puis `:53` — `const fin = statut === 'expire' && s.ended_at ? s.ended_at : s.current_period_end`, puis `new Date(fin * 1000).toISOString()`, sans contrôle de finitude.
L'épinglage `apiVersion: '2024-06-20'` (`_shared/commun.ts:30-31`) ne vaut que pour les appels SORTANTS. `constructEventAsync` (`:93`) vérifie une signature, il ne transcode rien : `evenement.data.object` est sérialisé à la version du POINT DE TERMINAISON, par défaut celle du compte (créé le 18/09/2026, donc ≥ 2026, bien après `2025-03-31.basil` où ces champs ont migré sur les items). Le README (`supabase/functions/README.md:26-30`) ne demande nulle part de figer cette version.
**Ce qui casse :** `customer.subscription.created` et `.updated` → `RangeError` → `catch` `:124` → 500 → rejeu pendant 3 jours → point de terminaison désactivé. Aucun renouvellement enregistré. (Correction au constat d'origine : `.deleted` passe, car `ended_at` n'a pas migré et la branche `:48` le prend.)
**Correctif :** `const s = await stripe.subscriptions.retrieve(id)` en tête de `suivreAbonnement`, comme le fait déjà `:111`. Plus, dans le README étape 3, figer la version d'API du webhook sur `2024-06-20`.

### 1.2 L'instantané de l'événement est appliqué tel quel, sans ordre ni comparaison
`stripe-webhook/index.ts:118` passe `evenement.data.object` à `suivreAbonnement` (`:42-57`), alors que la branche Checkout `:111` relit l'objet chez Stripe — asymétrie visible dans le même `switch`. `enregistrer` (`:34-39`) est un `upsert` inconditionnel ; ni `abonnements` (`db/007:47-59`) ni `stripe_evenements` (`db/007:78-82`) ne portent d'horodatage d'émission.
**Ce qui casse :** (a) 3-D Secure — `created` (`status: 'incomplete'` → `'aucun'`, `:24`) livré après `checkout.session.completed` écrase `'actif'` : `db/007:119-121` ferme l'accès d'un client qui vient de payer, jusqu'au prochain événement d'abonnement (au pire un an sur le Pass annuel) ; (b) un `updated` ancien rejoué après un `deleted` remet `resiliation_programmee` + `acces_jusqua` futur → un mois d'accès gratuit après résiliation.
**Correctif :** le même que 1.1 — relire l'abonnement chez Stripe corrige les deux. Garde de monotonie (colonne `evenement_le`) en complément.

### 1.3 Déduplication non atomique + insert non vérifié + Pass 1 jour non idempotent
`stripe-webhook/index.ts:100-101` (lire) puis `:130` (écrire), hors transaction, alors que la clé primaire `stripe_evenements.id` (`db/007:79`) offrirait le verrou. Deux défauts aggravants : `:100` `const { data: deja }` ignore l'erreur de lecture ; `:130` `await admin.from('stripe_evenements').insert(...)` n'est pas destructuré — un échec passe inaperçu et la réponse reste 200, seule écriture du fichier dans ce cas (comparer `:35-38`, `paiement-session:58` et `:85`).
Et `ouvrirPassJour` **prolonge** au lieu de réécrire (`:75-76`, `finActuelle.getTime() + JOUR_MS`).
**Ce qui casse :** 48 h d'accès pour 4,99 €, sur double livraison ou après un insert `:130` silencieusement raté — alors que le README `:58` affirme l'inverse.
**Correctif :** insérer la réservation AVANT le traitement, renvoyer 200 sur code `23505`, supprimer la ligne dans le `catch` `:124` avant le 500, supprimer `:130`.

### 1.4 Un compte « offert » PERD son accès en achetant un Pass — ce qui vise d'abord le fondateur
`stripe-webhook/index.ts:69` ne garde que `formule IN ('mois','an')` + `statut IN ('actif','resiliation_programmee')`. Or `db/007:161-164` a inséré, pour TOUS les comptes existants, `formule='gratuit'`, `statut='offert'`, `acces_jusqua` NULL = accès complet sans échéance (`db/007:118`). `enregistrer` (`:77-83`) écrit `jour`/`actif`/+24 h par-dessus. Même effet dans `suivreAbonnement` (`:49-56`).
**Ce qui casse :** la procédure d'essai du README `:53-58` ne prouve rien (les courses étaient déjà débloquées), et 24 h après son paiement de test le fondateur perd son propre accès. Côté serveur rien ne l'empêche : `abonnementEnCours` (`commun.ts:103-107`) ne regarde pas `offert`.
**Correctif :** sortir `offert` sans échéance du chemin d'écriture, dans `ouvrirPassJour` comme dans `suivreAbonnement`. Mieux : une colonne `acces_offert boolean` indépendante de l'état Stripe, testée en OR dans `crosswell_acces_complet()`.

### 1.5 `ouvrirPassJour` peut EFFACER le client Stripe du compte
`stripe-webhook/index.ts:82` : `stripe_customer_id: … (session.customer?.id ?? null)`. Le `?? null` est inclus dans le `SET` de l'upsert.
**Ce qui casse :** une session `payment` sans client remet la colonne à NULL → `client_stripe` faux (`db/007:143`) → `portail-stripe:21-23` répond 404 → la page Compte masque « Gérer mon abonnement » (`Compte.tsx:356`) et « Résilier en ligne » (`:381`). C'est la voie de résiliation en ligne (L215-1-1) qui disparaît.
**Correctif :** ne pas écrire la colonne quand la valeur est absente.

### 1.6 Diagnostics faux au premier déploiement (deux variables, deux fausses pistes)
- `stripe-webhook/index.ts:93` : `exiger('STRIPE_WEBHOOK_SECRET')` est évalué DANS le `try`. Son `Error` (`commun.ts:18-22`) est attrapée `:94`, journalisée « Signature Stripe refusée » et rendue en 400 « Signature invalide ». Le secret simplement absent se lit comme un `whsec_` erroné. Seule variable à ne pas être lue au chargement du module (comparer `commun.ts:30` et `:36`).
- `commun.ts:46-51` / `:62-77` : `json()` → `enTetesCors()` → `origines()` → `exiger('APP_URL')`, qui lève. Toutes les réponses passent par `json()`, y compris celles des `catch` (`paiement-session:90`, `portail-stripe:32`) : l'exception s'échappe de `Deno.serve`, réponse 500 nue, sans CORS ni JSON. `messageDe` (`src/services/paiement.ts:47-58`) retombe alors sur « Le paiement en ligne n'est pas encore ouvert. Écrivez-nous… » (`:90`) — rassurant et faux. Un `APP_URL` simplement ERRONÉ produit le même effet.
**Correctif :** lire les secrets au chargement du module ; rendre `enTetesCors` infaillible (liste mémorisée, repli vide) et renvoyer un 503 « configuration incomplète » distinct.

---

## 2. Bloque le passage en MODE RÉEL

### 2.1 Les paiements à notification différée encaissent sans rien ouvrir
`stripe-webhook/index.ts:104-123` ne connaît que `checkout.session.completed` et les trois `customer.subscription.*` ; le README `:27-29` abonne les mêmes quatre. `grep async_payment` sur le dépôt : zéro occurrence. Le garde `payment_status === 'paid'` (`:107`) est juste mais sans contrepartie : un `completed` `unpaid` tombe dans le `break` `:113`, est marqué traité `:130` et renvoie 200. `paiement-session:63-75` ne passe (à raison) aucun `payment_method_types`, donc les moyens différés dépendent du tableau de bord.
**Ce qui casse :** client débité de 4,99 €, jamais d'accès, aucun signal d'erreur. Référence installée explicite : `.agents/skills/stripe-best-practices/references/payments.md` — traiter `completed` ET `async_payment_succeeded`, ne livrer que si `payment_status` n'est pas `unpaid`, plus `async_payment_failed`.
**Correctif :** ajouter les deux `case` et les deux événements au README `:27-29` et au point de terminaison. À défaut, limiter les moyens de paiement aux cartes avant le mode réel.

### 2.2 Résiliation en ligne indisponible dès que quelque chose ne va pas (L215-1-1)
`src/pages/Compte.tsx:381` : `enLigne = clientStripe && formule ∈ {mois, an} && statut === 'actif'`. Les statuts `impaye` (posé sur `past_due`/`unpaid`, `webhook:23`) ET `resiliation_programmee` tombent donc dans la branche `:383-393` : « Écrivez-nous pour résilier », `mailto:`. Le commentaire `:373-377` revendique pourtant la conformité « en trois clics ».
**Ce qui casse :** en `past_due` l'abonnement Stripe est vivant et continue ses relances ; le client ne peut pas l'arrêter en ligne. Un client déjà en résiliation programmée ne peut pas non plus revenir en arrière.
**Correctif :** retirer la condition sur `statut` (le portail Stripe sait résilier un `past_due`) ; garder le repli e-mail pour les accès `offert` sans client Stripe.

### 2.3 Un impayé peut ouvrir un SECOND abonnement — double prélèvement invisible
`_shared/commun.ts:103-107` : `abonnementEnCours` n'accepte que `actif` et `resiliation_programmee`. `impaye` et `expire` franchissent le garde de `paiement-session:45-48`. Et `suivreAbonnement` (`:42-57`) ne compare JAMAIS `s.id` au `stripe_subscription_id` stocké.
**Ce qui casse :** carte expirée → `impaye` → accès coupé (`db/007:119-121`) → bouton « Choisir un Pass » affiché (`Compte.tsx:351`), résiliation en ligne cachée (2.2) → le client reprend un Pass. Deux abonnements sur le même client ; la base n'en garde qu'un (`db/007:57`). Plus tard, `customer.subscription.deleted` sur l'ancien écrit `expire` + `ended_at` passé et coupe l'accès d'un client qui vient de payer.
**Correctif :** étendre `abonnementEnCours` à `impaye` en renvoyant vers le portail ; dans `suivreAbonnement`, ignorer (en journalisant) tout événement dont `s.id` diffère du `stripe_subscription_id` stocké encore actif.

### 2.4 La preuve de consentement est fournie par le client et ne prouve rien
`paiement-session/index.ts:38` : seuls contrôles `demandeAccesImmediat === true` et `typeof formulation === 'string' && formulation.length >= 40`. Le texte est inséré tel quel `:78-85`. `texteConsentement` n'existe que côté front (`src/lib/inscription.ts:80-85`) et n'est jamais recalculé côté serveur.
**Ce qui casse :** la ligne de `paiements_consentements` enregistre ce que le navigateur a envoyé ; tout compte avec son propre JWT peut y écrire n'importe quelle chaîne de 40 caractères et obtenir quand même l'URL de paiement (`:87`). S'ajoute : ni montant ni périodicité dans le texte (`inscription.ts:83-84`) alors que seule la clé `formule` est stockée (`db/007:70`) ; la ligne est écrite AVANT tout paiement et le webhook ne touche jamais cette table ; pas d'IP, pas de user-agent (`db/007:66-74`). La preuve est opposable au vendeur, pas au client.
**Correctif :** catalogue de textes côté serveur (`_shared/commun.ts`), n'accepter du client qu'un booléen + une version, refuser une version inconnue ; ajouter `prix_centimes`, `devise`, `periodicite`, `version_texte` ; faire compléter la ligne par le webhook (`paye_le`, `payment_intent`/`subscription`, `amount_total`).

### 2.5 Les conditions générales acceptées n'existent pas
`src/pages/Inscription.tsx:234` fait accepter `/cgu` (case bloquante, `src/lib/inscription.ts:57`). Le routeur du site (`site/src/App.tsx:14-20`) ne déclare que `/`, `methode`, `mentions-legales`, `confidentialite` et `*` → `NonTrouve` ; `site/src/pages/` ne contient aucune page CGV. Un brouillon existe hors git (`docs/cgv-brouillon.md`) mais n'a ni route ni page. Le README `:62-63` le sait.
**Correctif :** publier la page avant d'activer le paiement. Au même endroit : `inscription.ts:77-78` promet la confirmation sur support durable (L221-13) et `:92` un rappel avant échéance (L215-1) — aucun code ne fait ni l'un ni l'autre.

### 2.6 TVA entièrement hors du code
`paiement-session/index.ts:63-75` ne passe ni `automatic_tax`, ni `customer_update`, ni `billing_address_collection` ; le client est créé avec `{ email, metadata }` seulement (`:53`) ; `prixStripe` (`commun.ts:24`) ne lit qu'un `price_…` sans vérifier montant, devise ni comportement fiscal. Prix annoncés TTC (`README:19-22`, `site/src/pages/Accueil.tsx`).
**Ce qui casse :** la facture émise par `invoice_creation` (`:73`) ne porte aucune ligne de TVA, et les 4,99 € doivent quand même être ventilés. *Correction à la relecture d'origine :* activer Stripe Tax au tableau de bord ne change rien à une session créée sans `automatic_tax` — le scénario « le client voit 5,99 € » ne peut pas se produire. Et `tax_behavior` est déjà documenté dans `docs/stripe-declaration-activite.md:108`.
**Correctif :** `tax_behavior: 'inclusive'` sur les trois prix, `automatic_tax` + `customer_update: { address: 'auto' }`, et un contrôle au démarrage qui compare `unit_amount`/`currency` aux valeurs de `src/config/formules.ts`.

### 2.7 Supprimer un compte casse le webhook et laisse Stripe prélever
`db/007:48` — `user_id … ON DELETE CASCADE`, et c'est le seul endroit du système où vivent `stripe_customer_id` et `stripe_subscription_id`. Aucune annulation nulle part (`grep subscriptions.cancel|customers.del` = 0). La suppression est un `mailto:` (`Compte.tsx:521-526`).
**Ce qui casse :** au renouvellement suivant, `enregistrer` (`:34-39`) tente l'upsert sur un `user_id` disparu, la clé étrangère échoue, 500 en boucle pendant 3 jours. Le client reste prélevé, le lien avec le `cus_…` est perdu, et les données restent vivantes chez Stripe (art. 17 RGPD).
**Correctif :** une procédure qui annule l'abonnement Stripe, puis supprime/anonymise le client, puis l'utilisateur. En défense, traiter un `user_id` inconnu comme une erreur définitive (200 + journal), pas comme un rejeu.

### 2.8 Aucune clé d'idempotence sur les appels Stripe
`paiement-session/index.ts:53` et `:63` sont appelés sans second argument (`grep -i idempot` = 0). Le garde `:46` lit `public.abonnements`, que seul le webhook remplit après paiement : entre deux créations de session, il ne voit rien.
**Ce qui casse :** deux onglets → deux sessions `subscription` → deux abonnements à 12,99 €, dont un seul dans la base (`upsert` `webhook:37`). *Nuance retenue des réfutations :* le double-clic dans un même onglet est déjà bloqué (`Inscription.tsx`, `enCours`), et la course sur `customers.create` ne casse PAS le portail — le webhook réécrit `stripe_customer_id` avec le client réellement payeur (`:54`, `:82`) ; il ne reste que des clients Stripe orphelins. La vraie parade est de réutiliser une session Checkout `open` et de refuser l'écrasement d'un `stripe_subscription_id` actif.

### 2.9 Un Pass 1 jour payé pendant un abonnement : argent encaissé, rien en face
`stripe-webhook/index.ts:69-72` — `console.warn` puis `return`. Le `return` sort de `ouvrirPassJour`, pas du handler : `:130` marque l'événement traité et `:131` renvoie 200. Aucun `stripe.refunds.create` dans le dépôt. Fenêtre réelle : `paiement-session` ne pose pas `expires_at` (défaut Stripe : 24 h) et son garde `:46` ne vaut qu'à la création de la session.
**Correctif :** rembourser (clé d'idempotence dérivée de `session.id`) ou prolonger au-delà de la fin d'abonnement, et tracer ; `expires_at` court sur la session.

### 2.10 `APP_URL` documenté avec localhost
`supabase/functions/README.md:39` : `https://crosswell-pronostics.vercel.app,http://localhost:5190`, secret unique pour la production. Cette liste sert à la fois à `adresseAutorisee` (`commun.ts:53-60`) et à `enTetesCors` (`:62-70`). Une ligne à corriger avant le premier déploiement réel.

### 2.11 La formule vient des métadonnées, repli silencieux sur « mois »
`stripe-webhook/index.ts:46` : `(s.metadata?.formule === 'an' ? 'an' : 'mois')`. `s.items.data[0].price.id` n'est lu nulle part. `compteDe` (`:28-32`) prend pourtant la précaution symétrique pour le compte.
**Ce qui casse :** tout abonnement créé au tableau de bord, ou issu d'un changement de formule, est étiqueté mensuel : `Compte.tsx:303-304` annonce « 12,99 € / mois » à un client facturé 99 €, et `echeance()` (`:287`) une échéance fausse. L'accès, lui, reste correct. La référence installée demande l'inverse (`billing.md:75` : résoudre par le graphe d'objets, métadonnées en repli explicite).

### 2.12 Le portail s'ouvre toujours sur son accueil ; et le changement de formule promis n'existe pas
`portail-stripe/index.ts:24-28` ne passe ni `flow_data` ni `configuration` (`grep flow_data` = 0) ; `ouvrirPortail()` (`src/services/paiement.ts:64`) ne prend aucun argument, donc « Gérer mon abonnement » (`Compte.tsx:357`) et « Résilier en ligne » (`:411`) font exactement la même chose. En parallèle, `Compte.tsx:345` promet « changement de formule … tout se gère en ligne » alors que le README `:23-25` ne fait activer que résiliation, carte et factures, et que `paiement-session:46-48` renvoie 409. Le mensuel → annuel est impossible par les deux chemins.
**Correctif :** paramètre d'intention + `flow_data: { type: 'subscription_cancel', … }` ; créer une `configuration` de portail par API plutôt que dépendre d'une case du tableau de bord ; trancher la promesse de `Compte.tsx:345`.

### 2.13 Erreur transitoire et erreur définitive confondues
`stripe-webhook/index.ts:45` et `:66` lèvent, le `catch` `:124-128` renvoie 500, donc « rejouez » — alors qu'une métadonnée absente ne sera jamais réparée par un rejeu (abonnement créé à la main : seule `paiement-session:65,74` pose `client_reference_id` et `subscription_data.metadata`). 3 jours de rejeux, alertes, et le point de terminaison peut être désactivé — ce qui coupe alors les vrais clients.
**Attention :** corriger d'abord `:30` — `const { data } = await admin.from('abonnements')…` avale l'erreur de lecture, donc une panne Supabase passagère produit le même `userId === null` et serait classée « définitive ». Contrôler l'erreur AVANT d'introduire un 200.

### 2.14 `past_due` coupe l'accès, et l'interface dit le contraire
`webhook:23` fusionne `past_due` et `unpaid` sous `impaye` ; `db/007:119-121` ne l'ouvre pas. *Ce n'est pas un oubli :* `db/007:23` documente le choix. Le défaut réel est l'incohérence : `Compte.tsx:279` affiche « mettez votre carte à jour pour garder l'accès » et `src/lib/acces.ts:100` libelle « Paiement en attente », pour un accès déjà coupé.
**Attention au correctif proposé par la relecture :** ajouter `impaye` à `db/007:121` ouvrirait une période entière gratuite, car Stripe a déjà avancé `current_period_end` sur la période impayée. Une grâce doit se calculer depuis l'événement (`now() + N jours`), et `past_due` doit être séparé de `unpaid`.

---

## 3. Peut attendre

| Point | Emplacement | Effet |
| --- | --- | --- |
| Pass 1 jour expiré affiché « Actif » | `db/007:142` (statut recopié) + `src/lib/acces.ts:93-95` | Page Compte contradictoire : « Formule gratuite » + puce « Actif ». Corriger par un `CASE` dans `crosswell_mon_acces()`. |
| « Demander la résiliation » sur un paiement unique | `src/pages/Compte.tsx:381-393` | Le Pass 1 jour (`mode: 'payment'`, `paiement-session:64`) tombe dans la carte danger. Contredit `inscription.ts` (« Paiement unique, aucun renouvellement »). |
| `ACCES_SANS_FILTRE` affirme `statut: 'offert'` | `src/lib/acces.ts:33` | Sur erreur de lecture, un client Gratuit lit « Accès complet » et « Accès ouvert par notre équipe » (`Compte.tsx:278`, `:304`, `:330`) pendant que la base verrouille. Ajouter un état « inconnu ». Pas une faille. |
| `pause_collection` non regardé | `stripe-webhook/index.ts:21-26` | `status` reste `active` : accès complet sans facturation. Atteignable dès aujourd'hui depuis le tableau de bord. Deux lignes. |
| `crosswell_acces_complet()` fail-open | `db/007:113` (`<> 'authenticated' THEN true`) | Non exploitable aujourd'hui (REVOKE posés `:94-95`, `:149`, `:252`, `:368-370`). Durcissement : liste blanche de rôles internes plutôt qu'une négation. |
| `stripe_subscription_id` survit à un Pass 1 jour | `stripe-webhook/index.ts:77-83` | Hygiène seulement : la colonne n'est jamais LUE (ni par les fonctions, ni par `acces.ts`, ni par `crosswell_mon_acces()`). |
| `stripe_evenements` jamais purgée | `db/007:78-82` | Table qui enfle (le `default:` y insère aussi). Sans effet sur les performances (`:100` interroge la clé primaire), mais aucune rétention prévue. |
| Zéro test sur le périmètre payant | `supabase/` (aucun fichier de test), `src/lib/acces.test.ts` | Les tests existants couvrent `lireAcces`, `verrouillerLignes` (code DÉMO uniquement) et `courseOfferte`. `statutDe`, `suivreAbonnement`, `ouvrirPassJour` : aucune assertion — or quatre des constats ci-dessus se logent dans ces lignes. À écrire avant le mode réel. |

---

## 4. Ce que le code fait DÉJÀ BIEN (ne pas y toucher)

- **Signature webhook :** corps brut (`:90`), `constructEventAsync` avec `SubtleCryptoProvider` créé une fois (`:15`), tolérance par défaut, aucun effet de bord avant vérification — le `--no-verify-jwt` est sans danger.
- **Le webhook est seul à ouvrir l'accès.** `paiement-session` n'écrit que `stripe_customer_id` (`:55-57`) ; une URL de succès forgée ne débloque rien.
- **Les deux natures de paiement sont distinguées :** `mode: formule === 'jour' ? 'payment' : 'subscription'` (`:64`), `payment_intent_data.metadata` vs `subscription_data.metadata` (`:72-74`). Le Pass 1 jour reçoit une fin explicite calculée CÔTÉ SERVEUR, en `timestamptz`, comparée par la base sur un instant absolu.
- **Aucun identifiant Stripe ne vient du corps de la requête :** `portail-stripe:20-25` lit le client dans la base. Identité toujours établie par `admin.auth.getUser` (`commun.ts:80-85`).
- **Adresses de retour en liste blanche** (`commun.ts:53-60`) ; CORS jamais `*`, avec `Vary: Origin` (`:62-70`) ; aucune fuite de secret dans les réponses.
- **`payment_method_types` volontairement non passé** (`:63-75`) — conforme à la référence Stripe.
- **RLS de `db/007` :** `abonnements` en lecture-de-soi sans écriture (`:90-96`) ; `paiements_consentements` et `stripe_evenements` avec RLS sans aucune politique et tous droits révoqués. L'accès est appliqué par la BASE (`client_predictions`, `:174-247`), pas par le front.
- **Ordre 500 / marquage :** l'insert de `stripe_evenements` est bien APRÈS le traitement (`:130`), le `catch` ne marque rien (`:124-128`) — le piège inverse n'existe pas ici.
- **`statutDe` couvre les 8 statuts Stripe** et distingue `cancel_at_period_end` d'une résiliation effective, en cohérence avec `db/007:118-122`.
- **Consentement écrit avant que l'URL ne soit rendue**, avec erreur bloquante (`:78-87`).

---

## 5. Oublis signalés par les réfutations — méritent un second passage

1. **`compteDe` avale l'erreur de lecture** — `stripe-webhook/index.ts:30`. À corriger AVANT 2.13, sinon une panne Supabase sera classée « définitive » et abandonnée en silence.
2. **`evenement.api_version` jamais lu ni comparé** à `commun.ts:31`. Trois lignes de garde auraient transformé 1.1 en échec explicite dès le premier événement. Le contrôle le moins cher avant mise en service.
3. **Remboursements et litiges non traités** — `charge.refunded`, `charge.dispute.created`/`closed` absents du `switch` (`:104-123`) et du README (`:27-29`). Un Pass remboursé garde ses 24 h ; un mois contesté garde l'accès. `billing.md:75` le demande.
4. **`invoice.paid` / `invoice.payment_failed`** — `billing.md:57` les nomme comme trio minimal avec `customer.subscription.*`. Sans eux, rien ne date le début d'un impayé, donc la période de grâce de 2.14 est incalculable.
5. **Aucune table de paiements ni corps d'événement conservé** — `stripe_evenements` ne stocke que `id, type, recu_le` (`db/007:78-82`) et `abonnements` est réécrite à chaque renouvellement (`:37`). Répondre à une contestation à 8 mois oblige à tout reconstituer à la main chez Stripe.
6. **Coupure d'accès à l'instant du renouvellement** — `acces_jusqua = current_period_end` (`:53`) et `acces_jusqua > now()` (`db/007:118`) : entre la fin de période et le traitement de l'`updated`, un abonné à jour retombe en Gratuit. Quelques secondes normalement, permanent tant que 1.1 n'est pas corrigé.
7. **Asymétrie du garde-fou d'achat** — `abonnementEnCours` (`commun.ts:103-107`) ne connaît que `mois`/`an` : un détenteur de Pass 1 jour peut acheter un mensuel (sa ligne est écrasée, sans remboursement), et un client en `resiliation_programmee` est bloqué même pour un simple Pass 1 jour. Idem pour un Pass acheté pendant un abonnement `impaye`.
8. **RGPD** — `paiements_consentements.email` survit à la suppression (`db/007:64-74`, `ON DELETE SET NULL`) sans durée ni purge, alors que `Compte.tsx:517-519` promet une suppression « définitive » et une liste de données incomplète (la date de naissance est aussi stockée). `site/src/pages/Confidentialite.tsx` ne nomme ni Stripe, ni les durées. Et le client ne peut pas obtenir sa propre preuve de consentement (`db/007:94-96`, aucune politique de lecture).
9. **Droit de rétractation à 14 jours** — `inscription.ts:84` le fait promettre au client (L221-25), aucun écran, aucune fonction, aucun remboursement au prorata n'existe. La relecture n'a examiné que la résiliation.
10. **Changement d'e-mail jamais remonté à Stripe** — champ en lecture seule (`Compte.tsx:200-213`), client créé une fois (`paiement-session:53`), aucun `customers.update`. Reçus et factures partent sur l'ancienne adresse.
11. **Realtime sur la table brute** — `src/services/predictions.ts:138-142` s'abonne à `modele_prediction_engagement.predictions_log` et non à `client_predictions`. Verdict « plausible » : la publication `supabase_realtime` n'est pas vérifiable depuis le dépôt et `authenticated` n'a pas de SELECT sur cette table. **À vérifier en base** (`SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime'`) ; si la table y figure, la retirer. Le correctif « écouter la vue » n'est pas réalisable — `postgres_changes` ne fonctionne pas sur une vue.
12. **Aucun plafond d'appel sur `paiement-session`** — seul chemin où un client pilote une écriture serveur (`:78-85`).

---

**Écarté :** le constat « `session_id` avalé par un fragment d'URL » (`paiement-session:62`). Le fait technique est exact, mais `grep session_id src/` ne renvoie rien : aucune page ne lit ce paramètre, le seul appelant (`src/services/paiement.ts:85`) n'envoie jamais de fragment. Le paramètre ajouté `:62` est du poids mort, pas un défaut.