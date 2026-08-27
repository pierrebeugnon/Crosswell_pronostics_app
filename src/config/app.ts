/**
 * Réglages produit — le seul endroit à modifier quand la R&D avance.
 *
 * LE MODÈLE N'EST PAS UN CHOIX DU CLIENT. La base en contient onze, en cours
 * d'évaluation ; les exposer reviendrait à demander à l'utilisateur un
 * arbitrage qu'il n'a pas les moyens de faire, et à publier la R&D interne.
 * L'application affiche donc UNE prédiction, le « Score Crosswell », et ce
 * fichier dit lequel des modèles le porte. Le jour où un autre modèle gagne,
 * une ligne suffit — aucune page n'a besoin d'être touchée.
 */

/** Version du modèle servie aux clients. Doit exister dans `model_version`. */
export const MODELE_CLIENT = 'rating+forme.v1'

/** Nom public du modèle. Le client ne voit jamais `rating+forme.v1`. */
export const NOM_SCORE = 'Score Crosswell'

/**
 * Sous ce nombre de courses jugées, un taux affiché n'est qu'un accident
 * d'échantillon. Les pages de statistiques le disent au lieu de le taire.
 */
export const SEUIL_ECHANTILLON = 100

/**
 * Écart minimal entre notre probabilité et celle du marché pour qu'un partant
 * soit signalé comme « value ». 10 % de marge : en deçà, l'écart tient au bruit
 * d'estimation plus qu'à un désaccord réel avec le marché.
 */
export const MARGE_VALUE = 0.1

/** Nombre de jours d'historique chargés par défaut sur les pages de suivi. */
export const FENETRE_JOURS = 30

/** Mode démonstration : jeu fictif, aucun appel réseau, bandeau permanent. */
export const DEMO = import.meta.env.VITE_DEMO === '1'

/**
 * Positionnement, et il est STRICT : Crosswell publie des analyses
 * statistiques sur les courses hippiques. Ce n'est ni un opérateur de jeux ni
 * un service de conseil en mise — un secteur réglementé dans lequel nous
 * n'entrons pas. Le vocabulaire du jeu d'argent (pari, mise, gain, rendement)
 * est donc banni de l'interface : le produit mesure la justesse de ses
 * probabilités, il ne valorise rien en euros et ne recommande aucune action.
 * Toute nouvelle page doit tenir cette ligne.
 */
export const AVERTISSEMENT = {
  texte:
    'Nos probabilités sont des analyses statistiques, publiées à titre d’information. Elles ne constituent ni un conseil ni une incitation.',
  ageMinimum: 18,
} as const
