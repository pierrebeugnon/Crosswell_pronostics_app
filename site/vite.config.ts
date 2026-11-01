import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

/**
 * Le site vitrine est un projet Vite à part entière, frère de l'application :
 * même outillage, mêmes jetons, mais aucune dépendance à un compte.
 *
 * DEUX CONSTRUCTIONS, pas une. `vite build` produit le site que reçoit le
 * navigateur ; `vite build --ssr` produit le module que la fonction
 * `api/resultats` utilise pour rendre les pages de résultats côté serveur.
 * Le second est volontairement nu : React et React-Router y restent EXTERNES,
 * puisque la fonction les a dans ses propres dépendances.
 */
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  // La construction SSR ne sert pas de fichiers : recopier `public/` dans
  // `dist-serveur` ne ferait qu'alourdir le paquet de la fonction Vercel avec
  // des images que le CDN sert déjà depuis `dist/`.
  publicDir: isSsrBuild ? false : 'public',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5195, host: true },
  build: {
    rollupOptions: {
      output: isSsrBuild
        ? // En SSR, React est externe : lui demander un morceau séparé fait
          // échouer la construction (« cannot be included in manualChunks
          // because it is resolved as an external module »).
          {}
        : {
            manualChunks: {
              react: ['react', 'react-dom', 'react-router-dom'],
            },
          },
    },
  },
}))
