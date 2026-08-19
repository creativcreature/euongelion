/**
 * The seven SA-092 edition kinds — redletter, proverb, verse, archive, b365,
 * voices, question.
 *
 * The contract these prove is the same one the rest of the paper lives by:
 * an edition is a pure function of its UTC date (no Math.random, no clock
 * reads beyond the argument), every payload passes its guard, every pool
 * clears its floor, and nothing repeats within 30 days — except the memory
 * verse, whose within-week repeat is the design and is asserted AS the
 * design rather than tested around.
 *
 * The day-since-epoch rotations have no 1 January reset (unlike the
 * day-of-year generators), so a year boundary is a non-event for them; the
 * 30-day windows below deliberately include one anyway.
 */
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterAll, describe, expect, it } from 'vitest'

import { getVerse } from '@/lib/bible/getVerse'
import { validateEditionItem, type EditionItem } from '@/lib/edition/kinds'
import {
  generateRedLetter,
  isPrintableSaying,
  redLetterPool,
  displayReference,
  REDLETTER_POOL_FLOOR,
} from '@/lib/edition/generators/redletter'
import {
  generateProverb,
  proverbPool,
  PROVERB_POOL_FLOOR,
} from '@/lib/edition/generators/proverb'
import {
  generateVerse,
  mondayOf,
  verseForWeek,
  VERSE_CANON,
} from '@/lib/edition/generators/verse'
import {
  archivePool,
  archiveSlugForDate,
  generateArchive,
  ARCHIVE_POOL_FLOOR,
  LEAD_COLLISION_SKIP,
} from '@/lib/edition/generators/archive'
import { generateB365, planDayForDate } from '@/lib/edition/generators/b365'
import {
  ATTRIBUTIONS,
  generateVoices,
  printableParagraph,
  voicesPool,
  VOICES_POOL_FLOOR,
} from '@/lib/edition/generators/voices'
import {
  generateQuestion,
  questionForDate,
  QUESTION_BANK,
} from '@/lib/edition/generators/question'
import { pickTodaySlug } from '@/lib/today-devotional'

const D = (iso: string) => new Date(`${iso}T00:00:00Z`)
const DAY_MS = 86_400_000

/** A 30-day window that crosses a year boundary on purpose. */
const WINDOW_START = Date.UTC(2026, 11, 18) // 2026-12-18 → into January
function windowDay(offset: number): Date {
  return new Date(WINDOW_START + offset * DAY_MS)
}

type AnyGenerator = (date: Date) => Promise<EditionItem[]>

const GENERATORS: [string, AnyGenerator][] = [
  ['redletter', generateRedLetter],
  ['proverb', generateProverb],
  ['verse', generateVerse],
  ['archive', generateArchive],
  ['b365', generateB365 as AnyGenerator],
  ['voices', generateVoices],
  ['question', generateQuestion],
]

const tempDirs: string[] = []
afterAll(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true })
})

describe('the SA-092 contract — one published slot-0 item, guard-clean', () => {
  it.each(GENERATORS)('%s', async (kind, generate) => {
    const items = await generate(D('2026-08-19'))
    expect(items).toHaveLength(1)
    expect(items[0].kind).toBe(kind)
    expect(items[0].publishDate).toBe('2026-08-19')
    expect(items[0].slot).toBe(0)
    expect(items[0].status).toBe('published')
    expect(validateEditionItem(items[0])).toBeNull()
  })
})

describe('determinism — the date is the only input', () => {
  it('produces byte-identical output three runs in a row', async () => {
    const date = D('2026-08-19')
    for (const [, generate] of GENERATORS) {
      const runs = await Promise.all([
        generate(date),
        generate(date),
        generate(date),
      ])
      expect(JSON.stringify(runs[1])).toBe(JSON.stringify(runs[0]))
      expect(JSON.stringify(runs[2])).toBe(JSON.stringify(runs[0]))
    }
  })

  it('ignores the time of day — only the UTC date decides', async () => {
    const morning = new Date('2026-08-19T00:00:01Z')
    const night = new Date('2026-08-19T23:59:59Z')
    for (const [, generate] of GENERATORS) {
      expect(JSON.stringify(await generate(night))).toBe(
        JSON.stringify(await generate(morning)),
      )
    }
  })

  it('produces a different item on a different day (verse excepted by design)', async () => {
    for (const [kind, generate] of GENERATORS) {
      if (kind === 'verse') continue
      const a = await generate(D('2026-08-19'))
      const b = await generate(D('2026-08-20'))
      expect(JSON.stringify(a[0].payload)).not.toBe(
        JSON.stringify(b[0].payload),
      )
    }
  })
})

