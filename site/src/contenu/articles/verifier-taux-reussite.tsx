import { Link } from 'react-router-dom'
import { Chiffre, Encadre, H2, Liste, P, Tableau } from '@/components/blog/Corps'
import { NOM_SCORE, SEUIL_ECHANTILLON, URL_RESULTATS, inscrireAvec } from '@/config/site'

/**
 * « Comment vérifier le taux de réussite d'un pronostic hippique ».
 *
 * L'article de conversion du blog : il vise `taux de réussite pronostic
 * hippique`, une requête à forte intention commerciale que personne ne traite
 * sérieusement, et il transforme notre contrainte — publier nos mesures — en
 * argument de vente. Mots-clés secondaires placés sans forcer : `pronostic
 * galop`, `pronostic hippique IA`, `résultats pronostics hippiques`.
 *
 * TOUT CE QU'IL DÉCRIT DE LA PAGE « NOS RÉSULTATS » A ÉTÉ VÉRIFIÉ dans
 * `../../src/pages/Resultats.tsx` le 10/10/2026 : l'effectif (« Courses
 * analysées »), les trois indicateurs, le repère « Au hasard », les tranches de
 * calibration, les six filtres, la courbe mensuelle, l'avertissement sous
 * SEUIL_ECHANTILLON et l'encart daté du changement de modèle.
 *
 * CE QUE L'ARTICLE NE DIT PAS, ET POURQUOI : `faceAuMarche` existe dans
 * `src/lib/stats.ts` et est testé, mais N'EST PAS AFFICHÉ sur la page. Annoncer
 * une comparaison au favori du marché serait donc annoncer une fonctionnalité
 * qui n'existe pas — la faute exacte que deux relectures ont déjà rattrapée sur
 * les articles précédents. Si elle est un jour affichée, c'est ici qu'il faudra
 * l'ajouter.
 *
 * AUCUN TAUX CHIFFRÉ dans le texte : il serait faux le lendemain, et un chiffre
 * figé dans du HTML n'est plus relié à la mesure. Les pourcentages cités sont
 * explicitement des exemples de raisonnement.
 *
 * TON : on outille un lecteur, on n'accuse personne. Les questions portent sur
 * un NOMBRE, jamais sur les gens qui le publient.
 */
