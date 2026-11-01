import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import App from '@/App'
import '@/index.css'

/**
 * LA MESURE D'AUDIENCE — Vercel Web Analytics, branchée le 03/10/2026.
 *
 * SANS COOKIE et sans identifiant persistant : Vercel compte les pages vues et
 * les visites à partir d'une empreinte éphémère, ne suit personne d'un site à
 * l'autre, et ne rend que des totaux. C'est ce qui permet de s'en passer d'un
 * bandeau de consentement — à condition de n'en pas demander davantage, et de
 * le DIRE : la politique de confidentialité a été corrigée en conséquence,
 * elle affirmait « pas d'outil de mesure d'audience ».
 *
 * Elle ne fonctionne qu'une fois activée dans le projet Vercel ; sans cela, le
 * composant ne fait rien.
 */
const application = (
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>
)

const racine = document.getElementById('root')!

/**
 * TROIS CAS, ET UN SEUL HYDRATE.
 *
 * Les pages éditoriales arrivent déjà rendues par `scripts/apres-build.mjs` :
 * `hydrateRoot` reprend ce balisage sans le refaire. Une page vide (le 404, le
 * serveur de développement) se monte normalement.
 *
 * LES RÉSULTATS RESTENT SOUS `createRoot`, reconnaissables à leurs données
 * semées : leur HTML est calculé à une heure (`instantParis`) que le navigateur
 * ne retrouvera pas, et il sort d'un cache. Sur un écart, React referait le
 * rendu, or `useDonneesInitiales` consomme les données à la première lecture :
 * la page retomberait sur « Chargement… ».
 */
if (racine.firstElementChild && !window.__CROSSWELL__) {
  hydrateRoot(racine, application)
} else {
  createRoot(racine).render(application)
}
