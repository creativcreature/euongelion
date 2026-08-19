import { describe, expect, it } from 'vitest'
// `.mjs` on purpose: the runner is `build-inner.mts`, and both TypeScript
// (moduleResolution: bundler) and Vite map an `.mjs` specifier onto the `.mts`
// source. Writing `.mts` here needs `allowImportingTsExtensions`, which this
// project does not set.
import {
  datesInWindow,
  parseArgs,
  promote,
} from '../scripts/edition/build-inner.mjs'
import type { EditionItem, EditionStatus } from '../src/lib/edition/kinds'

// The Daily Bread runner's argv contract, date window and status promotion
// (SA-090 / F-136).
//
// These three functions decide WHICH editions get built and WHAT goes live
// unreviewed, which makes them the only part of the runner that can quietly do
// the wrong thing: a `--from` that rolls a month wrong produces a perfectly
// successful run that writes an edition nobody will ever read, and a `promote`
// that is too generous puts invented voice on the front page without a human
// ever seeing it. Everything else in the runner either throws or writes, so it
// is exercised against a real Supabase — never here. There is no network in
// this file.

/** A fixed "now" so the default `--from` (tomorrow, UTC) is deterministic. */
const NOW = new Date('2026-08-18T12:00:00Z')

describe('parseArgs — defaults', () => {
  it('builds one edition for tomorrow, all kinds, writing for real', () => {
    expect(parseArgs([], NOW)).toEqual({
      days: 1,
      from: '2026-08-19',
      kinds: null,
      dryRun: false,
    })
  })

  it('resolves tomorrow in UTC, not local time, at the end of the day', () => {
    expect(parseArgs([], new Date('2026-08-18T23:59:59Z')).from).toBe(
      '2026-08-19',
    )
    expect(parseArgs([], new Date('2026-08-18T00:00:00Z')).from).toBe(
      '2026-08-19',
    )
  })

  it('rolls the default across a month end', () => {
    expect(parseArgs([], new Date('2026-08-31T12:00:00Z')).from).toBe(
      '2026-09-01',
    )
  })

  it('rolls the default across a year end', () => {
    expect(parseArgs([], new Date('2026-12-31T12:00:00Z')).from).toBe(
      '2027-01-01',
    )
  })

  it('rolls the default into a leap day', () => {
    expect(parseArgs([], new Date('2028-02-28T12:00:00Z')).from).toBe(
      '2028-02-29',
    )
  })
})

describe('parseArgs — --from', () => {
  it('accepts an explicit ISO date', () => {
    expect(parseArgs(['--from=2026-01-05'], NOW).from).toBe('2026-01-05')
  })

  it('accepts the "today" and "tomorrow" keywords the workflow documents', () => {
    expect(parseArgs(['--from=today'], NOW).from).toBe('2026-08-18')
    expect(parseArgs(['--from=tomorrow'], NOW).from).toBe('2026-08-19')
  })

  it('rejects a non-ISO shape', () => {
    expect(() => parseArgs(['--from=08/19/2026'], NOW)).toThrow(
      /must be YYYY-MM-DD/,
    )
    expect(() => parseArgs(['--from=20260819'], NOW)).toThrow(
      /must be YYYY-MM-DD/,
    )
  })

  it('rejects a well-shaped date that does not exist', () => {
    expect(() => parseArgs(['--from=2026-02-30'], NOW)).toThrow(
      /not a real calendar date/,
    )
    expect(() => parseArgs(['--from=2027-02-29'], NOW)).toThrow(
      /not a real calendar date/,
    )
    expect(() => parseArgs(['--from=2026-13-01'], NOW)).toThrow(
      /not a real calendar date/,
    )
  })
})

describe('parseArgs — --days', () => {
  it('accepts the monthly-batch window', () => {
    expect(parseArgs(['--days=30'], NOW).days).toBe(30)
  })

  it('rejects zero, negatives and non-numbers', () => {
    expect(() => parseArgs(['--days=0'], NOW)).toThrow(/at least 1/)
    expect(() => parseArgs(['--days=-3'], NOW)).toThrow(/whole number/)
    expect(() => parseArgs(['--days=1.5'], NOW)).toThrow(/whole number/)
    expect(() => parseArgs(['--days=lots'], NOW)).toThrow(/whole number/)
  })

  it('rejects the space-separated form rather than silently building one day', () => {
    expect(() => parseArgs(['--days', '3'], NOW)).toThrow(/needs a value/)
  })
})

describe('parseArgs — --kinds', () => {
  it('parses a comma list into kinds', () => {
    expect(parseArgs(['--kinds=prayer,word'], NOW).kinds).toEqual([
      'prayer',
      'word',
    ])
  })

  it('parses a single kind', () => {
    expect(parseArgs(['--kinds=crossword'], NOW).kinds).toEqual(['crossword'])
  })

  it('trims whitespace, lowercases, and drops empty segments', () => {
    expect(parseArgs(['--kinds= Prayer , WORD ,'], NOW).kinds).toEqual([
      'prayer',
      'word',
    ])
  })

  it('rejects a kind that is not in the contract', () => {
    expect(() => parseArgs(['--kinds=prayer,horoscope'], NOW)).toThrow(
      /unknown kind "horoscope"/,
    )
  })

  it('rejects an empty list instead of running every kind', () => {
    expect(() => parseArgs(['--kinds='], NOW)).toThrow(/at least one kind/)
    expect(() => parseArgs(['--kinds=,,'], NOW)).toThrow(/at least one kind/)
  })

  it('defaults to null, meaning every kind with a generator', () => {
    expect(parseArgs(['--days=2'], NOW).kinds).toBeNull()
  })
})

