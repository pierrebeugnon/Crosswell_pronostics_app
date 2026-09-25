import { describe, expect, it } from 'vitest'
import {
  abonnementEnCours,
  abonnementImpaye,
  accesOffertSansEcheance,
  decisionAbonnement,
  decisionContestation,
  decisionPassJour,
  decisionRemboursement,
  formuleFacturee,
  statutDe,
  type LigneAbonnement,
} from '../../supabase/functions/_shared/regles'

/**
 * LES RÈGLES DE FACTURATION.
 *
 * Ces tests existent parce que ce code touche à de l'argent et n'avait, jusqu'au
 * 20/09/2026, aucune couverture : il était inséparable de ses appels réseau.
 * Chaque cas nommé « RÉGRESSION » correspond à un défaut réellement trouvé en
 * relecture — ils sont là pour qu'il ne revienne pas.
 */

const T0 = Date.parse('2026-09-20T12:00:00.000Z')
const JOUR_MS = 24 * 3_600_000

const ligne = (p: Partial<LigneAbonnement> = {}): LigneAbonnement => ({
  user_id: 'u1',
  formule: 'gratuit',
  statut: 'aucun',
  acces_jusqua: null,
  stripe_customer_id: null,
  stripe_subscription_id: null,
  ...p,
})

const abonnement = (p: Partial<Parameters<typeof decisionAbonnement>[2]> = {}) => ({
  id: 'sub_1',
  statut: 'actif' as const,
  formule: 'mois' as const,
  echeanceSecondes: Math.floor(T0 / 1000) + 30 * 86_400,
  clientStripe: 'cus_1',
  ...p,
})

describe('statutDe', () => {
  it('traduit les huit états Stripe', () => {
    expect(statutDe('active', false)).toBe('actif')
    expect(statutDe('trialing', false)).toBe('actif')
    expect(statutDe('past_due', false)).toBe('impaye')
    expect(statutDe('unpaid', false)).toBe('impaye')
    expect(statutDe('incomplete', false)).toBe('aucun')
    expect(statutDe('incomplete_expired', false)).toBe('expire')
    expect(statutDe('canceled', false)).toBe('expire')
    expect(statutDe('paused', false)).toBe('expire')
  })

  it('distingue une résiliation programmée d’une résiliation effective', () => {
    expect(statutDe('active', true)).toBe('resiliation_programmee')
    expect(statutDe('trialing', true)).toBe('resiliation_programmee')
    // Une fois résilié pour de bon, le drapeau ne change plus rien.
    expect(statutDe('canceled', true)).toBe('expire')
  })
})

describe('formuleFacturee', () => {
  it('préfère le tarif aux métadonnées', () => {
    expect(formuleFacturee('an', 'mois')).toEqual({ formule: 'an', repli: false })
  })

  it('RÉGRESSION — se rabat sur les métadonnées, mais le dit', () => {
    // Sans le drapeau `repli`, tout abonnement créé au tableau de bord était
    // silencieusement étiqueté « mois » : la page Compte annonçait 12,99 € à un
    // client facturé 99 €.
    expect(formuleFacturee(null, 'an')).toEqual({ formule: 'an', repli: true })
  })

  it('ne devine rien quand les deux manquent', () => {
    expect(formuleFacturee(null, undefined)).toEqual({ formule: null, repli: false })
    expect(formuleFacturee(null, 'fantaisie')).toEqual({ formule: null, repli: false })
  })
})

describe('les gardes d’état', () => {
  it('reconnaît un accès offert sans échéance', () => {
    expect(accesOffertSansEcheance(ligne({ statut: 'offert' }))).toBe(true)
    expect(accesOffertSansEcheance(ligne({ statut: 'offert', acces_jusqua: '2026-10-01T00:00:00Z' }))).toBe(false)
    expect(accesOffertSansEcheance(ligne({ statut: 'actif' }))).toBe(false)
    expect(accesOffertSansEcheance(null)).toBe(false)
  })

  it('RÉGRESSION — un impayé compte comme un abonnement en cours', () => {
    // Il n'y était pas : une carte expirée coupait l'accès, le client reprenait
    // un Pass, et se retrouvait avec deux abonnements facturés.
    expect(abonnementEnCours(ligne({ formule: 'mois', statut: 'impaye' }))).toBe(true)
    expect(abonnementImpaye(ligne({ formule: 'mois', statut: 'impaye' }))).toBe(true)
  })

  it('ne bloque pas sur un abonnement terminé, ni sur un Pass 1 jour', () => {
    expect(abonnementEnCours(ligne({ formule: 'mois', statut: 'expire' }))).toBe(false)
    expect(abonnementEnCours(ligne({ formule: 'jour', statut: 'actif' }))).toBe(false)
    expect(abonnementEnCours(null)).toBe(false)
  })
})

