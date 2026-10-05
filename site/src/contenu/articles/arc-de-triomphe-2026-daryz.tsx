import { Link } from 'react-router-dom'
import { Encadre, H2, P, Tableau } from '@/components/blog/Corps'
import { LIBELLE_ECART, URL_RESULTATS, inscrireAvec } from '@/config/site'

/**
 * L'ARC DE TRIOMPHE 2026, RACONTÉ — Daryz, ParisLongchamp, 4 octobre 2026.
 *
 * Version récit, demandée par le fondateur le 5 octobre 2026 : pas de note de
 * niveau chiffrée, pas de comparaison au hasard, pas de mécanique interne, et
 * une écriture de journaliste, aux transitions travaillées. Le fil est le
 * cheval, la course, et la logique de classement racontée en mots.
 *
 * TOUS LES FAITS SONT RÉELS, relevés le 5 octobre 2026 dans
 * `modele_prediction_engagement.predictions_log` (version `M9ter.etranger`,
 * publiée le 4 octobre au matin, départ à 16 h 05) et dans
 * `chevaux.performances` pour la carrière de Daryz. Pas de `<Fictif />`.
 *
 * CE QUE LE RÉCIT NE DIT PAS, ET POURQUOI :
 * - aucun taux de réussite (règle du blog) ; l'article renvoie à « Nos résultats » ;
 * - il ne cache pas que Daryz était aussi le favori du marché (cote de clôture
 *   2,2) : l'argument est la convergence de deux lectures indépendantes, et nos
 *   2e et 3e rangs, qui n'étaient pas ceux du marché ;
 * - il ne dit pas que la course du 5 octobre 2025 était l'Arc : la base donne
 *   un Groupe I sur 2 400 m à ParisLongchamp ce jour-là, sans le nom du prix.
 */
