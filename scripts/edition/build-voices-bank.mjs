#!/usr/bin/env node
/**
 * build-voices-bank.mjs — The Voices bank.
 *
 * Extracts real, attributed quotes from the committed reference index
 * (public/reference-index.json — the only reference index in git; the
 * "slim" variant named in older docs no longer exists on disk or in git)
 * and writes src/data/voices-bank.json as { entries: [{quote, author, work}] }.
 *
 * ATTRIBUTION IS VERIFIED, NOT ASSUMED. A prior corpus audit
 * (scripts/build-voice-bank.mjs) discovered that many files under
 * content/reference/commentaries/ are mislabeled Project Gutenberg bundles —
 * e.g. spurgeon/all-of-grace.txt is Willa Cather fiction, murray/* are
 * assorted novels, wesley/sermons-...-vol1.txt is literally a Gutenberg 404
 * HTML page. This script therefore trusts NOTHING from the file path alone:
 *
 *   1. Every commentary source must appear in TRUE_WORKS below, whose
 *      `headerMarker` is the title line found INSIDE the local file
 *      (the Gutenberg "eBook of ..." line or a "Title:" line). The script
 *      re-reads each local file and hard-fails if the marker is absent.
 *      Note the douglass file shuffle: life-and-times-....txt actually
 *      contains "My Bondage and My Freedom" — the attribution below follows
 *      the file's REAL content, not its filename.
 *   2. Every accepted quote is whitespace-normalized and asserted to be a
 *      verbatim substring of the local source file. No match, no entry.
 *   3. SOURCE-BANK.md quotes carry their own explicit citations; any whose
 *      citation is flagged ("commonly attributed", "unverified",
 *      "paraphrase", ...) is excluded rather than attributed.
 *
 * Candidate tiers (all end up as 30-110-word complete-sentence quotes):
 *   A. SOURCE-BANK.md blockquotes with clean explicit citations.
 *   B. Whole index chunks already 30-110 words from verified sources.
 *   C. Verbatim 1-3-sentence spans (30-110 words) from longer chunks of
 *      verified sources — max one span per chunk. Included because tiers
 *      A+B alone yield ~50 candidates, under the 100-entry floor; spans
 *      keep attribution exactly as honest (verbatim words from the named
 *      work) while reaching the floor.
 *
 * Cleaning collapses whitespace runs to single spaces and trims — no inner
 * word is ever altered. Near-duplicates are dropped. Output is capped at the
 * 200 best by quality score (complete sentences, reflective register).
 *
 * Usage:  node scripts/edition/build-voices-bank.mjs
 * Requires the local reference library (content/reference/, gitignored) so
 * the verbatim + true-title gates can run. Fails loudly without it.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const ROOT = join(dirname(__filename), '..', '..')

const INDEX_PATH = join(ROOT, 'public', 'reference-index.json')
const OUT_PATH = join(ROOT, 'src', 'data', 'voices-bank.json')
const SOURCE_BANK = 'content/reference/SOURCE-BANK.md'

const MIN_WORDS = 30
const MAX_WORDS = 110
const FLOOR = 100
const CAP = 200
const PER_AUTHOR_CAP = 24

function fail(msg) {
  console.error(`ERROR: ${msg}`)
  process.exit(1)
}

if (!existsSync(INDEX_PATH)) fail(`missing ${INDEX_PATH}`)
const corpus = JSON.parse(readFileSync(INDEX_PATH, 'utf8'))
if (!Array.isArray(corpus) || corpus.length === 0) {
  fail('reference index is not a non-empty array')
}
console.log(`Loaded ${corpus.length} index chunks.`)

// ---------------------------------------------------------------------------
// Verified sources: indexed path -> real author + real work, with the title
// marker that must appear inside the local file itself.
// ---------------------------------------------------------------------------

const TRUE_WORKS = {
  'content/reference/commentaries/augustine/city-of-god.txt': {
    author: 'Augustine of Hippo',
    work: 'The City of God',
    headerMarker: 'eBook of The City of God',
  },
  'content/reference/commentaries/bounds/power-through-prayer.txt': {
    author: 'E.M. Bounds',
    work: 'Power Through Prayer',
    headerMarker: 'eBook of Power Through Prayer',
  },
  'content/reference/commentaries/brother-lawrence/practice-of-presence-of-god.txt':
    {
      author: 'Brother Lawrence',
      work: 'The Practice of the Presence of God',
      headerMarker: 'eBook of The Practice of the Presence of God',
    },
  'content/reference/commentaries/bunyan/grace-abounding.txt': {
    author: 'John Bunyan',
    work: 'Grace Abounding to the Chief of Sinners',
    headerMarker: 'eBook of Grace Abounding to the Chief of Sinners',
  },
  'content/reference/commentaries/bunyan/pilgrims-progress.txt': {
    author: 'John Bunyan',
    work: "The Pilgrim's Progress",
    headerMarker: "eBook of The Pilgrim's Progress",
  },
  'content/reference/commentaries/calvin/institutes-of-the-christian-religion-vol1.txt':
    {
      author: 'John Calvin',
      work: 'Institutes of the Christian Religion',
      headerMarker: 'eBook of Institutes of the Christian Religion',
    },
  'content/reference/commentaries/chesterton/everlasting-man.txt': {
    author: 'G.K. Chesterton',
    work: 'The Everlasting Man',
    headerMarker: 'eBook of The Everlasting Man',
  },
  'content/reference/commentaries/chesterton/heretics.txt': {
    author: 'G.K. Chesterton',
    work: 'Heretics',
    headerMarker: 'eBook of Heretics',
  },
  'content/reference/commentaries/chesterton/orthodoxy.txt': {
    author: 'G.K. Chesterton',
    work: 'Orthodoxy',
    headerMarker: 'eBook of Orthodoxy',
  },
  // The douglass files are shuffled relative to their names — attribution
  // follows each file's actual Gutenberg header, not the filename.
  'content/reference/commentaries/douglass/life-and-times-of-frederick-douglass.txt':
    {
      author: 'Frederick Douglass',
      work: 'My Bondage and My Freedom',
      headerMarker: 'eBook of My Bondage and My Freedom',
    },
  'content/reference/commentaries/douglass/my-bondage-and-my-freedom.txt': {
    author: 'Frederick Douglass',
    work: 'Collected Articles of Frederick Douglass',
    headerMarker: 'eBook of Collected Articles of Frederick Douglass',
  },
  'content/reference/commentaries/douglass/narrative-of-the-life-of-frederick-douglass.txt':
    {
      author: 'Frederick Douglass',
      work: 'Narrative of the Life of Frederick Douglass',
      headerMarker: 'eBook of Narrative of the Life of Frederick Douglass',
    },
  // The file named for the single sermon actually holds the wider collection.
  'content/reference/commentaries/edwards/sinners-in-the-hands-of-an-angry-god.txt':
    {
      author: 'Jonathan Edwards',
      work: 'Selected Sermons of Jonathan Edwards',
      headerMarker: 'eBook of Selected Sermons of Jonathan Edwards',
    },
  'content/reference/commentaries/hannah-whitall-smith/christians-secret.txt':
    {
      author: 'Hannah Whitall Smith',
      work: "The Christian's Secret of a Happy Life",
      headerMarker: "Title: The Christian's Secret of a Happy Life",
    },
  'content/reference/commentaries/luther/commentary-on-galatians.txt': {
    author: 'Martin Luther',
    work: 'Commentary on the Epistle to the Galatians',
    headerMarker: 'eBook of Commentary on the Epistle to the Galatians',
  },
  'content/reference/commentaries/owen/mortification-of-sin.txt': {
    author: 'John Owen',
    work: 'Of the Mortification of Sin in Believers',
    headerMarker: 'Title: Of the Mortification of Sin in Believers',
  },
  'content/reference/commentaries/pascal/pensees.txt': {
    author: 'Blaise Pascal',
    work: 'Pensées',
    headerMarker: "eBook of Pascal's Pens",
  },
  'content/reference/commentaries/thomas-a-kempis/imitation-of-christ.txt': {
    author: 'Thomas à Kempis',
    work: 'The Imitation of Christ',
    headerMarker: 'eBook of The Imitation of Christ',
  },
  'content/reference/commentaries/tozer/pursuit-of-god.txt': {
    author: 'A.W. Tozer',
    work: 'The Pursuit of God',
    headerMarker: 'eBook of The Pursuit of God',
  },
  // KNOWN CONTAMINATED, NEVER ATTRIBUTE (verified via in-file headers):
  //   spurgeon/* (Willa Cather / travelogue / naval history),
  //   murray/* (assorted fiction), luther/large-catechism (Wilkie Collins),
  //   edwards/{religious-affections,freedom-of-will,true-virtue} (fiction),
  //   wesley/sermons-* (fiction + a literal Gutenberg 404 page),
  //   whitefield/sermons.txt (western fiction).
}

// ---------------------------------------------------------------------------
// Local-file verification (true titles + verbatim base texts)
// ---------------------------------------------------------------------------

const normWs = (s) => s.replace(/\s+/g, ' ').trim()

const verifiedFiles = new Map() // source path -> normalized full text
for (const [src, meta] of Object.entries(TRUE_WORKS)) {
  const abs = join(ROOT, src)
  if (!existsSync(abs)) {
    fail(
      `local reference file missing: ${src}\n` +
        'The gitignored reference library is required so attribution can be ' +
        'verified against the actual file contents. Run ./scripts/sync-reference.sh first.',
    )
  }
  const text = readFileSync(abs, 'utf8')
  if (!text.slice(0, 4000).includes(meta.headerMarker)) {
    fail(
      `title verification failed for ${src}: expected header marker ` +
        `"${meta.headerMarker}" — the file's contents have drifted from the ` +
        'audited identity. Refusing to attribute.',
    )
  }
  verifiedFiles.set(src, normWs(text))
}
const sourceBankAbs = join(ROOT, SOURCE_BANK)
if (!existsSync(sourceBankAbs)) fail(`local reference file missing: ${SOURCE_BANK}`)
verifiedFiles.set(SOURCE_BANK, normWs(readFileSync(sourceBankAbs, 'utf8')))
console.log(`Verified ${verifiedFiles.size} local source files (true titles).`)

// ---------------------------------------------------------------------------
// Quote hygiene
// ---------------------------------------------------------------------------

const wordCount = (s) => s.split(/\s+/).filter(Boolean).length

const BANNED_SUBSTRINGS = [
  'gutenberg',
  'ebook',
  'e-book',
  'transcrib',
  'copyright',
  'www.',
  'http',
  'isbn',
  'chapter',
  'footnote',
  'contents',
  'appendix',
  'preface',
  'editor',
]

/** A candidate must read as one or more clean, complete sentences. */
function isCleanQuote(q) {
  const wc = wordCount(q)
  if (wc < MIN_WORDS || wc > MAX_WORDS) return false
  if (!/^["“]?[A-Z]/.test(q)) return false
  if (!/[.!?]["”]?$/.test(q)) return false
  // Trailing abbreviation means the "sentence" is actually cut short.
  if (/\b(Mr|Mrs|Dr|St|etc|viz|vol|ver|cf|chap|i\.e|e\.g)\.$/i.test(q)) {
    return false
  }
  const lower = q.toLowerCase()
  if (BANNED_SUBSTRINGS.some((b) => lower.includes(b))) return false
  // Markup, refs, and layout artifacts.
  if (/[_*#[\]{}|=<>@/\\%+~^]/.test(q)) return false
  if (/\d/.test(q)) return false // digits in this corpus are refs/footnotes
  if (/\b[IVXLC]{2,}\b/.test(q)) return false // roman-numeral refs
  if (/\b[A-Z]{4,}\b/.test(q)) return false // shouting = heading debris
  if (/[a-z]- [a-z]/.test(q)) return false // broken line-wrap hyphenation
  // Balanced quoting/parens.
  if (((q.match(/"/g) || []).length & 1) === 1) return false
  if ((q.match(/“/g) || []).length !== (q.match(/”/g) || []).length) return false
  if ((q.match(/\(/g) || []).length !== (q.match(/\)/g) || []).length) {
    return false
  }
  return true
}

const REFLECTIVE_VOCAB = [
  'god',
  'christ',
  'lord',
  'grace',
  'faith',
  'prayer',
  'soul',
  'heart',
  'love',
  'hope',
  'mercy',
  'holy',
  'spirit',
  'eternal',
  'heaven',
  'sin',
  'peace',
  'joy',
  'glory',
  'truth',
  'life',
  'freedom',
  'liberty',
]

function scoreQuote(q, tierBonus) {
  let score = tierBonus
  const lower = q.toLowerCase()
  for (const w of REFLECTIVE_VOCAB) {
    if (new RegExp(`\\b${w}\\b`).test(lower)) score += 2
  }
  const wc = wordCount(q)
  if (wc <= 60) score += 4 // aphoristic beats sprawling
  if (wc <= 45) score += 2
  if (/\b(we|our|us)\b/i.test(q)) score += 3
  if (/\b(you|your|thou|thy|thee)\b/i.test(q)) score += 2
  if (/\b(said|replied|answered|exclaimed|cried|quoth)\b/i.test(q)) score -= 6
  if (q.includes('"') || q.includes('“')) score -= 4 // dialogue, not voice
  return score
}

// ---------------------------------------------------------------------------
// Tier A — SOURCE-BANK.md blockquotes with clean explicit citations
// ---------------------------------------------------------------------------

const CITATION_RED_FLAGS =
  /commonly attributed|widely attributed|unverified|paraphras|difficult to verify|use with caution|use with attribution/i

function collectSourceBankCandidates() {
  const out = []
  const chunks = corpus.filter((c) => c.source === SOURCE_BANK)
  for (const chunk of chunks) {
    const lines = chunk.content.split('\n')
    let currentAuthor = null
    for (let i = 0; i < lines.length; i += 1) {
      const header = lines[i].match(/^\*\*(.+?)\s*\(\d{3,4}[^)]*\)\*\*\s*$/)
      if (header) {
        currentAuthor = header[1].trim()
        continue
      }
      const quoteMatch = lines[i].match(/^>\s*"(.+)"\s*$/)
      if (!quoteMatch || !currentAuthor) continue
      // Find the citation line that follows this quote.
      let citation = null
      for (let j = i + 1; j < Math.min(i + 6, lines.length); j += 1) {
        const cm = lines[j].match(/^\*Citation:\*\s*(.+)$/)
        if (cm) {
          citation = cm[1].trim()
          break
        }
        if (/^>\s*"/.test(lines[j])) break // next quote, no citation found
      }
      if (!citation) continue
      if (CITATION_RED_FLAGS.test(citation)) continue // honest exclusion
      const workMatch = citation.match(/\*([^*]+)\*/)
      if (!workMatch) continue // no named work — exclude, don't invent one
      const quote = normWs(quoteMatch[1])
      out.push({
        quote,
        author: currentAuthor,
        work: normWs(workMatch[1]).replace(/,$/, ''),
        tier: 'A',
        verifySource: SOURCE_BANK,
        orderKey: `${chunk.id}:${i}`,
      })
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Tier B — whole chunks already in the 30-110-word window
// Tier C — best 1-3-sentence verbatim span from longer chunks
// ---------------------------------------------------------------------------

function splitSentences(normalizedText) {
  return normalizedText
    .split(/(?<=[.!?]["”]?)\s+(?=["“]?[A-Z])/g)
    .map((s) => s.trim())
    .filter(Boolean)
}

function collectCommentaryCandidates() {
  const out = []
  for (const chunk of corpus) {
    const meta = TRUE_WORKS[chunk.source]
    if (!meta) continue
    const content = normWs(chunk.content)
    const wc = wordCount(content)
    if (wc >= MIN_WORDS && wc <= MAX_WORDS) {
      out.push({
        quote: content,
        author: meta.author,
        work: meta.work,
        tier: 'B',
        verifySource: chunk.source,
        orderKey: chunk.id,
      })
      continue
    }
    if (wc <= MAX_WORDS) continue
    // Tier C: the single best clean sentence span in this chunk.
    const sentences = splitSentences(content)
    let best = null
    let bestScore = -Infinity
    for (let i = 0; i < sentences.length; i += 1) {
      let span = ''
      for (let len = 1; len <= 3 && i + len <= sentences.length; len += 1) {
        span = span ? `${span} ${sentences[i + len - 1]}` : sentences[i]
        if (!isCleanQuote(span)) continue
        const s = scoreQuote(span, 0)
        if (s > bestScore) {
          bestScore = s
          best = span
        }
      }
    }
    if (best) {
      out.push({
        quote: best,
        author: meta.author,
        work: meta.work,
        tier: 'C',
        verifySource: chunk.source,
        orderKey: chunk.id,
      })
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Assemble: hygiene gate, verbatim gate, dedupe, rank, cap
// ---------------------------------------------------------------------------

const TIER_BONUS = { A: 40, B: 12, C: 0 }

const raw = [...collectSourceBankCandidates(), ...collectCommentaryCandidates()]
console.log(`Raw candidates: ${raw.length}`)

const gated = raw.filter((c) => isCleanQuote(c.quote))
console.log(`After hygiene gate: ${gated.length}`)

let verbatimFailures = 0
const verified = gated.filter((c) => {
  const base = verifiedFiles.get(c.verifySource)
  if (base && base.includes(c.quote)) return true
  verbatimFailures += 1
  return false
})
if (verbatimFailures > 0) {
  console.log(`Verbatim gate dropped ${verbatimFailures} candidates.`)
}
console.log(`Verbatim-verified: ${verified.length}`)

const scored = verified
  .map((c) => ({ ...c, score: scoreQuote(c.quote, TIER_BONUS[c.tier]) }))
  .sort(
    (a, b) => b.score - a.score || a.orderKey.localeCompare(b.orderKey),
  )

const dedupeKey = (q) => q.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ')

const accepted = []
const acceptedKeys = []
const perAuthor = new Map()

function tryAccept(c, enforceAuthorCap) {
  const key = dedupeKey(c.quote)
  for (const k of acceptedKeys) {
    if (k.includes(key) || key.includes(k)) return false // near-identical
  }
  const count = perAuthor.get(c.author) ?? 0
  if (enforceAuthorCap && count >= PER_AUTHOR_CAP) return false
  accepted.push(c)
  acceptedKeys.push(key)
  perAuthor.set(c.author, count + 1)
  return true
}

for (const c of scored) {
  if (accepted.length >= CAP) break
  tryAccept(c, true)
}
if (accepted.length < CAP) {
  for (const c of scored) {
    if (accepted.length >= CAP) break
    if (accepted.includes(c)) continue
    tryAccept(c, false)
  }
}

console.log(`Accepted: ${accepted.length} (floor ${FLOOR}, cap ${CAP})`)
if (accepted.length < FLOOR) {
  console.warn(
    `NOTE: only ${accepted.length} honest entries — below the ${FLOOR} floor. ` +
      'Shipping what is honest rather than loosening attribution.',
  )
}

const entries = accepted.map(({ quote, author, work }) => ({
  quote,
  author,
  work,
}))

writeFileSync(OUT_PATH, `${JSON.stringify({ entries }, null, 2)}\n`, 'utf8')
console.log(`Wrote ${entries.length} entries -> ${OUT_PATH}`)

const byAuthor = {}
for (const e of entries) byAuthor[e.author] = (byAuthor[e.author] ?? 0) + 1
console.log('Per-author breakdown:')
for (const [a, n] of Object.entries(byAuthor).sort((x, y) => y[1] - x[1])) {
  console.log(`  ${a}: ${n}`)
}
const tiers = { A: 0, B: 0, C: 0 }
for (const c of accepted) tiers[c.tier] += 1
console.log(`Tiers: A(source-bank cited)=${tiers.A} B(whole chunk)=${tiers.B} C(sentence span)=${tiers.C}`)
