#!/usr/bin/env node
/**
 * build-voice-bank.mjs
 *
 * Reads public/reference-index.json (5,114 real corpus chunks) and extracts
 * verbatim quotable passages for 9 soul-audit themes. Every quote is a strict
 * verbatim substring of its source chunk — the script asserts this and skips
 * any candidate that fails the check.
 *
 * Quality approach: a corpus audit revealed that many Gutenberg text files in
 * this corpus are bundles that mixed devotional works with short-story fiction
 * anthologies. We use a WHITELIST of sources that are ≥25% genuinely theological
 * (verified by theological keyword density analysis) and require each candidate
 * chunk to score ≥4 on a 21-word theological vocabulary test before attempting
 * quote extraction.
 *
 * Sources excluded (confirmed mostly fiction):
 *   spurgeon/* (Willa Cather fiction), murray/abide-in-christ.txt,
 *   murray/absolute-surrender.txt, murray/be-perfect.txt,
 *   edwards/a-careful-and-strict-enquiry* (Elizabeth Jordan fiction),
 *   edwards/religious-affections.txt, edwards/the-nature-of-true-virtue.txt,
 *   luther/large-catechism.txt, wesley/sermons-vol1-4.txt,
 *   whitefield/sermons.txt, douglass/* (autobiography, not devotional),
 *   chesterton/heretics.txt, chesterton/orthodoxy.txt
 *
 * Output:
 *   content/voices/voice-bank.json       — full bank (all themes combined)
 *   content/voices/by-theme/<theme>.json — per-theme files
 *
 * Usage:  node scripts/build-voice-bank.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = join(__dirname, '..')

// ---------------------------------------------------------------------------
// Load corpus
// ---------------------------------------------------------------------------

const indexPath = join(ROOT, 'public', 'reference-index.json')
if (!existsSync(indexPath)) {
  console.error('ERROR: public/reference-index.json not found.')
  process.exit(1)
}

const corpus = JSON.parse(readFileSync(indexPath, 'utf8'))
console.log(`Loaded ${corpus.length} corpus chunks.`)

// ---------------------------------------------------------------------------
// Author/work display names
// ---------------------------------------------------------------------------

function titleize(s) {
  return s
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bA\b/g, 'à')
    .trim()
}

const AUTHOR_DISPLAY = {
  'augustine': 'Augustine of Hippo',
  'bounds': 'E.M. Bounds',
  'brother-lawrence': 'Brother Lawrence',
  'bunyan': 'John Bunyan',
  'calvin': 'John Calvin',
  'chesterton': 'G.K. Chesterton',
  'edwards': 'Jonathan Edwards',
  'hannah-whitall-smith': 'Hannah Whitall Smith',
  'luther': 'Martin Luther',
  'murray': 'Andrew Murray',
  'owen': 'John Owen',
  'pascal': 'Blaise Pascal',
  'thomas-a-kempis': 'Thomas à Kempis',
  'tozer': 'A.W. Tozer',
}

const WORK_DISPLAY = {
  'city-of-god': 'The City of God',
  'power-through-prayer': 'Power Through Prayer',
  'practice-of-presence-of-god': 'The Practice of the Presence of God',
  'grace-abounding': 'Grace Abounding to the Chief of Sinners',
  'pilgrims-progress': "The Pilgrim's Progress",
  'institutes-of-the-christian-religion-vol1': 'Institutes of the Christian Religion',
  'everlasting-man': 'The Everlasting Man',
  'sinners-in-the-hands-of-an-angry-god': 'Sinners in the Hands of an Angry God',
  'christians-secret': "The Christian's Secret of a Happy Life",
  'commentary-on-galatians': 'Commentary on Galatians',
  'mortification-of-sin': 'The Mortification of Sin',
  'pensees': 'Pensées',
  'imitation-of-christ': 'The Imitation of Christ',
  'pursuit-of-god': 'The Pursuit of God',
}

function getDisplayAttribution(chunk) {
  const parts = chunk.source.split('/').filter(Boolean)
  const authorSegment = parts[parts.length - 2] ?? ''
  const fileSegment = (parts[parts.length - 1] ?? '').replace(/\.[a-z]+$/i, '')
  const author = AUTHOR_DISPLAY[authorSegment] ?? titleize(authorSegment)
  const work = WORK_DISPLAY[fileSegment] ?? titleize(fileSegment)
  return { author, work }
}

// ---------------------------------------------------------------------------
// Source whitelist — only sources confirmed ≥25% genuinely theological
// by keyword-density analysis (see docs in file header).
// ---------------------------------------------------------------------------

const WHITELISTED_SOURCES = new Set([
  'content/reference/SOURCE-BANK.md',
  'content/reference/commentaries/augustine/city-of-god.txt',
  'content/reference/commentaries/bounds/power-through-prayer.txt',
  'content/reference/commentaries/brother-lawrence/practice-of-presence-of-god.txt',
  'content/reference/commentaries/bunyan/grace-abounding.txt',
  'content/reference/commentaries/bunyan/pilgrims-progress.txt',
  'content/reference/commentaries/calvin/institutes-of-the-christian-religion-vol1.txt',
  'content/reference/commentaries/chesterton/everlasting-man.txt',
  'content/reference/commentaries/edwards/sinners-in-the-hands-of-an-angry-god.txt',
  'content/reference/commentaries/hannah-whitall-smith/christians-secret.txt',
  'content/reference/commentaries/luther/commentary-on-galatians.txt',
  'content/reference/commentaries/owen/mortification-of-sin.txt',
  'content/reference/commentaries/pascal/pensees.txt',
  'content/reference/commentaries/thomas-a-kempis/imitation-of-christ.txt',
  'content/reference/commentaries/tozer/pursuit-of-god.txt',
])

// ---------------------------------------------------------------------------
// Theological density filter
// Each candidate chunk must score ≥4 on this 21-word vocabulary to pass.
// This removes fiction chunks that slipped into whitelisted files.
// ---------------------------------------------------------------------------

const THEOL_WORDS = [
  'salvation', 'gospel', 'lord jesus', 'holy spirit', 'grace', 'sin',
  'repentance', 'forgiveness', 'scripture', 'righteousness', 'faith',
  'prayer', 'soul', 'sanctification', 'christ', 'god', 'eternal',
  'kingdom', 'cross', 'redemption', 'atonement',
]

function theologicalScore(content) {
  const lower = content.toLowerCase()
  return THEOL_WORDS.filter((w) => lower.includes(w)).length
}

const MIN_THEOL_SCORE = 4

const candidateChunks = corpus.filter((c) => {
  if (!WHITELISTED_SOURCES.has(c.source)) return false
  if (c.source === 'content/reference/SOURCE-BANK.md') return true // exempt: curated
  return theologicalScore(c.content) >= MIN_THEOL_SCORE
})

console.log(
  `Qualified theological chunks: ${candidateChunks.length} ` +
    `(from ${WHITELISTED_SOURCES.size} whitelisted sources)`,
)

// ---------------------------------------------------------------------------
// Theme keyword definitions
// ---------------------------------------------------------------------------

const THEMES = {
  grief: {
    primary: [
      'grief', 'grieve', 'grieving', 'sorrow', 'sorrowful', 'sorrowing',
      'mourning', 'mourn', 'lament', 'lamentation', 'weep', 'weeping',
      'tears', 'bereaved', 'bereavement',
    ],
    secondary: [
      'loss', 'affliction', 'brokenhearted', 'broken heart', 'anguish',
      'despair', 'consolation', 'comfort', 'desolate', 'desolation',
    ],
  },
  anxiety: {
    primary: [
      'anxiety', 'anxious', 'anxiously', 'worry', 'worrying', 'worried',
      'restless', 'restlessness', 'dread', 'fret', 'fretting',
    ],
    secondary: [
      'troubled', 'trouble', 'care', 'cares', 'cast thy care', 'do not fear',
      'peace of mind', 'disquiet', 'disquieted', 'unsettled', 'without anxiety',
    ],
  },
  doubt: {
    primary: [
      'doubt', 'doubting', 'doubter', 'doubts', 'unbelief', 'disbelief',
      'wavering', 'uncertainty', 'uncertain',
    ],
    secondary: [
      'questioning', 'little faith', 'weak faith', 'faith and reason',
      'darkness of soul', 'dark night', 'cannot believe', 'struggle to believe',
    ],
  },
  sin: {
    primary: [
      'sin', 'sinful', 'sinner', 'sinners', 'sins', 'transgression',
      'iniquity', 'repentance', 'repent', 'guilt', 'guilty',
      'mortification', 'temptation', 'tempted', 'wicked', 'wickedness',
    ],
    secondary: [
      'shame', 'confess', 'confession', 'forgiveness', 'forgive',
      'corrupt', 'fallen', 'flesh', 'concupiscence', 'lusts of the flesh',
    ],
  },
  hope: {
    primary: [
      'hope', 'hoping', 'hopeful', 'hopeless', 'promise', 'promised',
      'assurance', 'expectation', 'eternal life', 'resurrection',
      'confidence in God',
    ],
    secondary: [
      'wait on God', 'waiting on the Lord', 'redemption', 'salvation',
      'future glory', 'heaven', 'inherit', 'persevere', 'endurance',
    ],
  },
  busyness: {
    primary: [
      'busy', 'busyness', 'hurry', 'hurrying', 'rushing', 'distracted',
      'distraction', 'Martha', 'noise and clatter', 'worldly cares',
      'vanity of the world', 'vanity of vanities', 'earthly things',
    ],
    secondary: [
      'stillness', 'silence', 'quiet', 'solitude', 'rest in God',
      'temporal', 'cease', 'accumulation', 'covetousness',
    ],
  },
  identity: {
    primary: [
      'child of God', 'children of God', 'image of God', 'imago Dei',
      'beloved', 'chosen', 'adopted', 'new creation', 'new creature',
      'born again',
    ],
    secondary: [
      'worth', 'dignity', 'created in', 'knowledge of self', 'know thyself',
      'humility', 'self-knowledge', 'humble', 'pride of self', 'who we are',
    ],
  },
  suffering: {
    primary: [
      'suffering', 'suffer', 'affliction', 'afflict', 'pain', 'anguish',
      'persecution', 'tribulation', 'trial', 'trials', 'cross',
      'hardship', 'patient suffering', 'God in suffering',
    ],
    secondary: [
      'patience', 'longsuffering', 'long-suffering', 'perseverance',
      'refine', 'refining fire', 'furnace', 'chastening', 'discipline of God',
    ],
  },
  joy: {
    primary: [
      'joy', 'joyful', 'rejoice', 'rejoicing', 'gladness', 'glad',
      'delight', 'delighted', 'exult', 'exultation', 'blessedness',
    ],
    secondary: [
      'praise', 'thankful', 'gratitude', 'contentment', 'satisfaction',
      'fullness', 'abundant life', 'richness', 'celebrate', 'happiness',
    ],
  },
}

// ---------------------------------------------------------------------------
// Quote extraction
// ---------------------------------------------------------------------------

/**
 * Score a candidate passage for theological quoteability.
 */
