/**
 * Step 2 of the red-letter cross-reference (F-095 / SA-051).
 *
 * Maps the KJV OSIS attribution onto BSB wording. KJV and BSB share verse
 * boundaries, so the verse is the join key and no textual similarity matching
 * is needed.
 *
 * TWO CASES, and only one of them involves any inference:
 *
 *  WHOLE-VERSE (1,427 of 2,081 spans). The KJV marks the entire verse as
 *  Christ speaking, so the entire BSB verse is His. Direct, exact, nothing
 *  guessed. This covers the long discourses — the Sermon on the Mount, the
 *  Upper Room — which is where most red letter lives. Note BSB opens a quote
 *  at the start of a multi-verse speech and does not re-open it each verse, so
 *  taking the whole verse is right and quote-counting would be wrong.
 *
 *  PARTIAL (654). Christ's words are part of the verse — typically where a
 *  speech opens ("Then Jesus told him,") or a second speaker is present. Here
 *  the BSB quoted spans are aligned against the KJV span POSITION inside the
 *  verse. Where that alignment is not unambiguous the verse is SKIPPED and
 *  logged, never guessed.
 *
 * Under-marking is a typographic omission. Over-marking is a false
 * attribution. The tie always goes to skipping.
 */
import fs from 'node:fs'
import path from 'node:path'

const BSB_DIR = '/tmp/bsb'
const SPANS = 'scripts/red-letter/kjv-spans.json'
const OUT = 'src/data/red-letter-bsb.json'
const REPORT = 'scripts/red-letter/report.json'

// OSIS book code -> BSB USFM filename
const BOOKS = {
  Matt: '41MATBSB.usfm',
  Mark: '42MRKBSB.usfm',
  Luke: '43LUKBSB.usfm',
  John: '44JHNBSB.usfm',
  Acts: '45ACTBSB.usfm',
  Rev: '67REVBSB.usfm',
}

/** Strip USFM inline markup, footnotes and cross-references from verse text. */
function cleanVerse(raw) {
  return raw
    .replace(/\\f\s.*?\\f\*/gs, '')   // footnotes
    .replace(/\\x\s.*?\\x\*/gs, '')   // cross references
    .replace(/\\[a-z]+\d*\*/g, '')    // closing inline markers
    .replace(/\\[a-z]+\d*\s?/g, '')   // opening inline markers + paragraph tags
    .replace(/\s+/g, ' ')
    .trim()
}

/** book -> { "3.16": "verse text" } */
function parseBook(file) {
  const usfm = fs.readFileSync(path.join(BSB_DIR, file), 'utf8')
  const verses = {}
  let chapter = null
  // Split on chapter and verse markers, keeping order.
  const re = /\\c\s+(\d+)|\\v\s+(\d+)\s?([\s\S]*?)(?=\\v\s+\d+|\\c\s+\d+|$)/g
  let m
  while ((m = re.exec(usfm)) !== null) {
    if (m[1]) { chapter = m[1]; continue }
    if (m[2] && chapter) {
      const text = cleanVerse(m[3] || '')
      if (text) verses[`${chapter}.${m[2]}`] = text
    }
  }
  return verses
}

/**
 * Quoted spans in a BSB verse, with their position.
 *
 * BSB follows the standard convention for multi-verse speech: it opens the
 * quote once and does not close it until the speech ends, so a verse may carry
 * an OPENING quote with no close (speech runs to the end of the verse) or a
 * CLOSING quote with no open (speech runs from the start). Requiring a matched
 * pair inside one verse skipped 225 verses on the first pass, John 14:6 among
 * them — the opening of "I am the way and the truth and the life", which does
 * not close until verse 7.
 */
