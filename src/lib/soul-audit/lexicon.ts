// Server-only: builds GROUNDED Hebrew/Greek word studies from the real lexica
// and tagged-text corpora that ship in `content/reference/`. Word definitions
// here are NEVER invented — every gloss is lifted from Brown-Driver-Briggs,
// Strong's, or Abbott-Smith and cleaned for display. If a definition cannot be
// found, the function surfaces that (returns null / omits the word) rather than
// fabricating one.
//
// Data sources, by language:
//   Hebrew verse -> Strong's:  content/reference/lexicons/morphhb/wlc/<Book>.xml
//                              (OSIS-tagged WLC; each <w lemma="..."> carries the
//                               Strong's number, English versification bridged via
//                               the embedded <note>KJV:...</note> tags).
//   Hebrew gloss (preferred):  Brown-Driver-Briggs.xml, reached through
//                              LexicalIndex.xml (Strong's number -> BDB section id).
//   Hebrew gloss (fallback):   HebrewStrong.xml (<meaning>/<def>).
//   Greek verse -> Strong's:   STEPBible TAGNT (Translators Amalgamated Greek NT),
//                              tab-delimited, one row per word with Strong's + morph.
//   Greek gloss (preferred):   Abbott-Smith abbott-smith.tei.xml (<gloss> elements).
//   Greek gloss (fallback):    Strong's Greek dictionary (strongs-greek-dictionary.js).
//
// Like src/lib/bible/getVerse.ts, this module deliberately omits the `server-only`
// guard so tsx scripts and verification harnesses can import it directly. The
// structural protection is that nothing in a client bundle imports it.
import { promises as fs } from 'node:fs'
import fsSync from 'node:fs'
import path from 'node:path'
import { parseReference, type ParsedReference } from '../bible/parseReference'
import {
  BIBLE_BOOK_META,
  isSingleChapterBook,
  type BibleBookId,
} from '../bible/books'

export interface WordStudy {
  word: string // original-language script, e.g. "שָׁבַר"
  xlit: string // transliteration, e.g. "shabar"
  strong: string // e.g. "H7665" or "G3306"
  gloss: string // grounded definition text from BDB/Strong's/Abbott-Smith
  source: string // attribution, e.g. "Brown-Driver-Briggs (Strong's H7665)"
  englishWord?: string // the English word in common translations this backs
}

// ---------------------------------------------------------------------------
// Precomputed index (Workers-safe runtime path)
// ---------------------------------------------------------------------------
//
// Parsing ~27 MB of lexicon XML at runtime blows the Cloudflare Workers free
// plan's 10 ms CPU budget. To stay Workers-safe, `scripts/build-lexicon-index.mts`
// precomputes a compact JSON index at BUILD time (committed to public/), and at
// runtime we load that JSON and do pure map lookups — NO XML parsing.
//
// Two files, both keyed for direct lookup:
//   public/lexicon-strongs.json  -> { [strong]: { word, xlit, gloss, source } }
//   public/lexicon-verses.json   -> { [canonical]: VerseEntry[] }
//
// VerseEntry stores the verse-specific surface form that the XML path overlays
// on top of the Strong's dictionary entry (see getHebrewVerseStudies /
// getGreekVerseStudies): `w` = surface word, `x` = Greek verse translit
// (fallback only), `e` = English gloss (Greek englishWord). Hebrew entries omit
// `x`/`e`. The ordering of the array IS the ranked order the verse functions
// produce, so the runtime just maps entries -> WordStudy in place.

/** Strong's dictionary entry as stored in the precomputed index. */
export interface PrecomputedStrongEntry {
  word: string
  xlit: string
  gloss: string
  source: string
}

/**
 * One ranked content word of a verse — the in-memory representation the build
 * helpers produce. The on-disk index stores the COMPACT TUPLE form below to
 * shave per-field JSON key overhead across ~200k entries.
 */
export interface PrecomputedVerseEntry {
  s: string // Strong's number, e.g. "H7665" / "G3056"
  w: string // verse surface form, e.g. "שָׁבַר" / "λόγος"
  x?: string // Greek-only: verse translit (xlit fallback)
  e?: string // Greek-only: English gloss (englishWord)
}

/**
 * Compact on-disk tuple: [sIdx, wIdx, eIdx?, x?].
 *   sIdx / wIdx / eIdx all index into the verses file's shared string `pool`
 *   (Strong's number / verse surface form / English gloss respectively).
 *   Interning collapses ~200k repeated Strong's + surface strings down to
 *   ~123k uniques and replaces them with small integers. eIdx is -1 when absent
 *   but a translit follows. `x` (Greek verse translit, xlit fallback) is inlined
 *   verbatim because it is vanishingly rare after build-time trimming.
 */
export type PrecomputedVerseTuple =
  | [number, number]
  | [number, number, number]
  | [number, number, number, string]

/** The verses index file: a shared string pool plus per-canonical tuples. */
export interface PrecomputedVersesIndex {
  pool: string[]
  verses: Record<string, PrecomputedVerseTuple[]>
}

export type PrecomputedStrongsIndex = Record<string, PrecomputedStrongEntry>

/**
 * Build-time string interner. Returns a stable index for a string, appending to
 * `pool` on first sight. Deterministic given a fixed insertion order.
 */
export class StringPool {
  readonly pool: string[] = []
  private readonly index = new Map<string, number>()
  intern(value: string): number {
    const existing = this.index.get(value)
    if (existing !== undefined) return existing
    const id = this.pool.length
    this.pool.push(value)
    this.index.set(value, id)
    return id
  }
}

/** Encode an in-memory entry into a pool-referencing tuple (build only). */
export function entryToTuple(
  e: PrecomputedVerseEntry,
  pool: StringPool,
): PrecomputedVerseTuple {
  const sIdx = pool.intern(e.s)
  const wIdx = pool.intern(e.w)
  const eIdx = e.e ? pool.intern(e.e) : -1
  if (e.x) return [sIdx, wIdx, eIdx, e.x]
  if (eIdx !== -1) return [sIdx, wIdx, eIdx]
  return [sIdx, wIdx]
}

