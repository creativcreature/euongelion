#!/usr/bin/env node
/**
 * Validate one or more prefab devotional JSON files against the authoring spec.
 *
 * Usage:
 *   node scripts/validate-devotional.mjs <file-or-glob> [<file-or-glob> ...]
 *   npm run validate:devotional -- public/devotionals/<slug>-day-*.json
 *
 * Exits 0 if all files pass, 1 if any fail.
 *
 * The full spec lives at content/AUTHORING-SPEC.md.
 */

import fs from 'node:fs'
import path from 'node:path'
import { glob } from 'node:fs/promises'

const ROOT = process.cwd()

const ALLOWED_TRANSLATIONS = new Set([
  'BSB',
  'WEB',
  'WEBBE',
  'KJV',
  'ASV',
  'YLT',
  'DARBY',
  'BBE',
])

const BLOCKED_TRANSLATIONS = new Set([
  'NIV',
  'ESV',
  'NASB',
  'NRSV',
  'CSB',
  'NLT',
  'MSG',
  'TLB',
  'AMP',
  'NCV',
])

const VALID_CHIASM_POSITIONS = new Set([
  'A',
  'B',
  'C',
  'B-prime',
  'A-prime',
  'recap',
  'sabbath',
])

// AI-uncanny phrases banned outright. Match case-insensitive, word-boundary-aware.
const FORBIDDEN_PHRASES = [
  /\bin today's (fast-paced )?world\b/i,
  /\bin our modern context\b/i,
  /\blet's unpack\b/i,
  /\bit's important to note\b/i,
  /\bthis begs the question\b/i,
  /\bat the end of the day\b/i,
  /\bin essence,/i,
  /\bembark on a journey\b/i,
  /\btake a moment to consider\b/i,
  /\bit's not (about )?\w+, it's (about )?\w+/i,
]

// In-devotional user-facing labels that must NOT appear inside the rendered prose.
// (These are fine in metadata fields, comments, or the brief — only flagged in
// modules' user-facing text.)
const FORBIDDEN_LABELS = [
  // Reader-facing prose must not call the experience a "devotional"
  // (PUBLIC-FACING-LANGUAGE "What We Call the Experience"; AUTHORING-SPEC §2).
  // Added 2026-07-26 (the-harvest editor pass) — metadata fields are exempt
  // via the prose-walk's skip list, only rendered prose is scanned.
  /\bdevotionals?\b/i,
  /\bspiritual journey\b/i,
  /\bfaith course\b/i,
  /\bunlock your purpose\b/i,
  /\bjoin thousands of believers\b/i,
  /\byou'?ll be transformed\b/i,
  /\b(?:on this )?incredible journey\b/i,
  /\bon this amazing journey\b/i,
]

// Word-count targets per chiasm position. ±25% tolerance.
// Sabbath is intentionally minimal — most of its "content" is one verse and
// a short invitation. Recap is a distillation of the prior 5 days, not new
// teaching, so its target is also lower.
const WORD_TARGETS = {
  A: 3500,
  B: 3500,
  C: 4000,
  'B-prime': 3500,
  'A-prime': 3000,
  recap: 1500,
  sabbath: 400,
}

// Module types that contain user-facing prose. Used for forbidden-phrase scans
// and the transliteration audit.
const PROSE_MODULE_TYPES = new Set([
  'teaching',
  'story',
  'insight',
  'bridge',
  'reflection',
  'prayer',
  'takeaway',
  'recap',
  'sabbath',
  'profile',
  'comprehension',
  'resource',
  'vocab',
  'chronology',
  'geography',
  'interactive',
  'hero-card',
  'inline-image',
  'journey',
  'cta',
])

// Hebrew (U+0590–U+05FF) and Greek (U+0370–U+03FF + U+1F00–U+1FFF) codepoint
// ranges. Used for the transliteration audit.
const HEBREW_GREEK_RE = /[Ͱ-Ͽ֐-׿ἀ-῿]+/g
// Latin-script transliteration check: at least one chunk of 3+ Latin letters
// (possibly with macrons, accented chars within Latin Extended-A) within ~80
// characters of the Hebrew/Greek match. Not perfect — but catches the common
// "naked Hebrew/Greek" failure mode.
const TRANSLIT_NEAR_RE = /[A-Za-zĀ-ɏ]{3,}/

