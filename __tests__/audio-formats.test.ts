import { describe, expect, it } from 'vitest'
import {
  AUDIO_NATIVE_PIECES,
  FORMAT_META,
  LISTENING_FORMATS,
  deliveredPieces,
  formatCoverage,
} from '@/lib/audio/formats'
import { longFormFor } from '@/lib/audio/occasion'
import {
  buildBookQueue,
  longFormBookRuns,
  scriptureBookRuns,
} from '@/lib/audio/scripture-whole'

/**
 * SA-116 — the breadth axis.
 *
 * The contracts worth pinning are the ones that would let the catalogue lie
 * about itself: a format must never report content it does not have, and a
 * long-form queue must never contain a silent item.
 */
describe('listening formats', () => {
  it('describes every format it declares', () => {
    for (const format of LISTENING_FORMATS) {
      const meta = FORMAT_META[format]
      expect(meta.id).toBe(format)
      expect(meta.title.length).toBeGreaterThan(0)
      expect(meta.activities.length).toBeGreaterThan(0)
      const [floor, ceiling] = meta.minutes
      expect(floor).toBeGreaterThan(0)
      expect(ceiling).toBeGreaterThanOrEqual(floor)
    }
  })

  it('reports no delivered pieces for a format with no content', () => {
    // The Office, Night and Lectio are new writing and new recording. Until
    // that happens the honest count is zero — a format that reported pieces it
    // did not have would put a control on a surface that plays silence.
    for (const format of ['office', 'night', 'lectio'] as const) {
      expect(deliveredPieces(format)).toEqual([])
    }
  })

  it('never counts a declared piece that has no audio', () => {
    for (const row of formatCoverage()) {
      expect(row.delivered).toBeLessThanOrEqual(row.declared)
    }
    // Guards the registry itself: every declaration must name a real format.
    for (const piece of AUDIO_NATIVE_PIECES) {
      expect(LISTENING_FORMATS).toContain(piece.format)
    }
  })
})

describe('a book, end to end', () => {
  it('only groups days that resolve to a real book', () => {
    const runs = scriptureBookRuns()
    expect(runs.length).toBeGreaterThan(0)
    for (const run of runs) {
      expect(run.name.length).toBeGreaterThan(0)
      expect(['OT', 'NT']).toContain(run.testament)
      expect(run.days.length).toBeGreaterThan(0)
    }
    // The corpus carries thematic headings — "Sabbath", "Selected",
    // "Amos, Hosea, Micah" — which are not books. A naive split on the
    // trailing numbers would offer them as one.
    const names = runs.map((r) => r.name)
    expect(names).not.toContain('Sabbath')
    expect(names).not.toContain('Selected')
  })

  it('keeps every run consecutive and ascending', () => {
    for (const run of scriptureBookRuns()) {
      for (let i = 1; i < run.days.length; i += 1) {
        expect(run.days[i]).toBe(run.days[i - 1] + 1)
      }
    }
  })

  it('answers the hour the readings could not', () => {
    // The whole point: the devotional pool tops out at 28 minutes, so this
    // budget used to return nothing at all.
    const runs = longFormBookRuns(40)
    expect(runs.length).toBeGreaterThan(0)
    for (const run of runs) expect(run.duration).toBeGreaterThanOrEqual(40 * 60)
  })

  it('builds a queue with no silent items', () => {
    for (const run of longFormBookRuns(40)) {
      const items = buildBookQueue(run)
      expect(items.length).toBe(run.days.length)
      for (const item of items) {
        expect(item.src.length).toBeGreaterThan(0)
        expect(item.duration).toBeGreaterThan(0)
      }
    }
  })

  it('offers books only for the hour, and only where they suit', () => {
    expect(
      longFormFor({ minutes: 60, activity: 'commuting' }).length,
    ).toBeGreaterThan(0)
    // Resting caps piece length so stopping is easy — a five-hour book is the
    // opposite of that.
    expect(longFormFor({ minutes: 60, activity: 'resting' })).toEqual([])
    for (const minutes of [5, 10, 20] as const) {
      expect(longFormFor({ minutes, activity: 'commuting' })).toEqual([])
    }
  })

  it('offers the shortest books first', () => {
    const runs = longFormFor({ minutes: 60, activity: 'commuting' })
    for (let i = 1; i < runs.length; i += 1) {
      expect(runs[i].duration).toBeGreaterThanOrEqual(runs[i - 1].duration)
    }
  })
})
