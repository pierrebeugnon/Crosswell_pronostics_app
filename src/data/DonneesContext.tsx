import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react'
import { FENETRE_JOURS } from '@/config/app'
import { chargerPlage, suivreEnDirect } from '@/services/predictions'
import { construireCourses, construireReunions } from '@/lib/aggregate'
import { jourISO } from '@/lib/format'
import type { Course, LignePrediction, Reunion } from '@/types'

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
 * Charge une FENÊTRE glissante — les trente derniers jours plus demain — et la
 * partage entre toutes les pages de suivi.
 *
 * Pourquoi une fenêtre et pas tout l'historique : les pages « réunions » et
 * « course » n'ont jamais besoin de mars dernier, et charger l'intégralité à
 * chaque ouverture rendrait l'application lente à mesure que la saison avance.
 * La page « Nos résultats », elle, charge l'historique complet — mais une seule
 * fois, et à la demande.
 */
export function DonneesProvider({ children }: { children: ReactNode }) {
  const [lignes, setLignes] = useState<LignePrediction[]>([])
  const [chargement, setChargement] = useState(true)
  const [pret, setPret] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [majLe, setMajLe] = useState<Date | null>(null)
  const enCours = useRef(false)

  const charger = useCallback(async (silencieux = false) => {
    if (enCours.current) return
    enCours.current = true
    if (!silencieux) setChargement(true)
    try {
      const data = await chargerPlage(jourISO(-FENETRE_JOURS), jourISO(1))
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
