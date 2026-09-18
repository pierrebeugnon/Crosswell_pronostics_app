import { decalerJour, jourISO } from '@/lib/format'

/**
 * LES PÉRIODES DE MESURE — une définition, pour tous les écrans.
 *
 * Avant ce module, « 30 jours » valait trois choses : J−30 à demain sur
 * l'accueil et les réunions, J−29 sans borne haute sur « Nos résultats ». Le
 * même client lisait donc deux taux différents pour une promesse identique.
 *
 * LA RÈGLE, alignée sur l'outil interne :
 *
 * - « N jours » = les N derniers jours, AUJOURD'HUI COMPRIS : [J−(N−1) ; J].
 *   Le jour en cours n'ajoute que ses courses déjà jugées — une course à venir
 *   n'entre dans aucun taux — et c'est ce qui fait bouger les chiffres le soir.
 * - Toute période s'arrête à AUJOURD'HUI. Demain n'est jamais une période de
 *   mesure : ses courses ne sont pas jugées, et elles gonflaient le compte des
 *   réunions.
 * - Les jours sont des jours de Paris (voir `jourISO`).
 *
 * Écart assumé avec l'outil interne : ses périodes « mois en cours » et
 * « 3 mois » incluent le lendemain déjà prédit. Cela ne change aucun taux —
 * seulement les compteurs de courses à venir.
 */
export type Periode = 'hier' | '7j' | '30j' | 'mois' | 'moisPrecedent' | '3m' | 'tout'

export interface DefinitionPeriode {
  /** Libellé de contrôle : « 30 jours ». */
  libelle: string
  /** Libellé en phrase : « sur les 30 derniers jours ». */
  phrase: string
}

export const PERIODES: Record<Periode, DefinitionPeriode> = {
  hier: { libelle: 'Hier', phrase: 'hier' },
  '7j': { libelle: '7 jours', phrase: 'sur les 7 derniers jours' },
  '30j': { libelle: '30 jours', phrase: 'sur les 30 derniers jours' },
  mois: { libelle: 'Mois en cours', phrase: 'depuis le début du mois' },
  moisPrecedent: { libelle: 'Mois dernier', phrase: 'le mois dernier' },
  '3m': { libelle: '3 mois', phrase: 'sur les 3 derniers mois' },
  tout: { libelle: 'Tout', phrase: 'sur tout l’historique' },
}

export const LISTE_PERIODES = Object.keys(PERIODES) as Periode[]

/**
 * La période que couvre la fenêtre partagée de `DonneesContext` (plus demain).
 * Tout chiffre calculé sur les données du contexte porte sur cette période.
 */
export const PERIODE_FENETRE: Periode = '30j'

export interface Bornes {
  /** Premier jour inclus ; null = depuis le début de l'historique. */
  depuis: string | null
  /** Dernier jour inclus. */
  jusqua: string
}

/** Nombre de jours glissants des périodes qui en ont un. */
const GLISSANTES: Partial<Record<Periode, number>> = { '7j': 7, '30j': 30, '3m': 90 }

export function bornesPeriode(periode: Periode, aujourdhui: string = jourISO(0)): Bornes {
  const glissante = GLISSANTES[periode]
  if (glissante) return { depuis: decalerJour(aujourdhui, -(glissante - 1)), jusqua: aujourdhui }

  switch (periode) {
    case 'hier': {
      const hier = decalerJour(aujourdhui, -1)
      return { depuis: hier, jusqua: hier }
    }
    case 'mois':
      return { depuis: `${aujourdhui.slice(0, 8)}01`, jusqua: aujourdhui }
    case 'moisPrecedent': {
      const premierDuMois = `${aujourdhui.slice(0, 8)}01`
      const dernierDuPrecedent = decalerJour(premierDuMois, -1)
      return { depuis: `${dernierDuPrecedent.slice(0, 8)}01`, jusqua: dernierDuPrecedent }
    }
    default:
      return { depuis: null, jusqua: aujourdhui }
  }
}

/** Vrai si la date ISO tombe dans les bornes, bornes incluses. */
export function dansBornes(date: string, { depuis, jusqua }: Bornes): boolean {
  return (depuis == null || date >= depuis) && date <= jusqua
}

export function dansPeriode(date: string, periode: Periode, aujourdhui?: string): boolean {
  return dansBornes(date, bornesPeriode(periode, aujourdhui))
}

/**
 * Lit une valeur venue de l'URL parmi celles permises. Une valeur inconnue —
 * lien ancien, faute de frappe — retombe sur le défaut au lieu de casser la page.
 */
export function lireParmi<T extends string>(valeur: string | null, permises: readonly T[], defaut: T): T {
  return valeur != null && (permises as readonly string[]).includes(valeur) ? (valeur as T) : defaut
}

/** `lireParmi`, restreint aux périodes de mesure. */
export function lirePeriode<P extends Periode>(
  valeur: string | null,
  permises: readonly P[],
  defaut: P,
): P {
  return lireParmi(valeur, permises, defaut)
}
