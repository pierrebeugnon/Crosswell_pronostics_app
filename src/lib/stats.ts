import type { Bilan, Course } from '@/types'

/**
 * Intervalle de confiance à 95 % d'une proportion, méthode de Wilson.
 *
 * POURQUOI WILSON, ET POURQUOI L'AFFICHER. Sur 234 courses, un taux de victoire
 * de 27,8 % est encadré par [22,4 % ; 33,8 %] : l'incertitude vaut onze points.
 * Publier « 27,8 % » tout court laisserait croire à une précision que les
 * données n'ont pas, et le premier client qui compare deux semaines de suite
 * conclurait à une panne là où il n'y a que du hasard. L'approximation normale
 * usuelle, elle, se disloque près de 0 et de 1 — Wilson tient sur toute la
 * plage, y compris sur les petits effectifs, qui sont précisément notre cas.
 */
export function wilson(succes: number, total: number, z = 1.96): { bas: number; haut: number } {
  if (total <= 0) return { bas: 0, haut: 0 }
  const p = succes / total
  const d = 1 + (z * z) / total
  const centre = p + (z * z) / (2 * total)
  const ecart = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * total)) / total)
  return { bas: Math.max(0, (centre - ecart) / d), haut: Math.min(1, (centre + ecart) / d) }
}

export function bilan(courses: Course[]): Bilan {
  const jugees = courses.filter((c) => c.courue)
  const gagnees = jugees.filter((c) => c.gagne).length
  const placees = jugees.filter((c) => c.place).length
  const trio = jugees.reduce((s, c) => s + c.dansLeTrio, 0)
  const n = jugees.length
  return {
    courses: courses.length,
    jugees: n,
    gagnees,
    placees,
    trio,
    reunions: new Set(courses.map((c) => `${c.date}|${c.hippodrome}`)).size,
    reunionsJugees: new Set(jugees.map((c) => `${c.date}|${c.hippodrome}`)).size,
    tauxVictoire: n ? gagnees / n : 0,
    tauxPlace: n ? placees / n : 0,
    tauxTrio: n ? trio / (n * 3) : 0,
  }
}


export interface Segment {
  label: string
  n: number
  gagnees: number
  taux: number
  bas: number
  haut: number
}

export function parSegment(
  courses: Course[],
  cle: (c: Course) => string,
  ordre?: string[],
): Segment[] {
  const jugees = courses.filter((c) => c.courue)
  const m = new Map<string, { n: number; g: number }>()
  for (const c of jugees) {
    const k = cle(c)
    const e = m.get(k) ?? { n: 0, g: 0 }
    e.n++
    if (c.gagne) e.g++
    m.set(k, e)
  }
  let entrees = [...m.entries()]
  if (ordre) {
    const rang = (l: string) => {
      const i = ordre.indexOf(l)
      return i === -1 ? 99 : i
    }
    entrees.sort((a, b) => rang(a[0]) - rang(b[0]))
  } else {
    entrees.sort((a, b) => b[1].n - a[1].n)
  }
  return entrees.map(([label, e]) => {
    const ic = wilson(e.g, e.n)
    return { label, n: e.n, gagnees: e.g, taux: e.g / e.n, bas: ic.bas, haut: ic.haut }
  })
}

/**
 * Calibration : sur les chevaux annoncés à ~20 %, en gagnent-ils vraiment 20 % ?
 *
 * C'est la seule mesure qui dit si une probabilité affichée veut dire quelque
 * chose. Un modèle peut très bien classer juste et annoncer n'importe quel
 * niveau ; le client, lui, s'appuie sur le niveau.
 */
export interface Tranche {
  label: string
  bas: number
  haut: number
  n: number
  /** Victoires observées dans la tranche. */
  gagnants: number
  annonce: number
  observe: number
  /** Intervalle de Wilson à 95 % sur la fréquence observée. */
  icBas: number
  icHaut: number
}

export type BornesTranches = readonly (readonly [number, number])[]

