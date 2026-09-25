> Contre-expertise des correctifs Stripe du 20/09/2026, menée le même jour.
> Quatre angles indépendants sur le diff (régressions, idempotence, sécurité, prétentions tenues).
> Les constats 1, 3 (portée du statut « offert »), 7 et 9 ont été revérifiés à la main puis corrigés.
> Ce document garde la trace de ce qui a été trouvé ET de ce qui reste ouvert.

**1. VERDICT**

Non : un défaut bloquant interdit le départ en test — la garde « accès offert » s'applique à **tous** les comptes existants (`db/007` BLOC C insère `formule='gratuit', statut='offert', acces_jusqua` NULL pour tout `auth.users`), donc à de vrais abonnés payants.

---

**2. À REPRENDRE AVANT DÉPLOIEMENT**

**Bloquant**

1. **La garde « offert » écrase l'état Stripe de toute la base d'utilisateurs** — `stripe-webhook/index.ts:101-103` et `:148-157` (`statut: offert ? 'offert' : statut`, `acces_jusqua: offert ? null : …`). Chaîne vérifiée : `commun.ts:210-213` (`abonnementEnCours` ignore `'offert'`) → `paiement-session/index.ts:71` ne bloque rien → **second abonnement mois/an facturé** (le garde Stripe `paiement-session:85-101` ne couvre que la formule `jour`) ; `Compte.tsx:390-394` exige `actif|resiliation_programmee|impaye` → « Résilier en ligne » disparaît au profit du `mailto:` `Compte.tsx:402` (le correctif 14 ne s'applique jamais à ces comptes) ; `Compte.tsx:308` affiche « Accès complet », `:278` « Accès ouvert par notre équipe. », `src/lib/acces.ts:93-94` « Accès offert » — aucun prix, aucune échéance, alors que Stripe prélève ; enfin `customer.subscription.deleted` repasse par `:148`, la garde reste vraie, et `crosswell_acces_complet()` laisse l'accès **ouvert à vie, gratuitement**.
   Minimum avant test : faire porter `abonnementEnCours` (`commun.ts:210-213`) et `enLigne` (`Compte.tsx:390-394`) par `stripe_subscription_id` non nul plutôt que par le seul `statut`.

2. **Réservation jamais libérée sur erreur définitive → événement perdu et non rejouable** — insert `stripe-webhook/index.ts:296-303`, retour 200 **sans** suppression `:346-349`, alors que la branche transitoire supprime bien `:353`. `stripe_evenements` ne porte que `id, type, recu_le` (`db/007`) : rien ne distingue « réservé » de « traité ». Même issue si l'isolat meurt entre `:303` et `:359`, ou si le DELETE échoue (`:354` se contente d'un `console.error`). Un « Renvoyer » depuis Stripe retombe sur le 23505 de `:300` → « déjà traité ». Le README (§ « Essayer en mode test ») promet pourtant un rejeu qui n'existe plus.
   Aggravé par `:133-135` : « formule indéterminable » est classée définitive alors qu'elle dépend de `STRIPE_PRIX_*` lus à l'appel (`commun.ts:24`, `:59-62`) — une coquille de secret = client débité, accès jamais ouvert, aucun rejeu possible.
   Correctif minimal sans migration : supprimer la réservation avant le 200 de `:348`.

**Important**

3. **Le texte de consentement n'est PAS identique au client** — `commun.ts:107` écrit « les 14 jours » avec une espace ordinaire (U+0020), `src/lib/inscription.ts:84` avec une espace **insécable** (U+00A0), vérifié à l'octet. Conséquence : `console.warn` de dérive déclenché à **chaque** achat mois/an (`paiement-session:55-56`), alarme inutilisable ; et la preuve stockée (`paiement-session:153`) diffère du texte affiché.

4. **Le 503 « configuration incomplète » n'atteint jamais le navigateur** — `commun.ts:153` rend `Access-Control-Allow-Origin: ''` quand `ORIGINES` est vide, et le préflight OPTIONS répond **avant** le contrôle (`paiement-session:32` puis `:36` ; `portail-stripe:20` puis `:22`). Le client retombe sur `src/services/paiement.ts:95`, le message trompeur visé. Seul gain réel : le `console.error` de `commun.ts:166`.

5. **`STRIPE_PRIX_*` échappent au contrôle de configuration** — `commun.ts:24` (`exiger` évalué à l'appel) et `:135` (`CONFIGURATION_COMPLETE` ne teste qu'`APP_URL`) : un secret mal saisi ressort en 500 « Réessayez dans un instant » (`paiement-session:159-162`).

6. **Un écart de tarif est rendu comme une panne passagère** — `commun.ts:78-84` lève une `Error` ordinaire, sans `console.error` dédié ; même 500 générique.

7. **`expires_at` rend la clé d'idempotence contre-productive** — `paiement-session:140` dérive `expires_at` de `Date.now()` (variable à la seconde) alors que la clé `:145` est figée par seau de 5 min : deux appels dans le même seau à des secondes différentes = même clé, paramètres différents → erreur d'idempotence Stripe → `catch :159` → 500 générique ; deux appels à cheval sur la frontière du seau = deux sessions, donc le double abonnement que la clé devait fermer.

