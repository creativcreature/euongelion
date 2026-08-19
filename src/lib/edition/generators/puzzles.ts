/**
 * The Daily Bread — the puzzles page (SA-090 / F-136).
 *
 * Three generators, all deterministic: the same UTC date always produces the
 * same crossword, the same unscramble and the same three quiz questions, on
 * every machine and in every process. Nothing here calls Math.random() and
 * nothing here reaches the network — the only input beyond the date is the
 * BSB corpus committed at `public/bibles/BSB/`.
 *
 * Determinism is not decoration: the nightly Action, the monthly `--days=30`
 * batch and the page all have to agree about what today's puzzle is, and the
 * only honest way to guarantee that is to compute it from the date.
 *
 * Per Development Rule 1 there are no silent fallbacks. A missing corpus file,
 * a missing verse or a crossword that fails its own readback check THROWS.
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { BIBLE_BOOK_META, type BibleBookId } from '@/lib/bible/books'
import type {
  CrosswordPayload,
  EditionItem,
  QuizPayload,
  UnscramblePayload,
} from '@/lib/edition/kinds'

/* ── Seeded randomness ────────────────────────────────────────────────────
 * One PRNG, seeded from the ISO date and the puzzle kind, so the three
 * puzzles on a given day are independent of each other but fixed forever.
 */

/** FNV-1a, 32-bit. Stable across engines — no floating point, no locale. */
function hashSeed(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** mulberry32 — small, fast, and identical on every JS engine. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Rng = () => number

function rngFor(isoDate: string, kind: string): Rng {
  return mulberry32(hashSeed(`${isoDate}:${kind}`))
}

/** Uniform integer in [0, max). */
function pickIndex(rng: Rng, max: number): number {
  if (max <= 0) throw new Error(`pickIndex needs a non-empty range, got ${max}`)
  return Math.floor(rng() * max) % max
}

/** Fisher-Yates using the supplied stream. Returns a new array. */
function shuffled<T>(rng: Rng, items: readonly T[]): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1)) % (i + 1)
    const tmp = out[i]
    out[i] = out[j]
    out[j] = tmp
  }
  return out
}

/** 'YYYY-MM-DD' in UTC. Every generator keys off this and nothing else. */
function isoDay(date: Date): string {
  const t = date.getTime()
  if (!Number.isFinite(t))
    throw new Error('puzzles: invalid Date passed to generator')
  return date.toISOString().slice(0, 10)
}

/**
 * A date the rotation index cannot express. The index is days since the Unix
 * epoch, so anything earlier is negative, and a negative index turns every
 * `pool[i % pool.length]` lookup into `undefined` — a crash three frames later
 * with nothing in it about the date that caused it. Named, so the caller can
 * tell "you asked for 1969" apart from "the corpus is missing".
 */
export class PuzzleDateBeforeEpochError extends Error {
  constructor(isoDate: string) {
    super(
      `puzzles: ${isoDate} is before 1970-01-01, and the puzzle rotation is only defined from the epoch forward.`,
    )
    this.name = 'PuzzleDateBeforeEpochError'
  }
}

/** Days since 1970-01-01 UTC — the rotation index every "pick by day" uses. */
function dayNumber(isoDate: string): number {
  const ms = Date.parse(`${isoDate}T00:00:00Z`)
  if (Number.isNaN(ms)) throw new Error(`puzzles: unparseable date ${isoDate}`)
  if (ms < 0) throw new PuzzleDateBeforeEpochError(isoDate)
  return Math.floor(ms / 86400000)
}

/* ── The corpus ───────────────────────────────────────────────────────────
 * Generators run in Node (the runner script and the nightly Action), so this
 * reads the committed JSON directly. No ASSETS binding, no self-fetch: if the
 * file is not there, the puzzle cannot be built and the run must fail loudly.
 */

type BookJson = Record<string, Record<string, string>>

const bookCache = new Map<BibleBookId, BookJson>()

async function loadBook(book: BibleBookId): Promise<BookJson> {
  const cached = bookCache.get(book)
  if (cached) return cached

  const file = path.join(
    process.cwd(),
    'public',
    'bibles',
    'BSB',
    `${book}.json`,
  )
  let raw: string
  try {
    raw = await fs.readFile(file, 'utf8')
  } catch (cause) {
    throw new Error(
      `puzzles: BSB corpus missing for ${book} at ${file}: ${(cause as Error).message}`,
    )
  }
  const parsed = JSON.parse(raw) as BookJson
  bookCache.set(book, parsed)
  return parsed
}

/** One curated verse slot. The text itself always comes from the corpus. */
interface VerseRef {
  book: BibleBookId
  chapter: number
  verse: number
}

/** "John 3:16" — built from the canonical book name, never hand-typed, and
 * formatted the way `parseReference` canonicalises so a reader can paste a
 * puzzle reference straight into the Bible reader. Single-chapter books drop
 * the chapter, exactly as that module does: "Jude 24", not "Jude 1:24". */
function displayReference(ref: VerseRef): string {
  const meta = BIBLE_BOOK_META[ref.book]
  if (meta.singleChapter) return `${meta.name} ${ref.verse}`
  return `${meta.name} ${ref.chapter}:${ref.verse}`
}

async function verseText(ref: VerseRef): Promise<string> {
  const book = await loadBook(ref.book)
  const text = book[String(ref.chapter)]?.[String(ref.verse)]
  if (typeof text !== 'string' || text.length === 0) {
    throw new Error(`puzzles: BSB has no text for ${displayReference(ref)}`)
  }
  return text
}

const TRANSLATION = 'BSB'

/* ── 1. The unscramble ────────────────────────────────────────────────────
 * A verse short enough to hold in the head (8-18 words in the BSB), printed
 * out of order. The reference rotates by day so a reader who comes back for a
 * season never repeats: 164 verses is more than five months of mornings.
 */

const UNSCRAMBLE_VERSES: readonly VerseRef[] = [
  { book: 'GEN', chapter: 1, verse: 1 },
  { book: 'GEN', chapter: 1, verse: 3 },
  { book: 'GEN', chapter: 15, verse: 6 },
  { book: 'EXO', chapter: 14, verse: 14 },
  { book: 'EXO', chapter: 20, verse: 3 },
  { book: 'EXO', chapter: 33, verse: 14 },
  { book: 'LEV', chapter: 26, verse: 12 },
  { book: 'NUM', chapter: 6, verse: 24 },
  { book: 'NUM', chapter: 6, verse: 25 },
  { book: 'NUM', chapter: 6, verse: 26 },
  { book: '2SA', chapter: 22, verse: 2 },
  { book: '1CH', chapter: 16, verse: 11 },
  { book: '1CH', chapter: 16, verse: 34 },
  { book: 'JOB', chapter: 19, verse: 25 },
  { book: 'JOB', chapter: 42, verse: 2 },
  { book: 'PSA', chapter: 19, verse: 1 },
  { book: 'PSA', chapter: 23, verse: 1 },
  { book: 'PSA', chapter: 27, verse: 14 },
  { book: 'PSA', chapter: 33, verse: 12 },
  { book: 'PSA', chapter: 34, verse: 8 },
  { book: 'PSA', chapter: 34, verse: 18 },
  { book: 'PSA', chapter: 37, verse: 4 },
  { book: 'PSA', chapter: 37, verse: 5 },
  { book: 'PSA', chapter: 40, verse: 1 },
  { book: 'PSA', chapter: 42, verse: 1 },
  { book: 'PSA', chapter: 46, verse: 1 },
  { book: 'PSA', chapter: 51, verse: 10 },
  { book: 'PSA', chapter: 56, verse: 3 },
  { book: 'PSA', chapter: 62, verse: 1 },
  { book: 'PSA', chapter: 90, verse: 12 },
  { book: 'PSA', chapter: 91, verse: 1 },
  { book: 'PSA', chapter: 91, verse: 11 },
  { book: 'PSA', chapter: 100, verse: 4 },
  { book: 'PSA', chapter: 103, verse: 12 },
  { book: 'PSA', chapter: 107, verse: 1 },
  { book: 'PSA', chapter: 118, verse: 24 },
  { book: 'PSA', chapter: 119, verse: 11 },
  { book: 'PSA', chapter: 119, verse: 105 },
  { book: 'PSA', chapter: 121, verse: 1 },
  { book: 'PSA', chapter: 121, verse: 2 },
  { book: 'PSA', chapter: 126, verse: 5 },
  { book: 'PSA', chapter: 133, verse: 1 },
  { book: 'PSA', chapter: 136, verse: 1 },
  { book: 'PSA', chapter: 139, verse: 23 },
  { book: 'PSA', chapter: 147, verse: 3 },
  { book: 'PSA', chapter: 150, verse: 6 },
  { book: 'PRO', chapter: 1, verse: 7 },
  { book: 'PRO', chapter: 3, verse: 5 },
  { book: 'PRO', chapter: 3, verse: 6 },
  { book: 'PRO', chapter: 4, verse: 23 },
  { book: 'PRO', chapter: 9, verse: 10 },
  { book: 'PRO', chapter: 11, verse: 25 },
  { book: 'PRO', chapter: 12, verse: 25 },
  { book: 'PRO', chapter: 13, verse: 20 },
  { book: 'PRO', chapter: 15, verse: 1 },
  { book: 'PRO', chapter: 16, verse: 3 },
  { book: 'PRO', chapter: 16, verse: 9 },
  { book: 'PRO', chapter: 16, verse: 24 },
  { book: 'PRO', chapter: 17, verse: 17 },
  { book: 'PRO', chapter: 18, verse: 10 },
  { book: 'PRO', chapter: 19, verse: 21 },
  { book: 'PRO', chapter: 27, verse: 17 },
  { book: 'PRO', chapter: 29, verse: 25 },
  { book: 'PRO', chapter: 31, verse: 25 },
  { book: 'PRO', chapter: 31, verse: 30 },
  { book: 'ECC', chapter: 3, verse: 1 },
  { book: 'ECC', chapter: 4, verse: 9 },
  { book: 'ISA', chapter: 26, verse: 3 },
  { book: 'ISA', chapter: 40, verse: 8 },
  { book: 'ISA', chapter: 40, verse: 29 },
  { book: 'ISA', chapter: 55, verse: 8 },
  { book: 'ISA', chapter: 66, verse: 13 },
  { book: 'JER', chapter: 17, verse: 7 },
  { book: 'JER', chapter: 29, verse: 13 },
  { book: 'JER', chapter: 33, verse: 3 },
  { book: 'LAM', chapter: 3, verse: 22 },
  { book: 'LAM', chapter: 3, verse: 23 },
  { book: 'LAM', chapter: 3, verse: 25 },
  { book: 'HOS', chapter: 6, verse: 6 },
  { book: 'AMO', chapter: 5, verse: 24 },
  { book: 'HAB', chapter: 2, verse: 4 },
  { book: 'MAL', chapter: 3, verse: 6 },
  { book: 'MAT', chapter: 5, verse: 8 },
  { book: 'MAT', chapter: 5, verse: 9 },
  { book: 'MAT', chapter: 5, verse: 14 },
  { book: 'MAT', chapter: 5, verse: 44 },
  { book: 'MAT', chapter: 6, verse: 14 },
  { book: 'MAT', chapter: 6, verse: 21 },
  { book: 'MAT', chapter: 10, verse: 30 },
  { book: 'MAT', chapter: 11, verse: 28 },
  { book: 'MAT', chapter: 11, verse: 30 },
  { book: 'MAT', chapter: 18, verse: 20 },
  { book: 'MAT', chapter: 19, verse: 26 },
  { book: 'MAT', chapter: 21, verse: 22 },
  { book: 'MAT', chapter: 22, verse: 39 },
  { book: 'MRK', chapter: 9, verse: 23 },
  { book: 'MRK', chapter: 16, verse: 15 },
  { book: 'LUK', chapter: 1, verse: 37 },
  { book: 'LUK', chapter: 2, verse: 11 },
  { book: 'LUK', chapter: 6, verse: 31 },
  { book: 'LUK', chapter: 12, verse: 34 },
  { book: 'LUK', chapter: 18, verse: 27 },
  { book: 'LUK', chapter: 19, verse: 10 },
  { book: 'LUK', chapter: 21, verse: 33 },
  { book: 'JHN', chapter: 1, verse: 1 },
  { book: 'JHN', chapter: 4, verse: 24 },
  { book: 'JHN', chapter: 8, verse: 32 },
  { book: 'JHN', chapter: 10, verse: 11 },
  { book: 'JHN', chapter: 14, verse: 1 },
  { book: 'JHN', chapter: 15, verse: 12 },
  { book: 'JHN', chapter: 15, verse: 13 },
  { book: 'ACT', chapter: 16, verse: 31 },
  { book: 'ROM', chapter: 3, verse: 23 },
  { book: 'ROM', chapter: 5, verse: 1 },
  { book: 'ROM', chapter: 5, verse: 8 },
  { book: 'ROM', chapter: 8, verse: 1 },
  { book: 'ROM', chapter: 8, verse: 18 },
  { book: 'ROM', chapter: 8, verse: 37 },
  { book: 'ROM', chapter: 10, verse: 13 },
  { book: 'ROM', chapter: 10, verse: 17 },
  { book: 'ROM', chapter: 12, verse: 12 },
  { book: 'ROM', chapter: 12, verse: 21 },
  { book: '1CO', chapter: 10, verse: 31 },
  { book: '1CO', chapter: 13, verse: 4 },
  { book: '1CO', chapter: 13, verse: 13 },
  { book: '2CO', chapter: 3, verse: 17 },
  { book: '2CO', chapter: 5, verse: 7 },
  { book: 'GAL', chapter: 5, verse: 22 },
  { book: 'GAL', chapter: 5, verse: 23 },
  { book: 'GAL', chapter: 6, verse: 2 },
  { book: 'EPH', chapter: 2, verse: 9 },
  { book: 'EPH', chapter: 4, verse: 2 },
  { book: 'EPH', chapter: 4, verse: 32 },
  { book: 'EPH', chapter: 6, verse: 10 },
  { book: 'EPH', chapter: 6, verse: 11 },
  { book: 'PHP', chapter: 2, verse: 3 },
  { book: 'PHP', chapter: 2, verse: 5 },
  { book: 'PHP', chapter: 3, verse: 14 },
  { book: 'PHP', chapter: 4, verse: 4 },
  { book: 'PHP', chapter: 4, verse: 6 },
  { book: 'PHP', chapter: 4, verse: 13 },
  { book: 'PHP', chapter: 4, verse: 19 },
  { book: 'COL', chapter: 3, verse: 2 },
  { book: 'COL', chapter: 3, verse: 23 },
  { book: '1TH', chapter: 5, verse: 11 },
  { book: '1TH', chapter: 5, verse: 18 },
  { book: '1TH', chapter: 5, verse: 24 },
  { book: '2TH', chapter: 3, verse: 3 },
  { book: '1TI', chapter: 6, verse: 6 },
  { book: '2TI', chapter: 1, verse: 7 },
  { book: '2TI', chapter: 3, verse: 16 },
  { book: '2TI', chapter: 4, verse: 7 },
  { book: 'HEB', chapter: 10, verse: 24 },
  { book: 'HEB', chapter: 13, verse: 8 },
  { book: 'JAS', chapter: 1, verse: 2 },
  { book: 'JAS', chapter: 1, verse: 22 },
  { book: 'JAS', chapter: 2, verse: 17 },
  { book: 'JAS', chapter: 4, verse: 7 },
  { book: '1PE', chapter: 5, verse: 6 },
  { book: '1PE', chapter: 5, verse: 7 },
  { book: '1PE', chapter: 5, verse: 8 },
  { book: '1JN', chapter: 4, verse: 8 },
  { book: '3JN', chapter: 1, verse: 4 },
  { book: 'REV', chapter: 22, verse: 13 },
]