function tupleToEntry(
  t: PrecomputedVerseTuple,
  pool: string[],
): PrecomputedVerseEntry {
  const entry: PrecomputedVerseEntry = {
    s: pool[t[0]] ?? '',
    w: pool[t[1]] ?? '',
  }
  const eIdx = t[2]
  if (typeof eIdx === 'number' && eIdx !== -1) {
    const eStr = pool[eIdx]
    if (eStr) entry.e = eStr
  }
  const x = t[3]
  if (typeof x === 'string' && x) entry.x = x
  return entry
}

const STRONGS_INDEX_ASSET = 'lexicon-strongs.json'
const VERSES_INDEX_ASSET = 'lexicon-verses.json'

// When true (set by the verification harness / build), the runtime refuses the
// XML fallback so we can prove the precomputed path alone is sufficient.
let forcePrecomputed = false
export function __setForcePrecomputed(value: boolean): void {
  forcePrecomputed = value
}

let strongsIndex: PrecomputedStrongsIndex | null = null
let strongsIndexPromise: Promise<PrecomputedStrongsIndex | null> | null = null
let versesIndex: PrecomputedVersesIndex | null = null
let versesIndexPromise: Promise<PrecomputedVersesIndex | null> | null = null

/**
 * Load a precomputed asset using the same three-strategy resolution the
 * reference index uses (Cloudflare ASSETS -> fs -> self-fetch). Returns null
 * when the asset cannot be found anywhere (dev without a build) so callers can
 * fall back to the XML path; throws only on a genuine parse error.
 */
async function loadPrecomputedAsset<T>(assetName: string): Promise<T | null> {
  // Strategy 1: Cloudflare ASSETS binding (production — no XML on disk there).
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare')
    const { env } = await getCloudflareContext({ async: true })
    if (env?.ASSETS) {
      const res = await env.ASSETS.fetch(
        new Request(`https://assets.local/${assetName}`),
      )
      if (res.ok) return (await res.json()) as T
    }
  } catch {
    // Not on Cloudflare or ASSETS unavailable — fall through.
  }

  // Strategy 2: fs (local dev / build / tsx scripts).
  try {
    const filePath = path.join(process.cwd(), 'public', assetName)
    if (fsSync.existsSync(filePath)) {
      const raw = await fs.readFile(filePath, 'utf8')
      return JSON.parse(raw) as T
    }
  } catch (err) {
    // A present-but-corrupt index is a real error — surface it.
    throw new Error(
      `Precomputed lexicon asset is unreadable: ${assetName} (${(err as Error).message})`,
    )
  }

  // Strategy 3: self-fetch (universal fallback).
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://euangelion.app'
    const res = await fetch(`${baseUrl}/${assetName}`)
    if (res.ok) return (await res.json()) as T
  } catch {
    // Network unavailable — fall through.
  }

  return null
}

async function loadStrongsIndex(): Promise<PrecomputedStrongsIndex | null> {
  if (strongsIndex) return strongsIndex
  if (!strongsIndexPromise) {
    strongsIndexPromise = loadPrecomputedAsset<PrecomputedStrongsIndex>(
      STRONGS_INDEX_ASSET,
    ).then((data) => {
      if (data) strongsIndex = data
      return data
    })
  }
  return strongsIndexPromise
}

async function loadVersesIndex(): Promise<PrecomputedVersesIndex | null> {
  if (versesIndex) return versesIndex
  if (!versesIndexPromise) {
    versesIndexPromise = loadPrecomputedAsset<PrecomputedVersesIndex>(
      VERSES_INDEX_ASSET,
    ).then((data) => {
      if (data) versesIndex = data
      return data
    })
  }
  return versesIndexPromise
}

/** Clear cached precomputed indexes (verification harness only). */
export function __clearPrecomputedCache(): void {
  strongsIndex = null
  strongsIndexPromise = null
  versesIndex = null
  versesIndexPromise = null
}

const REFERENCE_ROOT = path.join(
  process.cwd(),
  'content',
  'reference',
  'lexicons',
)
const STEPBIBLE_ROOT = path.join(
  process.cwd(),
  'content',
  'reference',
  'stepbible-data',
  'STEPBible-Data',
  'Translators Amalgamated OT+NT',
)

// ---------------------------------------------------------------------------
// Book-code maps
// ---------------------------------------------------------------------------

// BibleBookId -> OSIS book code as used inside morphHB WLC files + WLC filename.
export const HEBREW_OSIS: Partial<Record<BibleBookId, string>> = {
  GEN: 'Gen',
  EXO: 'Exod',
  LEV: 'Lev',
  NUM: 'Num',
  DEU: 'Deut',
  JOS: 'Josh',
  JDG: 'Judg',
  RUT: 'Ruth',
  '1SA': '1Sam',
  '2SA': '2Sam',
  '1KI': '1Kgs',
  '2KI': '2Kgs',
  '1CH': '1Chr',
  '2CH': '2Chr',
  EZR: 'Ezra',
  NEH: 'Neh',
  EST: 'Esth',
  JOB: 'Job',
  PSA: 'Ps',
  PRO: 'Prov',
  ECC: 'Eccl',
  SNG: 'Song',
  ISA: 'Isa',
  JER: 'Jer',
  LAM: 'Lam',
  EZK: 'Ezek',
  DAN: 'Dan',
  HOS: 'Hos',
  JOL: 'Joel',
  AMO: 'Amos',
  OBA: 'Obad',
  JON: 'Jonah',
  MIC: 'Mic',
  NAM: 'Nah',
  HAB: 'Hab',
  ZEP: 'Zeph',
  HAG: 'Hag',
  ZEC: 'Zech',
  MAL: 'Mal',
}

