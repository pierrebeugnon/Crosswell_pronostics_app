import { describe, expect, it } from 'vitest'
import { STATUTS_VIVANTS, abonnementsAAnnuler } from '../../supabase/functions/_shared/regles'

/**
 * CE QU'ON ANNULE QUAND UN COMPTE DISPARAÎT.
 *
 * La suppression d'un compte efface, par cascade, la seule ligne qui relie le
 * compte à Stripe. Si la liste des abonnements à annuler est fausse, le
 * prélèvement survit au compte et plus rien ne permet de le retrouver : c'est le
 * seul calcul de la procédure, et il se teste.
 */

const s = (id: string, status: string) => ({ id, status })

describe('abonnementsAAnnuler', () => {
  it('garde tout ce qui peut encore prélever', () => {
    const vivants = STATUTS_VIVANTS.map((statut, i) => s(`sub_${i}`, statut))
    expect(abonnementsAAnnuler(vivants)).toEqual(vivants.map((a) => a.id))
  })

  it('écarte ce qui est déjà mort', () => {
    // `subscriptions.cancel` lève sur un abonnement déjà annulé : l'y envoyer
    // ferait échouer la suppression entière, pour rien.
    expect(abonnementsAAnnuler([s('sub_a', 'canceled'), s('sub_b', 'incomplete_expired')])).toEqual([])
  })

  it('RÉGRESSION — un client qui a résilié puis repris a DEUX abonnements', () => {
    // `abonnements.stripe_subscription_id` ne garde que le dernier vu. C'est la
    // liste de Stripe qui fait foi, sinon un abonnement survit à la suppression.
    expect(abonnementsAAnnuler([s('sub_1', 'canceled'), s('sub_2', 'active')])).toEqual(['sub_2'])
  })

  it('un impayé s’annule aussi : les relances de Stripe continueraient sinon', () => {
    expect(abonnementsAAnnuler([s('sub_1', 'past_due'), s('sub_2', 'unpaid')])).toEqual(['sub_1', 'sub_2'])
  })

  it('aucun abonnement : rien à annuler', () => {
    expect(abonnementsAAnnuler([])).toEqual([])
  })
})