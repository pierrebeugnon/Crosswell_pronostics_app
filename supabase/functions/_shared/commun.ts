// Ce que partagent les fonctions Stripe de Crosswell Pronostics : clients Stripe
// et Supabase, CORS, réponses, lecture de l'utilisateur.
//
// NON DÉPLOYÉES tant que le fondateur ne l'a pas validé — voir README.md.

import Stripe from 'npm:stripe@16.12.0'
import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2.45.0'

/** Les formules payantes, et le secret qui porte l'identifiant de leur prix Stripe. */
export type Pass = 'jour' | 'mois' | 'an'
export const PASS: readonly Pass[] = ['jour', 'mois', 'an']
const VARIABLE_PRIX: Record<Pass, string> = {
  jour: 'STRIPE_PRIX_JOUR',
  mois: 'STRIPE_PRIX_MOIS',
  an: 'STRIPE_PRIX_AN',
}

export function exiger(nom: string): string {
  const v = Deno.env.get(nom)
  if (!v) throw new Error(`Variable manquante : ${nom}`)
  return v
}

export const prixStripe = (p: Pass) => exiger(VARIABLE_PRIX[p])

/**
 * Version d'API figée : `current_period_end` y est porté par l'abonnement lui-même
 * (les versions de 2025 l'ont déplacé sur ses éléments).
 */
export const stripe = new Stripe(exiger('STRIPE_SECRET_KEY'), {
  apiVersion: '2024-06-20',
  httpClient: Stripe.createFetchHttpClient(),
})

/** Le client de SERVICE : il écrit l'état d'abonnement, que les clients ne font que lire. */
export const admin: SupabaseClient = createClient(exiger('SUPABASE_URL'), exiger('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
})

/**
 * Les origines de l'application, séparées par des virgules (`APP_URL`), par
 * exemple « https://crosswell-pronostics.vercel.app,http://localhost:5190 ».
 * Les adresses de retour envoyées par l'app doivent en faire partie : sans ce
 * contrôle, la fonction servirait de redirection ouverte.
 */
export function origines(): string[] {
  return exiger('APP_URL')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean)
}

export function adresseAutorisee(url: unknown): url is string {
  if (typeof url !== 'string') return false
  try {
    return origines().includes(new URL(url).origin)
  } catch {
    return false
  }
}

export function enTetesCors(req: Request): Record<string, string> {
  const origine = req.headers.get('origin') ?? ''
  return {
    'Access-Control-Allow-Origin': origines().includes(origine) ? origine : origines()[0] ?? '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

export function json(req: Request, corps: unknown, statut = 200): Response {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { ...enTetesCors(req), 'Content-Type': 'application/json' },
  })
}

/** L'utilisateur du jeton de session joint par `supabase.functions.invoke`. */
export async function utilisateur(req: Request): Promise<User | null> {
  const jeton = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!jeton) return null
  const { data, error } = await admin.auth.getUser(jeton)
  return error ? null : data.user
}

export interface LigneAbonnement {
  user_id: string
  formule: 'gratuit' | Pass
  statut: 'aucun' | 'offert' | 'actif' | 'resiliation_programmee' | 'impaye' | 'expire'
  acces_jusqua: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
}

export async function lireAbonnement(userId: string): Promise<LigneAbonnement | null> {
  const { data, error } = await admin.from('abonnements').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw error
  return data as LigneAbonnement | null
}

/** Un abonnement mensuel ou annuel en cours : on n'en ouvre pas un second. */
export function abonnementEnCours(a: LigneAbonnement | null): boolean {
  return Boolean(
    a && (a.formule === 'mois' || a.formule === 'an') && (a.statut === 'actif' || a.statut === 'resiliation_programmee'),
  )
}
