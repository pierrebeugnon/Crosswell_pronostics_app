import { Link } from 'react-router-dom'
import { Encadre, H2, H3, P, Tableau } from '@/components/blog/Corps'
import { FORMULES, NOTE_NON_PARTANTS, RYTHME_PUBLICATION, SEUILS_CONFIANCE, inscrireAvec } from '@/config/site'

/**
 * L'ARTICLE PILIER — tout ce que fait l'application, en gratuit et avec un Pass.
 *
 * Réécrit le 08/11/2026 à la demande du fondateur, à la même adresse : il était
 * la présentation de Crosswell et l'article le plus vu du blog, et un second
 * texte de présentation lui aurait fait concurrence. Il VEND, et chaque
 * fonctionnalité y tient en quelques lignes : les mini-articles de la série en
 * donneront le détail, et viendront se lier ici.
 *
 * CE QUI EST ÉCRIT DE L'OFFRE A ÉTÉ VÉRIFIÉ DANS L'APPLICATION ET EN BASE le
 * 08/11/2026 : la course offerte est celle de `client_predictions` (db/009, le
 * plus gros peloton, puis la catégorie la plus relevée) ; les fiches jockey et
 * entraîneur sont réservées aux Pass (`pages/Professionnel.tsx`) ; la fiche
 * cheval et le comparateur vivent sur les courses ouvertes ; les courses jugées
 * restent ouvertes à tous. Toute évolution de ces règles se reporte ici.
 *
 * PAS D'ÉCART AU MARCHÉ : le fondateur ne veut plus le mettre en avant dans la
 * communication (08/11/2026). La cote de clôture est citée comme un fait, une
 * fois la course courue, et rien de plus.
 *
 * AUCUN CHIFFRE SAISI EN CLAIR : prix, seuils, rythme et note sur les
 * non-partants viennent de `config/site.ts`.
 */