export const BORNES_CALIBRATION: BornesTranches = [
  [0, 0.05],
  [0.05, 0.1],
  [0.1, 0.15],
  [0.15, 0.22],
  [0.22, 0.3],
  [0.3, 0.45],
  [0.45, 1],
]

/** Les tranches de conviction de l'outil interne (`confidenceBins`). */
export const BORNES_CONFIANCE: BornesTranches = [
  [0, 0.15],
  [0.15, 0.22],
  [0.22, 0.3],
  [0.3, 1],
]

interface Point {
  p: number
  gagne: 0 | 1
}

/**
 * Répartit des points dans des tranches [bas ; haut[. La DERNIÈRE tranche est
 * fermée à droite : une probabilité de 1 appartient à la tranche haute au lieu
 * de disparaître de la mesure.
 */
function enTranches(points: Point[], bornes: BornesTranches): Tranche[] {
  return bornes
    .map(([bas, haut], i) => {
      const derniere = i === bornes.length - 1
      const g = points.filter((x) => x.p >= bas && (x.p < haut || (derniere && x.p <= haut)))
      const gagnants = g.reduce((s, x) => s + x.gagne, 0)
      const ic = wilson(gagnants, g.length)
      return {
        label: `${Math.round(bas * 100)}–${Math.round(haut * 100)} %`,
        bas,
        haut,
        n: g.length,
        gagnants,
        annonce: g.length ? g.reduce((s, x) => s + x.p, 0) / g.length : 0,
        observe: g.length ? gagnants / g.length : 0,
        icBas: ic.bas,
        icHaut: ic.haut,
      }
    })
    .filter((t) => t.n > 0)
}

/**
 * LES POINTS DE CALIBRATION — et la correction du 14 septembre 2026.
 *
 * Chaque cheval AU DÉPART d'une course jugée, dont la probabilité est connue,
 * donne un point : sa probabilité annoncée, et 1 s'il a gagné, 0 sinon.
 *
 * - Un cheval sans place relevée dans une course jugée a PERDU. Les arrivées ne
 *   sont relevées que jusqu'au 5e ou au 7e : l'ancienne version écartait ces
 *   chevaux comme des données manquantes. Or ce sont presque tous des perdants
 *   à faible probabilité — la tranche 0–10 % affichait 12,6 % de gagnants au
 *   lieu de 6,4 %, et le modèle paraissait trop prudent là où il est juste.
 * - Un NON-PARTANT ne donne aucun point : il n'a pas pu gagner, et le compter
 *   perdant ferait paraître le modèle trop optimiste. C'est un écart assumé
 *   avec l'outil interne, qui les compte perdants (voir `tests/parite`).
 */
export function pointsCalibration(courses: Course[]): Point[] {
  const points: Point[] = []
  for (const c of courses) {
    if (!c.courue) continue
    for (const p of c.liste) {
      if (!p.nonPartant && p.pWin != null) points.push({ p: p.pWin, gagne: p.arrivee === 1 ? 1 : 0 })
    }
  }
  return points
}

export function calibration(courses: Course[], bornes: BornesTranches = BORNES_CALIBRATION): Tranche[] {
  return enTranches(pointsCalibration(courses), bornes)
}

/**
 * Fiabilité selon notre niveau de conviction : quand notre rang 1 est annoncé
 * au-dessus de 30 %, gagne-t-il plus souvent ? Un point par course jugée —
 * celui de notre rang 1 effectif. Mêmes tranches que l'outil interne.
 */
export function confiance(courses: Course[], bornes: BornesTranches = BORNES_CONFIANCE): Tranche[] {
  const points: Point[] = []
  for (const c of courses) {
    if (!c.courue || !c.favori || c.favori.pWin == null) continue
    points.push({ p: c.favori.pWin, gagne: c.favori.arrivee === 1 ? 1 : 0 })
  }
  return enTranches(points, bornes)
}