// Module types that count toward day-level word targets.
// Per AUTHORING-SPEC.md §1: "Day-level word target = sum of all teaching modules
// + scripture + vocab + bridge + story." Other modules (interactive, reflection,
// prayer, takeaway, resource, hero-card, video, inline-image, journey, cta) are
// excluded.
const WORD_COUNTED_MODULE_TYPES = new Set([
  'teaching',
  'scripture',
  'vocab',
  'bridge',
  'story',
  'insight',
  'recap',
  'sabbath',
])

// Multi-mode daily section order — for the v1.2 (John 3) format. Validator
// can confirm the section order matches the depth ladder. Optional; only
// enforced if the day declares `format: "multi-mode"` at the top level.
const MULTI_MODE_EXPECTED_PROGRESSION = [
  'hero-card',
  'scripture', // Anchor Scriptures
  'teaching', // Quickstart
  'reflection',
  'prayer',
  'hero-card', // STORYTIME
  'story',
  'takeaway',
  'teaching', // Go Deeper / Scripture Reading / Cohesive prose / Key Word
  'comprehension', // Community Reflection
  'journey', // This Week's Journey
  'cta',
]

const results = []

function record(file, level, code, message) {
  results.push({ file, level, code, message })
}

function countWords(text) {
  if (!text) return 0
  return text
    .toString()
    .replace(/[^\w\s'-]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

function collectProseStrings(value, out = []) {
  if (value == null) return out
  if (typeof value === 'string') {
    out.push(value)
  } else if (Array.isArray(value)) {
    for (const v of value) collectProseStrings(v, out)
  } else if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      // Skip identifier-like fields that aren't reader-facing
      if (
        k === 'type' ||
        k === 'translation' ||
        k === 'reference' ||
        k === 'language' ||
        k === 'word' ||
        k === 'transliteration' ||
        k === 'pronunciation' ||
        k === 'strongs' ||
        k === 'strongsNumber' ||
        k === 'pardes_layer' ||
        k === 'chiasm_position' ||
        k === 'audio_url' ||
        k === 'image_url' ||
        k === 'map_url' ||
        k === 'ctaHref' // URL fragment (e.g. #devotional-section-6), not prose
      ) {
        continue
      }
      collectProseStrings(v, out)
    }
  }
  return out
}

function validateScriptureModule(file, mod) {
  const data = mod.data ?? mod
  const translation = data.translation
  if (!translation) {
    record(file, 'BLOCKING', 'scripture_no_translation', 'scripture module missing translation field')
    return
  }
  const upper = translation.toString().toUpperCase()
  if (BLOCKED_TRANSLATIONS.has(upper)) {
    record(
      file,
      'BLOCKING',
      'scripture_blocked_translation',
      `scripture uses blocked translation "${translation}" — must be one of ${[...ALLOWED_TRANSLATIONS].join(', ')}`,
    )
    return
  }
  if (!ALLOWED_TRANSLATIONS.has(upper)) {
    record(
      file,
      'BLOCKING',
      'scripture_unknown_translation',
      `scripture uses unknown translation "${translation}" — must be one of ${[...ALLOWED_TRANSLATIONS].join(', ')}`,
    )
  }
  if (!data.reference) {
    record(file, 'BLOCKING', 'scripture_no_reference', 'scripture module missing reference')
  }
  const text = data.passage || data.text
  if (!text || text.toString().trim().length === 0) {
    record(file, 'BLOCKING', 'scripture_no_text', 'scripture module missing passage/text')
  }
}

/**
 * Transliteration audit: any Hebrew or Greek codepoint must have a Latin-script
 * transliteration within ~80 characters. Pattern (per AUTHORING-SPEC.md): never
 * one without the other.
 *
 * Heuristic: look at every prose string in the module. For each Hebrew/Greek
 * match, examine ±80 characters around it. If no Latin word of 3+ chars is
 * found, flag as NEEDS-FIX.
 *
 * Skipped for the `scripture` module's `passage` field (the verse itself may
 * be partial Hebrew without inline transliteration — context provides it).
 */
function scanTransliterationPairing(file, mod, text, fieldName) {
  if (!text || typeof text !== 'string') return
  // The full verse text in scripture modules legitimately contains
  // original-script chunks alongside English; transliteration lives elsewhere
  // in the module structure (e.g., `transliteration` field on the module).
  if (mod.type === 'scripture' && fieldName === 'passage') return

  let match
  HEBREW_GREEK_RE.lastIndex = 0
  while ((match = HEBREW_GREEK_RE.exec(text)) !== null) {
    const start = Math.max(0, match.index - 80)
    const end = Math.min(text.length, match.index + match[0].length + 80)
    const window = text.slice(start, end)
    if (!TRANSLIT_NEAR_RE.test(window)) {
      // Also check if the module itself has a `transliteration` field
      // (vocab modules, scripture modules)
      const moduleHasTranslit = !!(
        mod.transliteration ||
        (mod.data && mod.data.transliteration)
      )
      if (!moduleHasTranslit) {
        record(
          file,
          'NEEDS-FIX',
          'unpaired_original_script',
          `module[${mod.type}] field "${fieldName}" contains Hebrew/Greek text "${match[0]}" without transliteration nearby (within 80 chars). Pair with transliteration per AUTHORING-SPEC §6.`,
        )
      }
    }
  }
}

function scanForbiddenPhrases(file, text) {
  for (const re of FORBIDDEN_PHRASES) {
    const m = text.match(re)
    if (m) {
      record(
        file,
        'BLOCKING',
        'forbidden_phrase',
        `forbidden AI/cliché phrase "${m[0]}" found in prose`,
      )
    }
  }
  for (const re of FORBIDDEN_LABELS) {
    const m = text.match(re)
    if (m) {
      record(
        file,
        'NEEDS-FIX',
        'forbidden_label',
        `user-facing forbidden label "${m[0]}" found in prose`,
      )
    }
  }
}

function validateModule(file, mod, idx) {
  if (!mod || typeof mod !== 'object') {
    record(file, 'BLOCKING', 'module_invalid', `module[${idx}] is not an object`)
    return
  }
  if (!mod.type) {
    record(file, 'BLOCKING', 'module_no_type', `module[${idx}] missing type`)
    return
  }
  if (mod.type === 'scripture') {
    validateScriptureModule(file, mod)
  }
  if (PROSE_MODULE_TYPES.has(mod.type)) {
    const proseStrings = collectProseStrings(mod.data ?? mod)
    for (const s of proseStrings) {
      if (typeof s === 'string' && s.length > 0) {
        scanForbiddenPhrases(file, s)
      }
    }
    // Transliteration audit per-field — uses field names so we can skip
    // `passage` on scripture modules (where transliteration lives elsewhere).
    walkProseFields(mod.data ?? mod, (text, fieldName) => {
      scanTransliterationPairing(file, mod, text, fieldName)
    })
  }
}

function walkProseFields(value, callback, fieldName = '') {
  if (value == null) return
  if (typeof value === 'string') {
    callback(value, fieldName)
    return
  }
  if (Array.isArray(value)) {
    for (const v of value) walkProseFields(v, callback, fieldName)
    return
  }
  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (
        k === 'type' ||
        k === 'translation' ||
        k === 'reference' ||
        k === 'language' ||
        k === 'pronunciation' ||
        k === 'strongs' ||
        k === 'strongsNumber' ||
        k === 'pardes_layer' ||
        k === 'chiasm_position' ||
        k === 'audio_url' ||
        k === 'image_url' ||
        k === 'map_url' ||
        k === 'heroImage' ||
        k === 'inlineImageSrc' ||
        k === 'videoId' ||
        k === 'ctaHref' ||
        k === 'word' || // already in original script in vocab; transliteration is sibling
        k === 'hebrewOriginal' || // sibling `transliteration` covers it
        k === 'greekOriginal' // sibling `transliteration` covers it
      ) {
        continue
      }
      walkProseFields(v, callback, k)
    }
  }
}

