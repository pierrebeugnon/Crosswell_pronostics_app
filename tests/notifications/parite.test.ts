import { describe, expect, it } from 'vitest'
import { COTE_BELLE_VICTOIRE as COTE_APP, SEUILS_CONFIANCE } from '@/config/app'
import { COTE_BELLE_VICTOIRE, SEUIL_ELEVEE, charge, heureParis, heureUtile, verdict } from '../../supabase/functions/_shared/notifications_regles'

/**
 * Le seuil « Élevée » vit en deux copies : l'app (`SEUILS_CONFIANCE`) et la
 * fonction `notifications-push`, qui ne peut pas l'importer. Divergentes, une
 * course affichée « Moyenne » dans l'app déclencherait une alerte « Élevée ».
 */
describe('notifications : parité et règles', () => {
  it('le seuil Élevée de la fonction est celui de l’app', () => {
    expect(SEUIL_ELEVEE).toBe(SEUILS_CONFIANCE.elevee)
  })

  it('la cote d’une belle victoire annoncée par l’app est celle de la fonction', () => {
    expect(COTE_BELLE_VICTOIRE).toBe(COTE_APP)
  })

  it('verdict d’un envoi : 2xx réussi, 404/410 supprimé, le reste compte un échec', () => {
    expect(verdict(201)).toBe('reussi')
    expect(verdict(410)).toBe('supprimer')
    expect(verdict(404)).toBe('supprimer')
    expect(verdict(429)).toBe('echec')
    expect(verdict(null)).toBe('echec')
  })

  it('l’heure de Paris est un nombre, hiver comme été (et non NaN)', () => {
    expect(heureParis(new Date('2026-11-08T21:00:00Z'))).toBe(22)
    expect(heureParis(new Date('2026-07-01T06:30:00Z'))).toBe(8)
    expect(heureParis(new Date('2026-11-08T23:10:00Z'))).toBe(0)
  })

  it('pas d’envoi la nuit', () => {
    expect(heureUtile(7)).toBe(false)
    expect(heureUtile(8)).toBe(true)
    expect(heureUtile(21)).toBe(true)
    expect(heureUtile(22)).toBe(false)
  })

  it('une alerte porte son étiquette, pour remplacer la précédente sur l’appareil', () => {
    expect(charge({ type: 'confiance_elevee', cle: '2026-11-08#DEAUVILLE#3', titre: 't', corps: 'c', url: '/' }).etiquette).toBe(
      'confiance_elevee:2026-11-08#DEAUVILLE#3',
    )
  })
})
