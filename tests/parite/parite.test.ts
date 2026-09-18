import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { construireCourses, trancheDistance, tranchePeloton } from '@/lib/aggregate'
import {
  BORNES_CONFIANCE,
  bilan,
  calibration,
  confiance,
  faceAuMarche,
  parSegment,
  repereHasard,
} from '@/lib/stats'
import type { Course } from '@/types'
import {
  empreinte,
  genererLignes,
  GRAINE,
  MODELE,
  rangsEffectifsSql,
  versLigneClient,
  type LigneMonitoring,
} from './generateur'
import {
  BORNES_CALIBRATION_INTERNE,
  BORNES_CONFIANCE_INTERNE,
  cleClient,
  differencesReference,
  extraireReference,
  serialiserReference,
  type DetailCourse,
  type ModuleInterne,
  type Reference,
  type SegmentInterne,
} from './reference'

/*
 * TEST DE PARITÉ — l'app client et l'outil interne, sur les mêmes lignes.
 *
 * Deux blocs, et seulement deux :
 * - « Identique à l'outil interne » : tout ce que les deux outils doivent
 *   compter pareil, course par course et en totaux entiers ;
 * - « Écarts voulus, mesurés exactement » : les sept différences décidées.
 *     (i)   calibration sans les non-partants ;
 *     (ii)  « dans les trois » au lieu des places payées ;
 *     (iii) repère du hasard calculé, au lieu d'une constante ;
 *     (iv)  dead heat : le favori du marché ex æquo premier a gagné ;
 *     (v)   un cheval sans `pred_rank` n'a pas de rang ;
 *     (vi)  favori du marché sur la seule cote de clôture (la vue ne sert pas
 *           l'avant-course) ;
 *     (vii) segment de peloton sur les partants au départ, pas sur `field_size`.
 *   Chacune est ASSERTÉE à l'unité près, course par course : un écart voulu qui
 *   change de taille est une régression comme une autre.
 *
 * Toute autre divergence fait échouer le test en nommant la course et le champ.
 * Les lignes données à l'app passent par `versLigneClient` : elles n'ont que les
 * colonnes de la vue client, jamais `cote_avant` ni `cote_matin`.
 */

const OUTIL = process.env.CROSSWELL_OUTIL_INTERNE ?? ''
const OUTIL_PRESENT = process.env.CROSSWELL_OUTIL_INTERNE_PRESENT === '1'
const FICHIER_REFERENCE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'reference.json')

const lignes = genererLignes()
const lignesClient = lignes.map(versLigneClient)
const coursesClient = construireCourses(lignesClient)
const JEU: Reference['jeu'] = {
  graine: GRAINE,
  courses: coursesClient.length,
  lignes: lignes.length,
  empreinte: empreinte(lignes),
}
const clientParCle = new Map(coursesClient.map((c) => [c.cle, c]))
const lignesParCle = new Map<string, LigneMonitoring[]>()
for (const l of lignes) {
  const k = cleClient(l.reunion_date, l.hippodrome, l.course_num)
  const g = lignesParCle.get(k)
  if (g) g.push(l)
  else lignesParCle.set(k, [l])
}
const estNp = (l: LigneMonitoring) => l.non_partant === true

/** Ce que les lignes brutes disent d'une course, sans passer par aucun des deux outils. */
interface Brut {
  lignes: LigneMonitoring[]
  partants: LigneMonitoring[]
  /** (v) Aucun partant classé par le modèle : `rank()` donne le rang 1 à tout le peloton. */
  sansRang: boolean
  /**
   * (v) Partants sans `pred_rank` que `rank()` fait entrer dans nos trois : il
   * les classe juste derrière les k partants classés, au rang k + 1, donc
   * dans les trois dès que k ≤ 2. Vide sinon.
   */
  sansRangDansNosTrois: LigneMonitoring[]
  /** (vi) Partants dont seule la cote d'avant-course est relevée. */
  avantSeule: LigneMonitoring[]
}

const brut = new Map<string, Brut>()
for (const [cle, rows] of lignesParCle) {
  const partants = rows.filter((l) => !estNp(l))
  const classes = partants.filter((l) => l.pred_rank != null).length
  brut.set(cle, {
    lignes: rows,
    partants,
    sansRang: partants.length > 0 && classes === 0,
    sansRangDansNosTrois: classes <= 2 ? partants.filter((l) => l.pred_rank == null) : [],
    avantSeule: partants.filter((l) => l.cote == null && l.cote_avant != null),
  })
}
const b = (cle: string) => brut.get(cle)!

/** Divergences course par course sur un champ ; vide = parité. `exclure` écarte les courses d'un écart voulu. */
function divergences(
  ref: Reference,
  champ: string,
  interne: (d: DetailCourse, cle: string) => unknown,
  client: (c: Course) => unknown,
  exclure: (cle: string) => boolean = () => false,
): string[] {
  const out: string[] = []
  for (const [cle, d] of Object.entries(ref.parCourse)) {
    const c = clientParCle.get(cle)
    if (!c) {
      out.push(`${cle} : course absente de l'app`)
      continue
    }
    if (exclure(cle)) continue
    const attendu = interne(d, cle)
    const obtenu = client(c)
    if (attendu !== obtenu) out.push(`${cle} — ${champ} : outil interne ${attendu}, app ${obtenu}`)
  }
  for (const cle of clientParCle.keys()) {
    if (!(cle in ref.parCourse)) out.push(`${cle} : course absente de l'outil interne`)
  }
  return out
}

function sansDivergence(liste: string[]) {
  expect(liste.slice(0, 20), `${liste.length} divergence(s) non listée(s) comme écart voulu`).toEqual([])
}

/** La ligne du rang 1 retenu par l'outil interne. */
const ligneRang1 = (d: DetailCourse, cle: string) =>
  d[1] == null ? null : (lignesParCle.get(cle)!.find((l) => l.horse_num === d[1]) ?? null)

/** Répartit des points [p, y] dans des tranches ; `fermeeADroite` pour la dernière. */
function compter(points: [number, number][], bornes: readonly (readonly [number, number])[], fermeeADroite: boolean) {
  return bornes.map(([bas, haut], i) => {
    const derniere = i === bornes.length - 1
    const g = points.filter(([p]) => p >= bas && (p < haut || (fermeeADroite && derniere && p === haut)))
    return { bas, n: g.length, gagnants: g.reduce((s, [, y]) => s + y, 0) }
  })
}

/**
 * Le partant le moins coté, parcouru dans l'ordre de la grille de l'app, avec
 * l'inégalité stricte des deux outils : à cote égale, le premier de la grille.
 * L'ordre de grille de l'outil interne est le même sur les partants (rang
 * effectif, puis ordre de réception = numéro ; un cheval sans rang derrière
 * les classés dans les deux cas) — ce que l'assertion course par course de
 * (vi) vérifie au passage.
 */
function moinsCote(c: Course, cote: (l: LigneMonitoring) => number | null): number | null {
  const rows = lignesParCle.get(c.cle)!
  let meilleur: { numero: number; cote: number } | null = null
  for (const p of c.liste) {
    if (p.nonPartant) continue
    const x = cote(rows.find((l) => l.horse_num === p.numero)!)
    if (x == null || x <= 0) continue
    if (!meilleur || x < meilleur.cote) meilleur = { numero: p.numero, cote: x }
  }
  return meilleur?.numero ?? null
}

