import { describe, expect, it } from 'vitest'
import { SEUILS_CONFIANCE } from '@/config/app'
import { SEUIL_ELEVEE, charge, heureUtile, verdict } from '../../supabase/functions/_shared/notifications_regles'

/**
 * Le seuil « Élevée » vit en deux copies : l'app (`SEUILS_CONFIANCE`) et la
 * fonction `notifications-push`, qui ne peut pas l'importer. Divergentes, une
 * course affichée « Moyenne » dans l'app déclencherait une alerte « Élevée ».
 */
describe('notifications : parité et règles', () => {
  it('le seuil Élevée de la fonction est celui de l’app', () => {
    expect(SEUIL_ELEVEE).toBe(SEUILS_CONFIANCE.elevee)
  })

  it('verdict d’un envoi : 2xx réussi, 404/410 supprimé, le reste compte un échec', () => {
    expect(verdict(201)).toBe('reussi')
    expect(verdict(410)).toBe('supprimer')
    expect(verdict(404)).toBe('supprimer')
    expect(verdict(429)).toBe('echec')
    expect(verdict(null)).toBe('echec')
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