function quotedSpans(text) {
  const out = []
  const OPEN = '\u201c'
  const CLOSE = '\u201d'
  let i = 0
  let openAt = null
  while (i < text.length) {
    const ch = text[i]
    if ((ch === OPEN || ch === '"') && openAt === null) {
      openAt = i
    } else if ((ch === CLOSE || ch === '"') && openAt !== null) {
      out.push({
        text: text.slice(openAt + 1, i).trim(),
        start: openAt,
        end: i + 1,
        closed: true,
      })
      openAt = null
    }
    i += 1
  }
  if (openAt !== null) {
    // Opened and never closed: the speech continues past this verse.
    out.push({
      text: text.slice(openAt + 1).trim(),
      start: openAt,
      end: text.length,
      closed: false,
    })
  } else if (out.length === 0 && (text.includes(CLOSE) || text.includes('"'))) {
    // Closes a speech opened in an earlier verse: it runs from the start.
    const at = Math.max(text.indexOf(CLOSE), text.indexOf('"'))
    out.push({ text: text.slice(0, at).trim(), start: 0, end: at, closed: true })
  }
  return out.filter((q) => q.text.length > 0)
}

const kjv = JSON.parse(fs.readFileSync(SPANS, 'utf8'))
const bsbCache = {}
const result = {}
const report = { whole: 0, alignedPartial: 0, skipped: [], noVerse: [] }

for (const [osisId, entry] of Object.entries(kjv)) {
  const [book, ch, v] = osisId.split('.')
  if (!BOOKS[book]) continue
  if (!bsbCache[book]) bsbCache[book] = parseBook(BOOKS[book])
  const verseText = bsbCache[book][`${ch}.${v}`]
  if (!verseText) { report.noVerse.push(osisId); continue }

  const spans = entry.spans
  const allWhole = spans.every((s) => s.whole)

  if (allWhole) {
    // The whole verse is His. Strip an opening/closing quote if BSB wraps it.
    const bare = verseText.replace(/^[“"]/, '').replace(/[”"]$/, '').trim()
    result[osisId] = [bare]
    report.whole += 1
    continue
  }

  // Partial: align against BSB's quoted spans by position within the verse.
  const quotes = quotedSpans(verseText)
  const partials = spans.filter((s) => !s.whole)

  if (quotes.length === 0) {
    report.skipped.push({ ref: osisId, why: 'partial span, no quotes in BSB verse' })
    continue
  }

  if (quotes.length === partials.length) {
    // Same number of speech spans in both editions — map in order.
    result[osisId] = quotes.map((q) => q.text)
    report.alignedPartial += 1
    continue
  }

  if (partials.length === 1 && quotes.length > 1) {
    // One span of His among several speakers. Pick the quote whose position
    // best matches the KJV span's position in the verse.
    const target = (partials[0].startFrac + partials[0].endFrac) / 2
    const len = verseText.length || 1
    let best = null
    let bestDelta = Infinity
    for (const q of quotes) {
      const mid = (q.start + q.end) / 2 / len
      const delta = Math.abs(mid - target)
      if (delta < bestDelta) { bestDelta = delta; best = q }
    }
    // Only accept a clearly closer match; otherwise skip rather than guess.
    if (best && bestDelta < 0.25) {
      result[osisId] = [best.text]
      report.alignedPartial += 1
    } else {
      report.skipped.push({ ref: osisId, why: `ambiguous position (delta ${bestDelta.toFixed(2)})` })
    }
    continue
  }

  report.skipped.push({
    ref: osisId,
    why: `span/quote count mismatch (KJV ${partials.length}, BSB ${quotes.length})`,
  })
}

fs.writeFileSync(OUT, JSON.stringify(result, null, 0))
fs.writeFileSync(REPORT, JSON.stringify(report, null, 1))

const total = Object.keys(result).length
console.log(`verses mapped to BSB wording : ${total}`)
console.log(`  whole-verse (exact)        : ${report.whole}`)
console.log(`  partial, aligned           : ${report.alignedPartial}`)
console.log(`  SKIPPED (left black)       : ${report.skipped.length}`)
console.log(`  verse missing from BSB     : ${report.noVerse.length}`)
console.log(`wrote ${OUT}`)
