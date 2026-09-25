# Test de parité avec l'outil interne

L'app client et l'outil interne (`Crosswell-internal-tools`) calculent les mêmes indicateurs à partir des mêmes lignes. Ce test vérifie qu'ils les comptent pareil, sauf pour sept écarts décidés. Ces écarts sont eux aussi vérifiés à l'unité près, course par course.

```
npm run parite
```

## Les fichiers

| Fichier | Rôle |
|---|---|
| `generateur.ts` | Jeu déterministe (graine fixe) d'environ 3 200 courses et 33 000 lignes, au format de `monitoring_predictions`, pour un seul modèle. Il contient volontairement tous les cas limites : rang 1 déclaré non partant, `non_partant` NULL, `field_size` réaligné ou NULL, arrivées coupées au 5e ou au 7e, ex æquo de `pred_rank`, dead heats, vainqueur absent de nos lignes, cotes manquantes ou égales, `p_win` nul ou égal à 1, courses entières sans `pred_rank`, courses à deux chevaux classés, cotes d'avant-course seules ou à côté de la clôture, distances 0, NULL et aux frontières. `rang_effectif` y est calculé comme dans la vue SQL. |
| `reference.ts` | Ce qu'on extrait de l'outil interne : totaux entiers et détail par course (dont les trois libellés de segment). Jamais de pourcentage. |
| `parite.test.ts` | Les assertions. |
| `reference.json` | Instantané des agrégats de l'outil interne sur ce jeu. |

Le générateur tire les cas ajoutés après la relecture du lot 1 sur un second flux aléatoire (`GRAINE_CAS_AJOUTES`) : les courses d'origine gardent leurs pelotons, leurs arrivées et leurs cotes.

Les lignes données à l'app passent par `versLigneClient`, qui retire les colonnes absentes de la vue client (`cote_avant`, `cote_matin`, `non_partant_le`). L'outil interne reçoit les lignes complètes.

## Deux modes

- **En direct** (poste de développement) : le test importe le vrai `src/lib/aggregate.ts` de l'outil interne. Par défaut, il le cherche dans le dossier frère `../Crosswell-internal-tools`. On peut indiquer un autre dossier avec `CROSSWELL_OUTIL_INTERNE`.
  - L'outil interne utilise aussi l'alias `@/` pour ses propres imports.
  - Le plugin `crosswell:alias-par-projet` de `vitest.config.ts` résout `@/` selon le fichier qui importe : l'outil interne reçoit son propre `src`, l'app reçoit le sien.
- **Figé** (CI, Vercel, ou outil absent) : le bloc en direct est sauté. L'app est alors comparée à `reference.json`, avec exactement les mêmes assertions.

## Ce qui est vérifié

**Identique à l'outil interne.** Chaque point est vérifié course par course, puis sur les totaux quand l'écart voulu ne s'en mêle pas :

- courses et réunions, courses jugées ;
- rang 1 désigné et victoires du rang 1, hors courses sans aucun `pred_rank` (écart v) ;
- vainqueur retenu ;
- recouvrement du trio (Σ|act3 ∩ our3|), hors courses où des chevaux sans rang entrent dans nos trois (écart v) ;
- favori du marché, hors courses où un partant n'a que la cote d'avant-course (écart vi) ;
- segments de type et de distance (libellés traduits : `Black-type` = `Groupe & Listed`, `Stayer (>2200m)` = `Tenue (> 2 200 m)`, etc.) ; les frontières 1 400, 1 800 et 2 200 m, la distance 0 (sprint des deux côtés) et NULL sont vérifiées explicitement ;
- tranches de confiance.

Trois cas limites des tranches de confiance sont traités explicitement :

- l'outil interne ne renvoie rien en dessous de 8 favoris ;
- l'outil interne exclut p = 1 de sa dernière tranche, alors que l'app l'y inclut ;
- sur une course sans rang, l'outil interne compte le point de son rang 1 ; l'app n'en a pas (écart v).

**Écarts voulus, mesurés exactement :**

1. **(i) Calibration.** Points de l'app = points internes − points des non-partants (+ les points p = 1 de la dernière tranche).
2. **(ii) Dans les trois ou places payées.** L'écart vaut exactement le nombre de courses où le rang 1 finit dans les trois mais au-delà de `npl`. Il se décompose en trois cas :
   - 3e sur 4 à 7 partants ;
   - peloton de moins de 4 partants ;
   - double soustraction des non-partants par l'outil interne quand `field_size` a déjà été réaligné.