// BibleBookId -> OSIS book code as used in STEPBible TAGNT row prefixes.
export const GREEK_OSIS: Partial<Record<BibleBookId, string>> = {
  MAT: 'Mat',
  MRK: 'Mrk',
  LUK: 'Luk',
  JHN: 'Jhn',
  ACT: 'Act',
  ROM: 'Rom',
  '1CO': '1Co',
  '2CO': '2Co',
  GAL: 'Gal',
  EPH: 'Eph',
  PHP: 'Php',
  COL: 'Col',
  '1TH': '1Th',
  '2TH': '2Th',
  '1TI': '1Ti',
  '2TI': '2Ti',
  TIT: 'Tit',
  PHM: 'Phm',
  HEB: 'Heb',
  JAS: 'Jas',
  '1PE': '1Pe',
  '2PE': '2Pe',
  '1JN': '1Jn',
  '2JN': '2Jn',
  '3JN': '3Jn',
  JUD: 'Jud',
  REV: 'Rev',
}

// Which TAGNT file a NT book lives in.
const GREEK_TAGNT_MAT_JHN = new Set<string>(['Mat', 'Mrk', 'Luk', 'Jhn'])

function tagntFileForBook(osis: string): string {
  const which = GREEK_TAGNT_MAT_JHN.has(osis)
    ? 'TAGNT Mat-Jhn - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt'
    : 'TAGNT Act-Rev - Translators Amalgamated Greek NT - STEPBible.org CC-BY.txt'
  return path.join(STEPBIBLE_ROOT, which)
}

// ---------------------------------------------------------------------------
// XML / entity helpers
// ---------------------------------------------------------------------------

function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n: string) =>
      String.fromCodePoint(parseInt(n, 16)),
    )
    .replace(/&amp;/g, '&')
}

function stripTags(value: string): string {
  return value.replace(/<[^>]*>/g, '')
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function cleanText(value: string): string {
  return collapseWhitespace(decodeEntities(stripTags(value)))
}

// Keep a gloss to at most ~3 sentences of real definition.
function limitGloss(value: string): string {
  const cleaned = collapseWhitespace(value)
  if (cleaned.length <= 400) return cleaned
  // Cut on a sentence boundary near the limit when possible.
  const slice = cleaned.slice(0, 400)
  const lastStop = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('; '),
    slice.lastIndexOf(', '),
  )
  return (lastStop > 120 ? slice.slice(0, lastStop) : slice).trim() + '…'
}

// ---------------------------------------------------------------------------
// Hebrew: Strong's number normalization
// ---------------------------------------------------------------------------

// morphHB lemmas look like: "c/3068", "l/7665", "c/m/3605", "6869 b", "1793 a",
// "853", "3820 a". Prefixes are letter+slash segments (conjunctions, prepositions,
// articles). The Strong's number is the final all-digits segment; a trailing
// homonym letter (" a", " b") is part of the lexicon homonym, not the Strong's id.
function hebrewStrongFromLemma(lemma: string): string | null {
  const segments = lemma.split('/')
  const last = segments[segments.length - 1]?.trim()
  if (!last) return null
  const m = last.match(/^(\d+)/)
  if (!m) return null
  return `H${parseInt(m[1], 10)}`
}

// ---------------------------------------------------------------------------
// Function-word filtering
// ---------------------------------------------------------------------------

// Hebrew morph codes in WLC are like "HVqp3cp", "HC/Np", "HR/Ncmsc", "HTo".
// First char 'H' = Hebrew. After that, per-segment part-of-speech letters:
//   V verb, N noun, A adjective  -> content
//   C conjunction, R preposition, T particle/article/object-marker,
//   P pronoun, S suffix, D adverb-of-place, G ... -> function/particle
// We classify by the morph segment that aligns to the FINAL lemma segment
// (the content head), but it is simpler and robust to check: a word is content
// iff any of its morph segments is V/N/A AND it is not a proper noun (Np).
const HEBREW_CONTENT_POS = new Set(['V', 'N', 'A'])

function isHebrewContentWord(morph: string, strong: string): boolean {
  // Object marker / direct-object particle is always skipped.
  if (strong === 'H853') return false
  // Drop the leading 'H' language tag, split prefix/host segments.
  const body = morph.startsWith('H') ? morph.slice(1) : morph
  const segs = body.split('/')
  // The host (last) segment carries the lexeme's part of speech.
  const host = segs[segs.length - 1] ?? ''
  const posLetter = host.charAt(0)
  if (!HEBREW_CONTENT_POS.has(posLetter)) return false
  // Skip proper nouns (Np) — names are not word-study material here.
  if (host.startsWith('Np')) return false
  return true
}

// Greek morph codes (STEPBible col-3 suffix) are like "N-NSM", "V-IAI-3S",
// "A-NSM", "PREP", "CONJ", "T-NSM", "P-..." (personal/relative/demonstrative
// pronouns), "PRT", "ADV", "CONJ". Content = noun (N), verb (V), adjective (A).
function isGreekContentMorph(morph: string): boolean {
  const head = morph.split('-')[0]
  return head === 'N' || head === 'V' || head === 'A'
}

// ---------------------------------------------------------------------------
// Lazy-loaded, cached lexicon indexes
// ---------------------------------------------------------------------------

interface StrongHebrewEntry {
  word: string
  xlit: string
  meaning: string
}

let hebrewStrongIndex: Map<string, StrongHebrewEntry> | null = null
let hebrewStrongPromise: Promise<Map<string, StrongHebrewEntry>> | null = null

export async function loadHebrewStrong(): Promise<
  Map<string, StrongHebrewEntry>
> {
  if (hebrewStrongIndex) return hebrewStrongIndex
  if (!hebrewStrongPromise) {
    hebrewStrongPromise = (async () => {
      const file = path.join(
        REFERENCE_ROOT,
        'HebrewLexicon',
        'HebrewStrong.xml',
      )
      const raw = await fs.readFile(file, 'utf8')
      const map = new Map<string, StrongHebrewEntry>()
      const entryRe = /<entry id="(H\d+)">([\s\S]*?)<\/entry>/g
      let m: RegExpExecArray | null
      while ((m = entryRe.exec(raw)) !== null) {
        const id = m[1]
        const body = m[2]
        const wMatch = body.match(
          /<w\b[^>]*\bxlit="([^"]*)"[^>]*>([\s\S]*?)<\/w>/,
        )
        const word = wMatch ? cleanText(wMatch[2]) : ''
        const xlit = wMatch ? decodeEntities(wMatch[1]) : ''
        const meaningMatch = body.match(/<meaning>([\s\S]*?)<\/meaning>/)
        const meaning = meaningMatch ? cleanText(meaningMatch[1]) : ''
        map.set(id, { word, xlit, meaning })
      }
      hebrewStrongIndex = map
      return map
    })()
  }
  return hebrewStrongPromise
}

