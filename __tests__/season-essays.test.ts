import { describe, expect, it } from 'vitest'

import { liturgicalDay, type LiturgicalSeason } from '@/lib/liturgical'
import {
  FEAST_ESSAYS,
  SEASON_ESSAYS,
  getSeasonEssay,
} from '@/data/season-essays'

// The Season, explained (season-essays.ts).
//
// The contract these prove is the drift gate: everything the liturgical
// calendar can emit — every season label, every feast, every named day —
// has an explanation in the bank, and the assembled view never renders a
// bare, unexplained week number. The enumeration is done by sweeping
// liturgicalDay itself across a decade of real dates, so a new label added
// to src/lib/liturgical.ts fails here until the bank explains it.

const D = (iso: string) => new Date(`${iso}T00:00:00Z`)

/** Every liturgical day from Jan 1 of startYear to Dec 31 of endYear. */
function sweep(startYear: number, endYear: number) {
  const days: ReturnType<typeof liturgicalDay>[] = []
  const end = Date.UTC(endYear, 11, 31)
  for (let t = Date.UTC(startYear, 0, 1); t <= end; t += 86_400_000) {
    days.push(liturgicalDay(new Date(t)))
  }
  return days
}

// A decade covers early and late Easters, every Advent start date, and
// every fixed feast at least ten times over.
const DAYS = sweep(2024, 2033)

/** "12th Week after Pentecost" → "12th"; null for named days. */
const NUMBERED_LABEL = /^(\d+(?:st|nd|rd|th))\s/

// Day labels that describe a stretch of the season rather than naming a
// feast day. Everything else non-numbered must be a feast the bank covers.
const SEASON_DESCRIPTOR_LABELS = new Set([
  'Christmas Season',
  'Season after Epiphany',
  'Holy Week',
  'Ordinary Time',
])

const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length

describe('SEASON_ESSAYS — the drift gate', () => {
  it('covers every season the calendar emits, under the label it emits', () => {
    const seen = new Set<LiturgicalSeason>()
    for (const day of DAYS) {
      seen.add(day.season)
      const entry = SEASON_ESSAYS[day.season]
      expect(entry, `season "${day.season}" has no essay`).toBeDefined()
      expect(entry.name, `essay name for "${day.season}"`).toBe(day.seasonLabel)
    }
    // Both directions: every emitted season is explained, and every essay
    // in the bank belongs to a season the calendar actually emits.
    expect([...seen].sort()).toEqual(Object.keys(SEASON_ESSAYS).sort())
  })

  it('every season essay is 100+ words with every field filled', () => {
    for (const [season, entry] of Object.entries(SEASON_ESSAYS)) {
      expect(
        wordCount(entry.essay),
        `essay for "${season}"`,
      ).toBeGreaterThanOrEqual(100)
      expect(
        wordCount(entry.essay),
        `essay for "${season}"`,
      ).toBeLessThanOrEqual(200)
      expect(
        entry.plainName.length,
        `plainName for "${season}"`,
      ).toBeGreaterThan(0)
      expect(entry.span.length, `span for "${season}"`).toBeGreaterThan(0)
      expect(entry.color, `color for "${season}"`).toMatch(/—/)
      expect(entry.thisWeek.length, `thisWeek for "${season}"`).toBeGreaterThan(
        0,
      )
    }
  })

  it('colorHex is a valid six-digit hex on every season', () => {
    for (const [season, entry] of Object.entries(SEASON_ESSAYS)) {
      expect(entry.colorHex, `colorHex for "${season}"`).toMatch(
        /^#[0-9a-f]{6}$/i,
      )
    }
  })

  it('seasons that number their weeks carry the Nth token in the pattern', () => {
    // These four are the label families liturgical.ts actually numbers.
    for (const season of ['advent', 'lent', 'easter', 'ordinary'] as const) {
      expect(SEASON_ESSAYS[season].thisWeek).toContain('Nth')
    }
  })
})