/** Cote de référence de l'outil interne (`roi.ts`, `coteDeRetour`) : la clôture, sinon l'avant-course, jamais le matin. */
const coteReferenceInterne = (l: LigneMonitoring) => l.cote ?? l.cote_avant

/**
 * FACE AU MARCHÉ, COURSE PAR COURSE — la lecture commune à (iv), (v), (vi).
 *
 * Périmètre interne (`marketStats`) : jugée, rang 1, favori du marché à la cote
 * de référence. Périmètre app (`faceAuMarche`) : jugée, rang 1, favori du
 * marché à la clôture. Toute course est rangée dans exactement une case, et
 * une case inconnue est une divergence nommée.
 */
function lireMarche(ref: Reference) {
  const erreurs: string[] = []
  const interne = { n: 0, agree: 0, ourWin: 0, mktWin: 0 }
  /** Dans le périmètre interne seulement, avec la ou les causes. */
  const exclues: { cle: string; causes: ('v' | 'vi')[]; accord: number; nous: number; marche: number }[] = []
  /** (iv) Même favori du marché, arrivé premier ex æquo, mais pas le vainqueur retenu par l'outil interne. */
  const deadHeat: string[] = []
  /** (vi) Dans les deux périmètres, mais pas le même favori du marché. */
  const autreFavori: { cle: string; dAccord: number; dMarche: number }[] = []
  /** Dans les deux périmètres, sur le même favori du marché : l'ensemble où seul (iv) peut jouer. */
  const memeFavori = { courses: 0, nousInterne: 0, nousApp: 0, marcheInterne: 0, marcheApp: 0 }

  for (const [cle, d] of Object.entries(ref.parCourse)) {
    const c = clientParCle.get(cle)!
    const perimetreInterne = d[0] === 1 && d[1] != null && d[5] != null
    const perimetreApp = c.courue && c.favori != null && c.favoriMarche != null
    const iAccord = perimetreInterne && d[1] === d[5] ? 1 : 0
    const iNous = perimetreInterne && d[2] === 1 ? 1 : 0
    const iMarche = perimetreInterne && d[6] != null && d[5] === d[6] ? 1 : 0
    if (perimetreInterne) {
      interne.n++
      interne.agree += iAccord
      interne.ourWin += iNous
      interne.mktWin += iMarche
    }
    if (perimetreApp && !perimetreInterne) {
      erreurs.push(`${cle} — face au marché : comparée par l'app, pas par l'outil interne`)
      continue
    }
    if (!perimetreApp) {
      if (!perimetreInterne) continue
      const causes: ('v' | 'vi')[] = []
      if (c.favori == null) causes.push('v')
      if (c.favoriMarche == null) causes.push('vi')
      if (causes.includes('v') && !b(cle).sansRang) erreurs.push(`${cle} — face au marché : app sans rang 1 hors du cas (v)`)
      if (causes.includes('vi') && !b(cle).avantSeule.length) {
        erreurs.push(`${cle} — face au marché : app sans favori du marché hors du cas (vi)`)
      }
      if (!causes.length) erreurs.push(`${cle} — face au marché : exclue par l'app sans cause connue`)
      exclues.push({ cle, causes, accord: iAccord, nous: iNous, marche: iMarche })
      continue
    }

    const favori = c.favori!
    const favoriMarche = c.favoriMarche!
    const aAccord = favori.numero === favoriMarche.numero ? 1 : 0
    const aNous = favori.arrivee === 1 ? 1 : 0
    const aMarche = favoriMarche.arrivee === 1 ? 1 : 0
    // (iv) « nous » : notre rang 1 arrivé premier est toujours le vainqueur retenu —
    // il est en tête de la grille, et le vainqueur retenu est le premier de la
    // grille à être arrivé premier. L'écart est donc nul par construction.
    if (aNous !== iNous) erreurs.push(`${cle} — nos victoires : outil interne ${iNous}, app ${aNous}`)

    if (d[5] === favoriMarche.numero) {
      memeFavori.courses++
      memeFavori.nousInterne += iNous
      memeFavori.nousApp += aNous
      memeFavori.marcheInterne += iMarche
      memeFavori.marcheApp += aMarche
      if (aAccord !== iAccord) erreurs.push(`${cle} — accord : outil interne ${iAccord}, app ${aAccord}`)
      if (aMarche !== iMarche) {
        const premiers = b(cle).lignes.filter((l) => l.actual_place === 1).map((l) => l.horse_num)
        const expliquee =
          aMarche === 1 && premiers.length >= 2 && premiers.includes(favoriMarche.numero) && d[6] !== favoriMarche.numero
        if (expliquee) deadHeat.push(cle)
        else erreurs.push(`${cle} — victoire du marché : outil interne ${iMarche}, app ${aMarche}, hors dead heat`)
      }
    } else {
      if (!b(cle).avantSeule.length) {
        erreurs.push(`${cle} — favori du marché : outil interne ${d[5]}, app ${favoriMarche.numero}, sans cote d'avant-course seule`)
      }
      autreFavori.push({ cle, dAccord: aAccord - iAccord, dMarche: aMarche - iMarche })
    }
  }
  return { erreurs, interne, exclues, deadHeat, autreFavori, memeFavori }
}

const somme = <T,>(t: T[], f: (x: T) => number) => t.reduce((s, x) => s + f(x), 0)

/** Libellés de segment : outil interne → app. Écrits en toutes lettres, pour qu'un renommage se voie. */
const TYPE_VERS_APP: Record<string, string> = {
  Handicap: 'Handicap',
  Réclamer: 'Réclamer',
  Conditions: 'Conditions',
  'Black-type': 'Groupe & Listed',
}
const DISTANCE_VERS_APP: Record<string, string> = {
  'Sprint (<1400m)': 'Sprint (< 1 400 m)',
  'Miler (1400-1800m)': 'Mile (1 400 – 1 800 m)',
  'Intermédiaire (1800-2200m)': 'Intermédiaire (1 800 – 2 200 m)',
  'Stayer (>2200m)': 'Tenue (> 2 200 m)',
  'n/c': 'Non précisée',
}
const PELOTON_VERS_APP: Record<string, string> = {
  'Petit (≤8)': 'Petit peloton (≤ 8)',
  'Moyen (9-13)': 'Moyen (9 – 13)',
  'Grand (≥14)': 'Grand peloton (≥ 14)',
  'n/c': 'Non précisé',
}

/**
 * Segments de l'app ATTENDUS à partir de `segmentStats` de l'outil interne :
 * chaque course jugée dont le libellé ou la victoire diffère entre les deux
 * outils quitte sa case interne pour sa case app. Sert à vérifier les
 * agrégats publiés, pas seulement les libellés course par course.
 */
