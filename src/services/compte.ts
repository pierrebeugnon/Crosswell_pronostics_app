import { DEMO } from '@/config/app'
import { supabase } from '@/lib/supabase'
import { messageDe } from '@/services/paiement'

/**
 * LA SUPPRESSION DU COMPTE.
 *
 * Elle ne peut pas se faire depuis le navigateur : effacer un utilisateur
 * demande la clé de service, et surtout il faut ARRÊTER L'ABONNEMENT STRIPE
 * AVANT d'effacer le compte. `public.abonnements.user_id` est en ON DELETE
 * CASCADE (`db/007`) et c'est le seul endroit où vivent nos identifiants
 * Stripe : supprimer d'abord, c'est perdre le lien avec l'abonnement qui
 * continue de prélever. Tout l'ordre est dans
 * `supabase/functions/supprimer-compte/index.ts`.
 *
 * Ce n'est PAS la résiliation. La résiliation garde l'accès jusqu'au terme déjà
 * payé (CGV, article 7) ; la suppression coupe tout de suite. L'écran doit le
 * dire avant, et proposer l'autre chemin.
 */

/** Le mot que le client tape à l'écran ; le serveur refuse tout appel sans lui. */
export const MOT_DE_CONFIRMATION = 'SUPPRIMER'

export async function supprimerCompte(confirmation: string): Promise<void> {
  if (DEMO) throw new Error('Indisponible en mode démonstration.')
  const { data, error } = await supabase.functions.invoke<{ ok?: boolean }>('supprimer-compte', {
    body: { confirmation },
  })
  // `ok` DOIT être vrai. La fonction ne le renvoie qu'une fois le compte
  // réellement effacé : sans lui, la procédure s'est arrêtée en chemin, et le
  // pire serait de déconnecter le client en lui disant que c'est fait.
  if (error || !data?.ok) {
    throw new Error(await messageDe(error, 'La suppression n’a pas abouti. Réessayez dans un instant, ou écrivez-nous.'))
  }
}