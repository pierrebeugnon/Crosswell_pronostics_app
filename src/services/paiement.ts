import { DEMO } from '@/config/app'
import { supabase } from '@/lib/supabase'
import type { Pass } from '@/lib/inscription'

/**
 * LE PAIEMENT — Stripe (décision du fondateur du 18/09/2026), branché plus
 * tard. L'inscription est développée « comme si tout était prêt » : ce fichier
 * est le contrat, et seule sa partie réelle reste à écrire côté serveur.
 *
 * DEUX PRINCIPES QUI NE BOUGERONT PAS (repris des travaux du 16/09) :
 * - AUCUNE DONNÉE DE CARTE NE TRANSITE PAR L'APP. On demande une session de
 *   paiement Stripe Checkout (page HÉBERGÉE par Stripe) et on y envoie le
 *   client. Il n'existe, et n'existera, aucun champ de carte dans ce code —
 *   d'où l'écart avec la maquette « Paiement », qui en dessine.
 * - LA CLÉ SECRÈTE STRIPE NE VIT JAMAIS CÔTÉ CLIENT. L'appel passe par une
 *   fonction Supabase, authentifiée par le jeton de session du client.
 *
 * CÔTÉ SERVEUR (18/09/2026, écrit, NON DÉPLOYÉ — `supabase/functions/README.md`) :
 * - `paiement-session` crée la session Checkout (paiement unique pour le Pass
 *   1 jour, abonnement pour le mensuel et l'annuel) et garde le consentement ;
 * - `stripe-webhook` est SEUL à ouvrir l'accès (un retour « succès » ne prouve
 *   aucun paiement) ;
 * - `portail-stripe` ouvre le portail client (carte, factures, résiliation) ;
 * - la base filtre les pronostics par formule (`db/007`, appliquée le 18/09).
 * Restent : les conditions générales de vente publiées, et les textes de
 * rétractation (`texteConsentement`) validés par un juriste.
 */

export interface DemandePaiement {
  formule: Pass
  /** Le texte EXACT de la case cochée par le client, avec sa demande d'accès immédiat. */
  consentement: string
}

/** L'adresse où envoyer le client : la page Stripe, ou, en démo, l'étape suivante. */
export interface Redirection {
  redirection: string
  /** Vrai si l'adresse sort de l'application (page hébergée de Stripe). */
  externe: boolean
}

/**
 * Le message d'une fonction serveur en erreur (« Vous avez déjà un abonnement
 * en cours… »), ou le repli donné. `supabase.functions.invoke` range la réponse
 * dans `error.context`.
 */
async function messageDe(error: unknown, repli: string): Promise<string> {
  const reponse = (error as { context?: Response } | null)?.context
  if (reponse && typeof reponse.json === 'function') {
    try {
      const corps = (await reponse.json()) as { message?: unknown }
      if (typeof corps.message === 'string' && corps.message) return corps.message
    } catch {
      /* corps illisible : le repli */
    }
  }
  return repli
}

/**
 * Le portail client Stripe (carte, factures, résiliation en ligne), depuis la
 * page Compte. En démo, rien ne s'ouvre.
 */
export async function ouvrirPortail(): Promise<Redirection> {
  if (DEMO) throw new Error('Démonstration : le portail Stripe ne s’ouvre pas.')
  const { data, error } = await supabase.functions.invoke<{ url?: string }>('portail-stripe', {
    body: { retour: `${window.location.origin}/compte` },
  })
  if (error || !data?.url) {
    throw new Error(await messageDe(error, 'Le portail de paiement n’est pas encore ouvert. Écrivez-nous pour gérer votre abonnement.'))
  }
  return { redirection: data.url, externe: true }
}

export async function demarrerPaiement(d: DemandePaiement): Promise<Redirection> {
  if (DEMO) {
    // La démonstration ne quitte jamais l'app : le paiement est réputé réussi.
    return { redirection: `/inscription?etape=bienvenue&formule=${d.formule}`, externe: false }
  }
  const origine = window.location.origin
  const { data, error } = await supabase.functions.invoke<{ url?: string }>('paiement-session', {
    body: {
      formule: d.formule,
      consentement: { demandeAccesImmediat: true, formulation: d.consentement },
      retour: `${origine}/inscription?etape=bienvenue&formule=${d.formule}`,
      annulation: `${origine}/inscription?etape=paiement&formule=${d.formule}`,
    },
  })
  if (error || !data?.url) {
    throw new Error(await messageDe(error, 'Le paiement en ligne n’est pas encore ouvert. Écrivez-nous pour activer votre Pass.'))
  }
  return { redirection: data.url, externe: true }
}
