import { AVERTISSEMENT } from '@/config/app'
import { PASS_MOINS_CHER, formule, type CleFormule } from '@/config/formules'
import { age } from '@/lib/fiche'
import { nettoyerPrenom } from '@/lib/prenom'

/**
 * L'INSCRIPTION — la logique pure (`design/screens/Signup*.dc.html`) : lecture
 * de la date de naissance, validation du compte, textes du paiement.
 */

export const EMAIL_VALIDE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
export const MOT_DE_PASSE_MIN = 8
const AGE_MAX = 120

/** « 01011990 » en cours de frappe → « 01/01/1990 » : les barres se posent seules. */
export function formaterSaisieDate(brut: string): string {
  const chiffres = brut.replace(/\D/g, '').slice(0, 8)
  if (chiffres.length <= 2) return chiffres
  if (chiffres.length <= 4) return `${chiffres.slice(0, 2)}/${chiffres.slice(2)}`
  return `${chiffres.slice(0, 2)}/${chiffres.slice(2, 4)}/${chiffres.slice(4)}`
}

/** « 31/12/1990 » → '1990-12-31', ou null si la date n'existe pas. */
export function lireDateNaissance(saisie: string): string | null {
  const m = saisie.trim().match(/^(\d{1,2})[/.\-\s](\d{1,2})[/.\-\s](\d{4})$/)
  if (!m) return null
  const [j, mo, a] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const d = new Date(Date.UTC(a, mo - 1, j))
  if (d.getUTCFullYear() !== a || d.getUTCMonth() !== mo - 1 || d.getUTCDate() !== j) return null
  return `${a}-${String(mo).padStart(2, '0')}-${String(j).padStart(2, '0')}`
}

export interface ChampsCompte {
  prenom: string
  email: string
  motDePasse: string
  naissance: string
  majeur: boolean
  conditions: boolean
}

export type ErreursCompte = Partial<Record<keyof ChampsCompte, string>>

/** Les erreurs du formulaire « Compte », au jour donné (heure de Paris). Vide : tout est bon. */
export function validerCompte(c: ChampsCompte, jour: string): ErreursCompte {
  const e: ErreursCompte = {}
  const prenom = nettoyerPrenom(c.prenom)
  if (!c.prenom.trim()) e.prenom = 'Indiquez votre prénom.'
  else if (!prenom.ok) e.prenom = prenom.erreur
  if (!EMAIL_VALIDE.test(c.email.trim())) e.email = 'Adresse e-mail invalide.'
  if (c.motDePasse.length < MOT_DE_PASSE_MIN) e.motDePasse = `${MOT_DE_PASSE_MIN} caractères minimum.`
  const naissance = lireDateNaissance(c.naissance)
  const ans = naissance ? age(naissance, jour) : null
  if (!naissance || ans == null || ans > AGE_MAX) e.naissance = 'Date invalide : écrivez-la sous la forme JJ/MM/AAAA.'
  else if (ans < AVERTISSEMENT.ageMinimum) e.naissance = `Le service est réservé aux personnes de ${AVERTISSEMENT.ageMinimum} ans et plus.`
  if (!c.majeur) e.majeur = 'Cochez cette case pour continuer.'
  if (!c.conditions) e.conditions = 'Cochez cette case pour continuer.'
  return e
}

export type Pass = Exclude<CleFormule, 'gratuit'>

/**
 * LE TEXTE DE LA CASE À COCHER avant paiement, repris des travaux du 16/09
 * (sauvegarde du 17/09, `lib/abonnement.ts`) et étendu au Pass annuel. Il
 * diffère selon la formule parce que le droit n'est pas le même. À FAIRE
 * VALIDER PAR UN JURISTE avant d'ouvrir le paiement.
 *
 * - Pass 1 jour : pleinement exécuté en vingt-quatre heures, donc avant la fin
 *   des 14 jours ; sur demande d'exécution immédiate et renonciation expresse,
 *   le droit de rétractation se perd (Code de la consommation, L221-28, 1°).
 * - Pass mensuel et annuel : un accès qui n'est pas pleinement exécuté dans les
 *   14 jours. Le client demande seulement que l'accès commence tout de suite ;
 *   il GARDE son droit de rétractation et paie, s'il l'exerce, la part déjà
 *   fournie (L221-25).
 *
 * Le serveur conserve ce texte exact, horodaté, avec la commande, et en envoie
 * confirmation sur support durable (L221-13).
 */
export function texteConsentement(cle: Pass): string {
  const f = formule(cle)
  return cle === 'jour'
    ? `Je demande l’accès au ${f.nom} dès le paiement et je renonce expressément à mon droit de rétractation, que je perdrai une fois le pass pleinement exécuté, au bout de vingt-quatre heures.`
    : `Je demande que mon accès au ${f.nom} commence dès le paiement. Si j’exerce mon droit de rétractation dans les 14 jours, je paierai la part de l’accès déjà fournie.`
}

/** Le récapitulatif de la maquette, sous le prix. */
export function lignesRecapitulatif(cle: Pass): string[] {
  const communes = ['Reçu envoyé par e-mail après le paiement']
  if (cle === 'jour') return ['Paiement unique, aucun renouvellement', 'Accès à toutes les courses pendant 24 h dès le paiement', ...communes]
  if (cle === 'an')
    return ['Sans engagement au-delà de l’année', 'Renouvellement automatique chaque année, avec un rappel par e-mail avant l’échéance', ...communes]
  return ['Sans engagement, résiliable à tout moment', 'Renouvellement automatique chaque mois', ...communes]
}

export function libellePaiement(cle: Pass): string {
  const f = formule(cle)
  return cle === 'jour' ? `Payer ${f.prix} et débloquer 24 h` : `Payer ${f.prix} et démarrer`
}

/** La phrase de bienvenue, selon la formule choisie. */
export function phraseBienvenue(cle: CleFormule): string {
  if (cle === 'gratuit') return `Votre course offerte du jour vous attend. Un Pass débloque toutes les autres, dès ${PASS_MOINS_CHER.prix}.`
  const f = formule(cle)
  return cle === 'jour'
    ? `Votre ${f.nom} s’active dès que Stripe confirme le paiement, pour vingt-quatre heures. Toutes les courses sont débloquées.`
    : `Votre ${f.nom} s’active dès que Stripe confirme le paiement. Tous les pronostics sont débloqués.`
}
