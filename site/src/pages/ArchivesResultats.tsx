import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { jourCourt, moisLong } from '@/lib/format'
import { useDonneesInitiales } from '@/lib/donnees-initiales'
import { cheminJournee } from '@/lib/resultats'
import { decrire } from '@/lib/resultats-seo'
import { TOUTES_LES_JOURNEES, chargerJourneesDisponibles } from '@/services/resultats'
import { useTitre } from '@/lib/useTitre'

/**
 * LES ARCHIVES — `/resultats/archives`, toutes les journées publiées.
 *
 * Le calendrier de `/resultats` s'arrête à 60 journées. Au-delà, une journée
 * n'aurait plus aucun lien vers elle : elle existerait toujours, mais ni un
 * lecteur ni un robot n'aurait de chemin pour l'atteindre. Cette page est ce
 * chemin, rendue côté serveur comme les autres pages de résultats.
 */
export default function ArchivesResultats() {
  const initiales = useDonneesInitiales()
  const [journees, setJournees] = useState<string[] | null>(initiales?.journees ?? null)
  const [erreur, setErreur] = useState(false)

  useEffect(() => {
    if (initiales?.journees) return
    let vivant = true
    chargerJourneesDisponibles(TOUTES_LES_JOURNEES)
      .then((j) => vivant && setJournees(j))
      .catch(() => vivant && setErreur(true))
    return () => {
      vivant = false
    }
  }, [initiales])

  const tete = useMemo(() => decrire({ jour: null, lieu: null, numero: null, archives: true }, null), [])
  useTitre(tete ? tete.titre : 'Archives des résultats', { suffixe: !tete })

  // `journees` arrive de la plus récente à la plus ancienne : les mois aussi.
  const parMois = useMemo(() => {
    const mois = new Map<string, string[]>()
    for (const j of journees ?? []) {
      const m = j.slice(0, 7)
      mois.set(m, [...(mois.get(m) ?? []), j])
    }
    return [...mois.entries()]
  }, [journees])

  return (
    <div className="w-full max-w-[60rem] mx-auto px-5 lg:px-10 pt-7 lg:pt-12 pb-14 lg:pb-24 flex flex-col gap-7 lg:gap-9">
      <nav aria-label="Fil d’Ariane" className="text-xs font-medium text-faint">
        <Link to="/resultats" className="hover:text-ink">
          Résultats
        </Link>
        <span aria-hidden> / </span>
        <span className="text-soft">Archives</span>
      </nav>

      <div className="flex flex-col gap-3 max-w-[42rem]">
        <h1 className="text-[1.75rem] lg:text-[2.3125rem] font-extrabold tracking-[-0.03em] leading-[1.05]">
          Archives des résultats
        </h1>
        <p className="text-[0.9375rem] lg:text-[1rem] font-medium leading-relaxed text-muted">
          Toutes les journées de galop que nous avons publiées&nbsp;: l’arrivée de chaque course et, en face, ce que
          notre modèle avait annoncé le matin même.
        </p>
      </div>

      {erreur && (
        <p className="text-[0.9375rem] leading-relaxed text-muted">
          Les archives ne sont pas joignables pour le moment.
        </p>
      )}

      {!erreur && !journees && (
        <p className="text-[0.9375rem] text-faint" role="status">
          Chargement des archives…
        </p>
      )}

      {parMois.map(([mois, jours]) => (
        <section key={mois} className="flex flex-col gap-3">
          <h2 className="text-[1.1875rem] lg:text-[1.4375rem] font-extrabold tracking-[-0.02em] first-letter:uppercase">
            {moisLong(mois)}
          </h2>
          <div className="flex flex-wrap gap-2">
            {jours.map((j) => (
              <Link
                key={j}
                to={cheminJournee(j)}
                className="px-4 h-11 rounded-full bg-surface border border-line flex items-center text-[0.875rem] font-semibold text-soft hover:border-line-hover transition-colors"
              >
                {jourCourt(j)}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
