import type { ReactNode } from 'react'

/**
 * LES BLOCS DU CORPS D'UN ARTICLE — `design/screens/Article.dc.html`.
 *
 * Un article n'écrit pas ses propres classes : il assemble ces blocs. C'est ce
 * qui garantit qu'au dixième article, la colonne de lecture fait toujours
 * 760 px, les titres toujours la même taille, et les encadrés la même chose.
 *
 * La maquette fixe : colonne 760 px (70 à 80 signes par ligne), corps 17 px,
 * interligne 1,75, H2 28 px, un H2 toutes les trois à cinq paragraphes.
 */

/** Un titre de section. L'`id` doit figurer dans `sections` de l'article : c'est l'ancre du sommaire. */
export function H2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-28 text-[1.5rem] lg:text-[1.75rem] font-extrabold tracking-[-0.02em] pt-4">
      {children}
    </h2>
  )
}

export function H3({ children }: { children: ReactNode }) {
  return <h3 className="text-[1.125rem] font-bold pt-2">{children}</h3>
}

export function P({ children }: { children: ReactNode }) {
  return <p className="text-[1rem] lg:text-[1.0625rem] leading-[1.75] text-soft">{children}</p>
}

/** Une liste à puces vertes, comme les pages légales. */
export function Liste({ points }: { points: ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {points.map((p, i) => (
        <li key={i} className="flex gap-3 text-[1rem] lg:text-[1.0625rem] leading-[1.75] text-soft">
          <span className="shrink-0 w-1.5 h-1.5 mt-3 rounded-full bg-accent" aria-hidden />
          <span>{p}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * LE CHIFFRE MIS EN AVANT. La maquette le place à gauche, en gros, avec son
 * explication à droite. Un chiffre sans source n'a rien à faire ici : la
 * propriété `source` n'est pas optionnelle par hasard.
 */
export function Chiffre({ valeur, children, source }: { valeur: string; children: ReactNode; source: string }) {
  return (
    <figure className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start px-5 py-5 rounded-2xl bg-surface border-l-2 border-accent">
      <span className="num text-[2.25rem] lg:text-[2.5rem] font-extrabold text-accent leading-none shrink-0">{valeur}</span>
      <figcaption className="flex flex-col gap-2">
        <span className="text-[0.9375rem] leading-[1.7] text-soft">{children}</span>
        <span className="text-xs text-faint">{source}</span>
      </figcaption>
    </figure>
  )
}

/** Un encadré de rappel : ce que le lecteur doit retenir, ou ce qu'il ne faut pas croire. */
export function Encadre({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <aside className="flex flex-col gap-2 px-5 py-4 rounded-2xl bg-raised border border-line-strong">
      <span className="text-[0.9375rem] font-extrabold">{titre}</span>
      <div className="text-[0.9375rem] leading-[1.7] text-muted">{children}</div>
    </aside>
  )
}

/** Un tableau simple, en-tête compris. Les colonnes se replient sur téléphone. */
export function Tableau({ entetes, lignes }: { entetes: string[]; lignes: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto -mx-5 px-5 lg:mx-0 lg:px-0">
      <table className="w-full min-w-[32rem] border-collapse text-[0.9375rem]">
        <thead>
          <tr className="border-b border-line-strong">
            {entetes.map((e) => (
              <th key={e} className="text-left font-bold py-2.5 pr-4 text-[0.8125rem] uppercase tracking-[0.08em] text-faint">
                {e}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lignes.map((ligne, i) => (
            <tr key={i} className="border-b border-track">
              {ligne.map((cellule, j) => (
                <td key={j} className={`py-3 pr-4 align-top ${j === 0 ? 'font-semibold text-ink' : 'text-soft'}`}>
                  {cellule}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