describe('decisionAbonnement', () => {
  it('écrit l’état Stripe et les deux identifiants', () => {
    const d = decisionAbonnement('u1', null, abonnement())
    expect(d.action).toBe('ecrire')
    if (d.action !== 'ecrire') return
    expect(d.ligne).toMatchObject({
      user_id: 'u1',
      formule: 'mois',
      statut: 'actif',
      stripe_customer_id: 'cus_1',
      stripe_subscription_id: 'sub_1',
    })
    expect(d.ligne.acces_jusqua).toBe(new Date((Math.floor(T0 / 1000) + 30 * 86_400) * 1000).toISOString())
  })

  it('RÉGRESSION — refuse une échéance absente au lieu d’écrire une date invalide', () => {
    // `current_period_end` a migré sur les éléments de l'abonnement dans les
    // versions d'API de 2025 : un instantané d'une autre version le rendait
    // `undefined`, et `new Date(NaN).toISOString()` levait au milieu du webhook.
    expect(() =>
      decisionAbonnement('u1', null, abonnement({ echeanceSecondes: undefined as unknown as number })),
    ).toThrow(/échéance/)
    expect(() => decisionAbonnement('u1', null, abonnement({ echeanceSecondes: NaN }))).toThrow(/échéance/)
  })

  it('RÉGRESSION — un événement d’un ANCIEN abonnement ne coupe pas le courant', () => {
    const actuel = ligne({ formule: 'mois', statut: 'actif', stripe_subscription_id: 'sub_NOUVEAU' })
    const d = decisionAbonnement('u1', actuel, abonnement({ id: 'sub_ANCIEN', statut: 'expire' }))
    expect(d.action).toBe('ignorer')
  })

  it('applique bien la fin du MÊME abonnement', () => {
    const actuel = ligne({ formule: 'mois', statut: 'actif', stripe_subscription_id: 'sub_1' })
    const d = decisionAbonnement('u1', actuel, abonnement({ id: 'sub_1', statut: 'expire' }))
    expect(d.action).toBe('ecrire')
  })

  it('applique la fin d’un ancien abonnement si le courant n’est plus vivant', () => {
    const actuel = ligne({ formule: 'mois', statut: 'impaye', stripe_subscription_id: 'sub_NOUVEAU' })
    const d = decisionAbonnement('u1', actuel, abonnement({ id: 'sub_ANCIEN', statut: 'expire' }))
    expect(d.action).toBe('ecrire')
  })

  it('RÉGRESSION — un abonnement payé l’emporte sur un statut « offert » hérité', () => {
    // `db/007` a posé `offert` sur TOUS les comptes existants. Une garde qui le
    // préservait ici laissait de vrais abonnés sans suivi de facturation, sans
    // bouton de résiliation, et avec un accès gratuit à vie après résiliation.
    const herite = ligne({ statut: 'offert', acces_jusqua: null })
    const d = decisionAbonnement('u1', herite, abonnement())
    expect(d.action).toBe('ecrire')
    if (d.action !== 'ecrire') return
    expect(d.ligne.statut).toBe('actif')
    expect(d.ligne.acces_jusqua).not.toBeNull()
  })
})

