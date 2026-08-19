#!/usr/bin/env node
/**
 * Assemble generation prompts for The Ninety-Nine strip panels (SA-090/F-136).
 *
 * Reuses the founder-approved PREAMBLE and landscape crop clause from
 * prompt-preamble.md by the same extraction build-prompts.mjs uses, so the
 * strip cannot drift from the locked style. Panels are landscape 3:2 only.
 *
 *   node scripts/imagery/build-strip-prompts.mjs           # status
 *   node scripts/imagery/build-strip-prompts.mjs <id>      # full prompt for one panel
 *   node scripts/imagery/build-strip-prompts.mjs --json    # {id: prompt} for all pending
 *
 * Finished panels land in imagery-staging/strip-v1/ before install to
 * public/images/edition/strip/ — outside the repo tree that deploys, so an
 * interrupted run never ships half a bank.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '../..')
const OUT_DIR =
  process.env.STRIP_PANELS_DIR || path.join(REPO, 'imagery-staging/strip-v1')

const spec = JSON.parse(
  fs.readFileSync(path.join(HERE, 'strip-panel-subjects.json'), 'utf8'),
)
const preambleDoc = fs.readFileSync(
  path.join(HERE, 'prompt-preamble.md'),
  'utf8',
)

const section = (name) => {
  const m = preambleDoc.match(
    new RegExp(`## ${name}\\n\\n([\\s\\S]*?)\\n\\n(?=## |---)`),
  )
  if (!m) throw new Error(`prompt-preamble.md: missing "## ${name}" section`)
  return m[1].trim()
}
const PREAMBLE = section('PREAMBLE')
const CROP = section('CROP_CLAUSE_LANDSCAPE')
  .split('\n')
  .filter((l) => !/^Use with the /.test(l))
  .join('\n')
  .trim()

// The character sheet rides in every prompt so the cast cannot drift between
// sessions — the strip's whole viability is consistency.
const sheet = spec._character_sheet
const CAST = [
  `THE STRIP — RECURRING CAST AND SETTING (identical in every panel):`,
  `Premise: ${sheet.premise}`,
  `Cast rule: ${sheet.cast_rule}`,
  ...Object.entries(sheet.cast).map(([k, v]) => `${k}: ${v}`),
  `Setting: ${sheet.setting}`,
].join('\n')

export const buildStripPrompt = (subject) =>
  `${PREAMBLE}\n\n${CAST}\n\nSUBJECT: ${subject}\n\n${CROP}`

const ids = Object.keys(spec.subjects)
const done = new Set(
  fs.existsSync(OUT_DIR)
    ? fs.readdirSync(OUT_DIR).map((f) => f.replace(/\.(png|webp)$/, ''))
    : [],
)

const arg = process.argv[2]
if (arg && arg !== '--json' && arg !== '--todo') {
  if (!spec.subjects[arg]) {
    console.error(`unknown panel id: ${arg}\nknown: ${ids.join(', ')}`)
    process.exit(1)
  }
  console.log(buildStripPrompt(spec.subjects[arg]))
} else if (arg === '--json') {
  const out = {}
  for (const id of ids) {
    if (!done.has(id)) out[id] = buildStripPrompt(spec.subjects[id])
  }
  console.log(JSON.stringify(out, null, 2))
} else {
  console.log(`panels      : ${ids.length}`)
  console.log(`done        : ${[...done].filter((d) => ids.includes(d)).length}`)
  console.log(`pending     : ${ids.filter((id) => !done.has(id)).join(', ')}`)
  console.log(`masters dir : ${OUT_DIR}`)
}
