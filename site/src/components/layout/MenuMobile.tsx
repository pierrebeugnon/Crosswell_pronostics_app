import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LEGAL, MENU_MOBILE, type Entree } from '@/components/layout/Navigation'
import { AVERTISSEMENT, FORMULES, URL_CONNEXION, URL_INSCRIPTION } from '@/config/site'

/**
 * LE MENU DE TÉLÉPHONE — `design/screens/MenuMobile`.
 *
 * Il répare un vrai trou : sur téléphone, l'en-tête ne portait que le logo, la
 * pastille « 18+ » et « Connexion ». « Comment ça marche », le blog, les tarifs
 * et les pages légales n'étaient atteignables que depuis l'accueil ou le pied de
 * page — autrement dit, pas du tout depuis une page d'article.
 *
 * TROIS ÉTATS, pas deux. Un simple booléen suffit à ouvrir le tiroir, pas à le
 * fermer : il faut que le panneau finisse de glisser AVANT de quitter l'arbre,
 * sinon il disparaît d'un coup. D'où `fermeture`, un état de sortie que
 * `animationend` termine. C'est aussi ce qui rend le composant indifférent à
 * `prefers-reduced-motion` : l'animation y dure 0,01 ms, l'événement arrive
 * quand même, et il n'y a aucun cas particulier à écrire.
 *
 * Les images d'animation sont dans le bloc « SITE » de `index.css` — la
 * configuration Tailwind du site est une copie conforme de celle de l'app, et
 * ce menu n'existe pas dans l'app.
 */

type Etat = 'ferme' | 'ouvert' | 'fermeture'

function Chevron() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden className="shrink-0 text-dim">
      <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * Le bouton qui ouvre le menu : trois barres qui deviennent une croix. Les
 * barres sont des `<span>` positionnés, pas deux icônes qu'on échange — c'est
 * ce qui permet au trait du haut et à celui du bas de pivoter l'un vers l'autre
 * au lieu de se remplacer.
 */
function Bouton({ ouvert, onClick, id, controle }: { ouvert: boolean; onClick: () => void; id: string; controle: string }) {
  return (
    <button
      type="button"
      id={id}
      onClick={onClick}
      aria-expanded={ouvert}
      aria-controls={controle}
      aria-label={ouvert ? 'Fermer le menu' : 'Ouvrir le menu'}
      className="lg:hidden relative w-11 h-11 rounded-full border border-line-strong grid place-items-center hover:border-line-hover transition-colors"
    >
      <span className="relative block w-[1.125rem] h-[0.875rem]" aria-hidden>
        <span
          className={`menu-barre absolute left-0 w-full h-[2px] rounded-full bg-ink ${ouvert ? 'top-1/2 -translate-y-1/2 rotate-45' : 'top-0'}`}
        />
        <span
          className={`menu-barre absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] rounded-full bg-ink ${ouvert ? 'opacity-0 scale-x-50' : ''}`}
        />
        <span
          className={`menu-barre absolute left-0 w-full h-[2px] rounded-full bg-ink ${ouvert ? 'top-1/2 -translate-y-1/2 -rotate-45' : 'bottom-0'}`}
        />
      </span>
    </button>
  )
}

