/**
 * The Daily Bread — The Memory Verse (SA-092).
 *
 * The WEEK'S verse — the same verse all seven days, because memorising takes
 * longer than a morning. Keyed by ISO week (Monday-Sunday, UTC), so Monday
 * turns the page and the rest of the week repeats it BY DESIGN. That repeat
 * is the one deliberate exception to the paper's no-repeat habit, and the
 * tests assert the repeat rather than pretending it away.
 *
 * THE CANON below is curation only: references chosen for being genuinely
 * memorisable — short, load-bearing, the verses the church has always set
 * children and converts to learn. The TEXT is never stored here; it is read
 * from the committed BSB corpus through `getVerse` at generation time, which
 * THROWS on a reference that does not resolve (Development Rule 1). The
 * tests walk the whole canon through the corpus, so a typo in a reference
 * cannot survive CI.
 *
 * DETERMINISM: weeks-since-epoch (Monday-based) modulo the canon. With a
 * canon of 60+ the same verse cannot return within 60 weeks.
 */
import { getVerse } from '@/lib/bible/getVerse'
import type { EditionItem, VersePayload } from '../kinds'

/**
 * The memory-verse canon. Every reference verified against the BSB corpus by
 * the test suite. Order is deliberate walking order, not ranking.
 */
export const VERSE_CANON: readonly string[] = [
  'Genesis 1:1',
  'Deuteronomy 6:5',
  'Joshua 1:9',
  'Psalm 16:8',
  'Psalm 19:14',
  'Psalm 23:1',
  'Psalm 27:1',
  'Psalm 34:8',
  'Psalm 37:4',
  'Psalm 46:1',
  'Psalm 46:10',
  'Psalm 51:10',
  'Psalm 56:3',
  'Psalm 90:12',
  'Psalm 118:24',
  'Psalm 119:11',
  'Psalm 119:105',
  'Psalm 121:1-2',
  'Psalm 139:23-24',
  'Proverbs 3:5-6',
  'Proverbs 4:23',
  'Proverbs 16:9',
  'Proverbs 18:10',
  'Isaiah 26:3',
  'Isaiah 40:31',
  'Isaiah 41:10',
  'Isaiah 53:5',
  'Jeremiah 29:11',
  'Lamentations 3:22-23',
  'Micah 6:8',
  'Zephaniah 3:17',
  'Matthew 5:16',
  'Matthew 6:33',
  'Matthew 11:28',
  'Matthew 28:19-20',
  'Mark 10:45',
  'Luke 9:23',
  'John 1:1',
  'John 3:16',
  'John 8:32',
  'John 10:10',
  'John 13:34',
  'John 14:6',
  'John 15:5',
  'John 16:33',
  'Acts 1:8',
  'Romans 5:8',
  'Romans 8:1',
  'Romans 8:28',
  'Romans 10:9',
  'Romans 12:2',
  '1 Corinthians 10:13',
  '1 Corinthians 13:13',
  '2 Corinthians 5:17',
  '2 Corinthians 12:9',
  'Galatians 2:20',
  'Galatians 5:22-23',
  'Ephesians 2:8-9',
  'Philippians 4:6-7',
  'Philippians 4:13',
  'Colossians 3:23',
  '1 Thessalonians 5:16-18',
  '2 Timothy 1:7',
  'Hebrews 11:1',
  'Hebrews 13:8',
  'James 1:5',
  '1 Peter 5:7',
  '1 John 1:9',
  '1 John 4:19',
  'Revelation 21:4',
] as const

/** Days since 1970-01-01 UTC for the date's UTC midnight. */
function daysSinceEpoch(date: Date): number {
  const ms = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  )
  if (Number.isNaN(ms)) throw new Error('verse: invalid Date')
  return Math.floor(ms / 86_400_000)
}

/**
 * Monday-based week index. 1970-01-01 was a Thursday, so the Monday of the
 * epoch's week fell on 1969-12-29 — three days before day zero. Adding 3
 * before dividing makes every Monday start a new index.
 */
export function weekIndex(date: Date): number {
  const days = daysSinceEpoch(date) + 3
  if (days < 0) {
    throw new Error(
      'verse: the weekly rotation is only defined from 1969-12-29 forward',
    )
  }
  return Math.floor(days / 7)
}

/** ISO date of the Monday that opens the date's week, UTC. */
export function mondayOf(date: Date): string {
  const mondayEpochDays = weekIndex(date) * 7 - 3
  return new Date(mondayEpochDays * 86_400_000).toISOString().slice(0, 10)
}

/** Which reference the week carries. Exported for the tests. */
export function verseForWeek(date: Date): string {
  return VERSE_CANON[weekIndex(date) % VERSE_CANON.length]
}

/** The week's memory verse for the UTC date. Slot 0, published — scripture
 * verbatim from the owned corpus; there is nothing to review. */
export async function generateVerse(
  date: Date,
): Promise<EditionItem<'verse'>[]> {
  const reference = verseForWeek(date)
  const result = await getVerse(reference, 'BSB')

  const payload: VersePayload = {
    reference,
    text: result.text,
    translation: 'BSB',
    weekOf: mondayOf(date),
  }

  return [
    {
      kind: 'verse',
      publishDate: date.toISOString().slice(0, 10),
      slot: 0,
      status: 'published',
      payload,
    },
  ]
}
