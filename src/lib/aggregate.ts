import { MARGE_VALUE } from '@/config/app'
import type { Course, LignePrediction, Partant, Reunion, TypeCourse } from '@/types'

export function typeCourse(categorie: string | null): TypeCourse {
  const c = (categorie ?? '').toUpperCase()
  if (c.includes('HAND')) return 'Handicap'
  if (c.includes('RECL')) return 'Réclamer'
  if (c.includes('GR.') || c.includes('GROUPE') || c.includes('LISTED')) return 'Groupe & Listed'
  return 'Conditions'
}

export const cleCourse = (date: string, hippodrome: string, numero: number) =>
  `${date}|${hippodrome}|${numero}`

export const cleReunion = (date: string, hippodrome: string) => `${date}|${hippodrome}`

/** Décompose une clé de course en ses trois parties, ou null si elle est illisible. */
export function litCleCourse(cle: string): { date: string; hippodrome: string; numero: number } | null {
  const [date, hippodrome, num] = cle.split('|')
  const numero = Number(num)
  if (!date || !hippodrome || !Number.isFinite(numero)) return null
  return { date, hippodrome, numero }
}

/** Un non-partant est un cheval DÉCLARÉ retiré ; « jamais vérifié » compte comme partant. */
const estNonPartant = (l: LignePrediction) => l.non_partant === true

/**
 * Rang effectif d'une ligne. La vue le calcule (`db/003`) ; en son absence —
 * base non migrée — on retombe sur le rang publié, comme l'outil interne.
 *
 * UN CHEVAL QUE LE MODÈLE N'A PAS CLASSÉ N'A PAS DE RANG, même si la vue lui en
 * donne un. `rank()` place tous les `pred_rank` NULL à égalité en fin de
 * classement : dans une course où le modèle n'a rien classé, les dix chevaux
 * recevaient le rang 1, et la course comptait une victoire pour un pronostic
 * jamais publié. Écart assumé avec l'outil interne, qui garde ce rang (voir
 * `tests/parite`).
 */
const rangEffectif = (l: LignePrediction): number | null =>
  estNonPartant(l) || l.pred_rank == null ? null : (l.rang_effectif ?? l.pred_rank)

/**
 * Probabilités implicites des cotes, RENORMALISÉES sur les chevaux au départ.
 *
 * La somme brute des 1/cote dépasse 1 — c'est la marge de l'opérateur, environ
 * 20 %. Comparer notre probabilité à une implicite non corrigée nous ferait
 * paraître systématiquement pessimistes, et ferait passer pour « value » des
 * partants qui ne le sont pas. Un non-partant garde parfois une cote relevée
 * avant son retrait : elle n'entre ni dans la somme ni dans la comparaison.
 */
function probasMarche(lignes: LignePrediction[]): Map<number, number> {
  const cotes = lignes.filter((l) => !estNonPartant(l) && l.cote != null && Number(l.cote) > 0)
  const somme = cotes.reduce((s, l) => s + 1 / Number(l.cote), 0)
  const m = new Map<number, number>()
  if (!somme) return m
  for (const l of cotes) m.set(l.horse_num, 1 / Number(l.cote) / somme)
  return m
}

function versPartant(l: LignePrediction, marche: Map<number, number>): Partant {
  const pWin = l.p_win == null ? null : Number(l.p_win)
  const pMarche = marche.get(l.horse_num) ?? null
  const ecart = pWin != null && pMarche != null ? pWin - pMarche : null
  return {
    numero: l.horse_num,
    nom: l.horse_name ?? `n° ${l.horse_num}`,
    idFg: l.id_fg,
    rang: rangEffectif(l),
    rangInitial: l.pred_rank,
    nonPartant: estNonPartant(l),
    pWin,
    pPlace: l.p_place == null ? null : Number(l.p_place),
    cote: l.cote == null ? null : Number(l.cote),
    pMarche,
    ecartMarche: ecart,
    value: pWin != null && pMarche != null && pWin > pMarche + MARGE_VALUE * pMarche,
    arrivee: l.actual_place,
    rapportGagnant: l.rapport_gagnant == null ? null : Number(l.rapport_gagnant),
    rapportPlace: l.rapport_place == null ? null : Number(l.rapport_place),
  }
}

/**
 * Regroupe les lignes en courses.
 *
 * La clé ne contient PAS le modèle, contrairement à l'outil interne : la
 * plateforme client n'en sert qu'un seul (voir `config/app.ts`) et le filtrage
 * est fait côté requête. Si deux modèles se retrouvaient malgré tout dans le
 * même lot, leurs partants fusionneraient et deux chevaux porteraient le rang 1
 * dans la même course — on s'en protège par une déduplication explicite.
 */
