import type { LignePrediction } from '@/types'

/**
 * GÉNÉRATEUR DU JEU DE PARITÉ — des lignes au format de `monitoring_predictions`,
 * pour un seul modèle, fabriquées pour contenir TOUS les cas où l'app et l'outil
 * interne pourraient diverger.
 *
 * Il n'imite pas la base en volume : il la force aux coins. Les proportions sont
 * gonflées là où un cas rare suffirait à casser la parité (rang 1 retiré,
 * ex æquo, dead heat, vainqueur absent de nos lignes), pour que chaque règle soit
 * exercée des dizaines de fois et pas une seule par hasard.
 *
 * DÉTERMINISME STRICT. La graine est fixe et le tirage n'utilise QUE les quatre
 * opérations et `Math.round`/`Math.floor`, correctement arrondies par la norme
 * IEEE 754 : aucun `Math.exp`, `Math.log` ou `Math.cos`, dont la dernière
 * décimale peut varier d'un moteur JavaScript à l'autre. Le même jeu sort donc
 * sur n'importe quelle machine, et l'instantané `reference.json` reste valable
 * en CI. Son empreinte y est stockée : un générateur modifié se voit tout de suite.
 *
 * DEUX FLUX ALÉATOIRES. Le premier (`GRAINE`) fabrique le jeu d'origine ; le
 * second (`GRAINE_CAS_AJOUTES`) ne sert qu'aux cas ajoutés après la relecture du
 * lot 1 (courses sans rang, cotes d'avant-course, distance 0). Les ajouter au
 * premier flux aurait décalé chaque tirage suivant et redessiné tout le jeu :
 * avec un flux à part, les courses d'origine gardent leurs pelotons, leurs
 * arrivées et leurs cotes, et un chiffre qui bouge dans l'instantané s'explique
 * par un cas ajouté, pas par un nouveau hasard.
 */

/** Une ligne de `monitoring_predictions` : la vue client, plus les colonnes de l'outil interne. */
export interface LigneMonitoring extends LignePrediction {
  non_partant: boolean | null
  non_partant_le: string | null
  rang_effectif: number | null
  heure_depart: string | null
  /** Jamais lue par les mesures comparées ici : nulle partout. */
  cote_matin: number | null
  cote_matin_le: string | null
  /**
   * Cote relevée peu avant le départ. L'outil interne s'en sert quand la clôture
   * manque (`coteDeRetour`) ; la vue client ne la sert pas (`db/003`). Renseignée
   * sur quelques courses et sur les deux dernières journées, pour exercer l'écart.
   */
  cote_avant: number | null
  cote_avant_le: string | null
}

/**
 * Colonnes de `monitoring_predictions` absentes de `client_predictions` : l'app
 * ne doit JAMAIS les recevoir dans le test, sans quoi elle serait jugée sur des
 * données que la vue ne lui donnera pas.
 */
export type LigneClient = Omit<LigneMonitoring, 'cote_matin' | 'cote_matin_le' | 'cote_avant' | 'cote_avant_le' | 'non_partant_le'>

/** Ce que la vue client sert d'une ligne : tout, sauf les cotes du matin et d'avant-course. */
export function versLigneClient(l: LigneMonitoring): LigneClient {
  const { cote_matin, cote_matin_le, cote_avant, cote_avant_le, non_partant_le, ...client } = l
  return client
}

export const GRAINE = 20260914
/** Flux des cas ajoutés après la relecture du lot 1 (voir l'en-tête). */
export const GRAINE_CAS_AJOUTES = 20260915
export const MODELE = 'rating+forme.v1'
/** Les deux dernières journées jugées n'ont que des cotes d'avant-course : la clôture n'est pas encore relevée. */
const JOURNEES_PROVISOIRES = 2
/** Le jeu s'arrête au premier jour qui franchit ce nombre de courses. */
export const COURSES_MIN = 3200

const PREMIER_JOUR = '2026-04-01'
/** Avant : `non_partant` jamais vérifié (NULL partout), comme en base avant le 8 septembre. */
const DEBUT_VERIFICATION_NP = '2026-05-15'
/** Avant : pas d'heure de départ, comme l'historique antérieur à la migration 006. */
const DEBUT_HEURE = '2026-05-01'