// Strong's number (e.g. "7665") -> BDB section id (e.g. "v.ay.aa").
let bdbXrefIndex: Map<string, string> | null = null
let bdbXrefPromise: Promise<Map<string, string>> | null = null

async function loadBdbXref(): Promise<Map<string, string>> {
  if (bdbXrefIndex) return bdbXrefIndex
  if (!bdbXrefPromise) {
    bdbXrefPromise = (async () => {
      const file = path.join(
        REFERENCE_ROOT,
        'HebrewLexicon',
        'LexicalIndex.xml',
      )
      const raw = await fs.readFile(file, 'utf8')
      const map = new Map<string, string>()
      // Track which Strong's numbers were resolved via the primary homonym
      // (aug="a" or no aug). A primary mapping must never be overwritten by a
      // secondary homonym (aug="b"/"c"/...), but a primary may replace a
      // secondary that happened to be read first (file order isn't homonym
      // order — e.g. H1254 lists aug="b" "be fat" before aug="a" "create").
      const isPrimary = new Set<string>()
      const xrefRe = /<xref\b([^>]*)\/>/g
      let m: RegExpExecArray | null
      while ((m = xrefRe.exec(raw)) !== null) {
        const attrs = m[1]
        const strongM = attrs.match(/\bstrong="(\d+)"/)
        const bdbM = attrs.match(/\bbdb="([^"]+)"/)
        if (!strongM || !bdbM) continue
        const key = strongM[1]
        const augM = attrs.match(/\baug="([a-z])"/)
        const primary = !augM || augM[1] === 'a'
        if (!map.has(key)) {
          map.set(key, bdbM[1])
          if (primary) isPrimary.add(key)
        } else if (primary && !isPrimary.has(key)) {
          // Upgrade a previously-stored secondary homonym to the primary sense.
          map.set(key, bdbM[1])
          isPrimary.add(key)
        }
      }
      bdbXrefIndex = map
      return map
    })()
  }
  return bdbXrefPromise
}

// BDB section id -> concise gloss assembled from its <def> elements.
let bdbEntryIndex: Map<string, string> | null = null
let bdbEntryPromise: Promise<Map<string, string>> | null = null

async function loadBdbEntries(): Promise<Map<string, string>> {
  if (bdbEntryIndex) return bdbEntryIndex
  if (!bdbEntryPromise) {
    bdbEntryPromise = (async () => {
      const file = path.join(
        REFERENCE_ROOT,
        'HebrewLexicon',
        'BrownDriverBriggs.xml',
      )
      const raw = await fs.readFile(file, 'utf8')
      const map = new Map<string, string>()
      const entryRe = /<entry id="([^"]+)"[^>]*>([\s\S]*?)<\/entry>/g
      let m: RegExpExecArray | null
      while ((m = entryRe.exec(raw)) !== null) {
        const id = m[1]
        const body = m[2]
        const defs: string[] = []
        const defRe = /<def>([\s\S]*?)<\/def>/g
        let d: RegExpExecArray | null
        while ((d = defRe.exec(body)) !== null) {
          const text = cleanText(d[1])
          if (text && !defs.includes(text)) defs.push(text)
          if (defs.length >= 8) break
        }
        if (defs.length > 0) map.set(id, defs.join('; '))
      }
      bdbEntryIndex = map
      return map
    })()
  }
  return bdbEntryPromise
}

// Abbott-Smith: Strong's id (e.g. "G3056") -> { word, gloss }.
interface AbbottEntry {
  word: string
  gloss: string
}

let abbottIndex: Map<string, AbbottEntry> | null = null
let abbottPromise: Promise<Map<string, AbbottEntry>> | null = null

export async function loadAbbottSmith(): Promise<Map<string, AbbottEntry>> {
  if (abbottIndex) return abbottIndex
  if (!abbottPromise) {
    abbottPromise = (async () => {
      const file = path.join(
        REFERENCE_ROOT,
        'Abbott-Smith',
        'abbott-smith.tei.xml',
      )
      const raw = await fs.readFile(file, 'utf8')
      const map = new Map<string, AbbottEntry>()
      // <entry n="λόγος|G3056"> ... </entry>
      const entryRe = /<entry n="([^"]*\|G\d+)">([\s\S]*?)<\/entry>/g
      let m: RegExpExecArray | null
      while ((m = entryRe.exec(raw)) !== null) {
        const nAttr = decodeEntities(m[1])
        const body = m[2]
        const pipe = nAttr.lastIndexOf('|')
        if (pipe < 0) continue
        const word = nAttr.slice(0, pipe).trim()
        const id = nAttr.slice(pipe + 1).trim() // "G3056"
        // Prefer the first cluster of <gloss> elements (the headline senses).
        const glosses: string[] = []
        const glossRe = /<gloss>([\s\S]*?)<\/gloss>/g
        let g: RegExpExecArray | null
        while ((g = glossRe.exec(body)) !== null) {
          const text = cleanText(g[1])
          if (text && !glosses.includes(text)) glosses.push(text)
          if (glosses.length >= 6) break
        }
        const gloss = glosses.join('; ')
        if (word) map.set(id, { word, gloss })
      }
      abbottIndex = map
      return map
    })()
  }
  return abbottPromise
}

// Strong's Greek dictionary fallback: G-id -> { lemma, translit, strongs_def }.
interface StrongGreekEntry {
  lemma: string
  translit: string
  def: string
}

let greekStrongIndex: Map<string, StrongGreekEntry> | null = null
let greekStrongPromise: Promise<Map<string, StrongGreekEntry>> | null = null

