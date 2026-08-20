#!/usr/bin/env node
/**
 * The Daily Bread's lead image — GENERATED daily (SA-114 / F-158).
 *
 * Founder, 2026-08-20: "the main image for the Daily Bread needs to be
 * created from /imagen not one onfile." Supersedes the library-pick
 * resolver for this one slot: every edition gets a fresh plate,
 * representing the day's verse, in the site's locked riso style.
 *
 *   1. `claude -p` (subscription) writes a SUBJECT line from the day's
 *      reading (title, teaser, scripture) — one concrete scene, no
 *      abstractions.
 *   2. `codex exec` (built-in image generation, subscription) draws it
 *      landscape 3:2 with the founder-approved poster anchors attached —
 *      cobalt/cream duotone, Ben-Day halftone, one crimson accent, full
 *      bleed, NO TEXT.
 *   3. Upload to Storage (edition-assets/lead-art/) + manifest
 *      (pipeline/lead-art.json). The page reads the manifest; missing day
 *      = fall back to the Vasari pick, then series art. No deploy.
 *
 * Usage: node scripts/edition/generate-lead-art.mjs [--date=YYYY-MM-DD] [--subject="..."] [--force]
 */
import { execFileSync, execSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir, platform } from 'node:os'
import path from 'node:path'

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_ || !KEY) throw new Error('Supabase env missing')
const CODEX = process.env.CODEX_BIN || 'codex'
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }
const sb = (p) => `${URL_}${p}`

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/)
    return m ? [m[1], m[2] ?? true] : [a, true]
  }),
)
const date =
  typeof args.date === 'string'
    ? args.date
    : new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)

// manifest: skip if the day already has a plate
let manifest = {}
{
  const r = await fetch(sb('/storage/v1/object/edition-assets/pipeline/lead-art.json'), { headers: H })
  if (r.ok) manifest = await r.json()
}
if (manifest[date] && !args.force) {
  console.log(`[lead-art] ${date} already has a plate — skipping (--force to redraw)`)
  process.exit(0)
}

// the day's reading, from the same rotation the page uses (via tsx)
// codex exec only runs in a trusted project dir — work happens inside the
// repo's gitignored .cache, never a bare tmpdir.
mkdirSync('.cache/lead-art', { recursive: true })
const work = mkdtempSync(path.resolve('.cache/lead-art/run-'))
const infoPath = path.join(work, 'day.json')
execFileSync('npx', ['tsx', '-e', `
import { writeFileSync } from 'node:fs'
import { pickTodaySlug, findSeriesForSlug } from './src/lib/today-devotional'
import { DEVOTIONAL_TEASERS } from './src/data/devotional-teasers'
const now = new Date('${date}T12:00:00Z')
const slug = pickTodaySlug(now)
const meta = findSeriesForSlug(slug)
writeFileSync('${infoPath}', JSON.stringify({
  title: meta?.day.title ?? '',
  teaser: DEVOTIONAL_TEASERS[slug] ?? meta?.series.question ?? '',
  scripture: meta?.series.framework?.split(' - ')[0] ?? '',
}))
`], { stdio: 'pipe', timeout: 120_000 })
const day = JSON.parse(readFileSync(infoPath, 'utf8'))

// 1 — the subject line
let subject = typeof args.subject === 'string' ? args.subject : ''
if (!subject) {
  subject = execFileSync('claude', ['-p', `You write image subjects for a riso screen-print devotional newspaper. Today's reading: "${day.title}" — ${day.teaser} (${day.scripture}). Write ONE concrete visual scene representing this verse for the paper's lead plate: a single subject, physical and biblical or everyday-modern, composable in one wide frame. Name what is literally in the frame — figures, objects, light, setting. No abstractions, no symbolism talk, no text in the image. Answer with the scene sentence ONLY.`, '--output-format', 'text'], {
    encoding: 'utf8', timeout: 180_000, maxBuffer: 1024 * 1024,
  }).trim().split('\n').pop().trim()
}
if (!subject || subject.length < 20) throw new Error(`bad subject: ${subject}`)
console.log(`[lead-art] ${date} subject: ${subject}`)

// 2 — draw with the locked style anchors
const anchors = [
  path.resolve('public/images/site/series/prayer-of-jabez.webp'),
  path.resolve('public/images/site/series/the-harvest.webp'),
]
for (const a of anchors) if (!existsSync(a)) throw new Error(`anchor missing: ${a}`)
const outPng = path.join(work, 'lead.png')
const prompt = `The two attached images are the LOCKED house style of the Euangelion newspaper: risograph screen-print duotone — deep cobalt/ultramarine ink on warm cream paper, heavy Ben-Day halftone dots in every tone (no grays — every shadow is dot density), ONE sparing crimson-red spot accent, slight misregistration, paper grain, high horizon, generous negative space, single subject composition. Match that style EXACTLY.

Use your built-in image generation tool to generate ONE image saved to ${outPng} . Landscape 3:2, FULL BLEED edge to edge, NO TEXT anywhere in the image.

SUBJECT: ${subject}

Compose for a WIDE newspaper lead plate: the subject off-center or centered per the scene, room for the sky/ground to breathe. After generating, verify the file exists and report its dimensions.`
// NOTE: -i is variadic, so the prompt must ride STDIN — a positional
// prompt after -i gets swallowed as an image path.
execFileSync(CODEX, ['exec', '-s', 'workspace-write', '-i', anchors[0], '-i', anchors[1]], {
  encoding: 'utf8', timeout: 600_000, maxBuffer: 10 * 1024 * 1024, cwd: work,
  input: prompt,
})
if (!existsSync(outPng)) throw new Error('codex reported success but the png is missing')

// 3 — encode + upload + manifest
const jpg = path.join(work, `daily-bread-${date}.jpg`)
if (platform() === 'darwin') {
  execSync(`sips -s format jpeg -s formatOptions 86 "${outPng}" --out "${jpg}"`, { stdio: 'pipe' })
} else {
  execSync(`convert "${outPng}" -quality 86 "${jpg}"`, { stdio: 'pipe' })
}
const dims = execSync(
  platform() === 'darwin'
    ? `sips -g pixelWidth -g pixelHeight "${jpg}" | awk '/pixel/{print $2}'`
    : `identify -format "%w\\n%h" "${jpg}"`,
  { encoding: 'utf8' },
).trim().split(/\s+/).map(Number)
const [width, height] = dims

const key = `lead-art/daily-bread-${date}.jpg`
const up = await fetch(sb(`/storage/v1/object/edition-assets/${key}`), {
  method: 'POST',
  headers: { ...H, 'Content-Type': 'image/jpeg', 'x-upsert': 'true' },
  body: readFileSync(jpg),
})
if (!up.ok) throw new Error(`upload failed: ${up.status}`)

manifest[date] = {
  src: sb(`/storage/v1/object/public/edition-assets/${key}`),
  width,
  height,
  subject,
  alt: subject,
}
const mw = await fetch(sb('/storage/v1/object/edition-assets/pipeline/lead-art.json'), {
  method: 'POST',
  headers: { ...H, 'Content-Type': 'application/json', 'x-upsert': 'true' },
  body: JSON.stringify(manifest, null, 1),
})
if (!mw.ok) throw new Error(`manifest write failed: ${mw.status}`)
console.log(`[lead-art] ${date} installed (${width}x${height})`)
