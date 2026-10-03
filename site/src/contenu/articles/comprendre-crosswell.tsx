import { Link } from 'react-router-dom'
import { Chiffre, Encadre, H2, Liste, P, Tableau } from '@/components/blog/Corps'
import {
  EDITEUR,
  FORMULES,
  LIBELLE_ECART,
  MARGE_ECART,
  NOTE_NON_PARTANTS,
  RYTHME_PUBLICATION,
  SEUIL_ECHANTILLON,
  SEUILS_CONFIANCE,
  URL_RESULTATS,
  inscrireAvec,
} from '@/config/site'

/**
 * PREMIER ARTICLE — la présentation de Crosswell.
 *
 * Il VEND : le fondateur a demandé un texte qui donne envie, et qui ne mette
 * pas en avant les faiblesses du modèle. L'argument de vente est la rigueur —
 * sept facteurs mesurés, aucune cote lue, des taux publiés avec leur effectif,
 * et un éditeur dont le seul revenu est l'abonnement. La transparence est donc
 * écrite comme une FORCE, jamais comme une précaution.
 *
 * CE QUE CELA NE CHANGE PAS : les trois mentions obligatoires (une probabilité
 * est une estimation, aucun résultat n'est garanti, les performances passées ne
 * préjugent pas des résultats futurs) sont dans l'encadré de la deuxième
 * section — une fois, à leur place, et formulées avec aplomb.
 *
 * AUCUN CHIFFRE N'EST SAISI ICI : seuils, marge, prix, rythme de publication et
 * note sur les non-partants viennent de `config/site.ts`. Un article reste en
 * ligne des mois, et un chiffre recopié devient faux le jour où il change.
 *
 * LA COTE EST UNE COTE DE CLÔTURE, relevée APRÈS la course. Trois relectures
 * ont rattrapé des formulations qui la plaçaient sous les yeux du lecteur au
 * moment où il consulte (« elles se lisent d'un seul regard », une cote
 * annoncée dans ce que l'application « donne chaque matin ») : c'est la
 * promesse de « cote en direct » que le dépôt bannit. Toute reformulation de ce
 * passage doit redire explicitement que la comparaison se lit après coup.
 */
