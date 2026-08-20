/**
 * SA-114 / F-158 — founder: "The lead image for the daily bread should
 * change daily — representing the verse of the day."
 *
 * Manifest-first (HARD image rule): the lead is CHOSEN from the curated
 * Vasari-captioned print pool, never generated. The resolver scores each
 * print's title+description against the day's verse text; deterministic
 * per date; returns null (caller keeps series art) rather than picking an
 * arbitrary image when nothing genuinely matches.
 */
import { describe, expect, it } from 'vitest'
import { pickLeadArt } from '@/lib/edition/lead-art'

const STORM_VERSE =
  'And there arose a great storm of wind, and the waves beat into the boat, so that it was now full. And he arose, and rebuked the wind, and said unto the sea, Peace, be still.'

describe('the daily lead art', () => {
  it('finds a storm print for a storm verse, deterministically per date', () => {
    const a = pickLeadArt('2026-08-21', STORM_VERSE)
    const b = pickLeadArt('2026-08-21', STORM_VERSE)
    expect(a).not.toBeNull()
    expect(a!.image).toMatch(/^\/images\/devotional-prints\//)
    expect(a!.image).toBe(b!.image) // same date, same verse → same pick
    const hay = (a!.title + ' ' + a!.shown).toLowerCase()
    expect(/storm|wave|sea|wind|water/.test(hay)).toBe(true)
  })

  it('never picks a print excluded by the day (the gallery already shows it)', () => {
    const first = pickLeadArt('2026-08-21', STORM_VERSE)!
    const second = pickLeadArt('2026-08-21', STORM_VERSE, [first.file])
    expect(second?.file).not.toBe(first.file)
  })

  it('answers null when nothing genuinely matches — the caller keeps series art', () => {
    expect(pickLeadArt('2026-08-21', 'zzz qqq xyzzy plugh')).toBeNull()
  })
})
