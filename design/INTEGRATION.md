# Refonte « Arrivée » : plan d'intégration

Reçu le 18/09/2026 (`arrivee-design.zip`), décompressé tel quel. `DESIGN_HANDOFF.md` et `screens/`
viennent du designer : on n'y touche pas. Ce fichier-ci est le nôtre. Il fait le lien entre les
maquettes et le code, et il liste ce qui reste à trancher avant d'intégrer.

## Consulter les maquettes

```bash
node design/serve.mjs      # http://localhost:5199/ (sommaire des 41 écrans)
```

On peut aussi passer par la config `arrivee-design` de `.claude/launch.json`. Pas besoin de
Python, contrairement à ce que dit le handoff.

- **26 écrans distincts.** Les 15 autres sont le même fichier, ouvert sur un autre état de démo
  (`data-props` : `demo`, `plan`, `etape`, `formule`).
- **Deux formats seulement** : bureau fixe à 1440 px, mobile fixe à 390 px. Tout ce qui se
  trouve entre les deux (tablette, 1024 px, 1280 px) est à concevoir de notre côté.
- **Chiffres et chevaux fictifs**, y compris sur « Nos résultats » (29,8 % gagnant, ROI +3,5 %).
  Ce ne sont pas des objectifs.

## Correspondance écrans ↔ code actuel

### Application (`src/`)

