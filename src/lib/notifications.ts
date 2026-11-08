/**
 * LES NOTIFICATIONS PUSH, CÔTÉ CALCUL (db/021) : rien ici ne touche au
 * navigateur ni au réseau — `services/notifications.ts` s'en charge. Ce qui
 * décide se teste (`notifications.test.ts`).
 */

/**
 * Ce que l'appareil permet.
 * - `pret` : notifications possibles (Android, ordinateur, iPhone installé) ;
 * - `installer` : iPhone ou iPad dans Safari — une alerte n'arrive qu'à une
 *   app ajoutée à l'écran d'accueil (iOS 16.4 et plus) ;
 * - `refuse` : le client a bloqué les notifications ; seul le réglage du
 *   navigateur les rouvre, l'app ne peut plus redemander ;
 * - `impossible` : navigateur sans Push API (ancien iOS, navigateur intégré).
 */
export type Possibilite = 'pret' | 'installer' | 'refuse' | 'impossible'

export interface Appareil {
  userAgent: string
  maxTouchPoints: number
  /** Ouverte depuis l'écran d'accueil (`display-mode: standalone`). */
  installee: boolean
  serviceWorker: boolean
  pushManager: boolean
  /** `Notification.permission`, ou null sans API Notification. */
  permission: NotificationPermission | null
}

/** iPhone, iPod, iPad — y compris l'iPad qui se présente comme un Mac. */
export function estIos(a: Pick<Appareil, 'userAgent' | 'maxTouchPoints'>): boolean {
  return /iPhone|iPad|iPod/.test(a.userAgent) || (/Macintosh/.test(a.userAgent) && a.maxTouchPoints > 1)
}

export function possibilite(a: Appareil): Possibilite {
  // L'iPhone dans Safari n'expose PAS PushManager : sans ce test d'abord, on lui
  // dirait « impossible » alors qu'il suffit d'installer l'app.
  if (estIos(a) && !a.installee) return 'installer'
  if (!a.serviceWorker || !a.pushManager || a.permission === null) return 'impossible'
  if (a.permission === 'denied') return 'refuse'
  return 'pret'
}

/** La clé VAPID en base64 URL → les octets qu'attend `pushManager.subscribe`. */
export function octetsDeBase64Url(texte: string): Uint8Array<ArrayBuffer> {
  const b64 = (texte + '='.repeat((4 - (texte.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const brut = atob(b64)
  const out = new Uint8Array(new ArrayBuffer(brut.length))
  for (let i = 0; i < brut.length; i++) out[i] = brut.charCodeAt(i)
  return out
}

/** Les choix du client, par appareil. */
export interface Choix {
  /** Formule Gratuit : 30 min avant la course offerte du jour. */
  courseOfferte: boolean
  /** Accès complet : 30 min avant une course à confiance Élevée. */
  confianceElevee: boolean
  /** Tous : notre 1er gagne à une belle cote. */
  bellesVictoires: boolean
}

export const CHOIX_PAR_DEFAUT: Choix = { courseOfferte: true, confianceElevee: true, bellesVictoires: true }

/** Le nom lisible de l'appareil, pour que le client reconnaisse ses abonnements. */
export function nomNavigateur(userAgent: string): string {
  const systeme = /iPhone/.test(userAgent)
    ? 'iPhone'
    : /iPad/.test(userAgent)
      ? 'iPad'
      : /Android/.test(userAgent)
        ? 'Android'
        : /Windows/.test(userAgent)
          ? 'Windows'
          : /Mac OS X|Macintosh/.test(userAgent)
            ? 'Mac'
            : /Linux/.test(userAgent)
              ? 'Linux'
              : 'Appareil'
  const navigateur = /Edg\//.test(userAgent)
    ? 'Edge'
    : /Firefox\//.test(userAgent)
      ? 'Firefox'
      : /Chrome\//.test(userAgent)
        ? 'Chrome'
        : /Safari\//.test(userAgent)
          ? 'Safari'
          : null
  return navigateur ? `${systeme} · ${navigateur}` : systeme
}

/**
 * Le réglage est-il montré ? Ouvert à tous (`NOTIFICATIONS_OUVERTES`), dans
 * l'application INSTALLÉE, ou demandé sur cet appareil par `?notifications=1`
 * (retenu ; `=0` le retire).
 *
 * L'APP INSTALLÉE LE VOIT TOUJOURS. Sur iPhone, l'app de l'écran d'accueil n'a
 * ni barre d'adresse ni le stockage de Safari, et s'ouvre sur « / » : le
 * paramètre ne pouvait jamais l'atteindre, alors que c'est le seul endroit où
 * un iPhone reçoit des alertes (constaté par le fondateur le 08/11/2026).
 */
export function reglageVisible(ouvertATous: boolean, parametre: string | null, retenu: boolean, installee = false): boolean {
  if (ouvertATous || installee) return true
  if (parametre === '1') return true
  if (parametre === '0') return false
  return retenu
}

export const CLE_REGLAGE_NOTIFS = 'crosswell.notifications'

/**
 * Retient `?notifications=1` (ou `=0`) DÈS L'OUVERTURE de l'app (`main.tsx`).
 * Lu dans la page Compte seulement, le paramètre se perdait quand la session
 * était expirée : la redirection vers /connexion le jetait avant que la page
 * Compte ne s'affiche.
 */
export function retenirParametreNotifications(): void {
  try {
    const parametre = new URLSearchParams(window.location.search).get('notifications')
    if (parametre === '1') window.localStorage.setItem(CLE_REGLAGE_NOTIFS, '1')
    if (parametre === '0') window.localStorage.removeItem(CLE_REGLAGE_NOTIFS)
  } catch {
    /* stockage bloqué : la page Compte relira le paramètre si elle le voit */
  }
}
