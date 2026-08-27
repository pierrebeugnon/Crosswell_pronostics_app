import { Link } from 'react-router-dom'
import { TrendingUp } from 'lucide-react'
import type { Course, Partant } from '@/types'
import { cote as formatCote, pourcent, signe } from '@/lib/format'
import { BarreProba } from '@/components/ui/BarreProba'
import { Dossard } from '@/components/ui/Dossard'
import { EtiquetteArrivee } from '@/components/ui/Etiquettes'

/**
 * Grille de sept colonnes qui se replie à quatre sur téléphone — une seule
 * structure, pas deux balisages concurrents. Un vrai <table> aurait imposé un
 * défilement horizontal sur mobile, où l'essentiel tient largement dans la
 * largeur.
 *
 * LA COTE NE DISPARAÎT PLUS AU PLIAGE. Elle était traitée comme une colonne
 * secondaire et tombait avec « placé » et « vs marché » : la ligne mobile se
 * réduisait à « 1 · PERFAIR · 27 % », de quoi lire un classement mais pas de
 * quoi le confronter à l'avis du public — or c'est cette confrontation qui
 * fait la valeur de la ligne. Plutôt que de comprimer une cinquième colonne
 * dans 343 px, elle passe sous le nom, là où la place existe déjà, et reprend
 * sa colonne dès que l'écran s'élargit.
 */
const GRILLE =
  'grid grid-cols-[2.25rem_1fr_3.75rem_3rem] sm:grid-cols-[2.5rem_1fr_5rem_4.5rem_4rem_5rem_4.5rem] items-center gap-x-2.5 sm:gap-x-3'

function LignePartant({
  course,
  partant,
  maximum,
}: {
  course: Course
  partant: Partant
  maximum: number
}) {
  const p = partant
  const notre = p.rang != null && p.rang <= 3
  const gagnant = p.arrivee === 1

  return (
    <Link
      to={`/courses/${course.date}/${encodeURIComponent(course.hippodrome)}/${course.numero}/partants/${p.numero}`}
      className={`${GRILLE} px-4 sm:px-5 py-3.5 transition-colors hover:bg-white/[0.05] active:bg-white/[0.08] ${
        gagnant ? 'bg-win/[0.07]' : ''
      }`}
    >
      <span
        className={`num w-7 h-7 rounded-lg grid place-items-center text-xs font-bold ${
          notre ? 'bg-accent text-accent-ink' : 'glass-nest text-faint'
        }`}
        title={p.rang != null ? `Classé ${p.rang} par le modèle` : undefined}
      >
        {p.rang ?? '—'}
      </span>

      <div className="min-w-0">
        <p className="text-sm font-medium truncate flex items-center gap-2">
          <span className="truncate">
            <Dossard numero={p.numero} className="mr-1.5 -mt-0.5" />
            {p.nom}
          </span>
          {p.value && (
            <span
              className="chip-win !py-0.5 !px-1.5 !text-[0.625rem] shrink-0"
              title="Notre probabilité dépasse nettement celle que la cote implique"
            >
              <TrendingUp size={10} />
              écart +
            </span>
          )}
        </p>

        <div className="mt-2 flex items-center gap-2">
          <BarreProba
            valeur={p.pWin}
            maximum={maximum}
            accent={notre}
            className="flex-1 max-w-[9rem] sm:max-w-[14rem]"
          />
          {/* Reprise mobile de la colonne « Cote », masquée dès que la vraie
              colonne réapparaît pour ne pas afficher deux fois la même valeur. */}
          <span className="num sm:hidden text-[0.6875rem] text-faint shrink-0">
            {p.cote == null ? 'non cotée' : `cote ${formatCote(p.cote)}`}
          </span>
        </div>
      </div>

      <span className="num text-sm font-semibold text-right">{pourcent(p.pWin)}</span>
      <span className="num hidden sm:block text-sm text-muted text-right">
        {pourcent(p.pPlace)}
      </span>
      <span className="num hidden sm:block text-sm text-muted text-right">
        {formatCote(p.cote)}
      </span>
      <span
        className={`num hidden sm:block text-sm text-right ${
          p.ecartMarche == null ? 'text-faint' : p.ecartMarche > 0 ? 'text-win' : 'text-muted'
        }`}
      >
        {p.ecartMarche == null ? '—' : `${signe(p.ecartMarche)} pt`}
      </span>

      <span className="justify-self-end">
        <EtiquetteArrivee place={p.arrivee} />
      </span>
    </Link>
  )
}

export function TablePartants({ course }: { course: Course }) {
  const maximum = Math.max(...course.liste.map((p) => p.pWin ?? 0), 0.0001)
  return (
    <div className="card overflow-hidden">
      <div
        className={`${GRILLE} px-4 sm:px-5 py-3 border-b border-white/[0.07] bg-white/[0.03]`}
      >
        <span className="label">Rang</span>
        <span className="label">Partant</span>
        <span className="label text-right">Victoire</span>
        <span className="label hidden sm:block text-right">Placé</span>
        <span className="label hidden sm:block text-right">Cote</span>
        <span className="label hidden sm:block text-right">vs marché</span>
        <span className="label text-right">Arrivée</span>
      </div>
      <div className="hairline-y">
        {course.liste.map((p) => (
          <LignePartant key={p.numero} course={course} partant={p} maximum={maximum} />
        ))}
      </div>
    </div>
  )
}