export async function generateUnscramble(
  date: Date,
): Promise<EditionItem<'unscramble'>[]> {
  const publishDate = isoDay(date)
  const ref =
    UNSCRAMBLE_VERSES[dayNumber(publishDate) % UNSCRAMBLE_VERSES.length]
  const text = await verseText(ref)

  // Punctuation stays attached to its word — that is part of the puzzle, and
  // stripping it would make the answer ambiguous where a clause ends.
  const words = text.split(/\s+/).filter((w) => w.length > 0)
  if (words.length < 2) {
    throw new Error(
      `puzzles: ${displayReference(ref)} is too short to unscramble`,
    )
  }

  const rng = rngFor(publishDate, 'unscramble')
  const identity = words.map((_, i) => i)
  let order = shuffled(rng, identity)
  // A shuffle that lands back on the original order is not a puzzle. Reshuffle
  // from the same stream, which keeps the result deterministic.
  for (let attempt = 0; order.every((v, i) => v === i); attempt += 1) {
    if (attempt >= 64) {
      throw new Error(
        `puzzles: could not shuffle ${displayReference(ref)} away from source order`,
      )
    }
    order = shuffled(rng, identity)
  }

  const payload: UnscramblePayload = {
    reference: displayReference(ref),
    translation: TRANSLATION,
    words,
    shuffled: order,
  }

  return [
    { kind: 'unscramble', publishDate, slot: 0, status: 'approved', payload },
  ]
}

/* ── 2. The quiz ──────────────────────────────────────────────────────────
 * "Where is this from?" Three questions a day. The three verses are a stride
 * through the pool, not a draw from it: a seeded draw with no look-back asked
 * the same verse nine times inside one month, which is exactly what a daily
 * reader notices. The decoys are still drawn — they are drawn from the same
 * curated pool, so a wrong answer is always a plausible one, a reference a
 * reader has heard of and never a random citation.
 */

