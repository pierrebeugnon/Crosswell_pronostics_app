import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock } from 'lucide-react'
import { RYTHME_PUBLICATION_COURT } from '@/config/app'
import { useDonnees } from '@/data/DonneesContext'
import { useAuth } from '@/auth/AuthContext'
import { decalerJour } from '@/lib/format'
import { opportunites as calculerOpportunites, prochaineCourse, resumeJour } from '@/lib/accueil'
import { coursesDuJour } from '@/lib/programme'
import { useHeureParis } from '@/lib/useHeureParis'
import { Erreur } from '@/components/ui/EtatVide'
import { ProchaineCourse } from '@/components/accueil/ProchaineCourse'
import { Opportunites } from '@/components/accueil/Opportunites'
import { CoursesDuJour } from '@/components/accueil/CoursesDuJour'
import { Demain } from '@/components/accueil/Demain'
import { BandeauGratuit } from '@/components/acces/Verrou'
import { useAcces } from '@/auth/AccesContext'

function Squelette() {
  return (
    <div className="flex flex-col gap-7 lg:gap-11" aria-busy="true" aria-label="Chargement des pronostics">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] gap-5">
        <div className="skeleton h-[26rem] rounded-[1.5rem]" />
        <div className="skeleton hidden lg:block h-[26rem] rounded-[1.5rem]" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="skeleton h-40 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

/** La grande carte quand il n'y a aucune course ni aujourd'hui ni demain. */
function SansCourse() {
  return (
    <section className="flex flex-col justify-center gap-4 p-5 lg:p-8 rounded-[1.375rem] lg:rounded-[1.5rem] bg-surface border border-line min-w-0">
      <span className="w-12 h-12 rounded-xl bg-accent/[0.12] grid place-items-center text-accent" aria-hidden>
        <CalendarClock size={24} />
      </span>
      <h2 className="text-[1.1875rem] lg:text-[1.5625rem] font-extrabold tracking-[-0.02em] leading-tight">
        Aucune course au programme
      </h2>
      <p className="max-w-[35rem] text-sm lg:text-[0.9375rem] font-medium leading-relaxed text-muted">{RYTHME_PUBLICATION_COURT}</p>
      <Link to="/reunions" className="self-start text-sm font-bold text-accent hover:text-accent-hover">
        Voir les réunions passées
      </Link>
    </section>
  )
}

/**
 * ACCUEIL — `design/screens/Home.dc.html`.
 *
 * De haut en bas : la prochaine course et les opportunités, toutes les courses
 * du jour, puis le programme de demain. La salutation « Bonjour {prénom} »
 * (demande du 17/09) prend la place du surtitre « Aujourd'hui » de la maquette.
 *
 * Tout est calculé depuis l'heure de Paris (`useHeureParis`) : la page reste
 * juste si elle reste ouverte — la prochaine course change à chaque départ.
 */
export default function Aujourdhui() {
  const { reunions, pret, erreur, rafraichir } = useDonnees()
  const { prenom } = useAuth()
  const { complet } = useAcces()
  const maintenant = useHeureParis()

  const aujourdhui = maintenant.jour
  const demain = decalerJour(aujourdhui, 1)

  const duJour = useMemo(() => coursesDuJour(reunions, aujourdhui), [reunions, aujourdhui])
  const deDemain = useMemo(() => coursesDuJour(reunions, demain), [reunions, demain])
  const prochaine = useMemo(() => prochaineCourse(reunions, maintenant, demain), [reunions, maintenant, demain])
  const opportunites = useMemo(() => calculerOpportunites(reunions, maintenant, demain), [reunions, maintenant, demain])
  const resume = resumeJour(reunions, aujourdhui)

  return (
    <div className="flex flex-col gap-7 lg:gap-11">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-1.5 lg:gap-6">
        <div className="flex flex-col gap-1.5 lg:gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-accent">
            {prenom ? `Bonjour ${prenom}` : 'Aujourd’hui'}
          </span>
          <h1 className="text-[1.5625rem] lg:text-[2.3125rem] font-extrabold tracking-[-0.03em] leading-[1.05]">
            Les pronostics du jour
          </h1>
        </div>
        {pret && (
          <p className="num text-[0.8125rem] lg:text-[0.9375rem] font-medium text-faint">
            {resume || 'Aucune course aujourd’hui'}
          </p>
        )}
      </header>

      {!complet && <BandeauGratuit />}

      {erreur ? (
        <Erreur message={erreur} onReessayer={rafraichir} />
      ) : !pret ? (
        <Squelette />
      ) : (
        <>
          {/* Toujours là, comme dans la maquette : sans course à venir ni demain
              publié, la grande carte montre la dernière course du jour. */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] gap-7 lg:gap-5">
            {prochaine ? <ProchaineCourse prochaine={prochaine} maintenant={maintenant} /> : <SansCourse />}
            <Opportunites opportunites={opportunites} aujourdhui={aujourdhui} />
          </div>
          {duJour.length > 0 && (
            <CoursesDuJour
              courses={duJour}
              prochaine={prochaine && !prochaine.demain && !prochaine.terminee ? prochaine.course : null}
              maintenant={maintenant}
            />
          )}
          <Demain courses={deDemain} demain={demain} />
        </>
      )}
    </div>
  )
}
