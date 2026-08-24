/**
 * Bake `redLetter` onto scripture modules in static devotional day JSONs.
 *
 * The static day-JSON reader does NOT resolve red letter at render time — only
 * the soul-audit paths call resolveRedLetter. Shipped series therefore carry a
 * literal `redLetter: [...]` array on the scripture module. This script writes
 * it, using the REAL resolver so attribution is never hand-authored and never
 * inferred from quotation marks (SA-051).
 *
 *   npx tsx scripts/red-letter/apply-to-days.ts public/devotionals/<slug>-day-*.json
 *   npx tsx scripts/red-letter/apply-to-days.ts --check <files>   # report only
 *
 * A module that already carries a hand-set `redLetter` is left ALONE: a
 * hand-marked value always wins over the resolver (SA-051).
 */
import fs from 'node:fs'
import { resolveRedLetter } from '../../src/lib/red-letter-resolve'

const args = process.argv.slice(2)
const checkOnly = args.includes('--check')
const files = args.filter((a) => !a.startsWith('--'))

if (files.length === 0) {
  console.error('usage: apply-to-days.ts [--check] <day.json...>')
  process.exit(1)
}

let touched = 0
let marked = 0
let leftBlack = 0

for (const file of files) {
  const json = JSON.parse(fs.readFileSync(file, 'utf8'))
  const modules = Array.isArray(json.modules) ? json.modules : []
  let changed = false

  for (const mod of modules) {
    if (!mod || mod.type !== 'scripture') continue
    const reference = mod.reference
    const passage = mod.passage
    if (!reference || !passage) continue

    // A hand-set value always wins — never overwrite it.
    if (Object.prototype.hasOwnProperty.call(mod, 'redLetter')) {
      console.log(`  [keep] ${file} :: ${reference} (hand-set, untouched)`)
      continue
    }

    const spans = resolveRedLetter(reference, passage)
    if (spans.length > 0) {
      if (!checkOnly) mod.redLetter = spans
      changed = true
      marked++
      console.log(`  [red ] ${reference} — ${spans.length} span(s)`)
    } else {
      leftBlack++
      console.log(`  [black] ${reference} — no attribution, stays black (correct)`)
    }
  }

  if (changed && !checkOnly) {
    fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n')
    touched++
  }
}

console.log(
  `\n${checkOnly ? 'CHECK' : 'WROTE'}: ${marked} module(s) marked red, ${leftBlack} left black, ${touched} file(s) rewritten.`,
)

// In --check mode this is a GATE, not a report. If the resolver would have
// added attribution to a module that currently carries none, the file on disk
// is missing red letter and must not ship: a missing red word is a typographic
// omission, but shipping Christ's words in black when the resolver knows better
// is a silent regression nobody notices. SA-051 / SA-124.
if (checkOnly && marked > 0) {
  console.error(
    `\n[red-letter] ${marked} scripture module(s) would gain attribution but have none on disk.`,
  )
  console.error('  Fix: npx tsx scripts/red-letter/apply-to-days.ts <files>\n')
  process.exit(1)
}
