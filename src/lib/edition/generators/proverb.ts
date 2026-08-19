/**
 * The Daily Bread — The Proverb (SA-092).
 *
 * One proverb a day, BSB verbatim, read straight out of the committed corpus
 * at `public/bibles/BSB/PRO.json`. Nothing here is written by us.
 *
 * THE POOL is the two-line sayings: chapters 10-29 — the sentence-proverb
 * collections (the Proverbs of Solomon, the Sayings of the Wise, the
 * Hezekiah collection) — one verse at a time, 12-30 words. That excludes the
 * long parental discourses of ch. 1-9 (which do not stand alone a verse at a
 * time), the numerical sayings and the acrostic of 30-31, and the fragments
 * too short or too long to read as a day's proverb. ~550 verses qualify.
 *
 * DETERMINISM: days-since-epoch modulo the pool — consecutive days walk
 * consecutive indexes, so no proverb repeats within `pool.length` days.
 * A missing corpus file or a pool below the floor THROWS (Rule 1). The pool
 * is ORDERED BY A STABLE HASH of the reference, not chapter order — chapter
 * order would read the book serially one verse a day, which is a reading
 * plan, not a proverb-a-day. Hashing scatters the walk across all twenty
 * chapters while staying a pure function of the data.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import type { EditionItem, ProverbPayload } from '../kinds'

/** The sentence-proverb chapters. Deliberate: see the file comment. */
const FIRST_CHAPTER = 10
const LAST_CHAPTER = 29

/** Word bounds for a saying that stands alone. */
const MIN_WORDS = 12
const MAX_WORDS = 30

/** The pool may legitimately shrink a little if the corpus is re-issued;
 * below this something is wrong with the data or the filter. */
export const PROVERB_POOL_FLOOR = 300

interface ProverbEntry {
  reference: string
  text: string
}

let cachedPool: ProverbEntry[] | null = null

/** FNV-1a, 32-bit — the same stable hash the puzzle page uses. */
function fnv1a(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/**
 * The eligible proverbs, ordered by reference hash (see DETERMINISM in the
 * file comment). Deterministic: same corpus, same pool. Exported so the
 * tests can assert the floor.
 */
export function proverbPool(
  corpusPath: string = path.join(
    process.cwd(),
    'public',
    'bibles',
    'BSB',
    'PRO.json',
  ),
): ProverbEntry[] {
  if (cachedPool) return cachedPool

  let raw: string
  try {
    raw = readFileSync(corpusPath, 'utf8')
  } catch (cause) {
    throw new Error(
      `proverb: BSB corpus missing at ${corpusPath}: ${(cause as Error).message}`,
    )
  }
  const book = JSON.parse(raw) as Record<string, Record<string, string>>

  const pool: ProverbEntry[] = []
  for (let chapter = FIRST_CHAPTER; chapter <= LAST_CHAPTER; chapter += 1) {
    const verses = book[String(chapter)]
    if (!verses) {
      throw new Error(`proverb: Proverbs ${chapter} missing from the corpus`)
    }
    const verseNumbers = Object.keys(verses)
      .map(Number)
      .sort((a, b) => a - b)
    for (const v of verseNumbers) {
      const text = verses[String(v)].trim()
      const words = text.split(/\s+/).length
      if (words >= MIN_WORDS && words <= MAX_WORDS) {
        pool.push({ reference: `Proverbs ${chapter}:${v}`, text })
      }
    }
  }

  if (pool.length < PROVERB_POOL_FLOOR) {
    throw new Error(
      `proverb: pool has ${pool.length} sayings — the floor is ` +
        `${PROVERB_POOL_FLOOR}. The corpus or the filter changed; fix the ` +
        'cause, do not lower the floor.',
    )
  }

  pool.sort(
    (a, b) =>
      fnv1a(a.reference) - fnv1a(b.reference) ||
      a.reference.localeCompare(b.reference),
  )

  cachedPool = pool
  return cachedPool
}

/** Days since 1970-01-01 UTC. The rotation index. */
function daysSinceEpoch(date: Date): number {
  const ms = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  )
  if (Number.isNaN(ms)) throw new Error('proverb: invalid Date')
  if (ms < 0) {
    throw new Error(
      'proverb: the rotation is only defined from 1970-01-01 forward',
    )
  }
  return Math.floor(ms / 86_400_000)
}

/** One proverb for the UTC date. Slot 0, published — scripture verbatim from
 * an owned corpus; there is nothing to review. */
export async function generateProverb(
  date: Date,
): Promise<EditionItem<'proverb'>[]> {
  const pool = proverbPool()
  const entry = pool[daysSinceEpoch(date) % pool.length]

  const payload: ProverbPayload = {
    reference: entry.reference,
    text: entry.text,
    translation: 'BSB',
  }

  return [
    {
      kind: 'proverb',
      publishDate: date.toISOString().slice(0, 10),
      slot: 0,
      status: 'published',
      payload,
    },
  ]
}
