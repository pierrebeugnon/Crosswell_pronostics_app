import { DEMO } from '@/config/app'
import { supabase, configure } from '@/lib/supabase'
import { ficheDemo } from '@/lib/demo'
import type { Fiche, PerformanceCheval, ProfilCheval } from '@/types'

/** Vues exposées aux clients (lecture seule, `authenticated`) — `db/004_fiche_cheval.sql`. */
const VUE_CHEVAUX = 'client_chevaux'
const VUE_PERFORMANCES = 'client_performances'

/**
 * Plafond des performances lues pour un cheval. Au-delà de 200 courses, le
 * bilan de carrière porterait sur les 200 plus récentes : aucun cheval de la
 * base n'en approche, le plafond ne sert qu'à borner une requête.
 */
const PERFORMANCES_MAX = 200

interface LigneProfil {
  id_fg: string
  nom: string | null
  sexe: string | null
  robe: string | null
  date_naissance: string | null
  pere: string | null
  mere: string | null
  eleveur: string | null
  proprietaire: string | null
}

/**
 * La fiche d'un cheval : profil et performances. Rejette si les vues sont
 * absentes (migration 004 non appliquée) ou la session refusée : la fiche
 * garde alors son pronostic et dit simplement que le reste est indisponible.
 */
export async function chargerFiche(idFg: string, nom: string): Promise<Fiche> {
  if (DEMO) return ficheDemo(idFg, nom)
  if (!configure) throw new Error('Connexion à la base non configurée.')

  const [profil, performances] = await Promise.all([
    supabase
      .from(VUE_CHEVAUX)
      .select('id_fg, nom, sexe, robe, date_naissance, pere, mere, eleveur, proprietaire')
      .eq('id_fg', idFg)
      .maybeSingle<LigneProfil>(),
    supabase
      .from(VUE_PERFORMANCES)
      .select('date, hippodrome, place, distance, specialite, categorie, poids, jockey, entraineur, gains')
      .eq('id_fg', idFg)
      .order('date', { ascending: false })
      .limit(PERFORMANCES_MAX),
  ])
  if (profil.error) throw new Error(profil.error.message)
  if (performances.error) throw new Error(performances.error.message)

  const p = profil.data
  const versProfil = (l: LigneProfil): ProfilCheval => ({
    idFg: l.id_fg,
    nom: l.nom,
    sexe: l.sexe,
    robe: l.robe,
    dateNaissance: l.date_naissance,
    pere: l.pere,
    mere: l.mere,
    eleveur: l.eleveur,
    proprietaire: l.proprietaire,
  })
  return { profil: p ? versProfil(p) : null, performances: (performances.data ?? []) as PerformanceCheval[] }
}