function validateDevotional(file) {
  let raw
  try {
    raw = fs.readFileSync(file, 'utf8')
  } catch (e) {
    record(file, 'BLOCKING', 'read_error', `cannot read file: ${e.message}`)
    return
  }
  let json
  try {
    json = JSON.parse(raw)
  } catch (e) {
    record(file, 'BLOCKING', 'json_parse_error', `invalid JSON: ${e.message}`)
    return
  }

  // Top-level required fields
  if (typeof json.day !== 'number') {
    record(file, 'BLOCKING', 'no_day', 'top-level "day" must be a number')
  }
  if (!json.title || typeof json.title !== 'string') {
    record(file, 'BLOCKING', 'no_title', 'top-level "title" required')
  }
  if (!json.chiasm_position) {
    record(file, 'BLOCKING', 'no_chiasm_position', 'top-level "chiasm_position" required')
  } else if (!VALID_CHIASM_POSITIONS.has(json.chiasm_position)) {
    record(
      file,
      'BLOCKING',
      'invalid_chiasm_position',
      `chiasm_position "${json.chiasm_position}" not in ${[...VALID_CHIASM_POSITIONS].join(', ')}`,
    )
  }

  const modules = Array.isArray(json.modules) ? json.modules : []
  if (modules.length === 0 && json.chiasm_position !== 'sabbath') {
    record(file, 'BLOCKING', 'no_modules', 'devotional has no modules')
  }

  // Day-7 sabbath: structural permission to be tiny + scripture-only
  if (json.chiasm_position === 'sabbath') {
    const hasScripture = modules.some((m) => m && m.type === 'scripture') || (json.modules ?? []).some((m) => m.type === 'sabbath')
    if (!hasScripture) {
      record(file, 'NEEDS-FIX', 'sabbath_needs_scripture', 'sabbath day should anchor in one scripture passage')
    }
  }

  // Two-Minute Open (SA-030, founder ruling 2026-07-22 — FORWARD-ONLY, opt-in):
  // when the day declares `format: "two-minute-open"`, the page must begin
  // with a self-contained short devotional — scripture, vocab, reflection,
  // prayer — then a `cta` module that jumps into the full deep dive below.
  //
  // SA-034 (founder ruling 2026-08-10) amends the shape FORWARD-ONLY as
  // `two-minute-open-v2`: a short write-up ABOUT the anchor scripture sits
  // between the vocab word and the reflection, so the open teaches the passage
  // instead of jumping straight from a word to a question. Existing
  // `two-minute-open` days (the-harvest) are untouched and still validate
  // against the five-module sequence.
  const TWO_MINUTE_OPEN_SHAPES = {
    'two-minute-open': ['scripture', 'vocab', 'reflection', 'prayer', 'cta'],
    'two-minute-open-v2': [
      'scripture',
      'vocab',
      'teaching',
      'reflection',
      'prayer',
      'cta',
    ],
  }
  const expected = TWO_MINUTE_OPEN_SHAPES[json.format]
  if (expected) {
    const opening = modules.slice(0, expected.length).map((m) => m && m.type)
    expected.forEach((want, i) => {
      if (opening[i] !== want) {
        record(
          file,
          'BLOCKING',
          'two_minute_open_order',
          `format "${json.format}" requires modules[${i}] to be "${want}", found "${opening[i] ?? 'nothing'}"`,
        )
      }
    })
    // The CTA must land on the first module AFTER the open. Section ids are
    // 1-indexed over the module array (DevotionalPageClient renders
    // `devotional-section-${index + 1}`), so the target is expected.length + 1.
    const cta = modules[expected.length - 1]
    const wantHref = `#devotional-section-${expected.length + 1}`
    if (cta && cta.type === 'cta') {
      const href = (cta.ctaHref ?? cta.data?.ctaHref ?? '').toString()
      if (href !== wantHref) {
        record(
          file,
          'BLOCKING',
          'two_minute_open_cta_href',
          `format "${json.format}" requires the DEEP DIVE cta to link to "${wantHref}" (the first module after the open), found "${href || 'nothing'}"`,
        )
      }
    }
  }

  // Validate modules
  modules.forEach((mod, i) => validateModule(file, mod, i))

  // Word count vs target (only for chiasm positions with targets).
  // Counts only the module types listed in AUTHORING-SPEC §1 — excludes interactive,
  // reflection, prayer, takeaway, resource, and other auxiliary modules whose word
  // counts are not constrained by chiasm targets.
  const target = WORD_TARGETS[json.chiasm_position]
  if (target) {
    const countedModules = modules.filter(
      (m) => m && WORD_COUNTED_MODULE_TYPES.has(m.type),
    )
    const proseStrings = collectProseStrings(countedModules)
    const totalWords = proseStrings.reduce((sum, s) => sum + countWords(s), 0)
    const lower = Math.floor(target * 0.75)
    const upper = Math.ceil(target * 1.25)
    if (totalWords < lower) {
      record(
        file,
        'NEEDS-FIX',
        'word_count_low',
        `counted-prose word count ${totalWords} below target ${target} (acceptable range ${lower}-${upper})`,
      )
    } else if (totalWords > upper) {
      record(
        file,
        'NEEDS-FIX',
        'word_count_high',
        `counted-prose word count ${totalWords} above target ${target} (acceptable range ${lower}-${upper})`,
      )
    }
  }

  // Citation presence heuristic: if external quotes (curly or straight quotes
  // surrounding 8+ words) appear in teaching/insight modules, expect a `resource`
  // module with endnote-shaped content.
  const teachingProse = modules
    .filter((m) => m && (m.type === 'teaching' || m.type === 'insight'))
    .flatMap((m) => collectProseStrings(m.data ?? m))
    .join('\n')
  const externalQuoteRe = /["“][^"”]{40,}["”]/g
  const hasExternalQuote = externalQuoteRe.test(teachingProse)
  const hasResourceWithEndnote = modules.some((m) => {
    if (!m || m.type !== 'resource') return false
    const text = JSON.stringify(m).toLowerCase()
    return text.includes('source') || text.includes('endnote') || text.includes('citation') || text.includes('bibliography')
  })
  if (hasExternalQuote && !hasResourceWithEndnote) {
    record(
      file,
      'NEEDS-FIX',
      'missing_endnotes',
      'external quote(s) detected in teaching prose but no resource module with endnotes/sources/citations',
    )
  }
}

async function expandArgs(args) {
  if (args.length === 0) {
    console.error('Usage: validate-devotional.mjs <file-or-glob> [...]')
    process.exit(2)
  }
  const files = []
  for (const arg of args) {
    const abs = path.isAbsolute(arg) ? arg : path.join(ROOT, arg)
    if (arg.includes('*') || arg.includes('?') || arg.includes('[')) {
      for await (const entry of glob(arg, { cwd: ROOT })) {
        files.push(path.isAbsolute(entry) ? entry : path.join(ROOT, entry))
      }
    } else {
      files.push(abs)
    }
  }
  return files
}

const files = await expandArgs(process.argv.slice(2))

if (files.length === 0) {
  console.error('No files matched.')
  process.exit(2)
}

for (const file of files) {
  validateDevotional(file)
}

const blocking = results.filter((r) => r.level === 'BLOCKING')
const needsFix = results.filter((r) => r.level === 'NEEDS-FIX')

const byFile = new Map()
for (const r of results) {
  if (!byFile.has(r.file)) byFile.set(r.file, [])
  byFile.get(r.file).push(r)
}

console.log(`\n[validate-devotional] checked ${files.length} file(s)`)
console.log(`[validate-devotional] BLOCKING: ${blocking.length}  NEEDS-FIX: ${needsFix.length}`)

for (const file of files) {
  const issues = byFile.get(file) ?? []
  const rel = path.relative(ROOT, file)
  if (issues.length === 0) {
    console.log(`  ✓ ${rel}`)
    continue
  }
  console.log(`  ✗ ${rel}`)
  for (const issue of issues) {
    console.log(`      [${issue.level}] ${issue.code}: ${issue.message}`)
  }
}

if (blocking.length > 0) {
  console.error(`\n[validate-devotional] FAILED — ${blocking.length} blocking issue(s)\n`)
  process.exit(1)
}
console.log('\n[validate-devotional] PASS\n')
