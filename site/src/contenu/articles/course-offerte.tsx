import { Link } from 'react-router-dom'
import { Encadre, H2, Liste, P } from '@/components/blog/Corps'
import { FORMULES, RYTHME_PUBLICATION, inscrireAvec } from '@/config/site'

/**
 * MINI-ARTICLE N°1 DE LA SÉRIE « FONCTIONNALITÉS » — la course offerte.
 *
 * Il vise « pronostic hippique gratuit » et mène à l'inscription. Lié depuis
 * l'article pilier (`comprendre-crosswell`), section « Gratuit ou Pass ».
 *
 * LA RÈGLE DE LA BASE, `crosswell_courses_offertes` (db/024 et db/025, 28/11) :
 * dans les réunions PMU (au moins une cote du matin), la course où notre 1er a
 * la plus forte probabilité de victoire, puis la première au départ. Elle ne
 * change plus une fois les cotes du matin relevées (vers 7 h 45), et la course
 * reste offerte si notre 1er est retiré. Elle remplace « le plus gros
 * peloton » (db/009) ; l'article a été réécrit le 28/11 (`miseAJour`).
 *
 * CE QUE L'ARTICLE NE DIT PAS, consigne du fondateur du 28/11/2026 : il ne
 * présente PAS la course offerte comme « notre course la plus sûre », et ne
 * publie aucun taux de réussite propre à cette course. Sinon le lecteur croit
 * que nous ne montrons que les courses où nous sommes quasi sûrs, et il ne
 * peut pas nous juger sur elles. Franchise oui, se desservir non : l'article
 * dit où elle est choisie (une réunion PMU) et renvoie à « Nos résultats »,
 * qui jugent le modèle sur TOUTES les courses.
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
        Chaque matin, notre modèle désigne une course du jour, toujours dans une réunion suivie par le PMU&nbsp;: une
        course que vous pouvez regarder en direct et mettre en face des cotes. La course offerte annoncée le matin reste
        la même jusqu’au soir, même si un cheval est retiré.
      </P>
      <P>
        Pour juger notre modèle, ne vous arrêtez pas à une course. La page{' '}
        <Link to="/resultats">«&nbsp;Nos résultats&nbsp;»</Link> publie chaque arrivée, course par course, en face de ce
        que nous avions annoncé le matin&nbsp;: toutes les courses, pas seulement celle qui vous est offerte.
      </P>

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
        &nbsp;: la course offerte du jour vous attend, entièrement chiffrée.
      </P>
    </>
  )
}
