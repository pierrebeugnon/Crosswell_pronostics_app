import { Link } from 'react-router-dom'
import { ListeLegale, PageLegale, SectionLegale } from '@/components/legal/PageLegale'
import { CONTACT, EDITEUR, FORMULES, RYTHME_PUBLICATION_COURT } from '@/config/site'
import { useTitre } from '@/lib/useTitre'

/**
 * CONDITIONS GÉNÉRALES DE VENTE — transcription de `docs/cgv-brouillon.md`
 * (rédigé le 20/09/2026), publiée le 25/09/2026 à la demande du fondateur.
 *
 * POURQUOI CETTE PAGE A ÉTÉ PUBLIÉE AVANT D'ÊTRE PARFAITE. La case « J'accepte
 * les conditions générales », OBLIGATOIRE à l'inscription, pointait vers
 * `/cgu` — une page qui n'existait pas : un vrai 404. Faire cocher une case qui
 * renvoie au vide est pire que publier un texte qui dit franchement ce qu'il
 * est. Les mentions manquantes ont d'abord été laissées VISIBLES plutôt que
 * comblées au jugé ; elles sont comblées depuis le 03/10 (voir ci-dessous).
 *
 * L'IDENTITÉ DE LA SOCIÉTÉ est renseignée depuis le 25/09/2026 (registre
 * national des entreprises, via `EDITEUR` dans config/site.ts) : dénomination,
 * forme, capital, siège, SIREN, SIRET, TVA.
 *
 * COMPLÉTÉES ET DATÉES LE 03/10/2026, à la demande du fondateur : les cinq
 * délais laissés ouverts portent désormais des valeurs usuelles (30 jours pour
 * un changement de tarif ou des présentes, 7 jours avant suspension sur impayé,
 * 15 jours de mise en demeure, 15 jours pour répondre à une réclamation), la
 * suppression de compte est décrite telle que le produit la fait (effet
 * immédiat, sans remboursement — décision du 25/09), et la clause de prix ne
 * promet plus « la TVA française » alors que Stripe Tax calcule selon le pays.
 *
 * DEUX CHOSES NE SE RÉDIGENT PAS :
 * - LE MÉDIATEUR de la consommation. L'adhésion est une démarche, pas une
 *   phrase. L'article 13 disait « aucune vente n'est conclue avant cette
 *   publication » ; le fondateur a demandé le 03/10 de retirer cet engagement,
 *   pour que le contrat ne se contredise pas le jour où les ventes ouvrent.
 *   ⚠️ CELA NE LÈVE PAS L'OBLIGATION : l'adhésion à un médiateur reste imposée
 *   par l'article L612-1 à tout professionnel vendant à des consommateurs, et
 *   son absence est sanctionnable même si les CGV n'en parlent plus. Le texte
 *   ne ment simplement plus ; le risque, lui, est assumé et reste à traiter.
 * - LA RELECTURE PAR UN JURISTE, et en particulier le régime de rétractation
 *   du Pass 1 jour (article 8), qui reste le point ouvert le plus sérieux.
 *   Voir les six questions de `docs/cgv-brouillon.md`.
 *
 * DEUX ÉCARTS ASSUMÉS AU BROUILLON, pour ne pas publier une promesse fausse :
 * les articles 3 et 9 y annoncent des analyses publiées « la veille de la
 * course » et « chaque soir ». Le calcul de la veille a été ABANDONNÉ le
 * 20/09 ; la page reprend donc `RYTHME_PUBLICATION_COURT`, comme le reste du
 * site. À reporter dans le brouillon lors de la relecture juridique.
 */

const PRIX = Object.fromEntries(FORMULES.map((f) => [f.cle, f.prix]))

