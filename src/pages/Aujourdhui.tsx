import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, Sparkles, TrendingUp } from 'lucide-react'
import { FENETRE_JOURS, SEUIL_ECHANTILLON } from '@/config/app'
import type { Course, Partant, Reunion } from '@/types'
import { useDonnees } from '@/data/DonneesContext'
import { bilan, serieReussite } from '@/lib/stats'
import { useCompteur } from '@/lib/useCompteur'
import { CourbeReussite } from '@/components/stats/CourbeReussite'
import {
  cote as formatCote,
  dateCourte,
  dateLongue,
  hippodrome as formatHippodrome,
  jourISO,
  pourcent,
  signe,
} from '@/lib/format'
import { Carte, EnTeteCarte } from '@/components/ui/Carte'
import { Dossard } from '@/components/ui/Dossard'
import { DuelMarche } from '@/components/ui/DuelMarche'
import { Aide } from '@/components/ui/Aide'
import { SqueletteListe, SqueletteStats } from '@/components/ui/Chargement'
import { Erreur, EtatVide } from '@/components/ui/EtatVide'
import { EtiquetteArrivee } from '@/components/ui/Etiquettes'
import { Segmente } from '@/components/ui/Segmente'
import { CarteReunion } from '@/components/course/CarteReunion'
import { LigneCourse } from '@/components/course/LigneCourse'

interface Ecart {
  course: Course
  partant: Partant
}

const MAX_SELECTIONS = 8
const MAX_ECARTS = 6

/**
 * Un écart au marché, en carte.
 *
 * Les deux probabilités sont comparées par des BARRES et pas seulement par des
 * nombres : « 12 % contre 9 % » demande un calcul, deux barres à la même
 * échelle se lisent d'un regard — et c'est le rapport entre les deux, non leur
 * valeur absolue, qui fait l'intérêt de la ligne.
 */