describe('pool floors', () => {
  it('red letters: at least 200 printable sayings', () => {
    expect(REDLETTER_POOL_FLOOR).toBe(200)
    expect(redLetterPool().length).toBeGreaterThanOrEqual(200)
  })

  it('proverbs: clears its floor', () => {
    expect(proverbPool().length).toBeGreaterThanOrEqual(PROVERB_POOL_FLOOR)
    expect(PROVERB_POOL_FLOOR).toBeGreaterThanOrEqual(30)
  })

  it('memory verses: at least 60, no duplicate references', () => {
    expect(VERSE_CANON.length).toBeGreaterThanOrEqual(60)
    expect(new Set(VERSE_CANON).size).toBe(VERSE_CANON.length)
  })

  it('archive: clears the collision-proof floor, no duplicate slugs', () => {
    const pool = archivePool()
    expect(ARCHIVE_POOL_FLOOR).toBe(62)
    expect(pool.length).toBeGreaterThanOrEqual(ARCHIVE_POOL_FLOOR)
    expect(new Set(pool).size).toBe(pool.length)
    // The skip proof needs 30 < skip < pool - 30.
    expect(LEAD_COLLISION_SKIP).toBeGreaterThan(30)
    expect(pool.length - LEAD_COLLISION_SKIP).toBeGreaterThan(30)
  })

  it('voices: at least 100 attributed paragraphs', () => {
    expect(VOICES_POOL_FLOOR).toBe(100)
    expect(voicesPool().length).toBeGreaterThanOrEqual(100)
  })

  it('questions: at least 40, unique, one sentence each', () => {
    expect(QUESTION_BANK.length).toBeGreaterThanOrEqual(40)
    expect(new Set(QUESTION_BANK).size).toBe(QUESTION_BANK.length)
    for (const q of QUESTION_BANK) {
      // One askable sentence: a single terminal question mark, no internal
      // sentence breaks.
      expect(q.endsWith('?')).toBe(true)
      expect(q.slice(0, -1)).not.toMatch(/[.!?]/)
    }
  })
})

describe('no repeat within 30 days (pools ≥ 30)', () => {
  const keyOf: Record<string, (p: Record<string, unknown>) => string> = {
    redletter: (p) => `${p.reference}|${p.text}`,
    proverb: (p) => String(p.reference),
    archive: (p) => String(p.slug),
    voices: (p) => String(p.quote),
    question: (p) => String(p.question),
  }

  it.each(GENERATORS.filter(([kind]) => kind in keyOf))(
    '%s: 30 consecutive editions, 30 distinct items',
    async (kind, generate) => {
      const seen = new Set<string>()
      for (let i = 0; i < 30; i += 1) {
        const items = await generate(windowDay(i))
        seen.add(
          keyOf[kind](items[0].payload as unknown as Record<string, unknown>),
        )
      }
      expect(seen.size).toBe(30)
    },
  )
})

describe('the red letters', () => {
  it('quality filter: 8-40 words shaped as a complete sentence', () => {
    expect(
      isPrintableSaying(
        'Come to Me, all you who are weary and burdened, and I will give you rest.',
      ),
    ).toBe(true)
    expect(isPrintableSaying('and they will fast')).toBe(false) // fragment
    expect(isPrintableSaying('Follow Me now.')).toBe(false) // under 8 words
    expect(
      isPrintableSaying(
        'It is written that man shall not live on bread alone but on every word', // no terminal punctuation
      ),
    ).toBe(false)
  })

  it('every pooled saying obeys the filter and cites a display reference', () => {
    for (const entry of redLetterPool()) {
      expect(isPrintableSaying(entry.text)).toBe(true)
      expect(entry.reference).toMatch(
        /^(Matthew|Mark|Luke|John|Acts|Revelation) \d+:\d+$/,
      )
    }
  })

  it('display reference maps OSIS keys and throws on unknown books', () => {
    expect(displayReference('Matt.4.4')).toBe('Matthew 4:4')
    expect(displayReference('Rev.3.20')).toBe('Revelation 3:20')
    expect(() => displayReference('Gen.1.1')).toThrow(/cannot display/)
  })

  it('payload is BSB verbatim from the dataset', async () => {
    const [item] = await generateRedLetter(D('2026-08-19'))
    expect(item.payload.translation).toBe('BSB')
    expect(item.payload.text.trim()).toBe(item.payload.text)
  })
})

