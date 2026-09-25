import { MODELE_CLIENT } from '@/config/app'
import { instantParis } from '@/lib/journee'
import type { AssociationPro, Fiche, LignePrediction, MontePro, PerformanceCheval, ProfilPro, RolePro, StatPro } from '@/types'
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

/**
 * 45 jours de réunions fictives, jusqu'à DEMAIN inclus (voir plus bas).
 *
 * LA DÉMO REPRODUIT LES DÉFAUTS DU RÉEL, et c'est voulu. Une démonstration trop
 * propre masquait deux erreurs de mesure qui ont vécu en production :
 *
 * - LES ARRIVÉES S'ARRÊTENT au 7e sur une réunion cotée et au 5e sur une réunion
 *   sans cote, comme les relevés réels. Au-delà, `actual_place` est NULL. Avec
 *   des arrivées complètes, la calibration qui écartait ces chevaux paraissait
 *   juste.
 * - IL Y A DES NON-PARTANTS (un peu plus d'un cheval sur cent, notre rang 1
 *   compris), sans place, avec leur probabilité et leur rang du matin. Le rang
 *   effectif est recalculé comme le fait `db/003`.
 * - LA COTE EST UNE AFFAIRE DE RÉUNION : environ quatre réunions sur dix n'en
 *   ont aucune, comme en septembre 2026. Le statut de non-partant n'y est jamais
 *   vérifié (`NULL`), comme sur les réunions sans relevé PMU.
 */
