import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { FORMULES, type CleFormule } from '@/config/formules'
import { texteConsentement as texteClient, type Pass } from '@/lib/inscription'
import {
  MONTANTS_ATTENDUS,
  NOMS_FORMULE,
  PASS,
  texteConsentement as texteServeur,
} from '../../supabase/functions/_shared/regles'

/**
 * PARITÉ DES TARIFS ET DES TEXTES, entre les quatre endroits qui les portent.
 *
 * Le prix et le nom d'une formule vivent, par force, en plusieurs copies :
 *
 * | Où | Pourquoi une copie |
 * | --- | --- |
 * | `src/config/formules.ts` | l'application |
 * | `site/src/config/site.ts` | projet Vite séparé, aucun import commun |
 * | `supabase/functions/_shared/regles.ts` | s'exécute sous Deno, pas sous Node |
 * | Stripe | hors du dépôt — contrôlé à l'exécution par `verifierTarif` |
 *
 * Ce test tient les trois premières égales. La quatrième est vérifiée au moment
 * d'ouvrir une page de paiement, parce qu'elle peut changer sans qu'on touche
 * au code — c'est exactement ce qui s'est produit le 20/09/2026, un Pass annuel
 * créé à 99,99 € en paiement unique là où le site annonce 99 € par an.
 *
 * Le test du texte de consentement, lui, est né d'une espace insécable
 * manquante : le serveur et le client ont divergé d'UN caractère, ce qui
 * déclenchait l'alarme de dérive à chaque achat et faisait conserver comme
 * preuve un texte que le client n'avait pas vu.
 */

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

const app = (cle: CleFormule) => FORMULES.find((f) => f.cle === cle)!

describe('le texte de consentement', () => {
  it.each(PASS)('est identique au caractère près — %s', (p) => {
    const serveur = texteServeur(p)
    const client = texteClient(p as Pass)
    // `toBe` suffirait, mais le diff de vitest sur deux chaînes qui se
    // ressemblent est illisible : on compare aussi les points de code pour que
    // l'écart saute aux yeux.
    expect([...serveur].map((c) => c.codePointAt(0))).toEqual([...client].map((c) => c.codePointAt(0)))
    expect(serveur).toBe(client)
  })

  it('nomme bien la formule concernée', () => {
    for (const p of PASS) expect(texteServeur(p)).toContain(NOMS_FORMULE[p])
  })

  it('distingue le Pass 1 jour des abonnements sur la rétractation', () => {
    // Le droit n'est pas le même : le Pass 1 jour est pleinement exécuté avant
    // la fin des 14 jours, les abonnements non.
    expect(texteServeur('jour')).toContain('renonce expressément')
    expect(texteServeur('mois')).not.toContain('renonce expressément')
    expect(texteServeur('an')).not.toContain('renonce expressément')
  })
})

describe('les montants', () => {
  it.each(PASS)('le serveur et l’application disent le même prix — %s', (p) => {
    expect(MONTANTS_ATTENDUS[p]).toBe(app(p).prixCentimes)
  })

  it.each(PASS)('le serveur et l’application disent le même nom — %s', (p) => {
    expect(NOMS_FORMULE[p]).toBe(app(p).nom)
  })

  it('le site vitrine affiche les mêmes prix que l’application', () => {
    // Le site est un projet Vite séparé : on le lit comme un texte plutôt que
    // de l'importer, ses alias `@/` ne résolvant pas depuis ici.
    const source = readFileSync(path.join(RACINE, 'site', 'src', 'config', 'site.ts'), 'utf8')
    const affiches = [...source.matchAll(/^\s*prix:\s*'([^']+)'/gm)].map((m) => m[1])
    expect(affiches.length).toBeGreaterThan(0)
    expect(affiches.sort()).toEqual(FORMULES.map((f) => f.prix).sort())
  })
})

describe('les formules', () => {
  it('le serveur connaît exactement les Pass payants de l’application', () => {
    expect([...PASS].sort()).toEqual(
      FORMULES.filter((f) => f.prixCentimes > 0)
        .map((f) => f.cle)
        .sort(),
    )
  })

  it('aucun Pass payant n’est à zéro euro', () => {
    for (const p of PASS) expect(MONTANTS_ATTENDUS[p]).toBeGreaterThan(0)
  })
})
