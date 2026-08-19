#!/usr/bin/env node
/**
 * The Daily Bread — print audit (SA-090 / F-136, Phase 4).
 *
 * The Gallery reproduces classical prints. Some of them carry garbled AI
 * lettering baked into the image (the design spec names
 * `angelico-annunciation-believe.webp`, which has fake text in its bottom
 * margin). Publishing an unaudited pool is publishing visible gibberish, so
 * the Gallery generator draws ONLY from prints this audit marks `clean`.
 *
 * SCOPE: this walks the 291 tracked prints in
 * `public/images/devotional-prints/*.webp`. The 643-directory archive at
 * `archive/devotional-prints/` (662 MB, not served) is deliberately OUT of
 * scope here — that is the later expansion pass, and it needs the same
 * verdicts written into the same JSON before any of it can reach the page.
 *
 * WHAT THIS SCRIPT CAN AND CANNOT DO
 * ----------------------------------
 * It cannot decide `clean`. Detecting baked-in lettering needs eyes on the
 * image. The 2026-08-18 audit put eyes on all 291: fifteen parallel agents
 * opened every file and recorded verdict + reason (workflow wf_d68edc7d-b2c).
 * This script therefore never seeds verdicts — a NEW file starts
 * `unreviewed` and stays out of the Gallery until someone looks at it.
 *
 * Verdicts: 'unreviewed' | 'clean' | 'text-artifact' | 'unusable'.
 *
 * RE-RUNNING IS SAFE AND LOSSLESS. Every reviewed entry — verdict AND
 * reason — is carried over verbatim; a second run only appends prints that
 * appeared on disk since. There is deliberately NO flag that discards
 * reviewed verdicts: rebuilding a visual audit from nothing is a decision a
 * human makes by deleting the file, not a flag a script offers.
 *
 *   node scripts/edition/audit-prints.mjs                    # write / merge
 *   node scripts/edition/audit-prints.mjs --summary          # counts by verdict
 *   node scripts/edition/audit-prints.mjs --generated-at=... # pin the stamp
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
)
const PRINTS_DIR = path.join(REPO_ROOT, 'public/images/devotional-prints')
const DEFAULT_OUT = path.join(REPO_ROOT, 'docs/print-audit-2026-08-18.json')

export const VERDICTS = ['unreviewed', 'clean', 'text-artifact', 'unusable']

/**
 * Filename families that are not attributable to a named artist: `arch-*`
 * (architecture and sites), `sculpt-*` (sculpture), `artifact-*` (objects).
 * Their first token is a category, not a surname.
 */
const UNATTRIBUTED_FAMILIES = new Set(['arch', 'sculpt', 'artifact'])

const NOTE =
  'Verdicts are the curation surface: edit this file by hand. Reviewed ' +
  'entries (verdict + reason) are preserved verbatim on every re-run; new ' +
  'files start `unreviewed` and stay out of the Gallery until someone ' +
  'actually looks at them. The 2026-08-18 baseline is a full visual audit.'

/** Artist from the filename: first hyphen-token, capitalized. */
export function artistFromFile(file) {
  const token = path.basename(file, '.webp').split('-')[0]
  if (!token) throw new Error(`cannot parse an artist token from: ${file}`)
  if (UNATTRIBUTED_FAMILIES.has(token)) return 'Unknown'
  return token.charAt(0).toUpperCase() + token.slice(1)
}

function listPrints() {
  if (!fs.existsSync(PRINTS_DIR)) {
    throw new Error(`prints directory not found: ${PRINTS_DIR}`)
  }
  return fs
    .readdirSync(PRINTS_DIR)
    .filter((f) => f.endsWith('.webp'))
    .sort()
}

function readExisting(outPath) {
  if (!fs.existsSync(outPath)) return null
  const parsed = JSON.parse(fs.readFileSync(outPath, 'utf8'))
  if (!Array.isArray(parsed.prints)) {
    throw new Error(`malformed audit file (no prints array): ${outPath}`)
  }
  return parsed
}

function argValue(flag) {
  const hit = process.argv.find((a) => a.startsWith(`${flag}=`))
  return hit ? hit.slice(flag.length + 1) : null
}

function build({ outPath, generatedAt }) {
  const files = listPrints()
  const previous = readExisting(outPath)
  const prior = new Map((previous?.prints ?? []).map((p) => [p.file, p]))

  const prints = files.map((file) => {
    const existing = prior.get(file)
    if (existing && VERDICTS.includes(existing.verdict)) {
      // Lossless: the reviewed entry travels whole, reason included.
      return { artist: artistFromFile(file), ...existing }
    }
    return { file, artist: artistFromFile(file), verdict: 'unreviewed' }
  })

  return {
    generatedAt,
    note: previous?.note ?? NOTE,
    method: previous?.method,
    prints,
  }
}

function summarize(outPath) {
  const audit = readExisting(outPath)
  if (!audit) {
    throw new Error(
      `no audit file at ${outPath} — run the script without --summary first`,
    )
  }
  const counts = new Map(VERDICTS.map((v) => [v, 0]))
  for (const print of audit.prints) {
    if (!counts.has(print.verdict)) {
      throw new Error(`unknown verdict "${print.verdict}" on ${print.file}`)
    }
    counts.set(print.verdict, counts.get(print.verdict) + 1)
  }
  console.log(`Print audit — ${outPath}`)
  console.log(`Generated: ${audit.generatedAt}`)
  console.log(`Total prints: ${audit.prints.length}`)
  for (const verdict of VERDICTS) {
    console.log(
      `  ${verdict.padEnd(14)} ${String(counts.get(verdict)).padStart(4)}`,
    )
  }
}

function main() {
  const outPath = argValue('--out') ?? DEFAULT_OUT

  if (process.argv.includes('--summary')) {
    summarize(outPath)
    return
  }

  const audit = build({
    outPath,
    generatedAt: argValue('--generated-at') ?? new Date().toISOString(),
  })

  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8')

  const tally = (v) => audit.prints.filter((p) => p.verdict === v).length
  console.log(
    `Wrote ${outPath} — ${audit.prints.length} prints: ` +
      `${tally('clean')} clean, ${tally('text-artifact')} text-artifact, ` +
      `${tally('unusable')} unusable, ${tally('unreviewed')} unreviewed.`,
  )
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  main()
}
