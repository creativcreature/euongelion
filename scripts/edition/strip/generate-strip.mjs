#!/usr/bin/env node
/**
 * Echo & Dust — the daily strip generator (SA-114 / F-158).
 *
 * Founder: "we need more scenarios for the comic strip every day a new
 * strip." One run = one strip for one edition date:
 *
 *   1. WRITE FIRST (canon law): `claude -p` (founder's subscription) writes
 *      the strip as strict JSON — title, topic, Dust's hat, three panels,
 *      balloons <=15 words — steering AWAY from every topic in the log.
 *   2. DRAW: `codex exec` (built-in image generation, founder's ChatGPT
 *      subscription) with the LOCKED character sheet + strip No. 1 attached
 *      as anchors. Nano Banana and Higgsfield are banned here.
 *   3. INSPECT: `claude -p` reads the render and verifies lettering,
 *      balloon attribution, and character fidelity. One redraw on FAIL.
 *   4. INSTALL: crop, encode, upload to Supabase Storage
 *      (edition-assets/strip/), upsert the DRAFT row — the founder's
 *      NEEDS YOUR EYE frame in the preview stays the gate; unrejected
 *      drafts print at the 7am flip.
 *
 * The scenario log lives in Storage (pipeline/strip-log.json) so CI needs
 * no commits. Fails LOUDLY at every step — a paper with a silently missing
 * strip is the failure mode this repo exists to prevent (Dev Rule 1).
 */
import { execFileSync, execSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir, platform } from 'node:os'
import path from 'node:path'

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_ || !KEY) throw new Error('Supabase env missing (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)')
const CODEX = process.env.CODEX_BIN || 'codex'

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
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`bad --date: ${date}`)

const sb = (p) => `${URL_}${p}`
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }

// 0 — skip if this date already has a strip (idempotent re-runs)
{
  const r = await fetch(
    sb(`/rest/v1/edition_items?kind=eq.strip&publish_date=eq.${date}&select=id,status`),
    { headers: H },
  )
  const rows = await r.json()
  if (rows.length > 0 && !args.force) {
    console.log(`[strip] ${date} already has a strip (${rows[0].status}) — skipping (use --force to redraw)`)
    process.exit(0)
  }
}

// 1 — the log (topics already used), from Storage
let log = []
{
  const r = await fetch(sb('/storage/v1/object/edition-assets/pipeline/strip-log.json'), { headers: H })
  if (r.ok) log = await r.json()
}
const nextNumber = (log.at(-1)?.n ?? 3) + 1
const canon = readFileSync('content/strip-reference/ECHO-AND-DUST-CANON.md', 'utf8')

// 2 — WRITE the strip (subscription)
const writerPrompt = `You are the writer of ECHO & DUST, The Daily Bread's comic strip. The full canon follows — obey it exactly, especially the writing law (3-15 words per balloon, no preaching, the last panel never summarizes) and the characters' voices.

${canon}

ALREADY-USED topics/titles (do NOT reuse or closely echo any):
${log.map((e) => `- ${e.title} (${e.topic})`).join('\n') || '- The Bakery Question (daily provision)\n- The Pocket God (prayer vs the phone)\n- The Quarter (luck vs providence)'}

Write ONE new strip for the ${date} edition. Find a SMALL modern observation (the enormous idea sneaks in). Vary the setting (not another living room or cafe if recent strips used one). Decide Dust's hat for today.

Answer with ONLY this JSON (no markdown fence, no commentary):
{"title":"...","topic":"...","dustHat":"...","panels":[{"scene":"one-sentence visual description naming character placement and expressions","balloons":[{"speaker":"TEDDY|ECHO|DUST","text":"..."}]},{...},{...}]}`

function runClaude(prompt) {
  return execFileSync('claude', ['-p', prompt, '--output-format', 'text'], {
    encoding: 'utf8',
    timeout: 300_000,
    maxBuffer: 10 * 1024 * 1024,
  }).trim()
}

function validateScript(s) {
  if (!s || typeof s.title !== 'string' || !Array.isArray(s.panels) || s.panels.length !== 3)
    return 'shape'
  for (const p of s.panels) {
    if (typeof p.scene !== 'string' || !Array.isArray(p.balloons) || p.balloons.length === 0)
      return 'panel shape'
    for (const b of p.balloons) {
      if (!['TEDDY', 'ECHO', 'DUST'].includes(b.speaker)) return `speaker ${b.speaker}`
      const words = b.text.trim().split(/\s+/).length
      if (words < 1 || words > 15) return `balloon length ${words}`
    }
  }
  return null
}

let script = null
for (let attempt = 0; attempt < 2 && !script; attempt++) {
  const raw = runClaude(writerPrompt)
  try {
    const candidate = JSON.parse(raw.replace(/^```json?\n?|```$/g, '').trim())
    const bad = validateScript(candidate)
    if (bad) throw new Error(bad)
    script = candidate
  } catch (e) {
    console.error(`[strip] writer attempt ${attempt + 1} invalid: ${e.message}`)
  }
}
if (!script) throw new Error('the writer could not produce a valid strip script')
console.log(`[strip] No. ${nextNumber}: "${script.title}" (${script.topic}) — Dust wears ${script.dustHat}`)

// 3 — DRAW via codex (anchors mandatory)
const work = mkdtempSync(path.join(tmpdir(), 'echo-dust-'))
const outPng = path.join(work, 'strip.png')
const sheet = 'content/strip-reference/workshop/character-sheet-v3.png'
const styleAnchor = 'content/strip-reference/workshop/strip-001-v4.png'
if (!existsSync(sheet) || !existsSync(styleAnchor)) throw new Error('anchor images missing from the checkout')

