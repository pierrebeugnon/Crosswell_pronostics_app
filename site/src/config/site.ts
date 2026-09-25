/**
 * Réglages du site vitrine — le seul fichier à modifier quand une adresse, un
 * seuil, un prix ou une mention change.
 *
 * Les seuils et les formulations sont RECOPIÉS depuis `../../src/config/app.ts`
 * de l'application, et doivent lui rester égaux : le site promet ce que
 * l'application tient. Le jour où l'un bouge là-bas, il bouge ici — sinon la
 * vitrine publie une promesse que le produit ne tient plus.
 */

/**
 * L'application, derrière son compte. `VITE_URL_APPLICATION` la remplace : en
 * développement (`.env.development`), c'est le serveur local de l'app — sans
 * quoi « Se connecter » ouvrirait la PRODUCTION, qui n'a pas forcément la même
 * version que le code en cours.
 */
export const URL_APPLICATION: string =
  import.meta.env.VITE_URL_APPLICATION ?? 'https://crosswell-pronostics.vercel.app'
export const URL_CONNEXION = `${URL_APPLICATION}/connexion`
/** « Nos résultats » vit dans l'application : il faut un compte pour le lire. */
export const URL_RESULTATS = `${URL_APPLICATION}/resultats`

/**
 * L'inscription, dans l'application (`../src/pages/Inscription.tsx`, 18/09/2026) :
 * Compte → Formule → Paiement (Stripe) → Bienvenue. `inscrireAvec` y arrive la
 * formule déjà cochée. Le paiement Stripe reste à brancher côté serveur : voir
 * « Ce qui attend le système de compte » dans CLAUDE.md.
 */
export const URL_INSCRIPTION = `${URL_APPLICATION}/inscription`
export const inscrireAvec = (cle: string) => `${URL_INSCRIPTION}?formule=${encodeURIComponent(cle)}`

export const CONTACT = 'contact@crosswell.fr'

/** Un lien e-mail avec son objet. */
export const ecrire = (objet: string) => `mailto:${CONTACT}?subject=${encodeURIComponent(objet)}`

/** Nom public du modèle. Le client ne voit jamais son identifiant technique. */
export const NOM_SCORE = 'Score Crosswell'

/**
 * Sous ce nombre de courses jugées, l'application signale l'échantillon court.
 * Doit rester égal à `SEUIL_ECHANTILLON` de `src/config/app.ts`.
 */
export const SEUIL_ECHANTILLON = 100

/**
 * Fenêtre de consultation par défaut de « Nos résultats », en jours : les N
 * derniers jours, AUJOURD'HUI COMPRIS. Doit rester égal à `FENETRE_JOURS` de
 * `src/config/app.ts`.
 */
export const FENETRE_JOURS = 30

/**
 * LE RYTHME DE PUBLICATION, tel que l'application l'écrit. Le calcul de la
 * VEILLE, décidé le 17/09/2026, a été ABANDONNÉ le 20/09 : le pipeline calcule
 * le matin même. Le site promettait encore la veille, et « aujourd'hui et
 * demain » — une promesse fausse, en ligne, corrigée le 25/09. AUCUNE heure :
 * une heure recopiée devient fausse dès qu'elle glisse. Doit rester égal à
 * `RYTHME_PUBLICATION_COURT` et `RYTHME_PUBLICATION` de `src/config/app.ts`.
 */
export const RYTHME_PUBLICATION_COURT =
  'Nos pronostics sont calculés chaque nuit et publiés le matin même, pour les courses du jour.'
export const RYTHME_PUBLICATION = `${RYTHME_PUBLICATION_COURT.slice(0, -1)} : une seule publication par jour, sans mise à jour en cours de journée.`

/**
 * Heure (Paris) approximative du relevé du soir, qui complète les arrivées lues
 * le jour même (places lointaines et cotes de clôture, sur les réunions cotées).
 * Doit rester égal à `HEURE_RELEVE_SOIR` de `src/config/app.ts`.
 */
export const HEURE_RELEVE_SOIR = 22

/** L'heure du relevé du soir, prête à citer : « 22 h », espace insécable. */
export const HEURE_RELEVE = `${HEURE_RELEVE_SOIR} h`

/**
 * Ce que l'on sait d'un non-partant, et quand : la formulation unique de
 * l'application, reprise telle quelle. Doit rester égal à `NOTE_NON_PARTANTS`
 * de `src/config/app.ts`.
 */
export const NOTE_NON_PARTANTS =
  'Un non-partant est signalé dès que nos relevés le connaissent, dans la journée de la course et au plus tard au relevé du soir — jamais en temps réel. Sur certaines réunions, ce statut n’est généralement pas vérifié : vérifiez la liste officielle.'

/**
 * L'ÉCART AU MARCHÉ. Un partant est marqué quand notre probabilité de victoire
 * dépasse d'au moins `MARGE_ECART` (en relatif) celle qu'implique sa cote. Le
 * libellé est celui de l'application : « Value », mot des maquettes, est banni
 * (voir `AVERTISSEMENT`). Doivent rester égaux à `MARGE_VALUE` et
 * `LIBELLE_ECART` de `src/config/app.ts`.
 */
