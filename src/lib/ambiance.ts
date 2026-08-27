/**
 * Une atmosphère par hippodrome, dérivée de son nom.
 *
 * POURQUOI DÉRIVER PLUTÔT QUE CHOISIR. Vingt-six pistes aujourd'hui, davantage
 * demain : une table de couleurs écrite à la main serait à compléter à chaque
 * nouvel hippodrome, et un oubli laisserait une page grise au milieu de pages
 * colorées. La dérivation ne peut pas oublier.
 *
 * POURQUOI LA MARQUE NE BOUGE PAS. Seuls les HALOS de fond changent. Le vert
 * Crosswell reste l'accent de tous les chiffres, de tous les boutons, sur
 * toutes les pages : c'est lui qui dit « vous êtes chez nous ». Faire varier
 * l'accent avec la piste donnerait vingt-six petites marques au lieu d'une.
 *
 * Les teintes sont posées en HSL avec une saturation basse et une luminosité
 * sombre, puis servies en `hsl(... / alpha)` : sur un fond à 4 % de luminosité,
 * une couleur vive ne fait pas une ambiance, elle fait une tache.
 */

/** FNV-1a 32 bits — court, stable, et sans dépendance. */
function empreinte(texte: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < texte.length; i++) {
    h ^= texte.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export interface Ambiance {
  /** Teinte dominante, en degrés. */
  teinte: number
  /** Fond de halos, prêt pour la propriété `background`. */
  halos: string
  /**
   * Fonds de bande des sections immersives — deux profondeurs à alterner.
   *
   * OPAQUES, et c'est le cœur du dispositif. La première version teintait les
   * sections d'un voile à 10 % d'alpha : chaque bande laissait alors voir le
   * fond au travers, et trois défauts en découlaient à chaque frontière — la
   * fin d'une section dessinait une arête droite sur le canvas, la bande
   * transparente au-dessus de la vague suivante laissait réapparaître le
   * canvas nu entre deux sections, et le pixel de recouvrement entre la vague
   * et son corps doublait la densité en une hairline plus sombre. Une couleur
   * opaque, calculée pour ÊTRE le canvas teinté plutôt que posée dessus, rend
   * les trois problèmes impossibles : deux surfaces opaques de même valeur
   * n'ont pas de jointure visible, quel que soit leur recouvrement.
   *
   * COULEURS PLATES, jamais un dégradé : la vague qui ouvre une section
   * remplit sa propre surface avec la même valeur pour prolonger le fond
   * au-delà de la courbe. Avec un dégradé, les deux surfaces ne coïncideraient
   * qu'à un seul endroit.
   */
  bande1: string
  bande2: string
  /** Filet lumineux d'une bordure haute de section. */
  filet: string
}

/**
 * La bande d'ouverture de la page Aujourd'hui — la maison, pas une piste. La
 * recette est celle de `bande1` (canvas teinté opaque, voir le commentaire de
 * l'interface), posée sur la teinte de la marque : le vert Crosswell est à
 * ~150° et c'est le seul endroit où une bande a le droit de l'emprunter,
 * puisque c'est l'écran de la maison.
 */
export const BANDE_CROSSWELL = 'hsl(150 22% 8%)'

export function ambianceDe(hippodrome: string): Ambiance {
  const h = empreinte(hippodrome.toUpperCase())

  // On évite volontairement la plage 90–150° : c'est celle du vert de marque,
  // et un halo qui l'imite ferait passer le fond pour un accent.
  const brut = h % 300
  const teinte = brut >= 90 ? brut + 60 : brut

  const t2 = (teinte + 128) % 360
  const t3 = (teinte + 262) % 360
  // Deux positions tirées du même hachage : la composition change d'une piste à
  // l'autre, mais reste identique d'une visite à l'autre pour la même piste.
  const px = 8 + ((h >> 8) % 26)
  const py = 62 + ((h >> 14) % 30)

  return {
    teinte,
    halos: [
      `radial-gradient(46vmax 40vmax at ${px}% -6%, hsl(${teinte} 46% 42% / 0.30), transparent 64%)`,
      `radial-gradient(52vmax 46vmax at ${100 - px}% 12%, hsl(${t2} 38% 34% / 0.26), transparent 66%)`,
      `radial-gradient(58vmax 52vmax at ${py}% 96%, hsl(${t3} 34% 30% / 0.22), transparent 68%)`,
    ].join(', '),
    // Le canvas est à ~5 % de luminosité ; les bandes montent à 8 et 10,5 %
    // avec une saturation contenue : assez pour que la teinte se sente, pas
    // assez pour que la bande devienne une couleur qui concurrence l'accent.
    bande1: `hsl(${teinte} 22% 8%)`,
    bande2: `hsl(${teinte} 26% 10.5%)`,
    filet: `linear-gradient(90deg, transparent, hsl(${teinte} 60% 62% / 0.35), transparent)`,
  }
}