const QUIZ_VERSES: readonly VerseRef[] = [
  { book: 'GEN', chapter: 1, verse: 1 },
  { book: 'GEN', chapter: 1, verse: 3 },
  { book: 'GEN', chapter: 1, verse: 27 },
  { book: 'GEN', chapter: 2, verse: 24 },
  { book: 'GEN', chapter: 8, verse: 22 },
  { book: 'GEN', chapter: 9, verse: 13 },
  { book: 'GEN', chapter: 12, verse: 2 },
  { book: 'GEN', chapter: 12, verse: 3 },
  { book: 'GEN', chapter: 15, verse: 6 },
  { book: 'GEN', chapter: 50, verse: 20 },
  { book: 'EXO', chapter: 3, verse: 14 },
  { book: 'EXO', chapter: 14, verse: 14 },
  { book: 'EXO', chapter: 20, verse: 3 },
  { book: 'EXO', chapter: 20, verse: 12 },
  { book: 'EXO', chapter: 33, verse: 14 },
  { book: 'LEV', chapter: 19, verse: 18 },
  { book: 'LEV', chapter: 26, verse: 12 },
  { book: 'NUM', chapter: 6, verse: 24 },
  { book: 'NUM', chapter: 6, verse: 25 },
  { book: 'NUM', chapter: 6, verse: 26 },
  { book: 'DEU', chapter: 4, verse: 29 },
  { book: 'DEU', chapter: 6, verse: 5 },
  { book: 'DEU', chapter: 31, verse: 8 },
  { book: 'DEU', chapter: 33, verse: 27 },
  { book: 'JDG', chapter: 6, verse: 12 },
  { book: '1SA', chapter: 2, verse: 2 },
  { book: '2SA', chapter: 22, verse: 2 },
  { book: '2SA', chapter: 22, verse: 31 },
  { book: '2KI', chapter: 6, verse: 16 },
  { book: '1CH', chapter: 16, verse: 11 },
  { book: '1CH', chapter: 16, verse: 34 },
  { book: 'JOB', chapter: 19, verse: 25 },
  { book: 'JOB', chapter: 23, verse: 10 },
  { book: 'JOB', chapter: 42, verse: 2 },
  { book: 'PSA', chapter: 1, verse: 2 },
  { book: 'PSA', chapter: 8, verse: 4 },
  { book: 'PSA', chapter: 16, verse: 11 },
  { book: 'PSA', chapter: 19, verse: 1 },
  { book: 'PSA', chapter: 19, verse: 14 },
  { book: 'PSA', chapter: 20, verse: 7 },
  { book: 'PSA', chapter: 23, verse: 1 },
  { book: 'PSA', chapter: 23, verse: 6 },
  { book: 'PSA', chapter: 27, verse: 1 },
  { book: 'PSA', chapter: 27, verse: 14 },
  { book: 'PSA', chapter: 30, verse: 5 },
  { book: 'PSA', chapter: 32, verse: 8 },
  { book: 'PSA', chapter: 33, verse: 12 },
  { book: 'PSA', chapter: 34, verse: 8 },
  { book: 'PSA', chapter: 34, verse: 18 },
  { book: 'PSA', chapter: 37, verse: 4 },
  { book: 'PSA', chapter: 37, verse: 5 },
  { book: 'PSA', chapter: 40, verse: 1 },
  { book: 'PSA', chapter: 42, verse: 1 },
  { book: 'PSA', chapter: 46, verse: 1 },
  { book: 'PSA', chapter: 46, verse: 10 },
  { book: 'PSA', chapter: 51, verse: 10 },
  { book: 'PSA', chapter: 55, verse: 22 },
  { book: 'PSA', chapter: 56, verse: 3 },
  { book: 'PSA', chapter: 62, verse: 1 },
  { book: 'PSA', chapter: 63, verse: 1 },
  { book: 'PSA', chapter: 73, verse: 26 },
  { book: 'PSA', chapter: 84, verse: 11 },
  { book: 'PSA', chapter: 90, verse: 12 },
  { book: 'PSA', chapter: 91, verse: 1 },
  { book: 'PSA', chapter: 91, verse: 2 },
  { book: 'PSA', chapter: 91, verse: 11 },
  { book: 'PSA', chapter: 100, verse: 4 },
  { book: 'PSA', chapter: 103, verse: 12 },
  { book: 'PSA', chapter: 107, verse: 1 },
  { book: 'PSA', chapter: 118, verse: 24 },
  { book: 'PSA', chapter: 119, verse: 11 },
  { book: 'PSA', chapter: 119, verse: 105 },
  { book: 'PSA', chapter: 121, verse: 1 },
  { book: 'PSA', chapter: 121, verse: 2 },
  { book: 'PSA', chapter: 126, verse: 5 },
  { book: 'PSA', chapter: 127, verse: 1 },
  { book: 'PSA', chapter: 133, verse: 1 },
  { book: 'PSA', chapter: 136, verse: 1 },
  { book: 'PSA', chapter: 139, verse: 14 },
  { book: 'PSA', chapter: 139, verse: 23 },
  { book: 'PSA', chapter: 145, verse: 18 },
  { book: 'PSA', chapter: 147, verse: 3 },
  { book: 'PSA', chapter: 150, verse: 6 },
  { book: 'PRO', chapter: 1, verse: 7 },
  { book: 'PRO', chapter: 3, verse: 5 },
  { book: 'PRO', chapter: 3, verse: 6 },
  { book: 'PRO', chapter: 4, verse: 23 },
  { book: 'PRO', chapter: 9, verse: 10 },
  { book: 'PRO', chapter: 11, verse: 25 },
  { book: 'PRO', chapter: 12, verse: 25 },
  { book: 'PRO', chapter: 13, verse: 20 },
  { book: 'PRO', chapter: 15, verse: 1 },
  { book: 'PRO', chapter: 16, verse: 3 },
  { book: 'PRO', chapter: 16, verse: 9 },
  { book: 'PRO', chapter: 16, verse: 24 },
  { book: 'PRO', chapter: 17, verse: 17 },
  { book: 'PRO', chapter: 18, verse: 10 },
  { book: 'PRO', chapter: 18, verse: 24 },
  { book: 'PRO', chapter: 19, verse: 21 },
  { book: 'PRO', chapter: 22, verse: 6 },
  { book: 'PRO', chapter: 27, verse: 17 },
  { book: 'PRO', chapter: 29, verse: 25 },
  { book: 'PRO', chapter: 31, verse: 25 },
  { book: 'PRO', chapter: 31, verse: 30 },
  { book: 'ECC', chapter: 3, verse: 1 },
  { book: 'ECC', chapter: 4, verse: 9 },
  { book: 'ECC', chapter: 12, verse: 13 },
  { book: 'ISA', chapter: 6, verse: 8 },
  { book: 'ISA', chapter: 7, verse: 14 },
  { book: 'ISA', chapter: 26, verse: 3 },
  { book: 'ISA', chapter: 30, verse: 21 },
  { book: 'ISA', chapter: 40, verse: 8 },
  { book: 'ISA', chapter: 40, verse: 29 },
  { book: 'ISA', chapter: 41, verse: 13 },
  { book: 'ISA', chapter: 53, verse: 6 },
  { book: 'ISA', chapter: 55, verse: 8 },
  { book: 'ISA', chapter: 55, verse: 9 },
  { book: 'ISA', chapter: 64, verse: 8 },
  { book: 'ISA', chapter: 66, verse: 13 },
  { book: 'JER', chapter: 1, verse: 5 },
  { book: 'JER', chapter: 17, verse: 7 },
  { book: 'JER', chapter: 29, verse: 13 },
  { book: 'JER', chapter: 31, verse: 3 },
  { book: 'JER', chapter: 32, verse: 17 },
  { book: 'JER', chapter: 33, verse: 3 },
  { book: 'LAM', chapter: 3, verse: 22 },
  { book: 'LAM', chapter: 3, verse: 23 },
  { book: 'LAM', chapter: 3, verse: 25 },
  { book: 'EZK', chapter: 36, verse: 26 },
  { book: 'DAN', chapter: 3, verse: 17 },
  { book: 'DAN', chapter: 12, verse: 3 },
  { book: 'HOS', chapter: 6, verse: 6 },
  { book: 'AMO', chapter: 5, verse: 24 },
  { book: 'JON', chapter: 2, verse: 9 },
  { book: 'MIC', chapter: 7, verse: 7 },
  { book: 'NAM', chapter: 1, verse: 7 },
  { book: 'HAB', chapter: 2, verse: 4 },
  { book: 'HAB', chapter: 3, verse: 19 },
  { book: 'MAL', chapter: 3, verse: 6 },
  { book: 'MAT', chapter: 4, verse: 4 },
  { book: 'MAT', chapter: 5, verse: 8 },
  { book: 'MAT', chapter: 5, verse: 9 },
  { book: 'MAT', chapter: 5, verse: 14 },
  { book: 'MAT', chapter: 5, verse: 16 },
  { book: 'MAT', chapter: 5, verse: 44 },
  { book: 'MAT', chapter: 6, verse: 14 },
  { book: 'MAT', chapter: 6, verse: 21 },
  { book: 'MAT', chapter: 6, verse: 33 },
  { book: 'MAT', chapter: 6, verse: 34 },
  { book: 'MAT', chapter: 7, verse: 7 },
  { book: 'MAT', chapter: 7, verse: 12 },
  { book: 'MAT', chapter: 10, verse: 30 },
  { book: 'MAT', chapter: 11, verse: 28 },
  { book: 'MAT', chapter: 11, verse: 29 },
  { book: 'MAT', chapter: 11, verse: 30 },
  { book: 'MAT', chapter: 16, verse: 24 },
  { book: 'MAT', chapter: 16, verse: 26 },
  { book: 'MAT', chapter: 18, verse: 20 },
  { book: 'MAT', chapter: 19, verse: 26 },
  { book: 'MAT', chapter: 21, verse: 22 },
  { book: 'MAT', chapter: 22, verse: 37 },
  { book: 'MAT', chapter: 22, verse: 39 },
  { book: 'MAT', chapter: 25, verse: 40 },
  { book: 'MAT', chapter: 28, verse: 19 },
  { book: 'MAT', chapter: 28, verse: 20 },
  { book: 'MRK', chapter: 9, verse: 23 },
  { book: 'MRK', chapter: 10, verse: 27 },
  { book: 'MRK', chapter: 10, verse: 45 },
  { book: 'MRK', chapter: 11, verse: 24 },
  { book: 'MRK', chapter: 12, verse: 30 },
  { book: 'MRK', chapter: 16, verse: 15 },
  { book: 'LUK', chapter: 1, verse: 37 },
  { book: 'LUK', chapter: 2, verse: 11 },
  { book: 'LUK', chapter: 6, verse: 31 },
  { book: 'LUK', chapter: 9, verse: 23 },
  { book: 'LUK', chapter: 11, verse: 9 },
  { book: 'LUK', chapter: 12, verse: 34 },
  { book: 'LUK', chapter: 18, verse: 27 },
  { book: 'LUK', chapter: 19, verse: 10 },
  { book: 'LUK', chapter: 21, verse: 33 },
  { book: 'JHN', chapter: 1, verse: 1 },
  { book: 'JHN', chapter: 1, verse: 12 },
  { book: 'JHN', chapter: 3, verse: 16 },
  { book: 'JHN', chapter: 3, verse: 17 },
  { book: 'JHN', chapter: 4, verse: 24 },
  { book: 'JHN', chapter: 6, verse: 35 },
  { book: 'JHN', chapter: 8, verse: 32 },
  { book: 'JHN', chapter: 10, verse: 10 },
  { book: 'JHN', chapter: 10, verse: 11 },
  { book: 'JHN', chapter: 11, verse: 25 },
  { book: 'JHN', chapter: 13, verse: 34 },
  { book: 'JHN', chapter: 14, verse: 1 },
  { book: 'JHN', chapter: 14, verse: 6 },
  { book: 'JHN', chapter: 15, verse: 12 },
  { book: 'JHN', chapter: 15, verse: 13 },
  { book: 'JHN', chapter: 20, verse: 29 },
  { book: 'ACT', chapter: 4, verse: 12 },
  { book: 'ACT', chapter: 16, verse: 31 },
  { book: 'ACT', chapter: 17, verse: 28 },
  { book: 'ROM', chapter: 1, verse: 16 },
  { book: 'ROM', chapter: 3, verse: 23 },
  { book: 'ROM', chapter: 5, verse: 1 },
  { book: 'ROM', chapter: 5, verse: 8 },
  { book: 'ROM', chapter: 6, verse: 23 },
  { book: 'ROM', chapter: 8, verse: 1 },
  { book: 'ROM', chapter: 8, verse: 18 },
  { book: 'ROM', chapter: 8, verse: 28 },
  { book: 'ROM', chapter: 8, verse: 31 },
  { book: 'ROM', chapter: 8, verse: 37 },
  { book: 'ROM', chapter: 8, verse: 38 },
  { book: 'ROM', chapter: 8, verse: 39 },
  { book: 'ROM', chapter: 10, verse: 9 },
  { book: 'ROM', chapter: 10, verse: 13 },
  { book: 'ROM', chapter: 10, verse: 17 },
  { book: 'ROM', chapter: 12, verse: 12 },
  { book: 'ROM', chapter: 12, verse: 21 },
  { book: '1CO', chapter: 1, verse: 18 },
  { book: '1CO', chapter: 2, verse: 9 },
  { book: '1CO', chapter: 10, verse: 31 },
  { book: '1CO', chapter: 13, verse: 4 },
  { book: '1CO', chapter: 13, verse: 13 },
  { book: '2CO', chapter: 1, verse: 3 },
  { book: '2CO', chapter: 3, verse: 17 },
  { book: '2CO', chapter: 4, verse: 16 },
  { book: '2CO', chapter: 4, verse: 18 },
  { book: '2CO', chapter: 5, verse: 7 },
  { book: '2CO', chapter: 5, verse: 17 },
  { book: '2CO', chapter: 5, verse: 21 },
  { book: '2CO', chapter: 9, verse: 7 },
  { book: 'GAL', chapter: 5, verse: 1 },
  { book: 'GAL', chapter: 5, verse: 22 },
  { book: 'GAL', chapter: 5, verse: 23 },
  { book: 'GAL', chapter: 6, verse: 2 },
  { book: 'GAL', chapter: 6, verse: 9 },
  { book: 'EPH', chapter: 1, verse: 7 },
  { book: 'EPH', chapter: 2, verse: 8 },
  { book: 'EPH', chapter: 2, verse: 9 },
  { book: 'EPH', chapter: 2, verse: 10 },
  { book: 'EPH', chapter: 3, verse: 20 },
  { book: 'EPH', chapter: 4, verse: 2 },
  { book: 'EPH', chapter: 4, verse: 32 },
  { book: 'EPH', chapter: 5, verse: 2 },
  { book: 'EPH', chapter: 6, verse: 10 },
  { book: 'EPH', chapter: 6, verse: 11 },
  { book: 'PHP', chapter: 1, verse: 6 },
  { book: 'PHP', chapter: 2, verse: 3 },
  { book: 'PHP', chapter: 2, verse: 5 },
  { book: 'PHP', chapter: 3, verse: 14 },
  { book: 'PHP', chapter: 4, verse: 4 },
  { book: 'PHP', chapter: 4, verse: 6 },
  { book: 'PHP', chapter: 4, verse: 7 },
  { book: 'PHP', chapter: 4, verse: 8 },
  { book: 'PHP', chapter: 4, verse: 13 },
  { book: 'PHP', chapter: 4, verse: 19 },
  { book: 'COL', chapter: 3, verse: 2 },
  { book: 'COL', chapter: 3, verse: 12 },
  { book: 'COL', chapter: 3, verse: 13 },
  { book: 'COL', chapter: 3, verse: 15 },
  { book: 'COL', chapter: 3, verse: 17 },
  { book: 'COL', chapter: 3, verse: 23 },
  { book: '1TH', chapter: 5, verse: 11 },
  { book: '1TH', chapter: 5, verse: 18 },
  { book: '1TH', chapter: 5, verse: 24 },
  { book: '2TH', chapter: 3, verse: 3 },
  { book: '1TI', chapter: 4, verse: 12 },
  { book: '1TI', chapter: 6, verse: 6 },
  { book: '1TI', chapter: 6, verse: 12 },
  { book: '2TI', chapter: 1, verse: 7 },
  { book: '2TI', chapter: 2, verse: 15 },
  { book: '2TI', chapter: 3, verse: 16 },
  { book: '2TI', chapter: 4, verse: 7 },
  { book: 'TIT', chapter: 3, verse: 5 },
  { book: 'HEB', chapter: 4, verse: 16 },
  { book: 'HEB', chapter: 10, verse: 24 },
  { book: 'HEB', chapter: 10, verse: 25 },
  { book: 'HEB', chapter: 11, verse: 1 },
  { book: 'HEB', chapter: 11, verse: 6 },
  { book: 'HEB', chapter: 13, verse: 8 },
  { book: 'JAS', chapter: 1, verse: 2 },
  { book: 'JAS', chapter: 1, verse: 5 },
  { book: 'JAS', chapter: 1, verse: 17 },
  { book: 'JAS', chapter: 1, verse: 22 },
  { book: 'JAS', chapter: 2, verse: 17 },
  { book: 'JAS', chapter: 4, verse: 7 },
  { book: 'JAS', chapter: 4, verse: 8 },
  { book: '1PE', chapter: 4, verse: 10 },
  { book: '1PE', chapter: 5, verse: 6 },
  { book: '1PE', chapter: 5, verse: 7 },
  { book: '1PE', chapter: 5, verse: 8 },
  { book: '2PE', chapter: 1, verse: 3 },
  { book: '1JN', chapter: 1, verse: 9 },
  { book: '1JN', chapter: 3, verse: 16 },
  { book: '1JN', chapter: 4, verse: 4 },
  { book: '1JN', chapter: 4, verse: 7 },
  { book: '1JN', chapter: 4, verse: 8 },
  { book: '1JN', chapter: 4, verse: 10 },
  { book: '1JN', chapter: 4, verse: 18 },
  { book: '1JN', chapter: 5, verse: 14 },
  { book: '2JN', chapter: 1, verse: 6 },
  { book: '3JN', chapter: 1, verse: 4 },
  { book: 'JUD', chapter: 1, verse: 24 },
  { book: 'REV', chapter: 1, verse: 8 },
  { book: 'REV', chapter: 21, verse: 5 },
  { book: 'REV', chapter: 22, verse: 13 },
]

