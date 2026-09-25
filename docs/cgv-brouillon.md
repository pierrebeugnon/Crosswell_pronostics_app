# Conditions générales de vente — BROUILLON

> **Ce document n'est pas publiable en l'état.**
>
> C'est une trame de travail, rédigée le 20 septembre 2026, destinée à être **relue et validée
> par un juriste** avant toute mise en ligne. Elle contient des `[TROUS]` à combler et au moins
> un arbitrage juridique que je ne peux pas trancher (voir « Questions pour le juriste »).
>
> Tant qu'elle n'est pas validée, **aucune route `/cgv` ne doit être ouverte sur le site** —
> c'est la décision déjà prise dans `site/src/components/legal/PageLegale.tsx` : pas de page
> légale publiée avec des mentions manquantes. Et aucun paiement réel ne peut être encaissé
> sans CGV publiées.

## À combler avant relecture

**Mise à jour du 25/09/2026 — l'identité de la société est connue**, relevée au registre
national des entreprises (INSEE / INPI) et posée dans `site/src/config/site.ts` (`EDITEUR`) :

| Champ | Valeur |
| --- | --- |
| Dénomination | CROSSWELL (forme : SAS) |
| `[SIREN]` | 105 309 322 |
| `[SIRET]` | 105 309 322 00011 |
| `[RCS + ville]` | RCS Paris 105 309 322 — **à confirmer sur le Kbis** |
| `[TVA]` | FR45 105 309 322 |
| `[CAPITAL]` | 1 € (fixe) |
| `[ADRESSE COMPLÈTE]` | 47 rue Vivienne, 75002 Paris |

Restent ouverts :

| Trou | Où le trouver |
| --- | --- |
| `[MÉDIATEUR]` | Médiateur de la consommation à choisir et à adhérer (obligation légale) |
| `[DATE]` | Date d'entrée en vigueur |
| `[délai]` (articles 5, 6, 7, 13, 14) | À fixer avec le juriste |

**À vérifier dans les statuts** : le code APE est 62.01Z « programmation informatique ».
L'objet social couvre-t-il la publication d'analyses statistiques vendues par abonnement ?
Stripe posera la question (voir `stripe-declaration-activite.md`).

---

## Article 1 — Identification du vendeur

Le service est édité par **Crosswell SAS**, société par actions simplifiée au capital de
`[CAPITAL]` euros, dont le siège social est situé `[ADRESSE COMPLÈTE]`, immatriculée au registre
du commerce et des sociétés de `[RCS + ville]` sous le numéro `[SIREN]`, numéro de TVA
intracommunautaire `[TVA]`.

Directeur de la publication : Pierre Beugnon.
Contact : contact@crosswell.io

## Article 2 — Objet

Les présentes conditions régissent la vente, à distance et au consommateur, des abonnements
donnant accès au service Crosswell Pronostics (ci-après « le Service »).

Toute souscription vaut acceptation des présentes, dans leur version en vigueur au jour de la
commande. Le client en reçoit un exemplaire par voie électronique.

## Article 3 — Description du Service

Le Service consiste en la publication d'**analyses statistiques** portant sur les courses
hippiques françaises. Pour chaque partant, un modèle probabiliste estime ses chances de
victoire et de place. Ces estimations sont publiées la veille de la course. Leur taux de
réussite constaté est publié après les courses.

Le Service est un **contenu éditorial**. Il ne constitue ni :

- une activité d'opérateur de jeux d'argent et de hasard : Crosswell ne détient aucun agrément
  de l'Autorité nationale des jeux, n'accepte aucune mise, ne détient aucun fonds de joueur et
  ne verse aucun gain ;
- un conseil en investissement, un conseil financier ou une recommandation personnalisée.

**Aucune garantie de résultat n'est donnée.** Une probabilité décrit une fréquence attendue sur
un grand nombre de courses, et non l'issue d'une course déterminée. Les performances passées ne
préjugent pas des résultats futurs. Le client reste seul responsable de l'usage qu'il fait des
informations publiées.

Le Service est réservé aux personnes **majeures**.

## Article 4 — Compte client

