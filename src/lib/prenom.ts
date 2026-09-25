/**
 * LE PRÉNOM DU CLIENT — saisi dans le compte, lu par l'accueil (« Bonjour
 * Camille »). Il vit dans `user_metadata`, que le client peut modifier lui-même :
 * il ne sert JAMAIS à autoriser quoi que ce soit, seulement à saluer.
 *
 * La règle est volontairement large (tous les alphabets, accents, prénoms
 * composés, apostrophes) mais ferme sur le reste : un chiffre, un « < » ou un
 * émoji n'ont rien à faire dans une salutation.
 */

export const PRENOM_MAX = 40

export type ResultatPrenom = { ok: true; valeur: string } | { ok: false; erreur: string }

/** Commence et finit par une lettre ; entre les deux, lettres, espaces, tirets, apostrophes. */
const FORME = /^\p{L}(?:[\p{L}\p{M} '’-]*[\p{L}\p{M}])?$/u

/**
 * Nettoie une saisie : forme Unicode composée, espaces répétés ramenés à un,
 * bords rognés. Une saisie VIDE est acceptée et vaut effacement : le client
 * doit pouvoir retirer son prénom (l'accueil dit alors simplement « Bonjour »).
 */
export function nettoyerPrenom(brut: string): ResultatPrenom {
  const valeur = brut.normalize('NFC').replace(/\s+/g, ' ').trim()
  if (valeur === '') return { ok: true, valeur: '' }
  if ([...valeur].length > PRENOM_MAX) {
    return { ok: false, erreur: `${PRENOM_MAX} caractères au maximum.` }
  }
  if (!FORME.test(valeur)) {
    return {
      ok: false,
      erreur: 'Uniquement des lettres, des espaces, des tirets et des apostrophes.',
    }
  }
  return { ok: true, valeur }
}

/** Lit la métadonnée stockée : une valeur absente ou non conforme ne s'affiche pas. */
export function lirePrenom(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const r = nettoyerPrenom(v)
  return r.ok && r.valeur !== '' ? r.valeur : null
}

/**
 * Les initiales de la pastille de compte (en-tête) : une ou deux lettres.
 * Deux quand le prénom est composé (« Jean-Pierre » → « JP »), sinon la
 * première ; sans prénom, la première lettre de l'adresse ; sans rien, null
 * (la pastille montre alors une icône).
 */
export function initiales(prenom: string | null, email: string | null): string | null {
  const morceaux = (prenom ?? '').split(/[\s'’-]+/u).filter(Boolean)
  const lettres = morceaux.slice(0, 2).map((m) => [...m][0])
  if (lettres.length > 0) return lettres.join('').toLocaleUpperCase('fr-FR')
  const premiere = [...(email ?? '').trim()].find((c) => /\p{L}|\p{N}/u.test(c))
  return premiere ? premiere.toLocaleUpperCase('fr-FR') : null
}
