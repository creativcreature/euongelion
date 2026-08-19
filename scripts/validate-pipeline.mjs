#!/usr/bin/env node
/**
 * validate-pipeline.mjs — the manifest spine, and the firewall.
 *
 *   node scripts/validate-pipeline.mjs                 # every manifest
 *   node scripts/validate-pipeline.mjs <slug>          # one
 *
 * Two jobs, and the second is the reason this exists.
 *
 * SCHEMA. `content/pipeline/<slug>.pipeline.json` is what every stage reads and
 * writes. Resume, partial rerun, --auto mode and the evidence report are all the
 * same mechanism — a stage advancing the state machine — so a malformed manifest
 * is not a cosmetic problem, it is a pipeline that cannot be trusted to know
 * what it has already done.
 *
 * THE FIREWALL (spec Part E). `last30days` returns Reddit posts, X threads and
 * YouTube comments. That is excellent evidence about what people ASK and the
 * WORDS THEY USE. It is not a source about God, Scripture, or history, and it
 * carries no verification standing whatsoever.
 *
 * devo-go's whole regime — scripture pulled corpus-verbatim, every quote cited
 * from primary texts, every story primary-source verified with the rejection
 * documented — is the competitive advantage in a category drowning in
 * unverified AI output. A single Reddit anecdote laundered into a devotional
 * through the topic-discovery channel would destroy more than the entire
 * discovery stage gains.
 *
 * Convention cannot hold that line across sessions and agents, so it is asserted
 * mechanically here: no phrase recorded in `discovery.audience_language` may
 * appear verbatim in a devotional body or a source pack. Permitted uses are
 * topic selection and PACKAGING COPY ONLY — titles, teasers, hooks, captions.
 *
 * A firewall violation is BLOCKING and always exits 2, distinct from a schema
 * error, so a caller can tell "malformed" from "contaminated".
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PIPELINE_DIR = path.join(REPO, 'content/pipeline')
const DEVOTIONAL_DIR = path.join(REPO, 'public/devotionals')
const SOURCE_PACK_DIR = path.join(REPO, 'content/source-packs')

const EXIT_OK = 0
const EXIT_SCHEMA = 1
const EXIT_FIREWALL = 2

const STAGES = ['text', 'audio', 'motion', 'social', 'package', 'publish']
const STATES = ['pending', 'blocked', 'running', 'done', 'failed']
const MODES = ['gated', 'auto']

/** Short enough to be a coincidence rather than a lift. */
const MIN_PHRASE_WORDS = 4

const errors = []
const firewallHits = []
const fail = (m) => errors.push(m)

function validateManifest(file, m) {
  const at = path.basename(file)
  if (m.schema !== 1) fail(`${at}: schema must be 1, got ${JSON.stringify(m.schema)}`)
  for (const k of ['slug', 'thematic', 'mode']) {
    if (typeof m[k] !== 'string' || !m[k]) fail(`${at}: ${k} must be a non-empty string`)
  }
  if (m.mode && !MODES.includes(m.mode)) fail(`${at}: mode must be one of ${MODES.join(' | ')}`)
  if (path.basename(file, '.pipeline.json') !== m.slug) {
    fail(`${at}: filename does not match slug "${m.slug}" — resume finds manifests by filename`)
  }
  if (!m.rulings || typeof m.rulings.sa !== 'string' || typeof m.rulings.prd !== 'string') {
    fail(`${at}: rulings.sa and rulings.prd are required — an unattributed pipeline run cannot be audited`)
  }
  if (!m.stages || typeof m.stages !== 'object') {
    fail(`${at}: stages block missing`)
  } else {
    for (const s of STAGES) {
      const st = m.stages[s]
      if (!st) { fail(`${at}: stages.${s} missing`); continue }
      if (!STATES.includes(st.state)) {
        fail(`${at}: stages.${s}.state "${st.state}" not one of ${STATES.join(' | ')}`)
      }
    }
  }
  if (m.discovery) {
    const d = m.discovery
    if (d.audience_language && !Array.isArray(d.audience_language)) {
      fail(`${at}: discovery.audience_language must be an array`)
    }
    for (const entry of d.audience_language ?? []) {
      if (typeof entry?.phrase !== 'string') {
        fail(`${at}: every audience_language entry needs a "phrase" string`)
      }
    }
    if (d.covered !== undefined && typeof d.covered !== 'boolean') {
      fail(`${at}: discovery.covered must be a boolean`)
    }
  }
  if (m.policy && m.policy.c2pa_posture &&
      !['attached', 'stripped', 'unset'].includes(m.policy.c2pa_posture)) {
    fail(`${at}: policy.c2pa_posture must be attached | stripped | unset`)
  }
}

