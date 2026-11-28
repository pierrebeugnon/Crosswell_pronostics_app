import { Link } from 'react-router-dom'
import { Chiffre, Encadre, H2, Liste, P } from '@/components/blog/Corps'
import { FORMULES, RYTHME_PUBLICATION, inscrireAvec } from '@/config/site'

/**
 * MINI-ARTICLE N°1 DE LA SÉRIE « FONCTIONNALITÉS » — la course offerte.
 *
 * Il vise « pronostic hippique gratuit » et mène à l'inscription. Lié depuis
 * l'article pilier (`comprendre-crosswell`), section « Gratuit ou Pass ».
 *
 * LA RÈGLE DÉCRITE EST CELLE DE LA BASE, `crosswell_courses_offertes` (db/024
 * et db/025, décisions du fondateur du 28/11/2026) : dans les réunions PMU (au
 * moins une cote du matin), la course où notre 1er a la plus forte probabilité
 * de victoire, puis la première au départ. Elle ne change plus une fois les
 * cotes du matin relevées (vers 7 h 45), et la course reste offerte si notre
 * 1er est retiré. Elle remplace « le plus gros peloton » (db/009) ; l'article
 * a été réécrit le 28/11 (`miseAJour`).
 *
 * LES CHIFFRES SONT DATÉS ET MESURÉS le 28/11/2026, en appliquant cette règle
 * aux 78 journées publiées du 11/09 au 27/11/2026, sur le classement de
 * « Nos résultats » (vue crosswell_predictions_servies) : notre 1er a remporté
 * 28 de ces courses et fini 59 fois dans les 3 premiers ; 6,8 partants au
 * départ en moyenne. Ils restent vrais à leur date ; ils ne se mettent pas à jour.
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
        La course où nos chiffres sont les plus sûrs&nbsp;: parmi les réunions suivies par le PMU, celle où notre favori
        a la plus forte chance de gagner. À égalité, la première au départ l’emporte. La règle est la même chaque jour,
        et la course offerte annoncée le matin reste la même jusqu’au soir, même si un cheval est retiré.
      </P>
      <P>
        C’est souvent un petit peloton, où un cheval se détache. Vous voyez notre modèle là où il est le plus
        affirmatif, et vous pouvez vérifier chaque soir s’il avait raison.
      </P>
      <Chiffre
        valeur="59 sur 78"
        source="Règle de la course offerte appliquée aux 78 journées publiées du 11 septembre au 27 novembre 2026"
      >
        Les journées où notre favori de la course offerte a fini dans les trois premiers. Il l’a remportée 28 fois,
        soit 36&nbsp;%. Ces courses comptaient en moyenne 6,8 partants au départ.
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
        &nbsp;: la course où notre favori a la plus forte chance vous attend, entièrement chiffrée.
      </P>
    </>
  )
}