function ArticleEcart({ ecart, rang }: { ecart: Ecart; rang: number }) {
  const { course, partant } = ecart

  return (
    <article
      className="card-nest p-4 animate-fade-up"
      style={{ animationDelay: `${rang * 40}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            className="tap font-medium truncate block hover:text-accent transition-colors"
            to={`/courses/${course.date}/${encodeURIComponent(course.hippodrome)}/${course.numero}/partants/${partant.numero}`}
          >
            <Dossard numero={partant.numero} className="mr-1.5 -mt-0.5" />
            {partant.nom}
          </Link>
          <p className="num text-xs text-faint mt-1 truncate">
            {formatHippodrome(course.hippodrome)}
            <span className="opacity-50"> · </span>
            Course {course.numero}
            <span className="opacity-50"> · </span>
            {course.type}
          </p>
        </div>
        <span className="chip-accent num shrink-0">
          <TrendingUp size={12} aria-hidden />
          {signe(partant.ecartMarche)} pt
        </span>
      </div>

      <div className="mt-4">
        <DuelMarche pNous={partant.pWin} pMarche={partant.pMarche} />
      </div>

      <p className="num text-xs text-faint mt-4 pt-3 border-t border-white/[0.07]">
        Notre rang {partant.rang ?? '—'}
        <span className="opacity-50"> · </span>
        cote {formatCote(partant.cote)}
        <span className="opacity-50"> · </span>
        {course.partants ?? course.liste.length} partants
      </p>
    </article>
  )
}

/**
 * Un pourcentage qui se COMPOSE sous les yeux (~600 ms). Réservé aux chiffres
 * qui sont la page — les deux héros de réassurance et la conviction du soir ;
 * un compteur sur chaque tuile transformerait l'écran en machine à sous.
 */
function PourcentAnime({ valeur }: { valeur: number | null }) {
  const anime = useCompteur(valeur ?? 0)
  if (valeur == null) return <>—</>
  return <>{pourcent(anime)}</>
}

export default function Aujourdhui() {
  const { courses, reunions, pret, erreur, rafraichir } = useDonnees()

  const aujourdhui = jourISO(0)
  const demain = jourISO(1)

  /**
   * Le jour affiché n'est pas un état à part entière : `choix` ne vaut quelque
   * chose que si le client a touché le sélecteur. Tant qu'il n'y a pas touché,
   * la page suit les données — un dimanche soir, tout est couru depuis des
   * heures et demain est déjà publié : s'ouvrir sur une page vide serait une
   * faute. Passer par un effet qui corrigerait l'état après coup rendrait
   * impossible le retour manuel sur « Aujourd'hui ».
   */
  const [choix, setChoix] = useState<string | null>(null)
  const jourAuto = useMemo(() => {
    const peuple = (d: string) => reunions.some((r) => r.date === d)
    if (!peuple(aujourdhui) && peuple(demain)) return demain
    // Le rituel du soir : après 18 h, si tout ce qui devait courir a couru et
    // que demain est déjà publié, la page s'ouvre sur demain. Un client qui
    // ouvre l'app à 21 h vient chercher les pronostics frais, pas le compte
    // rendu d'une journée close — qui reste à un geste, via le sélecteur.
    const soir = new Date().getHours() >= 18
    const toutCouru = courses.filter((c) => c.date === aujourdhui).every((c) => c.courue)
    if (soir && toutCouru && peuple(demain)) return demain
    return aujourdhui
  }, [reunions, courses, aujourdhui, demain])
  const jour = choix ?? jourAuto

  const coursesDuJour = useMemo(() => courses.filter((c) => c.date === jour), [courses, jour])
  const reunionsDuJour = useMemo(() => reunions.filter((r) => r.date === jour), [reunions, jour])

  const conviction = useMemo<Ecart | null>(() => {
    let meilleure: Ecart | null = null
    for (const c of coursesDuJour) {
      const f = c.favori
      if (!f || f.pWin == null) continue
      if (!meilleure || f.pWin > (meilleure.partant.pWin ?? 0)) meilleure = { course: c, partant: f }
    }
    return meilleure
  }, [coursesDuJour])

  const avecFavori = useMemo(
    () =>
      coursesDuJour
        .filter((c) => c.favori != null && c.favori.pWin != null)
        .sort((a, b) => (b.favori?.pWin ?? 0) - (a.favori?.pWin ?? 0)),
    [coursesDuJour],
  )
  const selections = avecFavori.slice(0, MAX_SELECTIONS)
  const reste = avecFavori.length - selections.length

  const reunionLaPlusFournie = useMemo(
    () =>
      reunionsDuJour.reduce<Reunion | null>(
        (m, r) => (m == null || r.courses.length > m.courses.length ? r : m),
        null,
      ),
    [reunionsDuJour],
  )

  const ecarts = useMemo<Ecart[]>(() => {
    const tous: Ecart[] = []
    for (const c of coursesDuJour) {
      for (const p of c.liste) {
        if (p.value && p.ecartMarche != null) tous.push({ course: c, partant: p })
      }
    }
    // Un écart au marché sur une course déjà partie n'éclaire plus rien ; on
    // ne le masque que s'il reste des courses à venir, sinon la carte
    // disparaîtrait au milieu de l'après-midi sans rien dire.
    const aVenir = tous.filter((e) => !e.course.courue)
    const retenus = aVenir.length > 0 ? aVenir : tous
    return retenus
      .sort((a, b) => (b.partant.ecartMarche ?? 0) - (a.partant.ecartMarche ?? 0))
      .slice(0, MAX_ECARTS)
  }, [coursesDuJour])

  /** Tout ce que la fenêtre chargée contient de courses jugées. */
  const historique = useMemo(() => bilan(courses), [courses])
  const serie = useMemo(() => serieReussite(courses), [courses])

  /** Volume du jour — ce que le moteur a effectivement passé en revue. */
  const volume = useMemo(() => {
    const partants = coursesDuJour.reduce((s, c) => s + c.liste.length, 0)
    return {
      reunions: reunionsDuJour.length,
      courses: coursesDuJour.length,
      partants,
      cotees: coursesDuJour.filter((c) => c.cotee).length,
    }
  }, [coursesDuJour, reunionsDuJour])

  /**
   * Le bilan de la veille. Le matin, la page du jour ne montre que des courses
   * à venir : sans ce rappel, un client qui ouvre l'application à 8 h n'a
   * aucune trace de ce que le modèle a fait la veille, alors que c'est
   * précisément ce qui lui dit s'il doit nous suivre aujourd'hui.
   */
  const hier = useMemo(() => {
    const d = jourISO(-1)
    const cs = courses.filter((c) => c.date === d && c.courue)
    return cs.length ? { date: d, bilan: bilan(cs), gagnantes: cs.filter((c) => c.gagne) } : null
  }, [courses])

  if (erreur) return <Erreur message={erreur} onReessayer={rafraichir} />

  if (!pret) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-12 w-64" />
        <SqueletteStats />
        <SqueletteListe />
      </div>
    )
  }

  const salutation = new Date().getHours() >= 18 ? 'Bonsoir' : 'Bonjour'
  const libelleJour = dateLongue(jour)
  const titre = libelleJour.charAt(0).toLocaleUpperCase('fr') + libelleJour.slice(1)
  const suffixe = jour === demain ? 'de demain' : 'du jour'

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted">{salutation}</p>
          <h1 className="titre-page mt-1.5">{titre}</h1>
        </div>
        <Segmente
          aria="Jour affiché"
          valeur={jour}
          onChange={(v) => setChoix(v)}
          options={[
            { valeur: aujourdhui, libelle: "Aujourd'hui" },
            { valeur: demain, libelle: 'Demain' },
          ]}
        />
      </header>

      {/*
        Sans cadre ni titre, délibérément. Ce bloc n'est pas une section de
        contenu de plus : c'est un élément de réassurance, posé juste sous la
        date, qu'on doit saisir sans le lire.

        LA COURBE EST UNE TOILE DE FOND, PAS UNE COLONNE. Posée à côté des
        chiffres, elle se lisait comme un graphique collé sur la page — un
        rectangle sombre avec ses propres bords. Elle passe désormais derrière
        tout le bloc, ancrée sur sa ligne de base, éteinte par un masque à
        gauche (là où les chiffres se posent) et en fondu sur sa naissance.
        Les chiffres, la légende et la note flottent dessus : une seule
        surface, aucun bord.
      */}
      {historique.jugees > 0 && (
        <section className="relative animate-fade-up" aria-label="Nos résultats récents">
          <div
            className="masque-courbe pointer-events-none absolute inset-x-0 bottom-0 sm:-inset-x-2"
            aria-hidden
          >
            <CourbeReussite points={serie} />
          </div>

          <div className="relative flex gap-8 sm:gap-10 pt-1 sm:pt-2">
            <div>
              <p className="num texte-accent font-display font-bold tracking-tight text-[1.875rem] sm:text-[2.125rem] leading-none">
                <PourcentAnime valeur={historique.tauxVictoire} />
              </p>
              <p className="flex items-center gap-1.5 text-[0.6875rem] text-faint mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" aria-hidden />
                victoires
              </p>
            </div>
            <div>
              <p className="num text-info font-display font-bold tracking-tight text-[1.875rem] sm:text-[2.125rem] leading-none">
                <PourcentAnime valeur={historique.tauxPlace} />
              </p>
              <p className="flex items-center gap-1.5 text-[0.6875rem] text-faint mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-info shrink-0" aria-hidden />
                dans les trois
              </p>
            </div>
          </div>

          {/* L'espace que la courbe habite : sans contenu propre, il donne à la
              toile de fond sa hauteur sous les chiffres au lieu de la laisser
              se glisser derrière eux et rendre la légende illisible. */}
          <div className="h-24 sm:h-20" aria-hidden />

          <p className="relative num text-[0.6875rem] text-faint leading-relaxed">
            cumul sur {historique.jugees} courses jugées, {FENETRE_JOURS} derniers jours
            {historique.jugees < SEUIL_ECHANTILLON && (
              <> — échantillon encore court, les taux bougent d'une semaine à l'autre</>
            )}
            <span className="opacity-50"> · </span>
            <Link to="/resultats" className="link">
              le détail et son incertitude
            </Link>
          </p>
        </section>
      )}

      {conviction && (
        <section className="card-accent p-5 sm:p-7 animate-fade-up">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-accent" aria-hidden />
            <span className="label !text-accent">Notre plus forte conviction</span>
          </div>

          <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="font-display font-semibold text-3xl leading-tight">
                <span className="num text-2xl text-muted mr-2">{conviction.partant.numero}</span>
                {conviction.partant.nom}
              </p>
              <p className="num text-sm text-muted mt-2.5">
                {formatHippodrome(conviction.course.hippodrome)}
                <span className="text-faint"> · </span>
                Course {conviction.course.numero}
                {conviction.partant.cote != null && (
                  <>
                    <span className="text-faint"> · </span>
                    cote {formatCote(conviction.partant.cote)}
                  </>
                )}
              </p>
              {conviction.course.courue && (
                <p className="flex items-center gap-2 mt-3 text-sm text-muted">
                  Arrivée <EtiquetteArrivee place={conviction.partant.arrivee} />
                </p>
              )}
            </div>

            <div className="sm:text-right shrink-0">
              <p className="label">Probabilité de victoire</p>
              <p className="texte-accent num font-display font-bold tracking-tight text-[3.25rem] leading-none mt-1.5">
                <PourcentAnime valeur={conviction.partant.pWin} />
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link
              className="btn-accent"
              to={`/courses/${conviction.course.date}/${encodeURIComponent(conviction.course.hippodrome)}/${conviction.course.numero}`}
            >
              Voir la course
              <ArrowRight size={16} aria-hidden />
            </Link>
            <p className="text-xs text-muted leading-relaxed max-w-sm">
              Notre première conviction du jour, pas une certitude : la majorité de nos favoris ne
              gagnent pas leur course.
            </p>
          </div>
        </section>
      )}

      {volume.courses > 0 && (
        <section
          className="card-nest grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0
                     divide-white/[0.07] overflow-hidden"
          aria-label={`Volume analysé ${suffixe}`}
        >
          {[
            { valeur: volume.reunions, libelle: volume.reunions > 1 ? 'réunions' : 'réunion' },
            { valeur: volume.courses, libelle: 'courses analysées' },
            { valeur: volume.partants, libelle: 'partants évalués' },
            {
              valeur: volume.cotees,
              libelle: 'courses cotées',
              /* Deux tiers des réunions ne sont pas PMU : sans cette précision,
                 un écart entre « courses » et « courses cotées » passerait pour
                 une donnée manquante. */
              note: volume.cotees < volume.courses ? 'les autres sont hors PMU' : undefined,
            },
          ].map((s) => (
            <div key={s.libelle} className="px-4 py-4 first:border-l-0 sm:first:border-l-0">
              <p className="num text-2xl font-semibold leading-none">{s.valeur}</p>
              <p className="text-xs text-faint mt-1.5">{s.libelle}</p>
              {s.note && <p className="text-[0.6875rem] text-faint/70 mt-0.5">{s.note}</p>}
            </div>
          ))}
        </section>
      )}

      <section>
        <h2 className="text-[0.95rem] font-semibold tracking-tight mb-4">Réunions {suffixe}</h2>
        {reunionsDuJour.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {reunionsDuJour.map((r) => (
              <CarteReunion key={r.cle} reunion={r} />
            ))}
          </div>
        ) : (
          <div className="card">
            <EtatVide
              icone={<CalendarDays size={20} aria-hidden />}
              titre={
                jour === aujourdhui
                  ? "Aucune réunion publiée aujourd'hui"
                  : 'Les pronostics de demain ne sont pas encore là'
              }
              texte="Une fois les partants définitifs connus, le moteur passe chaque course en revue et publie ses probabilités."
              action={
                <div className="flex flex-col items-center gap-4">
                  {/* L'attente est une promesse datée, pas une excuse : le
                      rendez-vous de 19 h est LE rituel du produit. */}
                  <span className="chip-accent !py-2 !px-3.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-dot"
                      aria-hidden
                    />
                    publication ce soir vers 19&nbsp;h
                  </span>
                  <Link className="btn-glass" to="/reunions">
                    Parcourir les réunions
                  </Link>
                </div>
              }
            />
          </div>
        )}
      </section>

      {selections.length > 0 && (
        // Pas de padding sur la carte : les lignes de <LigneCourse> portent la
        // leur et doivent toucher les bords pour que la zone cliquable couvre
        // toute la largeur au pouce.
        <section className="card overflow-hidden">
          <header className="flex items-baseline justify-between gap-3 px-4 sm:px-5 py-4">
            <h2 className="text-[0.95rem] font-semibold tracking-tight">Nos sélections {suffixe}</h2>
            <span className="num text-xs text-faint">
              {selections.length} sur {avecFavori.length}
            </span>
          </header>

          <div className="hairline-y border-t border-white/[0.07]">
            {selections.map((c, i) => (
              <div key={c.cle} className="animate-fade-up" style={{ animationDelay: `${i * 35}ms` }}>
                <LigneCourse course={c} />
              </div>
            ))}
          </div>

          {reste > 0 && reunionLaPlusFournie && (
            <div className="px-4 sm:px-5 py-3.5 border-t border-white/[0.07]">
              <Link
                className="link text-sm"
                to={`/reunions/${reunionLaPlusFournie.date}/${encodeURIComponent(reunionLaPlusFournie.hippodrome)}`}
              >
                {reste} autre{reste > 1 ? 's' : ''} course{reste > 1 ? 's' : ''} — voir{' '}
                {formatHippodrome(reunionLaPlusFournie.hippodrome)}
              </Link>
            </div>
          )}
        </section>
      )}

      {ecarts.length > 0 && (
        <Carte>
          <EnTeteCarte
            titre={
              <span className="inline-flex items-center gap-2">
                Écarts au marché
                <Aide>
                  La probabilité du marché est déduite des cotes, marge de l'opérateur retirée. Un
                  écart signale un désaccord entre notre modèle et le consensus du public, jamais
                  une garantie.
                </Aide>
              </span>
            }
            aide="Les partants sur lesquels nous sommes nettement plus optimistes que les cotes."
          />

          {/*
            Deux colonnes dès le format tablette. En une seule, chaque écart
            s'étirait sur toute la largeur pour porter trois nombres courts :
            la carte paraissait vide alors qu'elle contenait tout ce qu'il faut.
          */}
          <div className="grid gap-3 sm:grid-cols-2">
            {ecarts.map((e, i) => (
              <ArticleEcart key={`${e.course.cle}|${e.partant.numero}`} ecart={e} rang={i} />
            ))}
          </div>

          <p className="text-xs text-faint leading-relaxed mt-4">
            La barre grise est la probabilité que la cote implique une fois la marge de
            l'opérateur retirée ; la barre verte est la nôtre. L'écart se joue là — mais rien ne
            dit a priori lequel des deux se trompe.
          </p>
        </Carte>
      )}

      {hier && (
        <Carte>
          <EnTeteCarte
            titre="Hier"
            aide={`${hier.bilan.jugees} course${hier.bilan.jugees > 1 ? 's' : ''} jugée${hier.bilan.jugees > 1 ? 's' : ''} le ${dateCourte(hier.date)}.`}
            action={
              <Link
                to="/resultats"
                className="btn-ghost !px-0 sm:!px-4"
                aria-label="Voir tous nos résultats"
              >
                Tout l'historique
                <ArrowRight size={16} aria-hidden />
              </Link>
            }
          />

          <div className="grid grid-cols-3 gap-3">
            <div className="card-nest p-3.5">
              <p className="num text-2xl font-semibold leading-none">{hier.bilan.gagnees}</p>
              <p className="text-xs text-faint mt-1.5">
                gagnée{hier.bilan.gagnees > 1 ? 's' : ''} sur {hier.bilan.jugees}
              </p>
            </div>
            <div className="card-nest p-3.5">
              <p className="num texte-accent text-2xl font-semibold leading-none">
                {pourcent(hier.bilan.tauxVictoire)}
              </p>
              <p className="text-xs text-faint mt-1.5">de victoires</p>
            </div>
            <div className="card-nest p-3.5">
              <p className="num text-info text-2xl font-semibold leading-none">
                {pourcent(hier.bilan.tauxPlace)}
              </p>
              <p className="text-xs text-faint mt-1.5">dans les trois</p>
            </div>
          </div>

          {hier.gagnantes.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {hier.gagnantes.slice(0, 6).map((c) => (
                <li key={c.cle}>
                  <Link
                    to={`/courses/${c.date}/${encodeURIComponent(c.hippodrome)}/${c.numero}`}
                    className="tap chip-win !py-2.5 hover:bg-win/25 transition-colors"
                  >
                    <span className="num">{c.favori?.numero}</span>
                    {c.favori?.nom}
                    {c.favori?.cote != null && (
                      <span className="num opacity-70">cote {formatCote(c.favori.cote)}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            /* Une journée sans gagnant se dit. La taire ferait de cette carte
               une vitrine qui ne s'allume que les bons jours. */
            <p className="text-xs text-muted leading-relaxed mt-4">
              Aucun de nos premiers choix n'a gagné hier. Sur une journée d'une quinzaine de
              courses, cela arrive régulièrement sans rien dire du modèle : c'est le cumul, visible
              en haut de page, qui compte.
            </p>
          )}
        </Carte>
      )}
    </div>
  )
}
