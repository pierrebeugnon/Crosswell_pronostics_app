import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ListeLegale, PageLegale, SectionLegale } from '@/components/legal/PageLegale'
import { CONTACT, EDITEUR, FORMULES, RYTHME_PUBLICATION_COURT } from '@/config/site'
import { useTitre } from '@/lib/useTitre'

/**
 * CONDITIONS GÉNÉRALES DE VENTE — transcription de `docs/cgv-brouillon.md`
 * (rédigé le 20/09/2026), publiée le 25/09/2026 à la demande du fondateur.
 *
 * POURQUOI CETTE PAGE EXISTE ALORS QUE LE TEXTE N'EST PAS VALIDÉ. La case
 * « J'accepte les conditions générales », OBLIGATOIRE à l'inscription, pointait
 * vers `/cgu` — une page qui n'existait pas : un vrai 404. Faire cocher une
 * case qui renvoie au vide est pire que publier un texte qui dit franchement
 * ce qu'il est. D'où l'encart d'en-tête, que personne ne peut manquer, et les
 * `[TROUS]` laissés VISIBLES plutôt que comblés au jugé.
 *
 * CE QUI RESTE À FAIRE AVANT L'OUVERTURE DES VENTES (docs/cgv-brouillon.md) :
 * combler les huit trous (Kbis, statuts, siège, médiateur, date), trancher les
 * six questions du juriste — dont le régime de rétractation du Pass 1 jour —,
 * et remplacer cette transcription par la version validée.
 *
 * DEUX ÉCARTS ASSUMÉS AU BROUILLON, pour ne pas publier une promesse fausse :
 * les articles 3 et 9 y annoncent des analyses publiées « la veille de la
 * course » et « chaque soir ». Le calcul de la veille a été ABANDONNÉ le
 * 20/09 ; la page reprend donc `RYTHME_PUBLICATION_COURT`, comme le reste du
 * site. À reporter dans le brouillon lors de la relecture juridique.
 */

/** Un identifiant que nous n'avons pas encore. Dit, jamais inventé. */
function Trou({ children }: { children: ReactNode }) {
  return (
    <span className="whitespace-nowrap font-bold text-warn border border-warn/40 bg-warn/10 rounded px-1.5 py-0.5 text-[0.8125rem]">
      {children}
    </span>
  )
}

const PRIX = Object.fromEntries(FORMULES.map((f) => [f.cle, f.prix]))

