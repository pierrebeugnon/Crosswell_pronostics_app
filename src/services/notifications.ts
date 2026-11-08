import { DEMO, VAPID_CLE_PUBLIQUE } from '@/config/app'
import { supabase } from '@/lib/supabase'
import { CHOIX_PAR_DEFAUT, nomNavigateur, octetsDeBase64Url, possibilite, type Choix, type Possibilite } from '@/lib/notifications'
import { messageDe } from '@/services/paiement'

/**
 * LES NOTIFICATIONS PUSH, CÔTÉ NAVIGATEUR (db/021, db/022).
 *
 * Le navigateur s'abonne auprès de son service de push (Google, Apple,
 * Mozilla) avec notre clé publique ; l'adresse d'envoi qu'il rend est rangée
 * dans `notifications_appareils`, avec les choix du client. La fonction
 * `notifications-push` y écrit ensuite, sur l'appel de pg_cron.
 *
 * Le service worker (`public/sw.js`) n'est enregistré qu'au moment où le client
 * active les alertes : un client qui n'en veut pas n'en porte aucun.
 */

const TABLE = 'notifications_appareils'

export interface Etat {
  possibilite: Possibilite
  /** Abonné sur CET appareil, avec ses choix. */
  abonne: boolean
  choix: Choix
}

/** Ouverte depuis l'écran d'accueil (app installée), et non dans un onglet. */
export function appInstallee(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia?.('(display-mode: standalone)').matches === true || nav.standalone === true
}

function appareilCourant() {
  const nav = navigator
  return {
    userAgent: nav.userAgent,
    maxTouchPoints: nav.maxTouchPoints ?? 0,
    installee: appInstallee(),
    serviceWorker: 'serviceWorker' in nav,
    pushManager: 'PushManager' in window,
    permission: 'Notification' in window ? Notification.permission : null,
  }
}

async function abonnementNavigateur(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null
  const enregistrement = await navigator.serviceWorker.getRegistration('/')
  return (await enregistrement?.pushManager.getSubscription()) ?? null
}

export async function lireEtat(): Promise<Etat> {
  const p = possibilite(appareilCourant())
  if (DEMO || p !== 'pret') return { possibilite: p, abonne: false, choix: CHOIX_PAR_DEFAUT }
  const abo = await abonnementNavigateur()
  if (!abo) return { possibilite: p, abonne: false, choix: CHOIX_PAR_DEFAUT }
  const { data } = await supabase
    .from(TABLE)
    .select('course_offerte, confiance_elevee, belles_victoires')
    .eq('endpoint', abo.endpoint)
    .maybeSingle()
  // Abonné côté navigateur mais inconnu de la base (ligne supprimée après des
  // échecs, autre compte) : on le présente comme NON abonné, et « Activer »
  // réécrit la ligne.
  if (!data) return { possibilite: p, abonne: false, choix: CHOIX_PAR_DEFAUT }
  return {
    possibilite: p,
    abonne: true,
    choix: { courseOfferte: data.course_offerte, confianceElevee: data.confiance_elevee, bellesVictoires: data.belles_victoires },
  }
}

/** Ce que le client a demandé, transcrit en colonnes. */
const colonnes = (c: Choix) => ({
  course_offerte: c.courseOfferte,
  confiance_elevee: c.confianceElevee,
  belles_victoires: c.bellesVictoires,
})

async function enregistrer(abo: PushSubscription, userId: string, choix: Choix): Promise<boolean> {
  const j = abo.toJSON()
  const { error } = await supabase.from(TABLE).upsert(
    {
      user_id: userId,
      endpoint: abo.endpoint,
      p256dh: j.keys?.p256dh ?? '',
      auth: j.keys?.auth ?? '',
      navigateur: nomNavigateur(navigator.userAgent),
      ...colonnes(choix),
    },
    { onConflict: 'endpoint' },
  )
  return !error
}

/**
 * Active les alertes sur cet appareil. La demande d'autorisation DOIT partir
 * d'un geste du client (un clic) : les navigateurs refusent sinon, et Safari
 * pour de bon.
 */
export async function activer(userId: string, choix: Choix): Promise<void> {
  if (DEMO) throw new Error('Indisponible en mode démonstration.')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Les notifications ont été refusées sur cet appareil.')
  const enregistrement = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  await navigator.serviceWorker.ready
  const options = { userVisibleOnly: true, applicationServerKey: octetsDeBase64Url(VAPID_CLE_PUBLIQUE) }
  let abo = await enregistrement.pushManager.getSubscription()
  if (!abo) abo = await enregistrement.pushManager.subscribe(options)
  if (await enregistrer(abo, userId, choix)) return
  // L'adresse appartient déjà à un AUTRE compte (appareil partagé, changement
  // de compte) : la règle d'accès interdit d'y toucher. On en demande une
  // nouvelle au navigateur, qui révoque l'ancienne chez le service de push.
  await abo.unsubscribe()
  abo = await enregistrement.pushManager.subscribe(options)
  if (!(await enregistrer(abo, userId, choix))) throw new Error('L’abonnement n’a pas pu être enregistré. Réessayez dans un instant.')
}

export async function changerChoix(choix: Choix): Promise<void> {
  const abo = await abonnementNavigateur()
  if (!abo) throw new Error('Cet appareil n’est plus abonné.')
  const { error } = await supabase
    .from(TABLE)
    .update({ ...colonnes(choix), maj_le: new Date().toISOString() })
    .eq('endpoint', abo.endpoint)
  if (error) throw new Error('Le changement n’a pas été enregistré.')
}

export async function desactiver(): Promise<void> {
  const abo = await abonnementNavigateur()
  if (!abo) return
  await supabase.from(TABLE).delete().eq('endpoint', abo.endpoint)
  await abo.unsubscribe()
}

/** Une notification d'essai sur les appareils du compte. */
export async function envoyerEssai(): Promise<number> {
  const { data, error } = await supabase.functions.invoke<{ reussis?: number }>('notifications-push', {
    body: { mode: 'essai' },
  })
  if (error) throw new Error(await messageDe(error, 'L’essai n’a pas pu partir. Réessayez dans un instant.'))
  return data?.reussis ?? 0
}