describe('FEAST_ESSAYS — every feast the calendar can name', () => {
  it('covers every fixed feast liturgicalDay emits through its feast field', () => {
    const seen = new Set<string>()
    for (const day of DAYS) {
      if (day.feast) seen.add(day.feast)
    }
    expect(seen.size).toBeGreaterThan(0)
    for (const feast of seen) {
      const entry = FEAST_ESSAYS[feast]
      expect(entry, `feast "${feast}" has no essay`).toBeDefined()
      expect(entry.name).toBe(feast)
    }
  })

  it('covers every named movable day the calendar emits as a day label', () => {
    const seen = new Set<string>()
    for (const day of DAYS) {
      if (
        !NUMBERED_LABEL.test(day.dayLabel) &&
        !SEASON_DESCRIPTOR_LABELS.has(day.dayLabel)
      ) {
        seen.add(day.dayLabel)
      }
    }
    // The movable feasts all occur every year, so the sweep must find them.
    expect(seen.size).toBeGreaterThanOrEqual(10)
    for (const label of seen) {
      const entry = FEAST_ESSAYS[label]
      expect(entry, `named day "${label}" has no feast essay`).toBeDefined()
      expect(entry.name).toBe(label)
    }
  })

  it('every feast essay is 60–140 words and says when it falls', () => {
    for (const [feast, entry] of Object.entries(FEAST_ESSAYS)) {
      expect(
        wordCount(entry.essay),
        `essay for "${feast}"`,
      ).toBeGreaterThanOrEqual(60)
      expect(
        wordCount(entry.essay),
        `essay for "${feast}"`,
      ).toBeLessThanOrEqual(140)
      expect(entry.when.length, `when for "${feast}"`).toBeGreaterThan(0)
    }
  })
})

describe('getSeasonEssay', () => {
  it('never throws across a full decade sweep, and never leaves a number bare', () => {
    for (const day of DAYS) {
      const view = getSeasonEssay(day)
      expect(view.weekLine.length).toBeGreaterThan(0)
      // The pattern token must always have been substituted away.
      expect(view.weekLine, `weekLine for ${day.dayLabel}`).not.toContain('Nth')
      const numbered = NUMBERED_LABEL.exec(day.dayLabel)
      if (numbered) {
        // A numbered week arrives explained — the ordinal inside a full
        // sentence, never the raw "12th Week after Pentecost" label.
        expect(view.weekLine).toContain(numbered[1])
        expect(view.weekLine).not.toBe(day.dayLabel)
        expect(wordCount(view.weekLine)).toBeGreaterThan(
          wordCount(day.dayLabel),
        )
      }
      expect(view.colorHex).toMatch(/^#[0-9a-f]{6}$/i)
      expect(view.name).toBe(day.seasonLabel)
    }
  })

  it('renders a week after Pentecost through the ordinary pattern', () => {
    const day = liturgicalDay(D('2026-08-19'))
    expect(day.season).toBe('ordinary')
    const numbered = NUMBERED_LABEL.exec(day.dayLabel)
    expect(numbered).not.toBeNull()
    const view = getSeasonEssay(day)
    expect(view.weekLine).toBe(
      SEASON_ESSAYS.ordinary.thisWeek.replace('Nth', numbered![1]),
    )
    expect(view.weekLine).toContain('ordinary faithfulness')
  })

  it('throws on a season label the bank does not know', () => {
    const day = liturgicalDay(D('2026-08-19'))
    expect(() =>
      getSeasonEssay({ ...day, season: 'kingdomtide' as LiturgicalSeason }),
    ).toThrow(/no season essay/)
  })

  it('throws on a named day label the bank does not know', () => {
    const day = liturgicalDay(D('2026-08-19'))
    expect(() =>
      getSeasonEssay({ ...day, dayLabel: 'Feast of the Unknown' }),
    ).toThrow(/no day line/)
  })
})