describe('parseArgs — --dry-run and unknown input', () => {
  it('is a bare boolean flag', () => {
    expect(parseArgs(['--dry-run'], NOW).dryRun).toBe(true)
  })

  it('rejects a value on --dry-run', () => {
    expect(() => parseArgs(['--dry-run=true'], NOW)).toThrow(/takes no value/)
  })

  it('rejects unknown flags', () => {
    expect(() => parseArgs(['--force=1'], NOW)).toThrow(/unknown flag: --force/)
  })

  it('rejects positional arguments', () => {
    expect(() => parseArgs(['2026-08-19'], NOW)).toThrow(/unexpected argument/)
  })

  it('combines every flag', () => {
    expect(
      parseArgs(
        ['--days=7', '--from=2026-03-01', '--kinds=quiz', '--dry-run'],
        NOW,
      ),
    ).toEqual({
      days: 7,
      from: '2026-03-01',
      kinds: ['quiz'],
      dryRun: true,
    })
  })
})

describe('datesInWindow', () => {
  it('returns the single start date for a one-day window', () => {
    expect(datesInWindow('2026-08-19', 1)).toEqual(['2026-08-19'])
  })

  it('is inclusive of the start date', () => {
    expect(datesInWindow('2026-08-19', 3)).toEqual([
      '2026-08-19',
      '2026-08-20',
      '2026-08-21',
    ])
  })

  it('crosses a 31-day month end', () => {
    expect(datesInWindow('2026-08-30', 3)).toEqual([
      '2026-08-30',
      '2026-08-31',
      '2026-09-01',
    ])
  })

  it('crosses a 30-day month end', () => {
    expect(datesInWindow('2026-09-29', 3)).toEqual([
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
    ])
  })

  it('crosses a year end', () => {
    expect(datesInWindow('2026-12-30', 4)).toEqual([
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
    ])
  })

  it('includes the leap day in a leap year', () => {
    expect(datesInWindow('2028-02-27', 4)).toEqual([
      '2028-02-27',
      '2028-02-28',
      '2028-02-29',
      '2028-03-01',
    ])
  })

  it('skips a leap day that does not exist', () => {
    expect(datesInWindow('2027-02-27', 4)).toEqual([
      '2027-02-27',
      '2027-02-28',
      '2027-03-01',
      '2027-03-02',
    ])
  })

  it('produces a reviewable month for the --days=30 fallback', () => {
    const window = datesInWindow('2026-08-19', 30)
    expect(window).toHaveLength(30)
    expect(window[0]).toBe('2026-08-19')
    expect(window[29]).toBe('2026-09-17')
    expect(new Set(window).size).toBe(30)
  })

  it('rejects a bad start date', () => {
    expect(() => datesInWindow('19-08-2026', 1)).toThrow(/must be YYYY-MM-DD/)
    expect(() => datesInWindow('2026-02-30', 1)).toThrow(
      /not a real calendar date/,
    )
  })

  it('rejects a window that is not a whole number of days >= 1', () => {
    expect(() => datesInWindow('2026-08-19', 0)).toThrow(/>= 1/)
    expect(() => datesInWindow('2026-08-19', -1)).toThrow(/>= 1/)
    expect(() => datesInWindow('2026-08-19', 2.5)).toThrow(/>= 1/)
  })
})

/* ── promote ──────────────────────────────────────────────────────────── */

// `prayer` is a DETERMINISTIC kind: scripture printed as-is, nothing to review.
const prayerItem = (status: EditionStatus): EditionItem => ({
  kind: 'prayer',
  publishDate: '2026-08-19',
  slot: 0,
  status,
  payload: {
    reference: 'Psalm 141',
    translation: 'BSB',
    text: 'I call upon You, O LORD; come quickly to me.',
    prayedBy: 'David',
  },
})

// `practice` is a REVIEWED kind: our own invented voice, so a human sees it
// before a reader does, no matter what status the generator handed back.
const practiceItem = (status: EditionStatus): EditionItem => ({
  kind: 'practice',
  publishDate: '2026-08-19',
  slot: 0,
  status,
  payload: {
    instruction: 'Sit still for two minutes before you open anything.',
    reason: 'Attention is the first offering.',
    duration: '2 min',
  },
})

describe('promote', () => {
  it('publishes an approved deterministic kind', () => {
    expect(promote(prayerItem('approved')).status).toBe('published')
  })

  it('leaves a reviewed kind on whatever status its generator chose', () => {
    expect(promote(practiceItem('approved')).status).toBe('approved')
    expect(promote(practiceItem('draft')).status).toBe('draft')
  })

  it('does not publish a deterministic kind that is still a draft', () => {
    expect(promote(prayerItem('draft')).status).toBe('draft')
  })

  it('never demotes or resurrects — published and rejected pass through', () => {
    expect(promote(prayerItem('published')).status).toBe('published')
    expect(promote(prayerItem('rejected')).status).toBe('rejected')
  })

  it('returns a new item rather than mutating what the generator handed back', () => {
    const original = prayerItem('approved')
    const promoted = promote(original)
    expect(original.status).toBe('approved')
    expect(promoted).not.toBe(original)
    expect(promoted.payload).toBe(original.payload)
  })
})
