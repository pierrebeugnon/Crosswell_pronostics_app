import { Link } from 'react-router-dom'
import { Chiffre, Encadre, H2, Liste, P } from '@/components/blog/Corps'
import { FORMULES, RYTHME_PUBLICATION, inscrireAvec } from '@/config/site'

/**
 * MINI-ARTICLE N°1 DE LA SÉRIE « FONCTIONNALITÉS » — la course offerte.
 *
 * Il vise « pronostic hippique gratuit » et mène à l'inscription. Lié depuis
 * l'article pilier (`comprendre-crosswell`), section « Gratuit ou Pass ».
 *
 * LA RÈGLE DÉCRITE EST CELLE DE LA BASE, `client_predictions` (db/009) : le plus
 * gros peloton déclaré, puis la catégorie la plus relevée, puis la première au
 * départ. Elle ne change pas dans la journée, puisque `field_size` compte les
 * déclarés.
 *
 * LES DEUX CHIFFRES SONT DATÉS ET MESURÉS le 08/11/2026, en appliquant cette
 * règle aux journées publiées du 11/09 au 08/11/2026 (59 journées) : 15,9
 * partants déclarés en moyenne, et 21 Quinté+ sur les 29 journées où il s'est
 * couru au galop. Ils restent vrais à leur date ; ils ne se mettent pas à jour.
 *
 * Le Quinté+ y est NOMMÉ comme une course, et rien d'autre (exception du
 * 28/10/2026) : ni combinaison, ni invitation.
 */
export default function CourseOfferte() {
  const passJour = FORMULES.find((f) => f.cle === 'jour')?.prix ?? ''

  return (
    <>
      <P>
        Chaque jour, Crosswell vous offre le pronostic complet d’une course de galop. Pas un extrait, pas un nom
        entouré&nbsp;: tout ce qu’un Pass vous donnerait sur cette course, gratuitement, sans carte bancaire.
      </P>

      <H2 id="ce-que-vous-recevez">Le pronostic complet, sans rien payer</H2>
      <P>Sur la course offerte du jour, vous voyez exactement ce que voient nos abonnés&nbsp;:</P>
      <Liste
        points={[
          <>L’arrivée que notre modèle juge la plus probable.</>,
          <>Les chances de victoire et de place de chaque partant, en pourcentage.</>,
          <>Le niveau de confiance de la course.</>,
          <>La fiche de chaque cheval et le comparateur, pour poser deux ou trois partants côte à côte.</>,
        ]}
      />
      <P>{RYTHME_PUBLICATION}</P>

      <H2 id="quelle-course">Quelle course est offerte&nbsp;?</H2>
      <P>
        La plus belle course du jour&nbsp;: celle qui réunit le plus de partants déclarés. À égalité, la catégorie la
        plus relevée l’emporte, puis la première au départ. La règle est la même chaque jour, et la course offerte
        annoncée le matin reste la même jusqu’au soir, même si un cheval est retiré.
      </P>
      <P>
        Un gros peloton, c’est la course la plus difficile à lire seul, et celle où un pourcentage par partant aide le
        plus. C’est aussi, très souvent, la course que tout le monde regarde.
      </P>
      <Chiffre
        valeur="21 sur 29"
        source="Règle de la course offerte appliquée aux journées publiées du 11 septembre au 8 novembre 2026"
      >
        Des journées où le Quinté+ s’est couru au galop, la course offerte était le Quinté+ lui-même. Sur la période,
        elle a réuni en moyenne 16 partants déclarés.
      </Chiffre>

      <H2 id="ou-la-trouver">Où la trouver dans l’application</H2>
      <P>
        Dès que vous êtes connecté, un bandeau «&nbsp;Formule gratuite&nbsp;» nomme la course offerte du jour, avec son
        hippodrome et son heure de départ&nbsp;: un clic, et vous y êtes. Dans le programme, elle porte l’étiquette
        «&nbsp;Offert&nbsp;».
      </P>
      <P>
        Une fois courue, elle reste ouverte&nbsp;: vous voyez l’arrivée en face de ce que nous avions annoncé le matin.
      </P>

      <H2 id="ouvert-a-tous">Ce qui reste ouvert à tous</H2>
      <P>La formule gratuite ne s’arrête pas à la course offerte. Avec votre compte, vous avez aussi&nbsp;:</P>
      <Liste
        points={[
          <>Le programme du jour et du lendemain.</>,
          <>Toutes les courses déjà courues, avec notre annonce et l’arrivée.</>,
          <>
            La page «&nbsp;Nos résultats&nbsp;», qui mesure nos pourcentages sur toutes les courses jugées, filtre par
            filtre.
          </>,
        ]}
      />
      <P>
        Sans même ouvrir de compte, les <Link to="/resultats">arrivées du jour</Link> et les{' '}
        <a href="/statistiques">statistiques des courses de galop</a> sont en accès libre.
      </P>

      <H2 id="pass">Quand passer à un Pass</H2>
      <P>
        Le jour où une course vous intéresse et qu’elle n’est pas la course offerte, un Pass ouvre tout le
        programme&nbsp;: toutes les courses, tous les partants, et les fiches des jockeys et des entraîneurs. Le Pass 1
        jour coûte {passJour}, sans abonnement ni rien à résilier. Toute l’offre est détaillée dans notre{' '}
        <Link to="/blog/comprendre-crosswell-pronostics-hippiques-statistiques">présentation de l’application</Link>.
      </P>
      <Encadre titre="À savoir">
        Une probabilité est une estimation&nbsp;: aucun résultat n’est garanti, et les performances passées ne préjugent
        pas des résultats futurs.
      </Encadre>

      <H2 id="commencer">Recevoir la course offerte demain matin</H2>
      <P>
        Ouvrir un compte prend une minute, et aucune carte bancaire n’est demandée.{' '}
        <a href={inscrireAvec('gratuit')} rel="noopener noreferrer">
          Créer mon compte gratuit
        </a>
        &nbsp;: la plus belle course du jour vous attend, entièrement chiffrée.
      </P>
    </>
  )
}