export default function ConditionsVente() {
  useTitre('Conditions générales de vente')

  return (
    <PageLegale
      titre="Conditions générales de vente"
      intro={
        <div className="flex flex-col gap-2.5 px-5 py-4 rounded-2xl bg-warn/[0.08] border border-warn/40">
          <p className="text-[0.9375rem] font-extrabold text-ink">Version de travail, pas encore en vigueur.</p>
          <p className="text-sm font-medium leading-relaxed text-soft">
            Le service n’est pas ouvert à la vente&nbsp;: aucun paiement n’est encaissé aujourd’hui. Ce texte est une
            trame, en attente de relecture par un juriste. Les mentions encore manquantes sont signalées en jaune, et
            les présentes ne prendront effet qu’à la publication de leur version définitive, avec sa date d’entrée en
            vigueur.
          </p>
        </div>
      }
    >
      <SectionLegale titre="Article 1 — Identification du vendeur">
        <p>
          Le service est édité par <strong>{EDITEUR.raisonSociale}</strong>, société par actions simplifiée au capital
          de <Trou>[CAPITAL]</Trou> euros, dont le siège social est situé <Trou>[ADRESSE COMPLÈTE]</Trou>, immatriculée
          au registre du commerce et des sociétés de <Trou>[RCS + ville]</Trou> sous le numéro <Trou>[SIREN]</Trou>,
          numéro de TVA intracommunautaire <Trou>[TVA]</Trou>.
        </p>
        <p>
          Directeur de la publication&nbsp;: {EDITEUR.directeurPublication}. Contact&nbsp;:{' '}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
      </SectionLegale>

      <SectionLegale titre="Article 2 — Objet">
        <p>
          Les présentes conditions régissent la vente, à distance et au consommateur, des abonnements donnant accès au
          service Crosswell Pronostics (ci-après «&nbsp;le Service&nbsp;»).
        </p>
        <p>
          Toute souscription vaut acceptation des présentes, dans leur version en vigueur au jour de la commande. Le
          client en reçoit un exemplaire par voie électronique.
        </p>
      </SectionLegale>

      <SectionLegale titre="Article 3 — Description du Service">
        <p>
          Le Service consiste en la publication d’<strong>analyses statistiques</strong> portant sur les courses
          hippiques françaises. Pour chaque partant, un modèle probabiliste estime ses chances de victoire et de place.{' '}
          {RYTHME_PUBLICATION_COURT} Leur taux de réussite constaté est publié après les courses.
        </p>
        <p>
          Le Service est un <strong>contenu éditorial</strong>. Il ne constitue ni&nbsp;:
        </p>
        <ListeLegale
          points={[
            <>
              une activité d’opérateur de jeux d’argent et de hasard&nbsp;: Crosswell ne détient aucun agrément de
              l’Autorité nationale des jeux, n’accepte aucune mise, ne détient aucun fonds de joueur et ne verse aucun
              gain&nbsp;;
            </>,
            <>un conseil en investissement, un conseil financier ou une recommandation personnalisée.</>,
          ]}
        />
        <p>
          <strong>Aucune garantie de résultat n’est donnée.</strong> Une probabilité décrit une fréquence attendue sur
          un grand nombre de courses, et non l’issue d’une course déterminée. Les performances passées ne préjugent pas
          des résultats futurs. Le client reste seul responsable de l’usage qu’il fait des informations publiées.
        </p>
        <p>
          Le Service est réservé aux personnes <strong>majeures</strong>.
        </p>
      </SectionLegale>

      <SectionLegale titre="Article 4 — Compte client">
        <p>
          L’accès aux formules payantes suppose la création d’un compte, à partir d’une adresse électronique valide. Le
          compte est <strong>nominatif</strong>&nbsp;: une adresse, un client. Le partage des identifiants n’est pas
          autorisé.
        </p>
        <p>
          Le client est responsable de la confidentialité de ses identifiants et des opérations réalisées depuis son
          compte.
        </p>
      </SectionLegale>

      <SectionLegale titre="Article 5 — Formules et prix">
        <ListeLegale
          points={[
            <>
              <strong>Gratuit</strong> — {PRIX.gratuit}, sans limite de durée.
            </>,
            <>
              <strong>Pass 1 jour</strong> — {PRIX.jour}, 24 heures, paiement unique, sans reconduction.
            </>,
            <>
              <strong>Pass mensuel</strong> — {PRIX.mois}, un mois, reconduction tacite.
            </>,
            <>
              <strong>Pass annuel</strong> — {PRIX.an}, douze mois, reconduction tacite.
            </>,
          ]}
        />
        <p>
          Les prix sont indiqués <strong>toutes taxes comprises</strong>, en euros, TVA française applicable. Le prix
          applicable est celui affiché au jour de la commande.
        </p>
        <p>
          Crosswell peut modifier ses tarifs à tout moment. Pour les formules à reconduction tacite, tout nouveau tarif
          est notifié au client au moins <Trou>[délai]</Trou> avant sa prise d’effet&nbsp;; le client peut résilier
          avant cette date s’il ne l’accepte pas.
        </p>
      </SectionLegale>

      <SectionLegale titre="Article 6 — Commande et paiement">
        <p>
          Le paiement s’effectue en ligne, par carte bancaire, via le prestataire <strong>Stripe</strong>. Les pages de
          paiement sont hébergées par Stripe&nbsp;: <strong>aucune donnée de carte bancaire ne transite ni n’est
          conservée par Crosswell.</strong>
        </p>
        <p>
          La commande est définitive à réception de la confirmation de paiement transmise par Stripe. Un reçu est
          adressé au client par voie électronique.
        </p>
        <p>
          En cas de refus de paiement, l’accès n’est pas ouvert. En cas d’échec de paiement lors d’une reconduction,
          Crosswell peut suspendre l’accès après <Trou>[délai]</Trou> et après en avoir informé le client.
        </p>
      </SectionLegale>

      <SectionLegale titre="Article 7 — Durée, reconduction et résiliation">
        <p>
          <strong>Pass 1 jour</strong> — accès de 24 heures à compter de la confirmation du paiement. Aucune
          reconduction, aucune action de résiliation nécessaire.
        </p>
        <p>
          <strong>Pass mensuel et Pass annuel</strong> — reconduits tacitement pour une durée identique, sauf
          résiliation. Conformément à l’article L215-1 du code de la consommation, le client est informé par écrit de la
          possibilité de ne pas reconduire, au plus tôt trois mois et au plus tard un mois avant le terme de la période.
        </p>
        <p>
          <strong>Résiliation.</strong> Le client peut résilier à tout moment, <strong>en ligne</strong>, depuis son
          espace client, conformément à l’article L215-1-1 du code de la consommation. La résiliation prend effet{' '}
          <strong>au terme de la période en cours</strong>, déjà payée&nbsp;: l’accès reste ouvert jusque-là. Aucun
          remboursement au prorata n’est dû, sous réserve de l’article 8.
        </p>
        <p>
          Crosswell peut résilier ou suspendre un compte en cas de manquement aux présentes, notamment de partage
          d’identifiants, après mise en demeure restée sans effet pendant <Trou>[délai]</Trou>.
        </p>
      </SectionLegale>

      <SectionLegale titre="Article 8 — Droit de rétractation">
        <p className="text-[0.8125rem] font-bold text-warn">
          Article en attente d’arbitrage juridique&nbsp;: le régime applicable au Pass 1 jour n’est pas tranché.
        </p>
        <p>
          Le client consommateur dispose d’un délai de <strong>quatorze jours</strong> à compter de la souscription pour
          exercer son droit de rétractation, sans motif ni pénalité.
        </p>
        <p>
          Toutefois, lorsque l’accès au Service est ouvert <strong>immédiatement</strong>, à la demande expresse du
          client, celui-ci <strong>renonce à son droit de rétractation</strong> pour la part du service déjà exécutée,
          dans les conditions prévues à l’article L221-28 du code de la consommation. Ce consentement et cette
          renonciation sont recueillis explicitement au moment du paiement, et conservés à titre de preuve.
        </p>
        <p>
          Pour exercer son droit lorsqu’il subsiste, le client écrit à <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. Le
          remboursement intervient dans les quatorze jours suivant la réception de la demande, par le même moyen de
          paiement.
        </p>
      </SectionLegale>

      <SectionLegale titre="Article 9 — Disponibilité">
        <p>
          Crosswell met en œuvre les moyens raisonnables pour assurer la disponibilité du Service, sans garantie d’un
          accès ininterrompu. Le Service peut être suspendu pour maintenance, ou en cas de défaillance d’un prestataire
          technique ou d’une source de données.
        </p>
        <p>
          {RYTHME_PUBLICATION_COURT} Crosswell ne garantit ni l’exhaustivité des courses couvertes, ni la publication
          d’analyses pour une réunion déterminée. L’indisponibilité d’une source de données peut conduire à l’absence de
          publication sur une journée.
        </p>
      </SectionLegale>

      <SectionLegale titre="Article 10 — Propriété intellectuelle">
        <p>
          L’ensemble des éléments du Service — modèle, analyses publiées, textes, interface, marque Crosswell — reste la
          propriété exclusive de {EDITEUR.raisonSociale}.
        </p>
        <p>
          L’abonnement confère un droit d’usage <strong>personnel, non exclusif et non transmissible</strong>. Sont
          interdites la reproduction, la rediffusion, la revente et l’extraction systématique des analyses, notamment
          par tout moyen automatisé.
        </p>
      </SectionLegale>

      <SectionLegale titre="Article 11 — Données personnelles">
        <p>
          Les traitements de données personnelles sont décrits dans la{' '}
          <Link to="/confidentialite">politique de confidentialité</Link>, qui fait partie intégrante des présentes.
        </p>
      </SectionLegale>

      <SectionLegale titre="Article 12 — Responsabilité">
        <p>
          Crosswell est tenue d’une obligation de moyens. Sa responsabilité ne saurait être engagée à raison des
          décisions prises par le client sur la base des analyses publiées, ni des conséquences financières qui en
          résulteraient.
        </p>
        <p>
          Rien dans les présentes ne limite la responsabilité de Crosswell en cas de dol, de faute lourde, ou d’atteinte
          à la vie ou à l’intégrité physique, ni ne prive le consommateur des garanties légales d’ordre public.
        </p>
      </SectionLegale>

      <SectionLegale titre="Article 13 — Réclamations et médiation">
        <p>
          Toute réclamation est adressée à <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. Crosswell s’engage à répondre
          sous <Trou>[délai]</Trou> jours.
        </p>
        <p>
          Conformément à l’article L612-1 du code de la consommation, le client peut recourir gratuitement au médiateur
          de la consommation&nbsp;: <Trou>[MÉDIATEUR — nom, adresse, site]</Trou>.
        </p>
      </SectionLegale>

      <SectionLegale titre="Article 14 — Modification des présentes">
        <p>
          Crosswell peut modifier les présentes. Les clients titulaires d’un abonnement en cours en sont informés par
          voie électronique <Trou>[délai]</Trou> avant l’entrée en vigueur de la nouvelle version, et peuvent résilier
          sans frais s’ils ne l’acceptent pas.
        </p>
      </SectionLegale>

      <SectionLegale titre="Article 15 — Droit applicable">
        <p>
          Les présentes sont soumises au <strong>droit français</strong>. À défaut de résolution amiable, le litige est
          porté devant les juridictions compétentes, le consommateur conservant le droit de saisir la juridiction du
          lieu de son domicile.
        </p>
        <p>
          Entrée en vigueur&nbsp;: <Trou>[DATE]</Trou>.
        </p>
      </SectionLegale>
    </PageLegale>
  )
}
