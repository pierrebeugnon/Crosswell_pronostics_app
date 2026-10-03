import { ListeLegale, PageLegale, SectionLegale } from '@/components/legal/PageLegale'
import { CONTACT, EDITEUR } from '@/config/site'
import { useTitre } from '@/lib/useTitre'

/**
 * Politique de confidentialité — courte, parce qu'il y a peu à dire : le site
 * ne collecte rien, et l'application ne conserve que l'adresse de connexion et
 * le prénom. Dire moins serait mentir par omission ; dire plus inventerait un
 * traitement qui n'existe pas (la maquette cite une date de naissance, un
 * prestataire de paiement et des alertes : rien de cela n'existe aujourd'hui).
 */
export default function Confidentialite() {
  useTitre('Confidentialité')

  return (
    <PageLegale
      titre="Politique de confidentialité"
      intro="Ce que nous savons de vous, pourquoi, et comment le faire effacer. La liste est courte, et c’est voulu."
    >
      <SectionLegale titre="Sur ce site">
        <p>
          Ce site est une vitrine statique&nbsp;: pas de formulaire, pas de compte, <strong>pas de cookie</strong>. Les
          polices de caractères sont chargées depuis Google Fonts, qui reçoit à cette occasion l’adresse IP de votre
          navigateur, comme pour toute ressource distante.
        </p>
        <p>
          Nous utilisons la <strong>mesure d’audience de Vercel</strong>, notre hébergeur, sur ce site comme dans
          l’application. Elle compte les pages vues et les visites, et nous rend des <strong>totaux</strong>&nbsp;:
          combien de personnes sont venues, par quelles pages, depuis quel pays et quel type d’appareil. Elle
          n’utilise <strong>aucun cookie</strong>, ne pose aucun identifiant durable sur votre appareil, ne vous suit
          pas d’un site à l’autre, et ne permet pas de vous reconnaître. Rien n’est rattaché à votre compte&nbsp;:
          l’application ne transmet ni votre identifiant, ni votre adresse, ni votre formule.
        </p>
        <p>
          L’hébergeur, {EDITEUR.hebergeur.nom}, tient des journaux techniques de connexion (adresse IP, page demandée,
          horodatage) pour la sécurité et le bon fonctionnement du service, pendant une durée limitée.
        </p>
      </SectionLegale>

      <SectionLegale titre="Quand vous nous écrivez">
        <p>
          Écrire à <a href={`mailto:${CONTACT}`}>{CONTACT}</a> nous transmet votre adresse et le contenu de votre
          message. Nous les utilisons pour vous répondre, ouvrir un accès si vous le demandez, et rien d’autre. Ils ne
          sont ni cédés ni revendus.
        </p>
      </SectionLegale>

      <SectionLegale titre="Dans l’application">
        <ListeLegale
          points={[
            <>
              L’accès est nominatif. Nous conservons votre <strong>adresse de connexion</strong> et le prénom que vous
              choisissez d’afficher.
            </>,
            'Le mot de passe est stocké sous forme chiffrée par notre prestataire d’authentification et ne nous est jamais lisible.',
            'Aucune donnée de navigation revendue, aucun profil publicitaire.',
          ]}
        />
      </SectionLegale>

      <SectionLegale titre="Vos droits">
        <p>
          Conformément au règlement général sur la protection des données, vous disposez d’un droit d’accès, de
          rectification, d’opposition et de suppression des données qui vous concernent. La{' '}
          <strong>suppression de votre compte</strong> se fait en ligne, depuis « Mon compte » dans l’application.
          Elle arrête immédiatement l’abonnement en cours, efface votre adresse de connexion et votre prénom, et
          supprime votre fiche client chez Stripe, notre prestataire de paiement.
        </p>
        <p>
          Deux choses lui survivent, parce que la loi nous oblige à les conserver. Les <strong>factures</strong> et les
          preuves de paiement, gardées <strong>dix ans</strong> (article L123-22 du code de commerce) chez Stripe, qui
          les émet. Et la preuve de votre demande d’accès immédiat au service, gardée avec l’adresse utilisée pour
          payer (article L221-28 du code de la consommation). C’est l’exception prévue par l’article 17, paragraphe 3,
          du règlement&nbsp;: l’obligation légale.
        </p>
        <p>
          Nous gardons aussi une <strong>trace technique de la suppression elle-même</strong>&nbsp;: la date, et les
          identifiants internes de votre compte et de votre abonnement chez Stripe — sans votre adresse, sans votre
          prénom, sans aucune donnée de paiement. Elle sert à prouver que l’abonnement a bien été arrêté, et à le
          retrouver si l’opération s’interrompt en chemin. Elle est conservée aussi longtemps que les factures
          auxquelles elle se rattache.
        </p>
        <p>
          Pour toute autre demande, écrivez à{' '}
          <a href={`mailto:${CONTACT}?subject=${encodeURIComponent('Mes données personnelles')}`}>{CONTACT}</a>. Vous
          pouvez aussi adresser une réclamation à la CNIL.
        </p>
      </SectionLegale>
    </PageLegale>
  )
}