function quoteScore(passage, themeKeywords) {
  const lower = passage.toLowerCase()
  let score = 0

  const primaryHits = themeKeywords.primary.filter((kw) =>
    lower.includes(kw.toLowerCase()),
  ).length
  const secondaryHits = themeKeywords.secondary.filter((kw) =>
    lower.includes(kw.toLowerCase()),
  ).length
  score += primaryHits * 4
  score += secondaryHits * 1

  // Theological vocabulary
  const theological = [
    'God', 'Christ', 'Lord', 'soul', 'heart', 'grace', 'faith',
    'Spirit', 'prayer', 'holy', 'divine', 'eternal', 'mercy',
    'salvation', 'righteousness', 'kingdom', 'glory',
  ]
  score += theological.filter((w) => passage.includes(w)).length

  // Direct address is more quotable
  if (/\b(we|our|us)\b/i.test(passage)) score += 2
  if (/\b(thou|thee|thy|you|your)\b/i.test(passage)) score += 1

  // Penalize pure narrative dialogue
  const narrativeHits = [
    'he said', 'she said', 'they said', 'replied', 'exclaimed',
  ].filter((s) => lower.includes(s)).length
  score -= narrativeHits * 3

  // Length preference
  const len = passage.length
  if (len > 80) score += 1
  if (len > 160) score += 1
  if (len > 300) score += 1
  if (len > 450) score -= 2

  return score
}

