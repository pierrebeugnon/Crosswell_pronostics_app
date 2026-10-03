import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import App from '@/App'
import '@/index.css'

/**
 * LA MESURE D'AUDIENCE — Vercel Web Analytics, branchée le 03/10/2026.
 *
 * SANS COOKIE et sans identifiant persistant : des pages vues et des visites,
 * en totaux, sans suivi d'un site à l'autre. Rien n'est rattaché au compte du
 * client : l'application n'envoie ni son identifiant, ni son adresse, ni sa
 * formule.
 *
 * CE QUI PART QUAND MÊME : l'adresse de la page, et nos adresses portent la
 * course consultée (`/courses/2026-10-03/SAINT-CLOUD/6`). C'est le
 * comportement normal d'une mesure d'audience, et c'est dit dans la politique
 * de confidentialité. Si cela devait gêner un jour, le composant accepte une
 * fonction `beforeSend` pour tronquer les adresses avant envoi.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
)
