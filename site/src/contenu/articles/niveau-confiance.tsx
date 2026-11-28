import { Link } from 'react-router-dom'
import { Chiffre, Encadre, H2, H3, Illustration, Liste, P } from '@/components/blog/Corps'
import {
  FORMULES,
  NOM_SCORE,
  RYTHME_PUBLICATION_COURT,
  SEUIL_PELOTON_OUVERT,
  SEUILS_CONFIANCE,
  URL_RESULTATS,
  inscrireAvec,
} from '@/config/site'
import { pourcent } from '@/lib/format'

/**
 * MINI-ARTICLE N°3 DE LA SÉRIE « FONCTIONNALITÉS » — le niveau de confiance.
 *
 * Demandé par le fondateur le 22/11/2026, après la mesure du jour : les chances
 * de notre favori disent, AVANT le départ, si une course se lit autour d'un
 * cheval ou si elle reste ouverte. La consigne est de VENDRE la fonctionnalité,
 * écrans à l'appui, comme `course-offerte.tsx` et `comparateur-chevaux.tsx` :
 * factuel, ni pédagogique ni technique. L'angle : un pronostic désigne
 * toujours un favori ; le nôtre dit en plus s'il se détache, et le dit
 * franchement quand ce n'est pas le cas. Le calcul détaillé reste sur
 * /methode#confiance, où l'article renvoie.
 *
 * AUCUN TAUX DANS LE TEXTE (règle du blog, confirmée le 22/11/2026) : les taux
 * restent dans l'application, avec leur effectif. La seule phrase de résultat
 * est QUALITATIVE, datée et au passé (section `nos-resultats`) : « au
 * 22 novembre 2026 […] l'échelle tenait sur l'ensemble : plus le niveau était
 * élevé, plus notre favori s'était imposé souvent, et plus souvent il avait
 * fini dans les trois premiers ». Recontrôlée sur `resultats_publics` le 22/11/2026
 * (favori = rang 1 parmi les partants, courses jugées) : l'ordre Élevée >
 * Moyenne > Faible tient en victoire comme en place, sur tout l'historique
 * (vue par défaut de « Nos résultats », sans filtre : 1 574 courses depuis le
 * 11/09), sur les 30 derniers jours (du 24/10 au 22/11, 638 courses) et du 10
 * au 22/11 (268 courses). Sur cette dernière période, l'écart Élevée/Moyenne
 * en victoire est mince (19 courses Élevée) : d'où la date et le passé.
 * Si le fondateur ne veut aucune affirmation de résultat, c'est la phrase à
 * retirer ; le paragraphe se lit sans elle.
 *
 * D'OÙ VIENT CHAQUE FAIT
 * - Les trois niveaux : `confianceCourse()` de `../src/lib/programme.ts`, qui
 *   ne lit que la probabilité de victoire du favori. Seuils lus dans
 *   `SEUILS_CONFIANCE`, égaux à ceux de `../src/config/app.ts`.
 * - Où le niveau s'affiche : `../src/components/courses/EnTeteCourse.tsx`
 *   (encart « Confiance du pronostic » et lien « Comment lire ce pronostic ? »
 *   sur ordinateur, ligne « Confiance … » sur téléphone) et
 *   `../src/components/accueil/ProchaineCourse.tsx`, qui ne montre la
 *   confiance QUE sur ordinateur (la carte du téléphone ne l'a pas : d'où
 *   « sur ordinateur » dans le texte). La liste du programme n'affiche AUCUNE
 *   confiance : l'article n'écrit jamais « dans le programme ».
 * - Les proportions : `resultats_publics`, courses jugées du 10 au 22/11/2026,
 *   relevé du 22/11/2026 au soir : 268 courses sur 13 journées ; Faible 146,
 *   Moyenne 103, Élevée 19 (7 %, d'où « moins d'une sur dix ») ; 7 journées
 *   sur 13 avec au moins une course Élevée ; 48 courses sous le seuil du
 *   peloton très ouvert (18 %, « environ une sur six », d'où « ≈ » dans le
 *   grand chiffre) ; 3,7 par journée EN MOYENNE (« près de quatre »), mais de
 *   0 à 7 selon les jours : pas de « journée type » ; 12 journées sur 13 en ont
 *   compté au moins une ; 20,6 courses par jour.
 *   Période choisie parce que les seuils actuels datent du 09/11/2026 au soir :
 *   avant, les probabilités publiées n'avaient pas la même échelle, et des parts
 *   calculées sur tout l'historique seraient fausses.
 * - « Un gros peloton est souvent ouvert, pas toujours ; un petit souvent
 *   lisible, pas toujours » : même relevé (58 courses de 14 partants et plus,
 *   dont 5 Moyenne ; 87 de 8 partants et moins, dont 11 Faible). C'est la
 *   traduction sans chiffre de la mesure du 22/11 : à chances égales, la taille
 *   du peloton n'ajoute rien. D'où « cela ne se devine pas au nombre de
 *   partants », et une définition de « Faible » qui ne parle pas du nombre de
 *   partants.
 * - « Nos résultats » : `../src/pages/Resultats.tsx` (panneau « Par niveau de
 *   confiance », « N courses » par ligne, pointillés = moyenne de la
 *   sélection), `../src/lib/resultats.ts` (`INDICATEURS` : gagnant, placé,
 *   top 3 ; « en victoire comme en place » n'en cite que deux, sans les
 *   nommer comme des paris) et `CLES_FILTRES` (le texte en cite quatre).
 *   Ouvert en Gratuit (db/007) : les courses jugées sont lisibles par tous.
 * - Gratuit et Pass : vue `client_predictions` (db/023). La course offerte est
 *   complète, confiance comprise ; une course jugée s'ouvre à tous ; les autres
 *   courses à venir affichent « Avec un Pass » à la place. La course offerte
 *   est, depuis le 28/11, celle où notre 1er a la plus forte chance (db/024),
 *   mais le texte ne le dit pas : consigne du fondateur, ne pas la présenter
 *   comme notre course la plus sûre (voir `course-offerte.tsx`).
 *
 * CE QUI N'EST PAS ÉCRIT, ET POURQUOI
 * - La capture du panneau de « Nos résultats » : elle affiche des taux, même
 *   fictifs, sans dire quel indicateur, et n'a pas de ligne « Élevée ».
 * - Les alertes : CLAUDE.md dit qu'elles n'existent pas pour le site, et
 *   personne n'a vérifié l'envoi en production.
 * - Le handicap, toute comparaison avec d'autres services ou avec le marché
 *   (consigne du 08/11/2026 ; « un nom en tête ne dit pas tout » parle de
 *   NOTRE classement, et « ne s'accorde pas d'office » remplace « n'est pas
 *   distribué pour rassurer », qui visait les autres en creux), tout ce qui laisserait entendre que la méthode
 *   rapporte. Ni « enjeu », ni « parieur », ni « rendement » : l'exception de
 *   l'accueil ne vaut pas pour les articles. Ni « trio dans le désordre »
 *   (nom d'un pari PMU).
 * - Le lien « Nos résultats » mène à l'app (URL_RESULTATS), comme dans les
 *   autres articles de la série : un lecteur sans compte y trouve la
 *   connexion, et l'appel final mène à l'inscription.
 *
 * LES CAPTURES viennent de l'application EN MODE DÉMONSTRATION (Saint-Cloud,
 * C7, course fictive pas encore courue, réunion sans cote), prises le
 * 22/11/2026. Ni date ni bascule de jour dans le cadre : les pronostics sont
 * publiés le matin même. La démonstration n'a ni course « Élevée » ni peloton
 * très ouvert : la course montrée est « Moyenne ».
 */

