// LE DERNIER RELEVÉ DE COTES, AU DÉPART (migration 041 de l'outil interne).
//
// Appelée CHAQUE MINUTE par pg_cron (job `crosswell-cotes-depart`), avec
// l'en-tête `x-crosswell-cron` (même secret que notifications-push). Elle
// demande à la base les courses qui partent dans les 2 minutes et dont la
// dernière cote date de plus de 3 minutes avant le départ, lit leurs partants
// au PMU (`dernierRapportDirect`, la cote que relève aussi monitoring_odds.py)
// et les écrit : `cote_avant` et un point de la trajectoire `cotes_jour`.
//
// Pourquoi ici et pas dans GitHub Actions : un run par heure de départ
// coûterait ~1 000 minutes d'Actions par mois (voir l'en-tête de la 041).
//
// L'appariement des hippodromes avec le PMU n'est PAS refait ici : la base
// rend le numéro de réunion que monitoring_odds.py a trouvé et rangé dans
// `pmu_reunions_jour`.

import { createClient } from 'npm:@supabase/supabase-js@2.45.0'

const env = (n: string) => Deno.env.get(n) ?? ''
const SECRET = env('NOTIFS_CRON_SECRET')
const PMU = 'https://online.turfinfo.api.pmu.fr/rest/client/61'

const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
})

function egal(a: string, b: string): boolean {
  if (!a || a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

const json = (corps: unknown, statut = 200) =>
  new Response(JSON.stringify(corps), { status: statut, headers: { 'Content-Type': 'application/json' } })

interface Course {
  reunion_date: string
  hippodrome: string
  course_num: number
  reunion_num: number
  heure_depart: string
}

interface Participant {
  numPmu?: number
  statut?: string
  dernierRapportDirect?: { rapport?: number }
}

/** « 2026-11-08 » → « 08112026 », le format du PMU. */
const jourPmu = (iso: string) => `${iso.slice(8, 10)}${iso.slice(5, 7)}${iso.slice(0, 4)}`

async function relever(c: Course): Promise<Record<string, unknown>> {
  const url = `${PMU}/programme/${jourPmu(c.reunion_date)}/R${c.reunion_num}/C${c.course_num}/participants`
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' }, signal: AbortSignal.timeout(15_000) })
  if (!r.ok) return { course: `${c.hippodrome} C${c.course_num}`, erreur: `PMU ${r.status}` }
  const corps = (await r.json()) as { participants?: Participant[] }
  // Un non-partant ne dépose plus de cote (même règle que monitoring_odds.py),
  // et une cote absente n'efface jamais un relevé valide.
  const cotes: Record<string, number> = {}
  for (const p of corps.participants ?? []) {
    const rap = p.dernierRapportDirect?.rapport
    if (p.numPmu && rap && (p.statut ?? '').toUpperCase() !== 'NON_PARTANT') cotes[String(p.numPmu)] = Number(rap)
  }
  if (!Object.keys(cotes).length) return { course: `${c.hippodrome} C${c.course_num}`, ecrites: 0, motif: 'aucune cote au PMU' }
  const { data, error } = await admin.rpc('crosswell_ecrire_cotes_depart', {
    p_date: c.reunion_date,
    p_hippodrome: c.hippodrome,
    p_course: c.course_num,
    p_cotes: cotes,
  })
  if (error) throw error
  return { course: `${c.hippodrome} C${c.course_num}`, depart: c.heure_depart, ecrites: data }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ message: 'Méthode non permise.' }, 405)
  if (!SECRET) return json({ message: 'Configuration du serveur incomplète (NOTIFS_CRON_SECRET).' }, 503)
  if (!egal(req.headers.get('x-crosswell-cron') ?? '', SECRET)) return json({ message: 'Refusé.' }, 401)
  try {
    const { data, error } = await admin.rpc('crosswell_cotes_depart_a_relever')
    if (error) throw error
    const courses = (data ?? []) as Course[]
    const releves = await Promise.all(courses.map((c) => relever(c).catch((e) => ({ course: `${c.hippodrome} C${c.course_num}`, erreur: String(e) }))))
    return json({ releves })
  } catch (e) {
    console.error('cotes-depart', e)
    return json({ message: e instanceof Error ? e.message : 'Erreur.' }, 500)
  }
})
