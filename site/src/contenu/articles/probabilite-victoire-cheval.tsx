import { Link } from 'react-router-dom'
import { Encadre, H2, P, Tableau } from '@/components/blog/Corps'
import {
  LIBELLE_ECART,
  NOM_SCORE,
  RYTHME_PUBLICATION_COURT,
  SEUILS_CONFIANCE,
  URL_RESULTATS,
  inscrireAvec,
} from '@/config/site'

/**
 * PILIER DU CLUSTER « MÉTHODE » — « Comment estimer la probabilité de victoire
 * d'un cheval ». Les articles à venir de la rubrique Méthode renverront ici.
 *
 * Requêtes visées : `probabilité de victoire d'un cheval` (titre, slug, première
 * phrase, H2 « De la lecture à la probabilité de victoire d'un cheval ») et
 * `analyser une course hippique` (slug, H2 de la première section et sa première
 * phrase). Secondaires, placées sans forcer : `méthode de pronostic hippique`
 * (section « Sept questions ») et `pronostic de galop` (section « La même
 * lecture »).
 *
 * L'ANGLE — « le regard du connaisseur, appliqué à tout le peloton ». On part
 * des questions qu'un amateur éclairé pose à une ligne de performances, et l'on
 * montre que le modèle pose les mêmes, à chaque partant de chaque course, chaque
 * jour. L'argument de vente est la RIGUEUR et l'EXHAUSTIVITÉ, jamais la
 * supériorité : le texte ne dit nulle part que le modèle lit « mieux » qu'un
 * connaisseur, ni qu'il fait mieux que le marché ou que quiconque. Le
 * connaisseur n'est pas un adversaire, c'est la référence dont on se réclame.
 * Le mot est gardé aux endroits qui portent l'angle ; ailleurs, on varie.
 *
 * CONSIGNE DU FONDATEUR (15/10/2026) : ni statistique ni technique, vendeur,
 * qui donne confiance, et qui ne dévoile pas nos secrets. Ce qui est dit du
 * modèle, et d'où c'est déjà public : les sept facteurs, l'apprentissage sur
 * plusieurs saisons de courses françaises et ce que le modèle ignore (page
 * « Comment ça marche ») ; « qui le cheval a battu » (article sur l'Arc, 05/10).
 * UN CRAN PLUS BAS que ces deux pages, et nouveau ici : le niveau des courses
 * disputées et la présence de l'étranger au dossier — au niveau du récit, sans
 * dire comment c'est compté. Les sept facteurs sont dans l'ordre de la page
 * Méthode, qui n'est pas un ordre d'importance : les transitions restent
 * neutres, aucune ne hiérarchise. L'étranger est dit présent au dossier, SANS dire comment il est
 * compté. Rien sur la façon dont le modèle calcule. Le lecteur apprend à LIRE
 * nos chiffres, pas à les FAIRE.
 *
 * L'ARC EST LIÉ depuis le 15/10/2026, une fois son article corrigé pour citer le
 * classement réellement servi aux clients ce jour-là (`M9bis.niveau`).
 *
 * « TURFISTE » ET « OUTSIDER » NE SONT PAS ÉCRITS : le premier tire vers
 * l'univers que le positionnement écarte, le second est du jargon anglais. On
 * dit « connaisseur » et « second rôle ».
 *
 * AUCUN EXEMPLE NOMMÉ, donc pas de `<Fictif />` : les 40 et 15 % sont des
 * exemples de raisonnement, sans cheval ni course. Aucun taux de réussite :
 * l'article renvoie à « Nos résultats » et au guide de lecture d'un taux.
 *
 * Les trois mentions sont dans l'encadré de « De la lecture à la probabilité
 * de victoire », une fois, rattachées aux pronostics (ici, « performances »
 * désigne partout le passé des chevaux). Le rythme de publication et les seuils
 * de confiance se lisent dans `config/site.ts` ; aucune heure n'est écrite. La
 * cote est une cote de clôture : le texte redit qu'elle se lit après coup.
 */