const QUIZ_SLOTS = 3
const QUIZ_OPTIONS = 4

/** Questions in a month of editions — the window the rotation must not repeat
 * inside. */
const QUIZ_MONTH = QUIZ_SLOTS * 30

/**
 * How far apart in the pool the day's three questions sit.
 *
 * The naive stride — slots 0/1/2 at consecutive pool indexes — repeats nothing,
 * but the pool is in canon order, so consecutive entries are routinely the same
 * chapter: it would ask about Psalm 91:1, 91:2 and 91:11 in one morning. A
 * third of the pool between the arms keeps the three questions in three
 * different books while every arm still steps forward by QUIZ_SLOTS a day.
 */
const QUIZ_ARM_SPACING = Math.floor(QUIZ_VERSES.length / QUIZ_SLOTS)

/** Two references are "the same place" when they share a book and a chapter.
 * A decoy from the answer's own chapter would be a trick, not a question. */
function samePlace(a: VerseRef, b: VerseRef): boolean {
  return a.book === b.book && a.chapter === b.chapter
}

export async function generateQuiz(date: Date): Promise<EditionItem<'quiz'>[]> {
  const publishDate = isoDay(date)
  const rng = rngFor(publishDate, 'quiz')

  // Both no-repeat guarantees below are a claim about the pool, so check it
  // rather than assume it: an arm must not wrap inside a month (needs more
  // than QUIZ_MONTH entries) and the arms must stay more than a month apart
  // from each other (a third of the pool, hence the factor of QUIZ_SLOTS).
  if (QUIZ_VERSES.length < QUIZ_SLOTS * QUIZ_MONTH) {
    throw new Error(
      `puzzles: the quiz pool holds ${QUIZ_VERSES.length} verses; a month without repeats needs at least ${QUIZ_SLOTS * QUIZ_MONTH}`,
    )
  }

  // Three verses by stride. Slot i on day D takes pool index
  // D * QUIZ_SLOTS + i * QUIZ_ARM_SPACING, so 30 consecutive days are 90
  // consecutive indexes on three arms that never meet — no repeat inside a
  // month, and none across a year boundary either, because the index counts
  // days since the epoch rather than days into the year.
  const day = dayNumber(publishDate)
  const chosen = Array.from(
    { length: QUIZ_SLOTS },
    (_, slot) =>
      QUIZ_VERSES[
        (day * QUIZ_SLOTS + slot * QUIZ_ARM_SPACING) % QUIZ_VERSES.length
      ],
  )
  const chosenTexts = await Promise.all(chosen.map((ref) => verseText(ref)))
  // The pool holds verses that read word for word the same (1 Chronicles 16:34
  // and Psalm 107:1). The arms are far enough apart that no day draws such a
  // pair, but that is a property of the pool, and pools get edited.
  if (new Set(chosenTexts).size !== QUIZ_SLOTS) {
    throw new Error(
      `puzzles: ${publishDate} asks two questions with the same text (${chosen.map(displayReference).join(', ')})`,
    )
  }

  const items: EditionItem<'quiz'>[] = []
  for (let slot = 0; slot < QUIZ_SLOTS; slot += 1) {
    const answer = chosen[slot]
    const answerText = chosenTexts[slot]
    const decoys: VerseRef[] = []
    const decoyTexts: string[] = []
    for (let guard = 0; decoys.length < QUIZ_OPTIONS - 1; guard += 1) {
      if (guard >= 1024) {
        throw new Error(
          `puzzles: could not find decoys for ${displayReference(answer)}`,
        )
      }
      const candidate = QUIZ_VERSES[pickIndex(rng, QUIZ_VERSES.length)]
      if (samePlace(candidate, answer)) continue
      if (
        decoys.some(
          (d) => samePlace(d, candidate) && d.verse === candidate.verse,
        )
      )
        continue
      // A decoy that reads word for word like the answer is a second correct
      // answer — 1 Chronicles 16:34 and Psalm 107:1 are the same sentence in
      // the BSB, as are Matthew 6:21 and Luke 12:34. Compare the text, not the
      // reference, and hold the decoys to it against each other too so no
      // question ever offers the same verse twice under two names.
      const candidateText = await verseText(candidate)
      if (candidateText === answerText) continue
      if (decoyTexts.includes(candidateText)) continue
      decoys.push(candidate)
      decoyTexts.push(candidateText)
    }

    const options = shuffled(rng, [answer, ...decoys]).map(displayReference)
    const answerIndex = options.indexOf(displayReference(answer))
    if (answerIndex < 0) {
      throw new Error(
        `puzzles: lost the answer while shuffling ${displayReference(answer)}`,
      )
    }

    const payload: QuizPayload = {
      text: answerText,
      translation: TRANSLATION,
      options,
      answerIndex,
    }
    items.push({ kind: 'quiz', publishDate, slot, status: 'approved', payload })
  }

  return items
}

/* ── 3. The crossword ─────────────────────────────────────────────────────
 * An 11x11 grid built fresh each day from a bank of biblical answers. The
 * construction is the standard one — seed the middle row with a long answer,
 * then hang words off the letters already on the board — with the two rules
 * that keep a grid legal: a new word may only touch the grid at the squares
 * where it crosses, and no two parallel words may run side by side.
 *
 * After the grid is built it is READ BACK and checked against the clue list.
 * A crossword that does not spell what its clues claim is a broken puzzle, so
 * that check throws rather than publishing.
 */

export interface BankEntry {
  answer: string
  clue: string
}

