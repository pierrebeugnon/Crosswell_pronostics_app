import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { DEMO } from '@/config/app'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Le mode démonstration ne doit joindre aucun serveur : pas de client du tout. */
export const configure = Boolean(url && anon) && !DEMO

if (!configure && !DEMO) {
  console.error(
    'Crosswell — VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants. ' +
      'Copiez .env.example vers .env, ou lancez avec VITE_DEMO=1.',
  )
}

export const supabase: SupabaseClient = createClient(url ?? 'http://localhost', anon ?? 'anon', {
  auth: {
    // Le client reste connecté d'une visite à l'autre : une plateforme qu'il
    // faut reconnecter à chaque réunion n'est pas utilisable un dimanche matin.
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'crosswell:auth',
  },
})

/** Vue exposée aux clients (lecture seule, RLS — voir db/001_acces_client.sql). */
export const VUE_PREDICTIONS = 'client_predictions'