export default function ComprendreCrosswell() {
  const formule = (cle: string) => FORMULES.find((f) => f.cle === cle)
  const prix = (cle: string) => formule(cle)?.prix ?? ''
  /** « Soit 8,25 € / mois », tel que la grille tarifaire l'écrit. */
  const annuelMensualise = (formule('an')?.precision ?? '').replace(/^Soit\s+/i, '')

  const pourcent = (part: number) => Math.round(part * 100)

  return (
    <>
      <P>
        Il y a, chaque jour en France, bien plus de courses qu’une seule personne ne peut en étudier. Et le lecteur de
        courses dispose de tout, sauf d’une mesure commune&nbsp;: chaque source a son favori, et aucune ne se compare à
        l’autre.
      </P>
      <P>
        Crosswell Pronostics publie des pronostics hippiques statistiques&nbsp;: pour chaque partant des courses
        françaises de galop du jour, sa probabilité de victoire et sa probabilité de finir dans les trois premiers, en
        pourcentage entier, et l’arrivée que le modèle juge la plus probable. Le calcul tourne la nuit, la publication
        arrive le matin même — quand vous ouvrez l’application, le travail est fait.
      </P>

      <H2 id="ce-que-crosswell-publie">Tout le programme du jour, chiffré dès le matin</H2>
      <P>
        Chaque matin, nous publions l’analyse de toutes les courses de galop du jour, en France. Pas une poignée de
        courses retenues ici ou là&nbsp;: le programme complet, au même endroit.
      </P>
      <P>
        Pour chaque course, nous annonçons l’arrivée que le modèle juge la plus probable. Puis vient le détail, partant
        par partant&nbsp;: sa probabilité de gagner, sa probabilité d’être placé dans les trois premiers, en pourcentage
        entier. Tout le peloton est chiffré, pas seulement les premiers noms.
      </P>
      <P>
        Chaque course porte aussi son <Link to="/methode#confiance">niveau de confiance</Link>&nbsp;: élevé dès que
        notre favori atteint {pourcent(SEUILS_CONFIANCE.elevee)}&nbsp;% de chances de victoire, moyen dès{' '}
        {pourcent(SEUILS_CONFIANCE.moyenne)}&nbsp;%. Le programme se hiérarchise de lui-même&nbsp;: vous voyez d’un
        coup d’œil les courses où le modèle se prononce le plus nettement.
      </P>
      <P>{RYTHME_PUBLICATION}</P>
      <P>
        Une fois publiées, les probabilités ne sont jamais recalculées&nbsp;: ce que vous lisez le matin est ce que nous
        mesurerons ensuite. {NOTE_NON_PARTANTS}
      </P>
      <P>Voici, course par course, ce que l’application met sous vos yeux&nbsp;:</P>
      <Liste
        points={[
          <>L’arrivée la plus probable de chaque course de galop du jour, en France.</>,
          <>Pour chaque partant, sa probabilité de victoire et ses chances de place, en pourcentage entier.</>,
          <>Le niveau de confiance de la course, élevé ou moyen selon nos seuils.</>,
          <>
            La cote de clôture, relevée après la course et posée à côté de nos pourcentages sur les réunions
            cotées&nbsp;: notre estimation et celle du marché, comparées sur la même ligne, avec le marqueur «&nbsp;
            {LIBELLE_ECART}&nbsp;».
          </>,
          <>
            Les fiches cheval, jockey et entraîneur, bâties sur les performances publiées par France Galop, et un
            comparateur de deux ou trois partants.
          </>,
          <>La page «&nbsp;Nos résultats&nbsp;», qui mesure nos pourcentages une fois les courses courues.</>,
        ]}
      />

      <H2 id="lire-un-pourcentage">Un pourcentage se compare, un nom entouré ne se compare pas</H2>
      <P>
        Un nom entouré désigne. Un pourcentage, lui, dit <strong>combien</strong>&nbsp;: il se compare entre deux
        partants, entre deux courses, et d’un jour à l’autre. C’est toute la différence entre une opinion et une
        grandeur.
      </P>
      <P>
        Un pourcentage donne les écarts — il dit si deux partants sont séparés d’un cheveu ou de plusieurs longueurs
        d’estimation. Et comme les probabilités de tous les partants d’une même course totalisent 100&nbsp;%, une course
        très ouverte et une course dominée se reconnaissent immédiatement, sans connaître les chevaux.
      </P>
      <P>
        La probabilité de place se lit juste à côté de celle de victoire. Les deux ne vont pas toujours dans le même
        ordre, et c’est précisément l’information qu’un nom unique ne porte pas.
      </P>
      <P>
        La cote dit la même chose dans l’autre sens&nbsp;: elle est l’inverse d’une probabilité, une fois retirée la
        marge de l’opérateur. Sur les réunions cotées, nous relevons la cote de clôture et la posons à côté de nos
        pourcentages&nbsp;: une fois la course courue, les deux estimations se comparent chiffre contre chiffre, sur la
        même ligne. La <Link to="/methode#cote">page Comment ça marche</Link> porte un convertisseur pour faire le
        calcul dans les deux sens.
      </P>
      <Encadre titre="Notre cadre, écrit noir sur blanc">
        Une probabilité est une estimation, pas une annonce de résultat&nbsp;: elle décrit une fréquence attendue sur un
        grand nombre de courses, pas l’issue d’une course précise. Aucun résultat n’est garanti, et les performances
        passées ne préjugent pas des résultats futurs. Nous l’écrivons parce qu’un éditeur qui mesure ses propres
        annonces en connaît la portée exacte.
      </Encadre>

      <H2 id="comment-le-modele-calcule">Sept facteurs mesurés, aucune cote lue</H2>
      <P>
        Le modèle ne travaille que sur ce qui se mesure. Sept éléments entrent dans le calcul de chaque partant, et ce
        sont toujours les mêmes, d’une course à l’autre et d’un jour à l’autre.
      </P>
      <Liste
        points={[
          <>
            <strong>La valeur du cheval</strong>, établie sur son historique de courses.
          </>,
          <>
            <strong>Sa forme récente.</strong>
          </>,
          <>
            <strong>La distance</strong> de l’épreuve.
          </>,
          <>
            <strong>La catégorie</strong> de course.
          </>,
          <>
            <strong>La taille du peloton</strong>&nbsp;: six partants et dix-huit ne se jugent pas de la même façon.
          </>,
          <>
            <strong>Le jockey</strong>, par ses statistiques.
          </>,
          <>
            <strong>L’entraîneur</strong>, par ses statistiques.
          </>,
        ]}
      />
      <P>
        Ce qu’il laisse dehors compte autant&nbsp;: la presse, les informations d’écurie, et{' '}
        <strong>les cotes</strong>. Notre estimation ne s’aligne donc jamais sur le marché, puisqu’elle ne le regarde
        pas. Les deux sont bâties séparément — et c’est ce qui donne de la valeur à leur comparaison&nbsp;: quand elles
        divergent, la divergence est une information, pas un écho. La{' '}
        <Link to="/methode#modele">description complète du modèle</Link> dit pas à pas comment on passe d’un historique
        de courses à un pourcentage.
      </P>
      <Encadre titre={`Le marqueur « ${LIBELLE_ECART} »`}>
        Nos pourcentages sont calculés sans la cote. Nous les confrontons ensuite à la cote de clôture, relevée après la
        course, sur les réunions cotées — environ six sur dix (constat d’août 2026). Le marqueur signale les partants
        dont notre probabilité de victoire dépassait d’au moins {pourcent(MARGE_ECART)}&nbsp;%, en relatif, celle
        qu’impliquait la cote, marge de l’opérateur retirée&nbsp;: il mesure la distance entre notre estimation et celle
        du marché, et se lit donc après coup.
      </Encadre>

      <H2 id="editeur-independant">Un éditeur indépendant, dont le seul revenu est l’abonnement</H2>
      <P>
        {EDITEUR.raisonSociale} est une {EDITEUR.formeJuridique.replace(/^SAS,\s*/, '')} immatriculée en France. Son
        métier est l’édition d’analyses statistiques sur les courses françaises de galop, et rien d’autre.
      </P>
      <P>
        Nous ne sommes pas opérateur de jeux d’argent et ne détenons aucun agrément de l’Autorité nationale des jeux.
        Nous n’acceptons aucune mise, nous ne détenons aucun fonds, nous ne versons aucun gain. Nous ne sommes pas non
        plus un service de conseil&nbsp;: nos publications sont des analyses statistiques destinées à l’information,
        jamais une recommandation personnalisée.
      </P>
      <P>
        <strong>Notre seule source de revenus est l’abonnement.</strong> Nous ne sommes intéressés d’aucune façon à
        l’issue des courses&nbsp;: rien, chez nous, ne pousse un chiffre plutôt qu’un autre. Notre intérêt tient
        entièrement à la justesse de nos analyses — c’est la raison pour laquelle nous les mesurons en public.
      </P>
      <P>
        Les fiches cheval, jockey et entraîneur s’appuient sur les performances publiées par{' '}
        <a href="https://www.france-galop.com" target="_blank" rel="noopener noreferrer">
          France Galop
        </a>
        . Nous n’en sommes pas partenaires, et nous ne nous présentons jamais comme tels&nbsp;: nous lisons des données
        publiques.
      </P>

      <H2 id="nos-resultats-publies">Nos taux de réussite, publiés avec leur effectif</H2>
      <P>
        L’application comporte une page «&nbsp;
        <a href={URL_RESULTATS} rel="noopener noreferrer">
          Nos résultats
        </a>
        &nbsp;», derrière un compte. Elle donne les taux de réussite réels de nos annonces, mesurés sur toutes les
        courses jugées — et elle est ouverte dès la formule gratuite.
      </P>
      <P>
        Chaque taux est publié avec son effectif&nbsp;: le nombre de courses sur lequel il est calculé. L’effectif fait
        partie du chiffre, et nous l’affichons comme tel.
      </P>
      <P>
        Les filtres sont ouverts — période, type de course, distance, hippodrome. Vous mesurez le terrain qui vous
        intéresse, effectif compris, et vous voyez comment la mesure bouge d’un terrain à l’autre.
      </P>
      <Chiffre valeur={`${SEUIL_ECHANTILLON}`} source="Seuil d’échantillon court de la page « Nos résultats »">
        Sous ce nombre de courses jugées, nous signalons l’échantillon court. Un chiffre arrive donc toujours avec ce
        qu’il faut pour en apprécier la portée.
      </Chiffre>
      <P>
        Une méthode se mesure, ou ne se mesure pas. La nôtre se vérifie dans l’application, avant même de payer quoi que
        ce soit.
      </P>

      <H2 id="commencer">Commencer par le pronostic hippique gratuit du jour</H2>
      <P>
        La formule gratuite donne chaque jour le pronostic complet d’une course, le programme du jour et l’accès à
        «&nbsp;Nos résultats&nbsp;». Ouvrir un compte suffit&nbsp;: aucune carte bancaire n’est demandée.
      </P>
      <P>
        Les Pass ouvrent l’ensemble des courses du jour — toutes les courses, tous les partants, tous les pourcentages.
        Le Pass 1 jour est un paiement unique&nbsp;: il n’y a rien à résilier. Le Pass mensuel est résiliable en ligne à
        tout moment. Le Pass annuel revient à {annuelMensualise}.
      </P>
      <Tableau
        entetes={['Formule', 'Prix', 'Ce qu’elle ouvre']}
        lignes={[
          ['Gratuit', prix('gratuit'), 'Une course offerte chaque jour, pronostic complet, et « Nos résultats »'],
          ['Pass 1 jour', prix('jour'), 'Toutes les courses pendant 24 h, paiement unique'],
          ['Pass mensuel', prix('mois'), 'Toutes les courses, résiliable en ligne à tout moment'],
          ['Pass annuel', prix('an'), `Toutes les courses à l’année, ${annuelMensualise.toLowerCase()}`],
        ]}
      />
      <P>
        Le détail de chaque formule est dans la <Link to="/#tarifs">grille tarifaire</Link>, et les conditions de vente
        dans nos <Link to="/cgv">conditions générales</Link>. Pour voir les pourcentages du jour, il suffit d’
        <a href={inscrireAvec('gratuit')} rel="noopener noreferrer">
          ouvrir un compte
        </a>
        &nbsp;: une course entièrement chiffrée vous attend dès ce matin.
      </P>
    </>
  )
}
