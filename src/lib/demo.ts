import { MODELE_CLIENT } from '@/config/app'
import type { LignePrediction, ProfilPiste, TrancheProfil, VitesseParDistance } from '@/types'
import { jourISO } from '@/lib/format'

/**
 * Jeu de démonstration — entièrement FICTIF.
 *
 * Il existe pour deux raisons : développer sans base sous la main, et montrer
 * l'application sans exposer des pronostics qui se vendent. Il n'est actif que
 * si `VITE_DEMO=1`, et l'interface affiche alors un bandeau permanent : un
 * chiffre inventé pris pour un chiffre mesuré serait la pire panne possible
 * pour ce produit.
 *
 * Le générateur est DÉTERMINISTE. Un aléa non graine changerait les taux à
 * chaque rechargement, et la démo perdrait toute crédibilité.
 */

/** mulberry32 — court, sans dépendance, suffisant pour des données de vitrine. */
function alea(graine: number) {
  let a = graine >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const HIPPODROMES = [
  'DEAUVILLE', 'CLAIREFONTAINE', 'VICHY', 'LA TESTE-BA', 'DIEPPE',
  'CHANTILLY', 'SAINT-CLOUD', 'LE TOUQUET', 'DAX', 'VITTEL',
]

const CATEGORIES: (string | null)[] = ['HAND.', 'RECL.', null, null, 'Listed', 'GR.III', 'HAND.', null]

const SYLLABES_A = ['Al', 'Bel', 'Cri', 'Dan', 'El', 'Fal', 'Gri', 'Hé', 'Ir', 'Jol', 'Kar', 'Lu', 'Mar', 'Nor', 'Ol', 'Per', 'Qua', 'Ro', 'Sil', 'Tor', 'Ur', 'Vic', 'Wal', 'Xan', 'Yv', 'Zé']
const SYLLABES_B = ['bane', 'court', 'dine', 'fair', 'grove', 'lys', 'mont', 'nova', 'pique', 'rose', 'sand', 'tale', 'vent', 'wood', 'zone']

function nomCheval(r: () => number): string {
  const a = SYLLABES_A[Math.floor(r() * SYLLABES_A.length)]
  const b = SYLLABES_B[Math.floor(r() * SYLLABES_B.length)]
  return `${a}${b}`.toUpperCase()
}

/**
 * Tire une arrivée complète selon les probabilités du modèle, par la méthode de
 * Harville : on tire le vainqueur au prorata des probabilités, puis le deuxième
 * au prorata des probabilités RESTANTES renormalisées, et ainsi de suite.
 *
 * Deux raisons de ne pas se contenter d'un vainqueur suivi d'un tirage uniforme
 * pour les accessits. D'abord la calibration : la page « Nos résultats » trace
 * la fréquence observée contre la probabilité annoncée, et un tirage non
 * conforme y dessinerait un défaut de modèle qui n'existe pas. Ensuite le taux
 * de place : avec des accessits uniformes, notre rang 1 finit dans les trois
 * à peu près aussi souvent qu'un cheval au hasard, et la démonstration
 * afficherait un produit nettement moins bon qu'il ne l'est réellement.
 *
 * Retourne les indices dans l'ordre d'arrivée.
 */
function arriveeHarville(probas: number[], r: () => number): number[] {
  const restants = probas.map((p, i) => ({ i, p }))
  const ordre: number[] = []
  while (restants.length) {
    const total = restants.reduce((s, x) => s + x.p, 0)
    const seuil = r() * total
    let cumul = 0
    let choisi = restants.length - 1
    for (let k = 0; k < restants.length; k++) {
      cumul += restants[k].p
      if (seuil <= cumul) {
        choisi = k
        break
      }
    }
    ordre.push(restants[choisi].i)
    restants.splice(choisi, 1)
  }
  return ordre
}

/** 45 jours de réunions fictives — la dernière est celle de demain. */
export function lignesDemo(): LignePrediction[] {
  const r = alea(20260826)
  const lignes: LignePrediction[] = []

  for (let j = -43; j <= 1; j++) {
    const date = jourISO(j)
    const nbReunions = 1 + Math.floor(r() * 2.4)
    const choisis = new Set<string>()
    for (let k = 0; k < nbReunions; k++) {
      let hippo = HIPPODROMES[Math.floor(r() * HIPPODROMES.length)]
      while (choisis.has(hippo)) hippo = HIPPODROMES[Math.floor(r() * HIPPODROMES.length)]
      choisis.add(hippo)

      const nbCourses = 6 + Math.floor(r() * 3)
      for (let c = 1; c <= nbCourses; c++) {
        const categorie = CATEGORIES[Math.floor(r() * CATEGORIES.length)]
        const partants = 7 + Math.floor(r() * 10)
        const distance = [1200, 1400, 1600, 1800, 2000, 2400, 2800][Math.floor(r() * 7)]
        // Les courses passées sont jugées ; celles de demain ne le sont pas.
        const courue = j < 0
        // Toutes les réunions ne sont pas PMU : une sur trois n'a pas de cote.
        const cotee = r() > 0.33

        // Scores décroissants → softmax : un favori marqué, une queue plate.
        const scores = Array.from({ length: partants }, (_, i) => 2.4 - i * (0.25 + r() * 0.12))
        const exp = scores.map((s) => Math.exp(s))
        const somme = exp.reduce((a, b) => a + b, 0)
        const pWin = exp.map((e) => e / somme)

        const arrivee = new Map<number, number>()
        if (courue) {
          arriveeHarville(pWin, r).forEach((idx, k) => arrivee.set(idx, k + 1))
        }

        for (let i = 0; i < partants; i++) {
          // La cote suit la probabilité, avec 20 % de marge et du bruit : c'est
          // ce désaccord qui fait exister les partants « à valeur ».
          const bruit = 0.7 + r() * 0.8
          const brute = 1 / Math.max(0.012, pWin[i] * 1.2 * bruit)
          const place = arrivee.get(i) ?? null
          lignes.push({
            reunion_date: date,
            hippodrome: hippo,
            course_num: c,
            course_nom: `Prix ${nomCheval(r).toLowerCase().replace(/^./, (m) => m.toUpperCase())}`,
            categorie,
            is_handicap: categorie === 'HAND.',
            distance,
            field_size: partants,
            horse_num: i + 1,
            horse_name: nomCheval(r),
            id_fg: `DEMO${j}${c}${i}`,
            pred_rank: i + 1,
            p_win: Number(pWin[i].toFixed(4)),
            p_place: Number(Math.min(0.97, pWin[i] * 2.5).toFixed(4)),
            actual_place: place,
            model_version: MODELE_CLIENT,
            cote: cotee ? Number(Math.min(99, brute).toFixed(1)) : null,
            rapport_gagnant: cotee && place === 1 ? Number(Math.min(99, brute).toFixed(1)) : null,
            rapport_place:
              cotee && place != null && place <= 3
                ? Number(Math.max(1.1, Math.min(30, brute * 0.32)).toFixed(1))
                : null,
          })
        }
      }
    }
  }
  return lignes
}

/**
 * Profils de piste fictifs, calés sur les ordres de grandeur réels : une piste
 * de plat tourne entre 54 et 58 km/h, et son train des derniers 600 m entre 35
 * et 39 secondes. Une démonstration hors de ces bornes se repérerait aussitôt.
 */
export function profilsDemo(): ProfilPiste[] {
  const r = alea(902614)
  return HIPPODROMES.map((nom, i) => {
    const courses = 120 + Math.floor(r() * 1500)
    // Un hippodrome sur six est traité comme une piste d'obstacle : aucune
    // course chronométrée. C'est le cas d'Auteuil en production, et l'écran
    // doit savoir l'afficher amputé de sa vitesse.
    const obstacle = i === 4
    const vitesse = 54.6 + r() * 3.4
    return {
      hippodrome: nom,
      courses,
      coursesChronometrees: obstacle ? 0 : Math.floor(courses * (0.55 + r() * 0.45)),
      depuis: '2022-01-07',
      jusqua: jourISO(-2),
      train600: obstacle ? null : Number((41.5 - (vitesse - 54.6) * 1.5).toFixed(2)),
      vitesseMoy: obstacle ? null : Number(vitesse.toFixed(2)),
      vitesseEcartType: obstacle ? null : Number((2 + r() * 1.6).toFixed(2)),
      distanceMoy: obstacle ? 3700 : 1700 + Math.floor(r() * 900),
      distanceMin: obstacle ? 3200 : 1000 + Math.floor(r() * 300),
      distanceMax: obstacle ? 4400 : 2600 + Math.floor(r() * 800),
      partantsMoy: Number((9.5 + r() * 3).toFixed(1)),
    }
  }).sort((a, b) => b.courses - a.courses)
}

export function distancesDemo(hippodrome: string): VitesseParDistance[] {
  const r = alea(empreinteDemo(hippodrome))
  const profil = profilsDemo().find((p) => p.hippodrome === hippodrome)
  if (!profil || profil.vitesseMoy == null) return []
  const tranches: TrancheProfil[] = ['Sprint', 'Mile', 'Intermédiaire', 'Tenue']
  // Le sprint court plus vite que la tenue : l'écart doit aller dans le bon
  // sens, sinon la démonstration donne à voir une piste absurde.
  const decalage = [1.5, 0.6, -0.3, -1.4]
  return tranches.map((tranche, i) => ({
    hippodrome,
    tranche,
    courses: 20 + Math.floor(r() * 320),
    vitesseMoy: Number((profil.vitesseMoy! + decalage[i] + (r() - 0.5) * 0.4).toFixed(2)),
    train600: Number(((profil.train600 ?? 37) - decalage[i] * 0.7).toFixed(2)),
  }))
}

function empreinteDemo(texte: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < texte.length; i++) {
    h ^= texte.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}