/**
 * Extract the best quotable passage from SOURCE-BANK blockquotes.
 * Returns the raw quote text (without the > " wrapping) or null.
 */
function extractSourceBankQuote(chunk, themeKeywords) {
  const content = chunk.content
  const quoteRe = /^> "([^"]+)"/gm
  let best = null
  let bestScore = -Infinity
  let m
  while ((m = quoteRe.exec(content)) !== null) {
    const candidate = m[1].trim()
    if (candidate.length < 40 || candidate.length > 600) continue
    // Verbatim check: the raw text must appear in the chunk
    if (!content.includes(candidate)) continue
    const s = quoteScore(candidate, themeKeywords)
    if (s > bestScore) {
      bestScore = s
      best = candidate
    }
  }
  if (!best || bestScore < 1) return null
  return best
}

/**
 * Split prose text into sentence spans (1, 2, or 3 sentences).
 */
function buildCandidateSpans(text) {
  const normalized = text.replace(/\s+/g, ' ').trim()
  const rawSentences = normalized.split(/(?<=[.!?])\s+(?=[A-Z"'"])/g)
  const sentences = rawSentences
    .map((s) => s.trim())
    .filter((s) => {
      if (s.length < 50 || s.length > 650) return false
      if (s === s.toUpperCase() && s.length < 80) return false // heading
      if (/^(CHAPTER|BOOK|PART|SECTION|THE [A-Z]+) [IVXLC0-9]/i.test(s)) return false
      return true
    })

  const spans = []
  for (let i = 0; i < sentences.length; i++) {
    spans.push(sentences[i])
    if (i + 1 < sentences.length) spans.push(sentences[i] + ' ' + sentences[i + 1])
    if (i + 2 < sentences.length) {
      spans.push(sentences[i] + ' ' + sentences[i + 1] + ' ' + sentences[i + 2])
    }
  }
  return spans
}