export const CROSSWORD_BANK: readonly BankEntry[] = [
  // People — the Law and the histories
  { answer: 'ADAM', clue: 'First man, formed from the dust (Gen. 2:7)' },
  { answer: 'EVE', clue: 'Mother of all the living (Gen. 3:20)' },
  {
    answer: 'CAIN',
    clue: 'Firstborn of Adam, a tiller of the ground (Gen. 4:2)',
  },
  {
    answer: 'ABEL',
    clue: 'Keeper of sheep whose offering was accepted (Gen. 4:4)',
  },
  { answer: 'SETH', clue: 'Son granted to Adam in place of Abel (Gen. 4:25)' },
  {
    answer: 'ENOCH',
    clue: 'He walked with God, and then was no more (Gen. 5:24)',
  },
  { answer: 'NOAH', clue: 'Builder of the ark of gopher wood (Gen. 6:14)' },
  { answer: 'SHEM', clue: 'Eldest of the three sons of Noah (Gen. 5:32)' },
  {
    answer: 'ABRAM',
    clue: 'What Abraham was called before the covenant (Gen. 17:5)',
  },
  { answer: 'ABRAHAM', clue: 'Father of a multitude of nations (Gen. 17:5)' },
  { answer: 'SARAH', clue: 'She laughed at the promise of a son (Gen. 18:12)' },
  {
    answer: 'HAGAR',
    clue: 'Maidservant who named the God who sees (Gen. 16:13)',
  },
  {
    answer: 'ISHMAEL',
    clue: 'Son of Hagar, father of twelve princes (Gen. 25:16)',
  },
  { answer: 'ISAAC', clue: 'Son of promise bound on the mountain (Gen. 22:9)' },
  {
    answer: 'REBEKAH',
    clue: 'She drew water for the camels at the well (Gen. 24:19)',
  },
  {
    answer: 'JACOB',
    clue: 'He wrestled until daybreak at Peniel (Gen. 32:24)',
  },
  {
    answer: 'ESAU',
    clue: 'He sold his birthright for a bowl of stew (Gen. 25:33)',
  },
  { answer: 'LEAH', clue: 'Wife of Jacob, mother of Judah (Gen. 29:35)' },
  {
    answer: 'RACHEL',
    clue: 'Jacob served fourteen years for her (Gen. 29:30)',
  },
  {
    answer: 'JOSEPH',
    clue: 'Dreamer in the robe, sold into Egypt (Gen. 37:28)',
  },
  { answer: 'BENJAMIN', clue: 'Youngest of the sons of Jacob (Gen. 35:18)' },
  { answer: 'JUDAH', clue: 'Tribe of the lion, and of David (Gen. 49:9)' },
  { answer: 'LEVI', clue: 'Tribe set apart for the priesthood (Num. 3:12)' },
  {
    answer: 'REUBEN',
    clue: 'Firstborn of Jacob who forfeited his place (Gen. 49:3)',
  },
  {
    answer: 'PHARAOH',
    clue: 'Hard-hearted king who would not let them go (Exod. 7:13)',
  },
  { answer: 'MOSES', clue: 'He struck the rock at Meribah (Num. 20:11)' },
  { answer: 'AARON', clue: 'The first high priest of Israel (Exod. 28:1)' },
  {
    answer: 'MIRIAM',
    clue: 'Prophetess who sang with a tambourine (Exod. 15:20)',
  },
  {
    answer: 'JETHRO',
    clue: 'Midianite priest, father-in-law of Moses (Exod. 18:1)',
  },
  {
    answer: 'JOSHUA',
    clue: 'He led Israel across the Jordan on dry ground',
  },
  {
    answer: 'CALEB',
    clue: 'Spy who followed the LORD wholeheartedly (Num. 14:24)',
  },
  { answer: 'RAHAB', clue: 'She hid the spies under the flax (Josh. 2:6)' },
  {
    answer: 'DEBORAH',
    clue: 'Prophetess who judged Israel under a palm (Judg. 4:5)',
  },
  {
    answer: 'BARAK',
    clue: 'Commander who would not go without Deborah (Judg. 4:8)',
  },
  { answer: 'GIDEON', clue: 'He asked for a sign with a fleece (Judg. 6:37)' },
  {
    answer: 'SAMSON',
    clue: 'His strength was in his uncut hair (Judg. 16:17)',
  },
  {
    answer: 'DELILAH',
    clue: 'She coaxed the secret out of Samson (Judg. 16:18)',
  },
  { answer: 'RUTH', clue: 'Moabite widow who would not turn back from Naomi' },
  { answer: 'NAOMI', clue: 'She asked to be called Mara (Ruth 1:20)' },
  { answer: 'BOAZ', clue: 'Kinsman-redeemer of Bethlehem (Ruth 4:9)' },
  {
    answer: 'HANNAH',
    clue: 'Eli mistook her silent prayer for drunkenness (1 Sam. 1:13)',
  },
  {
    answer: 'SAMUEL',
    clue: 'Boy who answered the voice in the night',
  },
  { answer: 'ELI', clue: 'Aging priest at Shiloh (1 Sam. 1:9)' },
  { answer: 'SAUL', clue: 'The first king of Israel (1 Sam. 10:1)' },
  { answer: 'DAVID', clue: 'Shepherd, psalmist, and king (1 Sam. 16:13)' },
  {
    answer: 'GOLIATH',
    clue: 'Champion of Gath felled by a stone (1 Sam. 17:49)',
  },
  {
    answer: 'JONATHAN',
    clue: 'His soul was knit to the soul of David (1 Sam. 18:1)',
  },
  {
    answer: 'ABIGAIL',
    clue: 'She met David with loaves and wine (1 Sam. 25:18)',
  },
  {
    answer: 'NATHAN',
    clue: 'Prophet who said, "You are the man!" (2 Sam. 12:7)',
  },
  { answer: 'ABSALOM', clue: 'His hair caught fast in the oak (2 Sam. 18:9)' },
  { answer: 'SOLOMON', clue: 'He asked for a discerning heart (1 Kgs. 3:9)' },
  { answer: 'ELIJAH', clue: 'Taken up in a whirlwind (2 Kgs. 2:11)' },
  {
    answer: 'ELISHA',
    clue: 'He asked for a double portion of the spirit (2 Kgs. 2:9)',
  },
  {
    answer: 'NAAMAN',
    clue: 'He washed seven times in the Jordan (2 Kgs. 5:14)',
  },
  { answer: 'AHAB', clue: 'King who married Jezebel (1 Kgs. 16:31)' },
  {
    answer: 'JEZEBEL',
    clue: 'Queen who hunted the prophets of the LORD (1 Kgs. 18:4)',
  },
  {
    answer: 'HEZEKIAH',
    clue: 'He spread the threatening letter before the LORD (2 Kgs. 19:14)',
  },
  {
    answer: 'JOSIAH',
    clue: 'Boy king who found the Book of the Law (2 Kgs. 22:8)',
  },
  {
    answer: 'ESTHER',
    clue: 'Queen raised up for such a time as this',
  },
  { answer: 'MORDECAI', clue: 'He would not bow to Haman (Esth. 3:2)' },
  { answer: 'HAMAN', clue: 'He hung on the gallows he built (Esth. 7:10)' },
  { answer: 'NEHEMIAH', clue: 'Cupbearer who rebuilt the wall of Jerusalem' },
  { answer: 'EZRA', clue: 'Scribe who read the Law from daybreak (Neh. 8:3)' },
  {
    answer: 'JOB',
    clue: 'He blessed the name of the LORD after losing everything',
  },

  // People — the prophets
  {
    answer: 'ISAIAH',
    clue: 'Prophet who said, "Here am I. Send me!"',
  },
  {
    answer: 'JEREMIAH',
    clue: 'Prophet of the new covenant written on hearts',
  },
  {
    answer: 'BARUCH',
    clue: 'Scribe who wrote the scroll at dictation (Jer. 36:4)',
  },
  {
    answer: 'EZEKIEL',
    clue: 'He was set down in a valley of dry bones',
  },
  {
    answer: 'DANIEL',
    clue: 'He prayed three times a day toward Jerusalem',
  },
  {
    answer: 'HOSEA',
    clue: 'Prophet told to love an unfaithful wife',
  },
  {
    answer: 'JOEL',
    clue: 'Prophet of the Spirit poured out on all flesh (Acts 2:17)',
  },
  {
    answer: 'AMOS',
    clue: 'Herdsman of Tekoa and tender of sycamore figs',
  },
  {
    answer: 'JONAH',
    clue: 'He paid the fare and sailed the opposite way from Nineveh',
  },
  {
    answer: 'MICAH',
    clue: 'He asked what the LORD requires of you',
  },
  { answer: 'NAHUM', clue: 'Prophet of the fall of Nineveh' },
  {
    answer: 'HABAKKUK',
    clue: 'He stood watch on the ramparts for an answer',
  },
  { answer: 'HAGGAI', clue: 'Prophet who urged the house of the LORD rebuilt' },
  {
    answer: 'ZECHARIAH',
    clue: 'He foretold a king riding on a donkey (Matt. 21:5)',
  },
  {
    answer: 'MALACHI',
    clue: 'Last of the prophets in the Old Testament',
  },

  // People — the Gospels and Acts
  {
    answer: 'MARY',
    clue: 'She treasured all these things in her heart (Luke 2:19)',
  },
  {
    answer: 'GABRIEL',
    clue: 'Angel sent to a town called Nazareth (Luke 1:26)',
  },
  { answer: 'ELIZABETH', clue: 'Mother of John the Baptist (Luke 1:57)' },
  {
    answer: 'SIMEON',
    clue: 'He would not die before seeing the Christ (Luke 2:26)',
  },
  {
    answer: 'ANNA',
    clue: 'Prophetess who never left the temple courts (Luke 2:37)',
  },
  {
    answer: 'HEROD',
    clue: 'King who ordered the children killed (Matt. 2:16)',
  },
  {
    answer: 'PILATE',
    clue: 'He washed his hands before the crowd (Matt. 27:24)',
  },
  {
    answer: 'CAIAPHAS',
    clue: 'High priest before whom Jesus was tried (Matt. 26:57)',
  },
  {
    answer: 'BARABBAS',
    clue: 'Prisoner released in place of Jesus (Matt. 27:26)',
  },
  {
    answer: 'JUDAS',
    clue: 'He betrayed the Son of Man with a kiss (Luke 22:48)',
  },
  {
    answer: 'PETER',
    clue: 'He walked on the water, then began to sink (Matt. 14:30)',
  },
  {
    answer: 'ANDREW',
    clue: 'He brought his brother to Jesus first (John 1:41)',
  },
  {
    answer: 'JAMES',
    clue: 'Son of Zebedee mending nets when called (Mark 1:19)',
  },
  { answer: 'JOHN', clue: 'The disciple whom Jesus loved' },
  {
    answer: 'PHILIP',
    clue: 'He explained Isaiah to a man in a chariot (Acts 8:35)',
  },
  {
    answer: 'THOMAS',
    clue: 'He would not believe without the wounds (John 20:25)',
  },
  {
    answer: 'MATTHEW',
    clue: 'Tax collector called from his booth',
  },
  { answer: 'NATHANAEL', clue: 'He was seen under the fig tree (John 1:48)' },
  { answer: 'LAZARUS', clue: 'He came out after four days (John 11:44)' },
  {
    answer: 'MARTHA',
    clue: 'She was worried and upset about many things (Luke 10:41)',
  },
  {
    answer: 'ZACCHAEUS',
    clue: 'Short tax collector up a sycamore tree (Luke 19:4)',
  },
  {
    answer: 'NICODEMUS',
    clue: 'Pharisee who came to Jesus at night (John 3:2)',
  },
  {
    answer: 'STEPHEN',
    clue: 'First martyr, who saw heaven opened (Acts 7:56)',
  },
  { answer: 'PAUL', clue: 'Apostle to the Gentiles (Rom. 11:13)' },
  {
    answer: 'BARNABAS',
    clue: 'The apostles called him Son of Encouragement (Acts 4:36)',
  },
  {
    answer: 'SILAS',
    clue: 'He sang hymns at midnight in the jail (Acts 16:25)',
  },
  { answer: 'TIMOTHY', clue: 'A true son in the faith' },
  { answer: 'TITUS', clue: 'Left in Crete to appoint elders in every town' },
  {
    answer: 'LYDIA',
    clue: 'Dealer in purple whose heart was opened (Acts 16:14)',
  },
  {
    answer: 'PRISCILLA',
    clue: 'With Aquila she taught Apollos more accurately (Acts 18:26)',
  },
  {
    answer: 'AQUILA',
    clue: 'Tentmaker who worked beside Paul in Corinth (Acts 18:2)',
  },
  {
    answer: 'APOLLOS',
    clue: 'Eloquent Alexandrian mighty in the Scriptures (Acts 18:24)',
  },
  {
    answer: 'CORNELIUS',
    clue: 'Centurion whose prayers went up as a memorial (Acts 10:4)',
  },
  { answer: 'ANANIAS', clue: 'He laid hands on Saul at Damascus (Acts 9:17)' },
  { answer: 'DORCAS', clue: 'Seamstress raised to life at Joppa (Acts 9:40)' },
  {
    answer: 'FELIX',
    clue: 'Governor who grew afraid as Paul reasoned (Acts 24:25)',
  },
  { answer: 'AGRIPPA', clue: 'King who was almost persuaded (Acts 26:28)' },
  {
    answer: 'ONESIMUS',
    clue: 'Runaway sent back as a beloved brother (Philem. 1:16)',
  },
  { answer: 'JESUS', clue: 'The Word who became flesh (John 1:14)' },
  {
    answer: 'CHRIST',
    clue: 'The Anointed One confessed by Peter (Matt. 16:16)',
  },
  { answer: 'IMMANUEL', clue: 'God with us (Isa. 7:14)' },
  {
    answer: 'MESSIAH',
    clue: 'The one the woman at the well was waiting for (John 4:25)',
  },
  { answer: 'SATAN', clue: 'The accuser who prowls like a lion (1 Pet. 5:8)' },

  // Places
  { answer: 'EDEN', clue: 'Garden planted in the east (Gen. 2:8)' },
  { answer: 'ARARAT', clue: 'Mountains where the ark came to rest (Gen. 8:4)' },
  {
    answer: 'BABEL',
    clue: 'Tower where the language was confused (Gen. 11:9)',
  },
  {
    answer: 'CANAAN',
    clue: 'The land promised to the offspring of Abram (Gen. 12:7)',
  },
  {
    answer: 'SODOM',
    clue: 'City of the plain that was overthrown (Gen. 19:24)',
  },
  {
    answer: 'MORIAH',
    clue: 'Region of the mountain where Isaac was bound (Gen. 22:2)',
  },
  { answer: 'BETHEL', clue: 'Where Jacob dreamed of a stairway (Gen. 28:19)' },
  {
    answer: 'GOSHEN',
    clue: 'Region of Egypt given to the family of Jacob (Gen. 47:6)',
  },
  {
    answer: 'EGYPT',
    clue: 'The house of slavery they came out of (Exod. 20:2)',
  },
  { answer: 'MIDIAN', clue: 'Land where Moses kept a flock (Exod. 3:1)' },
  {
    answer: 'HOREB',
    clue: 'Mountain of God where the bush burned (Exod. 3:1)',
  },
  { answer: 'SINAI', clue: 'Mountain wrapped in smoke and fire (Exod. 19:18)' },
  {
    answer: 'MARAH',
    clue: 'Bitter water made sweet by a piece of wood (Exod. 15:25)',
  },
  {
    answer: 'PISGAH',
    clue: 'Height from which Moses saw the land (Deut. 34:1)',
  },
  {
    answer: 'JORDAN',
    clue: 'River that stood in a heap for Israel (Josh. 3:17)',
  },
  { answer: 'JERICHO', clue: 'City whose walls fell flat (Josh. 6:20)' },
  {
    answer: 'GILGAL',
    clue: 'Camp where the reproach of Egypt rolled away (Josh. 5:9)',
  },
  {
    answer: 'SHILOH',
    clue: 'Where the tent of meeting stood before the temple (Josh. 18:1)',
  },
  { answer: 'HEBRON', clue: 'The inheritance given to Caleb (Josh. 14:13)' },
  { answer: 'MOAB', clue: 'The homeland Ruth left behind (Ruth 1:4)' },
  {
    answer: 'CARMEL',
    clue: 'Mountain where the fire fell for Elijah (1 Kgs. 18:38)',
  },
  {
    answer: 'NINEVEH',
    clue: 'Great city that repented in sackcloth (Jonah 3:5)',
  },
  { answer: 'TARSHISH', clue: 'Where Jonah bought a ticket (Jonah 1:3)' },
  { answer: 'BABYLON', clue: 'City of the seventy-year exile (Jer. 29:10)' },
  { answer: 'SUSA', clue: 'Citadel where Esther was made queen (Esth. 1:2)' },
  { answer: 'TEKOA', clue: 'Village home of the herdsman prophet (Amos 1:1)' },
  {
    answer: 'ZION',
    clue: 'The mountain God chose for His dwelling (Ps. 132:13)',
  },
  { answer: 'JERUSALEM', clue: 'City of the great King (Ps. 48:2)' },
  { answer: 'BETHLEHEM', clue: 'House of bread, and city of David (Mic. 5:2)' },
  { answer: 'NAZARETH', clue: 'Town where Jesus was brought up (Luke 4:16)' },
  {
    answer: 'GALILEE',
    clue: 'Sea Jesus walked across in the fourth watch (Matt. 14:25)',
  },
  {
    answer: 'CAPERNAUM',
    clue: 'Lakeside town Jesus made His own (Matt. 4:13)',
  },
  { answer: 'CANA', clue: 'Where water became wine (John 2:11)' },
  { answer: 'SAMARIA', clue: 'Region Jesus had to pass through (John 4:4)' },
  {
    answer: 'BETHANY',
    clue: 'Village of Mary, Martha and Lazarus (John 11:1)',
  },
  {
    answer: 'SILOAM',
    clue: 'Pool where the blind man washed and saw (John 9:7)',
  },
  {
    answer: 'KIDRON',
    clue: 'Valley crossed on the way to the garden (John 18:1)',
  },
  {
    answer: 'GETHSEMANE',
    clue: 'Garden of the sweat like drops of blood (Luke 22:44)',
  },
  { answer: 'GOLGOTHA', clue: 'The Place of the Skull (John 19:17)' },
  {
    answer: 'EMMAUS',
    clue: 'Road where their hearts burned within them (Luke 24:32)',
  },
  {
    answer: 'DAMASCUS',
    clue: 'Road where a light flashed around Saul (Acts 9:3)',
  },
  {
    answer: 'JOPPA',
    clue: 'Port where Peter saw a sheet let down (Acts 10:11)',
  },
  {
    answer: 'ANTIOCH',
    clue: 'Where disciples were first called Christians (Acts 11:26)',
  },
  {
    answer: 'PHILIPPI',
    clue: 'Where an earthquake shook the prison doors (Acts 16:26)',
  },
  {
    answer: 'ATHENS',
    clue: 'City of the altar to an unknown god (Acts 17:23)',
  },
  {
    answer: 'CORINTH',
    clue: 'Church Paul wrote to twice about love and order (Acts 18:1)',
  },
  {
    answer: 'EPHESUS',
    clue: 'Church that had forsaken its first love (Rev. 2:4)',
  },
  {
    answer: 'CAESAREA',
    clue: 'Where Paul was held for two years (Acts 24:27)',
  },
  {
    answer: 'MALTA',
    clue: 'Island of the shipwreck and the viper (Acts 28:1)',
  },
  { answer: 'ROME', clue: 'City Paul was eager to preach in (Acts 28:14)' },
  {
    answer: 'PATMOS',
    clue: 'Island where the Revelation was given (Rev. 1:9)',
  },

  // Things, signs and offerings
  {
    answer: 'ARK',
    clue: 'Vessel of gopher wood, pitched inside and out (Gen. 6:14)',
  },
  { answer: 'RIB', clue: 'From it the woman was made (Gen. 2:22)' },
  { answer: 'FIG', clue: 'Its leaves were the first covering (Gen. 3:7)' },
  { answer: 'DUST', clue: 'What man is, and what he returns to (Gen. 3:19)' },
  {
    answer: 'SERPENT',
    clue: 'It was more crafty than any beast of the field (Gen. 3:1)',
  },
  { answer: 'RAVEN', clue: 'First bird sent out from the ark (Gen. 8:7)' },
  { answer: 'DOVE', clue: 'It returned with a fresh olive leaf (Gen. 8:11)' },
  {
    answer: 'OLIVE',
    clue: 'Tree of the leaf the dove brought back (Gen. 8:11)',
  },
  {
    answer: 'RAINBOW',
    clue: 'Sign of the covenant set in the clouds (Gen. 9:13)',
  },
  {
    answer: 'FLOOD',
    clue: 'It came upon the earth for forty days (Gen. 7:17)',
  },
  { answer: 'STEW', clue: 'The red price of a birthright (Gen. 25:30)' },
  { answer: 'LADDER', clue: 'What Jacob saw reaching to heaven (Gen. 28:12)' },
  {
    answer: 'MANNA',
    clue: 'Bread from heaven, gathered each morning (Exod. 16:15)',
  },
  { answer: 'QUAIL', clue: 'Meat the wind drove into the camp (Num. 11:31)' },
  { answer: 'STAFF', clue: 'It became a serpent before Pharaoh (Exod. 7:10)' },
  {
    answer: 'ROD',
    clue: 'With the staff, it comforts in the valley (Ps. 23:4)',
  },
  {
    answer: 'PASSOVER',
    clue: 'Feast of the blood on the doorposts (Exod. 12:13)',
  },
  {
    answer: 'TABLETS',
    clue: 'Stone, written by the finger of God (Exod. 31:18)',
  },
  {
    answer: 'ALTAR',
    clue: 'Where the offering was laid and burned (Gen. 8:20)',
  },
  {
    answer: 'EPHOD',
    clue: 'Priestly vestment of gold and fine linen (Exod. 28:6)',
  },
  {
    answer: 'URIM',
    clue: 'Placed with the Thummim in the breastpiece (Exod. 28:30)',
  },
  { answer: 'CHERUB', clue: 'Winged figure over the mercy seat (Exod. 25:20)' },
  {
    answer: 'TABERNACLE',
    clue: 'Tent the glory filled in the wilderness (Exod. 40:34)',
  },
  { answer: 'INCENSE', clue: 'What prayer is likened to, rising (Ps. 141:2)' },
  { answer: 'JUBILEE', clue: 'The fiftieth year of release (Lev. 25:10)' },
  {
    answer: 'TITHE',
    clue: 'The whole tenth brought into the storehouse (Mal. 3:10)',
  },
  { answer: 'CUBIT', clue: 'Ancient measure of the ark (Gen. 6:15)' },
  {
    answer: 'OMER',
    clue: 'Measure of manna gathered per person (Exod. 16:16)',
  },
  {
    answer: 'SHEKEL',
    clue: 'Weight of silver counted out in trade (Gen. 23:16)',
  },
  {
    answer: 'SCROLL',
    clue: 'The heavens will be rolled up like one (Isa. 34:4)',
  },
  { answer: 'LAMP', clue: 'Your word is one to my feet (Ps. 119:105)' },
  { answer: 'LIONS', clue: 'Daniel spent the night among them (Dan. 6:16)' },
  {
    answer: 'FISH',
    clue: 'A great one swallowed the runaway prophet (Jonah 1:17)',
  },
  {
    answer: 'FIRE',
    clue: 'It fell on Carmel and consumed the sacrifice (1 Kgs. 18:38)',
  },
  { answer: 'CLOUD', clue: 'It went before them by day (Exod. 13:21)' },
  { answer: 'STAR', clue: 'It went ahead of them and stopped (Matt. 2:9)' },
  { answer: 'MAGI', clue: 'Wise men who came from the east (Matt. 2:1)' },
  { answer: 'GOLD', clue: 'The first of the three gifts (Matt. 2:11)' },
  {
    answer: 'MYRRH',
    clue: 'Gift given with gold and frankincense (Matt. 2:11)',
  },
  { answer: 'MANGER', clue: 'She laid Him in it (Luke 2:7)' },
  { answer: 'INN', clue: 'There was no room for them in it (Luke 2:7)' },
  { answer: 'CENSUS', clue: 'Decree that sent them to Bethlehem (Luke 2:1)' },
  { answer: 'CAESAR', clue: 'Give back to him what is his (Mark 12:17)' },
  { answer: 'LOCUSTS', clue: 'What John ate with wild honey (Mark 1:6)' },
  {
    answer: 'DESERT',
    clue: 'A voice calls out in it, "Prepare the way" (Isa. 40:3)',
  },
  {
    answer: 'WILDERNESS',
    clue: 'Where He was led to fast forty days (Matt. 4:1)',
  },
  {
    answer: 'BOAT',
    clue: 'He was asleep on a cushion in its stern (Mark 4:38)',
  },
  {
    answer: 'STORM',
    clue: 'He rebuked it and there was a great calm (Mark 4:39)',
  },
  {
    answer: 'NET',
    clue: 'Cast on the right side, it could not be hauled in (John 21:6)',
  },
  {
    answer: 'LOAVES',
    clue: 'Five of them, with two fish, fed a multitude (John 6:9)',
  },
  {
    answer: 'MUSTARD',
    clue: 'The smallest seed that becomes a tree (Matt. 13:32)',
  },
  {
    answer: 'LEAVEN',
    clue: 'A little of it works through the whole batch (Gal. 5:9)',
  },
  {
    answer: 'PEARL',
    clue: 'He sold everything to buy the one of great value (Matt. 13:46)',
  },
  {
    answer: 'TALENT',
    clue: 'What the third servant dug a hole and hid (Matt. 25:25)',
  },
  {
    answer: 'COIN',
    clue: 'She swept the house until she found it (Luke 15:8)',
  },
  {
    answer: 'SWINE',
    clue: 'The younger son was sent to feed them (Luke 15:15)',
  },
  {
    answer: 'PODS',
    clue: 'What the prodigal longed to fill himself with (Luke 15:16)',
  },
  { answer: 'ROBE', clue: 'The father called for the best one (Luke 15:22)' },
  {
    answer: 'RING',
    clue: 'Put on the hand of the son who came home (Luke 15:22)',
  },
  {
    answer: 'DONKEY',
    clue: 'He rode one down from the Mount of Olives (Matt. 21:7)',
  },
  { answer: 'PALM', clue: 'Branches taken out to meet Him (John 12:13)' },
  { answer: 'SILVER', clue: 'Thirty pieces of it (Matt. 26:15)' },
  {
    answer: 'ROOSTER',
    clue: 'It crowed and Peter went out weeping (Luke 22:60)',
  },
  { answer: 'CUP', clue: '"Let this one pass from Me" (Matt. 26:39)' },
  {
    answer: 'BLOOD',
    clue: 'Of the covenant, poured out for many (Mark 14:24)',
  },
  { answer: 'THORNS', clue: 'Twisted into a crown for the King (Matt. 27:29)' },
  {
    answer: 'SPEAR',
    clue: 'It pierced His side and out came water (John 19:34)',
  },
  { answer: 'NAILS', clue: 'Thomas wanted to see their marks (John 20:25)' },
  {
    answer: 'LINEN',
    clue: 'Joseph of Arimathea wrapped Him in it (Matt. 27:59)',
  },
  { answer: 'VEIL', clue: 'Torn in two from top to bottom (Matt. 27:51)' },
  { answer: 'TOMB', clue: 'They found it empty on the first day (Luke 24:3)' },
  {
    answer: 'STONE',
    clue: 'It had been rolled away from the entrance (Mark 16:4)',
  },
  {
    answer: 'TRUMPET',
    clue: 'At the last one, the dead will be raised (1 Cor. 15:52)',
  },
  { answer: 'SEAL', clue: 'The Lamb opened the first of seven (Rev. 6:1)' },
  { answer: 'ARMOR', clue: 'Put on the full set of God (Eph. 6:11)' },
  {
    answer: 'SHIELD',
    clue: 'Of faith, to extinguish the flaming arrows (Eph. 6:16)',
  },
  { answer: 'HELMET', clue: 'Of salvation, worn with the sword (Eph. 6:17)' },
  {
    answer: 'SWORD',
    clue: 'Of the Spirit, which is the word of God (Eph. 6:17)',
  },
  {
    answer: 'CROWN',
    clue: 'Of life, promised to the one who perseveres (Jas. 1:12)',
  },
  {
    answer: 'THRONE',
    clue: 'Approach the one of grace with confidence (Heb. 4:16)',
  },

  // Words the whole book turns on
  { answer: 'WORD', clue: 'In the beginning was the... (John 1:1)' },
  {
    answer: 'LIGHT',
    clue: 'What Jesus called Himself, for the world (John 8:12)',
  },
  { answer: 'BREAD', clue: '"I am the ... of life" (John 6:35)' },
  { answer: 'VINE', clue: '"I am the true ..." (John 15:1)' },
  {
    answer: 'BRANCH',
    clue: 'Apart from the vine it can do nothing (John 15:5)',
  },
  { answer: 'DOOR', clue: '"I am the ... for the sheep" (John 10:7)' },
  { answer: 'SHEPHERD', clue: 'The LORD is mine; I shall not want (Ps. 23:1)' },
  {
    answer: 'LAMB',
    clue: 'Of God, who takes away the sin of the world (John 1:29)',
  },
  { answer: 'WAY', clue: 'With the truth and the life (John 14:6)' },
  { answer: 'TRUTH', clue: 'Know it, and it will set you free (John 8:32)' },
  {
    answer: 'WATER',
    clue: 'The living kind offered at a Samaritan well (John 4:10)',
  },
  {
    answer: 'WELL',
    clue: 'Jesus sat down beside it, weary from the journey (John 4:6)',
  },
  { answer: 'ROCK', clue: 'On this one He builds His church (Matt. 16:18)' },
  {
    answer: 'SAND',
    clue: 'The foolish man built his house on it (Matt. 7:26)',
  },
  { answer: 'HOUSE', clue: 'Built on rock, it did not fall (Matt. 7:25)' },
  { answer: 'YOKE', clue: 'His is easy, and His burden light (Matt. 11:30)' },
  { answer: 'CROSS', clue: 'Take it up daily and follow (Luke 9:23)' },
  { answer: 'SALT', clue: 'You are the ... of the earth (Matt. 5:13)' },
  { answer: 'MEEK', clue: 'They will inherit the earth (Matt. 5:5)' },
  { answer: 'PURE', clue: 'In heart, they will see God (Matt. 5:8)' },
  { answer: 'MERCY', clue: 'God desires it, and not sacrifice (Hos. 6:6)' },
  {
    answer: 'GRACE',
    clue: 'By it you have been saved, through faith (Eph. 2:8)',
  },
  { answer: 'FAITH', clue: 'The assurance of what we hope for (Heb. 11:1)' },
  {
    answer: 'HOPE',
    clue: 'An anchor for the soul, firm and secure (Heb. 6:19)',
  },
  {
    answer: 'LOVE',
    clue: 'The greatest of the three that remain (1 Cor. 13:13)',
  },
  {
    answer: 'JOY',
    clue: 'Fruit of the Spirit between love and peace (Gal. 5:22)',
  },
  { answer: 'PEACE', clue: 'His, not as the world gives (John 14:27)' },
  {
    answer: 'PATIENCE',
    clue: 'The fruit of the Spirit that suffers long (Gal. 5:22)',
  },
  {
    answer: 'KINDNESS',
    clue: 'Fruit of the Spirit paired with goodness (Gal. 5:22)',
  },
  {
    answer: 'GOODNESS',
    clue: 'Fruit of the Spirit following kindness (Gal. 5:22)',
  },
  {
    answer: 'GENTLENESS',
    clue: 'Fruit of the Spirit named before self-control (Gal. 5:23)',
  },
  { answer: 'FRUIT', clue: 'Of the Spirit: love, joy, peace (Gal. 5:22)' },
  {
    answer: 'SEED',
    clue: 'Unless it falls and dies it remains alone (John 12:24)',
  },
  { answer: 'SOWER', clue: 'He went out to scatter (Matt. 13:3)' },
  {
    answer: 'HARVEST',
    clue: 'It is plentiful, but the workers are few (Matt. 9:37)',
  },
  {
    answer: 'SHEEP',
    clue: 'He leaves the ninety-nine to find the one (Luke 15:4)',
  },
  {
    answer: 'GOATS',
    clue: 'Separated from the sheep at the end (Matt. 25:32)',
  },
  {
    answer: 'CAMEL',
    clue: 'Easier through a needle than a rich man into the kingdom (Matt. 19:24)',
  },
  {
    answer: 'WINE',
    clue: 'New, and not to be poured into old skins (Matt. 9:17)',
  },
  { answer: 'BODY', clue: 'What He called the bread He broke (Luke 22:19)' },
  { answer: 'SABBATH', clue: 'Made for man, not man for it (Mark 2:27)' },
  {
    answer: 'COVENANT',
    clue: 'What God cut with Abram between the pieces (Gen. 15:18)',
  },
  { answer: 'PARABLE', clue: 'The form He taught the crowds in (Matt. 13:34)' },
  { answer: 'GOSPEL', clue: 'The power of God for salvation (Rom. 1:16)' },
  { answer: 'APOSTLE', clue: 'One of the twelve He sent out (Luke 6:13)' },
  {
    answer: 'DISCIPLE',
    clue: 'One who takes up a cross and follows (Luke 14:27)',
  },
  { answer: 'PROPHET', clue: 'One who speaks the word of the LORD' },
  {
    answer: 'PRIEST',
    clue: 'He offers gifts and sacrifices for sins (Heb. 5:1)',
  },
  { answer: 'ELDER', clue: 'Appointed in every town by Titus (Titus 1:5)' },
  {
    answer: 'DEACON',
    clue: 'Servant of the church, worthy of respect (1 Tim. 3:8)',
  },
  { answer: 'SCRIBE', clue: 'Copyist and teacher of the Law' },
  {
    answer: 'PHARISEE',
    clue: 'He stood and thanked God he was not like others (Luke 18:11)',
  },
  {
    answer: 'SADDUCEE',
    clue: 'He said there is no resurrection (Matt. 22:23)',
  },
  {
    answer: 'GENTILE',
    clue: 'Wild branch grafted into the olive tree (Rom. 11:17)',
  },
  { answer: 'REMNANT', clue: 'The few preserved by grace (Rom. 11:5)' },
  { answer: 'EXILE', clue: 'Seventy years away from home (Jer. 29:10)' },
  {
    answer: 'SYNAGOGUE',
    clue: 'Where He stood up to read from Isaiah (Luke 4:16)',
  },
  {
    answer: 'TEMPLE',
    clue: 'The house Solomon built for the Name (1 Kgs. 6:1)',
  },
  {
    answer: 'PENTECOST',
    clue: 'Day of the sound like a rushing wind (Acts 2:1)',
  },
  { answer: 'BAPTISM', clue: 'We were buried with Him through it (Rom. 6:4)' },
  {
    answer: 'REPENT',
    clue: 'What John cried out in the wilderness (Matt. 3:2)',
  },
  {
    answer: 'FORGIVE',
    clue: 'Not seven times, but seventy-seven (Matt. 18:22)',
  },
  { answer: 'RANSOM', clue: 'His life given as one for many (Mark 10:45)' },
  { answer: 'REDEEM', clue: 'To buy back what was lost' },
  {
    answer: 'SALVATION',
    clue: 'It belongs to our God on the throne (Rev. 7:10)',
  },
  {
    answer: 'SACRIFICE',
    clue: 'Offer your bodies as a living one (Rom. 12:1)',
  },
  { answer: 'OFFERING', clue: 'What the cheerful giver brings (2 Cor. 9:7)' },
  { answer: 'FIRSTBORN', clue: 'He is this over all creation (Col. 1:15)' },
  { answer: 'INHERIT', clue: 'What the meek will do to the earth (Matt. 5:5)' },
  { answer: 'BIRTHRIGHT', clue: 'Esau despised his (Gen. 25:34)' },
  { answer: 'ISRAEL', clue: 'The new name given at the ford (Gen. 32:28)' },
  {
    answer: 'HALLELUJAH',
    clue: 'The great multitude roared it in heaven (Rev. 19:1)',
  },
  {
    answer: 'HOSANNA',
    clue: 'Cry of the crowd with the palm branches (John 12:13)',
  },
  { answer: 'AMEN', clue: 'The word that seals a prayer' },
  { answer: 'SELAH', clue: 'The pause marked through the Psalms (Ps. 3:2)' },
  { answer: 'ALPHA', clue: 'The Beginning, spoken with the End (Rev. 22:13)' },
  { answer: 'OMEGA', clue: 'The End, spoken with the Beginning (Rev. 22:13)' },
  { answer: 'HEAVEN', clue: 'Where our citizenship is (Phil. 3:20)' },
  {
    answer: 'GLORY',
    clue: 'It filled the tabernacle so none could enter (Exod. 40:35)',
  },
  { answer: 'HOLY', clue: '"Be ..., because I am ..." (1 Pet. 1:16)' },
  { answer: 'SPIRIT', clue: 'The Helper sent in His name (John 14:26)' },
  {
    answer: 'FATHER',
    clue: '"Our ... in heaven, hallowed be Your name" (Matt. 6:9)',
  },
  { answer: 'SON', clue: 'The one and only, given for the world (John 3:16)' },
  {
    answer: 'KING',
    clue: 'What Israel demanded so it could be like the nations (1 Sam. 8:5)',
  },
  { answer: 'LORD', clue: 'He is my shepherd (Ps. 23:1)' },
  { answer: 'SAVIOR', clue: 'Born this day in the city of David (Luke 2:11)' },
  {
    answer: 'ANGEL',
    clue: 'Messenger who stood before the shepherds (Luke 2:9)',
  },
  { answer: 'WISDOM', clue: 'Ask for it and God gives generously (Jas. 1:5)' },
  {
    answer: 'KNOWLEDGE',
    clue: 'The fear of the LORD is its beginning (Prov. 1:7)',
  },
  {
    answer: 'PRAYER',
    clue: 'Of a righteous man, powerful and effective (Jas. 5:16)',
  },
  { answer: 'FASTING', clue: 'Do it without a gloomy face (Matt. 6:16)' },
  { answer: 'WIDOW', clue: 'She put in all she had to live on (Mark 12:44)' },
  {
    answer: 'ORPHAN',
    clue: 'Pure religion looks after them in distress (Jas. 1:27)',
  },
  {
    answer: 'STRANGER',
    clue: '"I was a ... and you took Me in" (Matt. 25:35)',
  },
  { answer: 'NEIGHBOR', clue: 'Love him as yourself (Mark 12:31)' },
  {
    answer: 'ENEMY',
    clue: 'Love him, and pray for those who persecute (Matt. 5:44)',
  },
  {
    answer: 'SERVANT',
    clue: 'The greatest among you will be one (Matt. 23:11)',
  },
  {
    answer: 'HUMBLE',
    clue: 'God opposes the proud but gives grace to them (Jas. 4:6)',
  },
  { answer: 'PRIDE', clue: 'It goes before destruction (Prov. 16:18)' },
  { answer: 'ANGER', clue: 'Do not let the sun set on it (Eph. 4:26)' },
  { answer: 'TONGUE', clue: 'A small part that makes great boasts (Jas. 3:5)' },
  {
    answer: 'HEART',
    clue: 'Guard it, for from it flow the springs of life (Prov. 4:23)',
  },
  { answer: 'SOUL', clue: 'He restores mine (Ps. 23:3)' },
  { answer: 'MIND', clue: 'Be transformed by its renewing (Rom. 12:2)' },
  {
    answer: 'FLESH',
    clue: 'The spirit is willing, but this is weak (Matt. 26:41)',
  },
  { answer: 'SIN', clue: 'Its wages is death (Rom. 6:23)' },
  { answer: 'DEATH', clue: '"Where, O ..., is your sting?" (1 Cor. 15:55)' },
  { answer: 'LIFE', clue: 'Eternal, the free gift of God (Rom. 6:23)' },
  { answer: 'ETERNAL', clue: 'The kind of life the believer has (John 3:16)' },
  { answer: 'MILK', clue: 'For infants, not solid food (Heb. 5:12)' },
  { answer: 'HONEY', clue: 'The land flowed with milk and it (Exod. 3:8)' },
  { answer: 'LAND', clue: 'Flowing with milk and honey (Exod. 3:8)' },
  { answer: 'VALLEY', clue: 'Of the shadow of death (Ps. 23:4)' },
  {
    answer: 'RIVER',
    clue: 'Of the water of life, clear as crystal (Rev. 22:1)',
  },
  {
    answer: 'MOUNTAIN',
    clue: 'Faith the size of a seed moves it (Matt. 17:20)',
  },
  { answer: 'SEVEN', clue: 'Days of the first week (Gen. 2:2)' },
  { answer: 'FORTY', clue: 'Days of rain, and of fasting (Gen. 7:12)' },
  { answer: 'THREE', clue: 'Days in the belly of the great fish (Jonah 1:17)' },
  { answer: 'TWELVE', clue: 'Tribes, and apostles (Luke 6:13)' },
]

