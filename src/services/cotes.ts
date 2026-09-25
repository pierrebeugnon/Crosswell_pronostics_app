import { DEMO } from '@/config/app'
import { supabase, configure } from '@/lib/supabase'
import { minutesDe } from '@/lib/journee'
import type { ReleveCote } from '@/lib/cotes'
import type { Course } from '@/types'

/** La vue des relevés de cote, réservée aux comptes connectés — `db/008_cotes_historique.sql`. */
const VUE_COTES = 'client_cotes'

/**
 * Plafond de relevés lus pour une course : 30 partants × 17 relevés (toutes
 * les 30 minutes de 11 h à 19 h) tiennent largement dessous. Le plafond ne
 * sert qu'à borner la requête.
 */
const RELEVES_MAX = 700

interface LigneCote {
  horse_num: number
  heure: string
  cote: number | null
}

/**
 * Les relevés de cote d'une course. En démonstration, aucun : l'écran retombe
 * sur la courbe simulée (`lib/cotes.ts`). Rejette si la vue est absente
 * (migration 008 non appliquée) ou la session refusée — l'appelant garde alors
 * la course sans cote du jour, sans rien casser.
 */
export async function chargerCotes(c: Course): Promise<ReleveCote[]> {
  if (DEMO || !configure) return []

  const { data, error } = await supabase
    .from(VUE_COTES)
    .select('horse_num, heure, cote')
    .eq('reunion_date', c.date)
    .eq('hippodrome', c.hippodrome)
    .eq('course_num', c.numero)
    .order('releve_le', { ascending: true })
    .limit(RELEVES_MAX)
  if (error) throw new Error(error.message)

  const releves: ReleveCote[] = []
  for (const l of (data ?? []) as LigneCote[]) {
    if (l.cote == null || l.horse_num == null || !l.heure) continue
    releves.push({ numero: l.horse_num, minute: minutesDe(l.heure), cote: Number(l.cote) })
  }
  return releves
}
