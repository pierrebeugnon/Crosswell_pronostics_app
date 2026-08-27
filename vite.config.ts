import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5190, host: true },
  build: {
    rollupOptions: {
      output: {
        /**
         * Le client Supabase pèse à lui seul plus que l'application. Le sortir
         * du bundle principal permet au navigateur de le mettre en cache une
         * fois pour toutes : une correction d'interface ne réinvalide plus
         * 400 ko chez un client qui consulte les pronostics au bord d'une
         * piste, en 4G.
         */
        manualChunks: {
          supabase: ['@supabase/supabase-js'],
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