/** Une entrée du menu : `<a>` vers l'application, `<Link>` à l'intérieur du site. */
function Ligne({ entree, courant, delai, onNavigue }: { entree: Entree; courant: boolean; delai: number; onNavigue: () => void }) {
  const classe = `menu-ligne group relative flex items-center gap-3 px-4 py-3.5 rounded-2xl min-h-[3.5rem] transition-colors ${
    courant ? 'bg-raised' : 'hover:bg-surface active:bg-surface'
  }`

  const dedans = (
    <>
      {courant && <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-accent" aria-hidden />}
      <span className="flex flex-col gap-0.5 grow min-w-0">
        <span className={`text-[1.3125rem] font-extrabold tracking-[-0.02em] ${courant ? 'text-accent' : ''}`}>
          {entree.libelle}
        </span>
        {entree.description && (
          <span className="text-[0.8125rem] font-medium text-faint">{entree.description}</span>
        )}
      </span>
      <Chevron />
    </>
  )

  if (entree.externe) {
    return (
      <a href={entree.vers} className={classe} style={{ animationDelay: `${delai}ms` }} onClick={onNavigue}>
        {dedans}
      </a>
    )
  }
  return (
    <Link
      to={entree.vers}
      className={classe}
      style={{ animationDelay: `${delai}ms` }}
      onClick={onNavigue}
      aria-current={courant ? 'page' : undefined}
    >
      {dedans}
    </Link>
  )
}

/** `/blog` reste l'entrée courante quand on lit `/blog/mon-article`. `/` exige l'égalité. */
function estCourant(chemin: string, vers: string) {
  if (vers.startsWith('http') || vers.includes('#')) return false
  if (vers === '/') return chemin === '/'
  return chemin === vers || chemin.startsWith(`${vers}/`)
}

export function MenuMobile() {
  const [etat, setEtat] = useState<Etat>('ferme')
  const { pathname } = useLocation()
  const panneau = useRef<HTMLDivElement>(null)
  const bouton = useRef<HTMLDivElement>(null)
  /** Le geste de fermeture a-t-il commencé sur le voile ? Voir son `onPointerDown`. */
  const gesteSurVoile = useRef(false)

  const ouvert = etat === 'ouvert'
  const monte = etat !== 'ferme'

  const fermer = () => setEtat((e) => (e === 'ouvert' ? 'fermeture' : e))

  // Changer de page ferme le menu. Sans cela, on clique « Blog », la page
  // change derrière le panneau, et le panneau reste ouvert par-dessus.
  useEffect(() => {
    setEtat((e) => (e === 'ouvert' ? 'fermeture' : e))
  }, [pathname])

  // Échap ferme, et le défilement de la page est gelé tant que le menu est là :
  // sur iOS, un panneau fixe laisse sinon défiler le document en dessous.
  useEffect(() => {
    if (!ouvert) return
    const auClavier = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fermer()
    }
    const memoire = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', auClavier)
    return () => {
      document.body.style.overflow = memoire
      document.removeEventListener('keydown', auClavier)
    }
  }, [ouvert])

  // Le clavier doit suivre le panneau à l'aller, et revenir au bouton au
  // retour : sans cela, la tabulation reprend en haut du document et l'on
  // retraverse toute la page pour en sortir.
  //
  // `aDejaOuvert` n'est pas une précaution : sans lui, l'état initial `ferme`
  // déclenche ce retour AU CHARGEMENT DE LA PAGE. Le bouton prenait le focus
  // tout seul, anneau vert compris, sur chaque page du site.
  const aDejaOuvert = useRef(false)
  useEffect(() => {
    if (ouvert) {
      aDejaOuvert.current = true
      panneau.current?.focus()
    } else if (etat === 'ferme' && aDejaOuvert.current) {
      bouton.current?.querySelector('button')?.focus({ preventScroll: true })
    }
  }, [ouvert, etat])

  const passJour = FORMULES.find((f) => f.cle === 'jour')?.prix

  return (
    <div ref={bouton} className="lg:hidden">
      <Bouton
        id="bouton-menu"
        controle="menu-telephone"
        ouvert={ouvert}
        onClick={() => setEtat((e) => (e === 'ouvert' ? 'fermeture' : 'ouvert'))}
      />

      {monte && (
        <div className="fixed inset-0 z-50">
          {/* Le voile : il ferme au toucher, et il est hors du flux de lecture
              — le bouton « Fermer » du panneau fait le même travail au clavier.
              Il ne ferme QUE SI LE GESTE A COMMENCÉ SUR LUI. Sans cette
              condition, le menu se refermait instantanément à l'ouverture : le
              `mousedown` part du bouton, le voile apparaît entre-temps, et le
              `mouseup` lui tombe dessus. La même règle évite de fermer quand on
              relâche hors du panneau après y avoir sélectionné du texte. */}
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            data-etat={etat}
            onPointerDown={() => {
              gesteSurVoile.current = true
            }}
            onClick={() => {
              if (gesteSurVoile.current) fermer()
              gesteSurVoile.current = false
            }}
            className="menu-voile absolute inset-0 w-full bg-canvas/70 backdrop-blur-[2px]"
          />

          <div
            id="menu-telephone"
            ref={panneau}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            tabIndex={-1}
            data-etat={etat}
            // L'animation du tiroir mène la danse : c'est sa fin, à la
            // fermeture, qui retire le menu de l'arbre. Le voile, lui, est plus
            // court et a déjà disparu.
            //
            // Le test sur la cible n'est pas décoratif : `animationend` remonte,
            // et les lignes du menu s'animent À L'INTÉRIEUR du tiroir. Sans lui,
            // la fin d'une ligne retirerait le panneau pendant qu'il glisse.
            onAnimationEnd={(e) => {
              if (e.target !== e.currentTarget) return
              setEtat((prec) => (prec === 'fermeture' ? 'ferme' : prec))
            }}
            className="menu-tiroir absolute inset-y-0 right-0 w-[min(26rem,88vw)] flex flex-col bg-canvas border-l border-sep shadow-[-1.5rem_0_3rem_rgb(0_0_0/0.45)] outline-none overflow-y-auto overscroll-contain"
          >
            <div className="shrink-0 flex items-center justify-between gap-4 px-5 h-16 border-b border-sep">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-faint">Menu</span>
              <button
                type="button"
                onClick={fermer}
                aria-label="Fermer le menu"
                className="w-11 h-11 -mr-1.5 rounded-xl border border-line-strong grid place-items-center hover:border-line-hover transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="rgb(var(--c-ink))" strokeWidth={2} strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <nav aria-label="Navigation principale" className="flex flex-col gap-1 px-3 pt-4">
              {MENU_MOBILE.map((e, i) => (
                <Ligne
                  key={e.libelle}
                  entree={e}
                  courant={estCourant(pathname, e.vers)}
                  delai={70 + i * 45}
                  onNavigue={fermer}
                />
              ))}
            </nav>

            <div
              className="menu-ligne mx-3 mt-5 flex flex-col gap-3 p-5 rounded-3xl bg-surface border border-line"
              style={{ animationDelay: `${70 + MENU_MOBILE.length * 45}ms` }}
            >
              <span className="text-[1.0625rem] font-bold">Une course offerte chaque jour</span>
              <span className="text-[0.9375rem] font-medium leading-relaxed text-muted">
                Sans carte bancaire. Un Pass ouvre toutes les autres, dès {passJour}.
              </span>
              <a
                href={URL_INSCRIPTION}
                className="h-[3.25rem] rounded-full bg-accent text-accent-ink flex items-center justify-center text-[0.9375rem] font-bold hover:bg-accent-hover transition-colors"
              >
                Essayer gratuitement
              </a>
              <a
                href={URL_CONNEXION}
                className="h-[3.25rem] rounded-full border border-line-strong flex items-center justify-center text-[0.9375rem] font-bold hover:border-line-hover transition-colors"
              >
                Se connecter
              </a>
            </div>

            <div
              className="menu-ligne flex flex-wrap gap-x-6 gap-y-2 px-5 pt-6"
              style={{ animationDelay: `${115 + MENU_MOBILE.length * 45}ms` }}
            >
              {LEGAL.map((l) => (
                <Link
                  key={l.libelle}
                  to={l.vers}
                  onClick={fermer}
                  className="text-[0.9375rem] font-semibold text-faint hover:text-accent transition-colors"
                >
                  {l.libelle}
                </Link>
              ))}
            </div>

            {/* La mention unique du site, celle du pied de page. La maquette
                posait ici le message officiel des opérateurs de jeux : nous n'en
                sommes pas un, et nous ne le reprenons pas. */}
            <div
              role="note"
              aria-label="Mise en garde"
              className="menu-ligne mx-3 mt-5 mb-6 flex items-start gap-3 px-[1.125rem] py-3.5 rounded-xl bg-surface border border-line"
              style={{ animationDelay: `${160 + MENU_MOBILE.length * 45}ms` }}
            >
              <span className="shrink-0 h-6 px-[7px] rounded-[6px] bg-ink text-accent-ink flex items-center text-[0.6875rem] font-extrabold">
                {AVERTISSEMENT.ageMinimum}+
              </span>
              <span className="text-xs font-medium leading-relaxed text-muted">
                {AVERTISSEMENT.texte} Service réservé aux personnes majeures ({AVERTISSEMENT.ageMinimum}&nbsp;ans et
                plus).
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