function segmentsAttendus(
  ref: Reference,
  dimension: 'type' | 'distance' | 'peloton',
  versApp: Record<string, string>,
  indice: 7 | 8 | 9,
  cleApp: (c: Course) => string,
) {
  const m = new Map<string, { n: number; gagnees: number }>()
  const ajouter = (label: string, n: number, g: number) => {
    const e = m.get(label) ?? { n: 0, gagnees: 0 }
    e.n += n
    e.gagnees += g
    m.set(label, e)
  }
  for (const s of ref.agregats.segments[dimension] as SegmentInterne[]) ajouter(versApp[s.label], s.n, s.hit)
  let deplacees = 0
  for (const [cle, d] of Object.entries(ref.parCourse)) {
    if (d[0] !== 1) continue
    const c = clientParCle.get(cle)!
    const li = versApp[d[indice]]
    const la = cleApp(c)
    const gi = d[2]
    const ga = c.gagne ? 1 : 0
    if (li === la && gi === ga) continue
    if (li !== la) deplacees++
    ajouter(li, -1, -gi)
    ajouter(la, 1, ga)
  }
  const attendu = [...m.entries()]
    .filter(([, e]) => e.n !== 0)
    .map(([label, e]) => ({ label, ...e }))
    .sort((x, y) => (x.label < y.label ? -1 : 1))
  const obtenu = parSegment(coursesClient, cleApp)
    .map((s) => ({ label: s.label, n: s.n, gagnees: s.gagnees }))
    .sort((x, y) => (x.label < y.label ? -1 : 1))
  return { attendu, obtenu, deplacees }
}

