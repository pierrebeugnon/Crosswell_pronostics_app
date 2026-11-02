/**
 * LE QUINTÉ+ DU JOUR — la pastille, et tout ce que l'application en dit.
 *
 * « Quinté+ » est le seul mot de pari que la plateforme s'autorise, et
 * seulement parce qu'il NOMME une course : exception écrite au positionnement,
 * accordée par le fondateur le 28/10/2026 (voir `site/CLAUDE.md`, section « Le
 * positionnement »). Aucun rapport, aucune mise, aucune invitation à jouer ne
 * l'accompagne — c'est ce qui la rend acceptable, et ce qui doit le rester.
 *
 * TEINTE `quinte` — le rouge, demandé par le fondateur le 28/10/2026 pour la
 * reconnaissance : c'est la couleur sous laquelle le Quinté+ se présente
 * partout ailleurs. Ni le vert, qui dit « notre pronostic », « value » et
 * « gagnant » dans toute l'application — une course mise en avant par le PMU
 * n'est aucun des trois, et lui donner cette couleur laisserait croire que
 * nous la recommandons. Ni `loss`, l'autre rouge, qui dit « erreur » et
 * « perdu » : d'où un jeton à part, assez distant pour ne pas s'y confondre
 * (voir le commentaire de `--c-quinte` dans `index.css`).
 *
 * DEUX TAILLES NOMMÉES, et pas de `className` à surcharger : `px-2.5` et
 * `px-[7px]` ont la même spécificité, et Tailwind émet le bloc des valeurs
 * arbitraires APRÈS celui de l'échelle nommée (mesuré le 28/10/2026 dans le CSS
 * construit : 28714 contre 29327). Une surcharge passée de l'extérieur était
 * donc silencieusement perdue, sauf à la marquer `!` — un piège qu'il vaut
 * mieux supprimer que documenter.
 *
 * La donnée vient de `client_predictions.quinte` (db/019), elle-même alimentée
 * par `modele_prediction_engagement.quintes` (migration 038 du pipeline). Elle
 * n'est JAMAIS masquée par le verrou des formules Gratuit : ce n'est pas un
 * pronostic, et le site vitrine la montre déjà à un visiteur anonyme.
 */
export function PastilleQuinte({ grande = false }: { grande?: boolean }) {
  return (
    <span
      className={`shrink-0 font-extrabold uppercase tracking-[0.08em] text-quinte bg-quinte-deep border border-quinte/40 rounded-full ${
        grande ? 'text-[0.6875rem] px-2.5 py-1' : 'text-[0.625rem] px-[7px] py-0.5'
      }`}
    >
      Quinté+
    </span>
  )
}