const GRID_SIZE = 11
/** A grid with fewer answers than this is not a puzzle — the run fails. */
const MIN_WORDS = 14
/** Stop rebuilding once a grid is this full. Measured over 800 consecutive
 * days, every date reaches it inside three attempts. */
const TARGET_WORDS = 18
const MAX_ATTEMPTS = 20
const BUILD_PASSES = 5
/** Length that interlocks most easily on an 11x11 — see buildBoard. */
const EASIEST_LENGTH = 4
/** Shortest answer allowed to be the middle-row spine. */
const SPINE_MIN = 9

type Dir = 'across' | 'down'

interface Placed {
  answer: string
  clue: string
  row: number
  col: number
  dir: Dir
}

interface Board {
  cells: (string | null)[][]
  /** Which squares are already claimed by a word running that way. */
  claimed: Record<Dir, boolean[][]>
  placed: Placed[]
  used: Set<string>
}

function emptyBoard(): Board {
  const grid = <T>(fill: T) =>
    Array.from({ length: GRID_SIZE }, () =>
      Array.from({ length: GRID_SIZE }, () => fill),
    )
  return {
    cells: grid<string | null>(null),
    claimed: { across: grid(false), down: grid(false) },
    placed: [],
    used: new Set<string>(),
  }
}

function letterAt(board: Board, row: number, col: number): string | null {
  if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null
  return board.cells[row][col]
}