function blocsDeParite(obtenir: () => Reference) {
  describe('Identique à l’outil interne', () => {
    it('mêmes courses, mêmes réunions', () => {
      const ref = obtenir()
      sansDivergence(divergences(ref, 'présence', () => true, () => true))
      const bl = bilan(coursesClient)
      expect(bl.courses).toBe(ref.agregats.courses)
      expect(bl.reunions).toBe(ref.agregats.reunions)
    })

    it('courses jugées (scored), course par course et au total', () => {
      const ref = obtenir()
      sansDivergence(divergences(ref, 'jugée', (d) => d[0] === 1, (c) => c.courue))
      expect(bilan(coursesClient).jugees).toBe(ref.agregats.scored)
    })

    it('rang 1 désigné (pick.horse_num === favori.numero), hors courses sans rang — écart (v)', () => {
      sansDivergence(
        divergences(obtenir(), 'rang 1', (d) => d[1], (c) => c.favori?.numero ?? null, (cle) => b(cle).sansRang),
      )
    })

    it('victoires du rang 1 (hit), course par course, hors courses sans rang — écart (v)', () => {
      sansDivergence(
        divergences(obtenir(), 'victoire', (d) => d[2] === 1, (c) => c.gagne, (cle) => b(cle).sansRang),
      )
    })

    it('vainqueur retenu (dead heat compris)', () => {
      sansDivergence(divergences(obtenir(), 'vainqueur', (d) => d[6], (c) => c.gagnant?.numero ?? null))
    })

    it('recouvrement du trio (Σ|act3 ∩ our3|), hors chevaux sans rang entrés dans nos trois — écart (v)', () => {
      sansDivergence(
        divergences(obtenir(), 'trio', (d) => d[3], (c) => c.dansLeTrio, (cle) => b(cle).sansRangDansNosTrois.length > 0),
      )
    })

    it('favori du marché, hors courses à cote d’avant-course seule — écart (vi)', () => {
      sansDivergence(
        divergences(
          obtenir(),
          'favori du marché',
          (d) => d[5],
          (c) => c.favoriMarche?.numero ?? null,
          (cle) => b(cle).avantSeule.length > 0,
        ),
      )
    })

    it('segments de type et de distance, course par course (libellés traduits)', () => {
      const ref = obtenir()
      sansDivergence(divergences(ref, 'type', (d) => TYPE_VERS_APP[d[7]], (c) => c.type))
      sansDivergence(divergences(ref, 'distance', (d) => DISTANCE_VERS_APP[d[8]], (c) => trancheDistance(c.distance)))
      // Les frontières : 2 200 m est « Stayer » chez l'un, « Tenue » chez l'autre — la même case.
      // 0 m n'est pas « non précisée » : les deux outils testent `== null`, et rangent 0 en sprint.
      const aux = (m: number | null) =>
        Object.entries(ref.parCourse).filter(([cle]) => clientParCle.get(cle)!.distance === m)
      for (const [m, interne] of [
        [1400, 'Miler (1400-1800m)'],
        [1800, 'Intermédiaire (1800-2200m)'],
        [2200, 'Stayer (>2200m)'],
        [0, 'Sprint (<1400m)'],
        [null, 'n/c'],
      ] as const) {
        const courses = aux(m)
        expect(courses.length, `le jeu doit contenir des courses de ${m} m`).toBeGreaterThan(0)
        for (const [cle, d] of courses) expect(d[8], cle).toBe(interne)
      }
    })

    it('tranches de confiance : n et victoires par tranche (bords traités explicitement)', () => {
      const ref = obtenir()
      /*
       * Trois bords, comptés indépendamment de l'app à partir des lignes brutes
       * et du rang 1 de l'outil interne :
       * - l'outil renvoie [] sous 8 favoris au total ; l'app n'a pas ce plancher
       *   (elle se tait par tranche, sous SEUIL_TRANCHE, à l'affichage) ;
       * - l'outil exclut p = 1 de sa dernière tranche `[0,30 ; 1[` ; l'app la
       *   ferme à droite (`enTranches`) — un favori annoncé certain ne sort pas
       *   de la mesure ;
       * - écart (v) : sur une course sans rang, l'outil interne compte le point
       *   de son rang 1 (le plus petit numéro) ; l'app n'a pas de rang 1.
       */
      const favoris: [number, number][] = []
      const favorisSansRang: [number, number][] = []
      for (const [cle, d] of Object.entries(ref.parCourse)) {
        const l = ligneRang1(d, cle)
        if (d[0] !== 1 || !l || l.p_win == null) continue
        ;(b(cle).sansRang ? favorisSansRang : favoris).push([l.p_win, l.actual_place === 1 ? 1 : 0])
      }
      const bornes = Object.values(BORNES_CONFIANCE_INTERNE)
      expect(BORNES_CONFIANCE).toEqual(bornes)

      const obtenu = confiance(coursesClient).map((t) => ({ bas: t.bas, n: t.n, gagnants: t.gagnants }))
      if (ref.agregats.confiance.length === 0) {
        expect(favoris.length + favorisSansRang.length, 'outil interne vide alors qu’il a au moins 8 favoris').toBeLessThan(8)
        expect(obtenu).toEqual(compter(favoris, bornes, true).filter((t) => t.n > 0))
        return
      }
      const certains = favoris.filter(([p]) => p === 1)
      const retires = compter(favorisSansRang, bornes, false)
      const attendu = bornes
        .map(([bas], i) => {
          const bin = ref.agregats.confiance.find((x) => BORNES_CONFIANCE_INTERNE[x.label][0] === bas)
          const dernier = i === bornes.length - 1
          return {
            bas,
            n: (bin?.n ?? 0) - retires[i].n + (dernier ? certains.length : 0),
            gagnants:
              (bin?.victoires ?? 0) - retires[i].gagnants + (dernier ? certains.filter(([, y]) => y === 1).length : 0),
          }
        })
        .filter((t) => t.n > 0)
      expect(obtenu).toEqual(attendu)
    })
  })

  describe('Écarts voulus, mesurés exactement', () => {
    it('(i) calibration : points de l’app = points internes MOINS les non-partants', () => {
      const ref = obtenir()
      /*
       * L'outil interne compte un non-partant en perdant, avec sa probabilité du
       * matin (`winProbPoints`) ; l'app l'exclut (`pointsCalibration`). On
       * retire donc des tranches internes les points des non-partants des
       * courses jugées, comptés sur les lignes brutes, et on rajoute à la
       * dernière tranche les points p = 1 que l'outil interne perd à sa borne
       * ouverte.
       */
      const np: [number, number][] = []
      const certains: [number, number][] = []
      for (const [cle, d] of Object.entries(ref.parCourse)) {
        if (d[0] !== 1) continue
        for (const l of lignesParCle.get(cle)!) {
          if (l.p_win == null) continue
          if (estNp(l)) np.push([l.p_win, l.actual_place === 1 ? 1 : 0])
          else if (l.p_win === 1) certains.push([1, l.actual_place === 1 ? 1 : 0])
        }
      }
      expect(np.length, 'le jeu doit contenir des non-partants à probabilité connue').toBeGreaterThan(0)
      const retires = compter(np, BORNES_CALIBRATION_INTERNE, false)
      const attendu = BORNES_CALIBRATION_INTERNE.map(([bas], i) => {
        const interne = ref.agregats.calibration.find((t) => t.bas === bas)
        const dernier = i === BORNES_CALIBRATION_INTERNE.length - 1
        return {
          bas,
          n: (interne?.n ?? 0) - retires[i].n + (dernier ? certains.length : 0),
          gagnants: (interne?.gagnants ?? 0) - retires[i].gagnants + (dernier ? certains.filter(([, y]) => y).length : 0),
        }
      }).filter((t) => t.n > 0)
      const obtenu = calibration(coursesClient, BORNES_CALIBRATION_INTERNE).map((t) => ({
        bas: t.bas,
        n: t.n,
        gagnants: t.gagnants,
      }))
      expect(obtenu).toEqual(attendu)
      // Un non-partant n'a jamais gagné : l'écart ne porte que sur les effectifs.
      expect(retires.reduce((s, t) => s + t.gagnants, 0)).toBe(0)
    })

    it('(ii) « dans les trois » (app) contre « favori placé » aux places payées (outil interne)', () => {
      const ref = obtenir()
      /*
       * Formule dérivée de `buildCourses` : l'outil interne compte placé un rang 1
       * arrivé au plus à `npl`, où npl = placesPayees(field_size − non-partants,
       * partants) = 3 dès 8, 2 de 4 à 7, 0 en dessous. L'app compte placé tout
       * rang 1 arrivé dans les trois. L'écart, course par course, est donc
       * EXACTEMENT : rang 1 arrivé 1er à 3e ET au-delà de npl.
       *
       * Attention au double compte de l'outil interne : quand la prédiction du
       * matin a déjà réaligné `field_size`, il retire les non-partants une
       * seconde fois (8 déclarés − 1 retiré réaligné = 7, moins 1 = 6 → 2 places).
       *
       * Les courses sans rang relèvent de (v) : l'app n'y a pas de rang 1, donc
       * jamais de place, quel que soit le cheval que l'outil interne y a retenu.
       */
      const ecarts: string[] = []
      let explique = 0
      let troisiemeSur4a7 = 0
      let petitPeloton = 0
      let doubleSoustraction = 0
      let placesSansRang = 0
      for (const [cle, d] of Object.entries(ref.parCourse)) {
        const rows = lignesParCle.get(cle)!
        const c = clientParCle.get(cle)!
        if (b(cle).sansRang) {
          placesSansRang += d[4]
          if (c.place) ecarts.push(`${cle} — place : app true sur une course sans rang`)
          continue
        }
        const nbNp = rows.filter(estNp).length
        const partants = rows.length - nbNp
        const fs = rows[0].field_size
        const nInterne = fs != null ? fs - nbNp : partants
        const npl = nInterne >= 8 ? 3 : nInterne >= 4 ? 2 : 0
        const place = ligneRang1(d, cle)?.actual_place ?? null
        const ecartVoulu = d[0] === 1 && place != null && place <= 3 && place > npl
        if (ecartVoulu) {
          explique++
          if (nInterne !== partants) doubleSoustraction++
          else if (partants < 4) petitPeloton++
          else if (place === 3 && partants >= 4 && partants <= 7) troisiemeSur4a7++
          else ecarts.push(`${cle} — écart de place hors des trois cas connus (partants ${partants}, place ${place})`)
        }
        const attendu = d[4] === 1 || ecartVoulu
        if (c.place !== attendu) {
          ecarts.push(`${cle} — place : app ${c.place}, attendu ${attendu} (outil interne ${d[4] === 1}, npl ${npl}, arrivée ${place})`)
        }
      }
      sansDivergence(ecarts)
      expect(bilan(coursesClient).placees - (ref.agregats.pickPlaced - placesSansRang)).toBe(explique)
      expect(explique).toBe(troisiemeSur4a7 + petitPeloton + doubleSoustraction)
      // Le cas annoncé au lot 1 est bien le cas dominant, et chacun est exercé.
      expect(troisiemeSur4a7).toBeGreaterThan(petitPeloton)
      expect(troisiemeSur4a7).toBeGreaterThan(0)
      expect(doubleSoustraction).toBeGreaterThan(0)
    })

    it('(iii) repère du hasard : moyenne des 1/partants au départ, recalculée sur les lignes brutes', () => {
      const ref = obtenir()
      let n = 0
      let victoire = 0
      let dansLesTrois = 0
      for (const [cle, d] of Object.entries(ref.parCourse)) {
        if (d[0] !== 1) continue
        const partants = b(cle).partants.length
        if (!partants) continue
        n++
        victoire += 1 / partants
        dansLesTrois += Math.min(1, 3 / partants)
      }
      const h = repereHasard(coursesClient)
      expect(h.n).toBe(n)
      expect(h.victoire).toBeCloseTo(victoire / n, 12)
      expect(h.dansLesTrois).toBeCloseTo(dansLesTrois / n, 12)
    })

    it('(iv) dead heat : le favori du marché ex æquo premier compte une victoire ; « nous » inchangé par construction', () => {
      const ref = obtenir()
      const m = lireMarche(ref)
      sansDivergence(m.erreurs)
      /*
       * Sur les courses que les deux outils comparent avec le MÊME favori du
       * marché — là où ni (v) ni (vi) ne jouent —, l'app compte une victoire du
       * marché de plus exactement sur les dead heats où le favori du marché est
       * arrivé premier sans être le vainqueur retenu (le mieux classé par nous).
       * Nos victoires, elles, ne bougent pas : notre rang 1 arrivé premier est
       * toujours le vainqueur retenu.
       */
      expect(m.memeFavori.marcheApp).toBe(m.memeFavori.marcheInterne + m.deadHeat.length)
      expect(m.memeFavori.nousApp).toBe(m.memeFavori.nousInterne)
      expect(m.deadHeat.length, 'le jeu doit contenir un dead heat avec le favori du marché').toBeGreaterThan(0)
      for (const cle of m.deadHeat) {
        const c = clientParCle.get(cle)!
        // Le vainqueur retenu est l'autre premier, mieux placé dans notre grille.
        expect(c.gagnant?.numero, cle).toBe(ref.parCourse[cle][6])
        expect(c.gagnant?.numero, cle).not.toBe(c.favoriMarche?.numero)
        expect(c.favoriMarche?.arrivee, cle).toBe(1)
      }
    })

    it('(v) cheval sans pred_rank : aucun rang dans l’app, rang_effectif (NULLS LAST) dans l’outil interne', () => {
      const ref = obtenir()
      const ecarts: string[] = []
      let sansRangJugees = 0
      let victoiresRetirees = 0
      let trioRetire = 0
      let coursesTrio = 0
      for (const [cle, d] of Object.entries(ref.parCourse)) {
        const c = clientParCle.get(cle)!
        const br = b(cle)
        // Partout : un cheval sans pred_rank n'a pas de rang, n'est ni notre rang 1 ni dans nos trois.
        for (const l of br.partants.filter((x) => x.pred_rank == null)) {
          const p = c.liste.find((x) => x.numero === l.horse_num)!
          if (p.rang != null) ecarts.push(`${cle} — n° ${l.horse_num} sans pred_rank : rang app ${p.rang}`)
          if (c.podium.some((x) => x.numero === l.horse_num)) ecarts.push(`${cle} — n° ${l.horse_num} sans pred_rank dans le podium`)
        }
        if (br.sansRang) {
          // `rank()` donne le rang 1 à tout le peloton ; l'outil interne prend le premier reçu, le plus petit numéro.
          const premier = Math.min(...br.partants.map((l) => l.horse_num))
          if (d[1] !== premier) ecarts.push(`${cle} — rang 1 interne : ${d[1]}, attendu n° ${premier}`)
          if (c.favori != null) ecarts.push(`${cle} — rang 1 app : ${c.favori.numero} sur une course sans rang`)
          if (c.gagne || c.place) ecarts.push(`${cle} — course sans rang gagnée ou placée par l'app`)
          if (d[0] === 1) {
            sansRangJugees++
            victoiresRetirees += d[2]
          }
        }
        if (br.sansRangDansNosTrois.length) {
          // L'outil interne les compte dans our3 ; l'app non. Seuls ceux arrivés dans les trois pèsent sur le trio.
          const contribution = br.sansRangDansNosTrois.filter((l) => l.actual_place && l.actual_place <= 3).length
          if (c.dansLeTrio !== d[3] - contribution) {
            ecarts.push(`${cle} — trio : app ${c.dansLeTrio}, attendu ${d[3]} − ${contribution}`)
          }
          if (d[0] === 1) {
            coursesTrio++
            trioRetire += contribution
          }
        }
      }
      sansDivergence(ecarts)
      const bl = bilan(coursesClient)
      expect(bl.gagnees).toBe(ref.agregats.hit - victoiresRetirees)
      expect(bl.trio).toBe(ref.agregats.trio - trioRetire)
      // Les deux cas ajoutés au générateur sont exercés, jugés.
      expect(sansRangJugees, 'courses entières sans pred_rank, jugées').toBeGreaterThan(0)
      expect(coursesTrio - sansRangJugees, 'courses à un ou deux partants classés, jugées').toBeGreaterThan(0)
      expect(trioRetire, 'chevaux sans rang arrivés dans les trois').toBeGreaterThan(0)
    })

    it('(vi) cote d’avant-course : l’outil interne désigne sur clôture ?? avant-course, l’app sur la clôture seule', () => {
      const ref = obtenir()
      // La vue client ne sert pas l'avant-course : l'app ne doit jamais la recevoir.
      expect(lignesClient.some((l) => 'cote_avant' in l || 'cote_matin' in l)).toBe(false)
      const ecarts: string[] = []
      let sansFavoriApp = 0
      let autreCheval = 0
      for (const [cle, d] of Object.entries(ref.parCourse)) {
        const c = clientParCle.get(cle)!
        // Formule de l'outil interne (`aggregate.ts:107-110`, `roi.ts:72-79`), course par course.
        const interne = moinsCote(c, coteReferenceInterne)
        if (d[5] !== interne) ecarts.push(`${cle} — favori du marché interne : ${d[5]}, formule ${interne}`)
        const app = moinsCote(c, (l) => l.cote)
        if ((c.favoriMarche?.numero ?? null) !== app) ecarts.push(`${cle} — favori du marché app : ${c.favoriMarche?.numero}, formule ${app}`)
        if (d[5] !== app) {
          if (!b(cle).avantSeule.length) ecarts.push(`${cle} — favoris différents sans cote d'avant-course seule`)
          if (d[0] !== 1) continue
          if (app == null) sansFavoriApp++
          else autreCheval++
        }
      }
      sansDivergence(ecarts)
      expect(sansFavoriApp, 'courses jugées dont les partants cotés n’ont que l’avant-course').toBeGreaterThan(0)
      expect(autreCheval, 'courses jugées où l’avant-course désigne un autre favori').toBeGreaterThan(0)
    })

    it('(iv) (v) (vi) face au marché : totaux de l’app = totaux internes corrigés course par course', () => {
      const ref = obtenir()
      const m = lireMarche(ref)
      sansDivergence(m.erreurs)
      // La lecture course par course redonne exactement `marketStats`.
      expect(ref.agregats.marche).toEqual(m.interne)
      const app = faceAuMarche(coursesClient)!
      const r = ref.agregats.marche!
      /*
       * n       : − les courses que l'app ne compare pas, faute de rang 1 (v) ou de clôture (vi) ;
       * nous    : − nos victoires sur ces courses (aucune autre correction, voir (iv)) ;
       * accord  : − l'accord sur ces courses, ± le changement d'accord quand l'avant-course change de favori (vi) ;
       * marché  : − les victoires du marché sur ces courses, + les dead heats (iv), ± le changement de favori (vi).
       */
      expect(app.n).toBe(r.n - m.exclues.length)
      expect(app.nous).toBe(r.ourWin - somme(m.exclues, (e) => e.nous))
      expect(app.accord).toBe(r.agree - somme(m.exclues, (e) => e.accord) + somme(m.autreFavori, (x) => x.dAccord))
      expect(app.marche).toBe(
        r.mktWin - somme(m.exclues, (e) => e.marche) + m.deadHeat.length + somme(m.autreFavori, (x) => x.dMarche),
      )
      // Chaque cause est exercée.
      expect(m.exclues.filter((e) => e.causes.includes('v')).length, 'exclues faute de rang (v)').toBeGreaterThan(0)
      expect(m.exclues.filter((e) => e.causes.includes('vi')).length, 'exclues faute de clôture (vi)').toBeGreaterThan(0)
      expect(m.autreFavori.length, 'autre favori du marché (vi)').toBeGreaterThan(0)
    })

    it('(vii) segments : type et distance identiques, peloton sur les partants au départ contre field_size', () => {
      const ref = obtenir()
      /*
       * L'outil interne range une course par `fieldBucket(field_size)` : les
       * DÉCLARÉS, NULL compris (« n/c »). L'app la range par
       * `tranchePeloton(partants au départ)`. Mêmes seuils (8 et 13), vérifiés en
       * appliquant la fonction de l'app à `field_size` : on doit retrouver le
       * libellé interne sur chaque course.
       */
      const ecarts: string[] = []
      let fieldNull = 0
      let nonPartantsInclus = 0
      for (const [cle, d] of Object.entries(ref.parCourse)) {
        const c = clientParCle.get(cle)!
        const br = b(cle)
        const fs = br.lignes[0].field_size
        if (PELOTON_VERS_APP[d[9]] !== tranchePeloton(fs)) ecarts.push(`${cle} — peloton interne : ${d[9]}, field_size ${fs}`)
        if (tranchePeloton(c.partants) !== tranchePeloton(br.partants.length)) ecarts.push(`${cle} — peloton app sur ${c.partants} partants`)
        if (fs != null && fs < br.partants.length) ecarts.push(`${cle} — field_size ${fs} sous les ${br.partants.length} partants au départ`)
        if (PELOTON_VERS_APP[d[9]] === tranchePeloton(c.partants)) continue
        if (d[0] !== 1) continue
        if (fs == null) fieldNull++
        else nonPartantsInclus++
      }
      sansDivergence(ecarts)
      expect(fieldNull, 'courses jugées sans field_size').toBeGreaterThan(0)
      expect(nonPartantsInclus, 'courses jugées changées de case par leurs non-partants').toBeGreaterThan(0)

      // Les agrégats publiés : type et distance ne déplacent aucune course ; le peloton, exactement les précédentes.
      const type = segmentsAttendus(ref, 'type', TYPE_VERS_APP, 7, (c) => c.type)
      const distance = segmentsAttendus(ref, 'distance', DISTANCE_VERS_APP, 8, (c) => trancheDistance(c.distance))
      const peloton = segmentsAttendus(ref, 'peloton', PELOTON_VERS_APP, 9, (c) => tranchePeloton(c.partants))
      expect(type.obtenu).toEqual(type.attendu)
      expect(distance.obtenu).toEqual(distance.attendu)
      expect(peloton.obtenu).toEqual(peloton.attendu)
      expect([type.deplacees, distance.deplacees, peloton.deplacees]).toEqual([0, 0, fieldNull + nonPartantsInclus])
    })
  })
}

