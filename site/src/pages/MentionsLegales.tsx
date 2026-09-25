import { Link } from 'react-router-dom'
import { PageLegale, SectionLegale } from '@/components/legal/PageLegale'
import { AVERTISSEMENT, CONTACT, EDITEUR } from '@/config/site'
import { useTitre } from '@/lib/useTitre'

/**
 * Mentions légales. Les identifiants que nous ne connaissons pas (RCS, SIRET,
 * TVA) sont dits manquants plutôt qu'inventés : `EDITEUR` dans config/site.ts
 * est l'endroit où les renseigner.
 */
export default function MentionsLegales() {
  useTitre('Mentions légales')

  return (
    <PageLegale titre="Mentions légales">
      <SectionLegale titre="Éditeur">
        <p>
          <strong>{EDITEUR.raisonSociale}</strong>, {EDITEUR.formeJuridique} au capital de {EDITEUR.capital}, siège
          social&nbsp;: {EDITEUR.siege}. Contact&nbsp;: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>
        <p>
          {EDITEUR.rcs} — SIRET {EDITEUR.siret} — TVA intracommunautaire {EDITEUR.tva}.
        </p>
      </SectionLegale>

      <SectionLegale titre="Directeur de la publication">
        <p>{EDITEUR.directeurPublication}</p>
      </SectionLegale>

      <SectionLegale titre="Hébergement">
        <p>
          <strong>{EDITEUR.hebergeur.nom}</strong>, {EDITEUR.hebergeur.adresse} —{' '}
          <a href={EDITEUR.hebergeur.site} rel="noopener noreferrer">
            {EDITEUR.hebergeur.site.replace('https://', '')}
          </a>
          .
        </p>
      </SectionLegale>

      <SectionLegale titre="Activité">
        <p>
          Crosswell publie des <strong>analyses statistiques</strong> sur les courses hippiques françaises&nbsp;: des
          probabilités mesurées, accompagnées de leur historique de réussite. Ce n’est ni un opérateur de jeux, ni un
          service de conseil. Nous ne recevons aucune somme liée à l’issue des courses, ne recommandons aucune action
          et ne faisons aucune promesse de résultat.
        </p>
        <p className="text-[0.8125rem] text-faint">
          {AVERTISSEMENT.texte} Service réservé aux personnes majeures ({AVERTISSEMENT.ageMinimum}&nbsp;ans et plus).
        </p>
      </SectionLegale>

      <SectionLegale titre="Propriété intellectuelle">
        <p>
          Les textes, le monogramme, la marque Crosswell et la composition de ce site sont la propriété de{' '}
          {EDITEUR.raisonSociale}. Toute reproduction ou réutilisation sans accord écrit préalable est interdite. Les
          chevaux, courses et chiffres des exemples de pronostic sont fictifs.
        </p>
      </SectionLegale>

      <SectionLegale titre="Données personnelles et cookies">
        <p>
          Ce site ne dépose aucun cookie, n’embarque aucun outil de mesure d’audience et ne comporte aucun formulaire.
          Le détail figure dans notre <Link to="/confidentialite">politique de confidentialité</Link>.
        </p>
      </SectionLegale>

      <SectionLegale titre="Droit applicable">
        <p>
          Les présentes mentions sont régies par le droit français. En cas de litige, et à défaut d’accord amiable, les
          tribunaux français sont seuls compétents.
        </p>
      </SectionLegale>
    </PageLegale>
  )
}
