import { describe, expect, it } from 'vitest'
import articles from '../../site/src/contenu/articles.json'

/** Le vocabulaire banni du positionnement (`site/CLAUDE.md`), là où il revient le plus : les métadonnées. */
const BANNIS = /\b(pari|paris|parier|mise|miser|jouer|joueur|gain|gains|rendement|rentable|bankroll|value|tuyau|bon plan|coup sûr)\b/i

describe('articles.json', () => {
  for (const a of articles as { slug: string; titre: string; chapo: string; date: string; miseAJour?: string; seo: { titre: string; description: string } }[]) {
    it(`${a.slug} : métadonnées sous les limites de Google`, () => {
      expect(a.seo.titre.length).toBeLessThanOrEqual(60)
      expect(a.seo.description.length).toBeLessThanOrEqual(155)
    })

    it(`${a.slug} : aucun mot banni dans le titre, le chapô et les métadonnées`, () => {
      for (const texte of [a.titre, a.chapo, a.seo.titre, a.seo.description]) expect(texte).not.toMatch(BANNIS)
    })

    it(`${a.slug} : un article publié n'est pas daté dans le futur`, () => {
      // Le jour de Paris : un article publié le soir ne doit pas échouer à minuit UTC.
      const aujourdhui = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date())
      if (!(a as { brouillon?: boolean }).brouillon) expect(a.date <= aujourdhui).toBe(true)
    })

    it(`${a.slug} : une mise à jour ne précède pas la publication`, () => {
      if (a.miseAJour) expect(a.miseAJour >= a.date).toBe(true)
    })
  }
})