const panelText = script.panels
  .map(
    (p, i) =>
      `PANEL ${i + 1} — ${p.scene} ${p.balloons
        .map((b) => `${b.speaker}'s balloon, tail pointing UNMISTAKABLY at ${b.speaker}: "${b.text}"`)
        .join(' ')}`,
  )
  .join('\n\n')

const drawPrompt = `The first attached image is the LOCKED character model sheet for "ECHO & DUST"; the second is an approved strip — match its exact style, palette (riso duotone: cobalt ink on warm cream paper, halftone shading, crimson ONLY for Echo's heart print), line weight, hand lettering, and character designs. Modern-day setting. Do not redesign anyone. Today Dust wears: ${script.dustHat} CONTINUITY LAW: every character present in the scene appears in EVERY panel — same relative positions, wardrobe, and environment across all three, unless a scripted beat moves them.`

Use your built-in image generation tool to generate ONE image saved to ${outPng} . Landscape 3:2, a complete 3-panel comic strip across the middle of the canvas: three equal panels, thin cobalt gutters and border, minimal modern backgrounds. Hand-lettered cobalt balloons that never cover faces.

${panelText}

The dialogue must be lettered EXACTLY as written, correctly spelled. Verify the file exists and report its dimensions.`

function draw() {
  execFileSync(CODEX, ['exec', '-s', 'workspace-write', '-i', sheet, '-i', styleAnchor, drawPrompt], {
    encoding: 'utf8',
    timeout: 600_000,
    maxBuffer: 10 * 1024 * 1024,
    cwd: work,
  })
  if (!existsSync(outPng)) throw new Error('codex reported success but the png is missing')
}

// 4 — INSPECT via claude (vision through the Read tool)
function inspect() {
  const verdict = runClaude(
    `Read the image file at ${outPng} and inspect this comic strip render against its script. Script: ${JSON.stringify(script.panels)}. Check: (1) every balloon's text matches the script EXACTLY with correct spelling; (2) each balloon's tail points at its speaker (TEDDY the young man, ECHO the tall hooded faceless figure, DUST the small galaxy fellow); (3) three clean panels. Answer with EXACTLY one line: PASS, or FAIL: <short reason>.`,
  )
  return verdict
}

draw()
let verdict = inspect()
console.log(`[strip] inspection: ${verdict.slice(0, 140)}`)
if (!/^PASS/m.test(verdict)) {
  console.error('[strip] FAILED inspection — one redraw')
  draw()
  verdict = inspect()
  console.log(`[strip] inspection 2: ${verdict.slice(0, 140)}`)
  if (!/^PASS/m.test(verdict)) throw new Error(`strip failed inspection twice: ${verdict.slice(0, 300)}`)
}

// 5 — crop + encode (imagemagick on linux, sips on darwin)
const cropPng = path.join(work, 'crop.png')
const jpg = path.join(work, `echo-dust-${String(nextNumber).padStart(3, '0')}.jpg`)
if (platform() === 'darwin') {
  execSync(`sips -c 745 1512 --cropOffset 140 12 "${outPng}" --out "${cropPng}"`, { stdio: 'pipe' })
  execSync(`sips -s format jpeg -s formatOptions 85 "${cropPng}" --out "${jpg}"`, { stdio: 'pipe' })
} else {
  execSync(`convert "${outPng}" -crop 1512x745+12+140 +repage -quality 85 "${jpg}"`, { stdio: 'pipe' })
}
const dims = execSync(
  platform() === 'darwin'
    ? `sips -g pixelWidth -g pixelHeight "${jpg}" | awk '/pixel/{print $2}'`
    : `identify -format "%w\\n%h" "${jpg}"`,
  { encoding: 'utf8' },
)
  .trim()
  .split(/\s+/)
  .map(Number)
const [width, height] = dims
if (!width || !height) throw new Error('could not measure the encoded strip')

// 6 — upload + draft row
const key = `strip/echo-dust-${String(nextNumber).padStart(3, '0')}.jpg`
const up = await fetch(sb(`/storage/v1/object/edition-assets/${key}`), {
  method: 'POST',
  headers: { ...H, 'Content-Type': 'image/jpeg', 'x-upsert': 'true' },
  body: readFileSync(jpg),
})
if (!up.ok) throw new Error(`storage upload failed: ${up.status} ${await up.text()}`)

const alt = script.panels
  .map((p) => p.balloons.map((b) => `${b.speaker[0]}${b.speaker.slice(1).toLowerCase()}: ${b.text}`).join(' '))
  .join(' ')
const row = {
  kind: 'strip',
  publish_date: date,
  slot: 0,
  status: 'draft',
  payload: {
    image: sb(`/storage/v1/object/public/edition-assets/${key}`),
    alt: `Echo & Dust: ${alt}`,
    caption: `Echo & Dust — No. ${nextNumber}: ${script.title}`,
    panelId: `echo-dust-${String(nextNumber).padStart(3, '0')}`,
    width,
    height,
  },
}
const ins = await fetch(sb('/rest/v1/edition_items?on_conflict=kind,publish_date,slot'), {
  method: 'POST',
  headers: { ...H, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
  body: JSON.stringify([row]),
})
if (!ins.ok) throw new Error(`row upsert failed: ${ins.status} ${await ins.text()}`)

// 7 — log the scenario
log.push({ n: nextNumber, date, title: script.title, topic: script.topic, hat: script.dustHat })
const lg = await fetch(sb('/storage/v1/object/edition-assets/pipeline/strip-log.json'), {
  method: 'POST',
  headers: { ...H, 'Content-Type': 'application/json', 'x-upsert': 'true' },
  body: JSON.stringify(log, null, 2),
})
if (!lg.ok) throw new Error(`log write failed: ${lg.status}`)
console.log(`[strip] No. ${nextNumber} installed as DRAFT for ${date} (${width}x${height})`)