| Maquette | Aujourd'hui | Nature du travail |
|---|---|---|
| **Main / Mobile** : courses du jour, bascule Aujourd'hui/Demain, programme à gauche et course à droite | `pages/Reunions`, `Reunion`, `Course` + `components/course/*` | Refonte, et **fusion de trois routes** en un maître-détail sous `/courses` |
| État · résultat officiel (pronostic face à l'arrivée) | `Course` pour une course courue, `Podium` | Refonte |
| État · pronostic en attente | États vides « demain pas encore publié » | Refonte |
| État · fiche cheval (tiroir latéral) | `pages/Partant` (une page entière) | Refonte. Contenu bloqué, voir A2 |
| État · comparateur | — | Nouveau |
| État · formule gratuite (paywall) | — | Nouveau, dépend de la règle de la course offerte (A5) |
| **Home / HomeMobile** : prochaine course, opportunités Value, courses du jour, demain | `pages/Aujourdhui` + `accueil/HeroJours` (« Bonjour X ») | Refonte. La maquette n'a pas de « Bonjour X » (A9) |
| **Results** : filtres, 5 indicateurs, barres par mois, découpages, dernières courses | `pages/Resultats` + `components/tableau/*` | Refonte. Le registre actuel va plus loin (intervalles, calibration) : on garde ou on simplifie ? (A10) |
| **Follows** : suivis et alertes | — | Nouveau, demande une table et des envois (A7) |
| **Jockey / Trainer** : fiches | — | Nouveau. Aucune donnée jockey ni entraîneur dans la vue (A3) |
| **Account** : abonnement, infos, carte, factures, notifications, résiliation | `pages/Compte` (+ la sauvegarde du 17/09 pour l'abonnement) | Refonte. Carte bancaire bloquée (A6) |
| **Login** | `pages/Connexion` (mot de passe, lien magique, oubli) | Refonte |
| **Signup** : Compte → Formule → Paiement → fin | — (le lien magique crée le compte au passage) | Nouveau : date de naissance, attestation 18+, CGU |
| **Onboarding** : disciplines, hippodromes, suivis | — | Nouveau, préférences à stocker |
| **How** : comment ça marche | `pages/Methode` (app) et `site/src/pages/Methode` | Refonte. Seuils à réconcilier (A4) |
| — | `pages/Hippodromes`, `Hippodrome` | **Absents des maquettes** : on garde ou on retire ? (A10) |

Navigation : la maquette prévoit **Accueil · Courses · Mes suivis · Nos résultats** en haut, et
cinq onglets en bas sur mobile (Accueil, Courses, Suivis, Résultats, Compte). Aujourd'hui,
`components/layout/Navigation.ts` propose Aujourd'hui, Réunions, Hippodromes, Nos résultats et
Compte.

### Site vitrine (`site/`)

| Maquette | Aujourd'hui | Nature du travail |
|---|---|---|
| **Landing / LandingMobile** | `pages/Accueil` + `sections/*` | Refonte complète : hero et exemple de course, 4 atouts, 3 étapes, transparence, tarifs, FAQ, pied de page légal |
| **How** | `pages/Methode` | Page publique commune avec l'app, ou en double ? |
| **Legal** : Jeu responsable, CGU, Confidentialité, Mentions | `pages/MentionsLegales`, `Confidentialite` | Refonte, plus deux pages nouvelles (CGU, Jeu responsable) |

## Jetons de la maquette → variables actuelles

La maquette est un **noir plat à bordures opaques**, sans verre ni halos : c'est la voie déjà
suivie par `site/`. Le premier lot peut donc se limiter à changer les valeurs de
`src/index.css` et `site/src/index.css`, sans toucher aux composants. Les pages suivront une par
une.

| Rôle | Maquette | Variable actuelle |
|---|---|---|
| Fond | `#0A0C0B` | `--c-canvas` (aujourd'hui 9 11 13) |
| Surface (cartes) | `#0F1311` | `--c-surface` |
| Surface 2 | `#151A17`, `#171D1A`, `#1A201D` | `--c-raised` (plus deux nuances à créer) |
| Texte | `#EEF2EF` | `--c-ink` |
| Texte secondaire | `#B7C2BC`, `#C9D2CD` | `--c-muted` |
| Labels | `#8C9A92` (et `#6F7C75`, plus éteint) | `--c-faint` |
| Bordures | `#1F2622` légère, `#2A332E` contrôles, `#1C2320` séparateurs, `#3A4640` survol | `--c-line` (blanc translucide aujourd'hui) : **nouveaux jetons opaques** |
| Accent | `#2EE58F`, survol `#5BF0A8` | `--c-accent`, `--c-accent-hi` |
| Texte sur accent | `#07120C` | `--c-accent-ink` |
| Négatif | `#FF8A80` | `--c-loss` |
| Avertissement (course reportée) | `#F5B94A` | `--c-wait` ? À créer |

- **Police : Montserrat partout**, de 400 à 800. L'app utilise aujourd'hui Inter pour le texte
  et Montserrat pour les titres.
- **Chiffres** : `tabular-nums`.
- **Rayons** : 999 px (boutons, pills), 12–14 px (champs), 18–22 px (cartes), 28 px (grands
  blocs).
- **Cibles tactiles** : 44 px minimum. **Focus** : 2 px d'accent.
- **La maquette n'a pas de couleur pour « placé »**. Le bleu `info` actuel disparaît, ou on le
  garde ?

## À trancher avant d'intégrer

Ces points opposent la maquette à des décisions déjà prises (voir les notes de projet). Chacun
bloque au moins un écran. Les autres écrans peuvent avancer en attendant.

- ~~**A1. Le nom.**~~ **Tranché le 18/09** : on garde « Crosswell Pronostics », et notre logo
  remplace celui des maquettes. « Arrivée » est à remplacer partout où on reprend un texte.
- **A2. La fiche cheval.** *(18/09 : décision levée par le fondateur — « intègre tout » ; voir
  lot 6 ter.)* Elle montre la musique, le père, la mère, le propriétaire,
  l'éleveur, les gains et le rapport victoires/courses. Ce sont les données France Galop
  (`chevaux.performances` et `chevaux.profile`) écartées le 15/09, faute de droits. Il reste
  utilisable : le pronostic de la course (rang, % victoire, % placé, cote) et l'explication de
  la cote. Les « facteurs du pronostic » (forme récente, distance, jockey, hippodrome, poids)
  n'existent pas non plus dans la vue.
- **A3. Les fiches jockey et entraîneur.** Montes, victoires, gains, palmarès en Groupe,
  classement annuel : même problème de source. En plus, `client_predictions` n'a aucune
  colonne jockey ni entraîneur.
- **A4. Les cotes et la Value.** ~~On n'a qu'une cote, sans historique.~~ **Tranché et livré le
  25/09/2026** (lot 10, ci-dessous) : `cotes_jour` enregistre un relevé par partant toutes
  les 30 minutes de 11 h à 19 h, `client_cotes` le sert (`db/008`), et l'app montre la cote
  du moment et sa courbe. Ce qui reste écarté, par décision du fondateur du 25/09 : l'écart
  au marché ne se calcule PAS sur ces cotes — il attend la cote de clôture, après l'arrivée.
  Montrer avant le départ qu'un cheval « vaut mieux que sa cote » ferait un service de value
  bets. La maquette annonce une Value à **+25 % relatifs** ; `MARGE_VALUE` vaut 10 %, et
  environ 4 réunions sur 10 n'ont pas de cote de clôture.
- **A5. La course offerte.** ~~Quelle course, choisie par qui ?~~ **Tranchée le 25/09/2026**
  (lot 11) : LA PLUS BELLE COURSE DU JOUR — le plus gros peloton, puis la catégorie la plus
  relevée, puis la première au départ. Une par jour, aujourd'hui comme les jours à venir.
  `db/009`, appliquée en production.
- **A6. Les formules et le paiement.**
  - ~~Prix~~ **Tranché le 18/09** : les tarifs de la maquette (Gratuit, Pass 1 jour 4,99 €,
    Pass mensuel 12,99 €, Pass annuel 99 €). Le site les affiche (lot 7).
  - Carte bancaire : la maquette place la saisie de carte **dans l'app** (Paiement, « Moyen de
    paiement » dans Compte). Notre règle : uniquement les pages hébergées du prestataire.
  - Prestataire : toujours pas choisi.
- **A7. Suivis, alertes, notifications, e-mails.** Il faut stocker les suivis et envoyer des
  alertes : engagement, baisse de cote, rappel 15 min avant le départ, récap du soir à 20 h.
  Rien de tout cela n'existe. Il faudrait des tables et des fonctions serveur, qu'on ne crée
  pas sans accord explicite.
- **A8. Le vocabulaire et le positionnement.** La maquette assume l'univers du pari :
  - le message officiel « jeux d'argent » et le badge 18+ partout ;
  - une page Jeu responsable ;
  - « si vous pariez, ne misez que… » ;
  - « ROI simple gagnant · 1 € par course » ;
  - des « Gains » en euros.

  La règle de `src/config/app.ts` bannit pari, mise, gain et rendement, et le site ne nomme
  jamais le parieur.

  **Tranché le 18/09 : on garde la règle stricte.** Pas de page Jeu responsable, pas de
  message « jeux d'argent », aucun vocabulaire du pari ; « Value » reste « Écart + ». Le
  badge 18+ est gardé, sans message. Les textes des maquettes sont réécrits (lot 7).
- **A9. L'heure de publication.** La maquette dit « publié la veille à 20 h ». Aujourd'hui, la
  règle est de ne donner aucune heure : `RYTHME_PUBLICATION` dit « calculés dans la nuit,
  publiés dès la veille ». L'accueil « Bonjour X » demandé le 17/09 n'apparaît pas non plus
  dans la maquette.
- **A10. Ce qui existe sans maquette.** *(18/09 : hippodromes supprimés à la demande du fondateur ;
  réunions passées refaites dans le style de la maquette ; fiche partant devenue le tiroir de la maquette.)*
  - Pages Hippodromes (profil de piste).
  - Profondeur du registre « Nos résultats » (intervalles, calibration, face au marché).
  - Note sur les non-partants.

  On les garde dans le nouveau style, ou on les retire ?
- **A11. Le type de course.** La maquette classe tout en Plat, Haies ou Steeple-chase.
  Aujourd'hui, `categorie` porte Handicap, Réclamer, Conditions ou Groupe, pas la discipline.
  Il faut une source pour la discipline.
- **A12. D'autres données absentes de la vue**, découvertes en intégrant Courses :
  - le numéro de réunion PMU (le « R1 » de « R1 C3 ») ;
  - le jockey (affiché sous chaque cheval dans la maquette) ;
  - ~~la cote avant la course~~ : **réglé le 25/09** par `client_cotes` (`db/008`, A4), qui
    sert les relevés du jour ; `client_predictions` garde la seule cote de clôture.

  Le jockey reste un sujet d'architecture, à traiter à part.

## Ordre proposé et avancement

1. ✅ **Socle visuel de l'app** (18/09). Voir « Ce qui a été fait » plus bas. Le site vitrine
   garde ses propres jetons jusqu'au lot 7.
2. ✅ **Coquille** (18/09) : en-tête, navigation, barre d'onglets mobile, pied de page.
3. ✅ **Courses** (18/09) : programme et course, sans la fiche, le comparateur ni le paywall.
4. ✅ **Accueil** (18/09).
5. ✅ **Nos résultats** (18/09).
6. ✅ **Connexion et Compte** (18/09, sans le paiement).
   ✅ Hors plan initial, le 18/09 : fiche cheval complète, fiches jockey et entraîneur,
   réunions passées, 404, évolution de la cote simulée (lots 6 bis à 6 quinquies).
   ✅ Comparateur (18/09, lot 6 sexies).
7. ✅ **Site vitrine** (18/09, lot 7) : accueil, Comment ça marche, pages légales ; et la page
   Méthode de l'app sur la maquette How.
8. ✅ **Inscription** (18/09, lot 8), développée comme si le paiement était prêt ; textes
   réduits d'un cran dans l'app et le site.
9. Reste : le paiement Stripe côté serveur, le contrôle d'accès par formule (A5), suivis et
   alertes (A7), onboarding, paywall.

## Ce qui a été fait

### Lots 1 et 2 — socle et coquille (18/09/2026)

- **Jetons.** `src/index.css` porte les valeurs de la maquette, et `tailwind.config.ts` les
  expose : `sunken`, `well`, `raised-2`, `track`, `soft`, `dim`, `sep`, `line-hover`,
  `accent-hover`, `accent-deep`, `accent-dim`, `warn`.
- **Plus de verre.** Plus de halos, de grain ni de flou. Les primitives (`.card`,
  `.glass-*`, `.btn-*`, `.chip-*`) sont devenues des aplats bordés : les pages pas encore
  refaites prennent déjà le nouveau style.
- **Filets.** Les filets blancs translucides des composants ont été remplacés par les
  jetons opaques.
- **Police et formes.** Montserrat partout (Inter est retiré). Les rayons suivent la maquette
  (`xl` 14, `2xl` 18, `3xl` 20, `4xl` 28), et le contenu fait au plus 1440 px, avec
  40 px de marge.
- **Navigation, en haut.** Accueil, Courses, Hippodromes, Nos résultats, puis la date et la
  pastille d'initiales, qui mène au compte. « Mes suivis » n'y est pas : la fonction
  n'existe pas encore. Hippodromes y reste en attendant A10.
- **Navigation, en bas (mobile).** Accueil, Courses, Résultats, Compte, dans une barre
  pleine largeur.
- **Rafraîchissement.** Le bouton « rafraîchir » est retiré : les données se rechargent
  seules.
- **Encart 18+ du bas de page.** Il porte notre mention (`AVERTISSEMENT`), pas le message
  des opérateurs de jeux, tant que A8 n'est pas tranché.

### Lot 3 — Courses (18/09/2026)

- **Pages et adresses.**
  - `src/pages/Courses.tsx` remplace `Course.tsx`, comme `Podium`, `TablePartants` et
    `AxePeloton`.
  - `/courses` ouvre la prochaine course du jour, et `/courses?jour=AAAA-MM-JJ` celle d'un
    autre jour.
  - La course affichée vit dans l'adresse : `/courses/:date/:hippodrome/:numero`.
  - `/reunions` reste joignable par « Réunions des jours passés », pour l'historique sur
    30 jours.
- **Logique.** Elle vit dans `src/lib/programme.ts`, testée : course par défaut, confiance,
  verdict, arrivée prédite et arrivée relevée.
- **Seuils de confiance.** Repris de la maquette (28 % et 18 %), ils vivent dans
  `SEUILS_CONFIANCE` (`config/app.ts`).

**Écarts volontaires à la maquette :**

- « C3 » au lieu de « R1 C3 », faute de numéro de réunion (A12).
- Le % placé sous le nom du cheval, à la place du jockey (A12).
- Le type de course (Handicap…) au lieu de la discipline (A11).
- La cote affichée est celle de clôture quand elle existe, sinon le dernier relevé du jour,
  avec son heure en infobulle (A4, depuis le 25/09). Les flèches « cote en baisse » suivent
  les relevés ; sans relevé ni clôture, la colonne reste vide (A12).
- L'avis de non-partant dit que les pourcentages **ne sont pas recalculés**. La maquette
  affirme le contraire, ce que le pipeline ne fait pas.
- « Terminée · arrivée relevée » plutôt que « arrivée officielle ».
- Pas de case « Comparer », ni de fiche en tiroir : un clic sur un cheval ouvre la page
  partant actuelle.

### Lot 4 — Accueil (18/09/2026)

- **Contenu.** `src/pages/Aujourdhui.tsx` suit la maquette, de haut en bas :
  - la prochaine course et les opportunités ;
  - toutes les courses du jour ;
  - demain.
- **Logique.** Elle vit dans `src/lib/accueil.ts`, testée : prochaine course, délai
  avant le départ, résumé du jour, opportunités.
- **Ce qui disparaît.** Les anciens blocs de l'accueil : héros « Bonjour » avec
  l'avancée des réunions, taux récents avec courbe, conviction, volume analysé,
  sélections, écarts au marché, « Hier ». Ils sont dans la sauvegarde du 18/09, et
  `HeroJours`, `CourbeReussite` et `useCompteur` sont retirés.

**Écarts volontaires à la maquette :**

- « Bonjour {prénom} » remplace le surtitre « Aujourd'hui » : c'est la demande du 17/09.
- Quand plus rien n'est à venir aujourd'hui, la grande carte présente la première course
  de demain.
- **Opportunités.** Ce sont les partants Value des courses à venir, aujourd'hui et demain.
  S'il n'y en a pas, on montre ceux des courses déjà courues du jour, en le disant, avec
  leur arrivée.
  - En production, c'est le cas ordinaire : la vue ne porte que la cote de clôture (A12).
  - L'ancien bloc « Écarts au marché » faisait déjà ce repli.
- « Demain » affiche le rythme de publication, sans heure, quand rien n'est encore
  publié (A9).
- **Correction du 18/09 au soir** (retour du fondateur : « on a juste une suite de pronos,
  ce n'est plus iso avec la maquette »). Le soir, une fois la dernière course partie
  (17 h 48 ce jour-là) et tant que demain n'est pas publié — le cas ordinaire en production
  tant que le calcul de nuit n'est pas en place —, la grande carte et les écarts au marché
  disparaissaient : l'accueil n'était plus qu'une liste. Désormais le bloc du haut est
  toujours là : la carte montre la **dernière course du jour, terminée**, avec la place
  réelle de nos cinq premiers et « Voir le résultat » ; sans aucune course ni aujourd'hui ni
  demain, une carte « Aucune course au programme ». En démo, `?demain=non` reproduit la
  soirée de la production (avec `&horloge=20:30`).

### Lot 5 — Nos résultats (18/09/2026)

- **Contenu.** `src/pages/Resultats.tsx` suit la maquette :
  - la bascule d'indicateur (Gagnant, Placé, Top 3) et six filtres (année, mois, jour,
    type, distance, hippodrome), tous dans l'adresse ;
  - cinq chiffres clés ;
  - le taux par mois, avec la moyenne en pointillés et le détail au survol ;
  - cinq découpages et les dernières courses (10, puis par 20).
- **Logique.** Elle vit dans `src/lib/resultats.ts`, testée.
- **Ce qui disparaît.** L'ancien registre : barre d'outils, indicateurs, évolution,
  repères, découpages, fiabilité, liste. Sont retirés `components/tableau/`,
  `lib/registre.ts` (avec ses 130 tests) et `lib/useFiltresRegistre.ts`, tous dans la
  sauvegarde du 18/09.
- **Ce qui reste.** `lib/stats.ts` (calibration, face au marché, hasard) reste, avec
  `tests/parite`.

**Écarts volontaires à la maquette :**

- **« ROI simple gagnant » → « Au hasard ».** Le rendement est banni du vocabulaire
  (A8). La tuile donne le repère du hasard pour l'indicateur choisi : 1/n, 3/n, ou un
  trio tiré au sort.
- **Panneau ajouté : « Fiabilité des pourcentages ».** C'est la calibration : la part
  de gagnants observée, face au pourcentage annoncé en pointillés. C'est la preuve que
  « 30 % » veut dire 30 %. **Il est à retirer si le fondateur n'en veut pas**
  (arbitrage A10).
- **Retirés sans remplacement :** la comparaison au favori du marché et les intervalles
  de confiance. La page Méthode a été corrigée pour ne plus les promettre sur « Nos
  résultats ».
- **Type de course.** Handicap, Réclamer, Conditions, Groupe & Listed au lieu de Plat,
  Haies, Steeple (A11).
- **Mobile.** Pas de tuile « Courses analysées » (le nombre passe sous le titre). Les
  découpages par jour et par hippodrome ne s'affichent que sur grand écran, comme dans
  la maquette.
- **Historique partiel.** Si le chargement est tronqué, une mention le dit en bas de
  page.

### Lot 6 — Connexion et Compte (18/09/2026)

- **Pages.** `src/pages/Connexion.tsx` et `src/pages/Compte.tsx` suivent la mise en page des
  maquettes.
- **Composants partagés.**
  - `components/ui/Champ.tsx` : le champ de saisie à libellé, aide et erreur reliée.
  - `components/layout/EncartMajeurs.tsx` : l'encart 18+, commun au pied de page et à
    la connexion.

**Connexion — écarts :**

- **Gardé :** la connexion par lien e-mail, en lien discret sous le bouton, et
  « Mot de passe oublié ? » à côté du libellé.
- **« Créer un compte gratuit » → « Pas encore client ? Écrivez-nous ».** L'inscription
  n'existe pas encore (lot 8).
- **Accroche.** Pas de « cotes en direct » (A4, A12) : elle reprend le rythme de
  publication.

**Compte — écarts :** on garde la mise en page (colonne d'identité et de sections, cartes),
mais seulement ce qui existe.

- **Abonnement.** « Accès complet · Actif », ce que l'accès comprend et « Gérer mon
  abonnement » par e-mail. Pas de prix, ni de changement de formule en ligne (A6).
- **Informations personnelles.** Prénom modifiable, adresse e-mail en lecture seule et
  mot de passe (« Modifier » déplie le formulaire). La maquette demande aussi nom,
  téléphone, date de naissance et pays : on ne les collecte pas.
- **Absents** jusqu'au paiement (A6) et aux alertes (A7) : moyen de paiement, factures,
  notifications.
- **Résiliation et suppression du compte.** Même carte « danger » que la maquette, mais
  la demande part par e-mail : pas de parcours en trois clics tant qu'il n'y a pas de
  paiement. Ce parcours sera obligatoire à ce moment-là (art. L215-1-1 du Code de la
  consommation).
- **Ajout : une carte « Assistance ».** L'e-mail est le seul canal de support.

### Lot 6 bis — Hippodromes retirés, fiche, réunions passées, 404 (18/09/2026)

- **Hippodromes supprimés** (demande du fondateur).
  - Retirés : pages, service, composants, données de démo, types, seuils de piste,
    entrée de navigation.
  - La vue `db/002_profil_hippodromes.sql` reste en base : l'app ne la lit plus.
  - Méthode ne promet plus de taux par piste.
- **Fiche d'un partant = le tiroir de la maquette.**
  - `components/courses/FicheCheval.tsx`, sur la page Courses.
  - Grand écran : panneau de 600 px à droite. Téléphone : plein écran avec retour.
  - L'adresse ne change pas (`/courses/…/partants/:cheval`). Échap, le fond et la croix
    ferment ; ouverte depuis la course, la fermeture revient en arrière dans l'historique.
  - Contenu limité à nos données (A2) : pronostic (rang, victoire, placé, cote), lecture de
    la cote, arrivée, place dans le peloton.
  - Pas d'origines, d'entourage, de musique, d'évolution de cote, ni de Suivre / Comparer.
  - L'ancienne page `Partant.tsx` est retirée.
- **Réunions passées** (`/reunions`, sans maquette).
  - Jours déjà courus sur 7 ou 30 jours, recherche d'hippodrome.
  - Une ligne par réunion, avec un carré de verdict par course.
  - `/reunions/:date/:hippodrome` redirige vers la première course dans Courses.
- **Page introuvable** refaite.
- **Téléphone** : sur Courses, la bascule de jour et le ruban restent collés sous l'en-tête,
  comme dans la maquette.
- **Vocabulaire (A8).** Le marqueur « Value » et la carte « Opportunités » de la maquette
  deviennent « Écart + » et « Écarts au marché », parce que « value » est banni (README,
  « Positionnement »). Libellés dans `LIBELLE_ECART` et `TITRE_ECARTS` (`config/app.ts`).
- **Ménage.** Retirés parce que plus rien ne les utilisait : `LigneCourse`, `CarteReunion`,
  `Stat`, `Aide`, `DuelMarche`, `Feuille`, `Dossard`, `Etiquettes`, `lib/ambiance`,
  `useLargeur` et `chargerReunion`.
- **Accessibilité.** Les onglets actifs sont annoncés correctement (`Link` au lieu de
  `NavLink`).

**Reste dans l'app, sans maquette intégrée :** la page Méthode, prévue avec « Comment ça
marche » (lot 7).

### Lot 6 ter — Fiche cheval complète (18/09/2026)

**Décision du fondateur (18/09) :** exposer les données France Galop sur la fiche. La
décision du 15/09 est levée, et le risque sur les droits reste entier (données relevées
dans l'espace membre France Galop).

- **Base.** `db/004_fiche_cheval.sql` crée deux vues en lecture seule, `client_chevaux` et
  `client_performances`.
  - Limitées aux chevaux pronostiqués et aux colonnes utiles, réservées aux comptes
    connectés.
  - Deux index de service.
  - **Appliquée en production le 18/09/2026, avec l'accord du fondateur** (migration
    `004_fiche_cheval`).
  - Vérifié le jour même : `anon` n'a pas accès (l'API répond 42501), `authenticated`
    oui ; un cheval pronostiqué a son profil et ses performances.
  - La requête de la fiche prend 13 ms, en passant par les deux nouveaux index.
- **Mesuré en base le 18/09.**
  - Sur les 4 504 chevaux pronostiqués des 30 derniers jours, 100 % ont un profil et 99 %
    ont des performances ; la dernière performance date de la veille.
  - `chevaux.profile.entraineur` contient parfois une page entière aspirée : on ne le lit
    pas, l'entraîneur vient de la dernière course.
- **Écran.** Il suit la maquette MainFiche / MobileFiche :
  - âge, sexe et robe ;
  - dernier jockey, entraîneur, père, mère, propriétaire, éleveur ;
  - pronostic ;
  - musique (6 dernières courses, codes FG décodés : 0 au-delà de la 9e, A, T, D, R) ;
  - carrière (courses, victoires, places, allocations) ;
  - dernières courses (5, puis toutes) ;
  - place dans le peloton.
- **Code.** Logique dans `src/lib/fiche.ts` (testée), chargement dans
  `src/services/fiches.ts`, démo fictive déterministe dans `lib/demo.ts`.

**Écarts :**

- « Gains » → « Allocations » : c'est le terme hippique, et « gain » est banni.
- Le jockey est celui de la DERNIÈRE course : la monte du jour n'est pas relevée.
- La colonne « cote » des dernières courses est remplacée par discipline, distance et
  catégorie : on n'a pas les cotes passées.
- **Toujours absents :** « Pourquoi ce pronostic » (le modèle n'exporte pas ses facteurs),
  Suivre et Comparer. L'évolution de la cote est simulée, voir le lot 6 quinquies.

**Sécurité, à trancher par le fondateur, rien n'a été modifié.** L'advisor Supabase signale
8 tables du schéma `chevaux` sans RLS : `obstacle_chevaux`, `haies_chevaux`,
`steeple_chevaux`, `genealogie`, `performances_doublons_20260817`,
`agregats_avant_20260817`, `agregats_idfg_ambigus_20260817`, `elo_courant`. Elles sont
lisibles et modifiables avec la clé anon si le schéma est exposé par l'API. Cela s'ajoute à
la faille d'écriture sur `profile` et `performances`, laissée en l'état le 15/09.

### Lot 6 quater — Fiches jockey et entraîneur (18/09/2026)

**Demande du fondateur (18/09),** dans le prolongement de la fiche cheval. Source : les
performances France Galop (`chevaux.performances`).

- **Base.** `db/005_fiches_professionnels.sql`. **Appliquée en production le 18/09/2026,
  avec l'accord du fondateur** (migration `005_fiches_professionnels`).
  - Six vues en lecture seule, réservées aux comptes connectés : `client_stats_pros`,
    `client_classement`, `client_associations`, `client_montes`, `client_palmares`,
    `client_entourage_du_jour`.
  - Une fonction `crosswell_montant` lit les allocations (« 16.250 ») sans jamais faire
    échouer la vue. Trois index de service.
  - Agrégats côté base : une saison compte ~64 000 courses et jusqu'à 2 000 montes pour un
    jockey, trop pour un téléphone.
  - **Portée plus large que 004** : toutes les courses de la saison en cours et de la
    précédente, pas seulement les chevaux pronostiqués (un classement ne se calcule pas
    sur un échantillon). Le palmarès couvre toutes les années.
- **Vérifié le 18/09.**
  - `anon` n'a pas accès (l'API répond 42501). L'advisor ne signale que l'avertissement
    attendu : les six vues s'exécutent avec les droits de leur propriétaire, comme 001 et 004.
  - Données cohérentes : saison 2026, 2 121 jockeys (C. Demuro en tête, 155 victoires) et
    2 299 entraîneurs (F.-H. Graffard, 150).
  - Temps : statistiques d'une personne 170 ms, associations 290 ms, palmarès 72 ms,
    chevaux au programme 27 ms (0,8 s à froid).
- **Le classement est trop lent : 0,9 s, puis 6,8 s** sur un second appel, pour une limite
  de 8 s côté `authenticated`. Il réagrège toute la saison à chaque fiche.
  - L'app ne l'interroge plus qu'une fois par fiche (tête et personne ensemble).
  - Correctif : `db/006_classement_precalcule.sql`, **appliquée en production le
    18/09/2026 avec l'accord du fondateur**. Le classement est stocké (vue matérialisée
    `chevaux.classement_pros`, ~10 000 lignes) et rafraîchi chaque heure à la 17e minute par
    pg_cron (tâche `crosswell_classement_pros`). Même nom, mêmes colonnes : l'app ne
    change pas.
  - Vérifié le jour même : la requête de la fiche passe de 6,8 s à 13 ms, avec les mêmes
    chiffres. Le rafraîchissement fonctionne. Le stock est refusé à `anon` comme à
    `authenticated` (le schéma `chevaux` est bien exposé par l'API), la vue publique
    reste réservée aux comptes connectés.
  - Contrepartie : le classement peut retarder d'une heure au plus sur les autres chiffres
    de la fiche, calculés en direct.
- **Écran.** `src/pages/Professionnel.tsx`, une page pour les deux rôles, comme la maquette
  (Jockey / Trainer) :
  - en-tête : initiales, rôle, discipline principale, hippodrome principal ;
  - cinq indicateurs, victoires par mois, réussite par discipline et par hippodrome ;
  - palmarès Groupe et Listed, derniers résultats ;
  - à droite : classement de la saison (victoires ou allocations), chevaux au programme
    (entraîneur, six au plus), associations.
- **Adresses.** `/jockeys/:nom` et `/entraineurs/:nom`, avec le nom tel que France Galop
  l'écrit. On y arrive depuis la fiche cheval (dernier jockey, entraîneur, jockeys des
  dernières courses), le classement et les associations. L'onglet Courses reste allumé.
- **Code.** Logique dans `src/lib/professionnels.ts` (testée), chargement dans
  `src/services/professionnels.ts`, démo fictive déterministe dans `lib/demo.ts`.

**Écarts :**

- Pas de bouton Suivre (A7), ni de « licence depuis », ni de base d'écurie : non relevés.
- Pas de « prochaines montes » pour un jockey : la monte du jour n'est pas relevée. Pour
  un entraîneur, « Ses chevaux au programme » part de l'entraîneur de leur DERNIÈRE course.
- « Gains » → « Allocations ». Le palmarès cite discipline et distance : le nom de la
  course n'est pas dans les performances.

### Lot 6 quinquies — Évolution de la cote, simulée (18/09/2026)

**Demande du fondateur (18/09) :** simuler la courbe d'évolution des cotes dans la fiche et
sur la page course, en attendant l'historique des cotes (A4, sujet d'architecture).

- **Simulation.** `src/lib/cotes.ts` (testée) : treize points de 9 h au départ, ou à
  maintenant le jour même. Tirés au hasard mais stables pour un partant, ils finissent
  exactement sur la cote relevée. Pas de cote relevée → pas de courbe. Seule
  `historiqueSimule` sera à remplacer par l'historique réel ; la forme `HistoriqueCote`
  reste.
- **Écrans.**
  - Fiche : « Évolution de la cote » de la maquette (tendance, cote du matin → au départ,
    survol point par point).
  - Tableau des partants : flèches de la maquette (baisse verte, hausse éteinte, à 8 %).
  - Page course : un panneau « Évolution des cotes », les trois plus fortes baisses et
    hausses avec leur mini-courbe (celle du comparateur de la maquette).
- **Honnêteté.** Chaque affichage porte la pastille « Simulée » et une phrase
  d'explication. `COTES_SIMULEES` (`config/app.ts`) ne l'active qu'en démo et en
  développement : **le build de production ne montre rien**.
- **Limite des données réelles.** Nos cotes sont des cotes de clôture relevées après la
  course : en données réelles, la courbe n'apparaît que sur les courses courues d'une
  réunion cotée.

### Lot 6 sexies — Comparateur (18/09/2026)

**Demande du fondateur (18/09).** Maquettes MainCompare et MobileCompare. Aucune donnée
nouvelle : tout vient de la course et des fiches France Galop (004).

- **Sélection.** Une case en tête de chaque ligne du tableau des partants (« Cochez pour
  comparer » sur téléphone) et un bouton « Comparer » dans la fiche cheval.
  - Deux à trois partants d'une même course ; jamais un non-partant.
  - Au-delà de trois, les autres cases s'éteignent.
  - La sélection suit la course affichée et vit dans le stockage de session : elle
    survit à une fiche, à une fiche jockey, à un rechargement.
- **Barre.** Collée en bas de l'écran (au-dessus des onglets sur téléphone), centrée sur
  la colonne de la course sur grand écran : numéros, indication, Vider, Comparer. Elle se
  pose sous la liste en fin de page et ne masque donc jamais le dernier partant.
- **Comparaison.** Fenêtre de 1 160 px sur grand écran (libellés à gauche, une colonne par
  cheval), plein écran sur téléphone (cartes, puis une grille par ligne).
  - Lignes : pronostic (et arrivée), chances de victoire, chances d'être placé, cote et
    tendance, écart au marché, musique, victoires / courses, allocations.
  - En vert, la meilleure valeur de victoire et de placé.
  - Retirer un cheval sous deux referme la fenêtre, comme la maquette.
  - Échap ferme, le focus va sur la fermeture, la page dessous ne défile plus.
  - Un nom ouvre la fiche. Depuis la fiche, « Comparer les N chevaux » la referme et
    rouvre la comparaison.
- **Code.** Logique dans `src/lib/comparaison.ts` (testée), écran dans
  `src/components/courses/Comparateur.tsx`.

**Écarts :**

- Sous le nom, l'âge, le sexe et la robe au lieu du jockey : la monte du jour n'est pas
  relevée.
- Pas de lignes « facteurs du pronostic » : le modèle ne les exporte pas.
- « Value » → « Écart au marché » (`LIBELLE_ECART`), « Gains » → « Allocations ».
- La tendance de cote est simulée (lot 6 quinquies), marquée « Simulée ». Sans la
  simulation (build de production), la ligne montre la cote seule. Les lignes cote et écart
  disparaissent sur une réunion sans cote.

### Lot 7 — Site vitrine, et Méthode dans l'app (18/09/2026)

**Décisions du fondateur (18/09) :** les tarifs de la maquette (A6), et la règle stricte
sur le vocabulaire (A8).

- **Socle.** `site/src/index.css` et `site/tailwind.config.ts` sont désormais des copies
  conformes de ceux de l'app : une seule charte. Logo et favicon de l'app. L'ancien code du
  site (sections, aperçus, `Bloc`, `TexteRevele`…) est retiré ; il reste dans la sauvegarde
  du 18/09. `site/CLAUDE.md` est réécrit.
- **Coquille.** En-tête de la maquette (trois liens, « 18+ », Se connecter, Essayer
  gratuitement ; « Connexion » seul sur téléphone) et pied de page (Produit, Légal, encart
  de mise en garde).
- **Accueil** (`site/src/pages/Accueil.tsx`) : héros et exemple de course fictif, quatre
  atouts, trois étapes, transparence, tarifs, mise en garde, FAQ.
- **Comment ça marche** (`site/src/pages/Methode.tsx`) : sommaire collé, sept sections,
  calculateur, FAQ, bandeau final.
- **Pages légales** : Confidentialité et Mentions légales en onglets, avec leur contenu
  réel.
- **Méthode dans l'app** (`src/pages/Methode.tsx`) : la même page que le site, plus une
  section « Comment nos résultats sont comptés » (`#mesure`, les règles de compte et
  l'encadré de correction du 14/09). Le bandeau final renvoie aux courses. L'ancre
  `/methode#mesure` de « Nos résultats » défile désormais jusqu'à la section (elle ne le
  faisait pas après une navigation interne). « Comment lire ce pronostic ? » pointe sur
  `#lire`. La FAQ (`components/ui/Accordeon`) est partagée avec le site.
- **Vérifié** sur le site (5195) et l'app (démo) : bureau 1440 px et téléphone 390 px conformes
  aux maquettes, aucun débordement, aucun mot banni, calculateur au seuil de 10 %.

**Écarts :**

- **Vocabulaire** (A8) : pas de page Jeu responsable, pas de message « jeux d'argent » ni de
  numéro Joueurs Info Service, pas de « Nous ne prenons aucun pari », pas de « Si vous
  pariez… ». La mise en garde dit : une probabilité est une estimation, aucun résultat n'est
  garanti, les performances passées ne préjugent pas des résultats futurs.
- **« Value » → « Écart + »**, au seuil de l'app (10 %, pas 25 %) ; nos cotes étant de
  clôture, l'écart se lit après la course. Pas de « cote en direct » ni d'« évolution depuis
  le matin ».
- **Le modèle ne lit pas les cotes** (la maquette les range parmi ses entrées), ni le
  terrain, la corde ou le poids : la liste est celle de nos entrées.
- **Les pourcentages ne sont pas recalculés** avant la course (la maquette dit l'inverse).
- **Rien d'inexistant n'est promis** : pas de facteurs du pronostic, de suivis ni d'alertes ;
  « Résiliable en deux clics » devient « Résiliable à tout moment » (la résiliation se fait
  par e-mail) ; « Rappel par e-mail avant le renouvellement » devient « Un seul paiement
  pour l'année ».
- « Les bons comme les mauvais » → « Tous, sans tri » : `site/CLAUDE.md` proscrit l'auto-
  dénigrement.
- Pas de « R1 » devant « C3 », pas de « [X ANNÉES] », pas de « [RAISON SOCIALE] ».
- **Pas de CGU** : la maquette n'en donne qu'un squelette « [À faire rédiger et valider par
  un juriste] ». À rédiger avant de vendre des Pass en ligne.
- **Boutons de formule** : des `mailto:` tant qu'il n'y a pas de paiement, et une phrase
  sous la grille le dit. « Essayer gratuitement » pointe sur `/inscription`, qui n'existe
  pas encore dans l'app : **le site ne doit pas être mis en ligne avant**.
- La « course offerte chaque jour » (Gratuit) est affichée comme la maquette, mais la règle
  n'existe pas encore dans l'app (A5).

### Lot 8 — Inscription, et textes réduits (18/09/2026)

**Demandes du fondateur (18/09) :** « réduis les fonts et fais la page de co et
inscription » ; le paiement passera par Stripe, plus tard : « dev comme si on avait tout de
prêt ». Réduction des textes dans l'app ET le site.

- **Inscription** (`src/pages/Inscription.tsx`, route publique `/inscription`), maquettes
  Signup / SignupPlans / SignupPay : Compte → Formule → Paiement → Bienvenue.
  - L'étape et la formule vivent dans l'adresse (`?etape=formule&formule=mois`) : le lien de
    confirmation d'e-mail et le retour de Stripe retombent sur la bonne étape. Le site y
    envoie chaque formule déjà cochée.
  - **Compte** : prénom, e-mail, mot de passe (8 caractères), date de naissance (barres
    posées à la frappe, 18 ans exigés), attestation de majorité, conditions générales et
    confidentialité (liens vers le site). Le compte est **réellement créé** par Supabase
    (`inscrire` dans `AuthContext`), avec prénom, date de naissance et horodatage des deux
    engagements en métadonnées.
  - Le projet exige la **confirmation de l'adresse** : sans session, une étape « Vérifiez
    vos e-mails » ; le lien ramène à l'étape Formule, connecté.
  - **Formule** : les quatre formules (`src/config/formules.ts`, égales à celles du site).
  - **Paiement** : récapitulatif TTC, case de consentement (accès immédiat et droit de
    rétractation, textes repris des travaux du 16/09 et étendus au Pass annuel, **à faire
    valider par un juriste**), puis envoi vers **Stripe Checkout**
    (`src/services/paiement.ts`). Le serveur reste à écrire : sans lui, l'étape affiche
    « pas encore ouvert ». En démo, le paiement est simulé.
  - **Bienvenue** : prénom, phrase selon la formule, « Voir les pronostics du jour ».
  - Logique testée : `src/lib/inscription.ts`.
- **Connexion** : « Pas encore client ? Écrivez-nous » devient « Créer un compte ». La page
  existait déjà (lot 6) : le fondateur voyait l'ANCIENNE, parce que le site renvoyait vers
  la production. En développement, le site pointe désormais vers l'app locale
  (`site/.env.development`).
- **Textes réduits** d'un cran, par script, dans l'app et le site : titres nettement (héros
  68 → 53 px, titres de section 40 → 34 px, titres de page 44 → 37 px), texte courant un peu
  (16 → 15 px, taille par défaut comprise), rien sous 15 px. L'ordre des tailles est gardé.
- **Vérifié** en démo : parcours complet, validation, consentement obligatoire, bureau et
  téléphone sans débordement ; site : liens de connexion et d'inscription vers l'app locale.
  **Pas testé contre la vraie base** : chaque essai y créerait un vrai compte.

**Écarts :**

- **Pas de champs de carte** : Stripe les affiche sur sa page hébergée (règle : aucune donnée
  de carte dans l'app). « Paiement sécurisé par Stripe » au lieu de « [PRESTATAIRE] ».
- Pas de « Recevoir les pronostics du lendemain par e-mail » (aucun envoi n'existe, A7), pas
  de « Personnaliser mon app » (pas d'onboarding), pas de « Si vous pariez… » (A8), pas de
  « Retour » à l'étape Formule (le compte est déjà créé).
- « Facture disponible dans Mon compte » devient « Reçu envoyé par e-mail après le
  paiement » : la page Compte n'a pas de factures.
- La bienvenue dit que le Pass « s'active dès que Stripe confirme le paiement » : c'est le
  webhook, pas l'adresse de retour, qui fera foi.

**À faire avant d'ouvrir l'inscription au public — sinon elle ouvre tout, gratuitement :**

1. Le serveur Stripe (session Checkout, webhook) et l'état d'abonnement en base.
2. **Le contrôle d'accès par formule**, dans l'app et dans les vues de la base. Aujourd'hui
   tout compte connecté voit tout. Et les inscriptions sont **déjà ouvertes** sur le projet
   Supabase (`disable_signup: false`, constaté le 18/09) : n'importe qui peut créer un compte
   par l'API avec la clé publique, même sans cette page.
3. La règle de la course offerte (A5).
4. Les conditions générales (et de vente), et les textes de consentement validés.

Les points 1 et 2 sont préparés au lot 9, ci-dessous. **Le point 2 est en place depuis
le 18/09** (migration 007 appliquée) : un compte créé sans Pass ne voit plus que la
formule Gratuit. Le point 1 attend Stripe.

### Lot 9 — Serveur Stripe et contrôle d'accès, préparés (18/09/2026)

**Demande du fondateur (18/09) :** « prépare le serveur Stripe et le contrôle d'accès ».
Tout est écrit. **La migration 007 est appliquée en production le 18/09 avec son accord** ;
les fonctions Stripe ne sont pas déployées.

- **Base** — `db/007_abonnements_et_acces.sql` (**appliquée le 18/09/2026**) :
  - tables `abonnements` (état par compte, lu par son titulaire seul, écrit par le seul
    rôle de service), `paiements_consentements` (preuve horodatée, gardée si le compte est
    supprimé), `stripe_evenements` (un événement Stripe ne s'applique qu'une fois) ;
  - `crosswell_acces_complet()` : Pass valide (`jour`, `mois`, `an`, `actif` ou
    `resiliation_programmee`, avant `acces_jusqua`) ou accès `offert`. Toujours vrai hors
    requête client (tâche pg_cron du classement, maintenance) ;
  - **les 4 comptes existants reçoivent un accès `offert`** : personne n'est coupé ;
  - `client_predictions` : sans accès complet, les courses **à venir** autres que la
    **course offerte** perdent rang et probabilités, et portent `verrouille`. Les courses
    jugées et les jours passés restent ouverts (« Nos résultats », promis au Gratuit) ;
  - les fiches jockey et entraîneur (vues de 005/006) sont réservées aux Pass ; la fiche
    d'un cheval (004) reste ouverte ;
  - **course offerte, règle par défaut à confirmer (A5)** : la première course du jour au
    départ. Un seul CTE à changer.
  - Vérifié sur la vraie base, sans rien modifier (objets temporaires) : la règle ouvre une
    course par jour à venir (Auteuil C1 10 h 32 le 17, Moulins C1 10 h 53 le 18, en
    simulation) ; 24 ms → 11 ms à 32 ms sur une fenêtre de 30 jours, selon le cas. Une
    première écriture rejouait le test de la course offerte ligne par ligne : réécrite en
    jointure avant de la soumettre.
- **Fonctions Stripe** — `supabase/functions/` (non déployées, voir leur `README.md`) :
  `paiement-session` (Checkout : paiement unique pour le Pass 1 jour, abonnement pour le
  mensuel et l'annuel ; refuse un second abonnement ; adresses de retour contrôlées),
  `stripe-webhook` (seul à ouvrir ou fermer l'accès, sur signature Stripe ; un Pass 1 jour
  compte 24 h à partir de l'activation et se prolonge s'il est encore valide ; ne
  rétrograde jamais un abonnement), `portail-stripe` (carte, factures, résiliation en
  ligne). **Non compilées localement** : ni Deno ni la CLI Supabase ne sont installés.
- **Application** :
  - `AccesProvider` lit l'accès (`crosswell_mon_acces()`) ; sans la migration, il ne
    verrouille rien (la base ne filtre rien non plus) ; les données se relisent quand
    l'accès change (après un paiement) ;
  - formule Gratuit, comme `MainFree` : bandeau « Formule gratuite », « Avec un Pass » sur
    les courses verrouillées (programme, ruban, accueil, demain, en-tête de course),
    « Offert » sur la course offerte, carte « Débloquez ce pronostic avec un Pass » avec
    « Voir mon pronostic offert », fiches jockey et entraîneur remplacées par une carte ;
  - Compte : formule, état, échéance (renouvellement, fin, impayé), « Choisir un Pass »,
    « Gérer mon abonnement » et « Résilier en ligne » par le portail Stripe ;
  - Inscription : la bienvenue attend la confirmation du webhook avant de dire le Pass
    actif ;
  - en démo, `?acces=gratuit` montre la formule Gratuit, `?acces=pass` y revient.
  - Vérifié en démo : une course offerte et les autres verrouillées sur le jour à venir,
    carte et lien vers l'offerte, Compte, fiche jockey ; avec un Pass, tout est ouvert.

**Contrôles après application (18/09, 19 h 30) :**
- les 4 comptes existants sont en `offert` : ils voient tout, et leur seule ligne
  d'abonnement ;
- un compte sans Pass : rang et probabilités absents sur aucune course jugée (les 16 du
  jour l'étaient déjà), classement des jockeys et entraîneurs vide, aucun abonnement
  visible ; la règle de la course offerte se vérifiera sur le programme de demain ;
- sans session, les vues, la table `abonnements` et la fonction d'accès sont refusées
  (42501) ;
- `client_predictions` sur 30 jours pour un compte sans Pass : 44 ms, mesure du plan
  comprise ; le rafraîchissement du classement et sa tâche pg_cron marchent toujours ;
- conseiller de sécurité : rien de nouveau hors ce qui est voulu (vues `client_*`
  en security definer comme depuis 003, deux tables fermées au client, deux fonctions
  ouvertes aux comptes connectés).

**Pour mettre en service** (ordre) : ~~appliquer 007~~ (fait le 18/09) → créer produits,
portail et webhook dans Stripe (mode test) → saisir les secrets → déployer les trois
fonctions → essayer avec la carte de test → passer en mode réel après CGV et validation
juridique.

### Lot 10 — L'historique des cotes, réel (25/09/2026)

**Demande du fondateur (25/09) :** « on vient d'ajouter la table d'historisation des cotes.
Tu peux voir pour l'ajouter à l'app en suivant le design donné sur les maquettes ? »

**La source.** `modele_prediction_engagement.cotes_jour`, alimentée par la tâche pg_cron
`crosswell-cotes-avant` (toutes les 30 minutes, de 11 h à 19 h) : une ligne par partant et
par relevé. Les clés collent à `predictions_log` (date, hippodrome, course, numéro) ; au
premier relevé du 25/09, les 14 courses du jour étaient couvertes, partant par partant.

**Deux arbitrages, tranchés par le fondateur le 25/09 :**
- **Portée.** Courbe ET cote du moment. Le tableau des partants affichait une colonne vide
  toute la journée — la cote de clôture n'arrive que le soir ; il montre maintenant le
  dernier relevé, avec son heure en infobulle.
- **L'écart au marché ne bouge pas.** Il reste calculé sur la cote de CLÔTURE
  (`lib/aggregate.ts`, `Partant.cote`, `Partant.pMarche`). Servir un écart au marché avant
  le départ ferait de Crosswell un service de value bets, ce que le positionnement exclut
  (A8). Les relevés du jour voyagent donc à part (`CotesCourse`), sans jamais alimenter
  `aggregate`. La fiche le dit quand la clôture manque : « La comparaison au marché se fait
  sur la cote de clôture, après la course. »

**Base** — `db/008_cotes_historique.sql`, **appliquée en production le 25/09/2026** avec
l'accord du fondateur : vue `public.client_cotes` (relevés des courses du modèle servi,
heure de Paris, cote > 1), réservée au rôle `authenticated`. Vérifié : anonyme refusé
(42501), 0,6 ms sur une course (index `cotes_jour_pkey`, semi-jointure sur
`predictions_log_uniq`). Pas de filtrage par formule : une cote est une donnée de marché,
pas un pronostic — et le pronostic des courses verrouillées (007) reste, lui, hors de portée.

**Application :**
- `services/cotes.ts` lit la vue course par course ; `lib/cotes.ts` (`cotesDeCourse`) en tire
  le dernier relevé de chaque partant et sa courbe, dès deux relevés ;
- `useCotes` (EvolutionCote) partage une lecture entre le tableau, la fiche, le comparateur
  et le panneau ; une course du jour se relit toutes les dix minutes, une course courue
  jamais ;
- les écrans ne disent plus « simulée » que quand ils le sont : `COTES_SIMULEES` est
  désormais la seule DÉMONSTRATION, qui n'a pas de base. Les libellés suivent les relevés
  (« Cote 5,2 à 11:53 → 4,2 à 12:23 », « Depuis le relevé de 11:53 », « Cote relevée toutes
  les 30 minutes, de 11 h à 19 h »).

### Lot 11 — La course offerte : la plus belle du jour (25/09/2026)

**Demande du fondateur (25/09) :** « gérer les courses masquées par la formule gratuite qui
affiche uniquement la première course de la journée ».

**Le défaut.** 007 ouvrait la PREMIÈRE course de chaque jour. Elle part en début d'après-midi,
et ensuite un compte gratuit n'a plus rien de lisible à venir : en démonstration, à 15 h,
l'accueil affichait « Avec un Pass » trente-huit fois et « Offert » zéro fois. C'est aussi
rarement la course qui donne envie — la première d'une réunion est souvent la plus petite.

**Deux arbitrages, tranchés par le fondateur :**
- **Quelle course** : la plus belle du jour — le plus gros peloton (`field_size`, le nombre de
  DÉCLARÉS, qui ne bouge pas quand un cheval est retiré), puis la catégorie la plus relevée
  (Groupe I, II, III, Listed), puis la première au départ, l'hippodrome et le numéro. Le choix
  est donc déterminé, et stable du matin au soir.
- **Combien** : une par jour, « tous les jours » — aujourd'hui comme les jours à venir.

**Réserve dite au fondateur :** les plus gros pelotons sont presque toujours des handicaps ;
sur quatre jours observés, aucun Groupe n'a été choisi. Inverser les deux critères (catégorie
d'abord) reste possible, c'est une ligne de SQL et une ligne de TypeScript.

**Base** — `db/009_course_offerte.sql`, **appliquée en production le 25/09/2026** avec l'accord
du fondateur. Seul le CTE `offertes` change. Vérifié pour un compte sans Pass : la seule course
à venir ouverte est Saint-Cloud C6 (16 partants, 16 h 38), aucune fuite de rang ni de
probabilité ; le reste de ce qui est lisible, ce sont les courses déjà jugées.

**Application :**
- `courseOfferte` et le miroir de démonstration (`lib/acces.ts`) suivent la même règle. Le
  nombre de déclarés absent range la course en DERNIER, comme `NULLS LAST` en base : deux
  règles qui divergeraient feraient pointer l'app vers une course en fait verrouillée ;
- le bandeau Gratuit NOMME la course offerte (« Offert aujourd'hui : C6 Saint-Cloud · 16:38 »)
  au lieu du vague « 1 pronostic offert par jour » ;
- la carte d'une course verrouillée dit « déjà couru » quand la course offerte est partie,
  plutôt que d'inviter à un pronostic qui n'en est plus un.
