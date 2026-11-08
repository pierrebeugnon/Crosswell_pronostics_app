// LES NOTIFICATIONS PUSH (db/021, db/022) : course offerte, confiance Élevée,
// belle victoire. Appelée par pg_cron toutes les 10 minutes, ou par un client
// connecté qui demande une notification d'essai.
//
// Deux entrées :
//   - { "mode": "tournee" } avec l'en-tête `x-crosswell-cron` = NOTIFS_CRON_SECRET :
//     lit les alertes dues (crosswell_push_evenements), réserve chacune dans
//     notifications_envois (une seule fois, même si deux appels se croisent),
//     puis l'envoie aux appareils concernés ;
//   - { "mode": "essai" } avec le jeton de session du client : une notification
//     de test sur SES appareils seulement, pour vérifier son téléphone.
//
// Déployée SANS vérification de JWT par la passerelle (`verify_jwt` faux) : le
// premier mode s'authentifie par son secret, le second par le jeton, vérifié
// ici. Aucune autre requête n'est servie.
//
// Secrets : VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUJET (mailto:…),
// NOTIFS_CRON_SECRET ; SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournis.

import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2.45.0'
import { COTE_BELLE_VICTOIRE, SEUIL_ELEVEE, charge, heureParis, heureUtile, verdict, type Evenement } from '../_shared/notifications_regles.ts'

const env = (n: string) => Deno.env.get(n) ?? ''
const SECRET = env('NOTIFS_CRON_SECRET')
const CONFIGUREE = Boolean(env('VAPID_PUBLIC_KEY') && env('VAPID_PRIVATE_KEY') && SECRET)
if (CONFIGUREE) {
  webpush.setVapidDetails(env('VAPID_SUJET') || 'mailto:contact@crosswell.io', env('VAPID_PUBLIC_KEY'), env('VAPID_PRIVATE_KEY'))
}

const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
})

const ORIGINES = env('APP_URL').split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean)

function reponse(req: Request, corps: unknown, statut = 200): Response {
  const origine = req.headers.get('origin') ?? ''
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': ORIGINES.includes(origine) ? origine : (ORIGINES[0] ?? origine),
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      Vary: 'Origin',
    },
  })
}

/** Comparaison en temps constant : le secret ne se devine pas caractère par caractère. */
function egal(a: string, b: string): boolean {
  if (!a || a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

interface Appareil {
  id: number
  endpoint: string
  p256dh: string
  auth: string
}

/** Envoie une alerte à des appareils ; tient leurs compteurs. Rend le nombre de réussites. */
async function envoyer(e: Evenement, appareils: Appareil[]): Promise<number> {
  const texte = JSON.stringify(charge(e))
  const avantDepart = e.type === 'confiance_elevee' || e.type === 'course_offerte'
  let reussis = 0
  // Par paquets de 20 : quelques centaines d'appareils tiennent dans le délai
  // d'une fonction, sans ouvrir des centaines de connexions d'un coup.
  for (let i = 0; i < appareils.length; i += 20) {
    await Promise.all(
      appareils.slice(i, i + 20).map(async (a) => {
        let statut: number | null = null
        try {
          const r = await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, texte, {
            // Avant un départ : périmée au bout de 30 min, et prioritaire.
            TTL: avantDepart ? 1800 : 3 * 3600,
            urgency: avantDepart ? 'high' : 'normal',
          })
          statut = r.statusCode
        } catch (err) {
          statut = (err as { statusCode?: number }).statusCode ?? null
          console.warn(`push ${a.id} : ${statut ?? 'réseau'} ${(err as Error).message ?? ''}`)
        }
        const v = verdict(statut)
        if (v === 'reussi') {
          reussis++
          await admin.from('notifications_appareils').update({ echecs: 0, dernier_envoi: new Date().toISOString() }).eq('id', a.id)
        } else if (v === 'supprimer') {
          await admin.from('notifications_appareils').delete().eq('id', a.id)
        } else {
          const { data } = await admin.from('notifications_appareils').select('echecs').eq('id', a.id).maybeSingle()
          await admin.from('notifications_appareils').update({ echecs: (data?.echecs ?? 0) + 1 }).eq('id', a.id)
        }
      }),
    )
  }
  return reussis
}

async function tournee(): Promise<unknown> {
  const heure = heureParis(new Date())
  if (!heureUtile(heure)) return { envoyees: [], motif: `hors des heures utiles (${heure}h)` }
  const { data: evenements, error } = await admin.rpc('crosswell_push_evenements', {
    p_seuil: SEUIL_ELEVEE,
    p_cote_min: COTE_BELLE_VICTOIRE,
  })
  if (error) throw error
  const faits = []
  for (const e of (evenements ?? []) as Evenement[]) {
    // LA RÉSERVATION AVANT L'ENVOI : si l'insertion ne rend rien, l'alerte est
    // déjà partie (ou part en ce moment, depuis un autre appel).
    const { data: reservee, error: err } = await admin
      .from('notifications_envois')
      .upsert({ type: e.type, cle: e.cle, titre: e.titre, corps: e.corps }, { onConflict: 'type,cle', ignoreDuplicates: true })
      .select('cle')
    if (err) throw err
    if (!reservee?.length) continue
    const { data: dest, error: e2 } = await admin.rpc('crosswell_push_destinataires', { p_type: e.type })
    if (e2) throw e2
    const appareils = (dest ?? []) as Appareil[]
    const reussis = await envoyer(e, appareils)
    await admin.from('notifications_envois').update({ destinataires: appareils.length, reussis }).eq('type', e.type).eq('cle', e.cle)
    faits.push({ type: e.type, cle: e.cle, destinataires: appareils.length, reussis })
  }
  return { envoyees: faits }
}

async function essai(req: Request): Promise<Response> {
  const jeton = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  const { data, error } = jeton ? await admin.auth.getUser(jeton) : { data: { user: null }, error: null }
  const user = error ? null : data.user
  if (!user) return reponse(req, { message: 'Connexion requise.' }, 401)
  const { data: appareils, error: e2 } = await admin
    .from('notifications_appareils')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', user.id)
  if (e2) throw e2
  if (!appareils?.length) return reponse(req, { message: 'Aucun appareil abonné sur ce compte.' }, 404)
  const e: Evenement = {
    type: 'test',
    cle: `${user.id}:${Date.now()}`,
    titre: 'Crosswell — notification d’essai',
    corps: 'Les alertes arrivent bien sur cet appareil.',
    url: '/compte',
  }
  const reussis = await envoyer(e, appareils as Appareil[])
  return reponse(req, { appareils: appareils.length, reussis })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return reponse(req, 'ok')
  if (req.method !== 'POST') return reponse(req, { message: 'Méthode non permise.' }, 405)
  if (!CONFIGUREE) {
    console.error('notifications-push : VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY ou NOTIFS_CRON_SECRET absent.')
    return reponse(req, { message: 'Configuration du serveur incomplète (clés de notification).' }, 503)
  }
  try {
    const corps = await req.json().catch(() => ({}))
    if (corps?.mode === 'tournee') {
      if (!egal(req.headers.get('x-crosswell-cron') ?? '', SECRET)) return reponse(req, { message: 'Refusé.' }, 401)
      return reponse(req, await tournee())
    }
    if (corps?.mode === 'essai') return await essai(req)
    return reponse(req, { message: 'Mode inconnu.' }, 400)
  } catch (e) {
    console.error('notifications-push', e)
    return reponse(req, { message: e instanceof Error ? e.message : 'Erreur.' }, 500)
  }
})