/* ─── Valeurs figées, indépendantes des deux codes ─────────────────────────── */

/** Une ligne de `monitoring_predictions` écrite à la main ; tout ce qui n'est pas donné est neutre. */
function ligneFixe(champs: Partial<LigneMonitoring> & Pick<LigneMonitoring, 'reunion_date' | 'hippodrome' | 'course_num' | 'horse_num'>): LigneMonitoring {
  return {
    course_nom: null,
    categorie: null,
    is_handicap: null,
    distance: 1600,
    field_size: null,
    horse_name: null,
    id_fg: null,
    pred_rank: champs.horse_num,
    p_win: null,
    p_place: null,
    actual_place: null,
    model_version: MODELE,
    cote: null,
    rapport_gagnant: null,
    rapport_place: null,
    non_partant: false,
    non_partant_le: null,
    rang_effectif: champs.horse_num,
    heure_depart: null,
    cote_matin: null,
    cote_matin_le: null,
    cote_avant: null,
    cote_avant_le: null,
    ...champs,
  }
}

describe('(iii) repère du hasard — valeur figée, calculée à la main', () => {
  /*
   * Trois courses jugées : 6 partants (field_size 6), 16 partants (field_size
   * NULL), 10 déclarés dont un non-partant (field_size 10, soit 9 au départ).
   * Une quatrième, non jugée, ne compte pas.
   *
   *   app, victoire       = (1/6 + 1/16 + 1/9) / 3        = 49/432
   *   app, dans les trois = (3/6 + 3/16 + 3/9) / 3        = 49/144
   *
   * Définitions de l'outil interne, qui ne calcule le hasard nulle part dans le
   * suivi :
   *   - constante 11 % (`KpiCards.tsx:5`, `PerformanceChart.tsx:100`) : écart 49/432 − 11/100 = 37/10 800 ;
   *   - vue Modèles, courbe (`ModelComparison.tsx:72`), moyenne des 1/(field_size || 10)
   *     = (1/6 + 1/10 + 1/10) / 3 = 11/90 : écart −19/2 160 ; en place, 11/30 : écart −19/720 ;
   *   - vue Modèles, tableau (`:84`), 1 / moyenne(field_size || 10) = 3/26 : écart −11/5 616.
   * Les signes diffèrent : la constante surestime notre avance sur ce jeu, la vue
   * Modèles la sous-estime (elle compte le non-partant et remplace NULL par 10).
   */
  const DATE = '2026-09-01'
  const HIPPO = 'VICHY'
  const course = (num: number, declares: number, fieldSize: number | null, np: number[], jugee: boolean) =>
    Array.from({ length: declares }, (_, i) =>
      ligneFixe({
        reunion_date: DATE,
        hippodrome: HIPPO,
        course_num: num,
        horse_num: i + 1,
        field_size: fieldSize,
        non_partant: np.includes(i + 1),
        actual_place: jugee && i === 0 ? 1 : null,
      }),
    )
  const rows = [...course(1, 6, 6, [], true), ...course(2, 16, null, [], true), ...course(3, 10, 10, [4], true), ...course(4, 12, 12, [], false)]
  for (const num of [1, 2, 3, 4]) rangsEffectifsSql(rows.filter((l) => l.course_num === num))
  const h = repereHasard(construireCourses(rows.map(versLigneClient)))

  it('app : 49/432 en victoire, 49/144 dans les trois, sur 3 courses', () => {
    expect(h.n).toBe(3)
    expect(h.victoire).toBeCloseTo(49 / 432, 14)
    expect(h.dansLesTrois).toBeCloseTo(49 / 144, 14)
  })

  it('écart mesuré avec la constante interne de 11 % : +37/10 800', () => {
    expect(h.victoire - 0.11).toBeCloseTo(37 / 10800, 14)
  })

  it('écart mesuré avec la vue Modèles (field_size || 10) : −19/2 160 (courbe), −11/5 616 (tableau), −19/720 (place)', () => {
    const champs = [6, 10, 10]
    const courbe = champs.reduce((s, f) => s + 1 / f, 0) / 3
    const tableau = 1 / (champs.reduce((s, f) => s + f, 0) / 3)
    const place = champs.reduce((s, f) => s + Math.min(1, 3 / f), 0) / 3
    expect(courbe).toBeCloseTo(11 / 90, 14)
    expect(tableau).toBeCloseTo(3 / 26, 14)
    expect(h.victoire - courbe).toBeCloseTo(-19 / 2160, 14)
    expect(h.victoire - tableau).toBeCloseTo(-11 / 5616, 14)
    expect(h.dansLesTrois - place).toBeCloseTo(-19 / 720, 14)
  })
})

