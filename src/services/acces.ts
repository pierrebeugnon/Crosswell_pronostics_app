import { DEMO } from '@/config/app'
import { supabase, configure } from '@/lib/supabase'
import { ACCES_SANS_FILTRE, lireAcces, type Acces } from '@/lib/acces'

/**
 * L'ACCÈS DU COMPTE (`db/007`, `crosswell_mon_acces()`).
 *
 * DÉMONSTRATION : Pass mensuel actif par défaut ; `?acces=gratuit` dans
 * l'adresse montre la formule Gratuit (retenu pour l'onglet), `?acces=pass` y
 * revient.
 */
const CLE_DEMO = 'crosswell.demo.acces'

export function accesDemoGratuit(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const demande = new URLSearchParams(window.location.search).get('acces')
    if (demande === 'gratuit' || demande === 'pass') window.sessionStorage.setItem(CLE_DEMO, demande)
    return window.sessionStorage.getItem(CLE_DEMO) === 'gratuit'
  } catch {
    return false
  }
}

export async function chargerAcces(): Promise<Acces> {
  if (DEMO) {
    if (accesDemoGratuit()) return { complet: false, formule: 'gratuit', statut: 'aucun', accesJusqua: null, clientStripe: false }
    const fin = new Date(Date.now() + 20 * 86_400_000).toISOString()
    return { complet: true, formule: 'mois', statut: 'actif', accesJusqua: fin, clientStripe: true }
  }
  if (!configure) return ACCES_SANS_FILTRE
  const { data, error } = await supabase.rpc('crosswell_mon_acces')
  // Lecture en échec : on ne coupe personne. La base filtre de toute façon
  // (`db/007`), et les courses se verrouillent sur ce qu'elle renvoie.
  if (error) return ACCES_SANS_FILTRE
  return lireAcces(data)
}
