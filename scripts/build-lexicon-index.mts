#!/usr/bin/env tsx
/**
 * build-lexicon-index.mts
 *
 * Precomputes a compact, Workers-safe index from the ~27 MB of lexicon XML in
 * content/reference/ so that src/lib/soul-audit/lexicon.ts never parses XML on
 * the request path (the Cloudflare Workers free plan's 10 ms CPU budget can't
 * afford it). Output (committed to public/, like reference-index.json):
 *
 *   public/lexicon-strongs.json  { [strong]: { word, xlit, gloss, source } }
 *   public/lexicon-verses.json   { [canonical]: VerseEntry[] }
 *
 * The build REUSES the exact parsing/ranking helpers exported from lexicon.ts,
 * so the precomputed output is identical to what runtime XML parsing produced.
 *
 * Run:    npx tsx scripts/build-lexicon-index.mts
 * Wired:  npm run build:lexicon-index
 *
 * Deterministic — no Date.now()/Math.random(). Re-running on the same corpus
 * yields byte-identical output.
 */

import fs from 'node:fs'
import path from 'node:path'
import { parseReference } from '../src/lib/bible/parseReference'
import {
  loadHebrewStrong,
  loadAbbottSmith,
  loadGreekStrong,
  buildStrongEntry,
  hebrewBookEntries,
  greekBookEntries,
  enumerateHebrewVerses,
  enumerateGreekVerses,
  computeHebrewVerseEntries,
  computeGreekVerseEntries,
  canonicalVerseKey,
  entryToTuple,
  StringPool,
  type PrecomputedStrongEntry,
  type PrecomputedStrongsIndex,
  type PrecomputedVersesIndex,
} from '../src/lib/soul-audit/lexicon'

const PUBLIC_DIR = path.join(process.cwd(), 'public')
const STRONGS_OUT = path.join(PUBLIC_DIR, 'lexicon-strongs.json')
const VERSES_OUT = path.join(PUBLIC_DIR, 'lexicon-verses.json')

function fmtBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

async function buildStrongsIndex(): Promise<PrecomputedStrongsIndex> {
  // Enumerate every Strong's id reachable by getWordStudyByStrong:
  //   Hebrew: every id in Strong's Hebrew dictionary.
  //   Greek:  union of Abbott-Smith and Strong's Greek dictionary ids.
  const hebrew = await loadHebrewStrong()
  const abbott = await loadAbbottSmith()
  const greek = await loadGreekStrong()

  const ids = new Set<string>()
  for (const id of hebrew.keys()) ids.add(id) // already "H####"
  for (const id of abbott.keys()) ids.add(id) // "G####"
  for (const id of greek.keys()) ids.add(id) // "G####"

  const sorted = [...ids].sort((a, b) => {
    // Stable, deterministic ordering: language then numeric.
    if (a[0] !== b[0]) return a[0] < b[0] ? -1 : 1
    return parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10)
  })

  const index: PrecomputedStrongsIndex = {}
  let built = 0
  let skipped = 0
  for (const id of sorted) {
    let entry: PrecomputedStrongEntry | null = null
    try {
      entry = await buildStrongEntry(id)
    } catch {
      entry = null
    }
    if (entry && entry.gloss) {
      index[id] = entry
      built++
    } else {
      skipped++
    }
  }
  console.log(
    `  Strong's: ${built} entries built, ${skipped} skipped (no gloss).`,
  )
  return index
}

async function buildVersesIndex(
  strongs: PrecomputedStrongsIndex,
): Promise<PrecomputedVersesIndex> {
  const pool = new StringPool()
  const verses: PrecomputedVersesIndex['verses'] = {}
  let hebrewVerses = 0
  let greekVerses = 0
  let droppedX = 0

  // ── Hebrew OT (morphHB WLC) ────────────────────────────────────────
  for (const { book, osis } of hebrewBookEntries()) {
    const addrs = await enumerateHebrewVerses(osis)
    for (const { chapter, verse } of addrs) {
      const key = canonicalVerseKey(book, chapter, verse)
      if (!key) continue
      const parsed = parseReference(key)
      if (!parsed) continue
      const entries = await computeHebrewVerseEntries(parsed, chapter, verse)
      if (entries.length === 0) continue
      verses[key] = entries.map((e) => entryToTuple(e, pool))
      hebrewVerses++
    }
    console.log(`  ${book} (${osis}): ${addrs.length} verses enumerated`)
  }

  // ── Greek NT (STEPBible TAGNT) ─────────────────────────────────────
  for (const { book, osis } of greekBookEntries()) {
    const addrs = await enumerateGreekVerses(osis)
    for (const { chapter, verse } of addrs) {
      const key = canonicalVerseKey(book, chapter, verse)
      if (!key) continue
      const parsed = parseReference(key)
      if (!parsed) continue
      const entries = await computeGreekVerseEntries(parsed, chapter, verse)
      if (entries.length === 0) continue
      // Trim the verse translit `x` when the Strong's dictionary already has a
      // non-empty xlit (the runtime uses `dictXlit || x`, so `x` is dead weight
      // unless the dict xlit is empty). Keeps the index small without changing
      // any runtime result.
      for (const e of entries) {
        if (e.x && strongs[e.s]?.xlit) {
          delete e.x
          droppedX++
        }
      }
      verses[key] = entries.map((e) => entryToTuple(e, pool))
      greekVerses++
    }
    console.log(`  ${book} (${osis}): ${addrs.length} verses enumerated`)
  }

  console.log(
    `  Verses indexed: ${hebrewVerses} Hebrew + ${greekVerses} Greek ` +
      `(${droppedX} redundant Greek translits trimmed, ` +
      `${pool.pool.length} unique surface/gloss strings pooled).`,
  )
  return { pool: pool.pool, verses }
}

async function main() {
  const referenceRoot = path.join(process.cwd(), 'content', 'reference')
  if (!fs.existsSync(referenceRoot)) {
    console.error(`Reference library not found at ${referenceRoot}`)
    console.error('Run ./scripts/sync-reference.sh to download it first.')
    process.exit(1)
  }

  console.log('Building Strong’s dictionary index…')
  const strongs = await buildStrongsIndex()

  console.log('Building verse → content-word index…')
  const verses = await buildVersesIndex(strongs)

  // Compact JSON (no pretty-printing) — keys already deterministically ordered.
  const strongsJson = JSON.stringify(strongs)
  const versesJson = JSON.stringify(verses)

  fs.writeFileSync(STRONGS_OUT, strongsJson, 'utf8')
  fs.writeFileSync(VERSES_OUT, versesJson, 'utf8')

  const strongsBytes = Buffer.byteLength(strongsJson, 'utf8')
  const versesBytes = Buffer.byteLength(versesJson, 'utf8')

  console.log('\nWrote precomputed lexicon index:')
  console.log(
    `  ${STRONGS_OUT}  (${fmtBytes(strongsBytes)}, ${
      Object.keys(strongs).length
    } entries)`,
  )
  console.log(
    `  ${VERSES_OUT}  (${fmtBytes(versesBytes)}, ${
      Object.keys(verses.verses).length
    } verses, ${verses.pool.length} pooled strings)`,
  )
  console.log(`  Combined: ${fmtBytes(strongsBytes + versesBytes)}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