/**
 * LE REPÈRE DU HASARD : ce qu'obtiendrait un cheval tiré au sort dans chaque
 * course, en moyenne sur les courses jugées.
 *
 * C'est la MOYENNE DES 1/n, et non 1 sur la taille moyenne des pelotons. Les
 * deux diffèrent toujours dans le même sens (inégalité de Jensen) : sur deux
 * courses de 6 et 16 partants, 1/11 = 9,1 % alors que le hasard réel vaut
 * (1/6 + 1/16) / 2 = 11,5 %. L'ancienne formule sous-estimait le hasard, et
 * donc gonflait notre avance sur lui.
 *
 * `n` = chevaux AU DÉPART : un non-partant ne peut pas être tiré au sort.
 */
export function repereHasard(courses: Course[]): { victoire: number; dansLesTrois: number; n: number } {
  const cs = courses.filter((c) => c.courue && c.partants > 0)
  if (!cs.length) return { victoire: 0, dansLesTrois: 0, n: 0 }
  return {
    victoire: cs.reduce((s, c) => s + 1 / c.partants, 0) / cs.length,
    dansLesTrois: cs.reduce((s, c) => s + Math.min(1, 3 / c.partants), 0) / cs.length,
    n: cs.length,
  }
}

/**
 * Comparaison au marché, sur les seules courses où les deux sont mesurables.
 * Battre le favori du marché est le seul étalon qui vaille : un taux brut ne
 * dit rien tant qu'on ignore ce qu'obtenait le premier venu.
 *
 * Périmètre identique à l'outil interne : une course jugée, cotée, avec notre
 * rang 1 et un favori du marché. Le vainqueur n'est pas exigé — une course dont
 * le vainqueur manque à nos lignes compte en échec des deux côtés, au lieu de
 * disparaître de la comparaison.
 *
 * LES DEUX CAMPS SONT JUGÉS PAR LA MÊME RÈGLE : un cheval a gagné s'il est
 * arrivé premier. Sur un dead heat, les deux premiers ex æquo ont gagné — si
 * notre rang 1 partage la victoire avec le favori du marché, la course compte
 * pour les deux. L'outil interne ne retient qu'un vainqueur et donnait alors la
 * course à nous seuls : écart assumé, mesuré dans `tests/parite`.
 */
export function faceAuMarche(courses: Course[]) {
  const cs = courses.filter((c) => c.courue && c.favori && c.favoriMarche)
  if (!cs.length) return null
  const n = cs.length
  const nous = cs.filter((c) => c.favori!.arrivee === 1).length
  const marche = cs.filter((c) => c.favoriMarche!.arrivee === 1).length
  const accord = cs.filter((c) => c.favori!.numero === c.favoriMarche!.numero).length
  return {
    n,
    nous,
    marche,
    accord,
    tauxNous: nous / n,
    tauxMarche: marche / n,
    tauxAccord: accord / n,
  }
}

/**
 * Taux de victoire ET de place, CUMULÉS jour après jour.
 *
 * Cumulés, et jamais journaliers : sur une vingtaine de courses par jour (la
 * moyenne depuis août 2026, avec des creux à huit), un taux quotidien saute de
 * 0 à 40 % sans qu'aucun modèle n'ait bougé. Tracer ce
 * bruit donnerait une courbe en dents de scie qui n'illustre rien, alors que le
 * cumul montre vers quelle valeur les taux convergent — c'est la seule forme
 * qui veuille dire quelque chose sur un historique court.
 */
export interface PointReussite {
  date: string
  /** Nombre de courses jugées depuis le début de la série. */
  jugees: number
  tauxVictoire: number
  tauxPlace: number
}

export function serieReussite(courses: Course[]): PointReussite[] {
  const jours = new Map<string, { n: number; g: number; p: number }>()
  for (const c of courses) {
    if (!c.courue) continue
    const e = jours.get(c.date) ?? { n: 0, g: 0, p: 0 }
    e.n++
    if (c.gagne) e.g++
    if (c.place) e.p++
    jours.set(c.date, e)
  }

  let n = 0
  let g = 0
  let p = 0
  return [...jours.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, e]) => {
      n += e.n
      g += e.g
      p += e.p
      return { date, jugees: n, tauxVictoire: g / n, tauxPlace: p / n }
    })
}