8. **`suivreAbonnement` ne compare jamais `s.id` à l'abonnement stocké** — `:147` lit `actuel` mais ne s'en sert que pour `offert` (`:148`) ; l'upsert `:150-157` écrase. Un `deleted` sur un ancien abonnement coupe l'accès d'un client à jour sur le nouveau.

9. **`charge.refunded` ferme sur remboursement partiel** — `stripe-webhook:213-229`, aucun test de `charge.amount_refunded` ni du booléen `charge.refunded` (grep `amount_refunded` = 0). 1 € remboursé sur 4,99 € ferme les 24 h.

---

**3. CE QUI PEUT ATTENDRE**

- `portail-stripe:40` + `:42-55` : pas de repli si Stripe refuse le `flow_data` → 500 sur toute la requête (`catch :57-59`), le client perd aussi factures et carte ; `stripe_subscription_id` n'est jamais remis à NULL (`stripe-webhook:156` l'écrit même sur `deleted`, `:193-202` n'y touche pas).
- `Compte.tsx:393` + `:418` : `resiliation_programmee` est envoyé vers `subscription_cancel`, pas vers le retour en arrière.
- `commun.ts:216-218` + `paiement-session:64-70` : le 409 tombe sans regarder la formule demandée — un impayé ne peut plus acheter de Pass 1 jour.
- `stripe-webhook:8-10` : l'en-tête annonce 4 événements, le `switch` `:306-341` et le README (étape 3) en donnent 8.
- `Compte.tsx:349` promet « changement de formule … en ligne » alors que `paiement-session:71-73` renvoie 409 ; `Compte.tsx:411-412` « vous gardez l'accès jusque-là » est faux en impayé, branche désormais atteinte via `:393`, et contredit `:283` (« l'accès est suspendu »).

---

**4. PRÉTENTIONS PARTIELLES OU FAUSSES**

| N° | État | Preuve |
| --- | --- | --- |
| 10 « texte recopié mot pour mot » | **FAUSSE** d'un caractère | `commun.ts:107` vs `src/lib/inscription.ts:84` (U+0020 / U+00A0) |
| 2 « libérée dans le catch » | **PARTIELLE** | non libérée sur erreur définitive (`:346-349`), ni sur mort d'isolat, ni si le DELETE échoue (`:354`) |
| 3 « comptes offert plus écrasés » | **PARTIELLE / effet de bord** | s'applique à toute la base (`db/007` BLOC C), pas à l'équipe seule |
| 5 « secrets au chargement, CORS infaillible, 503 distinct » | **PARTIELLE ×3** | `commun.ts:24` (prix lus à l'appel), `:153` (ACAO vide), 503 jamais lu par le navigateur |
| 7 « définitif / transitoire » | **PARTIELLE** | `:133-135` classe définitif un défaut de secret, et le 200 condamne le rejeu manuel |
| 9 « clés d'idempotence » | **PARTIELLE, contre-productive** sur la session | `paiement-session:140` + `:145` |
| 11 « verifierTarif » | tenue, **mal rendue** | `commun.ts:78-84` → 500 « Réessayez dans un instant » |
| 12 « abonnementEnCours inclut impaye » | tenue, **inopérante** | `commun.ts:212` jamais atteint sur une ligne `'offert'` |
| 13 et 14 | tenues, **inopérantes** sur les comptes `'offert'` | `Compte.tsx:390-394` |
| « 218 tests vitest au vert » | **ne prouve rien ici** | aucun test sous `supabase/` (recherche = 0 fichier) |

Correctifs 1, 4, 6, 8 : tenus, vérifiés, rien à reprendre.
Deux points des contre-expertises sont **périmés** : le Pass 1 jour par-dessus un abonnement est désormais bloqué en amont (`paiement-session:85-101`) et la session expire en 1 h (`:140`).

---

**5. DÉFAUTS D'ORIGINE NON CORRIGÉS**

- Aucun test sur `supabase/functions`.
- `paiements_consentements` (`db/007:66-74`) : ni montant, ni devise, ni périodicité, ni version de texte ; ligne écrite avant paiement, jamais complétée par le webhook, aucune unicité sur `stripe_session_id`.
- CGV `/cgu` absentes du site vitrine, alors que le README les exige avant le mode réel.
- `charge.dispute.closed` non traité ; contestation non marquée en base (`stripe-webhook:239-243` l'admet).
- `invoice.paid` / `invoice.payment_failed` absents : rien ne date le début d'un impayé.
- `pause_collection` non lu : un abonnement en pause reste `actif`.
- `automatic_tax`, `customer_update`, `billing_address_collection` absents ; `tax_behavior` seulement en `console.warn` (`commun.ts:87-89`).
- Aucune annulation d'abonnement ni suppression de client Stripe à la suppression d'un compte.
- Colonne `acces_offert` (db/008), annoncée par `stripe-webhook:98-99`, toujours non écrite.