export default function ComprendreCrosswell() {
  const prix = (cle: string) => FORMULES.find((f) => f.cle === cle)?.prix ?? ''
  const pourcent = (part: number) => Math.round(part * 100)

  return (
    <>
      <P>
        Chaque jour, des dizaines de courses de galop se courent en France. Personne n’a le temps de toutes les étudier.
        Crosswell Pronostics le fait pour vous, chaque nuit, et vous donne le matin la réponse sous la forme la plus
        claire qui soit&nbsp;: les chances de chaque partant, en pourcentage.
      </P>
      <P>
        Cet article présente tout ce que l’application vous apporte, fonctionnalité par fonctionnalité, et ce que
        chaque formule ouvre. Vous pouvez tout essayer gratuitement, sans carte bancaire.
      </P>

      <H2 id="chaque-matin">Chaque matin, toutes les courses de galop chiffrées</H2>
      <P>
        Notre modèle analyse chaque partant de chaque course de galop du jour&nbsp;: plat, haies, steeple et cross. Le
        programme complet, pas une sélection. {RYTHME_PUBLICATION}
      </P>
      <P>
        Une fois publiés, nos pourcentages ne bougent plus. Ce que vous lisez le matin est exactement ce qui sera
        confronté à l’arrivée le soir.
      </P>

      <H2 id="fonctionnalites">Les fonctionnalités, une par une</H2>

      <H3>L’arrivée prédite</H3>
      <P>
        Pour chaque course, l’ordre d’arrivée que notre modèle juge le plus probable. En un regard, vous savez qui il
        attend devant, et dans quel ordre.
      </P>

      <H3>Les chances de victoire et de place de chaque partant</H3>
      <P>
        Chaque cheval reçoit deux pourcentages&nbsp;: ses chances de gagner et ses chances de finir dans les trois
        premiers. Tout le peloton est chiffré, pas seulement les premiers noms, et les chances de victoire d’une course
        totalisent 100&nbsp;%. Une course ouverte et une course dominée se reconnaissent immédiatement.
      </P>

      <H3>Le niveau de confiance</H3>
      <P>
        Chaque course porte un niveau de confiance&nbsp;: élevé quand notre favori atteint{' '}
        {pourcent(SEUILS_CONFIANCE.elevee)}&nbsp;% de chances de victoire, moyen dès{' '}
        {pourcent(SEUILS_CONFIANCE.moyenne)}&nbsp;%. Le programme se trie de lui-même&nbsp;: vous voyez tout de suite les
        courses où le modèle se prononce le plus nettement.
      </P>

      <H3>Le Quinté+ du jour, repéré</H3>
      <P>
        Quand le Quinté+ du jour est une course de galop, il est signalé dans le programme et en tête de la course.
        Vous le trouvez sans le chercher.
      </P>

      <H3>Les fiches cheval, jockey et entraîneur</H3>
      <P>
        Un clic sur un partant ouvre sa fiche&nbsp;: sa musique, sa carrière, ses dernières courses, ses origines et son
        entourage. Les fiches du jockey et de l’entraîneur complètent le dossier. Toutes s’appuient sur les performances publiées par France
        Galop, dont nous ne sommes pas partenaires.
      </P>

      <H3>Le comparateur</H3>
      <P>
        Vous hésitez entre deux ou trois partants&nbsp;? Posez-les côte à côte&nbsp;: chances de victoire et de place,
        musique, victoires, allocations, sur une même vue.
      </P>

      <H3>L’arrivée, en face de notre annonce</H3>
      <P>
        Une fois la course courue, l’application affiche l’arrivée officielle en face de ce que nous avions annoncé le
        matin, avec la cote de clôture sur les réunions cotées. Vous voyez où notre favori a fini, course par course.
      </P>

      <H3>Nos résultats</H3>
      <P>
        La page «&nbsp;Nos résultats&nbsp;» mesure nos pourcentages sur toutes les courses jugées, sans en écarter
        aucune. Filtrez par période, type de course, distance ou hippodrome&nbsp;: chaque taux s’affiche avec le nombre
        de courses qui le fonde. Notre méthode se juge sur pièces, et vous tenez les filtres.
      </P>

      <H3>Sur le site, sans même ouvrir de compte</H3>
      <P>
        Les <Link to="/resultats">arrivées du jour</Link>, avec la probabilité que nous avions annoncée pour chaque
        partant, les <a href="/statistiques">statistiques des courses de galop</a> et le{' '}
        <Link to="/outils/cote-probabilite">convertisseur de cotes</Link> sont en accès libre, pour tout le monde.
      </P>

      <H2 id="gratuit-ou-pass">Gratuit ou Pass&nbsp;: ce que chaque formule ouvre</H2>
      <P>
        La formule gratuite vous donne chaque jour un pronostic complet&nbsp;: celui de la{' '}
        <Link to="/blog/pronostic-hippique-gratuit-course-offerte">plus belle course du jour</Link>, celle qui réunit le
        plus de partants. Un Pass ouvre tout le reste.
      </P>
      <Tableau
        entetes={['', 'Gratuit', 'Avec un Pass']}
        lignes={[
          ['Programme du jour et du lendemain', 'Oui', 'Oui'],
          ['Arrivée prédite, chances, niveau de confiance', 'La course offerte du jour', 'Toutes les courses'],
          ['Fiche cheval et comparateur', 'Sur la course offerte', 'Sur toutes les courses'],
          ['Fiches jockey et entraîneur', '—', 'Oui'],
          ['Courses déjà courues, annonce et arrivée', 'Oui', 'Oui'],
          ['Nos résultats, filtrables', 'Oui', 'Oui'],
          ['Carte bancaire', 'Jamais demandée', 'Paiement sécurisé par Stripe'],
        ]}
      />
      <P>Trois Pass, qui ouvrent exactement la même chose&nbsp;:</P>
      <Tableau
        entetes={['Pass', 'Prix', 'Pour qui']}
        lignes={[
          ['Pass 1 jour', prix('jour'), 'Une grande journée de courses, sans abonnement ni rien à résilier'],
          ['Pass mensuel', prix('mois'), 'Suivre les courses chaque jour, résiliable en ligne à tout moment'],
          ['Pass annuel', prix('an'), 'Toute la saison, au meilleur prix'],
        ]}
      />

      <H2 id="les-chiffres">D’où viennent nos chiffres</H2>
      <P>
        Notre modèle mesure sept éléments pour chaque partant&nbsp;: la valeur du cheval, établie sur les chevaux qu’il
        a battus, sa forme récente, la distance, la catégorie de la course, la taille du peloton, le jockey et
        l’entraîneur. Il ne lit ni la presse, ni les informations d’écurie, ni les cotes. La{' '}
        <Link to="/methode">méthode</Link> détaille chacun de ces éléments.
      </P>
      <P>
        Crosswell est un éditeur indépendant. Notre seule source de revenus est l’abonnement&nbsp;: rien ne nous
        intéresse à l’issue d’une course, sinon la justesse de nos chiffres.
      </P>
      <Encadre titre="À savoir">
        Une probabilité est une estimation&nbsp;: elle décrit une fréquence attendue sur un grand nombre de courses, pas
        l’issue d’une course précise. Aucun résultat n’est garanti, et les performances passées ne préjugent pas des
        résultats futurs. {NOTE_NON_PARTANTS}
      </Encadre>

      <H2 id="commencer">Commencer gratuitement</H2>
      <P>
        Ouvrez un compte en une minute, sans carte bancaire&nbsp;: la plus belle course du jour vous attend, entièrement
        chiffrée. Quand vous voulez tout le programme, un Pass l’ouvre dès {prix('jour')}.
      </P>
      <P>
        <a href={inscrireAvec('gratuit')} rel="noopener noreferrer">
          Ouvrir mon compte gratuit
        </a>{' '}
        · <Link to="/#tarifs">Voir les Pass</Link> · <Link to="/cgv">Conditions de vente</Link>
      </P>
    </>
  )
}