/** Collapse whitespace and punctuation so a match is about words, not typography. */
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()

function corpusFor(slug) {
  const texts = []
  if (fs.existsSync(DEVOTIONAL_DIR)) {
    for (const f of fs.readdirSync(DEVOTIONAL_DIR)) {
      if (!f.startsWith(slug) || !f.endsWith('.json')) continue
      texts.push({ where: `public/devotionals/${f}`, text: norm(fs.readFileSync(path.join(DEVOTIONAL_DIR, f), 'utf8')) })
    }
  }
  const pack = path.join(SOURCE_PACK_DIR, `${slug}.md`)
  if (fs.existsSync(pack)) {
    texts.push({ where: `content/source-packs/${slug}.md`, text: norm(fs.readFileSync(pack, 'utf8')) })
  }
  return texts
}

function checkFirewall(file, m) {
  const phrases = (m.discovery?.audience_language ?? [])
    .map((e) => e?.phrase)
    .filter((p) => typeof p === 'string')
  if (!phrases.length) return
  const corpus = corpusFor(m.slug)
  if (!corpus.length) return
  for (const phrase of phrases) {
    const n = norm(phrase)
    if (n.split(' ').length < MIN_PHRASE_WORDS) continue
    for (const c of corpus) {
      if (c.text.includes(n)) {
        firewallHits.push({ manifest: path.basename(file), phrase, where: c.where })
      }
    }
  }
}

const only = process.argv[2]
if (!fs.existsSync(PIPELINE_DIR)) {
  console.log('[pipeline] no content/pipeline directory yet — nothing to validate.')
  process.exit(EXIT_OK)
}
const files = fs.readdirSync(PIPELINE_DIR)
  .filter((f) => f.endsWith('.pipeline.json'))
  .filter((f) => !only || f === `${only}.pipeline.json`)
  .map((f) => path.join(PIPELINE_DIR, f))

if (!files.length) {
  console.log(`[pipeline] no manifests${only ? ` matching "${only}"` : ''} — nothing to validate.`)
  process.exit(EXIT_OK)
}

for (const file of files) {
  let m
  try { m = JSON.parse(fs.readFileSync(file, 'utf8')) }
  catch (e) { fail(`${path.basename(file)}: not valid JSON — ${e.message}`); continue }
  validateManifest(file, m)
  checkFirewall(file, m)
}

if (firewallHits.length) {
  console.error('\n[pipeline] FIREWALL VIOLATION — BLOCKING.\n')
  console.error('  Audience language from last30days has reached the devotional corpus.')
  console.error('  That text is evidence about what readers ASK. It is not a source about')
  console.error('  God, Scripture or history, and it has no verification standing.\n')
  for (const h of firewallHits) {
    console.error(`  ${h.manifest}`)
    console.error(`    phrase : "${h.phrase}"`)
    console.error(`    found  : ${h.where}\n`)
  }
  console.error('  Permitted uses are topic selection and PACKAGING copy only —')
  console.error('  titles, teasers, hooks, captions. Never a devotional day, never')
  console.error('  the source pack, never a citation.\n')
  process.exit(EXIT_FIREWALL)
}

if (errors.length) {
  console.error(`\n[pipeline] ${errors.length} schema error(s):\n`)
  for (const e of errors) console.error(`  ${e}`)
  console.error('')
  process.exit(EXIT_SCHEMA)
}

console.log(`[pipeline] OK — ${files.length} manifest(s) valid; firewall clean.`)