describe('rank() de la vue — sortie réelle de la base, figée', () => {
  /*
   * Extraites de `client_predictions` par l'orchestrateur : horse_num, pred_rank,
   * non_partant, rang_effectif, actual_place. C'est ce que Postgres a VRAIMENT
   * calculé — le seul point du test qui ne dépend pas d'une copie JavaScript de
   * `rank()`. Trois courses où notre rang 1 publié est non partant ; la dernière
   * en a deux, dont un classé derrière un partant (n° 16 publié 15e).
   */
  type LigneVue = [numero: number, predRank: number, nonPartant: boolean, rangEffectif: number | null, place: number | null]
  const COURSES: {
    date: string
    hippodrome: string
    num: number
    lignes: LigneVue[]
    attendu: { favori: number; arrivee: number | null; place: boolean; retire: number; partants: number; nonPartants: number; gagnant: number }
  }[] = [
    {
      date: '2026-08-20',
      hippodrome: "LION D'ANGERS",
      num: 6,
      lignes: [
        [1, 1, true, null, null], [6, 2, false, 1, 2], [9, 3, false, 2, null], [8, 4, false, 3, 1],
        [10, 5, false, 4, 3], [7, 6, false, 5, null], [11, 7, false, 6, 7], [3, 8, false, 7, 4],
        [2, 9, false, 8, null], [5, 10, false, 9, 5], [4, 11, false, 10, 6],
      ],
      attendu: { favori: 6, arrivee: 2, place: true, retire: 1, partants: 10, nonPartants: 1, gagnant: 8 },
    },
    {
      date: '2026-08-23',
      hippodrome: 'DEAUVILLE',
      num: 4,
      lignes: [
        [4, 1, true, null, null], [8, 2, false, 1, 3], [5, 3, false, 2, 4], [7, 4, false, 3, 1],
        [6, 5, false, 4, 5], [2, 6, false, 5, null], [1, 7, false, 6, null], [3, 8, false, 7, 2],
      ],
      attendu: { favori: 8, arrivee: 3, place: true, retire: 4, partants: 7, nonPartants: 1, gagnant: 7 },
    },
    {
      date: '2026-08-26',
      hippodrome: 'LA TESTE-BA',
      num: 8,
      lignes: [
        [5, 1, true, null, null], [7, 2, false, 1, null], [14, 3, false, 2, 2], [1, 4, false, 3, 3],
        [9, 5, false, 4, 1], [2, 6, false, 5, 7], [12, 7, false, 6, 4], [11, 8, false, 7, null],
        [6, 9, false, 8, null], [3, 10, false, 9, 6], [8, 11, false, 10, null], [4, 12, false, 11, null],
        [10, 13, false, 12, null], [13, 14, false, 13, 5], [16, 15, true, null, null], [15, 16, false, 14, null],
      ],
      attendu: { favori: 7, arrivee: null, place: false, retire: 5, partants: 14, nonPartants: 2, gagnant: 9 },
    },
  ]

  const versLignes = (x: (typeof COURSES)[number]) =>
    x.lignes.map(([numero, predRank, np, rang, place]) =>
      ligneFixe({
        reunion_date: x.date,
        hippodrome: x.hippodrome,
        course_num: x.num,
        horse_num: numero,
        pred_rank: predRank,
        non_partant: np,
        rang_effectif: rang,
        actual_place: place,
      }),
    )

  for (const x of COURSES) {
    const cle = cleClient(x.date, x.hippodrome, x.num)

    it(`${cle} — rangsEffectifsSql du générateur reproduit rang_effectif de la vue`, () => {
      const reel = versLignes(x)
      const recalcule = reel.map((l) => ({ ...l, rang_effectif: null }))
      rangsEffectifsSql(recalcule)
      expect(recalcule.map((l) => [l.horse_num, l.rang_effectif])).toEqual(reel.map((l) => [l.horse_num, l.rang_effectif]))
    })

    it(`${cle} — construireCourses : favori n° ${x.attendu.favori}, rang 1 publié n° ${x.attendu.retire} retiré`, () => {
      const courses = construireCourses(versLignes(x).map(versLigneClient))
      expect(courses).toHaveLength(1)
      const c = courses[0]
      expect(c.cle).toBe(cle)
      expect(c.courue).toBe(true)
      expect(c.favori?.numero).toBe(x.attendu.favori)
      expect(c.favori?.arrivee).toBe(x.attendu.arrivee)
      expect(c.gagne).toBe(false) // battu dans les trois cas
      expect(c.place).toBe(x.attendu.place)
      expect(c.favoriRetire?.numero).toBe(x.attendu.retire)
      expect(c.partants).toBe(x.attendu.partants)
      expect(c.nonPartants).toBe(x.attendu.nonPartants)
      expect(c.gagnant?.numero).toBe(x.attendu.gagnant)
    })
  }
})

