/*
 * LE SERVICE WORKER DE CROSSWELL — les notifications push, et rien d'autre.
 *
 * Il ne met RIEN en cache : l'application doit toujours servir les pronostics
 * du jour, jamais une copie de la veille. Il reçoit une alerte de la fonction
 * `notifications-push` (supabase/functions/), l'affiche, et ouvre la bonne page
 * au toucher.
 *
 * La charge reçue : { titre, corps, url, etiquette } (`_shared/notifications_regles.ts`).
 */

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let d = {}
  try {
    d = event.data ? event.data.json() : {}
  } catch {
    d = { corps: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.registration.showNotification(d.titre || 'Crosswell', {
      body: d.corps || '',
      icon: '/icone-192.png',
      badge: '/badge-96.png',
      tag: d.etiquette || undefined,
      lang: 'fr',
      data: { url: d.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const cible = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href
  event.waitUntil(
    (async () => {
      const fenetres = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const f of fenetres) {
        if (new URL(f.url).origin === self.location.origin) {
          await f.focus()
          if ('navigate' in f) await f.navigate(cible)
          return
        }
      }
      await self.clients.openWindow(cible)
    })(),
  )
})
