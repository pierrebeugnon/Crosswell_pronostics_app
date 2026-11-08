import type { ReactNode } from 'react'
import { BellRing, EllipsisVertical, Share, SquarePlus, Trophy, Timer } from 'lucide-react'
import { estIos } from '@/lib/notifications'

/**
 * LE TUTORIEL « AJOUTER CROSSWELL À L'ÉCRAN D'ACCUEIL ».
 *
 * Sur iPhone et iPad, c'est la CONDITION des notifications : Apple ne livre
 * d'alerte qu'à une app installée (iOS 16.4 et plus). Sur Android, c'est un
 * confort (une icône, l'app en plein écran). Les libellés suivent ceux des
 * menus, qui changent un peu d'une version à l'autre : on cite les deux
 * formulations courantes.
 */

function Etape({ n, icone, children }: { n: number; icone?: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className="shrink-0 w-7 h-7 rounded-full bg-accent text-accent-ink grid place-items-center text-[0.8125rem] font-extrabold"
        aria-hidden
      >
        {n}
      </span>
      <span className="pt-[3px] text-sm font-medium text-muted leading-relaxed">
        {children}
        {icone && <span className="inline-flex align-[-3px] ml-1.5 text-ink">{icone}</span>}
      </span>
    </li>
  )
}

const fort = (t: string) => <span className="text-ink font-semibold">{t}</span>

export function TutoIos() {
  return (
    <ol className="flex flex-col gap-3" aria-label="Ajouter Crosswell à l’écran d’accueil sur iPhone">
      <Etape n={1}>Ouvrez Crosswell dans {fort('Safari')} (ou Chrome), connecté à votre compte.</Etape>
      <Etape n={2} icone={<Share size={17} aria-label="icône Partager" />}>
        Touchez le bouton {fort('Partager')}, en bas de l’écran (en haut sur iPad).
      </Etape>
      <Etape n={3} icone={<SquarePlus size={17} aria-label="icône Ajouter" />}>
        Faites défiler et choisissez {fort('Sur l’écran d’accueil')}.
      </Etape>
      <Etape n={4}>Touchez {fort('Ajouter')}, en haut à droite.</Etape>
      <Etape n={5}>
        Ouvrez Crosswell depuis sa nouvelle {fort('icône')}, puis revenez dans {fort('Compte')} pour activer les
        notifications.
      </Etape>
    </ol>
  )
}

export function TutoAndroid() {
  return (
    <ol className="flex flex-col gap-3" aria-label="Ajouter Crosswell à l’écran d’accueil sur Android">
      <Etape n={1}>Ouvrez Crosswell dans {fort('Chrome')}, connecté à votre compte.</Etape>
      <Etape n={2} icone={<EllipsisVertical size={17} aria-label="icône Menu" />}>
        Touchez le {fort('menu')}, en haut à droite.
      </Etape>
      <Etape n={3}>
        Choisissez {fort('Installer l’application')} ou {fort('Ajouter à l’écran d’accueil')}, puis confirmez.
      </Etape>
      <Etape n={4}>Crosswell s’ouvre désormais depuis son icône, comme une application.</Etape>
    </ol>
  )
}

/** Le tutoriel de l'appareil en cours ; sur ordinateur, les deux. */
export function TutoEcranAccueil() {
  const nav = typeof navigator === 'undefined' ? null : navigator
  const ios = nav ? estIos({ userAgent: nav.userAgent, maxTouchPoints: nav.maxTouchPoints ?? 0 }) : false
  const android = nav ? /Android/.test(nav.userAgent) : false
  if (ios) return <TutoIos />
  if (android) return <TutoAndroid />
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="flex flex-col gap-3">
        <span className="text-[0.8125rem] font-bold text-ink">Sur iPhone</span>
        <TutoIos />
      </div>
      <div className="flex flex-col gap-3">
        <span className="text-[0.8125rem] font-bold text-ink">Sur Android</span>
        <TutoAndroid />
      </div>
    </div>
  )
}

/**
 * CE QUE LE CLIENT RECEVRA, dit AVANT qu'il active : la belle victoire surtout,
 * qui est l'alerte que la formule Gratuit reçoit aussi.
 */
export function CeQueVousRecevez({ complet, coteMin }: { complet: boolean; coteMin: number }) {
  const lignes = [
    {
      icone: <Trophy size={18} aria-hidden />,
      titre: 'Nos belles victoires',
      texte: `Dès que notre 1er gagne une course à une cote de ${coteMin} ou plus.`,
    },
    complet
      ? {
          icone: <BellRing size={18} aria-hidden />,
          titre: 'Confiance Élevée',
          texte: '30 minutes avant le départ d’une course où notre 1er se détache nettement.',
        }
      : {
          icone: <Timer size={18} aria-hidden />,
          titre: 'Votre course offerte',
          texte: '30 minutes avant son départ, avec notre pronostic complet.',
        },
  ]
  return (
    <ul className="flex flex-col gap-2.5">
      {lignes.map((l) => (
        <li key={l.titre} className="flex items-start gap-3">
          <span className="shrink-0 mt-0.5 text-accent">{l.icone}</span>
          <span className="text-sm font-medium text-muted leading-relaxed">
            <span className="text-ink font-semibold">{l.titre}</span> — {l.texte}
          </span>
        </li>
      ))}
    </ul>
  )
}
