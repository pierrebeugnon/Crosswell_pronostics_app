import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
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
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
)