export default function VerifierTauxReussite() {
  return (
    <>
      <P>
        «&nbsp;68&nbsp;% de réussite.&nbsp;» Le chiffre est partout, il est rond, et il ne veut rien dire tant qu’on
        ignore trois choses&nbsp;: sur combien de courses il a été calculé, à quoi il se compare, et qui a choisi la
        période.
      </P>
      <P>
        Un taux de réussite n’est pas une promesse, c’est une mesure — et une mesure se vérifie. Voici les quatre
        questions à lui poser, et les réponses que nous publions pour le nôtre.
      </P>

      <H2 id="effectif">Un taux sans effectif ne veut rien dire</H2>
      <P>
        Un pourcentage est une fraction dont on ne montre, le plus souvent, que le résultat. Or le dénominateur fait
        tout&nbsp;: 68&nbsp;% sur vingt-cinq courses, c’est dix-sept réussites — une série que le hasard produit
        régulièrement. Le même 68&nbsp;% sur mille courses est une autre affaire.
      </P>
      <P>
        D’où la première question, et la plus discriminante&nbsp;: <strong>sur combien de courses&nbsp;?</strong> Un
        taux publié sans son effectif n’est pas vérifiable, et un taux qu’on ne peut pas vérifier n’a aucune raison
        d’être cru.
      </P>
      <Chiffre valeur={`${SEUIL_ECHANTILLON}`} source="Seuil d’échantillon court, page « Nos résultats »">
        En dessous de ce nombre de courses jugées, notre page affiche d’elle-même « Échantillon court ». Nos chiffres
        arrivent donc toujours avec ce qu’il faut pour en apprécier la portée — y compris quand cette portée est encore
        limitée.
      </Chiffre>

      <H2 id="au-hasard">Comparé à quoi&nbsp;? Au hasard, d’abord</H2>
      <P>
        Deuxième question, et c’est celle qu’on oublie&nbsp;: <strong>un taux, comparé à quoi&nbsp;?</strong> Un chiffre
        seul n’a pas d’échelle. Dans une course à cinq partants, désigner le vainqueur une fois sur cinq, c’est
        exactement ce que donne un tirage au sort. Le même taux dans un handicap à dix-huit serait remarquable.
      </P>
      <P>
        C’est pourquoi notre page affiche, à côté de chaque indicateur, <strong>ce que le hasard aurait donné</strong>
        &nbsp;: «&nbsp;un cheval tiré au sort gagne&nbsp;», «&nbsp;un cheval tiré au sort finit dans les trois&nbsp;»,
        «&nbsp;un trio tiré au sort est le bon&nbsp;». Calculé sur les mêmes courses, avec leurs tailles de peloton
        réelles. L’écart entre les deux colonnes est la seule chose qui mesure un apport.
      </P>
      <P>
        Un modèle qui apprend sur des saisons de courses — ce qu’on range aujourd’hui sous le mot d’intelligence
        artificielle — n’a pas plus droit que les autres à être cru sur parole. Il se juge au même endroit, avec la
        même règle.
      </P>

      <H2 id="calibration">La calibration&nbsp;: 30&nbsp;% annoncés, 30&nbsp;% réalisés&nbsp;?</H2>
      <P>
        Troisième question, la plus exigeante, et celle qui sépare une estimation d’une opinion habillée en
        pourcentage&nbsp;: <strong>les chiffres annoncés se réalisent-ils à la fréquence annoncée&nbsp;?</strong>
      </P>
      <P>
        Prenez tous les partants annoncés autour de 30&nbsp;% de chances de victoire, sur des centaines de courses, et
        comptez ceux qui ont gagné. Si la part tourne autour de 30&nbsp;%, l’annonce était juste. Si elle tombe
        nettement en dessous, les pourcentages sont gonflés&nbsp;; nettement au-dessus, ils sont timides. Cela s’appelle
        la calibration, et c’est le seul examen qu’un pourcentage inventé ne passe jamais.
      </P>
      <P>
        Notre page publie cette lecture par tranches&nbsp;: pour chaque niveau annoncé, ce qui s’est réellement produit,
        et le nombre de partants concernés — avec la mention «&nbsp;échantillon court&nbsp;» quand la tranche est trop
        peu fournie pour conclure.
      </P>

      <H2 id="la-fenetre">Qui choisit la fenêtre&nbsp;?</H2>
      <P>
        Quatrième question&nbsp;: <strong>qui a choisi la période&nbsp;?</strong> N’importe quelle série contient un
        bon mois. Un bilan dont l’auteur choisit les dates ne démontre rien, et il n’est même pas nécessaire d’y mettre
        de la mauvaise foi&nbsp;: on retient naturellement la fenêtre qui flatte.
      </P>
      <P>
        La réponse n’est pas de jurer qu’on ne triche pas, c’est de retirer le choix à celui qui publie. Sur notre page,
        les filtres sont entre vos mains&nbsp;: année, mois, jour de la semaine, type de course, distance, hippodrome.
        Vous reconstituez la fenêtre que vous voulez, y compris celle qui nous arrange le moins, et chaque découpage
        garde son effectif affiché. S’y ajoutent la courbe mois par mois et le détail par hippodrome.
      </P>
      <Encadre titre="Les quatre questions, en une ligne">
        Sur combien de courses&nbsp;? Comparé à quoi&nbsp;? Les pourcentages annoncés se réalisent-ils&nbsp;? Et qui a
        choisi la période&nbsp;? Un taux de réussite qui répond aux quatre est une mesure. Un taux qui n’en documente
        aucune est une affirmation.
      </Encadre>

      <H2 id="quand-la-methode-change">Ce qui se passe quand la méthode change</H2>
      <P>
        Il manque une question, que presque personne ne pose parce que presque personne ne donne les moyens d’y
        répondre&nbsp;: <strong>que deviennent les chiffres quand le modèle change&nbsp;?</strong>
      </P>
      <P>
        Un historique recalculé sur une nouvelle version n’est plus comparable à celui d’avant. Des taux qui bougent
        sans explication datée ressemblent à une retouche, jamais à de la rigueur. Notre page porte donc, en toutes
        lettres, la date à laquelle la version servie du {NOM_SCORE} a changé, et dit que les taux affichés portent sur
        elle seule. La date de la dernière mise à jour de la mesure y figure aussi.
      </P>
      <P>
        Ce n’est pas une précaution&nbsp;: c’est ce qui rend les chiffres précédents lisibles. Sans cette date, une
        courbe qui remonte ne se distingue pas d’une courbe qu’on a redressée.
      </P>

      <H2 id="nos-resultats">Nos résultats, et comment les lire</H2>
      <P>
        Nous publions des pronostics de galop chaque matin, et nous mesurons ensuite ce qu’ils ont donné. La page{' '}
        <a href={URL_RESULTATS} rel="noopener noreferrer">
          Nos résultats
        </a>{' '}
        répond aux cinq questions ci-dessus, au même endroit&nbsp;:
      </P>
      <Tableau
        entetes={['La question', 'Où la réponse se lit']}
        lignes={[
          ['Sur combien de courses ?', '« Courses analysées », à côté de chaque taux'],
          ['Comparé à quoi ?', '« Au hasard », calculé sur les mêmes pelotons'],
          ['Les annonces se réalisent-elles ?', 'La lecture par tranches annoncées, avec ses effectifs'],
          ['Qui choisit la période ?', 'Six filtres, et la courbe mois par mois'],
          ['Et si la méthode change ?', 'La date du changement, écrite sur la page'],
        ]}
      />
      <P>
        Trois indicateurs y sont suivis&nbsp;: le premier de notre classement gagne, le premier de notre classement
        finit dans les trois, et le trio d’arrivée est trouvé. Chacun avec son effectif, son repère de hasard et son
        découpage.
      </P>
      <Liste
        points={[
          <>
            Elle est <strong>ouverte dès la formule gratuite</strong>&nbsp;: vous vérifiez la mesure avant de payer quoi
            que ce soit.
          </>,
          <>
            Elle est publiée <strong>sans tri</strong> — les périodes favorables comme les autres, puisque c’est vous
            qui tenez les filtres.
          </>,
          <>
            Elle ne contient <strong>aucun chiffre recopié ailleurs</strong>, ici compris&nbsp;: un taux figé dans un
            article serait faux dès le lendemain.
          </>,
        ]}
      />
      <P>
        La <Link to="/methode">page Comment ça marche</Link> détaille ce que le modèle mesure — sept facteurs, et pas
        une cote — et <Link to="/methode#limites">ce qu’une course garde d’imprévu</Link>. Pour regarder les chiffres
        vous-même, il suffit d’
        <a href={inscrireAvec('gratuit')} rel="noopener noreferrer">
          ouvrir un compte
        </a>
        &nbsp;: une course entièrement chiffrée vous attend dès demain matin.
      </P>
    </>
  )
}
