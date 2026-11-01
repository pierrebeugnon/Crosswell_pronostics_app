import { Link } from 'react-router-dom'
import { Encadre, H2, P } from '@/components/blog/Corps'
import CalendrierSaison from '@/components/blog/CalendrierSaison'
import { inscrireAvec } from '@/config/site'
import { casseDeTitre } from '@/lib/format'
import calendrier from '@/contenu/donnees/calendrier-groupes-2026.json'

/**
 * PILIER DU CLUSTER « GRANDES COURSES » — le calendrier des Groupe du plat,
 * mis en forme d'après la maquette « Blog · Les grandes courses de l'année »
 * (fournie le 26/10/2026). La mise en page vit dans
 * `components/blog/CalendrierSaison`, qui dit aussi ce qui s'écarte de la
 * maquette et pourquoi.
 *
 * Les 110 lignes ne sont PAS écrites ici : elles vivent dans
 * `contenu/donnees/calendrier-groupes-2026.json`, relevé sur notre base de
 * courses. C'est de la donnée, pas de la prose : elle se régénère chaque
 * janvier d'une requête. La transcription a été recoupée contre la base sur le
 * total, la répartition par groupe, par hippodrome, et sur la somme des
 * allocations à l'euro près.
 */

type Course = { d: string; g: number; n: string; h: string; m: number; a: string; s: string; p: number }

/**
 * LA SOURCE ÉCRIT SANS ACCENTS ET EN CAPITALES, et `casseDeTitre` ne peut pas
 * les deviner : « CRITERIUM », « PRIX DE PSYCHE », « PRIX ECLIPSE ». Elle ne
 * peut pas davantage savoir que « IV » est un chiffre romain, ni que « PMU »,
 * « KRA » ou « JRA » sont des sigles — elle en ferait « Iv », « Pmu », « Kra ».
 *
 * Cette table ne corrige QUE l'orthographe. Les noms de partenaires sont
 * conservés : ce sont les intitulés sous lesquels ces courses ont réellement
 * été courues en 2026, et les retirer reviendrait à réécrire la donnée plutôt
 * qu'à la rendre lisible. Clé = le libellé brut, tel qu'il est en base.
 */
const ORTHOGRAPHE: Record<string, string> = {
  'PRIX GANAY - WP BY PMU': 'Prix Ganay – WP by PMU',
  'PRIX DU GROS-CHENE - WP BY PMU': 'Prix du Gros-Chêne – WP by PMU',
  "PRIX AGA KHAN IV (PRIX D'ISPAHAN)": "Prix Aga Khan IV (Prix d'Ispahan)",
  'HARAS DE FRESNAY-LE-BUFFARD PRIX JEAN PRAT': 'Haras de Fresnay-le-Buffard Prix Jean Prat',
  "PRIX ROTHSCHILD - FONDS EUROPEEN DE L'ELEVAGE": "Prix Rothschild – Fonds européen de l'élevage",
  "PRIX DE CABOURG - FONDS EUROPEEN DE L'ELEVAGE": "Prix de Cabourg – Fonds européen de l'élevage",
  "SKY SPORTS RACING PRIX DE PSYCHE - FONDS EUROPEEN DE L'ELEVAGE": 'Sky Sports Racing Prix de Psyché',
  "SKY SPORTS RACING PRIX SIX PERFECTIONS - FONDS EUROPEEN DE L'ELEVAGE": 'Sky Sports Racing Prix Six Perfections',
  "PRIX BERTRAND DE TARRAGON - FONDS EUROPEEN DE L'ELEVAGE": 'Prix Bertrand de Tarragon',
  "PRIX DES CHENES - TATTERSALLS - FONDS EUROPEEN DE L'ELEVAGE": 'Prix des Chênes – Tattersalls',
  "PRIX ECLIPSE - TATTERSALLS - FONDS EUROPEEN DE L'ELEVAGE": 'Prix Éclipse – Tattersalls',
  'ARC PRIX MAURICE DE GHEEST - FEE - EN MEMOIRE DE LOUIS ROMANET':
    'Arc Prix Maurice de Gheest – en mémoire de Louis Romanet',
  'QATAR PRIX DE LA FORET': 'Qatar Prix de la Forêt',
  'PRIX DE LA GROTTE': 'Prix de la Grotte',
  'SINGAPORE POOLS PRIX DE LA PORTE MAILLOT': 'Singapore Pools Prix de la Porte Maillot',
  'QATAR PRIX MARCEL BOUSSAC - CRITERIUM DES POULICHES': 'Qatar Prix Marcel Boussac – Critérium des Pouliches',
  'CRITERIUM DE SAINT-CLOUD': 'Critérium de Saint-Cloud',
  'CRITERIUM INTERNATIONAL': 'Critérium International',
  'CRITERIUM DE MAISONS-LAFFITTE': 'Critérium de Maisons-Laffitte',
  'HENRI MATISSE COOLMORE PRIX CLEOPATRE': 'Henri Matisse Coolmore Prix Cléopâtre',
  "PRIX D'HEDOUVILLE": "Prix d'Hédouville",
  'KRA LA COUPE': 'KRA La Coupe',
  'PRIX DU BOIS - B.P.E LECIEUX': 'Prix du Bois – B.P.E Lecieux',
  'PRIX DAPHNIS - JOCKEY CLUB ARGENTINO (ARG)': 'Prix Daphnis – Jockey Club Argentino (ARG)',
  'JRA PRIX ALEC HEAD (PRIX DE POMONE)': 'JRA Prix Alec Head (Prix de Pomone)',
  'THE AGA KHAN STUDS PRIX FRANCOIS BOUTIN': 'The Aga Khan Studs Prix François Boutin',
  'BARRIERE PRIX DE MEAUTRY': 'Barrière Prix de Meautry',
  'BARRIERE PRIX QUINCEY': 'Barrière Prix Quincey',
  'LUCIEN BARRIERE GRAND PRIX DE DEAUVILLE': 'Lucien Barrière Grand Prix de Deauville',
  "PRIX DE L'OPERA LONGINES": "Prix de l'Opéra Longines",
  'QATAR PRIX JEAN-LUC LAGARDERE': 'Qatar Prix Jean-Luc Lagardère',
  'DARLEY PRIX DES RESERVOIRS': 'Darley Prix des Réservoirs',
  'PRIX DE REUX': 'Prix de Reux',
  "AL SHIRA'AA RACING PRIX VANTEAUX": "Al Shira'aa Racing Prix Vanteaux",
  'PRIX EUGENE ADAM': 'Prix Eugène Adam',
  'DARLEY PRIX CHLOE': 'Darley Prix Chloé',
  'RADIO FG - PRIX MAURICE DE NIEUIL': 'Radio FG – Prix Maurice de Nieuil',
  'PRIX GERALD DE GEOFFRE': 'Prix Gérald de Geoffre',
  'PRIX DE CONDE JOCKEY CLUB DE TURQUIE': 'Prix de Condé Jockey Club de Turquie',
  // L'obstacle, arrivé avec predictions_log.
  'PRIX DE COMPIEGNE': 'Prix de Compiègne',
  'GRAND STEEPLE-CHASE DE COMPIEGNE': 'Grand Steeple-Chase de Compiègne',
  'PRIX HEROS XII': 'Prix Héros XII',
  'PRIX THE FELLOW - MARQUISE DE MORATALLA': 'Prix The Fellow – Marquise de Moratalla',
  'PRIX DE LA GASCOGNE': 'Prix de la Gascogne',
}