/**
 * How many existing letters this placement would cross, or -1 if it is illegal.
 * Legal means: inside the grid; the squares immediately before and after the
 * word are empty; every square either already holds the right letter (a
 * crossing) or is empty with both perpendicular neighbours empty; and no
 * square is already claimed by another word running the same way.
 */
function scorePlacement(
  board: Board,
  answer: string,
  row: number,
  col: number,
  dir: Dir,
): number {
  const dr = dir === 'down' ? 1 : 0
  const dc = dir === 'across' ? 1 : 0
  const endRow = row + dr * (answer.length - 1)
  const endCol = col + dc * (answer.length - 1)
  if (row < 0 || col < 0 || endRow >= GRID_SIZE || endCol >= GRID_SIZE)
    return -1

  // The squares that cap the word must be blocks, or the word would run on.
  if (letterAt(board, row - dr, col - dc) !== null) return -1
  if (letterAt(board, endRow + dr, endCol + dc) !== null) return -1

  let crossings = 0
  for (let i = 0; i < answer.length; i += 1) {
    const r = row + dr * i
    const c = col + dc * i
    if (board.claimed[dir][r][c]) return -1

    const existing = board.cells[r][c]
    if (existing !== null) {
      if (existing !== answer[i]) return -1
      crossings += 1
      continue
    }
    // A fresh square must not sit alongside another word running the other way.
    if (letterAt(board, r - dc, c - dr) !== null) return -1
    if (letterAt(board, r + dc, c + dr) !== null) return -1
  }
  return crossings
}