export function construireCourses(lignes: LignePrediction[]): Course[] {
  const groupes = new Map<string, LignePrediction[]>()
  for (const l of lignes) {
    const cle = cleCourse(l.reunion_date, l.hippodrome ?? '?', l.course_num)
    const g = groupes.get(cle)
    if (g) g.push(l)
    else groupes.set(cle, [l])
  }

  const courses: Course[] = []
  for (const [cle, brut] of groupes) {
    // Un seul enregistrement par cheval, même si plusieurs modèles ont fuité.
    const vus = new Set<number>()
    const lignesCourse = brut.filter((l) => !vus.has(l.horse_num) && vus.add(l.horse_num))
    // Ordre de l'outil interne : non-partants en bas de grille (999), rang
    // inconnu juste au-dessus (99). Le numéro départage les ex æquo, pour que
    // deux chargements ne désignent jamais deux rangs 1 différents.
    const cleTri = (l: LignePrediction) => (estNonPartant(l) ? 999 : (rangEffectif(l) ?? 99))
    lignesCourse.sort((a, b) => cleTri(a) - cleTri(b) || a.horse_num - b.horse_num)

    const marche = probasMarche(lignesCourse)
    const liste = lignesCourse.map((l) => versPartant(l, marche))
    const tete = lignesCourse[0]
    const auDepart = liste.filter((p) => !p.nonPartant)

    /*
     * LE RANG 1 D'UNE COURSE est le premier cheval AU DÉPART de rang effectif 1.
     * Si notre rang 1 publié a été retiré, le suivant prend sa place : la course
     * reste jugée, et elle est jugée sur un cheval qui a couru. La compter en
     * échec — ce que faisait l'application avant `db/003` — pénalisait le modèle
     * pour une décision d'entraîneur.
     */
    const favori = auDepart.find((p) => p.rang === 1) ?? null
    const favoriRetire = liste.find((p) => p.nonPartant && p.rangInitial === 1) ?? null
    const podium = auDepart.filter((p) => p.rang != null && p.rang <= 3)
    const gagnant = liste.find((p) => p.arrivee === 1) ?? null
    /*
     * JUGÉE = au moins une place relevée. Une place NULL dans une course jugée
     * veut dire « arrivé au-delà du dernier classé relevé » (le 5e ou le 7e selon
     * la source) : c'est une défaite, jamais une donnée manquante.
     */
    const courue = liste.some((p) => p.arrivee != null)
    const cotes = auDepart.filter((p) => p.cote != null && p.cote > 0)
    // Inégalité stricte : à cote égale, le mieux classé par nous l'emporte.
    const favoriMarche = cotes.length
      ? cotes.reduce((meilleur, p) => (p.cote! < meilleur.cote! ? p : meilleur))
      : null

    const nosTrois = new Set(podium.map((p) => p.numero))
    const arriveeTrois = liste.filter((p) => p.arrivee != null && p.arrivee <= 3)
    const heure = lignesCourse.find((l) => l.heure_depart)?.heure_depart ?? null

    courses.push({
      cle,
      date: tete.reunion_date,
      hippodrome: tete.hippodrome ?? '?',
      numero: tete.course_num,
      nom: tete.course_nom,
      categorie: tete.categorie,
      type: typeCourse(tete.categorie),
      handicap: Boolean(tete.is_handicap),
      distance: tete.distance,
      partants: auDepart.length,
      declares: tete.field_size,
      nonPartants: liste.length - auDepart.length,
      heureDepart: heure ? heure.slice(0, 5) : null,
      courue,
      cotee: cotes.length > 0,
      verrouillee: lignesCourse.some((l) => l.verrouille === true),
      liste,
      favori,
      favoriRetire,
      podium,
      gagnant,
      favoriMarche,
      gagne: Boolean(courue && favori && gagnant && favori.numero === gagnant.numero),
      place: Boolean(favori?.arrivee != null && favori.arrivee <= 3),
      dansLeTrio: arriveeTrois.filter((p) => nosTrois.has(p.numero)).length,
    })
  }

  return courses.sort(
    (a, b) =>
      b.date.localeCompare(a.date) || a.hippodrome.localeCompare(b.hippodrome) || a.numero - b.numero,
  )
}

/** Regroupe des courses en réunions, les plus récentes d'abord. */
export function construireReunions(courses: Course[]): Reunion[] {
  const groupes = new Map<string, Course[]>()
  for (const c of courses) {
    const cle = cleReunion(c.date, c.hippodrome)
    const g = groupes.get(cle)
    if (g) g.push(c)
    else groupes.set(cle, [c])
  }
  return [...groupes.entries()]
    .map(([cle, liste]) => {
      const courses = [...liste].sort((a, b) => a.numero - b.numero)
      return {
        cle,
        date: courses[0].date,
        hippodrome: courses[0].hippodrome,
        courses,
        courues: courses.filter((c) => c.courue).length,
        gagnees: courses.filter((c) => c.gagne).length,
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date) || a.hippodrome.localeCompare(b.hippodrome))
}

/** Tranches de distance — le vocabulaire du plat, pas des bornes arbitraires. */
export function trancheDistance(m: number | null): string {
  if (m == null) return 'Non précisée'
  if (m < 1400) return 'Sprint (< 1 400 m)'
  if (m < 1800) return 'Mile (1 400 – 1 800 m)'
  if (m < 2200) return 'Intermédiaire (1 800 – 2 200 m)'
  return 'Tenue (> 2 200 m)'
}

export function tranchePeloton(n: number | null): string {
  if (n == null) return 'Non précisé'
  if (n <= 8) return 'Petit peloton (≤ 8)'
  if (n <= 13) return 'Moyen (9 – 13)'
  return 'Grand peloton (≥ 14)'
}

export function trancheCote(c: number | null): string {
  if (c == null) return 'Sans cote'
  if (c < 3) return 'Moins de 3'
  if (c < 5) return '3 à 5'
  if (c < 10) return '5 à 10'
  if (c < 20) return '10 à 20'
  return '20 et plus'
}