/**
 * LE PASSAGE « PELOTON TRÈS OUVERT », RETIRABLE EN UNE LIGNE.
 *
 * La mention est commitée dans l'application (8540336, 22/11/2026) mais N'EST
 * PAS ENCORE EN PRODUCTION à l'écriture. Passer à `false` si l'application
 * n'est pas déployée le jour de la publication. AVANT de retirer `brouillon`
 * de `articles.json`, chercher « peloton très ouvert » dans le bundle de
 * production de l'app (absent le 22/11/2026 à 22 h 23). À `false`, le H3 et
 * son chiffre disparaissent, et rien d'autre (ni le sommaire, ni le chapô, ni les titres
 * SEO, ni une autre phrase) n'y renvoie. Une fois l'app en ligne,
 * l'interrupteur peut partir et le bloc rester. Laissé à `true` pour que le
 * fondateur relise l'article entier en aperçu. À ce déploiement, la page
 * Méthode (site et app) devra distinguer « Faible » de « peloton très
 * ouvert » : elle appelle aujourd'hui tout le niveau Faible « Course très
 * ouverte ». Le seuil se lit dans `SEUIL_PELOTON_OUVERT` de `@/config/site`,
 * égal à celui de `../src/config/app.ts`.
 */
const AVEC_PELOTON_OUVERT = true

