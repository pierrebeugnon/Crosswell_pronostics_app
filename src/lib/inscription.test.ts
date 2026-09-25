import { describe, expect, it } from 'vitest'
import {
  formaterSaisieDate,
  libellePaiement,
  lignesRecapitulatif,
  lireDateNaissance,
  phraseBienvenue,
  texteConsentement,
  validerCompte,
  type ChampsCompte,
} from '@/lib/inscription'

const ok: ChampsCompte = {
  prenom: 'Pierre',
  email: 'pierre@exemple.fr',
  motDePasse: 'motdepasse',
  naissance: '31/12/1990',
  majeur: true,
  conditions: true,
}

describe('date de naissance', () => {
  it('pose les barres pendant la frappe', () => {
    expect(formaterSaisieDate('0')).toBe('0')
    expect(formaterSaisieDate('0101')).toBe('01/01')
    expect(formaterSaisieDate('01011990')).toBe('01/01/1990')
    expect(formaterSaisieDate('01/01/19901')).toBe('01/01/1990')
  })

  it('lit une date réelle, refuse une date impossible', () => {
    expect(lireDateNaissance('31/12/1990')).toBe('1990-12-31')
    expect(lireDateNaissance('1.2.2000')).toBe('2000-02-01')
    expect(lireDateNaissance('29/02/2001')).toBeNull()
    expect(lireDateNaissance('31/04/1990')).toBeNull()
    expect(lireDateNaissance('1990-12-31')).toBeNull()
  })
})

describe('validation du compte', () => {
  it('rien à redire sur un compte complet', () => {
    expect(validerCompte(ok, '2026-09-18')).toEqual({})
  })

  it('chaque champ a son message', () => {
    const e = validerCompte({ prenom: ' ', email: 'x', motDePasse: 'court', naissance: '32/01/1990', majeur: false, conditions: false }, '2026-09-18')
    expect(Object.keys(e).sort()).toEqual(['conditions', 'email', 'majeur', 'motDePasse', 'naissance', 'prenom'])
  })

  it('18 ans le jour même passe, la veille non', () => {
    expect(validerCompte({ ...ok, naissance: '18/09/2008' }, '2026-09-18').naissance).toBeUndefined()
    expect(validerCompte({ ...ok, naissance: '19/09/2008' }, '2026-09-18').naissance).toMatch(/18 ans et plus/)
  })
})

describe('paiement', () => {
  it('le Pass 1 jour renonce à la rétractation, les abonnements la gardent', () => {
    expect(texteConsentement('jour')).toMatch(/renonce expressément/)
    expect(texteConsentement('mois')).toMatch(/part de l’accès déjà fournie/)
    expect(texteConsentement('an')).toMatch(/Pass annuel/)
  })

  it('récapitulatif et bouton', () => {
    expect(lignesRecapitulatif('jour')[0]).toBe('Paiement unique, aucun renouvellement')
    expect(lignesRecapitulatif('an')[1]).toMatch(/rappel par e-mail/)
    expect(libellePaiement('mois')).toBe('Payer 12,99 € et démarrer')
    expect(libellePaiement('jour')).toMatch(/débloquer 24/)
    expect(phraseBienvenue('gratuit')).toMatch(/dès 4,99/)
  })
})
