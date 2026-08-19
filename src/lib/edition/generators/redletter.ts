/**
 * The Daily Bread — The Red Letters (SA-092).
 *
 * One saying of Jesus a day, quoted verbatim from the red-letter dataset that
 * powers the reader's red-letter rendering (`src/data/red-letter-bsb.json`,
 * built from the KJV OSIS `<q who="Jesus">` milestones mapped onto BSB
 * wording — see `src/lib/red-letter-resolve.ts` for the dataset's paper
 * trail). Nothing here is written by us; the generator only SELECTS.
 *
 * THE QUALITY FILTER (curated in code, proven in tests): a printable saying
 * is 8-40 words and reads as a complete sentence — it starts like one
 * (capital or opening quote) and ends like one (terminal punctuation). That
 * excludes the mid-verse fragments the dataset legitimately carries for
 * rendering purposes ("and they will fast", "for they shall be comforted"
 * split across spans) which would read as clippings, not sayings. The pool
 * this leaves is ~1,400 entries; the floor is 200 and the generator THROWS
 * below it (Development Rule 1) rather than quietly printing from a puddle.
 *
 * DETERMINISM: selection is days-since-epoch modulo the pool, so consecutive
 * days walk consecutive pool indexes — no repeat within `pool.length` days,
 * which the 200 floor makes at least 200 days. Never Math.random. The pool
 * is ORDERED BY A STABLE HASH of the saying rather than canonical order:
 * canonical order would print the Beatitudes one per morning for a week and
 * spend four straight months in Matthew. Hashing scatters the walk across
 * all four gospels while staying a pure function of the data.
 */
import RED_LETTER_BSB from '@/data/red-letter-bsb.json'
import type { EditionItem, RedLetterPayload } from '../kinds'

/** The dataset keys are 'Matt.4.4' — OSIS book, chapter, verse. */
const OSIS_BOOK_NAMES: Record<string, string> = {
  Matt: 'Matthew',
  Mark: 'Mark',
  Luke: 'Luke',
  John: 'John',
  Acts: 'Acts',
  Rev: 'Revelation',
}

/** Minimum printable pool. Below this the section does not run — it fails. */
export const REDLETTER_POOL_FLOOR = 200

/** 'Matt.4.4' → 'Matthew 4:4'. Throws on a book the map does not know —
 * a new book in the dataset must be named here before it can print. */
export function displayReference(osisKey: string): string {
  const [book, chapter, verse] = osisKey.split('.')
  const name = OSIS_BOOK_NAMES[book]
  if (!name || !chapter || !verse) {
    throw new Error(
      `redletter: cannot display reference for dataset key "${osisKey}"`,
    )
  }
  return `${name} ${chapter}:${verse}`
}

/** A saying that can stand alone on the page: 8-40 words, shaped like a
 * complete sentence. Exported so the tests can probe the boundary. */
export function isPrintableSaying(text: string): boolean {
  const t = text.trim()
  if (t.length === 0) return false
  const words = t.split(/\s+/).length
  if (words < 8 || words > 40) return false
  if (!/^[A-Z“‘"]/.test(t)) return false
  if (!/[.!?’”"]$/.test(t)) return false
  return true
}

interface RedLetterEntry {
  reference: string
  text: string
}

let cachedPool: RedLetterEntry[] | null = null

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
 * The printable pool, ordered by saying hash (see DETERMINISM in the file
 * comment). Deterministic: same data, same pool.
 */
export function redLetterPool(): RedLetterEntry[] {
  if (cachedPool) return cachedPool

  const pool: RedLetterEntry[] = []
  for (const [key, fragments] of Object.entries(
    RED_LETTER_BSB as Record<string, string[]>,
  )) {
    for (const fragment of fragments) {
      if (isPrintableSaying(fragment)) {
        pool.push({ reference: displayReference(key), text: fragment.trim() })
      }
    }
  }

  if (pool.length < REDLETTER_POOL_FLOOR) {
    throw new Error(
      `redletter: printable pool has ${pool.length} sayings — the floor is ` +
        `${REDLETTER_POOL_FLOOR}. The dataset shrank or the filter broke; fix ` +
        'the cause, do not lower the floor.',
    )
  }

  pool.sort(
    (a, b) =>
      fnv1a(`${a.reference} ${a.text}`) - fnv1a(`${b.reference} ${b.text}`) ||
      a.reference.localeCompare(b.reference) ||
      a.text.localeCompare(b.text),
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
  if (Number.isNaN(ms)) throw new Error('redletter: invalid Date')
  if (ms < 0) {
    throw new Error(
      'redletter: the rotation is only defined from 1970-01-01 forward',
    )
  }
  return Math.floor(ms / 86_400_000)
}

/** One saying of Jesus for the UTC date. Slot 0, published — the text is a
 * verbatim quotation from an owned dataset; there is nothing to review. */
export async function generateRedLetter(
  date: Date,
): Promise<EditionItem<'redletter'>[]> {
  const pool = redLetterPool()
  const entry = pool[daysSinceEpoch(date) % pool.length]

  const payload: RedLetterPayload = {
    reference: entry.reference,
    text: entry.text,
    translation: 'BSB',
  }

  return [
    {
      kind: 'redletter',
      publishDate: date.toISOString().slice(0, 10),
      slot: 0,
      status: 'published',
      payload,
    },
  ]
}