/**
 * Extract the best prose quote from a commentary chunk.
 */
function extractProseQuote(chunk, themeKeywords, minScore = 6) {
  const content = chunk.content
  const normalizedContent = content.replace(/\s+/g, ' ')
  const spans = buildCandidateSpans(content)
  if (spans.length === 0) return null

  let best = null
  let bestScore = -Infinity

  for (const span of spans) {
    if (span.length < 60 || span.length > 550) continue
    const normalizedSpan = span.replace(/\s+/g, ' ').trim()
    if (!normalizedContent.includes(normalizedSpan)) continue
    const s = quoteScore(normalizedSpan, themeKeywords)
    if (s > bestScore) {
      bestScore = s
      best = normalizedSpan
    }
  }

  if (!best || bestScore < minScore) return null
  return best
}

/**
 * Extract and verbatim-verify the best quote for a chunk + theme.
 * Returns null if no qualifying quote is found or the verbatim check fails.
 */
function extractBestQuote(chunk, themeKeywords) {
  const isSourceBank = chunk.source === 'content/reference/SOURCE-BANK.md'
  const quote = isSourceBank
    ? extractSourceBankQuote(chunk, themeKeywords)
    : extractProseQuote(chunk, themeKeywords)

  if (!quote) return null

  // Mandatory verbatim guard
  const normalizedChunk = chunk.content.replace(/\s+/g, ' ')
  const normalizedQuote = quote.replace(/\s+/g, ' ').trim()
  if (!normalizedChunk.includes(normalizedQuote)) {
    console.warn(`VERBATIM CHECK FAILED (skipped): ${chunk.id} — "${quote.slice(0, 60)}"`)
    return null
  }

  return quote
}

// ---------------------------------------------------------------------------
// Main extraction loop
// ---------------------------------------------------------------------------

let globalId = 0
function makeId(theme) {
  globalId++
  return `voice-bank:${theme}:${globalId}`
}

const bank = []
const perTheme = {}
const seenQuotes = new Set()