describe('decisionPassJour', () => {
  it('ouvre vingt-quatre heures à partir de maintenant', () => {
    const d = decisionPassJour('u1', null, 'cus_1', T0)
    expect(d.action).toBe('ecrire')
    if (d.action !== 'ecrire') return
    expect(d.ligne).toMatchObject({ formule: 'jour', statut: 'actif', stripe_customer_id: 'cus_1' })
    expect(d.ligne.acces_jusqua).toBe(new Date(T0 + JOUR_MS).toISOString())
  })

  it('prolonge un Pass encore valide au lieu de l’écraser', () => {
    const finEnCours = new Date(T0 + 6 * 3_600_000).toISOString()
    const d = decisionPassJour('u1', ligne({ formule: 'jour', statut: 'actif', acces_jusqua: finEnCours }), 'cus_1', T0)
    if (d.action !== 'ecrire') throw new Error('attendu : écriture')
    expect(d.ligne.acces_jusqua).toBe(new Date(T0 + 6 * 3_600_000 + JOUR_MS).toISOString())
  })

  it('ne prolonge pas un Pass déjà expiré', () => {
    const finPassee = new Date(T0 - 3_600_000).toISOString()
    const d = decisionPassJour('u1', ligne({ formule: 'jour', statut: 'expire', acces_jusqua: finPassee }), 'cus_1', T0)
    if (d.action !== 'ecrire') throw new Error('attendu : écriture')
    expect(d.ligne.acces_jusqua).toBe(new Date(T0 + JOUR_MS).toISOString())
  })

  it('RÉGRESSION — n’écrit jamais un client Stripe nul', () => {
    // Le `?? null` faisait partie de l'écriture : une session sans client
    // remettait `stripe_customer_id` à NULL, et le compte perdait le portail,
    // donc « Résilier en ligne ».
    const d = decisionPassJour('u1', ligne({ stripe_customer_id: 'cus_1' }), null, T0)
    if (d.action !== 'ecrire') throw new Error('attendu : écriture')
    expect('stripe_customer_id' in d.ligne).toBe(false)
  })

  it('RÉGRESSION — ne rétrograde pas un accès offert à vingt-quatre heures', () => {
    const d = decisionPassJour('u1', ligne({ statut: 'offert' }), 'cus_1', T0)
    if (d.action !== 'ecrire') throw new Error('attendu : écriture')
    // Seul le lien vers le client Stripe est posé, pour que le portail s'ouvre.
    expect(d.ligne).toEqual({ user_id: 'u1', stripe_customer_id: 'cus_1' })
  })

  it('n’écrit rien sur un accès offert sans client Stripe', () => {
    expect(decisionPassJour('u1', ligne({ statut: 'offert' }), null, T0).action).toBe('ignorer')
  })

  it('n’ouvre rien par-dessus un abonnement en cours', () => {
    for (const statut of ['actif', 'resiliation_programmee'] as const) {
      const d = decisionPassJour('u1', ligne({ formule: 'mois', statut }), 'cus_1', T0)
      expect(d.action).toBe('ignorer')
    }
  })

  it('ouvre bien un Pass quand l’abonnement est terminé', () => {
    expect(decisionPassJour('u1', ligne({ formule: 'mois', statut: 'expire' }), 'cus_1', T0).action).toBe('ecrire')
  })
})

describe('decisionRemboursement', () => {
  const charge = (montant: number, rembourse: number) => ({ montant, montantRembourse: rembourse })

  it('RÉGRESSION — un remboursement PARTIEL ne ferme rien', () => {
    // Un euro rendu sur 4,99 € fermait les vingt-quatre heures entières.
    const d = decisionRemboursement('u1', ligne({ formule: 'jour', statut: 'actif' }), charge(499, 100), 'jour', T0)
    expect(d.action).toBe('ignorer')
  })

  it('ferme l’accès sur un Pass 1 jour intégralement remboursé', () => {
    const d = decisionRemboursement('u1', ligne({ formule: 'jour', statut: 'actif' }), charge(499, 499), 'jour', T0)
    if (d.action !== 'ecrire') throw new Error('attendu : écriture')
    expect(d.ligne).toMatchObject({ formule: 'jour', statut: 'expire' })
    expect(d.ligne.acces_jusqua).toBe(new Date(T0).toISOString())
  })

  it('laisse un abonnement remboursé au traitement manuel', () => {
    const d = decisionRemboursement('u1', ligne({ formule: 'mois', statut: 'actif' }), charge(1299, 1299), 'mois', T0)
    expect(d.action).toBe('ignorer')
  })

  it('ne touche ni à un accès offert, ni à un compte inconnu', () => {
    expect(decisionRemboursement('u1', ligne({ statut: 'offert' }), charge(499, 499), 'jour', T0).action).toBe('ignorer')
    expect(decisionRemboursement(null, null, charge(499, 499), 'jour', T0).action).toBe('ignorer')
  })
})

describe('decisionContestation', () => {
  it('coupe l’accès et le signale', () => {
    const d = decisionContestation('u1', ligne({ formule: 'mois', statut: 'actif' }), T0)
    if (d.action !== 'ecrire') throw new Error('attendu : écriture')
    expect(d.ligne).toMatchObject({ user_id: 'u1', statut: 'impaye' })
    expect(d.ligne.acces_jusqua).toBe(new Date(T0).toISOString())
    // L'avertissement n'est pas décoratif : tant qu'aucune colonne ne marque la
    // contestation, un événement d'abonnement ultérieur peut rouvrir l'accès.
    expect(d.avertissement).toMatch(/CONTESTATION/)
  })

  it('ne touche pas à un accès offert', () => {
    expect(decisionContestation('u1', ligne({ statut: 'offert' }), T0).action).toBe('ignorer')
  })
})
