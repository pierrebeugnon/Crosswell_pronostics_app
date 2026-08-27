import { DEMO, MODELE_CLIENT } from '@/config/app'
import { supabase, VUE_PREDICTIONS, configure } from '@/lib/supabase'
import { lignesDemo } from '@/lib/demo'
import type { LignePrediction } from '@/types'

/**
 * PostgREST plafonne une réponse à 1 000 lignes, silencieusement. Une réunion
 * de huit courses à quinze partants en fait déjà 120 ; un mois d'historique
 * dépasse largement le plafond, et la page afficherait des taux calculés sur
 * une fraction des courses sans qu'aucune erreur ne le signale. On pagine donc
 * explicitement.
 */
const PAGE = 1000

/** Sécurité : au-delà, c'est une boucle, pas un historique. */
const PAGES_MAX = 60

type Filtre = (q: ReturnType<typeof requete>) => ReturnType<typeof requete>

function requete() {
  return supabase.from(VUE_PREDICTIONS).select('*').eq('model_version', MODELE_CLIENT)
}

async function charger(appliquer: Filtre): Promise<LignePrediction[]> {
  if (DEMO) return lignesDemo()
  if (!configure) {
    throw new Error(
      "La connexion à la base n'est pas configurée. Renseignez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.",
    )
  }

  const tout: LignePrediction[] = []
  for (let page = 0; page < PAGES_MAX; page++) {
    const { data, error } = await appliquer(requete())
      .order('reunion_date', { ascending: false })
      .order('hippodrome', { ascending: true })
      .order('course_num', { ascending: true })
      .order('pred_rank', { ascending: true })
      .range(page * PAGE, page * PAGE + PAGE - 1)

    if (error) throw new Error(traduire(error.message))
    const lot = (data ?? []) as LignePrediction[]
    tout.push(...lot)
    if (lot.length < PAGE) return tout
  }
  return tout
}

/** Les messages de PostgREST ne sont pas montrables à un client. */
function traduire(message: string): string {
  if (/JWT|permission denied|row-level security/i.test(message)) {
    return "Votre session n'a plus accès aux pronostics. Reconnectez-vous."
  }
  if (/does not exist|schema cache/i.test(message)) {
    return "La vue des pronostics est introuvable. Appliquez db/001_acces_client.sql sur la base."
  }
  return 'Les pronostics sont momentanément indisponibles. Réessayez dans un instant.'
}

/** Toutes les lignes entre deux dates incluses. */
export function chargerPlage(depuis: string, jusqua: string) {
  return charger((q) => q.gte('reunion_date', depuis).lte('reunion_date', jusqua))
}

/** Une journée entière, toutes réunions confondues. */
export function chargerJour(date: string) {
  return charger((q) => q.eq('reunion_date', date))
}

/** Une réunion. */
export function chargerReunion(date: string, hippodrome: string) {
  return charger((q) => q.eq('reunion_date', date).eq('hippodrome', hippodrome))
}

/** Une course. */
export function chargerCourse(date: string, hippodrome: string, numero: number) {
  return charger((q) =>
    q.eq('reunion_date', date).eq('hippodrome', hippodrome).eq('course_num', numero),
  )
}

/** Tout l'historique du modèle servi — utilisé par la page « Nos résultats ». */
export function chargerHistorique() {
  return charger((q) => q)
}

/**
 * Abonnement temps réel : rappelle `onChange` quand les prédictions bougent.
 * Retourne la fonction de désabonnement. Si la Realtime n'est pas activée côté
 * base, l'abonnement reste muet et le rafraîchissement périodique prend le
 * relais — d'où l'intérêt de garder les deux.
 */
export function suivreEnDirect(onChange: () => void): () => void {
  if (DEMO || !configure) return () => {}
  const canal = supabase
    .channel('client-predictions')
    .on(
      'postgres_changes',
      { event: '*', schema: 'modele_prediction_engagement', table: 'predictions_log' },
      () => onChange(),
    )
    .subscribe()
  return () => {
    supabase.removeChannel(canal)
  }
}
