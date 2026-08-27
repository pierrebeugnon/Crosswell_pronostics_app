import type { Bilan, Course } from '@/types'

/**
 * Intervalle de confiance à 95 % d'une proportion, méthode de Wilson.
 *
 * POURQUOI WILSON, ET POURQUOI L'AFFICHER. Sur 234 courses, un taux de victoire
 * de 27,8 % est encadré par [22,4 % ; 33,9 %] : l'incertitude vaut onze points.
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
  annonce: number
  observe: number
}

const BORNES: [number, number][] = [
  [0, 0.05],
  [0.05, 0.1],
  [0.1, 0.15],
  [0.15, 0.22],
  [0.22, 0.3],
  [0.3, 0.45],
  [0.45, 1],
]

export function calibration(courses: Course[]): Tranche[] {
  const points: { p: number; gagne: number }[] = []
  for (const c of courses) {
    if (!c.courue) continue
    for (const p of c.liste) {
      if (p.pWin != null && p.arrivee != null) points.push({ p: p.pWin, gagne: p.arrivee === 1 ? 1 : 0 })
    }
  }
  return BORNES.map(([bas, haut]) => {
    const g = points.filter((x) => x.p >= bas && x.p < haut)
    return {
      label: `${Math.round(bas * 100)}–${Math.round(haut * 100)} %`,
      bas,
      haut,
      n: g.length,
      annonce: g.length ? g.reduce((s, x) => s + x.p, 0) / g.length : 0,
      observe: g.length ? g.reduce((s, x) => s + x.gagne, 0) / g.length : 0,
    }
  }).filter((t) => t.n > 0)
}

/**
 * Comparaison au marché, sur les seules courses où les deux sont mesurables.
 * Battre le favori du marché est le seul étalon qui vaille : un taux brut ne
 * dit rien tant qu'on ignore ce qu'obtenait le premier venu.
 */
export function faceAuMarche(courses: Course[]) {
  const cs = courses.filter((c) => c.courue && c.favori && c.favoriMarche && c.gagnant)
  if (!cs.length) return null
  const n = cs.length
  const nous = cs.filter((c) => c.gagne).length
  const marche = cs.filter((c) => c.favoriMarche!.numero === c.gagnant!.numero).length
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
 * Cumulés, et jamais journaliers : sur une quinzaine de courses par jour, un
 * taux quotidien saute de 0 à 40 % sans qu'aucun modèle n'ait bougé. Tracer ce
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

/** Série par jour, pour la courbe de suivi. */
export interface PointJour {
  date: string
  jugees: number
  gagnees: number
  taux: number
}

export function parJour(courses: Course[]): PointJour[] {
  const m = new Map<string, { n: number; g: number }>()
  for (const c of courses) {
    if (!c.courue) continue
    const e = m.get(c.date) ?? { n: 0, g: 0 }
    e.n++
    if (c.gagne) e.g++
    m.set(c.date, e)
  }
  return [...m.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, e]) => ({ date, jugees: e.n, gagnees: e.g, taux: e.g / e.n }))
}
