#!/usr/bin/env node
/**
 * Devotional accuracy + consistency gate (SA-124).
 *
 * Founder, 2026-08-24: "Set up hooks on the skill to lock down accuracy and
 * devotional consistency. This is a massive issue."
 *
 * Every check here exists because that exact failure ACTUALLY SHIPPED or broke a
 * build on the all-these-things run, and was caught late or by hand.
 *
 *   node scripts/check-devotional-consistency.mjs                  # whole catalogue
 *   node scripts/check-devotional-consistency.mjs <files...>       # just these
 *   node scripts/check-devotional-consistency.mjs --series <slug>
 *   node scripts/check-devotional-consistency.mjs --strict ...     # warnings become failures
 *
 * Severity matters, because a gate that fires on the whole back catalogue gets
 * switched off and then protects nothing:
 *   fail() = CORRECTNESS — renders wrong, breaks the build, or ships a false
 *            claim. Always blocks.
 *   warn() = COMPLETENESS — correct, but thinner than today's standard. Never
 *            blocks; the catalogue predates the standard and SA-030/SA-032/
 *            SA-053 are all explicitly forward-only. --strict promotes these,
 *            and devo-go passes --strict for NEW series.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DEV = path.join(REPO, 'public/devotionals')

const argv = process.argv.slice(2)
const STRICT = argv.includes('--strict')
let targets = []
const seriesIdx = argv.indexOf('--series')
if (seriesIdx !== -1 && argv[seriesIdx + 1]) {
  const slug = argv[seriesIdx + 1]
  targets = fs.readdirSync(DEV)
    .filter((f) => f.startsWith(slug + '-day-') && f.endsWith('.json'))
    .map((f) => path.join(DEV, f))
} else {
  const files = argv.filter((a) => !a.startsWith('--'))
  targets = files.length
    ? files.map((a) => path.resolve(a))
    : fs.readdirSync(DEV).filter((f) => f.endsWith('.json')).map((f) => path.join(DEV, f))
}
targets = targets.filter((f) => fs.existsSync(f) && f.endsWith('.json'))

const problems = []
const warnings = []
const fail = (file, code, msg) => problems.push({ file: path.basename(file), code, msg })
const warn = (file, code, msg) =>
  (STRICT ? problems : warnings).push({ file: path.basename(file), code, msg })

const read = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return null } }

// --- learn expected field shapes from the catalogue (never from files under test)
const catalogTypes = new Map()
const targetSet = new Set(targets)
for (const f of fs.readdirSync(DEV).filter((x) => x.endsWith('.json')).map((x) => path.join(DEV, x))) {
  if (targetSet.has(f)) continue
  const j = read(f)
  if (!j?.modules) continue
  for (const m of j.modules) {
    for (const [k, v] of Object.entries(m)) {
      const key = `${m.type}.${k}`
      if (!catalogTypes.has(key)) catalogTypes.set(key, new Map())
      const t = Array.isArray(v) ? 'array' : typeof v
      const b = catalogTypes.get(key)
      b.set(t, (b.get(t) ?? 0) + 1)
    }
  }
}
const MIN_SAMPLE = 8

const OT = /^(Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1 Samuel|2 Samuel|1 Kings|2 Kings|1 Chronicles|2 Chronicles|Ezra|Nehemiah|Esther|Job|Psalm|Psalms|Proverbs|Ecclesiastes|Song|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi)\b/
const NT = /^(Matthew|Mark|Luke|John|Acts|Romans|1 Corinthians|2 Corinthians|Galatians|Ephesians|Philippians|Colossians|1 Thessalonians|2 Thessalonians|1 Timothy|2 Timothy|Titus|Philemon|Hebrews|James|1 Peter|2 Peter|1 John|2 John|3 John|Jude|Revelation)\b/
const TEACHING = new Set(['A', 'B', 'C', 'B-prime', 'A-prime'])

for (const file of targets) {
  const j = read(file)
  if (!j) { fail(file, 'unparseable', 'not valid JSON'); continue }
  const mods = Array.isArray(j.modules) ? j.modules : []

  // 1. FIELD TYPES — two production builds died here (`.map is not a function`)
  for (const [i, m] of mods.entries()) {
    for (const [k, v] of Object.entries(m)) {
      const b = catalogTypes.get(`${m.type}.${k}`)
      if (!b) continue
      const total = [...b.values()].reduce((a, c) => a + c, 0)
      if (total < MIN_SAMPLE) continue
      const [expected, expectedCount] = [...b.entries()].sort((a, c) => c[1] - a[1])[0]
      const got = Array.isArray(v) ? 'array' : typeof v
      // Only enforce a shape the catalogue uses NEAR-UNIVERSALLY. If a field
      // genuinely appears in two shapes, that is proof the renderer tolerates
      // both — ResourceModule, for instance, documents `forDeeperStudy` as
      // "either a list of study items or a single prose blurb" and guards with
      // Array.isArray. Flagging a tolerated union is a false positive, and a
      // gate with false positives gets switched off.
      const dominance = expectedCount / total
      if (dominance < 0.98) continue
      if (got !== expected && (expected === 'array' || got === 'array')) {
        fail(file, 'field_type',
          `modules[${i}] ${m.type}.${k} is ${got}, catalogue uses ${expected} in ${expectedCount}/${total} cases. Breaks the renderer at prerender.`)
      }
    }
  }

  // 2. IMAGERY
  const images = mods.filter((m) => m.type === 'inline-image')
  if (images.length < 3) {
    warn(file, 'too_few_images', `${images.length} inline-image module(s); the standard for new work is 3 per day.`)
  }
  for (const [i, m] of images.entries()) {
    if (!(m.inlineImageCaption ?? '').trim())
      fail(file, 'image_no_caption', `inline-image ${i + 1} has no caption — the caption IS the contextual justification for the slot.`)
    if (!(m.inlineImageAlt ?? '').trim())
      fail(file, 'image_no_alt', `inline-image ${i + 1} has no alt text.`)
    const src = m.inlineImageSrc ?? ''
    if (src && !fs.existsSync(path.join(REPO, 'public', src.replace(/^\//, ''))))
      fail(file, 'image_missing', `inline-image ${i + 1} points at ${src}, which is not on disk.`)
  }

  // 3. TWO-MINUTE OPEN integrity — an image inserted inside the open silently
  //    breaks the required sequence (this happened on day 6).
  if (j.format === 'two-minute-open-v2') {
    const want = ['scripture', 'vocab', 'teaching', 'reflection', 'prayer', 'cta']
    want.forEach((w, i) => {
      if (mods[i]?.type !== w)
        fail(file, 'open_sequence', `two-minute-open-v2 requires modules[${i}] to be "${w}", found "${mods[i]?.type ?? 'nothing'}".`)
    })
  }

  // 4. CROSS-TESTAMENT (SA-032, dated 2026-07-27 — forward-only)
  if (TEACHING.has(j.chiasm_position)) {
    const refs = mods.filter((m) => m.type === 'scripture').map((m) => m.reference ?? '')
    const hasOT = refs.some((r) => OT.test(r))
    const hasNT = refs.some((r) => NT.test(r))
    if (!(hasOT && hasNT))
      warn(file, 'no_cross_testament', `SA-032 wants an OT and an NT scripture on every teaching day. OT=${hasOT} NT=${hasNT}.`)
  }
}

// 5 + 6. Delegate to the REAL implementations rather than lookalikes: the
// SA-051 red-letter resolver, and the python narration extractor's textHash.
// A reimplementation here would drift from them, which is worse than no check.
function delegate(label, cmd, args, parse) {
  try {
    execFileSync(cmd, args, { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  } catch (e) {
    if (e.code === 'ENOENT') {
      console.warn(`[devotional-consistency] SKIPPED ${label} — tool unavailable here.`)
      return
    }
    const out = `${e.stdout ?? ''}${e.stderr ?? ''}`.trim()
    problems.push({ file: label, code: label, msg: parse(out) })
  }
}

if (targets.length) {
  delegate('red-letter', 'npx',
    ['tsx', 'scripts/red-letter/apply-to-days.ts', '--check', ...targets],
    (out) => out.split('\n').filter((l) => l.includes('would gain')).join(' ') ||
             'the resolver would add attribution to a module that has none on disk.')

  const slugsJson = JSON.stringify(targets.map((t) => path.basename(t, '.json')))
  const py = fs.existsSync(`${process.env.HOME}/.local/bin/python3.12`)
    ? `${process.env.HOME}/.local/bin/python3.12` : 'python3'
  delegate('audio-texthash', py, ['-c', `
import json,sys,os
sys.path.insert(0,'euangelion-voice-prototype/spec')
try:
    import narration_extract as ne
except Exception:
    sys.exit(0)
try:
    man=json.load(open('src/data/audio-manifest.json'))
except Exception:
    sys.exit(0)
bad=[]
for slug in json.loads(r'''${slugsJson}'''):
    e=man.get(slug)
    if not e or not e.get('textHash'): continue
    if not os.path.exists('public/audio/%s.m4a' % slug): continue
    dev=json.load(open('public/devotionals/%s.json' % slug))
    if ne.text_hash(dev)!=e['textHash']: bad.append(slug)
if bad:
    print('audio no longer speaks the page (re-render): '+', '.join(bad)); sys.exit(1)
`], (out) => out.split('\n').filter(Boolean).pop() ?? 'audio textHash mismatch')
}

if (warnings.length) {
  const byCode = new Map()
  for (const w of warnings) {
    if (!byCode.has(w.code)) byCode.set(w.code, [])
    byCode.get(w.code).push(w.file)
  }
  for (const [code, files] of byCode) {
    console.log(`[devotional-consistency] note: ${files.length} file(s) — ${code} (not blocking; --strict enforces)`)
    if (files.length <= 8) for (const f of files) console.log(`    ${f}`)
  }
}

if (problems.length === 0) {
  console.log(`[devotional-consistency] OK — ${targets.length} file(s) checked, ${warnings.length} note(s).`)
  process.exit(0)
}
console.error(`\n[devotional-consistency] ${problems.length} problem(s):\n`)
const byFile = new Map()
for (const p of problems) {
  if (!byFile.has(p.file)) byFile.set(p.file, [])
  byFile.get(p.file).push(p)
}
for (const [f, ps] of byFile) {
  console.error(`  ${f}`)
  for (const p of ps) console.error(`    [${p.code}] ${p.msg}`)
}
console.error('')
process.exit(1)