for (const [theme, themeKeywords] of Object.entries(THEMES)) {
  perTheme[theme] = []

  // Filter to chunks with at least one keyword hit
  const themeChunks = candidateChunks.filter((c) => {
    const text = (c.content + ' ' + c.keywords.join(' ')).toLowerCase()
    return (
      themeKeywords.primary.some((kw) => text.includes(kw.toLowerCase())) ||
      themeKeywords.secondary.some((kw) => text.includes(kw.toLowerCase()))
    )
  })

  // Sort by keyword density in chunk
  const scored = themeChunks
    .map((c) => {
      const text = (c.content + ' ' + c.keywords.join(' ')).toLowerCase()
      const ph = themeKeywords.primary.filter((kw) => text.includes(kw.toLowerCase())).length
      const sh = themeKeywords.secondary.filter((kw) => text.includes(kw.toLowerCase())).length
      return { chunk: c, cs: ph * 3 + sh }
    })
    .sort((a, b) => b.cs - a.cs)

  const attempted = new Set()

  for (const { chunk } of scored) {
    if (perTheme[theme].length >= 50) break
    if (attempted.has(chunk.id)) continue
    attempted.add(chunk.id)

    const quote = extractBestQuote(chunk, themeKeywords)
    if (!quote) continue
    if (seenQuotes.has(quote)) continue
    seenQuotes.add(quote)

    let author, work
    if (chunk.source === 'content/reference/SOURCE-BANK.md') {
      // Attempt to pull author from the section header preceding the blockquote
      const idx = chunk.content.indexOf(quote)
      if (idx >= 0) {
        const before = chunk.content.slice(Math.max(0, idx - 400), idx)
        const authorMatch = before.match(/\*\*([^*]+?)\s*\(\d{4}[-–]\d{4}\)\*\*\s*$/)
        author = authorMatch ? authorMatch[1].trim() : 'Historic Christian Writers'
        work = 'Source Bank'
      } else {
        author = 'Historic Christian Writers'
        work = 'Source Bank'
      }
    } else {
      const attrs = getDisplayAttribution(chunk)
      author = attrs.author
      work = attrs.work
    }

    perTheme[theme].push({
      id: makeId(theme),
      theme,
      quote,
      author,
      work,
      sourceChunkId: chunk.id,
    })
    bank.push(perTheme[theme][perTheme[theme].length - 1])
  }

  console.log(`  ${theme}: ${perTheme[theme].length} quotes`)
}

// ---------------------------------------------------------------------------
// Write output
// ---------------------------------------------------------------------------

const voicesDir = join(ROOT, 'content', 'voices')
const byThemeDir = join(voicesDir, 'by-theme')
mkdirSync(byThemeDir, { recursive: true })

writeFileSync(join(voicesDir, 'voice-bank.json'), JSON.stringify(bank, null, 2), 'utf8')

for (const [theme, entries] of Object.entries(perTheme)) {
  writeFileSync(join(byThemeDir, `${theme}.json`), JSON.stringify(entries, null, 2), 'utf8')
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log('\n=== VOICE BANK BUILD COMPLETE ===')
console.log(`Total entries: ${bank.length}`)
console.log('\nPer-theme breakdown:')
for (const [theme, entries] of Object.entries(perTheme)) {
  const status = entries.length < 30 ? '  ⚠  THIN (<30)' : ''
  console.log(`  ${theme.padEnd(12)}: ${entries.length}${status}`)
}

// 6 eyeball samples (one per representative theme)
console.log('\n--- 6 Sample Entries ---')
for (const theme of ['grief', 'anxiety', 'doubt', 'sin', 'suffering', 'joy']) {
  const sample = perTheme[theme]?.[0]
  if (!sample) continue
  console.log(`\n[${theme.toUpperCase()}]`)
  console.log(`  Author: ${sample.author}`)
  console.log(`  Work:   ${sample.work}`)
  console.log(
    `  Quote:  "${sample.quote.slice(0, 150)}${sample.quote.length > 150 ? '...' : ''}"`,
  )

  const srcChunk = corpus.find((c) => c.id === sample.sourceChunkId)
  const normalizedChunk = (srcChunk?.content ?? '').replace(/\s+/g, ' ')
  const normalizedQuote = sample.quote.replace(/\s+/g, ' ').trim()
  console.log(`  Verbatim: ${normalizedChunk.includes(normalizedQuote) ? 'PASS' : 'FAIL'}`)
}

// Full-bank verbatim audit
const failures = bank.filter((e) => {
  const src = corpus.find((c) => c.id === e.sourceChunkId)
  if (!src) return true
  return !src.content.replace(/\s+/g, ' ').includes(e.quote.replace(/\s+/g, ' ').trim())
})
console.log(
  `\nVerbatim guard: ${bank.length - failures.length}/${bank.length} pass` +
    (failures.length > 0 ? ` (${failures.length} FAILED — investigate)` : ''),
)

// Author diversity report
const authorCounts = {}
for (const e of bank) {
  authorCounts[e.author] = (authorCounts[e.author] || 0) + 1
}
console.log('\nAuthor breakdown (top 15):')
Object.entries(authorCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 15)
  .forEach(([a, n]) => console.log(`  ${String(n).padStart(3)}  ${a}`))

console.log('\nFiles written:')
console.log(`  content/voices/voice-bank.json (${bank.length} entries)`)
console.log(`  content/voices/by-theme/*.json (${Object.keys(perTheme).length} files)`)
