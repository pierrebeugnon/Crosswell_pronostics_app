import { Link } from 'react-router-dom'
import { H2, Illustration, Liste, P } from '@/components/blog/Corps'
import { FORMULES, inscrireAvec } from '@/config/site'

/**
 * MINI-ARTICLE N°2 DE LA SÉRIE « FONCTIONNALITÉS » — le comparateur.
 *
 * Demandé par le fondateur le 16/11/2026 : VENDRE ce que fait l'application,
 * écran à l'appui, plutôt qu'expliquer une notion (un premier brouillon sur les
 * pourcentages, trop proche de l'article Méthode, a été retiré).
 *
 * CE QUI EST DÉCRIT EST CE QUE FAIT `src/components/courses/Comparateur.tsx`
 * (vérifié le 16/11/2026) : deux ou trois partants d'une même course, cochés
 * dans le tableau ou depuis la fiche ; chances de victoire et de place, musique,
 * victoires sur courses, allocations, âge, sexe et robe ; la meilleure valeur de
 * chaque ligne en vert ; la sélection gardée quand on ouvre une fiche ; le rang
 * prédit et l'arrivée une fois la course courue.
 *
 * LES CAPTURES viennent de l'application EN MODE DÉMONSTRATION (chevaux et
 * chiffres fictifs), prises par `capture-comparateur.mjs` (scratchpad de la
 * session du 16/11). La démonstration n'a qu'une réunion, cotée : les lignes
 * « Cote et tendance » (simulée en démonstration) et « Écart au marché » ont été
 * retirées de la capture, comme sur une réunion sans cote. Le fondateur ne veut
 * plus mettre l'écart au marché en avant (08/11/2026).
 */
export default function ComparateurChevaux() {
  const passJour = FORMULES.find((f) => f.cle === 'jour')?.prix ?? ''

  return (
    <>
      <P>
        Vous hésitez entre deux chevaux, ou trois&nbsp;? Le comparateur de Crosswell les pose côte à côte sur un seul
        écran&nbsp;: leurs chances, leur forme, leur carrière. En vert, le meilleur de chaque ligne. Plus besoin
        d’ouvrir trois fiches et de tout retenir&nbsp;: tout est là, et la différence saute aux yeux.
      </P>

      <H2 id="ce-que-vous-comparez">Tout ce qui compte, sur une seule vue</H2>
      <Illustration
        src="/media/comparateur-bureau.png"
        alt="Le comparateur de Crosswell sur ordinateur : trois chevaux en colonnes, avec pour chacun le rang prédit, les chances de victoire et de place, la musique, les victoires sur le nombre de courses et les allocations, les meilleures valeurs en vert."
        largeur={2320}
        hauteur={1190}
        legende="Le comparateur sur ordinateur. Chevaux et chiffres fictifs, pour illustration."
      />
      <P>Pour chaque cheval, une colonne, et sur chaque ligne&nbsp;:</P>
      <Liste
        points={[
          <>
            <strong>Ses chances de victoire</strong>, en pourcentage, avec une barre qui montre l’écart d’un coup
            d’œil.
          </>,
          <>
            <strong>Ses chances d’être placé</strong>, c’est-à-dire de finir dans les trois premiers.
          </>,
          <>
            <strong>Sa musique</strong>&nbsp;: ses dernières places, les bonnes en vert.
          </>,
          <>
            <strong>Ses victoires sur le nombre de courses</strong>, et <strong>ses allocations</strong> en carrière.
          </>,
          <>
            <strong>Son identité</strong>&nbsp;: son âge, son sexe et sa robe, sous son nom.
          </>,
        ]}
      />
      <P>
        Sur chaque ligne, la meilleure valeur s’affiche en vert. Le cheval qui domine sur tous les critères se repère
        immédiatement, comme celui qui n’a pour lui qu’un seul argument.
      </P>

      <H2 id="en-trois-gestes">En trois gestes</H2>
      <Liste
        points={[
          <>
            Dans la liste des partants d’une course, cochez deux ou trois chevaux. Depuis la fiche d’un cheval, le bouton
            «&nbsp;Comparer&nbsp;» fait la même chose.
          </>,
          <>
            Une barre apparaît en bas de l’écran avec leurs numéros. Touchez «&nbsp;Comparer&nbsp;».
          </>,
          <>Lisez. Un clic sur un nom ouvre la fiche complète du cheval, et votre sélection vous attend au retour.</>,
        ]}
      />
      <P>
        Une fois la course courue, le comparateur ajoute l’arrivée réelle de chaque cheval sous le rang que nous avions
        prédit le matin.
      </P>

      <H2 id="sur-telephone">Pensé pour le téléphone</H2>
      <P>
        Sur téléphone, le comparateur s’ouvre en plein écran&nbsp;: les chevaux en cartes en haut, les critères en
        dessous, colonne par colonne. Tout se lit sans zoomer, au bord de la piste comme dans le canapé.
      </P>
      <Illustration
        src="/media/comparateur-mobile.png"
        alt="Le comparateur de Crosswell sur téléphone : trois cartes de chevaux en haut, puis leurs chances de victoire et de place, leur musique, leurs victoires et leurs allocations, en colonnes."
        largeur={780}
        hauteur={1300}
        legende="Le comparateur sur téléphone. Chevaux et chiffres fictifs, pour illustration."
        etroite
      />

      <H2 id="disponible">Disponible dès la formule gratuite</H2>
      <P>
        Le comparateur fonctionne sur la{' '}
        <Link to="/blog/pronostic-hippique-gratuit-course-offerte">course offerte chaque jour</Link>, sans carte
        bancaire. Avec un Pass, il fonctionne sur toutes les courses du jour, dès {passJour} pour 24&nbsp;heures. Toutes
        les autres fonctionnalités sont présentées dans notre{' '}
        <Link to="/blog/comprendre-crosswell-pronostics-hippiques-statistiques">présentation de l’application</Link>.
      </P>
      <P>
        <a href={inscrireAvec('gratuit')} rel="noopener noreferrer">
          Créer mon compte gratuit
        </a>{' '}
        et comparer les partants de la course offerte dès demain matin.
      </P>
    </>
  )
}
