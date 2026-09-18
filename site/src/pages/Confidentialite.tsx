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
          Ce site est une vitrine statique. Il <strong>ne collecte aucune donnée</strong>&nbsp;: pas de formulaire, pas
          de compte, pas de cookie, pas d’outil de mesure d’audience. Les polices de caractères sont chargées depuis
          Google Fonts, qui reçoit à cette occasion l’adresse IP de votre navigateur, comme pour toute ressource
          distante.
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
          rectification, d’opposition et de suppression des données qui vous concernent. Pour l’exercer, ou pour{' '}
          <strong>supprimer votre compte</strong>, écrivez à{' '}
          <a href={`mailto:${CONTACT}?subject=${encodeURIComponent('Mes données personnelles')}`}>{CONTACT}</a>. La
          demande est traitée manuellement, et la suppression est définitive. Vous pouvez aussi adresser une
          réclamation à la CNIL.
        </p>
      </SectionLegale>
    </PageLegale>
  )
}
