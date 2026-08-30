#!/usr/bin/env node
/**
 * Assemble full generation prompts for the series masters, and report run state.
 *
 * This exists because the prompt set was lost once to context compaction and had
 * to be re-authored from scratch. Run state is derived from what is ON DISK, so
 * a fresh session can resume by running this and reading the TODO list.
 *
 *   node scripts/imagery/build-prompts.mjs            # status only
 *   node scripts/imagery/build-prompts.mjs --todo     # status + next 8 to fire
 *   node scripts/imagery/build-prompts.mjs <slug>     # full prompt for one slug
 *   node scripts/imagery/build-prompts.mjs --json     # {slug: prompt} for all pending
 *
 * IMAGE INTENSITY (SA-131, founder-chosen 2026-08-29): --intensity=1..5 grades the
 * plate from the current site register (1) to cinematic baroque (5). 1 for stills
 * and 5 for motion (--motion) are DEFAULTS ONLY, used when no intensity is given.
 * An explicitly named intensity applies to EVERY generated image in the run and
 * overrides that split.
 *
 *   node scripts/imagery/build-prompts.mjs <slug> --intensity=3
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '../..')

// Where finished masters land before install. Kept outside the repo so an
// interrupted run never commits half a set.
const ORIENT = process.argv.includes('--portrait') ? 'portrait' : 'landscape'

// Intensity 1..5. An EXPLICIT --intensity applies to every image in the run,
// stills and motion alike, and overrides the split below (founder 2026-08-29:
// "Unless I specify, the intensity is for all generated images"). The split is
// only the default: motion plates default to the top of the scale because that
// is what the baroque register exists for, stills to the bottom, which is the
// register the shipped site already uses.
const MOTION = process.argv.includes('--motion')
const intensityArg = process.argv.find((a) => a.startsWith('--intensity='))
const INTENSITY = intensityArg ? Number(intensityArg.slice('--intensity='.length)) : MOTION ? 5 : 1
if (!Number.isInteger(INTENSITY) || INTENSITY < 1 || INTENSITY > 5) {
  console.error(`--intensity must be a whole number 1-5, got "${intensityArg?.slice(12)}"`)
  process.exit(1)
}
const OUT_DIR =
  process.env.SERIES_MASTERS_DIR ||
  path.join(REPO, 'imagery-staging/series-v2', ORIENT)

const spec = JSON.parse(
  fs.readFileSync(path.join(HERE, 'series-image-subjects.json'), 'utf8'),
)
const preambleDoc = fs.readFileSync(path.join(HERE, 'prompt-preamble.md'), 'utf8')

// Pull the two blocks straight out of the markdown so there is exactly one
// copy of the approved wording and it cannot drift from the documentation.
const section = (name) => {
  const m = preambleDoc.match(
    new RegExp(`## ${name}\\n\\n([\\s\\S]*?)\\n\\n(?=## |---)`),
  )
  if (!m) throw new Error(`prompt-preamble.md: missing "## ${name}" section`)
  return m[1].trim()
}
const PREAMBLE = section('PREAMBLE')

// rev B: two masters per plate, each with its own crop clause. The leading
// "Use with the …" line is documentation for a human and is stripped before the
// clause goes into a prompt.
const clause = (name) =>
  section(name)
    .split('\n')
    .filter((l) => !/^Use with the /.test(l))
    .join('\n')
    .trim()

const CROP = {
  landscape: clause('CROP_CLAUSE_LANDSCAPE'),
  portrait: clause('CROP_CLAUSE_PORTRAIT'),
}

// The intensity block sits between the preamble and the subject, and it says so
// itself: where a subject line still states its own ink percentage, the intensity
// block outranks it. That ordering is deliberate — it means the per-series subject
// lines in series-image-subjects.json did not have to be rewritten to adopt this.
export const buildPrompt = (subject, orientation = 'landscape', intensity = 1) => {
  const crop = CROP[orientation]
  if (!crop) throw new Error(`orientation must be landscape|portrait, got "${orientation}"`)
  const block = section(`INTENSITY_${intensity}`)
  return [
    PREAMBLE,
    block,
    'The INTENSITY block above OUTRANKS any ink percentage or coverage band stated in the SUBJECT line below. Where they disagree, follow the INTENSITY block.',
    `SUBJECT: ${subject}`,
    crop,
  ].join('\n\n')
}

const subjects = spec.subjects
const approved = new Set(spec._approved_do_not_regenerate)
const slugs = Object.keys(subjects)

const done = slugs.filter((s) => fs.existsSync(path.join(OUT_DIR, `${s}.png`)))
const pending = slugs.filter((s) => !done.includes(s))

const arg = process.argv[2]

if (arg && !arg.startsWith('--')) {
  if (!subjects[arg]) {
    console.error(`no subject for "${arg}". known: ${slugs.join(', ')}`)
    process.exit(1)
  }
  console.log(buildPrompt(subjects[arg], ORIENT, INTENSITY))
  process.exit(0)
}

if (arg === '--json') {
  const out = {}
  for (const s of pending) out[s] = buildPrompt(subjects[s], ORIENT, INTENSITY)
  console.log(JSON.stringify(out, null, 2))
  process.exit(0)
}

console.log(`orientation : ${ORIENT}`)
console.log(`intensity   : ${INTENSITY}/5${intensityArg ? '' : MOTION ? '  (motion default)' : '  (stills default)'}`)
console.log(`masters dir : ${OUT_DIR}`)
console.log(`to generate : ${slugs.length}`)
console.log(`done        : ${done.length}`)
console.log(`pending     : ${pending.length}`)
console.log(
  `untouched   : ${approved.size} founder-approved (${[...approved].join(', ')})`,
)

if (arg === '--todo') {
  console.log(`\nnext up (plan cap is 8 concurrent):`)
  for (const s of pending.slice(0, 8)) console.log(`  ${s}`)
  if (pending.length > 8) console.log(`  ... and ${pending.length - 8} more`)
}
