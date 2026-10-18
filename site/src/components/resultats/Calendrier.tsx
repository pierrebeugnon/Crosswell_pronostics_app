import { Link } from 'react-router-dom'
import { cheminJournee } from '@/lib/resultats'

/**
 * LE CALENDRIER DES JOURNÉES — mois complet sur grand écran, semaine en cours
 * sur téléphone avec le mois déplié par un `<details>`.
 *
 * TROIS ÉTATS, PAS QUATRE. La maquette en proposait un quatrième, « demain »,
 * en pointillés, légendé « programme et pronostics publiés la veille à 20 h ».
 * C'est faux : le calcul de la veille a été abandonné le 20/09/2026 et la
 * publication arrive le matin même. Le site avait déjà été corrigé le 25/09
 * pour cette exacte promesse — ce serait la troisième fois. Un jour futur n'est
 * donc pas cliquable, sinon le site ouvre une page vide sur une adresse
 * indexable.
 *
 * TOUT EST EN LIENS, jamais en boutons. Le prototype changeait de jour par un
 * état client : sans adresse propre, il n'y a ni lien partageable ni
 * indexation — le designer le signale lui-même. C'est aussi ce qui rend ce
 * calendrier rendable côté serveur sans une ligne de JavaScript.
 */

const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

/** 'AAAA-MM-JJ' → composantes, sans jamais passer par un fuseau. */
const partsDe = (jour: string) => jour.split('-').map(Number) as [number, number, number]

const iso = (a: number, m: number, j: number) =>
  `${a}-${String(m).padStart(2, '0')}-${String(j).padStart(2, '0')}`

/** Jours du mois, et position (lundi = 0) du 1er. */
function moisDe(annee: number, mois: number) {
  const premier = new Date(Date.UTC(annee, mois - 1, 1))
  const nbJours = new Date(Date.UTC(annee, mois, 0)).getUTCDate()
  const decalage = (premier.getUTCDay() + 6) % 7
  return { nbJours, decalage }
}

const MOIS_LONG = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

function Case({ jour, courant, aujourdhui }: { jour: string; courant: boolean; aujourdhui: string }) {
  const [, , j] = partsDe(jour)
  const futur = jour > aujourdhui

  const base =
    'num h-9 rounded-lg grid place-items-center text-[0.8125rem] font-semibold transition-colors'

  // Un jour à venir n'a pas de page : il est inerte, et annoncé comme tel.
  if (futur) {
    return (
      <span className={`${base} text-dim`} aria-disabled title="Journée à venir">
        {j}
      </span>
    )
  }

  return (
    <Link
      to={cheminJournee(jour)}
      aria-current={courant ? 'page' : undefined}
      className={`${base} ${
        courant
          ? 'bg-accent text-accent-ink'
          : jour === aujourdhui
            ? 'border border-accent text-ink hover:bg-raised'
            : 'text-soft hover:bg-raised'
      }`}
    >
      {j}
    </Link>
  )
}

function Grille({ jourCourant, aujourdhui }: { jourCourant: string; aujourdhui: string }) {
  const [annee, mois] = partsDe(jourCourant)
  const { nbJours, decalage } = moisDe(annee, mois)

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-7 gap-1">
        {JOURS.map((j, i) => (
          <span key={i} className="h-6 grid place-items-center text-[0.6875rem] font-bold text-faint">
            {j}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: decalage }, (_, i) => (
          <span key={`v${i}`} aria-hidden />
        ))}
        {Array.from({ length: nbJours }, (_, i) => {
          const jour = iso(annee, mois, i + 1)
          return <Case key={jour} jour={jour} courant={jour === jourCourant} aujourdhui={aujourdhui} />
        })}
      </div>
    </div>
  )
}

/** La semaine du jour courant, sur une ligne — l'affichage de téléphone. */
function Semaine({ jourCourant, aujourdhui }: { jourCourant: string; aujourdhui: string }) {
  const [a, m, j] = partsDe(jourCourant)
  const d = new Date(Date.UTC(a, m - 1, j))
  const lundi = new Date(d)
  lundi.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))

  return (
    <div className="grid grid-cols-7 gap-1">
      {Array.from({ length: 7 }, (_, i) => {
        const c = new Date(lundi)
        c.setUTCDate(lundi.getUTCDate() + i)
        const jour = iso(c.getUTCFullYear(), c.getUTCMonth() + 1, c.getUTCDate())
        return (
          <div key={jour} className="flex flex-col items-center gap-1">
            <span className="text-[0.6875rem] font-bold text-faint">{JOURS[i]}</span>
            <Case jour={jour} courant={jour === jourCourant} aujourdhui={aujourdhui} />
          </div>
        )
      })}
    </div>
  )
}

export function Calendrier({ jourCourant, aujourdhui }: { jourCourant: string; aujourdhui: string }) {
  const [annee, mois] = partsDe(jourCourant)
  const titre = `${MOIS_LONG[mois - 1]} ${annee}`

  return (
    <div className="flex flex-col gap-3 p-4 rounded-2xl bg-surface border border-line lg:w-[19rem] shrink-0">
      <span className="text-[0.8125rem] font-bold capitalize">{titre}</span>

      {/* Grand écran : le mois entier, toujours déplié. */}
      <div className="hidden lg:block">
        <Grille jourCourant={jourCourant} aujourdhui={aujourdhui} />
      </div>

      {/* Téléphone : la semaine, et le mois derrière un `<details>` natif —
          pas d'état client, donc rien à rejouer au rendu serveur. */}
      <div className="lg:hidden flex flex-col gap-3">
        <Semaine jourCourant={jourCourant} aujourdhui={aujourdhui} />
        <details className="group">
          <summary className="list-none cursor-pointer text-[0.8125rem] font-bold text-accent min-h-11 flex items-center">
            Voir le mois
          </summary>
          <div className="pt-3">
            <Grille jourCourant={jourCourant} aujourdhui={aujourdhui} />
          </div>
        </details>
      </div>
    </div>
  )
}
