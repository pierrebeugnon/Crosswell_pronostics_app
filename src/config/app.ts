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
 * LES SEUILS DE LECTURE — tous ici, et nulle part ailleurs.
 *
 * Chacun est une promesse publique : le site vitrine et la page Méthode les
 * citent. Un seuil recopié en dur dans une page finit toujours par diverger du
 * texte qui l'annonce ; d'où cette liste unique.
 */

/**
 * Sous ce nombre de courses jugées, un taux affiché n'est qu'un accident
 * d'échantillon. Les pages de statistiques le disent au lieu de le taire.
 */
export const SEUIL_ECHANTILLON = 100

/**
 * Sous ce nombre de points, une tranche de calibration ou de confiance n'est
 * pas commentée : l'intervalle y couvre plus de vingt points.
 */
export const SEUIL_TRANCHE = 20

/**
 * LA CONFIANCE D'UNE COURSE — à quel point notre rang 1 se détache. Elle ne
 * dépend que de sa probabilité de victoire : « Élevée » à partir de 28 %,
 * « Moyenne » de 18 à 28 %, « Faible » en dessous. Seuils repris des maquettes
 * de la refonte (`design/screens/How.dc.html`, « La confiance ») : la page
 * Méthode les citera, d'où leur place ici.
 */
export const SEUILS_CONFIANCE = { elevee: 0.28, moyenne: 0.18 } as const

/**
 * CE QUE L'ON SAIT D'UN NON-PARTANT, ET QUAND — une seule formulation, reprise
 * à l'identique partout où l'interface en parle. Deux pages voisines disaient
 * « le soir, parfois le lendemain » et « le matin ou le soir » : un client lit
 * les deux et ne sait plus rien. Faits : le statut est posé par la prédiction
 * (cheval disparu du peloton) ou par le relevé PMU du soir ; en septembre 2026,
 * tous les statuts étaient posés entre 14 h et 20 h le jour de la course ; les
 * réunions sans cote n'ont pas de relevé PMU (d'où « sur certaines réunions »).
 */
export const NOTE_NON_PARTANTS =
  'Un non-partant est signalé dès que nos relevés le connaissent, dans la journée de la course et au plus tard au relevé du soir — jamais en temps réel. Sur certaines réunions, ce statut n’est généralement pas vérifié : vérifiez la liste officielle.'

/**
 * LE RYTHME DE PUBLICATION — une seule formulation, reprise telle quelle par
 * toutes les pages (accueil, réunion, course, compte, connexion, Méthode).
 *
 * DÉCISION DU 17 SEPTEMBRE 2026 : le pipeline est en cours de reprogrammation
 * pour calculer PENDANT LA NUIT les pronostics du LENDEMAIN, afin que le client
 * dispose toujours de ceux d'aujourd'hui ET de ceux de demain. Les textes
 * annoncent ce rythme dès maintenant, à la demande du fondateur, alors qu'à
 * cette date la production calcule encore le jour même vers 7 h (et, avant le
 * 6 septembre 2026, la veille vers 19 h).
 *
 * Aucune heure n'est écrite : le nouveau pipeline n'en a pas encore de garantie,
 * et une heure recopiée devient une promesse fausse dès qu'elle glisse. Si une
 * heure est un jour garantie, c'est ici seulement qu'elle s'ajoute.
 */
export const RYTHME_PUBLICATION_COURT =
  'Nos pronostics sont calculés dans la nuit et publiés dès la veille de la course.'

/**
 * La phrase complète, avec la promesse « toujours aujourd'hui et demain ». Elle
 * dérive de la version courte pour que les deux ne divergent jamais. Les ÉTATS
 * VIDES (« aucune réunion aujourd'hui », « demain pas encore publié ») n'en
 * affichent que la version courte : la promesse, posée sous un titre qui
 * constate l'inverse, se contredirait dans le même panneau — et c'est
 * exactement ce que le client lit tant que la production calcule le jour même.
 */
export const RYTHME_PUBLICATION = `${RYTHME_PUBLICATION_COURT.slice(0, -1)} : vous avez toujours ceux d’aujourd’hui et ceux de demain.`

