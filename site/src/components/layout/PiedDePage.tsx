import { Link } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { LienEntree } from '@/components/layout/EnTete'
import { ENTREES, LEGAL, type Entree } from '@/components/layout/Navigation'
import { AVERTISSEMENT, EDITEUR } from '@/config/site'

function Colonne({ titre, entrees }: { titre: string; entrees: readonly Entree[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-[0.6875rem] font-bold uppercase tracking-[0.12em] text-faint">{titre}</span>
      {entrees.map((e) => (
        <LienEntree
          key={e.libelle}
          entree={e}
          className="self-start min-h-6 text-sm font-semibold text-soft hover:text-accent transition-colors"
        />
      ))}
    </div>
  )
}

/**
 * LE PIED DE PAGE — celui des maquettes, sans ce qui relève du pari : pas de
 * « Nous ne prenons aucun pari », pas de message « jeux d'argent » ni de page
 * « Jeu responsable » (positionnement strict, confirmé le 18/09/2026). À leur
 * place, notre mention unique (`AVERTISSEMENT`) dans l'encart de mise en garde.
 * Pas de lien « Conditions générales » : elles ne sont pas encore rédigées.
 */
export function PiedDePage() {
  return (
    <footer className="flex flex-col gap-7 px-5 lg:px-10 pt-8 lg:pt-12 pb-10 lg:pb-14 border-t border-sep">
      <div className="flex flex-col lg:flex-row lg:justify-between gap-7 lg:gap-10">
        <div className="flex flex-col gap-3 lg:max-w-[23.75rem]">
          <Link to="/" aria-label="Crosswell Pronostics, accueil" className="self-start">
            <Logo />
          </Link>
          <p className="text-[0.8125rem] font-medium leading-relaxed text-faint">
            Crosswell Pronostics publie des probabilités sur les courses hippiques françaises, et ce
            qu’elles valent une fois les courses courues.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-6 lg:flex lg:gap-[4.5rem]">
          <Colonne titre="Produit" entrees={ENTREES} />
          <Colonne titre="Légal" entrees={LEGAL} />
        </div>
      </div>
      <div
        role="note"
        aria-label="Mise en garde"
        className="flex items-start gap-3 px-[1.125rem] py-3.5 rounded-xl bg-surface border border-line"
      >
        <span className="shrink-0 h-6 px-[7px] rounded-[6px] bg-ink text-accent-ink flex items-center text-[0.6875rem] font-extrabold">
          {AVERTISSEMENT.ageMinimum}+
        </span>
        <span className="text-xs font-medium leading-relaxed text-muted">
          {AVERTISSEMENT.texte} Service réservé aux personnes majeures ({AVERTISSEMENT.ageMinimum}&nbsp;ans et
          plus).
        </span>
      </div>
      <span className="text-xs font-medium text-faint">
        © {new Date().getFullYear()} {EDITEUR.raisonSociale} · Tous droits réservés
      </span>
    </footer>
  )
}