const HIPPODROMES = [
  'AUTEUIL', 'CHANTILLY', 'CLAIREFONTAINE', 'COMPIEGNE', 'DAX', 'DEAUVILLE', 'DIEPPE', 'HYERES',
  'LA TESTE-BA', 'LE TOUQUET', 'LYON-PARILLY', 'MOULINS', 'ROYAN', 'SAINT-CLOUD', 'SAINT-MALO',
  'SALON', 'TOULOUSE', 'VICHY',
]
const CATEGORIES: (string | null)[] = [
  'HAND. DIV. 1', 'HANDICAP', 'RECL.', 'A RECLAMER', 'GR.III', 'LISTED', 'COURSE F', null, null, null,
]
/** Poids des pelotons DÉCLARÉS, de 3 à 18. */
const POIDS_PELOTON = [1, 3, 4, 6, 7, 9, 9, 9, 8, 8, 7, 6, 5, 4, 2, 2]

/** mulberry32 : entiers 32 bits seulement, identique sur tout moteur. */
function alea(graine: number) {
  let a = graine >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const decalerJour = (iso: string, n: number) => {
  const [a, m, j] = iso.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, j + n)).toISOString().slice(0, 10)
}
const arrondi = (x: number, decimales: number) => Math.round(x * 10 ** decimales) / 10 ** decimales

/**
 * `rank() OVER (PARTITION BY …, (non_partant IS TRUE) ORDER BY pred_rank NULLS LAST)`,
 * NULL pour un non-partant — la formule EXACTE de `db/003` et de la migration 018
 * de l'outil interne. `rank()` donne le même rang aux pairs (les NULL sont pairs
 * entre eux) et saute les rangs suivants : 1, 1, 3.
 */
export function rangsEffectifsSql(course: LigneMonitoring[]): void {
  const partition = course.filter((l) => l.non_partant !== true)
  const avant = (a: number | null, b: number | null) => (a == null ? false : b == null ? true : a < b)
  for (const l of course) {
    l.rang_effectif =
      l.non_partant === true ? null : 1 + partition.filter((o) => avant(o.pred_rank, l.pred_rank)).length
  }
}

/** Arrivée tirée au prorata des forces restantes (Harville). Renvoie les indices dans l'ordre. */
function arrivee(forces: number[], r: () => number): number[] {
  const restants = forces.map((f, i) => ({ i, f }))
  const ordre: number[] = []
  while (restants.length) {
    const total = restants.reduce((s, x) => s + x.f, 0)
    const seuil = r() * total
    let cumul = 0
    let k = restants.length - 1
    for (let j = 0; j < restants.length; j++) {
      cumul += restants[j].f
      if (seuil < cumul) {
        k = j
        break
      }
    }
    ordre.push(restants[k].i)
    restants.splice(k, 1)
  }
  return ordre
}

