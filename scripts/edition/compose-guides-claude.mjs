#!/usr/bin/env node
/**
 * How to Read — three NEW articles per edition day (SA-114 / F-158).
 *
 * Founder: "How to read should be something new every day, so new blog
 * articles need to be written for them as well."
 *
 * Per day: `claude -p` (founder's subscription) writes three short guide
 * articles — kicker, title, standfirst, 3-4 steps, and a REAL article body
 * (4-7 paragraphs) — steering away from every topic in the Storage log.
 * Plates come from the existing guide image bank (manifest-first: no
 * generation for these). Rows land as DRAFTS (invented voice → the
 * founder's queue) and print at their edition's 7am flip.
 *
 * Usage: node scripts/edition/compose-guides-claude.mjs --days=N [--from=YYYY-MM-DD]
 */
import { execFileSync } from 'node:child_process'

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_ || !KEY) throw new Error('Supabase env missing')
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const sb = (p) => `${URL_}${p}`

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/)
    return m ? [m[1], m[2] ?? true] : [a, true]
  }),
)
const days = Number(args.days ?? 1)
const from =
  typeof args.from === 'string' && args.from
    ? args.from
    : new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)

/** The bank's plates, reused in rotation — no image generation here. */
const PLATES = [
  { image: '/images/edition/guide-whole-book.webp', alt: 'A hand holding an open scroll' },
  { image: '/images/edition/guide-who-speaks.webp', alt: 'Two travellers on a road, joined by a stranger' },
  { image: '/images/edition/guide-scripture-interprets.webp', alt: 'Two stone tablets' },
]

let log = []
{
  const r = await fetch(sb('/storage/v1/object/edition-assets/pipeline/guides-log.json'), { headers: H })
  if (r.ok) log = await r.json()
}

const KICKERS = ['Method', 'Practice', 'Tools', 'Getting started']

function validate(set) {
  if (!Array.isArray(set) || set.length !== 3) return 'need exactly 3'
  for (const g of set) {
    if (!KICKERS.includes(g.kicker)) return `kicker ${g.kicker}`
    for (const f of ['title', 'standfirst', 'minutes']) {
      if (typeof g[f] !== 'string' || !g[f].trim()) return `missing ${f}`
    }
    if (!Array.isArray(g.steps) || g.steps.length < 3 || g.steps.length > 5) return 'steps 3-5'
    if (!Array.isArray(g.body) || g.body.length < 4 || g.body.length > 8) return 'body 4-8 paragraphs'
    if (g.body.join(' ').split(/\s+/).length < 250) return 'body too thin'
  }
  return null
}

for (let d = 0; d < days; d++) {
  const date = new Date(new Date(`${from}T00:00:00Z`).getTime() + d * 86_400_000)
    .toISOString()
    .slice(0, 10)

  const existing = await fetch(
    sb(`/rest/v1/edition_items?kind=eq.guide&publish_date=eq.${date}&select=id`),
    { headers: H },
  ).then((r) => r.json())
  if (existing.length > 0 && !args.force) {
    console.log(`[guides] ${date} already has ${existing.length} — skipping`)
    continue
  }

  const prompt = `You write the "How to read" column for The Daily Bread — Euangelion's daily paper (Christian devotional, sacred-minimalist, never preachy, treats the reader as intelligent). Write THREE fresh, practical, genuinely useful short articles about reading and studying the Bible for the ${date} edition.

ALREADY-COVERED topics (do NOT repeat or closely echo):
${log.map((e) => `- ${e.title}`).join('\n') || '- (none yet)'}

Each article: a specific, practical angle (a method, a habit, a tool, a beginner's on-ramp — think: reading one book whole, lectio divina, how to use a concordance, reading the Psalms aloud, what to do with a text that offends you, reading with children, memorizing without gimmicks). Concrete over abstract. No therapy-speak, no listicle voice, no "unlock/transform" language.

Answer ONLY this JSON (no fences): an array of EXACTLY 3 objects:
[{"kicker":"Method|Practice|Tools|Getting started","title":"...","standfirst":"one italic-worthy sentence","steps":["3-5 short imperative steps"],"minutes":"N MIN","body":["4-7 substantial paragraphs of the actual article — 300-500 words total, written plainly and warmly"]}]`

  let set = null
  for (let attempt = 0; attempt < 2 && !set; attempt++) {
    const raw = execFileSync('claude', ['-p', prompt, '--output-format', 'text'], {
      encoding: 'utf8',
      timeout: 420_000,
      maxBuffer: 10 * 1024 * 1024,
    }).trim()
    try {
      const candidate = JSON.parse(raw.replace(/^```json?\n?|```$/g, '').trim())
      const bad = validate(candidate)
      if (bad) throw new Error(bad)
      set = candidate
    } catch (e) {
      console.error(`[guides] ${date} attempt ${attempt + 1} invalid: ${e.message}`)
    }
  }
  if (!set) throw new Error(`[guides] ${date}: no valid set after retries`)

  const rows = set.map((g, i) => ({
    kind: 'guide',
    publish_date: date,
    slot: i,
    status: 'draft',
    payload: { ...g, ...PLATES[i % PLATES.length] },
  }))
  const ins = await fetch(sb('/rest/v1/edition_items?on_conflict=kind,publish_date,slot'), {
    method: 'POST',
    headers: { ...H, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify(rows),
  })
  if (!ins.ok) throw new Error(`[guides] upsert failed: ${ins.status} ${await ins.text()}`)

  log.push(...set.map((g) => ({ date, title: g.title, kicker: g.kicker })))
  const lg = await fetch(sb('/storage/v1/object/edition-assets/pipeline/guides-log.json'), {
    method: 'POST',
    headers: { ...H, 'Content-Type': 'application/json', 'x-upsert': 'true' },
    body: JSON.stringify(log, null, 2),
  })
  if (!lg.ok) throw new Error(`[guides] log write failed: ${lg.status}`)
  console.log(`[guides] ${date}: 3 drafts — ${set.map((g) => g.title).join(' · ')}`)
}
