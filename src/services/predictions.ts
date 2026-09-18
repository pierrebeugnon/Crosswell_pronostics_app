import { DEMO, MODELE_CLIENT } from '@/config/app'
import { supabase, VUE_PREDICTIONS, configure } from '@/lib/supabase'
import { lignesDemo } from '@/lib/demo'
import { verrouillerLignes } from '@/lib/acces'
import { jourISO } from '@/lib/format'
import { accesDemoGratuit } from '@/services/acces'
import type { LignePrediction } from '@/types'

/**
 * PostgREST plafonne une réponse à 1 000 lignes, silencieusement. Une réunion
 * de huit courses à quinze partants en fait déjà 120 ; un mois d'historique
 * dépasse largement le plafond, et la page afficherait des taux calculés sur
 * une fraction des courses sans qu'aucune erreur ne le signale. On pagine donc
 * explicitement.
 */
const PAGE = 1000

/**
 * Sécurité : au-delà, c'est une boucle, pas un historique. Au rythme de
 * septembre 2026 (~190 lignes par jour), le plafond est atteint vers juin 2027 ;
 * les agrégats de « Nos résultats » devront être servis par la base avant.
 */
const PAGES_MAX = 60

type Filtre = (q: ReturnType<typeof requete>) => ReturnType<typeof requete>

function requete() {
  return supabase.from(VUE_PREDICTIONS).select('*').eq('model_version', MODELE_CLIENT)
}

/**
 * Le tri doit être TOTAL — il se termine sur la clé unique de la table. Sans
 * `horse_num`, deux chevaux de même rang pouvaient échanger leur place entre
 * deux requêtes : l'un apparaissait deux fois, l'autre jamais, et la
 * déduplication masquait le doublon mais pas le trou.
 */
function trier(q: ReturnType<typeof requete>) {
  return q
    .order('reunion_date', { ascending: false })
    .order('hippodrome', { ascending: true })
    .order('course_num', { ascending: true })
    .order('pred_rank', { ascending: true, nullsFirst: false })
    .order('horse_num', { ascending: true })
}

/** Un chargement, et s'il a buté sur le plafond de pages. */
export interface Chargement {
  lignes: LignePrediction[]
  /** Vrai si le plafond a été atteint : les jours les plus anciens manquent. */
  tronque: boolean
}

async function chargerPagine(appliquer: Filtre): Promise<Chargement> {
  // Démo en formule Gratuit (`?acces=gratuit`) : la règle de la base, reproduite.
  if (DEMO) return { lignes: accesDemoGratuit() ? verrouillerLignes(lignesDemo(), jourISO(0)) : lignesDemo(), tronque: false }
  if (!configure) {
    throw new Error(
      "La connexion à la base n'est pas configurée. Renseignez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.",
    )
  }

  const tout: LignePrediction[] = []
  for (let page = 0; page < PAGES_MAX; page++) {
    const { data, error } = await trier(appliquer(requete())).range(
      page * PAGE,
      page * PAGE + PAGE - 1,
    )

    if (error) throw new Error(traduire(error.message))
    const lot = (data ?? []) as LignePrediction[]
    tout.push(...lot)
    if (lot.length < PAGE) return { lignes: tout, tronque: false }
  }
  // Plafond atteint sur une page pleine : reste-t-il vraiment des lignes ? Un
  // historique d'exactement PAGES_MAX × PAGE lignes est complet, et l'annoncer
  // « partiel » ferait écarter à tort sa journée la plus ancienne.
  const { data: suite, error } = await trier(appliquer(requete())).range(
    PAGES_MAX * PAGE,
    PAGES_MAX * PAGE,
  )
  if (error) throw new Error(traduire(error.message))
  return { lignes: tout, tronque: (suite ?? []).length > 0 }
}

async function charger(appliquer: Filtre): Promise<LignePrediction[]> {
  return (await chargerPagine(appliquer)).lignes
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

/**
 * Une journée entière, toutes réunions confondues. En démonstration, le jeu
 * COMPLET revient : l'appelant refiltre par date.
 */
export function chargerJour(date: string) {
  return charger((q) => q.eq('reunion_date', date))
}

/** Une course. */
export function chargerCourse(date: string, hippodrome: string, numero: number) {
  return charger((q) =>
    q.eq('reunion_date', date).eq('hippodrome', hippodrome).eq('course_num', numero),
  )
}

/**
 * Tout l'historique du modèle servi — utilisé par la page « Nos résultats ».
 * Renvoie aussi `tronque` : une page de statistiques qui perd ses plus vieilles
 * courses doit le dire, pas afficher un « Tout » qui n'en est plus un.
 */
export function chargerHistorique(): Promise<Chargement> {
  return chargerPagine((q) => q)
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
