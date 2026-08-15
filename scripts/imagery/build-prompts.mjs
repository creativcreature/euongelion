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
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '../..')

// Where finished masters land before install. Kept outside the repo so an
// interrupted run never commits half a set.
const OUT_DIR =
  process.env.SERIES_MASTERS_DIR ||
  '/private/tmp/claude-501/-Users-jamesparker-Documents-app-projects-external-euangelion/763444a7-3863-4387-888d-c4f34b4de80d/scratchpad/series-final'

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
const CROP = section('CROP_CLAUSE')

export const buildPrompt = (subject) =>
  `${PREAMBLE}\n\nSUBJECT: ${subject}\n\n${CROP}`

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
  console.log(buildPrompt(subjects[arg]))
  process.exit(0)
}

if (arg === '--json') {
  const out = {}
  for (const s of pending) out[s] = buildPrompt(subjects[s])
  console.log(JSON.stringify(out, null, 2))
  process.exit(0)
}

console.log(`masters dir : ${OUT_DIR}`)
console.log(`to generate : ${slugs.length}`)
console.log(`done        : ${done.length}`)
console.log(`pending     : ${pending.length}`)
console.log(
  `untouched   : ${approved.size} founder-approved (${[...approved].join(', ')})`,
)
console.log(`credits left: ~${pending.length * 7} needed at 7/image`)

if (arg === '--todo') {
  console.log(`\nnext up (plan cap is 8 concurrent):`)
  for (const s of pending.slice(0, 8)) console.log(`  ${s}`)
  if (pending.length > 8) console.log(`  ... and ${pending.length - 8} more`)
}