describe('Jeu de parité généré', () => {
  it('est déterministe', () => {
    expect(empreinte(genererLignes())).toBe(JEU.empreinte)
  })

  it('exerce chaque cas limite', () => {
    const cas = {
      courses: 0, np: 0, npRang1Juge: 0, npNullSansCote: 0, deadHeat: 0, exAequoRang1: 0,
      pWinNull: 0, coursesSansProba: 0, coupe5: 0, coupe7: 0, nonJugees: 0, vainqueurAbsent: 0,
      fieldRealigne: 0, fieldNull: 0, egaliteCoteTete: 0, certitude: 0, predRankNull: 0, peloton3: 0, peloton18: 0,
      // Cas ajoutés après la relecture du lot 1.
      sansRangJugee: 0, unOuDeuxClassesJugee: 0, clotureEtAvant: 0, avantSeuleJugee: 0, sansClotureJugee: 0,
      distance0: 0, distance1400: 0, distance1800: 0, distance2200: 0, distanceNull: 0,
    }
    for (const [cle, rows] of lignesParCle) {
      const br = b(cle)
      cas.courses++
      const places = rows.map((l) => l.actual_place).filter((p): p is number => p != null)
      const jugee = places.length > 0
      const partants = br.partants
      const cotes = partants.map((l) => l.cote).filter((x): x is number => x != null)
      cas.np += rows.filter(estNp).length
      if (jugee && rows.some((l) => estNp(l) && l.pred_rank === 1)) cas.npRang1Juge++
      if (!cotes.length && rows.some((l) => l.non_partant == null)) cas.npNullSansCote++
      if (places.filter((p) => p === 1).length >= 2) cas.deadHeat++
      if (partants.filter((l) => l.rang_effectif === 1).length >= 2) cas.exAequoRang1++
      cas.pWinNull += rows.filter((l) => l.p_win == null).length
      if (rows.every((l) => l.p_win == null)) cas.coursesSansProba++
      if (jugee && Math.max(...places) === 5 && partants.length > 5) cas.coupe5++
      if (jugee && Math.max(...places) === 7 && partants.length > 7) cas.coupe7++
      if (!jugee) cas.nonJugees++
      if (jugee && !places.includes(1)) cas.vainqueurAbsent++
      if (rows[0].field_size != null && rows[0].field_size < rows.length) cas.fieldRealigne++
      if (rows[0].field_size == null) cas.fieldNull++
      if (cotes.length >= 2 && [...cotes].sort((x, y) => x - y)[0] === [...cotes].sort((x, y) => x - y)[1]) cas.egaliteCoteTete++
      if (jugee && partants.some((l) => l.rang_effectif === 1 && l.p_win === 1)) cas.certitude++
      cas.predRankNull += rows.filter((l) => l.pred_rank == null).length
      if (rows.length === 3) cas.peloton3++
      if (rows.length === 18) cas.peloton18++
      if (jugee && br.sansRang) cas.sansRangJugee++
      if (jugee && !br.sansRang && br.sansRangDansNosTrois.length) cas.unOuDeuxClassesJugee++
      if (partants.some((l) => l.cote != null && l.cote_avant != null)) cas.clotureEtAvant++
      if (jugee && br.avantSeule.length && cotes.length) cas.avantSeuleJugee++
      if (jugee && br.avantSeule.length && !cotes.length) cas.sansClotureJugee++
      const distance = rows[0].distance
      if (distance === 0) cas.distance0++
      if (distance === 1400) cas.distance1400++
      if (distance === 1800) cas.distance1800++
      if (distance === 2200) cas.distance2200++
      if (distance == null) cas.distanceNull++
    }
    expect(cas.courses).toBeGreaterThanOrEqual(3000)
    expect(cas.npRang1Juge).toBeGreaterThanOrEqual(30)
    expect(cas.exAequoRang1).toBeGreaterThanOrEqual(10)
    expect(cas.deadHeat).toBeGreaterThanOrEqual(5)
    for (const [nom, v] of Object.entries(cas)) expect(v, nom).toBeGreaterThan(0)
  })

  it('applique rangsEffectifsSql à chaque course (NULLS LAST, pairs, NULL pour un non-partant)', () => {
    /*
     * Cohérence interne du générateur, pas une preuve contre Postgres : cette
     * formule est la même règle écrite autrement. L'ancrage réel est le bloc
     * « rank() de la vue — sortie réelle de la base, figée ».
     */
    for (const rows of lignesParCle.values()) {
      const partants = rows.filter((l) => !estNp(l))
      for (const l of rows) {
        if (estNp(l)) {
          expect(l.rang_effectif).toBeNull()
          continue
        }
        const devant = partants.filter((o) =>
          l.pred_rank == null ? o.pred_rank != null : o.pred_rank != null && o.pred_rank < l.pred_rank,
        ).length
        expect(l.rang_effectif).toBe(devant + 1)
      }
    }
  })
})

