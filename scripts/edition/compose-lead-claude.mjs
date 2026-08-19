#!/usr/bin/env node
/**
 * Sunday lead composition via Claude Code SUBSCRIPTION auth (SA-100).
 *
 * WHY: the Sunday feature was the pipeline's only API spend (~$1/mo). With a
 * CLAUDE_CODE_OAUTH_TOKEN (from `claude setup-token`, Pro/Max), the same
 * composition runs headless through Claude Code in CI, billed to the
 * founder's subscription — API key not needed for content.
 *
 * WHAT IT DOES: finds Sundays in the build window; for each, resolves the
 * week's brief (same 52-brief calendar as the API path), fetches the BSB
 * scripture VERBATIM from the committed corpus, invokes `claude -p` to
 * compose the feature (Claude may Read the repo's reference index for
 * attributed quotes), validates the result — fields, length, and a hard
 * grounding check that a contiguous span of the real scripture text appears
 * — and inserts it as a DRAFT via Supabase REST. The review queue still
 * gates it; nothing publishes unseen.
 *
 * Fails loudly on any step. No Sunday in the window exits 0 with a note.
 *
 * Usage: node scripts/edition/compose-lead-claude.mjs --days=N [--from=YYYY-MM-DD]
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '../..')

function arg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : fallback
}

const DAY_MS = 86_400_000
const days = Number(arg('days', '1'))
const fromArg = arg('from', '')
const start = fromArg
  ? new Date(`${fromArg}T00:00:00Z`)
  : new Date(Date.now() + DAY_MS)

// ── Resolve the week's brief through the SAME calendar the API path uses ──
// tsx -e cannot host top-level await (CJS transform), so helpers run as
// temp .mts files.
import os from 'node:os'

function runTsx(source) {
  const file = path.join(os.tmpdir(), `lead-helper-${Date.now()}.mts`)
  fs.writeFileSync(file, source)
  try {
    const out = execFileSync('npx', ['tsx', file], {
      cwd: REPO,
      encoding: 'utf8',
    })
    return JSON.parse(out.trim().split('\n').pop())
  } finally {
    fs.unlinkSync(file)
  }
}

function briefFor(dateIso) {
  return runTsx(
    `import { SUNDAY_BRIEFS, isoWeekUTC } from '${REPO}/src/lib/edition/generators/lead'
const d = new Date('${dateIso}T00:00:00Z')
console.log(JSON.stringify(SUNDAY_BRIEFS[(isoWeekUTC(d) - 1) % SUNDAY_BRIEFS.length]))`,
  )
}

function scriptureFor(reference) {
  return runTsx(
    `import { getVerse } from '${REPO}/src/lib/bible/getVerse'
const r = await getVerse('${reference.replace(/'/g, "\\'")}', 'BSB')
console.log(JSON.stringify({ canonical: r.canonical, text: r.text }))`,
  )
}

async function insertDraft(dateIso, payload) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env missing')
  const res = await fetch(`${url}/rest/v1/edition_items?on_conflict=kind,publish_date,slot`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      kind: 'lead',
      publish_date: dateIso,
      slot: 0,
      status: 'draft',
      payload,
    }),
  })
  if (!res.ok) {
    throw new Error(`draft insert failed ${res.status}: ${await res.text()}`)
  }
}

const sundays = []
for (let i = 0; i < days; i += 1) {
  const d = new Date(start.getTime() + i * DAY_MS)
  if (d.getUTCDay() === 0) sundays.push(d.toISOString().slice(0, 10))
}

if (sundays.length === 0) {
  console.log('[lead-claude] no Sunday in the window — nothing to compose')
  process.exit(0)
}

if (!process.env.CLAUDE_CODE_OAUTH_TOKEN) {
  throw new Error(
    'CLAUDE_CODE_OAUTH_TOKEN is not set — this script is the subscription path',
  )
}

for (const dateIso of sundays) {
  const brief = briefFor(dateIso)
  const scripture = scriptureFor(brief.scriptureReference)
  console.log(`[lead-claude] composing ${dateIso}: ${brief.theme}`)

  const prompt = `You are composing THE SUNDAY FEATURE for Euangelion's Daily Bread — a devotional feature article. It lands as a DRAFT for human review, so write your best and invent nothing.

THE BRIEF
- Theme: ${brief.theme}
- Scripture: ${scripture.canonical}
- The reader's condition this speaks to: ${brief.struggle}

THE SCRIPTURE TEXT (BSB, verbatim — quote from THIS text only, never from memory):
${scripture.text}

THE RULES (non-negotiable)
1. 900–1100 words of body. Literate, unhurried, second-person restrained — match the voice in docs/PUBLIC-FACING-LANGUAGE.md (read it).
2. Movement structure: open on the reader's real condition → into the text (quote a contiguous span of the scripture above, at least 12 words, verbatim) → the turn (what the text asks/gives) → Christ connection → return to the reader's Monday.
3. You MAY include one or two short attributed quotes from historic voices — ONLY if you take them verbatim from public/reference-index.json in this repo (search it; every chunk carries its source). Never quote from memory. If nothing fits, use none.
4. No headers in the body; paragraphs separated by blank lines. No em-dashes.
5. Also write: a title (≤ 8 words, no colon constructions), and exactly 2 reflective pull quotes (questions, ≤ 200 chars each) drawn from the piece.

OUTPUT: write ONE file, /tmp/sunday-lead.json, containing strict JSON:
{"title": "...", "body": "...", "pullQuotes": ["...", "..."]}
Nothing else. Do not print the JSON to stdout.`

  execFileSync('claude', ['-p', prompt, '--allowedTools', 'Read,Write,Grep'], {
    cwd: REPO,
    encoding: 'utf8',
    stdio: ['ignore', 'inherit', 'inherit'],
    timeout: 15 * 60 * 1000,
  })

  const raw = fs.readFileSync('/tmp/sunday-lead.json', 'utf8')
  fs.unlinkSync('/tmp/sunday-lead.json')
  const lead = JSON.parse(raw)

  // ── Validation: shape, length, and the grounding check ──
  if (!lead.title || !lead.body || !Array.isArray(lead.pullQuotes)) {
    throw new Error('composed lead missing fields')
  }
  const words = lead.body.trim().split(/\s+/).length
  if (words < 700 || words > 1400) {
    throw new Error(`composed lead is ${words} words — outside 700–1400`)
  }
  // A contiguous 12-word span of the real scripture must appear verbatim.
  const scripWords = scripture.text.split(/\s+/)
  let grounded = false
  for (let i = 0; i + 12 <= scripWords.length && !grounded; i += 1) {
    if (lead.body.includes(scripWords.slice(i, i + 12).join(' '))) {
      grounded = true
    }
  }
  if (!grounded) {
    throw new Error(
      'composed lead never quotes a 12-word contiguous span of the scripture — grounding check failed',
    )
  }

  await insertDraft(dateIso, {
    mode: 'authored',
    title: lead.title,
    standfirst: brief.theme,
    body: lead.body,
    scriptureReference: scripture.canonical,
    pullQuotes: lead.pullQuotes.slice(0, 2),
  })
  console.log(`[lead-claude] ${dateIso} draft inserted (${words} words)`)
}