export async function loadGreekStrong(): Promise<
  Map<string, StrongGreekEntry>
> {
  if (greekStrongIndex) return greekStrongIndex
  if (!greekStrongPromise) {
    greekStrongPromise = (async () => {
      const file = path.join(
        REFERENCE_ROOT,
        'strongs',
        'greek',
        'strongs-greek-dictionary.js',
      )
      const raw = await fs.readFile(file, 'utf8')
      const map = new Map<string, StrongGreekEntry>()
      // The file is `var strongsGreekDictionary = { ...JSON... };`
      const start = raw.indexOf('{')
      const end = raw.lastIndexOf('}')
      if (start >= 0 && end > start) {
        const json = raw.slice(start, end + 1)
        try {
          const parsed = JSON.parse(json) as Record<
            string,
            {
              lemma?: string
              translit?: string
              strongs_def?: string
            }
          >
          for (const [id, entry] of Object.entries(parsed)) {
            map.set(id, {
              lemma: entry.lemma ?? '',
              translit: entry.translit ?? '',
              def: collapseWhitespace(entry.strongs_def ?? ''),
            })
          }
        } catch {
          // Leave map empty; Abbott-Smith remains the primary Greek source.
        }
      }
      greekStrongIndex = map
      return map
    })()
  }
  return greekStrongPromise
}

// ---------------------------------------------------------------------------
// Greek transliteration fallback (for words found in TAGNT but not in either
// Greek lexicon — keeps xlit non-empty without inventing a definition).
// ---------------------------------------------------------------------------

const GREEK_TRANSLIT_MAP: Record<string, string> = {
  α: 'a',
  β: 'b',
  γ: 'g',
  δ: 'd',
  ε: 'e',
  ζ: 'z',
  η: 'e',
  θ: 'th',
  ι: 'i',
  κ: 'k',
  λ: 'l',
  μ: 'm',
  ν: 'n',
  ξ: 'x',
  ο: 'o',
  π: 'p',
  ρ: 'r',
  σ: 's',
  ς: 's',
  τ: 't',
  υ: 'y',
  φ: 'ph',
  χ: 'ch',
  ψ: 'ps',
  ω: 'o',
}

function transliterateGreek(word: string): string {
  const lower = word.normalize('NFD').replace(/[̀-ͯ]/g, '')
  let out = ''
  for (const ch of lower.toLowerCase()) {
    out += GREEK_TRANSLIT_MAP[ch] ?? (/[a-z]/.test(ch) ? ch : '')
  }
  return out
}

// ---------------------------------------------------------------------------
// Gloss assembly per language
// ---------------------------------------------------------------------------

export async function buildHebrewStudy(
  strong: string,
  englishWord?: string,
): Promise<WordStudy | null> {
  const strongMap = await loadHebrewStrong()
  const strongEntry = strongMap.get(strong)
  if (!strongEntry) return null

  const numeric = strong.replace(/^H/, '')
  const xref = await loadBdbXref()
  const bdbId = xref.get(numeric)

  let gloss = ''
  let source = ''
  if (bdbId) {
    const bdbEntries = await loadBdbEntries()
    const bdbGloss = bdbEntries.get(bdbId)
    if (bdbGloss) {
      gloss = limitGloss(bdbGloss)
      source = `Brown-Driver-Briggs (Strong's ${strong})`
    }
  }
  if (!gloss) {
    gloss = limitGloss(strongEntry.meaning)
    source = `Strong's Hebrew (${strong})`
  }
  if (!gloss) return null

  return {
    word: strongEntry.word,
    xlit: strongEntry.xlit,
    strong,
    gloss,
    source,
    ...(englishWord ? { englishWord } : {}),
  }
}

export async function buildGreekStudy(
  strong: string,
  fallbackWord: string,
  englishWord?: string,
): Promise<WordStudy | null> {
  const abbott = await loadAbbottSmith()
  const abbottEntry = abbott.get(strong)

  const greekStrong = await loadGreekStrong()
  const strongEntry = greekStrong.get(strong)

  let word = abbottEntry?.word || strongEntry?.lemma || fallbackWord
  let xlit = strongEntry?.translit ? decodeEntities(strongEntry.translit) : ''
  if (!xlit) xlit = transliterateGreek(word)

  let gloss = ''
  let source = ''
  if (abbottEntry && abbottEntry.gloss) {
    gloss = limitGloss(abbottEntry.gloss)
    source = `Abbott-Smith Manual Greek Lexicon (Strong's ${strong})`
  } else if (strongEntry && strongEntry.def) {
    gloss = limitGloss(strongEntry.def)
    source = `Strong's Greek (${strong})`
  }
  if (!gloss) return null

  return {
    word,
    xlit,
    strong,
    gloss,
    source,
    ...(englishWord ? { englishWord } : {}),
  }
}

// ---------------------------------------------------------------------------
// Public: single-entry lookup by Strong's number
// ---------------------------------------------------------------------------

export async function getWordStudyByStrong(
  strong: string,
): Promise<WordStudy | null> {
  if (!strong || typeof strong !== 'string') return null
  const normalized = strong.trim().toUpperCase()
  const m = normalized.match(/^([HG])0*(\d+)$/)
  if (!m) return null
  const canonical = `${m[1]}${m[2]}`

  // Workers-safe path: pure lookup in the precomputed Strong's index.
  const index = await loadStrongsIndex()
  if (index) {
    const entry = index[canonical]
    if (!entry) return null
    return {
      word: entry.word,
      xlit: entry.xlit,
      strong: canonical,
      gloss: entry.gloss,
      source: entry.source,
    }
  }

  if (forcePrecomputed) {
    throw new Error(
      'Precomputed lexicon index missing and forcePrecomputed is set. ' +
        'Run `npm run build:lexicon-index` to generate public/lexicon-strongs.json.',
    )
  }

  // Dev fallback: parse the XML lexica directly.
  if (canonical.startsWith('H')) {
    return buildHebrewStudy(canonical)
  }
  return buildGreekStudy(canonical, '')
}

// ---------------------------------------------------------------------------
// Hebrew verse -> tagged words
// ---------------------------------------------------------------------------