L'accès aux formules payantes suppose la création d'un compte, à partir d'une adresse
électronique valide. Le compte est **nominatif** : une adresse, un client. Le partage des
identifiants n'est pas autorisé.

Le client est responsable de la confidentialité de ses identifiants et des opérations réalisées
depuis son compte.

## Article 5 — Formules et prix

| Formule | Prix TTC | Durée |
| --- | --- | --- |
| Gratuit | 0 € | Sans limite de durée |
| Pass 1 jour | 4,99 € | 24 heures, paiement unique, sans reconduction |
| Pass mensuel | 12,99 € | 1 mois, reconduction tacite |
| Pass annuel | 99 € | 12 mois, reconduction tacite |

Les prix sont indiqués **toutes taxes comprises**, en euros, TVA française applicable. Le prix
applicable est celui affiché au jour de la commande.

Crosswell peut modifier ses tarifs à tout moment. Pour les formules à reconduction tacite, tout
nouveau tarif est notifié au client au moins `[30 jours ?]` avant sa prise d'effet ; le client
peut résilier avant cette date s'il ne l'accepte pas.

## Article 6 — Commande et paiement

Le paiement s'effectue en ligne, par carte bancaire, via le prestataire **Stripe**. Les pages de
paiement sont hébergées par Stripe : **aucune donnée de carte bancaire ne transite ni n'est
conservée par Crosswell.**

La commande est définitive à réception de la confirmation de paiement transmise par Stripe.
Un reçu est adressé au client par voie électronique.

En cas de refus de paiement, l'accès n'est pas ouvert. En cas d'échec de paiement lors d'une
reconduction, Crosswell peut suspendre l'accès après `[délai à fixer]` et après en avoir informé
le client.

## Article 7 — Durée, reconduction et résiliation

**Pass 1 jour** — accès de 24 heures à compter de la confirmation du paiement. Aucune
reconduction, aucune action de résiliation nécessaire.

**Pass mensuel et Pass annuel** — reconduits tacitement pour une durée identique, sauf
résiliation. Conformément à l'article L215-1 du code de la consommation, le client est informé
par écrit de la possibilité de ne pas reconduire, au plus tôt trois mois et au plus tard un
mois avant le terme de la période.

**Résiliation.** Le client peut résilier à tout moment, **en ligne**, depuis son espace client,
conformément à l'article L215-1-1 du code de la consommation. La résiliation prend effet **au
terme de la période en cours**, déjà payée : l'accès reste ouvert jusque-là. Aucun
remboursement au prorata n'est dû, sous réserve de l'article 8.

Crosswell peut résilier ou suspendre un compte en cas de manquement aux présentes, notamment de
partage d'identifiants, après mise en demeure restée sans effet pendant `[délai]`.

## Article 8 — Droit de rétractation

> ⚠️ **Article à faire trancher par le juriste — voir « Questions » en fin de document.**

Le client consommateur dispose d'un délai de **quatorze jours** à compter de la souscription
pour exercer son droit de rétractation, sans motif ni pénalité.

Toutefois, lorsque l'accès au Service est ouvert **immédiatement**, à la demande expresse du
client, celui-ci **renonce à son droit de rétractation** pour la part du service déjà exécutée,
dans les conditions prévues à l'article L221-28 du code de la consommation. Ce consentement et
cette renonciation sont recueillis explicitement au moment du paiement, et conservés à titre de
preuve.

Pour exercer son droit lorsqu'il subsiste, le client écrit à contact@crosswell.io. Le
remboursement intervient dans les quatorze jours suivant la réception de la demande, par le même
moyen de paiement.

## Article 9 — Disponibilité

Crosswell met en œuvre les moyens raisonnables pour assurer la disponibilité du Service, sans
garantie d'un accès ininterrompu. Le Service peut être suspendu pour maintenance, ou en cas de
défaillance d'un prestataire technique ou d'une source de données.

Les analyses sont publiées **chaque soir**, une fois les partants déclarés connus. Crosswell ne
garantit ni l'exhaustivité des courses couvertes, ni la publication d'analyses pour une réunion
déterminée. L'indisponibilité d'une source de données peut conduire à l'absence de publication
sur une journée.

## Article 10 — Propriété intellectuelle