export default function ConditionsVente() {
  useTitre('Conditions générales de vente')

  return (
    <PageLegale
      titre="Conditions générales de vente"
      intro={
        <p className="text-sm font-medium leading-relaxed text-muted">
          En vigueur depuis le <strong className="text-ink">3 octobre 2026</strong>. Elles s’appliquent à toute
          souscription postérieure à cette date. L’adhésion à un médiateur de la consommation est en cours&nbsp;:
          voir l’article&nbsp;13.
        </p>
      }
    >
      <SectionLegale titre="Article 1 — Identification du vendeur">
        <p>
          Le service est édité par <strong>{EDITEUR.raisonSociale}</strong>, {EDITEUR.formeJuridique} au capital de{' '}
          {EDITEUR.capital}, dont le siège social est situé {EDITEUR.siege}, immatriculée au registre du commerce et des
          sociétés de Paris sous le numéro {EDITEUR.siren} (SIRET {EDITEUR.siret}), numéro de TVA intracommunautaire{' '}
          {EDITEUR.tva}.
        </p>
        <p>
          Directeur de la publication&nbsp;: {EDITEUR.directeurPublication}. Contact&nbsp;:{' '}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
      </SectionLegale>

      <SectionLegale titre="Article 2 — Objet">
        <p>
          Les présentes conditions régissent la vente, à distance et au consommateur, des formules payantes donnant
          accès au service Crosswell Pronostics (ci-après «&nbsp;le Service&nbsp;»)&nbsp;: le Pass 1 jour, vendu en
          paiement unique, ainsi que les Pass mensuel et annuel, vendus par abonnement.
        </p>
        <p>
          Toute souscription vaut acceptation des présentes, dans leur version en vigueur au jour de la commande. Elles
          sont accessibles à tout moment sur cette page, où le client peut les enregistrer ou les imprimer.
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
              <strong>Gratuit</strong> — {PRIX.gratuit}, sans limite de durée. Elle donne accès, chaque jour, au
              pronostic complet d’<strong>une course offerte</strong> — celle qui réunit le plus grand nombre de
              chevaux déclarés —, au programme des courses du jour et du lendemain sans les probabilités, et à
              l’ensemble des courses déjà courues ainsi qu’aux taux de réussite publiés.
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
          Les prix sont indiqués <strong>toutes taxes comprises</strong>, en euros. Le prix applicable est celui
          affiché au jour de la commande&nbsp;; il ne varie pas selon le lieu de résidence du client. La taxe sur la
          valeur ajoutée est comprise dans ce montant et son détail figure sur la facture, qui est adressée au client
          par voie électronique.
        </p>
        <p>
          Crosswell peut modifier ses tarifs à tout moment. Pour les formules à reconduction tacite, tout nouveau tarif
          est notifié au client au moins <strong>trente&nbsp;jours</strong> avant sa prise d’effet&nbsp;; le client peut résilier
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
          La commande est définitive à réception de la confirmation de paiement transmise par Stripe. La facture
          correspondante est <strong>mise à disposition du client</strong> dans l’espace de gestion accessible depuis
          «&nbsp;Mon compte&nbsp;», où il peut la consulter et la télécharger à tout moment.
        </p>
        <p>
          En cas de refus de paiement, l’accès n’est pas ouvert. En cas d’échec de paiement lors d’une reconduction,
          <strong> l’accès est suspendu dès que le défaut de paiement est constaté</strong>, sans période de grâce. Le
          client en est informé dans son compte, et peut rétablir son accès en mettant son moyen de paiement à jour
          depuis l’espace de gestion. <strong>L’accès est également suspendu si le client conteste un paiement</strong>
          auprès de sa banque, jusqu’à l’issue de la contestation.
        </p>
      </SectionLegale>

      <SectionLegale titre="Article 7 — Durée, reconduction et résiliation">
        <p>
          <strong>Pass 1 jour</strong> — accès de 24 heures à compter de la confirmation du paiement. Aucune
          reconduction, aucune action de résiliation nécessaire. Si un Pass 1 jour est déjà en cours, un nouvel achat
          <strong> prolonge l’accès de 24 heures supplémentaires</strong> à compter de son terme. Un Pass 1 jour ne peut
          être souscrit par-dessus un abonnement en cours, ni par un client bénéficiant déjà d’un accès gratuit accordé
          par Crosswell&nbsp;: dans ce dernier cas, l’accès déjà ouvert est conservé et le paiement est remboursé sur
          demande à <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
        <p>
          <strong>Pass mensuel et Pass annuel</strong> — reconduits tacitement pour une durée identique, sauf
          résiliation. La date de la prochaine reconduction et son montant sont indiqués au client dans
          «&nbsp;Mon compte&nbsp;», et il peut résilier à tout moment, sans préavis ni frais, depuis cet écran.
        </p>
        <p>
          <strong>Résiliation.</strong> Le client peut résilier à tout moment, <strong>en ligne</strong>, depuis son
          espace client, conformément à l’article L215-1-1 du code de la consommation. La résiliation prend effet{' '}
          <strong>au terme de la période en cours</strong>, déjà payée&nbsp;: l’accès reste ouvert jusque-là. Aucun
          remboursement au prorata n’est dû, sous réserve de l’article 8.
        </p>
        <p>
          Crosswell peut résilier ou suspendre un compte en cas de manquement aux présentes, notamment de partage
          d’identifiants, après mise en demeure restée sans effet pendant <strong>quinze&nbsp;jours</strong>.
        </p>
        <p>
          <strong>Suppression du compte.</strong> Le client peut supprimer son compte à tout moment depuis son espace
          client. La suppression vaut résiliation <strong>à effet immédiat</strong>&nbsp;: l’abonnement en cours est
          arrêté et l’accès cesse aussitôt, sans remboursement de la période déjà payée. Pour conserver l’accès
          jusqu’au terme de la période en cours, il convient de résilier plutôt que de supprimer. Les factures et les
          preuves de paiement sont conservées, comme l’impose la loi&nbsp;; le détail figure dans la{' '}
          <Link to="/confidentialite">politique de confidentialité</Link>.
        </p>
      </SectionLegale>

      <SectionLegale titre="Article 8 — Droit de rétractation">
        <p className="text-[0.8125rem] font-bold text-warn">
          Article en attente d’arbitrage juridique&nbsp;: le régime applicable au Pass 1 jour n’est pas tranché.
        </p>
        <p>
          Le client consommateur dispose d’un délai de <strong>quatorze jours</strong> à compter de la souscription pour
          exercer son droit de rétractation, sans motif ni pénalité. L’accès au Service étant ouvert immédiatement, à la
          demande expresse du client, ce principe connaît deux régimes distincts, selon la formule — et c’est
          exactement ce que le client accepte, case à cocher à l’appui, au moment du paiement&nbsp;:
        </p>
        <ListeLegale
          points={[
            <>
              <strong>Pass 1 jour.</strong> Le client demande l’accès dès le paiement et{' '}
              <strong>renonce expressément à son droit de rétractation</strong>, qu’il perd une fois le pass pleinement
              exécuté, au bout de vingt-quatre heures (article L221-28, 1° du code de la consommation).
            </>,
            <>
              <strong>Pass mensuel et Pass annuel.</strong> Le client demande que son accès commence dès le paiement et{' '}
              <strong>conserve son droit de rétractation</strong> pendant quatorze jours. S’il l’exerce, il doit payer
              la part de l’accès déjà fournie, calculée au prorata du temps écoulé (article L221-25)&nbsp;; le solde lui
              est remboursé.
            </>,
          ]}
        />
        <p>
          La formulation exacte acceptée par le client est conservée par Crosswell à titre de preuve, avec la date, le
          montant et la formule concernée.
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
          sous <strong>quinze&nbsp;jours</strong>.
        </p>
        <p>
          Conformément aux articles L612-1 et suivants du code de la consommation, le client consommateur peut recourir
          gratuitement à un médiateur de la consommation en vue de la résolution amiable d’un litige qui l’oppose à
          Crosswell, après avoir tenté de le résoudre directement par une réclamation écrite.
        </p>
        <p className="text-[0.8125rem] text-warn">
          L’adhésion de Crosswell à un médiateur de la consommation est en cours. Ses coordonnées seront publiées sur
          cette page dès qu’elle sera effective, et communiquées entre-temps sur simple demande à{' '}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. Dans l’attente, toute réclamation est traitée directement par
          Crosswell, dans le délai indiqué ci-dessus, et ce recours ne prive le client d’aucun de ses droits.
        </p>
      </SectionLegale>

      <SectionLegale titre="Article 14 — Modification des présentes">
        <p>
          Crosswell peut modifier les présentes. Les clients titulaires d’un abonnement en cours en sont informés par
          voie électronique <strong>trente&nbsp;jours</strong> avant l’entrée en vigueur de la nouvelle version, et peuvent résilier
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
          Entrée en vigueur&nbsp;: <strong>3 octobre 2026</strong>.
        </p>
      </SectionLegale>
    </PageLegale>
  )
}