const hebrewBookCache = new Map<string, string>()

async function loadHebrewBook(osis: string): Promise<string> {
  const cached = hebrewBookCache.get(osis)
  if (cached) return cached
  const file = path.join(REFERENCE_ROOT, 'morphhb', 'wlc', `${osis}.xml`)
  const raw = await fs.readFile(file, 'utf8')
  hebrewBookCache.set(osis, raw)
  return raw
}

// Corpus-wide WLC frequency per Strong's number. Built once (reads every WLC
// book, reusing the per-book cache) and memoized. Rarer words carry the weight
// in a word study, so verse results are ranked by ascending frequency.
let hebrewFreqIndex: Map<string, number> | null = null
let hebrewFreqPromise: Promise<Map<string, number>> | null = null

async function loadHebrewFrequency(): Promise<Map<string, number>> {
  if (hebrewFreqIndex) return hebrewFreqIndex
  if (!hebrewFreqPromise) {
    hebrewFreqPromise = (async () => {
      const freq = new Map<string, number>()
      const lemmaRe = /\blemma="([^"]+)"/g
      for (const osis of Object.values(HEBREW_OSIS)) {
        const xml = await loadHebrewBook(osis)
        let m: RegExpExecArray | null
        while ((m = lemmaRe.exec(xml)) !== null) {
          const strong = hebrewStrongFromLemma(m[1])
          if (!strong) continue
          freq.set(strong, (freq.get(strong) ?? 0) + 1)
        }
      }
      hebrewFreqIndex = freq
      return freq
    })()
  }
  return hebrewFreqPromise
}

interface TaggedWord {
  strong: string
  word: string
  morph: string
}

// Pull the WLC verse block for a given English chapter:verse. WLC versification
// can differ from English/KJV; each WLC <verse> may carry a <note>KJV:Bk.C.V</note>
// giving its English address. We match on the KJV note first, then fall back to
// the WLC osisID itself (true when the two systems agree).
function extractHebrewVerseWords(
  bookXml: string,
  osis: string,
  chapter: number,
  verse: number,
): TaggedWord[] {
  const targetKjv = `${osis}.${chapter}.${verse}`
  const verseRe = /<verse osisID="([^"]+)">([\s\S]*?)<\/verse>/g
  let m: RegExpExecArray | null
  let matchedBody: string | null = null
  let kjvFallbackBody: string | null = null

  while ((m = verseRe.exec(bookXml)) !== null) {
    const osisId = m[1]
    const body = m[2]
    const noteMatch = body.match(/<note>KJV:([^<]+)<\/note>/)
    if (noteMatch) {
      const kjvRef = noteMatch[1].trim()
      if (kjvRef === targetKjv) {
        matchedBody = body
        break
      }
    } else if (osisId === targetKjv) {
      // No KJV note => WLC address equals English address for this verse.
      kjvFallbackBody = body
    }
  }

  const body = matchedBody ?? kjvFallbackBody
  if (!body) return []

  const out: TaggedWord[] = []
  const wRe = /<w\b([^>]*)\blemma="([^"]+)"([^>]*)>([\s\S]*?)<\/w>/g
  let w: RegExpExecArray | null
  while ((w = wRe.exec(body)) !== null) {
    const allAttrs = `${w[1]} ${w[3]}`
    const lemma = w[2]
    const morphMatch = allAttrs.match(/\bmorph="([^"]+)"/)
    const morph = morphMatch ? morphMatch[1] : ''
    const surface = cleanText(w[4])
    const strong = hebrewStrongFromLemma(lemma)
    if (!strong) continue
    out.push({ strong, word: surface, morph })
  }
  return out
}

// ---------------------------------------------------------------------------
// Greek verse -> tagged words (STEPBible TAGNT)
// ---------------------------------------------------------------------------

const greekFileCache = new Map<string, string>()

async function loadTagntFile(filePath: string): Promise<string> {
  const cached = greekFileCache.get(filePath)
  if (cached) return cached
  const raw = await fs.readFile(filePath, 'utf8')
  greekFileCache.set(filePath, raw)
  return raw
}

interface GreekTaggedWord {
  strong: string
  word: string
  translit: string
  english: string
  morph: string
}

// TAGNT data rows (the ones we want) look like:
//   Jhn.1.1#05=NKO\tλόγος, (logos)\tWord,\tG3056=N-NSM\tλόγος=word\t...
// Lines beginning with '#' are headers/original-text and are skipped.
function extractGreekVerseWords(
  fileText: string,
  osis: string,
  chapter: number,
  verse: number,
): GreekTaggedWord[] {
  const prefix = `${osis}.${chapter}.${verse}#`
  const out: GreekTaggedWord[] = []
  const lines = fileText.split('\n')
  for (const line of lines) {
    if (!line.startsWith(prefix)) continue
    const cols = line.split('\t')
    if (cols.length < 4) continue
    // Col 1: "λόγος, (logos)" -> surface + translit
    const surfaceCol = cols[1] ?? ''
    const surfaceMatch = surfaceCol.match(/^([^(]*)\(([^)]*)\)/)
    // Collapse first, THEN strip trailing punctuation, so "λόγος, " -> "λόγος".
    const word = collapseWhitespace(
      surfaceMatch ? surfaceMatch[1] : surfaceCol,
    ).replace(/[,.;·:]+$/, '')
    const translit = surfaceMatch ? surfaceMatch[2].trim() : ''
    // Col 2: English gloss
    const english = collapseWhitespace((cols[2] ?? '').replace(/[<>]/g, ''))
    // Col 3: "G3056=N-NSM" -> strong + morph
    const tag = cols[3] ?? ''
    const tagMatch = tag.match(/^(G\d+)=([A-Z0-9-]+)/)
    if (!tagMatch) continue
    const strong = `G${parseInt(tagMatch[1].slice(1), 10)}`
    const morph = tagMatch[2]
    out.push({ strong, word, translit, english, morph })
  }
  return out
}

// ---------------------------------------------------------------------------
// Public: verse -> ordered content-word studies
// ---------------------------------------------------------------------------

