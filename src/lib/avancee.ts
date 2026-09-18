import { bornesHoraires, compterEtats, trierReunionsParHeure, type InstantParis } from '@/lib/journee'
import type { Reunion } from '@/types'

/**
 * L'AVANCÉE D'UNE RÉUNION — la logique pure du haut de l'accueil.
 *
 * Tout ce qui se lit dans le hero (liste du jour, horaires, barre et texte
 * d'avancée) est calculé ici, sans React, pour être testé à l'heure près.
 * Typographie française : espace insécable dans « 13 h 30 » et avant le tiret
 * d'intervalle, pour qu'une ligne ne commence jamais par « – 15 h ».
 */

const NB = ' '

/** Au-delà, le hero renvoie vers la page Réunions plutôt que de s'allonger. */
export const MAX_REUNIONS_HERO = 4

/** '13:00' → « 13 h » ; '15:55' → « 15 h 55 » ; '09:05' → « 9 h 05 ». */
export function heureLisible(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  return m === 0 ? `${h}${NB}h` : `${h}${NB}h${NB}${String(m).padStart(2, '0')}`
}

/** Les réunions d'un jour, de la plus matinale à la plus tardive. */
export function reunionsDuJour(reunions: Reunion[], jour: string): Reunion[] {
  return trierReunionsParHeure(reunions.filter((r) => r.date === jour))
}

/** « 6 courses · 13 h – 15 h 55 », « 1 course · 13 h », « 6 courses » sans horaire. */
export function resumeReunion(r: Reunion): string {
  const n = r.courses.length
  const volume = `${n}${NB}course${n > 1 ? 's' : ''}`
  const { premiere, derniere } = bornesHoraires(r.courses)
  if (!premiere) return volume
  const plage =
    derniere && derniere !== premiere
      ? `${heureLisible(premiere)}${NB}– ${heureLisible(derniere)}`
      : heureLisible(premiere)
  return `${volume} · ${plage}`
}

export type StatutReunion = 'aVenir' | 'enCours' | 'terminee'

export interface Avancee {
  total: number
  /**
   * Courses dont l'ARRIVÉE est relevée — c'est ce que la barre mesure. Pas les
   * départs donnés : un départ passé ne montre encore rien au client, et une
   * barre pleine devant des arrivées absentes promettrait un résultat qu'il ne
   * trouverait pas en ouvrant la réunion.
   */
  courues: number
  /** Départs donnés (heure passée ou arrivée relevée) : sert au seul texte. */
  departs: number
  premiere: string | null
  statut: StatutReunion
}

export function avanceeReunion(r: Reunion, m: InstantParis): Avancee {
  const e = compterEtats(r.courses, m)
  const total = r.courses.length
  const courues = e.terminee
  const departs = e.terminee + e.departPasse + e.nonRelevee
  const statut: StatutReunion =
    total > 0 && courues === total ? 'terminee' : departs === 0 ? 'aVenir' : 'enCours'
  return { total, courues, departs, premiere: bornesHoraires(r.courses).premiere, statut }
}

/**
 * Le texte qui double la barre : la couleur ne dit jamais rien seule.
 *
 * Il nomme ce qui est COMPTÉ — des arrivées relevées, pas des « courses
 * courues » : avec la demi-heure de délai du relevé, une course partie n'a pas
 * encore d'arrivée, et « 3 courses courues » contredirait le client qui vient
 * de voir partir la quatrième.
 *
 * Aucune heure ici : la plage horaire est déjà écrite juste au-dessus
 * (`resumeReunion`), la répéter chargerait chaque ligne pour rien.
 */
export function texteAvancee(a: Avancee): string {
  if (a.total === 0) return 'Aucune course'
  if (a.statut === 'terminee') return 'Terminée'
  if (a.statut === 'aVenir') return a.premiere ? 'À venir' : 'Horaires non communiqués'
  if (a.courues === 0) return 'Première arrivée à venir'
  return `${a.courues}${NB}arrivée${a.courues > 1 ? 's' : ''} sur ${a.total}`
}

/**
 * Ce que le hero montre d'un jour : au plus `MAX_REUNIONS_HERO` réunions, et,
 * au-delà, le lien vers la page Réunions filtrée sur ce jour.
 */
export function apercuReunions(
  reunions: Reunion[],
  jour: string,
): { visibles: Reunion[]; total: number; lienTout: string | null } {
  const liste = reunionsDuJour(reunions, jour)
  const visibles = liste.slice(0, MAX_REUNIONS_HERO)
  return {
    visibles,
    total: liste.length,
    lienTout: liste.length > visibles.length ? lienReunionsDuJour(jour) : null,
  }
}

/** '/reunions?jour=AAAA-MM-JJ' — lu par `jourDemande` sur la page Réunions. */
export function lienReunionsDuJour(jour: string): string {
  return `/reunions?jour=${encodeURIComponent(jour)}`
}

/** `?jour=` de la page Réunions : une date AAAA-MM-JJ réelle, sinon ignoré. */
export function jourDemande(brut: string | null): string | null {
  if (!brut || !/^\d{4}-\d{2}-\d{2}$/.test(brut)) return null
  const [a, m, j] = brut.split('-').map(Number)
  const d = new Date(Date.UTC(a, m - 1, j))
  return d.getUTCFullYear() === a && d.getUTCMonth() === m - 1 && d.getUTCDate() === j ? brut : null
}

/**
 * Le filtre par jour de la page Réunions : un jour demandé l'emporte sur la
 * période (et la commande Période se retire alors de l'écran, voir Reunions).
 */
export function garderSelonJour(r: Reunion, jour: string | null, depuis: string): boolean {
  return jour ? r.date === jour : r.date >= depuis
}

/**
 * Le jour sur lequel l'accueil s'ouvre : aujourd'hui, sauf s'il n'a aucune
 * réunion alors que demain en a — s'ouvrir sur un panneau vide serait une faute.
 */
export function jourParDefaut(reunions: Reunion[], aujourdhui: string, demain: string): string {
  const peuple = (d: string) => reunions.some((r) => r.date === d)
  return !peuple(aujourdhui) && peuple(demain) ? demain : aujourdhui
}
