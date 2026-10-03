import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Couverture } from '@/components/blog/Couverture'
import { articlesRecents, rubriquesUtilisees, type Article, type Rubrique } from '@/contenu/articles'
import { URL_INSCRIPTION } from '@/config/site'
import { useTitre } from '@/lib/useTitre'

/**
 * LE BLOG, INDEX — `design/screens/Blog.dc.html` et `BlogMobile`.
 *
 * Hero éditorial, filtres par rubrique, un article « À la une » en pleine
 * largeur, puis une grille de trois colonnes (une seule sur téléphone).
 *
 * ÉCARTS À LA MAQUETTE, et ils tiennent tous au positionnement (A8) :
 * - le titre de la maquette, « Comprendre une course, pas seulement la jouer »,
 *   devient « Comprendre une course, pas seulement son résultat » : le verbe
 *   « jouer » appartient au vocabulaire banni ;
 * - la rubrique « Jeu responsable » et l'article « Fixer son budget avant de
 *   parier » ne sont pas repris : Crosswell n'est pas opérateur de jeux et ne
 *   conseille aucune action ;
 * - le bandeau ANJ / joueurs-info-service de la maquette n'a pas lieu d'être
 *   pour un éditeur d'analyses ; le pied de page porte déjà l'avertissement et
 *   la mention 18+ ;
 * - le bloc d'inscription à une lettre d'information attendra qu'un outil
 *   d'envoi marketing existe : promettre « un e-mail par semaine » sans rien
 *   pour l'envoyer serait la énième promesse que le produit ne tient pas. La
 *   place est tenue par l'essai gratuit.
 */

const TOUS = 'Tous les articles' as const

function Meta({ a }: { a: Article }) {
  return (
    <span className="num text-xs font-medium text-faint">
      {new Date(a.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} ·{' '}
      {a.minutes} min de lecture
    </span>
  )
}

function Carte({ a }: { a: Article }) {
  return (
    <Link
      to={`/blog/${a.slug}`}
      className="flex flex-col gap-3.5 p-4 rounded-[1.25rem] bg-surface border border-line hover:border-line-hover transition-colors"
    >
      <Couverture article={a} />
      <span className="chip-neutral self-start">{a.rubrique}</span>
      <h2 className="text-[1.0625rem] font-bold leading-snug">{a.titre}</h2>
      <p className="text-[0.875rem] leading-relaxed text-muted line-clamp-4">{a.chapo}</p>
      <Meta a={a} />
    </Link>
  )
}

export default function Blog() {
  useTitre('Blog')
  const [filtre, setFiltre] = useState<Rubrique | typeof TOUS>(TOUS)
  const tous = articlesRecents()
  const visibles = filtre === TOUS ? tous : tous.filter((a) => a.rubrique === filtre)
  const une = visibles.find((a) => a.aLaUne) ?? visibles[0]
  const suite = visibles.filter((a) => a.slug !== une?.slug)

  return (
    <div className="w-full max-w-[75rem] mx-auto px-5 lg:px-10 pt-9 lg:pt-16 pb-14 lg:pb-24 flex flex-col gap-8 lg:gap-10">
      <header className="flex flex-col gap-4">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Le journal</span>
        <h1 className="text-[2.125rem] lg:text-[3.5rem] font-extrabold tracking-[-0.03em] leading-[1.05] max-w-[46rem]">
          Comprendre une course, pas seulement son résultat.
        </h1>
        <p className="text-[0.9375rem] lg:text-base font-medium leading-relaxed text-muted max-w-[34rem]">
          Notre méthode, nos résultats mois par mois, les hippodromes et ce que nos pourcentages veulent dire. Écrit par
          l’équipe qui construit le modèle.
        </p>
      </header>

      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] -mx-5 px-5 lg:mx-0 lg:px-0">
          {[TOUS, ...rubriquesUtilisees()].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setFiltre(r)}
              aria-pressed={filtre === r}
              className={`shrink-0 h-9 px-4 rounded-full text-[0.8125rem] font-bold transition-colors ${
                filtre === r
                  ? 'bg-accent text-accent-ink'
                  : 'bg-surface border border-line text-soft hover:border-line-hover'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <span className="num shrink-0 text-xs font-medium text-faint">
          {visibles.length} article{visibles.length > 1 ? 's' : ''}
        </span>
      </div>

      {une && (
        <Link
          to={`/blog/${une.slug}`}
          className="grid lg:grid-cols-2 gap-5 lg:gap-8 p-4 lg:p-5 rounded-[1.5rem] bg-surface border border-line hover:border-line-hover transition-colors"
        >
          <Couverture article={une} hauteur="h-48 lg:h-full lg:min-h-[15rem]" />
          <div className="flex flex-col items-start gap-3.5 lg:py-4 lg:pr-4">
            <span className="flex items-center gap-2">
              <span className="chip-neutral">{une.rubrique}</span>
              <span className="chip-accent">À la une</span>
            </span>
            <h2 className="text-[1.375rem] lg:text-[1.75rem] font-extrabold tracking-[-0.02em] leading-tight">
              {une.titre}
            </h2>
            <p className="text-[0.9375rem] leading-relaxed text-muted">{une.chapo}</p>
            <Meta a={une} />
            <span className="btn-accent mt-1">Lire l’article</span>
          </div>
        </Link>
      )}

      {suite.length > 0 && (
        <div className="grid gap-[1.125rem] sm:grid-cols-2 lg:grid-cols-3">
          {suite.map((a) => (
            <Carte key={a.slug} a={a} />
          ))}
        </div>
      )}

      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 px-6 py-7 lg:px-10 lg:py-9 rounded-[1.5rem] bg-surface border border-line">
        <div className="flex flex-col gap-2">
          <h2 className="text-[1.25rem] lg:text-[1.375rem] font-extrabold tracking-[-0.02em]">
            Voir ces analyses sur les courses du jour
          </h2>
          <p className="text-[0.9375rem] font-medium leading-relaxed text-muted">
            Une course offerte chaque jour, sans carte bancaire.
          </p>
        </div>
        <a href={URL_INSCRIPTION} className="btn-accent shrink-0 !h-12 !px-7">
          Essayer gratuitement
        </a>
      </section>
    </div>
  )
}
