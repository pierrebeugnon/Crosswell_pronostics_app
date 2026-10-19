import { createClient } from '@supabase/supabase-js'

/**
 * L'ACCÈS AUX DONNÉES DU SITE VITRINE — et il est volontairement MINUSCULE.
 *
 * Jusqu'au 19/10/2026 le site ne lisait rien : « statique, aucune base, aucun
 * compte, aucun appel réseau ». Les pages de résultats changent cela, mais pas
 * au-delà de ce qu'elles demandent :
 *
 * - AUCUNE SESSION, AUCUN COMPTE. `persistSession` et `autoRefreshToken` sont
 *   coupés : la connexion vit dans l'application, sur une autre origine, et le
 *   site n'a aucune raison d'écrire dans le stockage du navigateur.
 * - DEUX VUES, ET DEUX SEULEMENT : `resultats_publics` et `programme_public`
 *   (migrations db/013 et db/014). Tout le reste est fermé à la clé anonyme —
 *   vérifié en HTTP : `client_predictions` répond 401, `predictions_log` 404.
 * - LE VERROU EST EN BASE, PAS ICI. Une course pas encore jugée n'a aucune
 *   ligne dans `resultats_publics`, et `programme_public` ne porte aucune
 *   colonne de probabilité. Ce fichier ne filtre rien : il ne le pourrait pas
 *   mieux que le SQL, et un filtre côté client s'oublie.
 *
 * La clé anonyme est PUBLIQUE par conception : elle part dans le bundle, comme
 * dans l'application. Ce qu'elle ouvre est décidé par les droits, pas par le
 * secret de la clé.
 */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const cle = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * `null` quand les variables manquent — en développement sans `.env`, par
 * exemple. Les pages affichent alors leur état « indisponible » au lieu de
 * planter au chargement du module : un site vitrine dont l'accueil tombe parce
 * qu'une page de résultats n'a pas sa configuration serait un mauvais échange.
 */
export const supabase =
  url && cle
    ? createClient(url, cle, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      })
    : null

export const donneesDisponibles = () => supabase !== null
