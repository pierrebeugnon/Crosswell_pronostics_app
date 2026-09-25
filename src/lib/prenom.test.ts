import { describe, expect, it } from 'vitest'
import { initiales, lirePrenom, nettoyerPrenom } from '@/lib/prenom'

describe('nettoyerPrenom', () => {
  it('rogne et ramène les espaces répétés à un seul', () => {
    expect(nettoyerPrenom('  Jean   Pierre ')).toEqual({ ok: true, valeur: 'Jean Pierre' })
  })

  it('accepte accents, tirets, apostrophes et autres alphabets', () => {
    for (const p of ['Camille', 'Hélène', 'Jean-Édouard', "N'Golo", 'D’Artagnan', 'Zoë', 'Ødegaard', 'Łukasz', 'Анна']) {
      expect(nettoyerPrenom(p)).toEqual({ ok: true, valeur: p })
    }
  })

  it('compose les accents décomposés (NFC)', () => {
    const r = nettoyerPrenom('Hélène')
    expect(r).toEqual({ ok: true, valeur: 'Hélène' })
  })

  it('vide = effacement', () => {
    expect(nettoyerPrenom('   ')).toEqual({ ok: true, valeur: '' })
  })

  it('refuse chiffres, symboles, balises et émojis', () => {
    for (const p of ['Camille2', '<b>', 'Jean_Pierre', 'Léa 🙂', 'a@b', '-Léa', "Léa'"]) {
      expect(nettoyerPrenom(p).ok).toBe(false)
    }
  })

  it('40 caractères au plus', () => {
    expect(nettoyerPrenom('a'.repeat(40)).ok).toBe(true)
    expect(nettoyerPrenom('a'.repeat(41)).ok).toBe(false)
  })
})

describe('lirePrenom', () => {
  it('ne rend qu’un prénom conforme et non vide', () => {
    expect(lirePrenom(' Camille ')).toBe('Camille')
    expect(lirePrenom('')).toBeNull()
    expect(lirePrenom(42)).toBeNull()
    expect(lirePrenom(undefined)).toBeNull()
    expect(lirePrenom('<script>')).toBeNull()
  })
})

describe('initiales', () => {
  it('une lettre pour un prénom simple, deux pour un prénom composé', () => {
    expect(initiales('Camille', null)).toBe('C')
    expect(initiales('Jean-Pierre', null)).toBe('JP')
    expect(initiales('Marie Anne Sophie', null)).toBe('MA')
    expect(initiales("N'Golo", null)).toBe('NG')
    expect(initiales('élodie', null)).toBe('É')
  })

  it("sans prénom, l'adresse ; sans rien, null", () => {
    expect(initiales(null, 'pierre@exemple.fr')).toBe('P')
    expect(initiales('', '_x@exemple.fr')).toBe('X')
    expect(initiales(null, null)).toBeNull()
  })
})
