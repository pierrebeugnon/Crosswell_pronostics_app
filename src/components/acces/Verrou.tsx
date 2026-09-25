import { Link } from 'react-router-dom'
import type { Course } from '@/types'
import { PASS_MOINS_CHER } from '@/config/formules'
import { hippodrome as formatHippodrome } from '@/lib/format'
import { lienCourse } from '@/lib/programme'

/**
 * LA FORMULE GRATUITE À L'ÉCRAN — `design/screens/MainFree.dc.html` : le
 * bandeau « Formule gratuite », la carte « Débloquez ce pronostic », les
 * étiquettes « Avec un Pass » et « Offert ». C'est la base qui masque les
 * pronostics (`db/007`) ; ces composants ne font que le dire.
 */

/** Le choix de la formule, dans l'inscription (un client connecté y arrive directement). */
export const LIEN_PASS = '/inscription?etape=formule&formule=mois'

/** Le cadenas de la maquette. */
export function Cadenas({ taille = 14, className = '' }: { taille?: number; className?: string }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" aria-hidden className={`shrink-0 ${className}`}>
      <path d="M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Le bandeau de la formule Gratuit. Il NOMME la course offerte quand on la
 * connaît : « 1 pronostic offert par jour » laissait chercher laquelle, alors
 * que la règle la désigne dès le matin (`db/009`, la plus belle du jour).
 */
export function BandeauGratuit({ className = '', offerte = null }: { className?: string; offerte?: Course | null }) {
  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl bg-accent/[0.08] border border-accent/35 ${className}`}>
      <span className="flex flex-col gap-0.5 min-w-0">
        <span className="text-[0.8125rem] font-extrabold">Formule gratuite</span>
        {offerte ? (
          <Link to={lienCourse(offerte)} className="text-xs font-medium text-muted truncate hover:text-ink">
            Offert aujourd’hui&nbsp;:{' '}
            <span className="num font-bold text-accent">
              C{offerte.numero} {formatHippodrome(offerte.hippodrome)}
              {offerte.heureDepart ? ` · ${offerte.heureDepart}` : ''}
            </span>
          </Link>
        ) : (
          <span className="text-xs font-medium text-muted">1 pronostic offert par jour</span>
        )}
      </span>
      <Link to={LIEN_PASS} className="shrink-0 h-10 px-3.5 rounded-full bg-accent text-accent-ink flex items-center text-[0.8125rem] font-bold hover:bg-accent-hover">
        Voir les Pass
      </Link>
    </div>
  )
}

/** « Avec un Pass », à la place du favori sur une course verrouillée. */
export function AvecUnPass({ className = '' }: { className?: string }) {
  return (
    <span className={`flex items-center gap-1.5 text-xs font-bold text-muted ${className}`}>
      <Cadenas />
      Avec un Pass
    </span>
  )
}

export function Offert() {
  return (
    <span className="shrink-0 text-[0.625rem] font-extrabold uppercase tracking-[0.08em] text-accent-ink bg-accent rounded-full px-[7px] py-0.5">
      Offert
    </span>
  )
}

/** La carte qui remplace le pronostic d'une course verrouillée (ou une page réservée aux Pass). */
export function CartePass({
  offerte = null,
  titre = 'Débloquez ce pronostic avec un Pass',
  texte,
}: {
  offerte?: Course | null
  titre?: string
  texte?: string
}) {
  return (
    <section
      aria-label="Pronostic réservé aux détenteurs d’un Pass"
      className="w-full max-w-[32.5rem] self-center flex flex-col items-center gap-3.5 px-6 py-8 lg:px-10 lg:py-9 rounded-3xl lg:rounded-[1.5rem] bg-surface border border-accent text-center"
    >
      <span className="w-14 h-14 rounded-full bg-accent/[0.12] grid place-items-center text-accent">
        <Cadenas taille={26} />
      </span>
      <h2 className="text-[1.25rem] lg:text-[1.3125rem] font-extrabold tracking-[-0.02em]">{titre}</h2>
      <p className="text-sm font-medium leading-relaxed text-muted">
        {texte ??
          `Arrivée prédite, pourcentages et écarts au marché pour toutes les courses du jour et du lendemain. Dès ${PASS_MOINS_CHER.prix} avec le ${PASS_MOINS_CHER.nom}, sans abonnement.`}
      </p>
      <Link to={LIEN_PASS} className="btn-accent !h-[3.25rem] !text-[0.9375rem] w-full">
        Voir les Pass
      </Link>
      {offerte && (
        <Link
          to={lienCourse(offerte)}
          className="w-full min-h-12 px-4 py-2 rounded-full border border-line-strong flex items-center justify-center text-sm font-bold hover:border-line-hover"
        >
          <span>
            {/* Une course offerte déjà courue reste ouverte — mais l'annoncer
                comme un pronostic à venir ferait une promesse fausse. */}
            {offerte.courue ? 'Voir le pronostic offert du jour, déjà couru' : 'Voir mon pronostic offert'} ·{' '}
            <span className="num text-accent">
              C{offerte.numero}
              {offerte.nom ? ` · ${offerte.nom}` : ''}
              {offerte.heureDepart ? ` · ${offerte.heureDepart}` : ''}
            </span>
          </span>
        </Link>
      )}
    </section>
  )
}
