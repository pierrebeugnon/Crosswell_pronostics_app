import { describe, expect, it } from 'vitest'
import { estIos, nomNavigateur, octetsDeBase64Url, possibilite, reglageVisible, type Appareil } from '@/lib/notifications'
import { VAPID_CLE_PUBLIQUE } from '@/config/app'

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'
const IPAD_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15'
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'

const appareil = (o: Partial<Appareil>): Appareil => ({
  userAgent: ANDROID,
  maxTouchPoints: 5,
  installee: false,
  serviceWorker: true,
  pushManager: true,
  permission: 'default',
  ...o,
})

describe('possibilite', () => {
  it('iPhone dans Safari : il faut installer, même sans PushManager', () => {
    expect(possibilite(appareil({ userAgent: IPHONE, pushManager: false, permission: null }))).toBe('installer')
  })
  it('iPad qui se dit Mac : reconnu comme iOS', () => {
    expect(estIos({ userAgent: IPAD_MAC, maxTouchPoints: 5 })).toBe(true)
    expect(estIos({ userAgent: IPAD_MAC, maxTouchPoints: 0 })).toBe(false)
  })
  it('iPhone installé : prêt', () => {
    expect(possibilite(appareil({ userAgent: IPHONE, installee: true }))).toBe('pret')
  })
  it('Android : prêt, refusé, ou impossible sans Push API', () => {
    expect(possibilite(appareil({}))).toBe('pret')
    expect(possibilite(appareil({ permission: 'denied' }))).toBe('refuse')
    expect(possibilite(appareil({ pushManager: false }))).toBe('impossible')
  })
})

describe('octetsDeBase64Url', () => {
  it('la clé publique VAPID donne un point P-256 non compressé (65 octets, 0x04)', () => {
    const o = octetsDeBase64Url(VAPID_CLE_PUBLIQUE)
    expect(o.length).toBe(65)
    expect(o[0]).toBe(4)
  })
})

describe('nomNavigateur', () => {
  it('nomme système et navigateur', () => {
    expect(nomNavigateur(IPHONE)).toBe('iPhone · Safari')
    expect(nomNavigateur(ANDROID)).toBe('Android · Chrome')
  })
})

describe('reglageVisible', () => {
  it('ouvert à tous, ou par ?notifications=1, retenu jusqu’à =0', () => {
    expect(reglageVisible(true, null, false)).toBe(true)
    expect(reglageVisible(false, null, false)).toBe(false)
    expect(reglageVisible(false, '1', false)).toBe(true)
    expect(reglageVisible(false, null, true)).toBe(true)
    expect(reglageVisible(false, '0', true)).toBe(false)
  })
})
