# Stripe — déclaration d'activité

Préparé le 20 septembre 2026. À utiliser au moment de créer le compte Stripe de Crosswell SAS,
puis pour obtenir une confirmation écrite avant de passer en mode réel.

## Pourquoi ce document existe

Un service payant d'analyses sur les courses hippiques est dans une zone grise pour un
acquéreur de paiement. Selon la façon dont l'activité est classée, elle peut être rattachée à
la catégorie « jeux d'argent et paris », qui figure parmi les activités restreintes de Stripe.

Le risque n'est pas qu'on vous refuse à l'inscription — ce serait le cas le moins coûteux.
Le risque est qu'on vous accepte, que vous encaissiez pendant des mois, puis qu'une revue
requalifie l'activité : compte gelé, fonds retenus, et le temps de démêler ça avec des abonnés
payants en face. Le compte Stripe étant celui de la société, cela emporterait aussi la
facturation du produit PRO le jour où il reprend.

D'où la règle : **décrire l'activité avec précision dès le premier jour, et obtenir une réponse
écrite avant le premier euro réel.** Une semaine d'attente coûte moins cher qu'un gel.

## Ce qu'il faut avoir sous la main avant de commencer

- [ ] SIREN / SIRET de Crosswell SAS
- [ ] Numéro de TVA intracommunautaire
- [ ] Numéro RCS et ville d'immatriculation
- [ ] Code APE, **et la vérification que l'objet social couvre cette activité**
- [ ] IBAN professionnel au nom de la société
- [ ] Pièce d'identité du représentant légal et des bénéficiaires effectifs
- [ ] **L'URL du site, en ligne et complète** — voir la section « Le site déclaré » ci-dessous

Les trois premiers manquent aussi aux mentions légales du site
(`site/src/pages/MentionsLegales.tsx`, encore marquées « à compléter avant la mise en ligne »).
C'est le même blocage, à traiter une fois.

## Le site déclaré

**Ne déclarez pas `crosswell.io`.** Ce domaine présente aujourd'hui de l'optimisation génétique
équine avec un « Login — coming soon ». Un examinateur Stripe y verrait un site sans rapport
avec l'activité déclarée : c'est de la friction gratuite, et un motif classique de demande de
compléments.

Déclarez l'adresse du site Pronostics, à condition qu'il soit **en ligne et complet** :
tarifs visibles, mentions légales renseignées, CGV publiées, politique de confidentialité.
Un examinateur doit pouvoir vérifier lui-même ce que vous vendez, à quel prix, et à quelles
conditions on résilie.

## Le descriptif d'activité

À reprendre dans le champ « description de l'activité » de l'inscription. Il est écrit dans les
mots du site, ce qui est un atout : le positionnement est documenté et cohérent de bout en bout.

> Crosswell édite et publie, par abonnement, des analyses statistiques sur les courses
> hippiques françaises. Pour chaque partant, un modèle probabiliste estime ses chances de
> victoire et de place ; ces estimations sont publiées la veille, et leur taux de réussite
> réel est publié après les courses.
>
> Le service est vendu au consommateur sous forme d'abonnement numérique : une formule
> gratuite, un accès 24 heures à 4,99 €, un abonnement mensuel à 12,99 € et un abonnement
> annuel à 99 €, prix TTC.
>
> Crosswell n'est pas un opérateur de jeux d'argent et ne détient aucun agrément ANJ. Nous
> n'acceptons aucune mise, ne détenons aucun fonds de joueur, ne versons aucun gain et ne
> sommes intéressés d'aucune façon à l'issue des courses. Nous ne fournissons pas de conseil
> en investissement ni de conseil personnalisé. La rémunération provient uniquement de
> l'abonnement à un contenu éditorial.

**Points de vigilance de rédaction :**

- Employer « analyses statistiques » et « contenu éditorial par abonnement ». Le mot
  « pronostics » employé seul oriente le lecteur vers la catégorie paris.
- Dire explicitement ce que vous **ne** faites pas : pas de mise, pas de détention de fonds,
  pas de gain reversé. C'est ce qui vous distingue d'un opérateur.
- Ne rien enjoliver et ne rien minimiser. Un écart entre le déclaré et le constaté est
  précisément ce qui déclenche les fermetures.
- Ne pas promettre de performance, ici comme sur le site.

## Le message au support, avant le mode réel

À envoyer depuis le tableau de bord une fois le compte créé et le site en ligne. Le but est
d'obtenir une réponse écrite qui nomme la catégorie retenue.

> Bonjour,
>
> Nous préparons le lancement d'un service d'abonnement et souhaitons confirmer avec vous, par
> écrit et avant toute transaction réelle, que notre activité est acceptée et sous quelle
> catégorie elle est classée.
>
> Crosswell SAS (SIREN …) édite un service d'analyses statistiques sur les courses hippiques
> françaises, vendu par abonnement au consommateur : [DESCRIPTIF CI-DESSUS].
>
> Site : [URL]. Les conditions générales de vente y sont publiées, ainsi que les tarifs et les
> modalités de résiliation en ligne.
>
> Pouvez-vous nous confirmer que cette activité est acceptée sur Stripe, et nous indiquer le
> code d'activité (MCC) retenu pour notre compte ? Nous préférons le vérifier maintenant
> plutôt que de découvrir une requalification après plusieurs mois d'encaissement.
>
> Merci d'avance.

**Conservez la réponse.** Si un examen ultérieur revient sur le sujet, une confirmation écrite
antérieure change la conversation.

## Produits Stripe à activer — et à ne pas activer

| Produit | Verdict |
| --- | --- |
| **Billing** | Oui. C'est le cœur : abonnements mensuel et annuel, portail client, factures. |
| **Tax** | Oui. TVA française sur un service numérique B2C. Attention au réglage : les prix étant annoncés TTC, les tarifs Stripe doivent être créés en `tax_behavior: inclusive`, faute de quoi 4,99 € affichés deviennent 5,99 € au paiement. |
| **Checkout** | Oui. Pages hébergées par Stripe : aucune donnée de carte ne transite par l'application. |
| **Invoicing** | Non, pas séparément. Billing émet déjà les factures d'abonnement ; Invoicing sert surtout à la facturation manuelle B2B. |
| **Connect** | **Non.** Connect sert aux plateformes qui reversent de l'argent à des tiers. Vous vendez vos propres abonnements à vos propres clients : aucun sous-marchand, aucun reversement. L'activer ajoute une charge KYC lourde pour rien. |

## Ce qui reste à faire avant le mode réel

Repris de `supabase/functions/README.md` :

- [ ] CGV publiées sur le site et validées par un juriste
- [ ] Textes de consentement validés (`src/lib/inscription.ts`, `texteConsentement`)
- [ ] Confirmation écrite de Stripe sur la catégorie d'activité
- [ ] Reçus de paiement et rappels avant renouvellement annuel activés dans Stripe
- [ ] Portail client configuré : résiliation en ligne obligatoire (art. L215-1-1 du code de
      la consommation), mise à jour de la carte, historique des factures
- [ ] Parcours complet essayé en mode test, webhook compris

## Ce qui ne doit jamais circuler

Les clés `sk_test_…`, `sk_live_…` et le secret de signature `whsec_…` se saisissent directement
dans les secrets Supabase (Tableau de bord → Edge Functions → Secrets). Ils n'ont à passer ni
par une conversation, ni par un fichier du dépôt, ni par un message. Les identifiants de tarif
`price_…`, eux, ne sont pas secrets.
