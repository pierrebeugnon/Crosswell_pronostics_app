import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react'
import { chargerPlage, suivreEnDirect } from '@/services/predictions'
import { construireCourses, construireReunions } from '@/lib/aggregate'
import { jourISO } from '@/lib/format'
import { bornesPeriode, PERIODE_FENETRE } from '@/lib/periodes'
import type { Course, LignePrediction, Reunion } from '@/types'
import { useAcces } from '@/auth/AccesContext'

interface Donnees {
  courses: Course[]
  reunions: Reunion[]
  chargement: boolean
  /** Premier chargement fait : sert à distinguer « vide » de « pas encore là ». */
  pret: boolean
  erreur: string | null
  majLe: Date | null
  /**
   * Les courses passées de « à venir » à « courue » lors de la DERNIÈRE
   * resynchronisation. C'est l'accusé de réception du direct : sans lui, le
   * polling remplaçait les données en silence et une arrivée tombée sous les
   * yeux du client ne se distinguait pas d'un simple re-rendu. Le tableau
   * change de référence à chaque fournée — les consommateurs (toast, mise en
   * scène des chips) s'y accrochent par effet.
   */
  arrivees: Course[]
  rafraichir: () => void
}

const Contexte = createContext<Donnees | null>(null)

/** Le silence coûte cher un dimanche de meeting : on resynchronise. */
const INTERVALLE_MS = 90_000

/**
 * Charge une FENÊTRE glissante — les trente derniers jours, aujourd'hui compris,
 * plus demain — et la partage entre toutes les pages de suivi.
 *
 * Demain reste dans la fenêtre bien qu'il ne soit PLUS publié à l'avance : le
 * pipeline calcule le matin même (`RYTHME_PUBLICATION` dans config/app,
 * décision du 20/09/2026). La fenêtre ne coûte rien de plus et n'aura rien à
 * changer si le calcul de la veille revient un jour.
 *
 * Pourquoi une fenêtre et pas tout l'historique : le suivi en direct (accueil,
 * réunions, course du jour, arrivées) ne porte que sur les jours récents, et
 * relire l'intégralité à chaque rafraîchissement rendrait l'application lente à
 * mesure que la saison avance. Les jours plus anciens passent par d'autres
 * lectures, à la demande : les pages Réunion, Course et Partant chargent leur
 * objet hors fenêtre ; « Nos résultats » charge l'historique complet, une seule
 * fois.
 */
export function DonneesProvider({ children }: { children: ReactNode }) {
  const [lignes, setLignes] = useState<LignePrediction[]>([])
  const [chargement, setChargement] = useState(true)
  const [pret, setPret] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [majLe, setMajLe] = useState<Date | null>(null)
  const enCours = useRef(false)

  const charger = useCallback(async (silencieux = false) => {
    if (enCours.current) {
      // Un appui sur « Actualiser » pendant une relecture silencieuse ne relance
      // pas de requête — celle en cours rapportera des données tout aussi
      // fraîches — mais il doit se voir et s'annoncer : sans cela le bouton
      // semble cassé, et sur téléphone c'est le seul moyen de relire. Le
      // `finally` de la requête en cours remettra `chargement` à faux.
      if (!silencieux) setChargement(true)
      return
    }
    enCours.current = true
    if (!silencieux) setChargement(true)
    try {
      // La fenêtre est exactement la période « 30 jours » de `lib/periodes.ts`,
      // plus demain : l'accueil et « Nos résultats » comptent le même mois.
      const data = await chargerPlage(bornesPeriode(PERIODE_FENETRE).depuis!, jourISO(1))
      setLignes(data)
      setErreur(null)
      setMajLe(new Date())
    } catch (e) {
      // Un rafraîchissement de fond qui échoue ne doit pas effacer l'écran :
      // mieux vaut des données d'il y a une minute qu'une page d'erreur.
      if (!silencieux) setErreur(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      enCours.current = false
      setChargement(false)
      setPret(true)
    }
  }, [])

  useEffect(() => {
    void charger()
    const desabonner = suivreEnDirect(() => void charger(true))
    const timer = window.setInterval(() => void charger(true), INTERVALLE_MS)
    // Un onglet réveillé après une nuit affiche des données périmées.
    const auRetour = () => {
      if (document.visibilityState === 'visible') void charger(true)
    }
    document.addEventListener('visibilitychange', auRetour)
    return () => {
      desabonner()
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', auRetour)
    }
  }, [charger])

  /*
   * L'ACCÈS A CHANGÉ (Pass payé, Pass expiré) : la BASE filtre les pronostics
   * (`db/007`), les lignes déjà chargées le sont avec les anciens droits.
   * On relit en silence.
   */
  const { complet } = useAcces()
  const completAvant = useRef(complet)
  useEffect(() => {
    if (completAvant.current === complet) return
    completAvant.current = complet
    void charger(true)
  }, [complet, charger])

  const courses = useMemo(() => construireCourses(lignes), [lignes])
  const reunions = useMemo(() => construireReunions(courses), [courses])

  /**
   * Diff des arrivées : on compare l'ensemble des courses jugées à celui de la
   * fournée précédente. Le premier chargement n'annonce rien — trente jours
   * d'arrivées ne sont pas des nouvelles.
   */
  const [arrivees, setArrivees] = useState<Course[]>([])
  const couruesAvant = useRef<Set<string> | null>(null)
  useEffect(() => {
    // Rien n'est comparable avant la première fournée : sans ce garde, la
    // référence s'amorçait sur le jeu VIDE du montage, et l'arrivée des trente
    // jours d'historique passait pour trente jours de nouvelles — un toast au
    // premier chargement, à chaque visite.
    if (!pret) return
    const avant = couruesAvant.current
    couruesAvant.current = new Set(courses.filter((c) => c.courue).map((c) => c.cle))
    if (!avant) return
    const fraiches = courses.filter((c) => c.courue && !avant.has(c.cle))
    if (fraiches.length > 0) setArrivees(fraiches)
  }, [courses, pret])

  const valeur = useMemo<Donnees>(
    () => ({
      courses,
      reunions,
      chargement,
      pret,
      erreur,
      majLe,
      arrivees,
      rafraichir: () => void charger(),
    }),
    [courses, reunions, chargement, pret, erreur, majLe, arrivees, charger],
  )

  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>
}

export function useDonnees(): Donnees {
  const c = useContext(Contexte)
  if (!c) throw new Error('useDonnees doit être utilisé dans <DonneesProvider>')
  return c
}

/** Les réunions d'une date donnée. */
export function useReunionsDu(date: string): Reunion[] {
  const { reunions } = useDonnees()
  return useMemo(() => reunions.filter((r) => r.date === date), [reunions, date])
}
