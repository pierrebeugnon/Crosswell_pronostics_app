import { Navigate, useParams } from 'react-router-dom'
import { Calendrier } from '@/components/resultats/Calendrier'
import { ListeJournee } from '@/components/resultats/LigneCourse'
import { Fictif } from '@/components/ui/Fictif'
import { URL_CONNEXION, URL_INSCRIPTION } from '@/config/site'
import { jourLong } from '@/lib/format'
import { compterJournee, type JourneePublique } from '@/lib/resultats'
import { JOUR_EXEMPLE, MAINTENANT_EXEMPLE, journeeExemple } from '@/lib/exemple-resultats'
import { useTitre } from '@/lib/useTitre'

/**
 * LES RÉSULTATS D'UNE JOURNÉE — `/resultats` et `/resultats/AAAA-MM-JJ`.
 *
 * LOT 1 : la page est montée sur un JEU D'EXEMPLE, et la route est
 * volontairement ABSENTE de la table `PAGES` de `scripts/apres-build.mjs`. Elle
 * n'a donc ni fichier HTML, ni canonique, ni entrée au sitemap, et répond 404
 * en production. On la regarde par `npm run dev`, le temps de valider les
 * écrans ; la source réelle et le rendu serveur viennent ensuite.
 *
 * La page ne lit JAMAIS l'horloge : l'instant arrive en paramètre. C'est ce qui
 * permettra de la rendre côté serveur sans qu'un rendu et l'autre divergent.
 *
 * Ce qu'on ne reprend pas de la maquette, et pourquoi : le bloc « Transparence »
 * et ses quatre chiffres (inventés, tirés d'un générateur à graine fixe, et
 * présentés sous le mot « Mesuré »), les pastilles « par hippodrome » (elles
 * renvoyaient sur la page elle-même) et les archives mensuelles (le modèle servi
 * n'a qu'une trentaine de journées d'historique). À leur place, un renvoi vers
 * la mesure complète, qui existe et qui est honnête.
 */

function Resume({ journee }: { journee: JourneePublique }) {
  const c = compterJournee(journee, MAINTENANT_EXEMPLE)
  const bouts = [
    c.terminees > 0 ? `${c.terminees} course${c.terminees > 1 ? 's' : ''} terminée${c.terminees > 1 ? 's' : ''}` : null,
    c.departDonne > 0 ? `${c.departDonne} départ${c.departDonne > 1 ? 's' : ''} donné${c.departDonne > 1 ? 's' : ''}` : null,
    c.aVenir > 0 ? `${c.aVenir} à venir` : null,
    c.nonRelevees > 0 ? `${c.nonRelevees} non relevée${c.nonRelevees > 1 ? 's' : ''}` : null,
  ].filter(Boolean)

  return <p className="text-[0.9375rem] font-medium text-muted">{bouts.join(' · ') || 'Aucune course ce jour-là.'}</p>
}

/** Le bandeau d'appel, quand il reste des courses dont le pronostic est ouvert. */
function Bandeau({ nombre }: { nombre: number }) {
  if (nombre === 0) return null
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 rounded-2xl bg-surface border border-line">
      <span className="text-[0.9375rem] font-semibold">
        {nombre} course{nombre > 1 ? 's' : ''} à venir aujourd’hui
      </span>
      <span className="flex gap-2.5 shrink-0">
        <a
          href={URL_INSCRIPTION}
          rel="noopener noreferrer"
          className="h-11 px-5 rounded-full bg-accent text-accent-ink flex items-center text-[0.875rem] font-bold hover:bg-accent-hover transition-colors"
        >
          Essayer gratuitement
        </a>
        <a
          href={URL_CONNEXION}
          rel="noopener noreferrer"
          className="h-11 px-5 rounded-full border border-line-strong flex items-center text-[0.875rem] font-bold hover:border-line-hover transition-colors"
        >
          Se connecter
        </a>
      </span>
    </div>
  )
}

export default function Resultats() {
  const { jour } = useParams()
  const demande = jour ?? JOUR_EXEMPLE
  const journee = journeeExemple(demande)

  useTitre(journee ? `Résultats du ${jourLong(journee.jour)}` : 'Résultats')

  // Une date sans donnée n'est pas une page vide : c'est une page qui n'existe
  // pas. En production, ce sera un vrai 404 ; ici, on revient au jour servi.
  if (!journee) return <Navigate to="/resultats" replace />

  const aVenir = compterJournee(journee, MAINTENANT_EXEMPLE).aVenir

  return (
    <div className="w-full max-w-[75rem] mx-auto px-5 lg:px-10 pt-7 lg:pt-12 pb-14 lg:pb-24 flex flex-col gap-7 lg:gap-9">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="flex flex-col gap-3">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Résultats des courses</span>
          <h1 className="text-[1.75rem] lg:text-[2.3125rem] font-extrabold tracking-[-0.03em] leading-[1.05] first-letter:uppercase">
            Courses du {jourLong(journee.jour)}
          </h1>
          <Resume journee={journee} />
        </div>
        <Calendrier jourCourant={journee.jour} aujourdhui={MAINTENANT_EXEMPLE.jour} />
      </div>

      <Bandeau nombre={aVenir} />

      <ListeJournee courses={journee.courses} maintenant={MAINTENANT_EXEMPLE} />

      <Fictif />

      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-[1.375rem] py-6 lg:px-10 lg:py-8 rounded-3xl bg-surface border border-line">
        <div className="flex flex-col gap-2 max-w-[38rem]">
          <h2 className="text-[1.1875rem] lg:text-[1.4375rem] font-extrabold tracking-[-0.02em]">
            Nos résultats, mesurés
          </h2>
          <p className="text-[0.9375rem] font-medium leading-relaxed text-muted">
            Comptés sur toutes les courses publiées, sans en écarter aucune, et affichés avec leur effectif. Le détail,
            filtre par filtre, est dans l’application.
          </p>
        </div>
        <a
          href={URL_INSCRIPTION}
          rel="noopener noreferrer"
          className="shrink-0 h-[3.25rem] px-[1.625rem] rounded-full border border-line-strong flex items-center justify-center text-[0.9375rem] font-bold hover:border-line-hover transition-colors"
        >
          Le détail, filtre par filtre
        </a>
      </section>
    </div>
  )
}