export function lignesDemo(): LignePrediction[] {
  const r = alea(20260826)
  const lignes: LignePrediction[] = []

  /*
   * ⚠ LA DÉMO EST PLUS GÉNÉREUSE QUE LA PRODUCTION. Elle génère aujourd'hui ET
   * demain (`j <= 1`), hérité du rythme annoncé le 17 septembre 2026. Or le
   * pipeline calcule le matin même et n'a jamais demain
   * (`RYTHME_PUBLICATION` dans config/app, décision du 20/09/2026).
   *
   * Laissé tel quel volontairement : la démo sert aux captures et à la
   * conception, où un programme du lendemain est utile. Mais ne pas s'en servir
   * pour juger de ce que voit un client. Passer à `j <= 0` pour coller à la
   * production. Seules les arrivées du jour dépendent de l'heure
   * (`?horloge=HH:MM` pour la simuler).
   */
  const m = instantParis()
  for (let j = -43; j <= 1; j++) {
    const date = jourISO(j)
    const tirage = 1 + Math.floor(r() * 2.4)
    /*
     * Demain compte au moins cinq réunions : c'est le seul jour de la démo qui
     * dépasse ce que le hero de l'accueil montre (`MAX_REUNIONS_HERO`), donc le
     * seul où son lien « Voir les N réunions » s'affiche et se vérifie. Demain
     * est le DERNIER jour généré et le tirage est toujours consommé : les
     * réunions supplémentaires s'ajoutent à la fin sans décaler la suite
     * aléatoire des jours précédents (leurs données restent identiques).
     */
    const nbReunions = j === 1 ? Math.max(5, tirage) : tirage
    const choisis = new Set<string>()
    for (let k = 0; k < nbReunions; k++) {
      let hippo = HIPPODROMES[Math.floor(r() * HIPPODROMES.length)]
      while (choisis.has(hippo)) hippo = HIPPODROMES[Math.floor(r() * HIPPODROMES.length)]
      choisis.add(hippo)

      const cotee = r() > 0.4
      const dernierePlaceRelevee = cotee ? 7 : 5
      const premiereHeure = 12 * 60 + Math.floor(r() * 5) * 30

      const nbCourses = 6 + Math.floor(r() * 3)
      for (let c = 1; c <= nbCourses; c++) {
        const categorie = CATEGORIES[Math.floor(r() * CATEGORIES.length)]
        const declares = 7 + Math.floor(r() * 10)
        const distance = [1200, 1400, 1600, 1800, 2000, 2400, 2800][Math.floor(r() * 7)]
        // Les courses passées sont jugées ; celles de demain ne le sont pas.
        const minutes = premiereHeure + (c - 1) * 35
        // Les courses du jour sont jugées 25 minutes après leur départ.
        const courue = j < 0 || (j === 0 && minutes + 25 <= m.minutes)
        const heure = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:00`

        // Scores décroissants → softmax : un favori marqué, une queue plate.
        const scores = Array.from({ length: declares }, (_, i) => 2.4 - i * (0.25 + r() * 0.12))
        const exp = scores.map((s) => Math.exp(s))
        const somme = exp.reduce((a, b) => a + b, 0)
        // Triées : notre rang suit la probabilité, comme en production.
        const pWin = exp.map((e) => e / somme).sort((a, b) => b - a)
        // Dossards mélangés par un générateur À PART (la suite principale ne bouge
        // pas) : sinon notre favori portait toujours le n° 1.
        const melange = alea(7_000_000 + (j + 50) * 1000 + k * 20 + c)
        const numeros = Array.from({ length: declares }, (_, i) => i + 1)
        for (let i = numeros.length - 1; i > 0; i--) {
          const x = Math.floor(melange() * (i + 1))
          ;[numeros[i], numeros[x]] = [numeros[x], numeros[i]]
        }

        // ~1,4 % de non-partants, tirés avant l'arrivée : ils ne courent pas.
        const retire = Array.from({ length: declares }, () => r() < 0.014)

        const arrivee = new Map<number, number>()
        if (courue) {
          const auDepart = pWin.map((p, i) => (retire[i] ? 0 : p))
          arriveeHarville(auDepart, r)
            .filter((idx) => !retire[idx])
            .forEach((idx, k) => {
              if (k + 1 <= dernierePlaceRelevee) arrivee.set(idx, k + 1)
            })
        }

        let rangAuDepart = 0
        for (let i = 0; i < declares; i++) {
          // La cote suit la probabilité, avec 20 % de marge et du bruit : c'est
          // ce désaccord qui fait exister les partants « à valeur ».
          const bruit = 0.7 + r() * 0.8
          const brute = 1 / Math.max(0.012, pWin[i] * 1.2 * bruit)
          const place = arrivee.get(i) ?? null
          if (!retire[i]) rangAuDepart++
          lignes.push({
            reunion_date: date,
            hippodrome: hippo,
            course_num: c,
            course_nom: `Prix ${nomCheval(r).toLowerCase().replace(/^./, (m) => m.toUpperCase())}`,
            categorie,
            is_handicap: categorie === 'HAND.',
            distance,
            field_size: declares,
            horse_num: numeros[i],
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
            // Sans relevé PMU, le statut n'est jamais vérifié ; un retrait peut
            // tout de même être connu par la prédiction du matin.
            non_partant: retire[i] ? true : cotee ? false : null,
            rang_effectif: retire[i] ? null : rangAuDepart,
            heure_depart: heure,
          })
        }
      }
    }
  }
  /*
   * `?demain=non` : la soirée telle que la production la vit tant que le calcul
   * de nuit n'est pas en place — demain n'est pas encore publié. Les jours
   * précédents restent identiques (le tirage a déjà été consommé).
   */
  if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demain') === 'non') {
    const demain = jourISO(1)
    return lignes.filter((l) => l.reunion_date !== demain)
  }
  return lignes
}


/** Empreinte stable d'un texte, pour graîner une fiche fictive. */
function empreinte(texte: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < texte.length; i++) {
    h ^= texte.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

const NOMS_DEMO = ['DUVAL', 'MOREL', 'GARNIER', 'ROUSSEL', 'FONTAINE', 'MARCHAND', 'GIRARD', 'PERRIN', 'LEMOINE', 'CARON']
const ETALONS_DEMO = ['SAINT DES SAINTS', 'KAPGARDE', 'MAXIOS', 'LOPE DE VEGA', 'SIYOUNI', 'DOCTOR DINO', 'NO RISK AT ALL']
const JUMENTS_DEMO = ['BELLE AURORE', 'REINE DE MAI', 'DOUCE FOLIE', 'ETOILE FILANTE', 'LADY SIENNE', 'MISS CADENCE']

/**
 * Une fiche de cheval FICTIVE : profil et performances, déterministes pour un
 * même identifiant. Les ordres de grandeur suivent les vraies données (codes
 * de place, disciplines, allocations au format France Galop « 16.250 »).
 */
export function ficheDemo(idFg: string, nom: string): Fiche {
  const r = alea(empreinte(idFg))
  const pick = <T>(l: readonly T[]) => l[Math.floor(r() * l.length)]
  const obstacle = r() < 0.35
  const naissance = `${2016 + Math.floor(r() * 7)}-0${1 + Math.floor(r() * 9)}-1${Math.floor(r() * 9)}`
  const entraineur = `${pick(['F.', 'H.', 'G.', 'C.', 'M.'])} ${pick(NOMS_DEMO)}`
  const proprietaire = `ECURIE ${pick(['DES TILLEULS', 'DU VAL', 'SAINT-ROCH', 'HORIZON'])}`
  const performances: PerformanceCheval[] = []
  const n = 4 + Math.floor(r() * 18)
  let jour = jourISO(-(3 + Math.floor(r() * 20)))
  for (let i = 0; i < n; i++) {
    const tirage = r()
    const place =
      tirage < 0.04 ? pick(['TB', 'AR', 'NP']) : String(1 + Math.floor(Math.pow(r(), 1.4) * 14))
    const specialite = obstacle ? pick(['H', 'H', 'S']) : 'P'
    const distance = obstacle ? 3000 + Math.floor(r() * 16) * 100 : 1200 + Math.floor(r() * 14) * 100
    const gains = Number(place) === 1 ? 8000 + Math.floor(r() * 30000) : Number(place) <= 5 ? Math.floor(r() * 6000) : 0
    performances.push({
      date: jour,
      hippodrome: pick(HIPPODROMES),
      place,
      distance: distance.toLocaleString('de-DE'),
      specialite,
      categorie: r() < 0.1 ? pick(['GR.III', 'L']) : null,
      poids: String(obstacle ? 62 + Math.floor(r() * 10) : 54 + Math.floor(r() * 6)),
      jockey: `${pick(['A.', 'T.', 'L.', 'M.', 'S.'])} ${pick(NOMS_DEMO)}`,
      entraineur,
      gains: gains ? gains.toLocaleString('de-DE') : '0',
    })
    const [a, m, j] = jour.split('-').map(Number)
    const d = new Date(Date.UTC(a, m - 1, j - (12 + Math.floor(r() * 30))))
    jour = d.toISOString().slice(0, 10)
  }
  return {
    profil: {
      idFg,
      nom,
      sexe: pick(['FEMELLE', 'HONGRE', 'MALE']),
      robe: pick(['BAI', 'BAI', 'ALE', 'GRI', 'NOI']),
      dateNaissance: naissance,
      pere: pick(ETALONS_DEMO),
      mere: pick(JUMENTS_DEMO),
      eleveur: `HARAS ${pick(['DU BOCAGE', 'DE LA VALLEE', 'DES PINS'])}`,
      proprietaire,
    },
    performances,
  }
}

const CHEVAUX_DEMO = ['ECLAT DU MATIN', 'IRON VALLEY', 'BELLE DE CORDES', 'SIROCCO BLUE', 'GRAND TEMPO', 'ORAGE DORE', 'LADY MISTRAL', 'FARO DES LANDES', 'VIF ARGENT', 'JADE DU RHEU', 'ROC DE SIENNE', 'CAP HORIZON']

/**
 * La fiche FICTIVE d'un jockey ou d'un entraîneur, déterministe pour un même
 * nom : agrégats de la saison et de la précédente, classement, partenaires,
 * derniers résultats, palmarès, et — pour un entraîneur — quelques chevaux du
 * programme de la démo.
 */
export function profilProDemo(role: RolePro, nom: string): Omit<ProfilPro, 'annee'> {
  const r = alea(empreinte(`${role}|${nom}`))
  const pick = <T>(l: readonly T[]) => l[Math.floor(r() * l.length)]
  const aujourdhui = jourISO(0)
  const anneeCourante = Number(aujourdhui.slice(0, 4))
  const moisCourant = Number(aujourdhui.slice(5, 7))
  const obstacle = r() < 0.35
  const talent = 0.07 + r() * 0.12
  const pistes = [...HIPPODROMES].sort(() => r() - 0.5).slice(0, 6)

  const stats: StatPro[] = []
  for (const annee of [anneeCourante - 1, anneeCourante]) {
    const fin = annee === anneeCourante ? moisCourant : 12
    for (let mois = 1; mois <= fin; mois++) {
      for (const specialite of obstacle ? ['H', 'S', 'P'] : ['P']) {
        for (const hippodrome of pistes) {
          const montes = Math.floor(r() * (specialite === 'P' || !obstacle ? 7 : 4))
          if (!montes) continue
          const victoires = Math.min(montes, Math.floor(r() * montes * talent * 3.2))
          const places = Math.min(montes - victoires, Math.floor(r() * montes * 0.4))
          stats.push({ annee, mois, specialite, hippodrome, montes, victoires, places, allocations: victoires * (9000 + Math.floor(r() * 20000)) + places * 3000 })
        }
      }
    }
  }

  // Classement : la personne parmi onze confrères fictifs, sur la saison en cours.
  const miens = stats.filter((s) => s.annee === anneeCourante)
  const total = (l: StatPro[], k: 'montes' | 'victoires' | 'allocations') => l.reduce((n, s) => n + s[k], 0)
  const pool = [
    { nom, montes: total(miens, 'montes'), victoires: total(miens, 'victoires'), allocations: total(miens, 'allocations') },
    ...NOMS_DEMO.filter((n) => !nom.includes(n)).slice(0, 11).map((n, i) => {
      const montes = 200 + Math.floor(r() * 600)
      const victoires = Math.floor(montes * (0.06 + r() * 0.14))
      return { nom: `${'ABCDEFGHJKLM'[i]}. ${n}`, montes, victoires, allocations: victoires * 18000 + Math.floor(r() * 400000) }
    }),
  ]
  const rang = (k: 'victoires' | 'allocations', v: number) => 1 + pool.filter((p) => p[k] > v).length
  const classement = pool.map((p) => ({
    ...p,
    rangVictoires: rang('victoires', p.victoires),
    rangAllocations: rang('allocations', p.allocations),
    effectif: pool.length,
  }))

  const montes: MontePro[] = Array.from({ length: 10 }, (_, i) => ({
    date: jourISO(-(1 + i * 2 + Math.floor(r() * 2))),
    hippodrome: pick(pistes),
    place: r() < 0.05 ? 'TB' : String(1 + Math.floor(Math.pow(r(), 1.3) * 12)),
    distance: (obstacle ? 3000 + Math.floor(r() * 14) * 100 : 1200 + Math.floor(r() * 14) * 100).toLocaleString('de-DE'),
    specialite: obstacle ? pick(['H', 'S']) : 'P',
    categorie: null,
    jockey: role === 'jockey' ? nom : `${pick(['A.', 'T.', 'L.'])} ${pick(NOMS_DEMO)}`,
    entraineur: role === 'entraineur' ? nom : `${pick(['F.', 'H.', 'G.'])} ${pick(NOMS_DEMO)}`,
    cheval: pick(CHEVAUX_DEMO),
  }))

  const palmares: MontePro[] = Array.from({ length: Math.floor(r() * 6) }, (_, i) => ({
    ...montes[0],
    date: `${anneeCourante - i}-0${1 + Math.floor(r() * 9)}-1${Math.floor(r() * 9)}`,
    place: '1',
    hippodrome: pick(pistes),
    categorie: pick(['GR.I', 'GR.II', 'GR.III', 'LISTED']),
    cheval: pick(CHEVAUX_DEMO),
  }))

  // Un partenaire n'apparaît qu'une fois, comme dans la vue réelle (une ligne par couple).
  const partenaires = new Set<string>()
  while (partenaires.size < 5) partenaires.add(`${pick(['F.', 'C.', 'M.', 'S.'])} ${pick(NOMS_DEMO)}`)
  const associations: AssociationPro[] = [...partenaires].map((partenaire) => {
    const m = 8 + Math.floor(r() * 40)
    return { partenaire, montes: m, victoires: Math.floor(m * (0.05 + r() * 0.2)) }
  })

  // Entraîneur : quelques chevaux du programme fictif de demain.
  const programme =
    role === 'entraineur'
      ? lignesDemo()
          .filter((l) => l.reunion_date >= aujourdhui && l.id_fg)
          .filter(() => r() < 0.012)
          .map((l) => l.id_fg!)
          .slice(0, 4)
      : []

  return { role, nom, stats, classement: classement.sort((a, b) => a.rangVictoires - b.rangVictoires), moi: classement.find((c) => c.nom === nom) ?? null, associations, montes, palmares, programme }
}
