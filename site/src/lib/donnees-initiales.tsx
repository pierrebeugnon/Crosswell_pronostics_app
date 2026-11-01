import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { JourneePublique } from '@/lib/resultats'

/**
 * LES DONNÉES DÉJÀ CHARGÉES — le pont entre le rendu serveur et le navigateur.
 *
 * Les pages de résultats chargent dans un `useEffect`, qui ne s'exécute PAS
 * pendant `renderToString` : rendues côté serveur sans aide, elles ne
 * produiraient que « Chargement des résultats… ». Or c'est précisément le
 * contenu qui doit se trouver dans le HTML servi, puisque c'est tout l'objet
 * du rendu serveur.
 *
 * DEUX CHEMINS, PARCE QU'IL Y A DEUX MONDES :
 * - au SERVEUR, un contexte React, parce qu'il n'existe pas de `window` ;
 * - au NAVIGATEUR, `window.__CROSSWELL__`, déposé par la balise que le serveur
 *   a écrite — ce qui évite au visiteur de refaire la requête.
 *
 * Le contexte est essayé en premier : c'est celui qui existe pendant le rendu.
 *
 * CE QUI TRANSITE EST DÉJÀ PUBLIC — des lignes des vues `resultats_publics`,
 * `programme_public` et `journees_publiques`, que n'importe qui peut lire avec
 * la clé anonyme. Rien d'une course non jugée ne peut s'y trouver : la vue n'en
 * sert aucune ligne.
 */

export interface DonneesInitiales {
  journee?: JourneePublique
  journees?: string[]
}

/** La clé, écrite une fois : le serveur l'émet, le client la lit. */
export const CLE_DONNEES = '__CROSSWELL__'

declare global {
  interface Window {
    __CROSSWELL__?: DonneesInitiales
  }
}

const Contexte = createContext<DonneesInitiales | undefined>(undefined)

/** Enveloppe le rendu serveur. Inutile au navigateur, qui lit `window`. */
export function FournisseurDonnees({
  donnees,
  children,
}: {
  donnees: DonneesInitiales
  children: ReactNode
}) {
  return <Contexte.Provider value={donnees}>{children}</Contexte.Provider>
}

/**
 * Ce qui a été préparé pour CETTE page, ou `undefined`.
 *
 * Au navigateur, la valeur est CONSOMMÉE à la première lecture : au second
 * passage — une navigation interne, un changement de journée — les données du
 * serveur concernent une autre adresse, et les resservir afficherait la veille
 * sous le titre du jour. Le `useMemo` garantit une seule lecture par montage.
 */
export function useDonneesInitiales(): DonneesInitiales | undefined {
  const duServeur = useContext(Contexte)
  return useMemo(() => {
    if (duServeur) return duServeur
    if (typeof window === 'undefined') return undefined
    const d = window.__CROSSWELL__
    delete window.__CROSSWELL__
    return d
  }, [duServeur])
}

/**
 * Sérialise pour l'insertion dans une balise `<script>`.
 *
 * `<` et `>` sont neutralisés : une valeur venant de la base — un nom de
 * cheval, un libellé de course — qui contiendrait « </script> » fermerait la
 * balise et transformerait la donnée en balisage. C'est la faille d'injection
 * classique de l'état initial, et elle ne coûte qu'un remplacement à refermer.
 */
export function serialiser(donnees: DonneesInitiales): string {
  return JSON.stringify(donnees)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    // U+2028 et U+2029 terminent une ligne en JavaScript : laissés tels quels
    // dans un littéral, ils couperaient le script en deux. D'où la
    // construction par code de caractère, qui évite de les écrire ici.
    .replace(new RegExp(String.fromCharCode(0x2028), 'g'), '\\u2028')
    .replace(new RegExp(String.fromCharCode(0x2029), 'g'), '\\u2029')
}