export default function NiveauConfiance() {
  const passJour = FORMULES.find((f) => f.cle === 'jour')

  return (
    <>
      <P>
        Prenez deux courses de la même journée. Dans l’une, un cheval domine sur le papier&nbsp;; dans l’autre, une
        douzaine de partants se tiennent de près. Un pronostic hippique désigne un favori dans les deux. Le nôtre dit
        en plus, avant le départ, si ce favori se détache vraiment ou si le peloton reste ouvert&nbsp;: c’est le niveau
        de confiance. Un nom en tête ne dit pas tout&nbsp;: avec ce niveau, chaque pronostic dit aussi jusqu’où il
        s’engage, et vous savez quelles courses valent qu’on s’y arrête.
      </P>

      <H2 id="trois-niveaux">Trois niveaux de confiance, lus avant le départ</H2>
      <P>
        Le {NOM_SCORE} chiffre les chances de victoire de tous les partants, course par course. Le niveau de confiance
        se lit sur un seul de ces chiffres&nbsp;: les chances de notre favori, le cheval que nous classons premier.
      </P>
      <Liste
        points={[
          <>
            <strong>Élevée</strong>, quand notre favori a au moins {pourcent(SEUILS_CONFIANCE.elevee)} de chances de
            victoire&nbsp;: il se détache nettement.
          </>,
          <>
            <strong>Moyenne</strong>, dès {pourcent(SEUILS_CONFIANCE.moyenne)}&nbsp;: la course se resserre sur quelques
            chevaux.
          </>,
          <>
            <strong>Faible</strong>, en dessous&nbsp;: les chances se partagent davantage, aucun cheval ne se détache.
          </>,
        ]}
      />
      <P>
        {RYTHME_PUBLICATION_COURT} Le niveau de confiance arrive avec eux&nbsp;: d’un coup d’œil, vous savez si notre
        classement repose sur un cheval qui domine ou sur un peloton serré.
      </P>

      <H2 id="ou-le-lire">Où le lire dans l’application</H2>
      <Illustration
        src="/media/confiance-course-bureau.png"
        alt={
          'La page d’une course dans l’application Crosswell sur ordinateur\u00a0: en haut, le nom de la course, sa catégorie, sa distance et son nombre de partants\u00a0; à droite, l’encart «\u00a0Confiance du pronostic\u00a0» qui affiche «\u00a0Moyenne\u00a0» avec deux barres sur trois\u00a0; dessous, l’arrivée prédite en cinq cartes, avec les chances de victoire de chaque cheval.'
        }
        largeur={1976}
        hauteur={858}
        legende={
          'Une course sur ordinateur, avec l’encart «\u00a0Confiance du pronostic\u00a0». Chevaux et chiffres fictifs, pour illustration.'
        }
      />
      <P>
        Sur ordinateur, le niveau a son propre encart en haut de chaque course, «&nbsp;Confiance du pronostic&nbsp;»&nbsp;:
        trois barres croissantes, allumées jusqu’au niveau atteint, et son nom en toutes lettres. Sur ordinateur
        toujours, la carte «&nbsp;Prochaine course&nbsp;» de l’accueil l’affiche sous nos cinq premiers&nbsp;: vous savez
        à quoi vous attendre avant même d’ouvrir la course.
      </P>
      <P>
        Sur téléphone, il tient en une ligne, sous le nom et la distance de la course, juste avant l’arrivée
        prédite&nbsp;: «&nbsp;Confiance faible&nbsp;», «&nbsp;moyenne&nbsp;» ou «&nbsp;élevée&nbsp;».
      </P>
      <Illustration
        src="/media/confiance-course-mobile.png"
        alt={
          'La page d’une course dans l’application Crosswell sur téléphone\u00a0: le nom de la course, sa distance et son nombre de partants, la mention «\u00a0Confiance moyenne\u00a0» avec deux barres sur trois, puis l’arrivée prédite, avec le premier cheval dans une grande carte verte et les quatre suivants en dessous.'
        }
        largeur={780}
        hauteur={1029}
        legende="La même course sur téléphone. Chevaux et chiffres fictifs, pour illustration."
        etroite
      />

      <H2 id="une-journee">Toutes les courses ne se lisent pas de la même façon</H2>
      <P>
        Les trois niveaux ne reviennent pas aussi souvent. Du 10 au 22 novembre 2026, un peu plus d’une course jugée sur
        deux était en confiance faible, plus d’une sur trois en confiance moyenne, et moins d’une sur dix en confiance
        élevée.
      </P>
      <Chiffre valeur="7 sur 13" source="Courses jugées du 10 au 22 novembre 2026, relevé du 22 novembre 2026">
        Sur ces treize journées, sept ont compté au moins une course en confiance élevée. Ce niveau ne s’accorde pas
        d’office&nbsp;: quand ses trois barres s’allument, ce sont les chances qui le disent.
      </Chiffre>
      <P>
        Et cela ne se devine pas au nombre de partants. Un gros peloton est souvent ouvert, pas toujours&nbsp;; un petit
        est souvent lisible, pas toujours. Seules les chances de chaque partant le disent, et ce sont elles que le{' '}
        {NOM_SCORE} publie chaque matin, course par course. Concrètement, le niveau change deux choses.
      </P>
      <Liste
        points={[
          <>
            <strong>Votre attention va là où elle compte.</strong> Une course où notre favori se détache l’annonce dès
            son en-tête.
          </>,
          <>
            <strong>Une course ouverte se lit pour ce qu’elle est.</strong> Vous savez d’avance que les chances se
            partagent, et vous regardez tout le peloton plutôt qu’un seul nom.
          </>,
        ]}
      />

      {/* ── DÉBUT « PELOTON TRÈS OUVERT » : voir AVEC_PELOTON_OUVERT en tête de fichier ── */}
      {AVEC_PELOTON_OUVERT && (
        <>
          <H3>Quand le peloton est très ouvert, nous l’écrivons</H3>
          <P>
            Tout en bas de l’échelle, certaines courses sont signalées à part. Quand notre favori a moins de{' '}
            {pourcent(SEUIL_PELOTON_OUVERT)} de chances, l’en-tête de la course ajoute la mention «&nbsp;peloton très
            ouvert&nbsp;», tout comme, sur ordinateur, la carte «&nbsp;Prochaine course&nbsp;». C’est une information,
            pas un verdict&nbsp;: la course reste chiffrée cheval par cheval, et vous savez avant le départ qu’elle se
            lit comme un ensemble de chances proches.
          </P>
          <Chiffre valeur="≈ 1 sur 6" source="Courses jugées du 10 au 22 novembre 2026, relevé du 22 novembre 2026">
            Environ une course sur six présentait un peloton très ouvert sur la période, soit près de quatre par journée
            en moyenne&nbsp;; douze journées sur treize en ont compté au moins une.
          </Chiffre>
        </>
      )}
      {/* ── FIN « PELOTON TRÈS OUVERT » ── */}

      <H2 id="nos-resultats">Vérifier, niveau par niveau</H2>
      <P>
        Un niveau de confiance n’a de sens que s’il se vérifie. Le nôtre se vérifie dans{' '}
        <a href={URL_RESULTATS} rel="noopener noreferrer">
          «&nbsp;Nos résultats&nbsp;»
        </a>
        , la page qui confronte nos pronostics à l’arrivée, ouverte dès la formule gratuite.
      </P>
      <P>
        Un panneau y est consacré, «&nbsp;Par niveau de confiance&nbsp;». Il compare nos résultats sur les courses
        Élevée, Moyenne et Faible&nbsp;: une ligne pour chaque niveau, avec son nombre de courses, en victoire comme en
        place. Il se filtre comme le reste de la page&nbsp;: par mois, type de course, distance ou hippodrome.
      </P>
      <P>
        Rien n’y est écarté&nbsp;: au 22 novembre 2026, plus de 1&nbsp;500 courses jugées depuis le 11 septembre y sont
        rangées. À cette date, l’échelle tenait sur l’ensemble&nbsp;: plus le niveau était élevé, plus notre favori
        s’était imposé souvent, et plus souvent il avait fini dans les trois premiers. Les taux se lisent dans
        l’application, toujours avec leur effectif, et notre article pour{' '}
        <Link to="/blog/verifier-taux-reussite-pronostic-hippique">vérifier un taux de réussite</Link> donne les
        questions à poser.
      </P>

      <H2 id="formule-gratuite">Dès la formule gratuite</H2>
      <P>
        Avec un compte gratuit, la <Link to="/blog/pronostic-hippique-gratuit-course-offerte">course offerte du jour</Link>{' '}
        est ouverte en entier, niveau de confiance compris&nbsp;: vous voyez d’emblée si notre favori se détache ou si la
        course reste ouverte.
        Les courses déjà jugées restent lisibles par tous les comptes, niveau compris.
      </P>
      <P>
        Sur les autres courses à venir, un cadenas «&nbsp;Avec un Pass&nbsp;» tient la place de la confiance. Pour
        connaître le niveau de chaque course de la journée et choisir où vous arrêter, un Pass l’affiche partout&nbsp;:
        le {passJour?.nom}, à {passJour?.prix}, sans abonnement. Toute l’offre est détaillée dans notre{' '}
        <Link to="/blog/comprendre-crosswell-pronostics-hippiques-statistiques">présentation de l’application</Link>, et
        les trois niveaux dans <Link to="/methode#confiance">Comment ça marche</Link>.
      </P>
      <Encadre titre="À savoir">
        Le niveau de confiance décrit la façon dont les chances se répartissent avant le départ. Une probabilité est une
        estimation&nbsp;: aucun résultat n’est garanti, et les performances passées ne préjugent pas des résultats
        futurs.
      </Encadre>
      <P>
        Ouvrir un compte ne demande aucune carte bancaire.{' '}
        <a href={inscrireAvec('gratuit')} rel="noopener noreferrer">
          Créer mon compte gratuit
        </a>
        &nbsp;: «&nbsp;Nos résultats&nbsp;» vous montre tout de suite ce que vaut chaque niveau, et la course offerte
        vous attend chaque matin, avec le sien.
      </P>
    </>
  )
}