const COURSES: Course[] = (calendrier.courses as Course[]).map((c) => ({
  ...c,
  n: ORTHOGRAPHE[c.n] ?? casseDeTitre(c.n),
}))

export default function CalendrierGrandesCourses() {
  return (
    <>
      <P>
        Ce calendrier des grandes courses de galop en France rassemble les courses de Groupe de la saison 2026&nbsp;:
        cent dix sur le plat, du Prix&nbsp;Exbury le 15&nbsp;mars au Prix de Seine-et-Oise le 26&nbsp;octobre, et
        quatorze en obstacle, à Auteuil et Compiègne. Pour chacune&nbsp;: la date, l’hippodrome, la distance et les
        chevaux qu’elle admet.
      </P>

      <H2 id="le-classement">Groupe&nbsp;1, 2, 3&nbsp;: lire le classement</H2>
      <P>
        Les courses de galop sont hiérarchisées. Au sommet, le Groupe&nbsp;1 réunit les meilleurs chevaux d’une
        génération ou d’une spécialité, sans correction de poids liée aux performances passées&nbsp;: chacun porte le
        poids de son âge et de son sexe, et rien d’autre. Viennent ensuite le Groupe&nbsp;2, puis le Groupe&nbsp;3.
      </P>
      <P>
        Ce classement n’est pas un ornement. Il dit à quel niveau un cheval a couru, et c’est l’une des choses que
        notre modèle regarde en premier lorsqu’il lit une ligne de performances&nbsp;: battre six chevaux dans un
        Groupe&nbsp;1 et en battre six dans une course à réclamer ne vaut pas la même chose. La page{' '}
        <Link to="/blog/probabilite-victoire-cheval-analyser-course-hippique">
          comment estimer la probabilité de victoire d’un cheval
        </Link>{' '}
        détaille cette lecture.
      </P>

      <H2 id="le-calendrier">Le calendrier, mois par mois</H2>
      <P>
        La saison des Groupe s’étale sur huit mois, de la mi-mars à la fin octobre, et se resserre sur quelques
        hippodromes. Octobre en concentre à lui seul près du quart, dont les huit Groupe&nbsp;1 des deux journées du
        week-end de l’Arc. Les filtres ci-dessous séparent le plat de l’obstacle, les trois niveaux de Groupe, et les
        épreuves réservées aux deux ans, aux trois ans, aux chevaux d’âge ou aux femelles.
      </P>

      {/* Le calendrier TIENT DANS LA COLONNE DE TEXTE, et c'est voulu. Le gabarit
          d'article met le corps dans une colonne de 47,5 rem à droite du
          sommaire : tout élargissement déborde la page et provoque un
          défilement horizontal, mesuré à 1 330 px pour une fenêtre de 1 062.
          47,5 rem laissent deux colonnes de cartes d'environ 365 px, soit la
          proportion de la maquette. */}
      <div className="w-full">
        <CalendrierSaison courses={COURSES} saison={calendrier.saison} />
      </div>

      <Encadre titre="La saison 2026 s’est refermée le 25 octobre">
        Les trois derniers Groupe&nbsp;1 de l’année se sont courus le même après-midi, à Saint-Cloud&nbsp;: le
        Critérium International, le Critérium de Saint-Cloud et le Prix Royal-Oak. L’arrivée de chacun, et ce que nous
        avions annoncé le matin même, se lisent sur{' '}
        <Link to="/resultats/2026-10-25">la journée du 25&nbsp;octobre</Link>.
      </Encadre>

      <H2 id="les-lieux">Quatre hippodromes, et un cinquième</H2>
      <P>
        La géographie est resserrée. ParisLongchamp accueille 48 des 110 courses de Groupe, Deauville 26, Chantilly 20
        et Saint-Cloud 15. Le Grand Prix de Vichy est la seule épreuve de Groupe courue ailleurs en 2026. Quatre
        pistes, donc, portent l’essentiel d’une saison — ce qui explique qu’un cheval de haut niveau y revienne
        plusieurs fois dans l’année, et que la connaissance d’un tracé compte.
      </P>
      <P>
        Les distances vont de 1&nbsp;000&nbsp;m, pour le Prix de l’Abbaye de Longchamp couru en ligne droite, à
        4&nbsp;000&nbsp;m pour le Prix du Cadran. Entre les deux, le mile (1&nbsp;600&nbsp;m) et les 2&nbsp;400&nbsp;m
        de l’Arc rassemblent le plus gros des engagements.
      </P>

      <H2 id="ce-que-nous-en-avons-lu">Ce que nous avons lu de cette saison</H2>
      <P>
        Nos pronostics publics commencent au 10&nbsp;septembre 2026. Onze des vingt-huit Groupe&nbsp;1 de la saison
        tombent après cette date, et nous avons publié pour chacun, le matin de la course, l’arrivée prédite et la
        probabilité de victoire et de place de chaque partant. Trois journées les portent&nbsp;:{' '}
        <Link to="/resultats/2026-10-03">le 3&nbsp;octobre</Link> à ParisLongchamp (Prix de Royallieu, Prix du
        Cadran), <Link to="/resultats/2026-10-04">le 4&nbsp;octobre</Link> pour les six Groupe&nbsp;1 du jour de
        l’Arc, et <Link to="/resultats/2026-10-25">le 25&nbsp;octobre</Link> à Saint-Cloud.
      </P>
      <P>
        Le Prix de l’Arc de Triomphe, doté de 5&nbsp;000&nbsp;000&nbsp;€ et couru à seize partants, est le plus
        exigeant de l’année pour un modèle&nbsp;: un grand peloton, des chevaux venus de plusieurs pays, et des
        références qui ne se comparent pas d’elles-mêmes. Nous avons raconté cette course en détail dans{' '}
        <Link to="/blog/arc-de-triomphe-2026-daryz-analyse-statistique">
          notre analyse de l’Arc de Triomphe 2026
        </Link>
        .
      </P>

      <H2 id="commencer">Suivre la prochaine saison</H2>
      <P>
        Les mois reviennent d’une année sur l’autre&nbsp;: les Poules d’Essai en mai, le Jockey Club à la fin du même
        mois, la Diane à la mi-juin, le meeting de Deauville en août, l’Arc au premier dimanche d’octobre. Ce
        calendrier sera mis à jour dès que les dates de la saison suivante seront arrêtées.
      </P>
      <P>
        D’ici là, chaque jour de courses est lu de la même façon, Groupe&nbsp;1 ou course de province&nbsp;:{' '}
        <Link to="/resultats">les arrivées du jour</Link> montrent, course par course, ce que notre modèle avait
        annoncé le matin même et ce qui s’est passé. Pour voir les pronostics avant la course, il suffit d’
        <a href={inscrireAvec('gratuit')} rel="noopener noreferrer">
          ouvrir un compte gratuit
        </a>
        , sans carte bancaire&nbsp;: une course complète est offerte chaque jour. Les Pass ouvrent le programme
        entier, et leur détail figure dans la <Link to="/#tarifs">grille tarifaire</Link>. La page{' '}
        <Link to="/methode">Comment ça marche</Link> raconte la méthode en entier.
      </P>
    </>
  )
}
