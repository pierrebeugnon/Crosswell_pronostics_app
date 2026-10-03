import type { Article } from '@/contenu/articles'

/**
 * LA COUVERTURE D'UN ARTICLE — la même image sur la carte de l'index, sur le
 * bloc « À la une » et en tête de l'article, pour qu'un lecteur reconnaisse au
 * premier coup d'œil l'article qu'il vient de quitter.
 *
 * Un article sans `couverture` retombe sur l'aplat de marque : le blog doit
 * pouvoir publier avant que l'image existe, sans trou dans la mise en page.
 *
 * `priorite` est réservé à l'image de tête de l'article : c'est le plus gros
 * élément visible à l'ouverture, donc celui que le navigateur doit aller
 * chercher en premier. Partout ailleurs, chargement différé.
 */
export function Couverture({
  article,
  hauteur = 'h-40',
  priorite = false,
}: {
  article: Pick<Article, 'couverture'>
  hauteur?: string
  priorite?: boolean
}) {
  const classe = `${hauteur} w-full rounded-xl overflow-hidden border border-line`

  if (!article.couverture) {
    return (
      <div className={`${classe} bg-gradient-to-br from-raised to-surface grid place-items-center`} aria-hidden>
        <span className="text-[0.625rem] font-bold uppercase tracking-[0.18em] text-dim">Crosswell</span>
      </div>
    )
  }

  const { fichier, alt } = article.couverture

  return (
    <div className={classe}>
      <img
        src={fichier}
        alt={alt}
        className="w-full h-full object-cover"
        loading={priorite ? 'eager' : 'lazy'}
        fetchPriority={priorite ? 'high' : 'auto'}
        decoding="async"
      />
    </div>
  )
}
