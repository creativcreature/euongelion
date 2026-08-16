/**
 * SA-058 — chapter boundaries for the transport.
 *
 * All 528 narration tracks carry MEASURED chapter timings (build_chapters.py
 * refuses to emit a devotional whose re-extraction disagrees with what was
 * actually spoken), and until now nothing in the transport could use them —
 * the only way to a chapter was the sheet.
 *
 * `chapterAt` answers "which chapter", which is enough to mark the section
 * being read. Stepping between chapters and saying how much of one is left
 * both need the BOUNDS, which is what this adds.
 */
import { describe, expect, it } from 'vitest'
import { chapterAt, chapterBounds } from '@/lib/audio/tracks'

const CHAPTERS = [
  { t: 0, label: 'Opening', module: 0 },
  { t: 3.3, label: 'Scripture', module: 1 },
  { t: 19.1, label: 'Word study', module: 2 },
]

const DURATION = 120

describe('chapterBounds', () => {
  it('ends the last chapter at the track duration', () => {
    // There is no next chapter to borrow a boundary from, and without this the
    // "left in chapter" readout would have nothing to subtract towards.
    expect(chapterBounds(CHAPTERS, 25, DURATION)).toEqual({
      index: 2,
      start: 19.1,
      end: DURATION,
    })
  })

  it('ends a middle chapter at the next one’s start', () => {
    expect(chapterBounds(CHAPTERS, 5, DURATION)).toEqual({
      index: 1,
      start: 3.3,
      end: 19.1,
    })
  })

  it('treats time before the first boundary as the first chapter', () => {
    expect(chapterBounds(CHAPTERS, 0, DURATION)).toEqual({
      index: 0,
      start: 0,
      end: 3.3,
    })
  })

  it('lands on the new chapter exactly at its boundary', () => {
    // Float timings come from a renderer, so the boundary case is real: at
    // exactly 3.3 the reader is IN Scripture, not still in Opening.
    expect(chapterBounds(CHAPTERS, 3.3, DURATION)?.index).toBe(1)
  })

  it('returns null when the track has no chapters', () => {
    expect(chapterBounds(undefined, 5, DURATION)).toBeNull()
    expect(chapterBounds([], 5, DURATION)).toBeNull()
  })

  it('agrees with chapterAt about which chapter is current', () => {
    // Two functions answering the same question must never disagree, or the
    // highlighted section and the transport label would drift apart.
    for (const t of [0, 1, 3.3, 10, 19.1, 60, 119]) {
      const bounds = chapterBounds(CHAPTERS, t, DURATION)
      expect(CHAPTERS[bounds!.index]).toEqual(chapterAt(CHAPTERS, t))
    }
  })
})