export async function getWordStudiesForVerse(
  reference: string,
  max = 3,
): Promise<WordStudy[]> {
  const parsed = parseReference(reference)
  if (!parsed) {
    throw new Error(`Could not parse Scripture reference: "${reference}"`)
  }

  // Workers-safe path: look the canonical reference up in the precomputed
  // verse index and overlay each entry's verse surface form on its Strong's
  // dictionary entry — exactly what the XML path produces, no XML parsing.
  const versesData = await loadVersesIndex()
  if (versesData) {
    const strongs = await loadStrongsIndex()
    if (!strongs) {
      throw new Error(
        'Precomputed verse index present but Strong’s index missing. ' +
          'Re-run `npm run build:lexicon-index`.',
      )
    }
    const tuples = versesData.verses[parsed.canonical]
    if (!tuples) {
      throw new Error(
        `No precomputed word studies for ${parsed.canonical}. ` +
          'Verse may be untaggable (OT non-Hebrew / NT non-Greek) or outside corpus.',
      )
    }
    return entriesToWordStudies(tuples, versesData.pool, strongs, max)
  }

  if (forcePrecomputed) {
    throw new Error(
      'Precomputed lexicon index missing and forcePrecomputed is set. ' +
        'Run `npm run build:lexicon-index` to generate public/lexicon-verses.json.',
    )
  }

  // Dev fallback: parse the XML corpora directly.
  const meta = BIBLE_BOOK_META[parsed.book]
  // Use the start verse; single-verse word study is the contract here.
  const chapter = parsed.startChapter
  const verse = parsed.startVerse === 0 ? 1 : parsed.startVerse

  if (meta.testament === 'OT') {
    return getHebrewVerseStudies(parsed, chapter, verse, max)
  }
  return getGreekVerseStudies(parsed, chapter, verse, max)
}

// Overlay precomputed verse tuples onto Strong's dictionary entries. Mirrors
// the surface/xlit overrides the XML verse paths apply.
function entriesToWordStudies(
  tuples: PrecomputedVerseTuple[],
  pool: string[],
  strongs: PrecomputedStrongsIndex,
  max: number,
): WordStudy[] {
  const out: WordStudy[] = []
  for (const t of tuples) {
    if (out.length >= max) break
    const e = tupleToEntry(t, pool)
    const dict = strongs[e.s]
    if (!dict) continue
    out.push({
      word: e.w || dict.word,
      xlit: dict.xlit || e.x || '',
      strong: e.s,
      gloss: dict.gloss,
      source: dict.source,
      ...(e.e ? { englishWord: e.e } : {}),
    })
  }
  return out
}

// ---------------------------------------------------------------------------
// XML-path verse studies (dev fallback) + build-time entry computation
// ---------------------------------------------------------------------------

// Compute the ranked, content-filtered, buildable Hebrew verse entries. Shared
// by the dev-fallback study builder and the precomputed-index build script so
// the precomputed order is byte-identical to runtime XML parsing. Returns null
// for words whose Strong's study cannot be built (so they are excluded exactly
// as the runtime loop excludes them).
export async function computeHebrewVerseEntries(
  parsed: ParsedReference,
  chapter: number,
  verse: number,
): Promise<PrecomputedVerseEntry[]> {
  const osis = HEBREW_OSIS[parsed.book]
  if (!osis) {
    throw new Error(
      `No morphHB mapping for OT book ${parsed.book} (${parsed.bookName})`,
    )
  }

  const bookXml = await loadHebrewBook(osis)
  const tagged = extractHebrewVerseWords(bookXml, osis, chapter, verse)
  if (tagged.length === 0) return []

  // Keep content words only, dedupe by Strong's (first surface form wins),
  // preserving verse order for the stable-sort tiebreak.
  const candidates: TaggedWord[] = []
  const seenStrong = new Set<string>()
  for (const t of tagged) {
    if (seenStrong.has(t.strong)) continue
    if (!isHebrewContentWord(t.morph, t.strong)) continue
    seenStrong.add(t.strong)
    candidates.push(t)
  }

  // Rank by ascending corpus frequency (rarer = more significant for a word
  // study); ties fall back to verse order via index.
  const freq = await loadHebrewFrequency()
  const ranked = candidates
    .map((t, index) => ({ t, index, freq: freq.get(t.strong) ?? Infinity }))
    .sort((a, b) => a.freq - b.freq || a.index - b.index)

  const out: PrecomputedVerseEntry[] = []
  for (const { t } of ranked) {
    const study = await buildHebrewStudy(t.strong)
    if (!study) continue
    out.push({ s: t.strong, w: t.word || study.word })
  }
  return out
}

async function getHebrewVerseStudies(
  parsed: ParsedReference,
  chapter: number,
  verse: number,
  max: number,
): Promise<WordStudy[]> {
  const entries = await computeHebrewVerseEntries(parsed, chapter, verse)
  if (entries.length === 0) {
    const osis = HEBREW_OSIS[parsed.book]
    throw new Error(
      `No tagged Hebrew words found for ${parsed.canonical} ` +
        `(WLC ${osis}.${chapter}.${verse}). Check versification.`,
    )
  }

  const results: WordStudy[] = []
  for (const e of entries) {
    if (results.length >= max) break
    const study = await buildHebrewStudy(e.s)
    if (!study) continue
    results.push({ ...study, word: e.w || study.word })
  }
  return results
}