L'ensemble des éléments du Service — modèle, analyses publiées, textes, interface, marque
Crosswell — reste la propriété exclusive de Crosswell SAS.

L'abonnement confère un droit d'usage **personnel, non exclusif et non transmissible**. Sont
interdites la reproduction, la rediffusion, la revente et l'extraction systématique des analyses,
notamment par tout moyen automatisé.

## Article 11 — Données personnelles

Les traitements de données personnelles sont décrits dans la
[politique de confidentialité](/confidentialite), qui fait partie intégrante des présentes.

## Article 12 — Responsabilité

Crosswell est tenue d'une obligation de moyens. Sa responsabilité ne saurait être engagée à
raison des décisions prises par le client sur la base des analyses publiées, ni des conséquences
financières qui en résulteraient.

Rien dans les présentes ne limite la responsabilité de Crosswell en cas de dol, de faute lourde,
ou d'atteinte à la vie ou à l'intégrité physique, ni ne prive le consommateur des garanties
légales d'ordre public.

## Article 13 — Réclamations et médiation

Toute réclamation est adressée à contact@crosswell.io. Crosswell s'engage à répondre sous
`[délai]` jours.

Conformément à l'article L612-1 du code de la consommation, le client peut recourir gratuitement
au médiateur de la consommation : `[MÉDIATEUR — nom, adresse, site]`.

## Article 14 — Modification des présentes

Crosswell peut modifier les présentes. Les clients titulaires d'un abonnement en cours en sont
informés par voie électronique `[délai]` avant l'entrée en vigueur de la nouvelle version, et
peuvent résilier sans frais s'ils ne l'acceptent pas.

## Article 15 — Droit applicable

Les présentes sont soumises au **droit français**. À défaut de résolution amiable, le litige
est porté devant les juridictions compétentes, le consommateur conservant le droit de saisir la
juridiction du lieu de son domicile.

Entrée en vigueur : `[DATE]`.

---

## Questions pour le juriste

1. **Le régime de rétractation applicable** (article 8), qui est le point le plus important.
   S'agit-il d'un contenu numérique non fourni sur support matériel (L221-28 13°) ou d'une
   prestation de services pleinement exécutée (L221-28 1°) ? La rédaction du consentement à
   recueillir au paiement en dépend, et elle est déjà implémentée côté produit
   (`src/lib/inscription.ts`, `texteConsentement`) : il faut vérifier qu'elle correspond au
   régime retenu. **Le Pass 1 jour est le cas critique** — consommé en 24 h, bien avant les
   14 jours.
2. **La formule annuelle à 99 €** relève-t-elle d'obligations d'information renforcées sur la
   reconduction ? Les délais de l'article L215-1 sont-ils correctement transcrits ?
3. **Le positionnement hors champ des jeux d'argent** (article 3) est-il rédigé de façon
   suffisamment protectrice au regard de la réglementation ANJ ? C'est le même texte qui sera
   opposé à Stripe et, le cas échéant, à un régulateur.
4. **L'absence de remboursement au prorata** en cas de résiliation d'un abonnement annuel
   est-elle opposable à un consommateur ?
5. **La clause de responsabilité** (article 12) tient-elle face au droit de la consommation, ou
   risque-t-elle la qualification de clause abusive ?
6. Faut-il un **document distinct** pour les CGU (usage du site gratuit) et les CGV (vente des
   abonnements), ou un document unique suffit-il ?

## Quand le texte sera validé

1. Créer `site/src/pages/ConditionsVente.tsx` sur le modèle de `MentionsLegales.tsx`
   (`PageLegale` + `SectionLegale`).
2. Ajouter la route `conditions-vente` dans `site/src/App.tsx`.
3. Ajouter l'entrée dans `LEGAL` (`site/src/components/layout/Navigation.ts`) — elle apparaît
   alors automatiquement dans les onglets des pages légales et dans le pied de page.
4. Ajouter la page à la table `PAGES` de `site/scripts/apres-build.mjs` : elle entre ainsi dans
   le sitemap et reçoit son `canonical`.
5. Retirer la note « CGU non reprises » de l'en-tête de `PageLegale.tsx`.
