import { defineConfig, type Plugin } from 'vitest/config'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.dirname(fileURLToPath(import.meta.url))
const SRC_CLIENT = path.join(RACINE, 'src')

/**
 * L'outil interne, référence du test de parité. Par défaut le dossier frère
 * `Crosswell-internal-tools` ; `CROSSWELL_OUTIL_INTERNE` permet de le pointer
 * ailleurs. Absent (CI, Vercel), le test de parité en direct est SAUTÉ et seul
 * l'instantané `tests/parite/reference.json` est comparé.
 */
const OUTIL_INTERNE = path.resolve(
  process.env.CROSSWELL_OUTIL_INTERNE ?? path.join(RACINE, '..', 'Crosswell-internal-tools'),
)
const SRC_INTERNE = path.join(OUTIL_INTERNE, 'src')

/** Chemins comparables sous Windows : séparateurs unifiés, casse ignorée. */
const normaliser = (p: string) => p.replace(/\\/g, '/').toLowerCase()

/**
 * DEUX « @/ » DANS LE MÊME PROCESSUS.
 *
 * L'app et l'outil interne écrivent tous deux `import … from '@/lib/…'`, chacun
 * vers SON `src`. Le test de parité exécute les deux codes côte à côte : un
 * alias global `@ → src` enverrait l'outil interne chercher `@/lib/roi` dans
 * l'app, et le test comparerait l'app à elle-même sans le savoir.
 *
 * Pourquoi un plugin et pas `resolve.alias` : l'alias de Vite passe AVANT tout
 * plugin et ignore l'importeur — il ne peut pas savoir qui demande `@/`. Le
 * plugin, placé en tête (`enforce: 'pre'`), tranche sur l'importeur : sous le
 * `src` de l'outil interne → son `src` ; partout ailleurs → celui de l'app.
 */
function aliasParProjet(): Plugin {
  const srcInterne = normaliser(SRC_INTERNE) + '/'
  return {
    name: 'crosswell:alias-par-projet',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!source.startsWith('@/')) return null
      const base = importer && normaliser(importer).startsWith(srcInterne) ? SRC_INTERNE : SRC_CLIENT
      const resolu = await this.resolve(path.join(base, source.slice(2)), importer, {
        ...options,
        skipSelf: true,
      })
      return resolu ?? null
    },
  }
}

export default defineConfig({
  plugins: [aliasParProjet()],
  /*
   * Tests hermétiques : aucun `.env` local n'est chargé (le dossier `tests` n'en
   * contient pas). Les modules testés ne lisent que `VITE_DEMO`, et un poste
   * configuré en démo ne doit pas faire diverger ses résultats de ceux de la CI.
   */
  envDir: path.join(RACINE, 'tests'),
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    env: {
      CROSSWELL_OUTIL_INTERNE: OUTIL_INTERNE,
      CROSSWELL_OUTIL_INTERNE_PRESENT: existsSync(path.join(SRC_INTERNE, 'lib', 'aggregate.ts')) ? '1' : '0',
    },
  },
  server: {
    // L'outil interne vit hors de la racine du dépôt : Vite doit pouvoir le lire.
    fs: { allow: [RACINE, OUTIL_INTERNE] },
  },
})
