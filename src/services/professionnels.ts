import { DEMO } from '@/config/app'
import { supabase, configure } from '@/lib/supabase'
import { profilProDemo } from '@/lib/demo'
import { jourISO } from '@/lib/format'
import { saison } from '@/lib/professionnels'
import type { AssociationPro, MontePro, ProfilPro, RangPro, RolePro, StatPro } from '@/types'

/** Vues de `db/005_fiches_professionnels.sql`, lecture seule, `authenticated`. */
const COLONNES_MONTE = 'date, hippodrome, place, distance, specialite, categorie, jockey, entraineur, cheval'

/**
 * LE PALMARÈS N'A PAS DE COLONNE `place` : la vue ne garde que les victoires
 * (`WHERE f.place = '1'`, db/005). La demander quand même faisait répondre 400
 * à PostgREST, et l'erreur emportait toute la fiche — c'est ce qu'on voyait en
 * cliquant sur un jockey ou un entraîneur depuis une fiche cheval.
 */
const COLONNES_PALMARES = 'date, hippodrome, distance, specialite, categorie, jockey, entraineur, cheval'

/** Le rang affiché en tête du classement : les huit premiers, comme dans la maquette. */
const TETE_CLASSEMENT = 8

interface LigneRang {
  nom: string
  montes: number
  victoires: number
  allocations: number | string
  rang_victoires: number
  rang_allocations: number
  effectif: number
}

const versRang = (l: LigneRang): RangPro => ({
  nom: l.nom,
  montes: Number(l.montes),
  victoires: Number(l.victoires),
  allocations: Number(l.allocations),
  rangVictoires: Number(l.rang_victoires),
  rangAllocations: Number(l.rang_allocations),
  effectif: Number(l.effectif),
})

/**
 * Une valeur de filtre PostgREST entre guillemets, pour `or(...)` : les noms
 * portent points, espaces, virgules possibles et parenthèses (« E. ALLAIRE (S) »).
 */
const cite = (v: string) => `"${v.replace(/(["\\])/g, '\\$1')}"`

function verifier<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message)
  return (r.data ?? []) as T
}

/**
 * La fiche d'un jockey ou d'un entraîneur, identifié par son nom tel que France
 * Galop l'écrit (« L. ZULIANI », « E. ALLAIRE (S) »). Rejette si les vues de
 * 005 manquent ou si la session est refusée.
 */
export async function chargerProfilPro(role: RolePro, nom: string): Promise<ProfilPro> {
  const anneeCourante = Number(jourISO(0).slice(0, 4))
  if (DEMO) {
    const d = profilProDemo(role, nom)
    const annee = saison(d.stats, anneeCourante)
    return { ...d, annee, stats: d.stats.filter((s) => s.annee === annee) }
  }
  if (!configure) throw new Error('Connexion à la base non configurée.')
  const colonne = role === 'jockey' ? 'jockey' : 'entraineur'

  const brutes = verifier(
    await supabase
      .from('client_stats_pros')
      .select('annee, mois, specialite, hippodrome, montes, victoires, places, allocations')
      .eq('role', role)
      .eq('nom', nom),
  ) as StatPro[]
  const toutes = brutes.map((s) => ({ ...s, montes: Number(s.montes), victoires: Number(s.victoires), places: Number(s.places), allocations: Number(s.allocations) }))
  const annee = saison(toutes, anneeCourante)

  // Un seul passage sur le classement, la tête ET la personne : c'est la
  // requête la plus lourde de la fiche.
  const [classement, associations, montes, palmares, programme] = await Promise.all([
    supabase
      .from('client_classement')
      .select('nom, montes, victoires, allocations, rang_victoires, rang_allocations, effectif')
      .eq('role', role)
      .eq('annee', annee)
      .or(`rang_victoires.lte.${TETE_CLASSEMENT},rang_allocations.lte.${TETE_CLASSEMENT},nom.eq.${cite(nom)}`),
    supabase
      .from('client_associations')
      .select('jockey, entraineur, montes, victoires')
      .eq('annee', annee)
      .eq(colonne, nom)
      .order('montes', { ascending: false })
      .limit(20),
    supabase.from('client_montes').select(COLONNES_MONTE).eq(colonne, nom).order('date', { ascending: false }).limit(10),
    supabase.from('client_palmares').select(COLONNES_PALMARES).eq(colonne, nom).order('date', { ascending: false }).limit(12),
    role === 'entraineur'
      ? supabase.from('client_entourage_du_jour').select('id_fg').eq('entraineur', nom)
      : Promise.resolve({ data: [] as { id_fg: string }[], error: null }),
  ])
  const rangs = (verifier(classement) as LigneRang[]).map(versRang)

  const partenaire = role === 'jockey' ? 'entraineur' : 'jockey'
  return {
    role,
    nom,
    annee,
    stats: toutes.filter((s) => s.annee === annee),
    classement: rangs,
    moi: rangs.find((r) => r.nom === nom) ?? null,
    associations: (verifier(associations) as Record<string, string | number>[]).map(
      (a): AssociationPro => ({ partenaire: String(a[partenaire]), montes: Number(a.montes), victoires: Number(a.victoires) }),
    ),
    montes: verifier(montes) as MontePro[],
    // La place est rétablie ici : la vue ne rend que des victoires.
    palmares: (verifier(palmares) as Omit<MontePro, 'place'>[]).map((p) => ({ ...p, place: '1' })),
    programme: (verifier(programme) as { id_fg: string }[]).map((p) => p.id_fg),
  }
}
