import { Link, Navigate, useParams } from 'react-router-dom'
import { Couverture } from '@/components/blog/Couverture'
import { articleParSlug, articlesLies, type Article as ArticleType } from '@/contenu/articles'
import { URL_INSCRIPTION } from '@/config/site'
import { useTitre } from '@/lib/useTitre'

/**
 * UN ARTICLE — `design/screens/Article.dc.html` et `ArticleMobile`.
 *
 * Fil d'Ariane, chip de rubrique, titre, chapô, signature, visuel, puis deux
 * colonnes : le sommaire collé à gauche (260 px) et le corps (760 px). En bas,
 * la bio, un rappel de l'offre et trois articles liés.
 *
 * ÉCARTS À LA MAQUETTE :
 * - pas de boutons « Enregistrer » ni « Partager » : l'un suppose un compte sur
 *   le site vitrine, qui n'en a pas, l'autre ouvrirait un suivi tiers que la
 *   politique de confidentialité promet de ne pas poser ;
 * - le sommaire est replié sur téléphone (`<details>`), comme la maquette
 *   mobile, mais sans script : l'élément natif suffit ;
 * - aucun encadré du type « un pronostic ne remplace pas une limite décidée à
 *   froid » : ce registre relève du jeu responsable, hors de notre champ (A8).
 */

function Sommaire({ a }: { a: ArticleType }) {
  const liens = a.sections.map((s) => (
    <a
      key={s.id}
      href={`#${s.id}`}
      className="block py-1.5 text-[0.8125rem] leading-snug text-muted hover:text-ink border-l border-line hover:border-accent pl-3 transition-colors"
    >
      {s.titre}
    </a>
  ))
  return (
    <>
      <nav aria-label="Sommaire" className="hidden lg:flex flex-col gap-1 sticky top-24 w-[16.25rem] shrink-0">
        <span className="label pb-2">Sommaire</span>
        {liens}
      </nav>
      <details className="lg:hidden rounded-xl bg-surface border border-line px-4 py-3">
        <summary className="text-[0.8125rem] font-bold cursor-pointer">Sommaire</summary>
        <nav aria-label="Sommaire" className="flex flex-col gap-1 pt-3">
          {liens}
        </nav>
      </details>
    </>
  )
}

export default function Article() {
  const { slug } = useParams()
  const article = slug ? articleParSlug(slug) : undefined
  // `suffixe: false` : `seo.titre` est le titre complet, celui que
  // `scripts/apres-build.mjs` écrit aussi dans le HTML servi. Voir `useTitre`.
  useTitre(article ? article.seo.titre : 'Article introuvable', { suffixe: Boolean(!article) })

  // Un slug inconnu n'est pas une page vide : c'est un 404 en bonne et due forme.
  if (!article) return <Navigate to="/blog" replace />

  const { Contenu } = article
  const lies = articlesLies(article)
  const publie = new Date(article.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="w-full max-w-[75rem] mx-auto px-5 lg:px-10 pt-7 lg:pt-12 pb-14 lg:pb-24 flex flex-col gap-7 lg:gap-9">
      <nav aria-label="Fil d’Ariane" className="text-xs font-medium text-faint">
        <Link to="/blog" className="hover:text-ink">
          Blog
        </Link>{' '}
        / <span className="text-muted">{article.rubrique}</span>
      </nav>

      <header className="flex flex-col gap-4 max-w-[51.25rem]">
        <span className="chip-neutral self-start">{article.rubrique}</span>
        <h1 className="text-[2rem] lg:text-[3rem] font-extrabold tracking-[-0.03em] leading-[1.08]">{article.titre}</h1>
        <p className="text-[1rem] lg:text-[1.0625rem] font-medium leading-relaxed text-muted">{article.chapo}</p>
        <div className="flex items-center gap-3 pt-1">
          <span className="w-9 h-9 rounded-full bg-accent/[0.12] text-accent grid place-items-center text-xs font-extrabold">
            CW
          </span>
          <span className="flex flex-col">
            <span className="text-[0.8125rem] font-bold">L’équipe Crosswell</span>
            <span className="num text-xs text-faint">
              {publie} · {article.minutes} min de lecture
            </span>
          </span>
        </div>
      </header>

      <Couverture article={article} hauteur="h-52 lg:h-[26.25rem]" priorite />

      <div className="flex flex-col lg:flex-row gap-7 lg:gap-12">
        <Sommaire a={article} />
        <article className="flex flex-col gap-5 max-w-[47.5rem]">
          <Contenu />
        </article>
      </div>

      <section className="flex flex-col gap-2 px-5 py-5 rounded-2xl bg-surface border border-line max-w-[51.25rem]">
        <span className="text-[0.9375rem] font-extrabold">L’équipe Crosswell</span>
        <p className="text-[0.9375rem] leading-relaxed text-muted">
          Nous construisons le modèle, et nous publions ses résultats sans trier les périodes. Une question sur une
          méthode, un chiffre, une course&nbsp;? Écrivez-nous.
        </p>
      </section>

      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 px-6 py-7 lg:px-10 lg:py-8 rounded-[1.5rem] bg-surface border border-accent max-w-[51.25rem]">
        <div className="flex flex-col gap-1.5">
          <span className="text-[1.0625rem] lg:text-[1.1875rem] font-extrabold tracking-[-0.02em]">
            Voir ces pourcentages sur les courses du jour
          </span>
          <span className="text-[0.875rem] font-medium text-muted">Une course offerte chaque jour, sans carte bancaire.</span>
        </div>
        <a href={URL_INSCRIPTION} className="btn-accent shrink-0">
          Essayer gratuitement
        </a>
      </section>

      {lies.length > 0 && (
        <section className="flex flex-col gap-5 pt-2">
          <h2 className="text-[1.25rem] lg:text-[1.5rem] font-extrabold tracking-[-0.02em]">À lire ensuite</h2>
          <div className="grid gap-[1.125rem] sm:grid-cols-2 lg:grid-cols-3">
            {lies.map((a) => (
              <Link
                key={a.slug}
                to={`/blog/${a.slug}`}
                className="flex flex-col gap-2.5 p-4 rounded-[1.25rem] bg-surface border border-line hover:border-line-hover transition-colors"
              >
                <span className="chip-neutral self-start">{a.rubrique}</span>
                <span className="text-[0.9375rem] font-bold leading-snug">{a.titre}</span>
                <span className="num text-xs text-faint">{a.minutes} min de lecture</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
