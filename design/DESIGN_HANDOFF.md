# Arrivée — Design handoff

Maquettes de référence de l'app Arrivée (pronostics hippiques, galop uniquement : plat et obstacle).
Ce dossier sert de **source de vérité visuelle et fonctionnelle** pour l'intégration. Ce n'est pas du code de production.

## Comment lire les maquettes

- `screens/*.dc.html` : un fichier = un écran (desktop 1440 px ou mobile 390×844).
- Pour les voir dans un navigateur : `cd screens && python3 -m http.server 8000`, puis ouvrir `http://localhost:8000/Landing.dc.html`.
  (`support.js` est le runtime qui interprète les maquettes ; il doit rester à côté des fichiers.)
- Structure d'un fichier :
  - le markup dans `<x-dc>` (styles inline = valeurs exactes à reprendre) ;
  - `{{variable}}` = valeur calculée dans le script en bas du fichier ;
  - `<sc-for>` = boucle, `<sc-if>` = affichage conditionnel ;
  - le `<script type="text/x-dc">` contient la logique et **les données fictives** (courses, chevaux, stats). Ce sont des données de démo : en prod elles viendront de l'API.
- `data-props` en haut du script = états de démo (ex. `plan: gratuit|premium`, `etape`, `formule`, `demo`).
- `canvas.json` = liste des écrans avec leur titre.

## Design tokens

| Rôle | Valeur |
|---|---|
| Fond page | `#0A0C0B` |
| Surface (cartes) | `#0F1311` |
| Surface 2 | `#151A17` / `#171D1A` / `#1A201D` |
| Bordure | `#1F2622` (légère), `#2A332E` (contrôles), `#1C2320` (séparateurs) |
| Texte principal | `#EEF2EF` |
| Texte secondaire | `#C9D2CD`, `#B7C2BC` |
| Texte tertiaire / labels | `#8C9A92` |
| Accent (vert) | `#2EE58F` — hover `#5BF0A8` |
| Texte sur accent | `#07120C` |
| Négatif / danger | `#FF8A80` |

- Police : **Montserrat** (400 à 800), chiffres en `font-variant-numeric: tabular-nums`.
- Rayons : 999px (boutons, pills), 12–14px (inputs), 18–22px (cartes), 28px (grands blocs).
- Boutons : hauteur 44–54px (cible tactile ≥ 44px). CTA plein vert, secondaire transparent + bordure `#2A332E`.
- Focus : `outline: 2px solid #2EE58F`.

## Écrans

| Zone | Desktop | Mobile |
|---|---|---|
| Courses du jour/demain (écran principal) | Main | Mobile |
| États : fiche cheval, comparateur, résultat officiel, formule gratuite (paywall), pronostic en attente | MainFiche, MainCompare, MainResult, MainFree, MainPending | MobileFiche, MobileCompare, MobileResult, MobileFree, MobilePending |
| Accueil | Home | HomeMobile |
| Compte (abonnement, infos, factures, résiliation) | Account | AccountMobile |
| Nos résultats (dashboard filtrable) | Results | ResultsMobile |
| Suivis & alertes | Follows | FollowsMobile |
| Fiches jockey / entraîneur | Jockey, Trainer | JockeyMobile, TrainerMobile |
| Page vitrine | Landing | LandingMobile |
| Connexion | Login | LoginMobile |
| Inscription (Compte → Formule → Paiement → fin) | Signup, SignupPlans, SignupPay | SignupMobile, SignupMobilePlans |
| Premiers pas (onboarding) | Onboarding, OnboardingFollow | OnboardingMobile, OnboardingMobileHippo |
| Comment ça marche | How | HowMobile |
| Légal & jeu responsable | Legal | LegalMobile |

Navigation mobile : 5 onglets — Accueil, Courses, Suivis, Résultats, Compte.

## Règles métier

- **Périmètre** : galop uniquement (Plat, Haies, Steeple). Pas de trot.
- **Aucune prise de pari.** Arrivée publie des pronostics, ce n'est pas un opérateur de jeux.
- **Formules** :
  - Gratuit — 0 € — 1 course offerte par jour (pronostic complet), les autres courses sont visibles mais verrouillées.
  - Pass 1 jour — 4,99 € — accès complet 24 h, paiement unique, sans renouvellement.
  - Pass mensuel — 12,99 € / mois — renouvelable, sans engagement (formule recommandée, présélectionnée).
  - Pass annuel — 99 € / an (≈ 8,25 € / mois, 36 % moins cher que 12 × mensuel) — renouvelable, rappel e-mail 30 jours avant.
- **Probabilités** : les % de victoire d'une course somment à 100 %. Value = écart entre la probabilité du modèle et la probabilité implicite de la cote.
- **États d'une course** : pronostic en attente (publié la veille à 20 h), non-partant, course reportée, résultat officiel.
- **Âge** : 18 ans minimum, vérifié à l'inscription (date de naissance + attestation).

## Conformité (à garder partout)

- Message officiel, visible sur les pages publiques et le parcours d'inscription :
  « Les jeux d'argent et de hasard peuvent être dangereux : pertes d'argent, conflits familiaux, addiction… Retrouvez nos conseils sur joueurs-info-service.fr (09 74 75 13 13 – appel non surtaxé). »
- Ne jamais promettre de gain ni affirmer que le service augmente les chances de gagner.
- Placeholders à compléter avant mise en ligne : `[RAISON SOCIALE]`, `[PRESTATAIRE DE PAIEMENT]`, `[DATE]`, sources de données, CGU (à faire valider par un juriste, notamment le droit de rétractation pour le Pass 1 jour).