export default function ArcDeTriomphe2026Daryz() {
  return (
    <>
      <P>
        Certaines courses se préparent pendant un an pour se décider en deux minutes et demie. De toutes, le Prix de
        l’Arc de Triomphe est sans doute la plus attendue&nbsp;: chaque premier dimanche d’octobre, sur les
        2&nbsp;400&nbsp;mètres de ParisLongchamp, le galop du monde entier se donne rendez-vous pour se mesurer.
      </P>
      <P>
        Ce dimanche 4 octobre 2026, ils étaient seize à se présenter au départ, venus de France, d’Angleterre, d’Irlande,
        d’Allemagne ou du Japon. Bien avant que la foule ne gagne les tribunes, notre modèle avait pourtant déjà fait son
        choix&nbsp;: en tête de son classement figurait le numéro 1, <strong>Daryz</strong>.
      </P>
      <P>
        Le départ a été donné à 16&nbsp;h&nbsp;05. Quelques minutes plus tard, c’est bien Daryz qui franchissait le
        poteau en vainqueur. Retour sur l’histoire d’un cheval, d’une course, et de la lecture qui les avait réunis.
      </P>

      <H2 id="daryz">Daryz, un cheval chez lui à Longchamp</H2>
      <P>
        Il arrive qu’un cheval trouve sa piste, comme d’autres trouvent leur distance. Pour Daryz, cette piste porte un
        nom&nbsp;: ParisLongchamp. Avant l’Arc, il s’y était présenté huit fois et en était reparti vainqueur à sept
        reprises, sa seule défaite se résumant à une deuxième place, à l’automne de sa première saison.
      </P>
      <P>
        Un an plus tôt, presque jour pour jour, il s’imposait déjà dans un Groupe I sur ce même tracé et cette même
        distance. Le printemps 2026 l’a vu ajouter deux nouveaux Groupe I à son palmarès, toujours à Longchamp, avant
        qu’il ne traverse la Manche en juin pour décrocher la troisième place d’un Groupe I à Ascot, face à l’élite
        européenne. Quatre semaines avant le grand jour, enfin, il remportait sa course de préparation sur le parcours
        exact de l’Arc.
      </P>
      <P>
        Derrière ce parcours se tient une équipe qui n’a jamais varié&nbsp;: l’entraîneur Francis-Henri Graffard, le
        jockey Mickaël Barzalona, en selle à chacune de ses sorties, et les couleurs des Aga Khan Studs. En onze
        courses, Daryz a signé huit victoires, sans jamais changer de mains.
      </P>
      <P>
        Un connaisseur lit un tel dossier en quelques secondes. Tout l’enjeu consiste pourtant à le lire aussi bien pour
        chacun des seize partants, avec la même rigueur, sans se laisser porter par un nom ou une réputation. C’est
        précisément le travail que nous confions à notre modèle.
      </P>

      <H2 id="le-matin">Le matin de l’Arc, un pronostic comme les autres</H2>
      <P>
        Aussi prestigieux soit-il, l’Arc n’a bénéficié chez nous d’aucun traitement de faveur. Son pronostic est issu du
        même calcul de nuit que toutes les courses de galop du jour, de la modeste course à réclamer de semaine au plus
        grand des Groupe I. Il n’a fait l’objet d’aucun réglage particulier, et aucune main humaine n’est venue retoucher
        le classement au dernier moment.
      </P>
      <P>
        Une fois publié, plus de huit heures avant le départ, il n’a plus bougé&nbsp;: ce qui était écrit le matin est
        exactement ce qui a été jugé à l’arrivée. Chez nous, c’est une règle qui vaut pour chaque course, chaque
        jour&nbsp;: un pronostic publié n’est jamais modifié.
      </P>

      <H2 id="notre-logique">Ce que notre classement regarde</H2>
      <P>
        Contrairement à une idée répandue, notre modèle ne cherche pas le cheval qui a gagné le plus souvent, mais celui
        qui a battu les meilleurs. Une victoire arrachée face à un peloton d’élite pèse bien davantage qu’une série de
        succès faciles. C’est d’ailleurs ce qui a hissé Daryz au sommet du classement&nbsp;: course après course, ses
        adversaires comptaient parmi les plus solides d’Europe.
      </P>
      <P>
        Le lieu de chaque course entre lui aussi en ligne de compte. Une victoire à ParisLongchamp, un jour de Groupe I,
        ne saurait se comparer à un succès obtenu dans une petite réunion de province, et le classement en tient
        naturellement compte.
      </P>
      <P>
        Encore fallait-il ne pas s’arrêter aux frontières. Sur les seize partants de l’Arc, quatre n’avaient jamais couru
        en France, et deux d’entre eux n’avaient jusque-là couru qu’au Japon. La dernière version de notre modèle lit
        donc le palmarès étranger pour ce qu’il vaut&nbsp;: un Groupe I à Ascot reste un Groupe I. Ainsi, la troisième
        place de Daryz en Angleterre a été comptée pour ce qu’elle était réellement, une performance au plus haut
        niveau.
      </P>
      <P>
        La forme récente, la distance, la catégorie de la course, la taille du peloton, le jockey et l’entraîneur
        viennent ensuite compléter le tableau. Un élément, en revanche, reste volontairement à la porte&nbsp;:{' '}
        <strong>la cote</strong>. Notre modèle ne regarde jamais le marché&nbsp;; il lit des performances, et rien
        d’autre.
      </P>

      <H2 id="l-arrivee">L’arrivée&nbsp;: le vainqueur, et ceux qui l’entouraient</H2>
      <P>
        Désigner le vainqueur est une chose&nbsp;; lire correctement le reste du peloton en est une autre. Voici
        l’arrivée officielle, rapprochée du rang que notre classement avait attribué à chacun&nbsp;:
      </P>
      <Tableau
        entetes={['Arrivée', 'Cheval', 'Notre rang']}
        lignes={[
          ['1er', 'Daryz', '1er'],
          ['2e', 'Bay City Roller', '7e'],
          ['3e', 'Diamond Necklace', '2e'],
          ['4e', 'Friendly Soul', '3e'],
          ['5e', 'Kalpana', '8e'],
        ]}
      />
      <P>
        Nos trois premiers rangs ont terminé premier, troisième et quatrième. Derrière Daryz, Diamond Necklace, que nous
        placions deuxième, a décroché la troisième place, tandis que Friendly Soul, notre troisième, a pris la
        quatrième. Deux chevaux que peu de monde attendait à ce niveau&nbsp;: le marché les reléguait loin derrière, à
        des cotes de 14 et de 27.
      </P>

      <H2 id="sans-le-marche">Deux lectures indépendantes, une même conclusion</H2>
      <P>
        Daryz était, lui aussi, le favori du marché. Nous le disons sans détour, car c’est précisément ce qui rend
        l’histoire intéressante. Le marché rassemble l’avis de milliers de personnes, nourri par la presse, les échos
        d’écurie et les mouvements de dernière minute. Notre modèle, lui, n’a rien vu de tout cela&nbsp;: seul face aux
        performances, il est pourtant parvenu à la même tête de course.
      </P>
      <P>
        Là où les deux lectures divergeaient, en revanche, c’est la piste qui a tranché. Derrière Daryz, le marché
        privilégiait Kalpana et Maltese Cross&nbsp;; le premier a terminé cinquième, le second hors des cinq premiers.
        Notre classement leur préférait Diamond Necklace et Friendly Soul, qui ont fini troisième et quatrième.
      </P>
      <P>
        Un dernier détail mérite d’être souligné. Nous faisons tourner chaque jour plusieurs variantes de notre modèle,
        afin de les comparer en conditions réelles&nbsp;; or, sur l’Arc, la quasi-totalité d’entre elles désignaient
        Daryz. La conclusion ne devait donc rien à un réglage heureux&nbsp;: elle ressortait de presque toutes les façons
        de lire les mêmes données.
      </P>
      <Encadre titre={`Le marqueur « ${LIBELLE_ECART} »`}>
        Dans l’application, ce marqueur signale, une fois la course courue, les partants que notre modèle estimait
        nettement au-dessus de ce qu’en pensait le marché. Sur l’Arc, Diamond Necklace en faisait partie.
      </Encadre>

      <H2 id="chaque-matin">Chaque matin, la même exigence</H2>
      <P>
        L’Arc n’est qu’une course parmi des milliers, et nous ne lui demandons pas de prouver à elle seule ce qu’elle ne
        peut pas prouver. Un pronostic reste une estimation&nbsp;: aucun résultat n’est garanti, et les performances
        passées ne préjugent pas des résultats futurs. Ce qui se mesure, c’est la constance. Voilà pourquoi la page{' '}
        <a href={URL_RESULTATS} rel="noopener noreferrer">
          «&nbsp;Nos résultats&nbsp;»
        </a>{' '}
        de l’application publie nos chiffres sur l’ensemble des courses jugées, chacun accompagné de son effectif.
      </P>
      <P>
        Ce que l’Arc met en lumière, en revanche, c’est notre méthode&nbsp;: une même logique de classement, appliquée
        avec la même rigueur à la plus grande course de l’année comme à une course de semaine en province, publiée avant
        le départ, jamais retouchée, et construite sans jamais regarder le marché.
      </P>
      <P>
        Dès demain matin, tout le programme de galop sera de nouveau classé, course par course et partant par partant.
        Pour le découvrir, il suffit d’
        <a href={inscrireAvec('gratuit')} rel="noopener noreferrer">
          ouvrir un compte gratuit
        </a>
        &nbsp;: une course entièrement chiffrée vous est offerte chaque jour, sans carte bancaire. Et pour aller plus
        loin, la <Link to="/methode">page Comment ça marche</Link> vous raconte notre méthode pas à pas.
      </P>
    </>
  )
}