export default function ProbabiliteVictoireCheval() {
  const pourcent = (part: number) => Math.round(part * 100)

  return (
    <>
      <P>
        Estimer la probabilité de victoire d’un cheval commence comme toute bonne lecture de course&nbsp;: par des
        questions. Regardez un connaisseur ouvrir le programme d’une réunion. Il ne s’arrête ni au nom du cheval ni au
        chiffre de sa dernière arrivée&nbsp;; il remonte la ligne de ses performances. Qui ce cheval a-t-il battu, et à
        quel niveau&nbsp;? Dans quelle forme arrive-t-il&nbsp;? Sur quelle distance court-il aujourd’hui, et contre
        combien d’adversaires&nbsp;? Qui sera en selle, et qui l’a préparé&nbsp;?
      </P>
      <P>
        Ces questions transforment une colonne de résultats en une idée juste des chances de chacun. Notre méthode les
        reprend une à une, puis fait un pas de plus&nbsp;: elle donne à cette idée la forme d’un nombre, pour chaque
        partant de chaque course de galop du jour. Voici comment une lecture devient une probabilité.
      </P>

      <H2 id="le-regard-du-connaisseur">Analyser une course hippique comme un connaisseur</H2>
      <P>
        Analyser une course hippique, c’est d’abord se méfier des apparences. Une victoire n’est pas toujours une
        victoire&nbsp;: un succès facile dans une course modeste dit peu de chose, quand une quatrième place derrière
        des chevaux de premier plan peut en dire beaucoup. Ce qui compte, c’est moins le résultat que le niveau auquel
        il a été obtenu.
      </P>
      <P>
        L’œil exercé regarde aussi les circonstances. Un cheval qui enchaîne les bonnes sorties ne se présente pas comme
        celui dont les dernières courses déçoivent. Un spécialiste de la vitesse ne se juge pas sur
        2&nbsp;400&nbsp;mètres. Un handicap à dix-huit partants et une course de Groupe à sept ne demandent pas la même
        lecture. Et le jockey comme l’entraîneur disent comment le cheval a été préparé, et comment il sera monté.
      </P>
      <P>
        Tout l’art consiste à tenir ces éléments ensemble, partant après partant. Un amateur averti y met des années
        d’expérience, et beaucoup de temps. Or une journée de galop en France, ce sont plusieurs réunions, et bien plus
        de partants qu’une seule personne ne peut en étudier avec le même soin.
      </P>

      <H2 id="sept-questions">Sept questions, posées à chaque partant</H2>
      <P>
        Notre méthode de pronostic hippique part de ce constat. Elle ne remplace pas le regard du connaisseur&nbsp;: elle
        reprend ses questions, et les pose à tous les partants, de la même manière, chaque jour.
      </P>
      <Tableau
        entetes={['La question du connaisseur', 'Ce que le modèle mesure']}
        lignes={[
          ['Qui a-t-il battu, et à quel niveau\u00a0?', 'La valeur du cheval'],
          ['Comment se présente-t-il en ce moment\u00a0?', 'Sa forme récente'],
          ['Sur quelle distance court-il\u00a0?', 'La distance de l’épreuve'],
          ['Quel est le niveau de la course du jour\u00a0?', 'La catégorie de course'],
          ['Combien sont-ils au départ\u00a0?', 'La taille du peloton'],
          ['Qui sera en selle\u00a0?', 'Le jockey'],
          ['Qui l’a préparé\u00a0?', 'L’entraîneur'],
        ]}
      />
      <P>
        Ces sept questions restent les mêmes d’une course à l’autre. Notre modèle, le {NOM_SCORE}, a appris à les peser
        sur plusieurs saisons de courses françaises de galop, comme le connaisseur au fil des siennes. Seule l’échelle
        change&nbsp;: lui suit ses courses, le modèle suit le programme entier. Notre page «&nbsp;Comment ça
        marche&nbsp;» en donne le <Link to="/methode#modele">schéma complet, des sept facteurs au pourcentage</Link>.
      </P>

      <H2 id="ceux-qu-il-a-battus">La valeur d’un cheval tient à ceux qu’il a battus</H2>
      <P>
        La première de ces questions demande de la mémoire. Pour savoir ce que vaut une victoire, il faut savoir qui
        l’on a devancé.
      </P>
      <P>
        Le niveau des courses disputées compte de la même façon. Une place dans un Groupe ne se lit pas comme une
        victoire dans une course à réclamer de semaine&nbsp;: l’une et l’autre entrent au dossier du cheval, chacune
        pour ce qu’elle vaut. Et ce dossier ne s’arrête pas aux frontières&nbsp;: les courses qu’un partant a disputées
        à l’étranger y figurent aussi.
      </P>
      <P>
        La forme récente, elle, dit ce que le cheval montre en ce moment. Un cheval ne court pas sur sa
        réputation&nbsp;: ses dernières sorties indiquent s’il est en progrès, à son niveau ou en retrait.
      </P>

      <H2 id="la-course-du-jour">Le cheval, et la course qu’il va courir</H2>
      <P>
        Un cheval ne se juge jamais seul. Ce que dit son dossier se lit toujours à la lumière de la course du
        jour&nbsp;: sa distance, sa catégorie, le nombre de partants. Le modèle les prend en compte pour chaque cheval,
        de la même façon, sans en négliger aucun.
      </P>
      <P>
        Le jockey et l’entraîneur, enfin, sont jugés sur leurs résultats, pas sur leur réputation&nbsp;: un grand nom
        ne compte que pour ce qu’il a réellement accompli.
      </P>
      <P>
        Tout se rapporte alors au peloton&nbsp;: chaque partant est situé face aux chevaux qu’il affronte ce jour-là.
        Ce qui décide d’une course n’est pas la force d’un cheval dans l’absolu, mais sa force face à ces adversaires-là.
        Le même cheval peut dominer une course et n’être qu’un second rôle dans la suivante.
      </P>

      <H2 id="probabilite-de-victoire">De la lecture à la probabilité de victoire d’un cheval</H2>
      <P>
        Le connaisseur termine sa lecture par une conviction. Le modèle termine la sienne par un nombre&nbsp;: pour
        chaque partant, une probabilité de victoire et une probabilité de finir dans les trois premiers, en pourcentage
        entier. Les probabilités de victoire de tous les partants d’une course s’additionnent à 100&nbsp;%. Les repères
        pour <Link to="/methode#lire">lire un pronostic</Link> sont détaillés, un à un, sur notre page de méthode.
      </P>
      <P>
        Ce nombre dit ce qu’un nom ne dit pas. Deux courses du même après-midi ont chacune leur favori&nbsp;; l’un
        affiche peut-être 40&nbsp;% de chances, l’autre 15&nbsp;%. Ce sont deux favoris, mais pas du tout le même genre
        de favori. Le premier, si la course se courait cent fois dans les mêmes conditions, en gagnerait une
        quarantaine&nbsp;; le second, une quinzaine, et c’est cela que l’on a besoin de savoir avant le départ.
      </P>
      <P>
        De ces pourcentages découle aussi le <Link to="/methode#confiance">niveau de confiance</Link> de chaque
        course&nbsp;: élevé dès que notre favori atteint {pourcent(SEUILS_CONFIANCE.elevee)}&nbsp;% de chances de
        victoire, moyen dès {pourcent(SEUILS_CONFIANCE.moyenne)}&nbsp;%. D’un regard, vous savez où le modèle détache un
        cheval, et où la course reste ouverte.
      </P>
      <Encadre titre="Une estimation, dite comme telle">
        Une probabilité est une estimation&nbsp;: elle mesure des chances, elle n’annonce pas une issue. Aucun résultat
        n’est garanti, et, pour nos pronostics comme pour tout autre, les performances passées ne préjugent pas des
        résultats futurs. Une course garde toujours sa part d’imprévu&nbsp;; c’est précisément pour cela que nous
        publions des chances chiffrées, plutôt que des certitudes.
      </Encadre>

      <H2 id="sans-la-cote">Ce que la méthode laisse volontairement dehors</H2>
      <P>
        Ce qu’une méthode refuse de regarder la définit autant que ce qu’elle regarde. La nôtre laisse de côté la
        presse, les informations d’écurie et, surtout, <strong>les cotes</strong>. Elle s’appuie sur les performances
        publiées par France Galop, des données publiques que nous lisons en toute indépendance&nbsp;: nous ne sommes pas
        partenaires de l’institution.
      </P>
      <P>
        Établis sans jamais regarder le marché, nos pourcentages n’en sont pas l’écho&nbsp;: ce sont deux lectures
        indépendantes de la même course. La cote n’intervient qu’après coup, comme point de comparaison. Sur les
        réunions cotées, nous relevons la cote de clôture une fois la course courue, et le marqueur
        «&nbsp;{LIBELLE_ECART}&nbsp;» signale les partants à qui nous donnions sensiblement plus de chances que le
        marché&nbsp;: c’est l’<Link to="/methode#ecart">écart au marché</Link>.
      </P>
      <P>
        Cette indépendance vaut aussi pour l’éditeur. Nos seuls revenus viennent de nos formules&nbsp;: nous ne sommes
        intéressés d’aucune façon à l’issue des courses, et rien, chez nous, ne pousse un chiffre plutôt qu’un autre.
      </P>

      <H2 id="la-meme-lecture">La même lecture, du premier partant au dernier</H2>
      <P>
        C’est ici que la méthode prend toute sa portée. Le modèle ne se lasse pas à la dixième course de la journée. Il
        n’a ni cheval de cœur, ni entraîneur fétiche, ni hippodrome de prédilection. Chaque pronostic de galop que nous
        publions sort du même calcul, de la course à réclamer du lundi au Groupe&nbsp;I du dimanche, sans réglage
        particulier ni retouche de dernière minute,{' '}
        <Link to="/blog/arc-de-triomphe-2026-daryz-analyse-statistique">l’Arc de Triomphe 2026 compris</Link>.
      </P>
      <P>
        Encore faut-il s’engager à l’avance. Expliquer une arrivée une fois qu’on la connaît est à la portée de
        tous&nbsp;; l’annoncer avant le départ, noir sur blanc, demande une autre rigueur. {RYTHME_PUBLICATION_COURT}{' '}
        Une fois publiés, nos pourcentages ne sont jamais recalculés, pas même après un retrait&nbsp;: ce que vous lisez
        le matin est exactement ce qui est jugé à l’arrivée.
      </P>
      <P>
        Une méthode se juge enfin sur pièces, et sur la durée. La page «&nbsp;
        <a href={URL_RESULTATS} rel="noopener noreferrer">
          Nos résultats
        </a>
        &nbsp;» de l’application confronte nos pourcentages aux arrivées, chaque taux avec le nombre de courses sur
        lequel il est calculé, et elle est ouverte dès la formule gratuite. Pour savoir ce qu’un tel chiffre doit
        montrer avant d’être cru, notre guide explique{' '}
        <Link to="/blog/verifier-taux-reussite-pronostic-hippique">
          comment vérifier le taux de réussite d’un pronostic hippique
        </Link>
        .
      </P>

      <H2 id="commencer">Voir la méthode à l’œuvre</H2>
      <P>
        Le plus simple est de la regarder travailler. La formule gratuite donne chaque jour le pronostic complet d’une
        course&nbsp;: l’arrivée prédite, la probabilité de victoire et de place de chaque partant, le niveau de
        confiance. Il suffit d’
        <a href={inscrireAvec('gratuit')} rel="noopener noreferrer">
          ouvrir un compte gratuit
        </a>
        , sans carte bancaire.
      </P>
      <P>
        Les Pass ouvrent ensuite les pronostics de toutes les courses&nbsp;; leur détail figure dans la{' '}
        <Link to="/#tarifs">grille tarifaire</Link>. Pour reprendre notre méthode pas à pas, la page{' '}
        <Link to="/methode">Comment ça marche</Link> la raconte en entier, et notre{' '}
        <Link to="/blog/comprendre-crosswell-pronostics-hippiques-statistiques">présentation de Crosswell Pronostics</Link>{' '}
        fait le tour du service. Et chaque matin, le programme de galop du jour est lu de la même façon&nbsp;: avec les
        questions du connaisseur, posées à tout le peloton.
      </P>
    </>
  )
}