export function genererLignes(): LigneMonitoring[] {
  const r = alea(GRAINE)
  const r2 = alea(GRAINE_CAS_AJOUTES)
  const entier = (a: number, b: number) => a + Math.floor(r() * (b - a + 1))
  const chance = (p: number) => r() < p
  const choix = <T,>(t: readonly T[]) => t[Math.floor(r() * t.length)]
  const peloton = () => {
    let x = r() * POIDS_PELOTON.reduce((s, p) => s + p, 0)
    for (let i = 0; i < POIDS_PELOTON.length; i++) {
      x -= POIDS_PELOTON[i]
      if (x < 0) return i + 3
    }
    return 18
  }

  const lignes: LigneMonitoring[] = []
  let nbCourses = 0
  let jour = PREMIER_JOUR
  let indexJour = 0

  while (nbCourses < COURSES_MIN) {
    const weekEnd = indexJour % 7 >= 5
    const hippos = [...HIPPODROMES] // mélangé ci-dessous (Fisher-Yates)
    for (let i = hippos.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1))
      ;[hippos[i], hippos[j]] = [hippos[j], hippos[i]]
    }
    const nbReunions = weekEnd ? entier(3, 5) : entier(1, 3)

    for (const hippodrome of hippos.slice(0, nbReunions)) {
      // ~6 réunions sur 10 cotées, comme en base depuis août 2026.
      const reunionCotee = chance(0.6)
      // Le relevé du soir rate parfois une réunion cotée : ses partants restent « jamais vérifiés ».
      const releveNpRate = chance(0.05)
      const verifie = jour >= DEBUT_VERIFICATION_NP
      const nbCoursesReunion = entier(5, 9)

      for (let numero = 1; numero <= nbCoursesReunion; numero++) {
        const indexCourse = nbCourses++
        const declares = peloton()
        const categorie = choix(CATEGORIES)
        const distance = chance(0.03) ? null : 100 * entier(10, 32)
        const heure = jour >= DEBUT_HEURE ? `${String(13 + Math.floor((numero * 35) / 60)).padStart(2, '0')}:${String((numero * 35) % 60).padStart(2, '0')}:00` : null

        // Forces du modèle : (0,05 + u)⁴ donne des favoris de 20 à 40 % sur dix partants.
        const forces = Array.from({ length: declares }, () => {
          const x = 0.05 + r()
          return x * x * x * x
        })
        const somme = forces.reduce((s, f) => s + f, 0)
        const pWinBrut = forces.map((f) => f / somme)
        const pWinNuls = chance(0.02) // le modèle n'a sorti aucune probabilité sur la course
        // Deux courses forcées à p = 1 : la borne fermée de la dernière tranche doit être exercée.
        const certitude = indexCourse % 1600 === 777

        // Classement publié : force décroissante, numéro en départage.
        const ordreModele = pWinBrut.map((p, i) => ({ p, i })).sort((a, b) => b.p - a.p || a.i - b.i)
        const predRank = new Array<number | null>(declares)
        ordreModele.forEach(({ i }, k) => (predRank[i] = k + 1))
        // Ex æquo publiés, 5 % des courses, dont un quart au rang 1.
        if (declares >= 3 && chance(0.05)) {
          const k = chance(0.25) ? 1 : entier(2, declares - 1)
          predRank[ordreModele[k].i] = k // le (k+1)-e prend le rang k : 1, 1, 3 ou …, k, k, k+2
        }

        // Non-partants : 4 % des chevaux, gonflé pour que le rang 1 retiré soit fréquent.
        const absent = Array.from({ length: declares }, () => chance(0.04))
        if (absent.filter((a) => !a).length < 2) absent.fill(false)
        /*
         * Qui marque l'absence ? Sur une réunion cotée vérifiée, le relevé PMU du
         * soir (`field_size` inchangé) ou la prédiction du matin, qui RÉALIGNE
         * `field_size` sur le peloton restant — le cas de double soustraction de
         * l'outil interne. Sur une réunion sans cote, seule la prédiction peut le
         * dire. Avant le début des vérifications, personne : l'absent reste NULL,
         * compté partant par les deux outils.
         */
        const source = absent.map((a) => {
          if (!a || !verifie) return null
          if (reunionCotee && !releveNpRate) return chance(0.7) ? 'pmu' : 'prediction'
          return chance(0.5) ? 'prediction' : null
        })
        const realignes = source.filter((s) => s === 'prediction').length
        const fieldSize = chance(0.01) ? null : declares - realignes

        // Arrivée : 2 % des courses restent sans relevé (le dernier jour est effacé plus bas).
        const courue = chance(0.98)
        const place = new Array<number | null>(declares).fill(null)
        if (courue) {
          const partantsReels = forces.map((_, i) => i).filter((i) => !absent[i])
          // Le « vrai » niveau diffère du modèle : bruit multiplicatif dans [0,5 ; 1,5[.
          const vrai = partantsReels.map((i) => forces[i] * (0.5 + r()))
          const ordre = arrivee(vrai, r).map((k) => partantsReels[k])
          const coupe = chance(0.7) ? 5 : 7 // arrivées relevées jusqu'au 5e ou au 7e
          const deadHeat = chance(0.008)
          // Vainqueur absent de nos lignes (1 %) : nos chevaux sont classés à partir du 2e.
          const decalage = chance(0.01) ? 1 : 0
          ordre.slice(0, coupe - decalage).forEach((i, k) => {
            place[i] = k + 1 + decalage
          })
          if (deadHeat && ordre.length >= 2 && !decalage) place[ordre[1]] = 1
        }

        // Cotes de clôture, parmi les partants, sur les réunions cotées.
        const cote = new Array<number | null>(declares).fill(null)
        // Cote que le marché donnerait à chaque cheval, relevée ou non : sert aussi à l'avant-course.
        const coteMarche = new Array<number | null>(declares).fill(null)
        if (reunionCotee && chance(0.95)) {
          const marche = forces.map((f) => f * (0.6 + 0.8 * r()))
          const sm = marche.reduce((s, m) => s + m, 0)
          for (let i = 0; i < declares; i++) {
            coteMarche[i] = Math.max(1.1, arrondi(1 / ((marche[i] / sm) * 1.18), 1))
            if (chance(0.03)) continue // cote manquante
            // Un non-partant garde souvent la cote relevée avant son retrait.
            if (absent[i] && (source[i] == null || chance(0.25))) continue
            cote[i] = coteMarche[i]
          }
          // Égalité de cote au sommet du marché (3 %) : le départage doit être le même.
          if (chance(0.03)) {
            const cotes = cote.map((c, i) => ({ c, i })).filter((x) => x.c != null && !absent[x.i])
            cotes.sort((a, b) => a.c! - b.c! || a.i - b.i)
            if (cotes.length >= 2) cote[cotes[1].i] = cotes[0].c
          }
        }

        /*
         * CAS AJOUTÉ (vi) — DEUX RELEVÉS DE COTES SUR LA MÊME COURSE. Sur 6 % des
         * courses cotées, la cote d'avant-course est relevée à côté de la clôture
         * (à ±15 %), et un cheval dont la clôture manque en a souvent une. Quatre
         * fois sur dix, c'est la clôture du cheval le mieux coté qui manque :
         * l'outil interne se replie sur son avant-course et peut désigner un autre
         * favori du marché que l'app, qui ne lit que la clôture.
         */
        const coteAvant = new Array<number | null>(declares).fill(null)
        if (cote.some((c) => c != null) && r2() < 0.06) {
          for (let i = 0; i < declares; i++) {
            const bruit = 0.85 + 0.3 * r2()
            if (cote[i] != null) coteAvant[i] = Math.max(1.1, arrondi(cote[i]! * bruit, 1))
            else if (coteMarche[i] != null && r2() < 0.7) coteAvant[i] = Math.max(1.1, arrondi(coteMarche[i]! * bruit, 1))
          }
          if (r2() < 0.4) {
            // Parmi les chevaux non déclarés retirés : c'est le favori du marché de l'app qui perd sa clôture.
            let tete = -1
            for (let i = 0; i < declares; i++) {
              if (cote[i] != null && source[i] == null && (tete < 0 || cote[i]! < cote[tete]!)) tete = i
            }
            if (tete >= 0) {
              coteAvant[tete] ??= cote[tete]
              cote[tete] = null
            }
          }
        }

        const course: LigneMonitoring[] = []
        for (let i = 0; i < declares; i++) {
          const np = source[i] != null ? true : verifie && reunionCotee && !releveNpRate ? false : null
          const pw = pWinNuls || chance(0.01) ? null : certitude ? (predRank[i] === 1 ? 1 : 0) : arrondi(pWinBrut[i], 4)
          course.push({
            reunion_date: jour,
            hippodrome,
            course_num: numero,
            course_nom: `PRIX ${hippodrome} ${numero}`,
            categorie,
            is_handicap: categorie == null ? null : categorie.includes('HAND'),
            distance,
            field_size: fieldSize,
            horse_num: i + 1,
            horse_name: `CHEVAL ${indexCourse}-${i + 1}`,
            id_fg: null,
            pred_rank: chance(0.007) ? null : predRank[i],
            p_win: pw,
            p_place: pw == null ? null : arrondi(Math.min(1, 2.5 * pw), 4),
            actual_place: absent[i] ? null : place[i],
            model_version: MODELE,
            cote: cote[i],
            rapport_gagnant: place[i] === 1 && cote[i] != null ? arrondi(cote[i]! * 0.9, 1) : null,
            rapport_place: null,
            non_partant: np,
            non_partant_le: null,
            rang_effectif: null,
            heure_depart: heure,
            cote_matin: null,
            cote_matin_le: null,
            cote_avant: coteAvant[i],
            cote_avant_le: null,
          })
        }

        /*
         * CAS AJOUTÉ (v) — COURSES QUE LE MODÈLE N'A PAS, OU PRESQUE PAS, CLASSÉES.
         * 0,5 % des courses sans aucun `pred_rank` (sans probabilités une fois sur
         * deux), 0,5 % où seuls ses deux premiers ont un rang, les autres sans
         * probabilité. `rank()` place tous les NULL à égalité juste derrière les
         * chevaux classés : rang 1 pour tout le peloton dans le premier cas, rang 3
         * dans le second. L'outil interne garde ces rangs ; l'app les refuse.
         */
        const tirageRang = r2()
        const sansProba = r2() < 0.5
        if (tirageRang < 0.005) {
          for (const l of course) {
            l.pred_rank = null
            if (sansProba) l.p_win = l.p_place = null
          }
        } else if (tirageRang < 0.01) {
          const classes = new Set([ordreModele[0].i + 1, ordreModele[1].i + 1])
          for (const l of course) {
            if (!classes.has(l.horse_num)) l.pred_rank = l.p_win = l.p_place = null
          }
        }
        // CAS AJOUTÉ (vii) — distance 0, une saisie vide convertie en nombre : ni NULL, ni vraie distance.
        if (r2() < 0.005) for (const l of course) l.distance = 0

        rangsEffectifsSql(course)
        lignes.push(...course)
      }
    }
    jour = decalerJour(jour, 1)
    indexJour++
  }

  // Le dernier jour produit n'est pas couru : il joue « aujourd'hui » avant les arrivées.
  const dernier = decalerJour(jour, -1)
  for (const l of lignes) {
    if (l.reunion_date === dernier) {
      l.actual_place = null
      l.rapport_gagnant = null
    }
  }

  /*
   * CAS AJOUTÉ (vi) — JOURNÉES SANS CLÔTURE. La cote de clôture s'écrit le soir,
   * pour toute la journée d'un coup : avant, une course déjà jugée n'a que sa
   * cote d'avant-course. On le reproduit sur « aujourd'hui » et sur les deux
   * journées jugées qui le précèdent (forcées au coin, comme le reste du jeu) :
   * l'outil interne y a un favori du marché, l'app aucun.
   */
  const sansCloture = new Set(Array.from({ length: JOURNEES_PROVISOIRES + 1 }, (_, k) => decalerJour(dernier, -k)))
  for (const l of lignes) {
    if (sansCloture.has(l.reunion_date) && l.cote != null) {
      l.cote_avant ??= l.cote
      l.cote = null
      l.rapport_gagnant = null
    }
  }

  // Ordre de la pagination client (`services/predictions.ts`), tri total.
  return lignes.sort(
    (a, b) =>
      (a.reunion_date < b.reunion_date ? 1 : a.reunion_date > b.reunion_date ? -1 : 0) ||
      (a.hippodrome! < b.hippodrome! ? -1 : a.hippodrome! > b.hippodrome! ? 1 : 0) ||
      a.course_num - b.course_num ||
      (a.pred_rank == null ? 1 : 0) - (b.pred_rank == null ? 1 : 0) ||
      (a.pred_rank ?? 0) - (b.pred_rank ?? 0) ||
      a.horse_num - b.horse_num,
  )
}

/** FNV-1a 32 bits du jeu sérialisé : l'identité du jeu, stockée dans l'instantané. */
export function empreinte(lignes: LigneMonitoring[]): string {
  const texte = JSON.stringify(lignes)
  let h = 0x811c9dc5
  for (let i = 0; i < texte.length; i++) {
    h ^= texte.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}