/**
 * Heure (Paris) approximative du relevé du soir, qui COMPLÈTE les arrivées du
 * jour. Les arrivées elles-mêmes sont lues le jour même, au fil de l'après-midi
 * (toutes les trente minutes environ depuis septembre 2026) ; le passage du
 * soir ajoute les places au-delà du 5e et les cotes de clôture, sur les seules
 * réunions cotées. Les textes qui décrivent ce calendrier lisent l'heure ici :
 * écrire « le lendemain » ou « 22 h » en clair a déjà produit une promesse
 * fausse sur le moment des arrivées.
 */
export const HEURE_RELEVE_SOIR = 22

/**
 * Tous les jours de l'application sont des jours de PARIS. Les réunions sont
 * datées en heure française ; un client en voyage ou une machine d'intégration
 * en UTC ne doit pas voir « aujourd'hui » glisser d'un jour entre minuit et 2 h.
 */
export const FUSEAU = 'Europe/Paris'

/**
 * Date de la correction du socle de mesure (non-partants, calibration, repère
 * du hasard, fenêtres). Publiée telle quelle sur « Nos résultats » et dans
 * Méthode : des chiffres qui baissent sans explication datée ressemblent à une
 * retouche, jamais à de la rigueur.
 */
export const DATE_CORRECTION_MESURE = '2026-09-14'

/**
 * Écart minimal entre notre probabilité et celle du marché pour qu'un partant
 * soit signalé comme « value ». 10 % de marge : en deçà, l'écart tient au bruit
 * d'estimation plus qu'à un désaccord réel avec le marché.
 */
export const MARGE_VALUE = 0.1

/**
 * La fenêtre de consultation par défaut, en jours. La définition qui fait foi
 * pour les chiffres est `PERIODE_FENETRE` dans `lib/periodes.ts` (contexte de
 * données, « Nos résultats ») ; cette valeur sert aux TEXTES de l'accueil et de
 * la page Réunions, et au site vitrine, dont `FENETRE_JOURS`
 * (`site/src/config/site.ts`) doit lui rester égal.
 */
export const FENETRE_JOURS = 30

/**
 * L'adresse de l'équipe : assistance, données personnelles et gestion de
 * l'abonnement. Une seule écriture, reprise par la page Compte : deux adresses
 * recopiées finissent par diverger.
 */
export const CONTACT = 'contact@crosswell.fr'

/**
 * Le site vitrine (`site/`), où vivent les pages légales que l'inscription fait
 * accepter : conditions générales (à rédiger) et confidentialité. `VITE_URL_SITE`
 * en production ; en développement, le serveur local du site. Vide : les liens
 * s'affichent sans adresse plutôt que vers une page qui n'existe pas.
 */
export const URL_SITE: string =
  import.meta.env.VITE_URL_SITE ?? (import.meta.env.DEV ? 'http://localhost:5195' : '')

/** Mode démonstration : jeu fictif, aucun appel réseau, bandeau permanent. */
export const DEMO = import.meta.env.VITE_DEMO === '1'

/**
 * L'ÉVOLUTION DE LA COTE EST SIMULÉE (`lib/cotes.ts`) : aucun historique des
 * cotes n'est encore enregistré (design/INTEGRATION.md, A4). Affichée en démo
 * et en développement pour travailler l'écran, toujours marquée « simulée » ;
 * masquée dans le build de production, où une courbe inventée passerait pour
 * une mesure. Disparaît quand l'historique réel existe.
 */
export const COTES_SIMULEES = DEMO || import.meta.env.DEV

/**
 * LE MARQUEUR D'ÉCART AU MARCHÉ — un seul libellé, partout où un partant est
 * signalé au-delà de MARGE_VALUE (course, fiche, accueil, Méthode). Les
 * maquettes de la refonte disent « Value » ; le mot est banni (voir
 * AVERTISSEMENT et le README, « Positionnement ») tant que le positionnement
 * n'est pas tranché (design/INTEGRATION.md, A8). S'il l'est, c'est ici seulement.
 */
export const LIBELLE_ECART = 'Écart +'
export const TITRE_ECARTS = 'Écarts au marché'

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
