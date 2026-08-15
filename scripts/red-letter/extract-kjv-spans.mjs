/**
 * Step 1 of the red-letter cross-reference (F-095 / SA-051).
 *
 * Reads the KJV OSIS on disk and emits, per verse, the segments the edition
 * attributes to Christ — with their POSITION inside the verse, which is what
 * makes the BSB alignment in step 2 possible without guessing.
 *
 * The OSIS is milestone-based: <q who="Jesus" sID="Luke.10.37.seID.33403" />
 * opens and a bare <q eID="…same id…" /> closes. Text between them is His.
 * Crucially it EXCLUDES other speakers inside the same verse — Luke 10:37
 * marks only "Go, and do thou likewise." and leaves the lawyer's reply out,
 * which is the case a quotation-mark pass gets wrong.
 */
import fs from 'node:fs'

const OSIS = 'content/reference/bibles/open-bibles/eng-kjv.osis.xml'
const OUT = 'scripts/red-letter/kjv-spans.json'

const xml = fs.readFileSync(OSIS, 'utf8')

// Walk the document once, tracking the open verse and any open Jesus quote.
const token = /<verse osisID="([^"]+)"[^>]*sID="[^"]*"[^>]*\/>|<verse eID="[^"]*"\s*\/>|<q who="Jesus"[^>]*sID="([^"]+)"[^>]*\/>|<q eID="([^"]+)"\s*\/>|<[^>]+>/g

const verses = {} // osisID -> { text, spans:[{start,end}] }
let verseId = null
let buf = ''
let openQuote = null
let last = 0

const flushText = (upto) => {
  if (verseId === null) return
  buf += xml.slice(last, upto)
}

let m
while ((m = token.exec(xml)) !== null) {
  flushText(m.index)
  last = token.lastIndex

  if (m[1]) {
    // verse start
    verseId = m[1]
    buf = ''
    verses[verseId] = { text: '', spans: [] }
    openQuote = null
  } else if (m[0].startsWith('<verse eID')) {
    if (verseId) {
      verses[verseId].text = buf
      verseId = null
    }
  } else if (m[2]) {
    // Jesus quote opens — record where in the verse it starts
    openQuote = { id: m[2], start: buf.length }
  } else if (m[3]) {
    // a quote closes; only care if it is the Jesus one we opened
    if (openQuote && openQuote.id === m[3] && verseId) {
      verses[verseId].spans.push({ start: openQuote.start, end: buf.length })
      openQuote = null
    }
  }
  // every other tag is skipped, and its text is simply not accumulated
}

const clean = (s) =>
  s.replace(/\s+/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim()

const out = {}
let spanCount = 0
for (const [id, v] of Object.entries(verses)) {
  if (!v.spans.length) continue
  const text = v.text
  const total = text.length || 1
  out[id] = {
    // Fraction of the verse each span covers, and whether it is the whole verse.
    spans: v.spans.map((s) => {
      const frag = clean(text.slice(s.start, s.end))
      const before = clean(text.slice(0, s.start))
      const after = clean(text.slice(s.end))
      spanCount += 1
      return {
        text: frag,
        startFrac: +(s.start / total).toFixed(3),
        endFrac: +(s.end / total).toFixed(3),
        // "whole" means nothing meaningful precedes or follows it in the verse
        whole: before.length <= 2 && after.length <= 2,
        leadIn: before.slice(-60),
        trailing: after.slice(0, 60),
      }
    }),
    verseText: clean(text),
  }
}

fs.writeFileSync(OUT, JSON.stringify(out, null, 1))
const wholes = Object.values(out).flatMap((v) => v.spans).filter((s) => s.whole).length
console.log(`verses with Christ's words : ${Object.keys(out).length}`)
console.log(`spans                      : ${spanCount}`)
console.log(`  whole-verse              : ${wholes}  (map to BSB directly)`)
console.log(`  partial                  : ${spanCount - wholes}  (need alignment)`)
console.log(`wrote ${OUT}`)
