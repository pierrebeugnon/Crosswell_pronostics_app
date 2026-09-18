import { Navigate, useParams } from 'react-router-dom'
import { useDonnees } from '@/data/DonneesContext'
import { Chargement } from '@/components/ui/Chargement'
import { lienCourse } from '@/lib/programme'

/**
 * L'ANCIENNE PAGE D'UNE RÉUNION, fondue dans Courses depuis la refonte du
 * 18/09/2026 : la page Courses montre le programme de n'importe quel jour,
 * réunion par réunion, avec le verdict de chaque course. L'adresse
 * `/reunions/:date/:hippodrome` reste valable (liens partagés, favoris) et
 * ouvre la première course de la réunion. Hors de la fenêtre chargée, on
 * ouvre la course 1 : la page Courses la charge elle-même.
 */
export default function Reunion() {
  const { date = '', hippodrome = '' } = useParams()
  const nom = decodeURIComponent(hippodrome)
  const { reunions, pret } = useDonnees()

  if (!pret) return <Chargement texte="Chargement de la réunion…" />
  const reunion = reunions.find((r) => r.date === date && r.hippodrome === nom)
  const premiere = reunion?.courses[0]
  return <Navigate to={lienCourse(premiere ?? { date, hippodrome: nom, numero: 1 })} replace />
}