3. **(iii) Repère du hasard.** L'app calcule la moyenne des 1/partants au départ.
   - Sur le jeu généré, la valeur est recalculée indépendamment sur les lignes brutes.
   - Sur un petit jeu écrit à la main (6, 16 et 9 partants au départ, dont un non-partant), la valeur est figée en fraction exacte : 49/432 en victoire, 49/144 dans les trois. L'écart avec les définitions de l'outil interne y est mesuré : +37/10 800 avec sa constante de 11 %, −19/2 160 avec la courbe de la vue Modèles (moyenne des 1/(`field_size` || 10)), −11/5 616 avec son tableau (1 / moyenne), −19/720 en place.
4. **(iv) Dead heat.** `faceAuMarche` juge chaque camp sur `arrivee === 1`. Sur les courses comparées avec le même favori du marché, victoires du marché de l'app = interne + dead heats où le favori du marché est arrivé premier sans être le vainqueur retenu. Nos victoires ne bougent pas : notre rang 1 arrivé premier est toujours le vainqueur retenu. L'écart est nul par construction, et c'est asserté course par course.
5. **(v) Cheval sans `pred_rank`.** L'app ne lui donne aucun rang. L'outil interne garde le `rang_effectif` de la vue (`rank()` NULLS LAST : rang 1 à tout le peloton si rien n'est classé, rang k + 1 sinon).
   - Rang 1 : sur une course sans aucun rang, l'outil interne retient le plus petit numéro, l'app aucun cheval.
   - Victoires : app = interne − victoires de ces rangs 1.
   - Trio : app = interne − chevaux sans rang arrivés dans les trois sur les courses à au plus deux partants classés.
   - Place et face au marché : voir (ii) et les totaux ci-dessous.
6. **(vi) Cote d'avant-course.** L'outil interne désigne son favori du marché sur `cote ?? cote_avant` (`coteDeRetour`) ; l'app, qui ne reçoit pas `cote_avant`, sur la clôture seule. Les deux formules sont vérifiées course par course. Deux cas sont exercés : la course dont les partants cotés n'ont que l'avant-course (l'app n'a pas de favori du marché) et la course où l'avant-course désigne un autre cheval.
7. **(vii) Segment de peloton.** L'outil interne range une course par `fieldBucket(field_size)` (les déclarés, NULL = « n/c ») ; l'app par `tranchePeloton(partants au départ)`. Mêmes seuils, vérifiés sur chaque course. Les courses qui changent de case sont exactement celles sans `field_size` ou dont les non-partants font passer un seuil. Les agrégats `parSegment` de l'app sont recalculés depuis `segmentStats` de l'outil interne en déplaçant ces seules courses.

**Face au marché, totaux.** Chaque course est rangée dans une seule case, et on vérifie :

- n de l'app = n interne − courses exclues faute de rang 1 (v) ou de clôture (vi) ;
- nos victoires = interne − nos victoires sur ces courses ;
- accord = interne − accord sur ces courses ± changements d'accord dus à l'avant-course ;
- victoires du marché = interne − victoires du marché sur ces courses + dead heats (iv) ± changements dus à l'avant-course (vi).

La lecture course par course doit aussi redonner exactement `marketStats`.

Toute autre divergence fait échouer le test. Le message indique la course (`date|hippodrome|n°`) et le champ en cause.

## Ancrages indépendants des deux codes

- **`rank()` de la vue.** Trois courses réelles de `client_predictions`, extraites de la base : Lion d'Angers C6 du 20/08, Deauville C4 du 23/08 et La Teste C8 du 26/08, toutes à rang 1 publié non partant. Leur sortie est figée dans le test. `rangsEffectifsSql` doit la reproduire, et `construireCourses` doit en tirer le favori, la place, le rang 1 retiré, les partants et les non-partants attendus.
  - Aucune de ces courses n'a de `pred_rank` NULL ni d'ex æquo. Ces deux cas ne sont couverts que par la règle SQL de `rank()`, recopiée dans le générateur.
- **Repère du hasard** : la valeur figée en fraction décrite en (iii).

## Régénérer `reference.json`

Il faut le régénérer quand l'outil interne ou le générateur change volontairement. En mode direct, le test échoue dans ce cas et liste les écarts avec l'instantané. Commencez par vérifier la cause, puis :

```
# bash
MAJ_REFERENCE=1 npm run parite
# PowerShell
$env:MAJ_REFERENCE='1'; npm run parite; Remove-Item Env:MAJ_REFERENCE
```

- Le fichier est aussi écrit s'il est absent, dès que l'outil interne est présent.
- Il enregistre le commit de l'outil interne qui l'a produit.
- Committez-le avec la modification qui l'a rendu nécessaire.
- Relancez ensuite `npm run parite` sans la variable : le bloc figé doit passer sur le nouveau fichier.