describe('the proverb', () => {
  it('draws only from Proverbs 10-29, 12-30 words', () => {
    for (const entry of proverbPool()) {
      const m = entry.reference.match(/^Proverbs (\d+):(\d+)$/)
      expect(m).not.toBeNull()
      const chapter = Number(m![1])
      expect(chapter).toBeGreaterThanOrEqual(10)
      expect(chapter).toBeLessThanOrEqual(29)
      const words = entry.text.split(/\s+/).length
      expect(words).toBeGreaterThanOrEqual(12)
      expect(words).toBeLessThanOrEqual(30)
    }
  })

  it('prints the corpus text verbatim for its reference', async () => {
    const [item] = await generateProverb(D('2026-08-19'))
    const corpus = await getVerse(item.payload.reference, 'BSB')
    expect(item.payload.text).toBe(corpus.text)
  })
})

describe('the memory verse — weekly by design', () => {
  it('holds the same verse Monday through Sunday', async () => {
    // 2026-08-17 is a Monday.
    const monday = await generateVerse(D('2026-08-17'))
    for (let i = 1; i < 7; i += 1) {
      const day = await generateVerse(
        new Date(D('2026-08-17').getTime() + i * DAY_MS),
      )
      expect(day[0].payload.reference).toBe(monday[0].payload.reference)
      expect(day[0].payload.text).toBe(monday[0].payload.text)
      expect(day[0].payload.weekOf).toBe('2026-08-17')
    }
  })

  it('turns the page on Monday', async () => {
    const sunday = await generateVerse(D('2026-08-23'))
    const monday = await generateVerse(D('2026-08-24'))
    expect(sunday[0].payload.weekOf).toBe('2026-08-17')
    expect(monday[0].payload.weekOf).toBe('2026-08-24')
    expect(monday[0].payload.reference).not.toBe(sunday[0].payload.reference)
  })

  it('does not repeat a verse within 30 consecutive weeks', () => {
    const seen = new Set<string>()
    for (let w = 0; w < 30; w += 1) {
      seen.add(verseForWeek(new Date(WINDOW_START + w * 7 * DAY_MS)))
    }
    expect(seen.size).toBe(30)
  })

  it("weekOf is always that week's Monday", () => {
    expect(mondayOf(D('2026-08-17'))).toBe('2026-08-17') // Monday itself
    expect(mondayOf(D('2026-08-19'))).toBe('2026-08-17') // Wednesday
    expect(mondayOf(D('2026-08-23'))).toBe('2026-08-17') // Sunday
  })

  it('every canon reference resolves in the BSB corpus', async () => {
    for (const reference of VERSE_CANON) {
      const result = await getVerse(reference, 'BSB')
      expect(result.text.length).toBeGreaterThan(10)
    }
  })
})

describe('from the archive', () => {
  it('never runs the devotional the front page is leading with', async () => {
    for (let i = 0; i < 400; i += 1) {
      const date = windowDay(i)
      expect(archiveSlugForDate(date)).not.toBe(pickTodaySlug(date))
    }
  })

  it('resolves title, teaser, series and image from the catalog', async () => {
    const [item] = await generateArchive(D('2026-08-19'))
    expect(item.payload.title.length).toBeGreaterThan(0)
    expect(item.payload.teaser.length).toBeGreaterThan(0)
    expect(item.payload.seriesSlug.length).toBeGreaterThan(0)
    expect(item.payload.image.startsWith('/')).toBe(true)
  })

  it('the collision skip lands outside the ±30-day index band', () => {
    // Proof obligation for the skip: on a lead collision the pick moves
    // LEAD_COLLISION_SKIP indexes forward, and no day within ±30 of the
    // colliding day can reach that index by its own rotation. That is
    // exactly `30 < skip < pool - 30`, asserted with the floor above; this
    // spells out the arithmetic so the constant cannot drift silently.
    const n = archivePool().length
    expect(LEAD_COLLISION_SKIP % n).not.toBe(0)
    expect(
      Math.min(LEAD_COLLISION_SKIP, n - LEAD_COLLISION_SKIP),
    ).toBeGreaterThan(30)
  })
})