// Compute the ranked, content-filtered, buildable Greek verse entries. Shared
// by the dev-fallback study builder and the precomputed-index build script.
export async function computeGreekVerseEntries(
  parsed: ParsedReference,
  chapter: number,
  verse: number,
): Promise<PrecomputedVerseEntry[]> {
  const osis = GREEK_OSIS[parsed.book]
  if (!osis) {
    throw new Error(
      `No TAGNT mapping for NT book ${parsed.book} (${parsed.bookName})`,
    )
  }

  const fileText = await loadTagntFile(tagntFileForBook(osis))
  const tagged = extractGreekVerseWords(fileText, osis, chapter, verse)
  if (tagged.length === 0) return []

  const out: PrecomputedVerseEntry[] = []
  const seen = new Set<string>()
  for (const t of tagged) {
    if (seen.has(t.strong)) continue
    if (!isGreekContentMorph(t.morph)) continue
    const study = await buildGreekStudy(
      t.strong,
      t.word,
      t.english || undefined,
    )
    if (!study) continue
    seen.add(t.strong)
    const entry: PrecomputedVerseEntry = {
      s: t.strong,
      w: t.word || study.word,
    }
    // `x` (verse translit) is the xlit fallback the runtime applies as
    // `dictXlit || x`. The build script drops it when the dictionary xlit is
    // non-empty (almost always) to keep the index small.
    if (t.translit) entry.x = t.translit
    if (t.english) entry.e = t.english
    out.push(entry)
  }
  return out
}

async function getGreekVerseStudies(
  parsed: ParsedReference,
  chapter: number,
  verse: number,
  max: number,
): Promise<WordStudy[]> {
  const entries = await computeGreekVerseEntries(parsed, chapter, verse)
  if (entries.length === 0) {
    const osis = GREEK_OSIS[parsed.book]
    throw new Error(
      `No tagged Greek words found for ${parsed.canonical} ` +
        `(TAGNT ${osis}.${chapter}.${verse}).`,
    )
  }

  const results: WordStudy[] = []
  for (const e of entries) {
    if (results.length >= max) break
    // `e.e` carries the verse English gloss the original path fed as englishWord.
    const study = await buildGreekStudy(e.s, e.w, e.e)
    if (!study) continue
    results.push({
      ...study,
      word: e.w || study.word,
      xlit: study.xlit || e.x || '',
    })
  }
  return results
}

// ---------------------------------------------------------------------------
// Build-time support (used only by scripts/build-lexicon-index.mts)
// ---------------------------------------------------------------------------
//
// These exports let the build script reuse the EXACT parsing/ranking above so
// the precomputed index is identical to runtime XML parsing. They read the XML
// corpora and are never called on the request path.

/** Iterate every OT book id that has a morphHB WLC mapping, with its OSIS code. */
export function hebrewBookEntries(): Array<{
  book: BibleBookId
  osis: string
}> {
  return (Object.entries(HEBREW_OSIS) as Array<[BibleBookId, string]>).map(
    ([book, osis]) => ({ book, osis }),
  )
}

/** Iterate every NT book id that has a TAGNT mapping, with its OSIS code. */
export function greekBookEntries(): Array<{ book: BibleBookId; osis: string }> {
  return (Object.entries(GREEK_OSIS) as Array<[BibleBookId, string]>).map(
    ([book, osis]) => ({ book, osis }),
  )
}

/**
 * Distinct English (KJV) verse addresses present in a WLC book, in file order.
 * Mirrors extractHebrewVerseWords' addressing: a verse's English address is its
 * <note>KJV:Bk.C.V</note> when present, else its osisID.
 */
export async function enumerateHebrewVerses(
  osis: string,
): Promise<Array<{ chapter: number; verse: number }>> {
  const xml = await loadHebrewBook(osis)
  const seen = new Set<string>()
  const out: Array<{ chapter: number; verse: number }> = []
  const verseRe = /<verse osisID="([^"]+)">([\s\S]*?)<\/verse>/g
  let m: RegExpExecArray | null
  while ((m = verseRe.exec(xml)) !== null) {
    const osisId = m[1]
    const body = m[2]
    const noteMatch = body.match(/<note>KJV:([^<]+)<\/note>/)
    const addr = noteMatch ? noteMatch[1].trim() : osisId
    // addr is "Bk.C.V"; only keep ones in this book (KJV notes can point to a
    // different book under remapping — those are reachable from that book's own
    // enumeration, so skip cross-book here to avoid duplicates).
    const parts = addr.split('.')
    if (parts.length !== 3 || parts[0] !== osis) continue
    const chapter = parseInt(parts[1], 10)
    const verse = parseInt(parts[2], 10)
    if (!Number.isFinite(chapter) || !Number.isFinite(verse)) continue
    const key = `${chapter}.${verse}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ chapter, verse })
  }
  return out
}

/** Distinct verse addresses present in a TAGNT book, in file order. */
export async function enumerateGreekVerses(
  osis: string,
): Promise<Array<{ chapter: number; verse: number }>> {
  const fileText = await loadTagntFile(tagntFileForBook(osis))
  const seen = new Set<string>()
  const out: Array<{ chapter: number; verse: number }> = []
  const prefix = `${osis}.`
  const rowRe = new RegExp(
    `^${osis.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.(\\d+)\\.(\\d+)#`,
  )
  for (const line of fileText.split('\n')) {
    if (!line.startsWith(prefix)) continue
    const m = line.match(rowRe)
    if (!m) continue
    const chapter = parseInt(m[1], 10)
    const verse = parseInt(m[2], 10)
    const key = `${chapter}.${verse}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ chapter, verse })
  }
  return out
}

/**
 * Canonical verse key matching what runtime getWordStudiesForVerse looks up:
 * parseReference(...).canonical for the given book+chapter+verse. Returns null
 * if the address does not parse (e.g. out-of-range verse from a stray KJV note).
 */
export function canonicalVerseKey(
  book: BibleBookId,
  chapter: number,
  verse: number,
): string | null {
  const meta = BIBLE_BOOK_META[book]
  const ref = isSingleChapterBook(book)
    ? `${meta.name} ${verse}`
    : `${meta.name} ${chapter}:${verse}`
  const parsed = parseReference(ref)
  return parsed ? parsed.canonical : null
}

/** Build a Strong's dictionary entry by number (for the precomputed strongs index). */
export async function buildStrongEntry(
  strong: string,
): Promise<PrecomputedStrongEntry | null> {
  const study = strong.startsWith('H')
    ? await buildHebrewStudy(strong)
    : await buildGreekStudy(strong, '')
  if (!study) return null
  return {
    word: study.word,
    xlit: study.xlit,
    gloss: study.gloss,
    source: study.source,
  }
}