describe.skipIf(!OUTIL_PRESENT)('Parité en direct — code réel de l’outil interne', () => {
  let mod: ModuleInterne
  let ref: Reference

  beforeAll(async () => {
    const fichier = path.join(OUTIL, 'src', 'lib', 'aggregate.ts').replace(/\\/g, '/')
    mod = (await import(/* @vite-ignore */ fichier)) as ModuleInterne
    ref = extraireReference(mod, lignes, JEU, commitOutilInterne())
  })

  it('les tranches de calibration de l’outil interne sont celles recopiées ici', () => {
    const source = readFileSync(path.join(OUTIL, 'src', 'components', 'CalibrationChart.tsx'), 'utf8')
    const bins = /const BINS[^=]*=\s*(\[.*\])\s*$/m.exec(source)
    expect(bins, 'constante BINS introuvable dans CalibrationChart.tsx').not.toBeNull()
    expect(JSON.parse(bins![1])).toEqual(BORNES_CALIBRATION_INTERNE)
    expect(source).toContain('p[0] >= b[0] && p[0] < b[1]')
  })

  it('l’outil interne départage un ex æquo au rang 1 par l’ordre des lignes ; l’app, par le numéro', () => {
    /*
     * ÉCART DÉCOUVERT, NON VOULU, CÔTÉ OUTIL INTERNE. Son tri (`rs.sort` sur le
     * rang seul) est stable : entre deux partants de même rang effectif, il garde
     * l'ordre de réception — et sa pagination (`reunion_date, course_num,
     * pred_rank`) ne fixe pas cet ordre. L'app départage par le numéro. Le jeu
     * est livré dans l'ordre de la pagination client (numéro croissant), où les
     * deux coïncident ; inversé, seules les courses à ex æquo au rang 1 changent
     * (les courses sans rang en font partie : tout leur peloton est rang 1).
     */
    const inverse = [...lignes].reverse()
    const coursesInverse = mod.buildCourses(inverse.map((l) => ({ ...l })))
    const changees = coursesInverse
      .filter((c) => (c.pick?.horse_num ?? null) !== ref.parCourse[cleClient(c.date, c.hippo, c.num)][1])
      .map((c) => cleClient(c.date, c.hippo, c.num))
      .sort()
    const exAequo = [...lignesParCle.entries()]
      .filter(([, rows]) => rows.filter((l) => !estNp(l) && l.rang_effectif === 1).length >= 2)
      .map(([cle]) => cle)
      .sort()
    expect(changees).toEqual(exAequo)
    expect(exAequo.length).toBeGreaterThan(0)

    const clientInverse = new Map(construireCourses(inverse.map(versLigneClient)).map((c) => [c.cle, c.favori?.numero ?? null]))
    for (const c of coursesClient) expect(clientInverse.get(c.cle), c.cle).toBe(c.favori?.numero ?? null)
  })

  it('tests/parite/reference.json reflète l’outil interne actuel', () => {
    if (process.env.MAJ_REFERENCE === '1' || !existsSync(FICHIER_REFERENCE)) {
      writeFileSync(FICHIER_REFERENCE, serialiserReference(ref), 'utf8')
      return
    }
    const fige = JSON.parse(readFileSync(FICHIER_REFERENCE, 'utf8')) as Reference
    expect(
      differencesReference(ref, fige),
      'L’outil interne ou le générateur a changé depuis l’instantané : vérifier la cause, puis régénérer (tests/parite/README.md).',
    ).toEqual([])
  })

  blocsDeParite(() => ref)
})

describe('Parité figée — instantané tests/parite/reference.json', () => {
  let ref: Reference

  beforeAll(() => {
    if (!existsSync(FICHIER_REFERENCE)) {
      throw new Error(
        'tests/parite/reference.json manquant : lancer `npm run parite` sur un poste où l’outil interne est présent.',
      )
    }
    ref = JSON.parse(readFileSync(FICHIER_REFERENCE, 'utf8')) as Reference
  })

  it('l’instantané porte sur ce jeu généré (graine, taille, empreinte)', () => {
    expect(ref.jeu).toEqual(JEU)
  })

  blocsDeParite(() => ref)
})

/** Commit de l'outil interne, marqué s'il a des modifications non commitées dans `src/lib`. */
function commitOutilInterne(): string | null {
  try {
    const hash = execFileSync('git', ['-C', OUTIL, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()
    const modifie = execFileSync('git', ['-C', OUTIL, 'status', '--porcelain', '--', 'src/lib', 'src/types.ts'], {
      encoding: 'utf8',
    }).trim()
    return modifie ? `${hash} (src/lib modifié)` : hash
  } catch {
    return null
  }
}
