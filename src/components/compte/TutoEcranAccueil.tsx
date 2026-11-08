import type { ReactNode } from 'react'
import { ChevronDown, EllipsisVertical, Share, SquarePlus } from 'lucide-react'

/**
 * LE TUTORIEL « AJOUTER CROSSWELL À L'ÉCRAN D'ACCUEIL », replié en deux
 * sections (iPhone, Android) pour ne pas allonger la page Compte.
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

function Section({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <details className="group rounded-xl bg-canvas border border-track">
      <summary className="cursor-pointer list-none px-[1.125rem] py-3.5 text-sm font-bold flex items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
        {titre}
        <ChevronDown size={18} className="shrink-0 text-faint transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <ol className="flex flex-col gap-3 px-[1.125rem] pb-4">{children}</ol>
    </details>
  )
}

export function TutosEcranAccueil() {
  return (
    <div className="flex flex-col gap-2.5">
      <Section titre="Ajouter à l’écran d’accueil sur iPhone">
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
      </Section>
      <Section titre="Ajouter à l’écran d’accueil sur Android">
        <Etape n={1}>Ouvrez Crosswell dans {fort('Chrome')}, connecté à votre compte.</Etape>
        <Etape n={2} icone={<EllipsisVertical size={17} aria-label="icône Menu" />}>
          Touchez le {fort('menu')}, en haut à droite.
        </Etape>
        <Etape n={3}>
          Choisissez {fort('Installer l’application')} ou {fort('Ajouter à l’écran d’accueil')}, puis confirmez.
        </Etape>
        <Etape n={4}>Crosswell s’ouvre désormais depuis son icône, comme une application.</Etape>
      </Section>
    </div>
  )
}
