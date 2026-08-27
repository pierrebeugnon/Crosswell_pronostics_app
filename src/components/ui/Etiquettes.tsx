import type { Course, TypeCourse } from '@/types'

const COULEUR_TYPE: Record<TypeCourse, string> = {
  Handicap: 'chip-info',
  'Réclamer': 'chip-neutral',
  Conditions: 'chip-neutral',
  'Groupe & Listed': 'chip-accent',
}

export function EtiquetteType({ type }: { type: TypeCourse }) {
  return <span className={COULEUR_TYPE[type]}>{type}</span>
}

/**
 * Dit d'un seul coup d'œil où en est la course.
 *
 * `key={verdict}` + pop : quand une resynchronisation fait passer la course
 * d'« À venir » à son verdict, la chip est remontée et se POSE sur la page —
 * l'arrivée tombée sous les yeux du client cesse d'être une substitution
 * silencieuse. Au premier montage, le pop de 300 ms se fond dans le fade-up
 * que les listes portent déjà.
 */
export function EtiquetteStatut({ course }: { course: Course }) {
  const verdict = !course.courue
    ? 'attente'
    : course.gagne
      ? 'gagne'
      : course.place
        ? 'place'
        : 'battu'

  const classe = {
    attente: 'chip-wait',
    gagne: 'chip-win',
    place: 'chip-info',
    battu: 'chip-loss',
  }[verdict]

  const libelle = { attente: 'À venir', gagne: 'Gagné', place: 'Placé', battu: 'Battu' }[verdict]

  return (
    <span key={verdict} className={`${classe} animate-pop`}>
      {libelle}
    </span>
  )
}

/** Place à l'arrivée d'un partant, colorée selon qu'elle paie ou non. */
export function EtiquetteArrivee({ place }: { place: number | null }) {
  if (place == null) return <span className="text-faint">—</span>
  const classe = place === 1 ? 'chip-win' : place <= 3 ? 'chip-info' : 'chip-neutral'
  return <span className={`${classe} num`}>{place === 1 ? '1er' : `${place}e`}</span>
}