function place(
  board: Board,
  entry: BankEntry,
  row: number,
  col: number,
  dir: Dir,
): void {
  const dr = dir === 'down' ? 1 : 0
  const dc = dir === 'across' ? 1 : 0
  for (let i = 0; i < entry.answer.length; i += 1) {
    const r = row + dr * i
    const c = col + dc * i
    board.cells[r][c] = entry.answer[i]
    board.claimed[dir][r][c] = true
  }
  board.placed.push({ answer: entry.answer, clue: entry.clue, row, col, dir })
  board.used.add(entry.answer)
}

/** Best legal home for a word, or null. Ties break to the earliest square,
 * across before down — so the search order is fixed, not incidental. */
function bestPlacement(
  board: Board,
  answer: string,
): { row: number; col: number; dir: Dir } | null {
  let best: { row: number; col: number; dir: Dir } | null = null
  let bestScore = 0
  for (const dir of ['across', 'down'] as const) {
    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let col = 0; col < GRID_SIZE; col += 1) {
        const score = scorePlacement(board, answer, row, col, dir)
        if (score > bestScore) {
          bestScore = score
          best = { row, col, dir }
        }
      }
    }
  }
  return best
}

interface NumberedEntry {
  number: number
  row: number
  col: number
  clue: string
  answer: string
}

/** Standard numbering: left to right, top to bottom; a square takes the next
 * number when an across or a down answer starts there. */
function numberGrid(cells: (string | null)[][]): {
  across: { number: number; row: number; col: number; answer: string }[]
  down: { number: number; row: number; col: number; answer: string }[]
} {
  const across: { number: number; row: number; col: number; answer: string }[] =
    []
  const down: { number: number; row: number; col: number; answer: string }[] =
    []
  const filled = (r: number, c: number) =>
    r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE && cells[r][c] !== null

  let next = 1
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      if (!filled(row, col)) continue
      const startsAcross = !filled(row, col - 1) && filled(row, col + 1)
      const startsDown = !filled(row - 1, col) && filled(row + 1, col)
      if (!startsAcross && !startsDown) continue
      const number = next
      next += 1
      if (startsAcross) {
        let answer = ''
        for (let c = col; filled(row, c); c += 1) answer += cells[row][c]
        across.push({ number, row, col, answer })
      }
      if (startsDown) {
        let answer = ''
        for (let r = row; filled(r, col); r += 1) answer += cells[r][col]
        down.push({ number, row, col, answer })
      }
    }
  }
  return { across, down }
}

/** One construction run. `attempt` is folded into the seed so a run that comes
 * out thin can be retried without any of it becoming non-deterministic. */
function buildBoard(isoDate: string, attempt: number): Board {
  const rng = mulberry32(hashSeed(`${isoDate}:crossword:${attempt}`))
  const board = emptyBoard()

  // The seed answer runs across the middle row: long, centred, and the spine
  // everything else hangs from.
  const spines = CROSSWORD_BANK.filter((e) => e.answer.length >= SPINE_MIN)
  const spine = spines[pickIndex(rng, spines.length)]
  const middle = Math.floor(GRID_SIZE / 2)
  place(
    board,
    spine,
    middle,
    Math.floor((GRID_SIZE - spine.answer.length) / 2),
    'across',
  )

  // Then repeated passes over a shuffled bank, working outwards from the short
  // answers. Long answers first strangles the grid — they eat the open rows and
  // leave nothing to cross — so the bank is ordered by distance from the
  // easiest length to interlock. The sort is stable, so within a length the
  // shuffle still decides.
  const order = shuffled(rng, CROSSWORD_BANK).sort(
    (a, b) =>
      Math.abs(a.answer.length - EASIEST_LENGTH) -
      Math.abs(b.answer.length - EASIEST_LENGTH),
  )
  for (let pass = 0; pass < BUILD_PASSES; pass += 1) {
    for (const entry of order) {
      if (board.used.has(entry.answer)) continue
      const spot = bestPlacement(board, entry.answer)
      if (spot) place(board, entry, spot.row, spot.col, spot.dir)
    }
  }
  return board
}

export async function generateCrossword(
  date: Date,
): Promise<EditionItem<'crossword'>[]> {
  const publishDate = isoDay(date)

  // Greedy construction is luck-of-the-draw about how much it fits, so build
  // repeatedly and keep the fullest grid, stopping as soon as one is good
  // enough. Every attempt is seeded, so this is a fixed search, not a random one.
  let board = buildBoard(publishDate, 0)
  for (
    let attempt = 1;
    attempt < MAX_ATTEMPTS && board.placed.length < TARGET_WORDS;
    attempt += 1
  ) {
    const candidate = buildBoard(publishDate, attempt)
    if (candidate.placed.length > board.placed.length) board = candidate
  }

  if (board.placed.length < MIN_WORDS) {
    throw new Error(
      `puzzles: crossword for ${publishDate} placed only ${board.placed.length} answers (need ${MIN_WORDS})`,
    )
  }

  // Read the finished grid back and pin every run to the clue that claims it.
  const numbered = numberGrid(board.cells)
  const clueFor = (dir: Dir, row: number, col: number): Placed => {
    const hit = board.placed.find(
      (p) => p.dir === dir && p.row === row && p.col === col,
    )
    if (!hit) {
      throw new Error(
        `puzzles: crossword for ${publishDate} has an unclued ${dir} answer at ${row},${col}`,
      )
    }
    return hit
  }

  const toClues = (
    dir: Dir,
    runs: { number: number; row: number; col: number; answer: string }[],
  ): NumberedEntry[] =>
    runs.map((run) => {
      const source = clueFor(dir, run.row, run.col)
      if (source.answer !== run.answer) {
        throw new Error(
          `puzzles: crossword for ${publishDate} reads ${run.answer} at ${dir} ${run.row},${run.col} but the clue answers ${source.answer}`,
        )
      }
      return {
        number: run.number,
        row: run.row,
        col: run.col,
        clue: source.clue,
        answer: source.answer,
      }
    })

  const across = toClues('across', numbered.across)
  const down = toClues('down', numbered.down)

  if (across.length + down.length !== board.placed.length) {
    throw new Error(
      `puzzles: crossword for ${publishDate} placed ${board.placed.length} answers but the grid reads ${across.length + down.length}`,
    )
  }

  const payload: CrosswordPayload = {
    size: GRID_SIZE,
    grid: board.cells,
    clues: { across, down },
    source: TRANSLATION,
  }

  return [
    { kind: 'crossword', publishDate, slot: 0, status: 'approved', payload },
  ]
}