export const MARGE_ECART = 0.1
export const LIBELLE_ECART = 'Écart +'

/**
 * Le niveau de confiance d'une course, lu sur les chances de notre favori.
 * Doivent rester égaux à `SEUILS_CONFIANCE` de `src/config/app.ts`.
 */
export const SEUILS_CONFIANCE = { elevee: 0.28, moyenne: 0.18 } as const

/**
 * LES FORMULES, et leur prix — ceux des maquettes, retenus par le fondateur le
 * 18/09/2026 (Gratuit, Pass 1 jour, mensuel, annuel).
 *
 * AFFICHER UN PRIX N'EST PAS UNE VALORISATION MONÉTAIRE au sens où
 * `AVERTISSEMENT` l'interdit. La règle bannit de chiffrer en euros ce que nos
 * probabilités RAPPORTERAIENT. Le prix de l'abonnement, lui, est le prix d'un
 * service d'analyse : il doit être affiché, clairement, comme sur n'importe quel
 * produit vendu en ligne.
 *
 * Les points ne promettent que ce que l'application fait : pas de « cote en
 * direct » (nos cotes sont celles de clôture), pas de suivis ni d'alertes (ils
 * n'existent pas), pas de « résiliable en deux clics » (la résiliation se fait
 * par e-mail tant qu'il n'y a pas de paiement en ligne).
 */
export interface Formule {
  cle: string
  nom: string
  prix: string
  periode: string
  precision: string
  points: readonly string[]
  action: string
  vedette?: boolean
}

export const FORMULES: readonly Formule[] = [
  {
    cle: 'gratuit',
    nom: 'Gratuit',
    prix: '0 €',
    periode: 'pour toujours',
    precision: 'Sans carte bancaire',
    points: [
      '1 course offerte chaque jour, pronostic complet',
      'Le programme complet du jour',
      'Nos résultats, en toute transparence',
    ],
    action: 'Commencer gratuitement',
  },
  {
    cle: 'jour',
    nom: 'Pass 1 jour',
    prix: '4,99 €',
    periode: '/ 24 h',
    precision: 'Sans abonnement',
    points: [
      'Toutes les courses pendant 24 h',
      'Pourcentages, cotes et écarts au marché',
      'Paiement unique, rien à résilier',
    ],
    action: 'Prendre le Pass 1 jour',
  },
  {
    cle: 'mois',
    nom: 'Pass mensuel',
    prix: '12,99 €',
    periode: '/ mois',
    precision: 'Sans engagement',
    points: [
      'Tous les pronostics, toutes les courses',
      'Fiches cheval, jockey et entraîneur, comparateur',
      'Résiliable à tout moment',
    ],
    action: 'Prendre le Pass mensuel',
    vedette: true,
  },
  {
    cle: 'an',
    nom: 'Pass annuel',
    prix: '99 €',
    periode: '/ an',
    precision: 'Soit 8,25 € / mois',
    points: [
      'Tout le Pass mensuel, toute l’année',
      '36 % moins cher que 12 mois au mensuel',
      'Un seul paiement pour l’année',
    ],
    action: 'Prendre le Pass annuel',
  },
]

/**
 * Positionnement, et il est STRICT (arbitrage du fondateur, confirmé le
 * 18/09/2026 face aux maquettes) : Crosswell publie des analyses statistiques
 * sur les courses hippiques. Ce n'est ni un opérateur de jeux ni un service de
 * conseil en mise — un secteur réglementé dans lequel nous n'entrons pas. Le
 * vocabulaire du jeu d'argent (pari, mise, miser, jouer, gain, rendement, ROI,
 * value, bankroll) est donc BANNI du site comme de l'application ; la page
 * « Jeu responsable » et le message officiel des maquettes ne sont pas repris.
 */
export const AVERTISSEMENT = {
  texte:
    'Nos probabilités sont des analyses statistiques, publiées à titre d’information. Elles ne constituent ni un conseil ni une incitation.',
  ageMinimum: 18,
} as const

/**
 * Éditeur, pour les mentions légales et les CGV. Renseigné le 25/09/2026
 * depuis le Registre national des entreprises (INSEE / INPI, via
 * l'Annuaire des Entreprises) : société immatriculée le 21/05/2026.
 *
 * `raisonSociale` est la DÉNOMINATION déposée, « CROSSWELL » — la forme
 * juridique se dit à part (`formeJuridique`), elle ne fait pas partie du nom.
 * `rcs` reprend le SIREN, greffe du siège ; à confirmer sur le Kbis.
 * Les champs manquants restent dits manquants, jamais inventés.
 */
export const EDITEUR = {
  raisonSociale: 'CROSSWELL',
  formeJuridique: 'SAS, société par actions simplifiée',
  capital: '1 €',
  siren: '105 309 322',
  siret: '105 309 322 00011',
  rcs: 'RCS Paris 105 309 322',
  tva: 'FR45 105 309 322',
  siege: '47 rue Vivienne, 75002 Paris, France',
  directeurPublication: 'Pierre Beugnon',
  hebergeur: {
    nom: 'Vercel Inc.',
    adresse: '340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis',
    site: 'https://vercel.com',
  },
} as const