describe('today in Bible-365', () => {
  it('runs the plan day matching the UTC day of year', async () => {
    // 2026-06-01 is day 152 of a non-leap year.
    const [item] = await generateB365(D('2026-06-01'))
    expect(item.payload.day).toBe(152)
    expect(item.payload.slug).toBe('bible-365-day-152')
    expect(item.payload.title.length).toBeGreaterThan(0)
    expect(item.payload.reference.length).toBeGreaterThan(0)
  })

  it('maps the leap day onto plan day 365 — the documented exception', async () => {
    expect(planDayForDate(D('2028-12-31'))).toBe(365) // day 366 of a leap year
    expect(planDayForDate(D('2027-12-31'))).toBe(365)
    const [item] = await generateB365(D('2028-12-31'))
    expect(item.payload.day).toBe(365)
  })

  it('THROWS on a missing plan day file — a hole in the set is a bug', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'edition-b365-'))
    tempDirs.push(dir)
    await expect(generateB365(D('2026-06-01'), dir)).rejects.toThrow(
      /plan day 152 is missing/,
    )
  })
})

describe('voices', () => {
  it('every pooled paragraph is 40-120 words, trimmed, and attributed', () => {
    const mappedAuthors = new Set(
      Object.values(ATTRIBUTIONS).map((a) => a.author),
    )
    for (const entry of voicesPool()) {
      const words = entry.quote.split(' ').length
      expect(words).toBeGreaterThanOrEqual(40)
      expect(words).toBeLessThanOrEqual(120)
      expect(entry.quote.trim()).toBe(entry.quote)
      expect(mappedAuthors.has(entry.author)).toBe(true)
      expect(entry.work.length).toBeGreaterThan(0)
    }
  })

  it('the paragraph filter rejects markup, litter and shouting', () => {
    const words = (n: number) =>
      Array.from({ length: n }, () => 'word').join(' ')
    expect(printableParagraph(`Grace is the ${words(45)}.`)).not.toBeNull()
    expect(printableParagraph('Too short to print.')).toBeNull()
    expect(printableParagraph(`See [12] the note ${words(45)}.`)).toBeNull()
    expect(
      printableParagraph(`THE FULL PROJECT GUTENBERG LICENSE ${words(40)}.`),
    ).toBeNull()
    expect(
      printableParagraph(`visit www.example.com for ${words(42)}.`),
    ).toBeNull()
  })

  it('normalizes only whitespace — no word inside a quote is altered', () => {
    const hardWrapped =
      '   Grace is given\n   not because we have  done good\n   works, but in order that we may be able to do them, and this remains the whole of the matter for every soul that will receive it with an honest and open heart today.'
    const out = printableParagraph(hardWrapped)
    expect(out).not.toBeNull()
    // Same words in the same order — only the whitespace differs.
    expect(out!.split(/\s+/)).toEqual(hardWrapped.trim().split(/\s+/))
  })

  it('attributes only content-verified sources — the contaminated files stay out', () => {
    // The 2026-08-19 audit found fourteen commentary files carrying the
    // wrong book entirely (fiction, travel writing, literal 404 pages).
    // None of them may re-enter the map while the files are what they are.
    const banned = [
      'spurgeon/all-of-grace.txt',
      'spurgeon/around-the-wicket-gate.txt',
      'murray/abide-in-christ.txt',
      'murray/absolute-surrender.txt',
      'murray/be-perfect.txt',
      'luther/large-catechism.txt',
      'edwards/a-careful-and-strict-enquiry-into-freedom-of-will.txt',
      'edwards/religious-affections.txt',
      'edwards/the-nature-of-true-virtue.txt',
      'wesley/sermons-on-several-occasions-vol1.txt',
      'wesley/sermons-on-several-occasions-vol2.txt',
      'wesley/sermons-on-several-occasions-vol3.txt',
      'wesley/sermons-on-several-occasions-vol4.txt',
      'whitefield/sermons.txt',
    ]
    const mapped = Object.keys(ATTRIBUTIONS)
    for (const path of banned) {
      expect(mapped.some((m) => m.endsWith(path))).toBe(false)
    }
  })
})

describe('the question', () => {
  it('selects from the bank, deterministically', async () => {
    const [item] = await generateQuestion(D('2026-08-19'))
    expect(QUESTION_BANK).toContain(item.payload.question)
    expect(item.payload.question).toBe(questionForDate(D('2026-08-19')))
  })
})
