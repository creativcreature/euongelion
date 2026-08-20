import { beforeEach, describe, expect, it } from 'vitest'
import { useAudioStore, currentItem, type QueueItem } from '@/stores/audioStore'
import {
  coverForReading,
  formatRuntime,
  queueDuration,
  queueFromDay,
} from '@/lib/audio/queue-builder'

/**
 * The listening queue — SA-096.
 *
 * The founder's ruling is the thing worth pinning: "its ok that a person binge
 * a series, it means the material is really working for them." So there is no
 * per-source stopping rule, and the store must never encode one.
 */
const item = (slug: string, duration = 600): QueueItem => ({
  slug,
  title: slug,
  src: `/audio/${slug}.m4a?v=1`,
  duration,
  href: `/devotional/${slug}`,
})

const THREE = [item('a'), item('b'), item('c')]

beforeEach(() => {
  useAudioStore.getState().clear()
  localStorage.clear()
})

describe('the queue', () => {
  it('starts where it was asked to, not always at the top', () => {
    useAudioStore.getState().start({ items: THREE, index: 1, source: 'series' })
    expect(currentItem(useAudioStore.getState())?.slug).toBe('b')
  })

  it('clamps an out-of-range start rather than playing nothing', () => {
    useAudioStore
      .getState()
      .start({ items: THREE, index: 99, source: 'series' })
    expect(currentItem(useAudioStore.getState())?.slug).toBe('c')
  })

  it('advances through every kind — no source stops early', () => {
    for (const source of ['series', 'plan', 'daily', 'saved'] as const) {
      useAudioStore.getState().start({ items: THREE, index: 0, source })
      expect(useAudioStore.getState().next()).toBe(true)
      expect(useAudioStore.getState().next()).toBe(true)
      expect(currentItem(useAudioStore.getState())?.slug).toBe('c')
      // Only the END of the queue stops it.
      expect(useAudioStore.getState().next()).toBe(false)
    }
  })

  it('will not step before the first item', () => {
    useAudioStore.getState().start({ items: THREE, index: 0, source: 'series' })
    expect(useAudioStore.getState().previous()).toBe(false)
    expect(currentItem(useAudioStore.getState())?.slug).toBe('a')
  })

  it('does not queue the same reading twice', () => {
    useAudioStore.getState().start({ items: [item('a')], source: 'single' })
    expect(useAudioStore.getState().enqueue(item('b'))).toBe(true)
    expect(useAudioStore.getState().enqueue(item('b'))).toBe(false)
    expect(useAudioStore.getState().queue).toHaveLength(2)
  })

  it('keeps playing the same reading when something before it is removed', () => {
    useAudioStore.getState().start({ items: THREE, index: 2, source: 'series' })
    useAudioStore.getState().remove('a')
    // Still on 'c' — removing an earlier item must not drag the cursor onto a
    // different reading than the one currently sounding.
    expect(currentItem(useAudioStore.getState())?.slug).toBe('c')
  })

  it('keeps playing the same reading across a reorder', () => {
    useAudioStore.getState().start({ items: THREE, index: 0, source: 'saved' })
    // Move 'c' to the front; 'a' is still what is sounding.
    useAudioStore.getState().reorder(2, 0)
    expect(useAudioStore.getState().queue.map((q) => q.slug)).toEqual([
      'c',
      'a',
      'b',
    ])
    expect(currentItem(useAudioStore.getState())?.slug).toBe('a')
  })

  it('never reports playing after a clear', () => {
    useAudioStore.getState().start({ items: THREE, source: 'series' })
    useAudioStore.getState().setPlaying(true)
    useAudioStore.getState().clear()
    expect(useAudioStore.getState().playing).toBe(false)
    expect(useAudioStore.getState().started).toBe(false)
    expect(currentItem(useAudioStore.getState())).toBeNull()
  })
})

describe('runtime, stated up front', () => {
  it('sums a queue', () => {
    expect(queueDuration(THREE)).toBe(1800)
  })

  it('reads as a commitment, not a number of seconds', () => {
    expect(formatRuntime(600)).toBe('10 min')
    expect(formatRuntime(1800)).toBe('30 min')
    expect(formatRuntime(3600)).toBe('1 hr')
    expect(formatRuntime(4320)).toBe('1 hr 12 min')
  })
})

/**
 * SA-108 — /today means your PLACE in a series.
 *
 * `queueFromDay` drops the days already behind the reader rather than skipping
 * past them with a cursor. Offering to replay day one when someone is on day
 * four is a different product from the one /today describes.
 *
 * These run against the real catalogue, so they assert shape rather than exact
 * titles — the manifest changes whenever anything is re-rendered.
 */
describe('listening from where you are', () => {
  const SERIES = 'he-cannot-deny-himself'

  it('starts at the day asked for and keeps everything after it', () => {
    const all = queueFromDay(SERIES, `${SERIES}-day-1`)
    const fromFour = queueFromDay(SERIES, `${SERIES}-day-4`)
    expect(all.length).toBeGreaterThan(0)
    expect(fromFour[0].slug).toBe(`${SERIES}-day-4`)
    // Strictly shorter: the earlier days are dropped, not reordered.
    expect(fromFour.length).toBeLessThan(all.length)
    expect(fromFour.some((i) => i.slug === `${SERIES}-day-1`)).toBe(false)
  })

  it('keeps the whole series when the day itself has no track', () => {
    // An unnarrated day mid-series must not silence everything after it.
    const all = queueFromDay(SERIES, `${SERIES}-day-1`)
    expect(queueFromDay(SERIES, 'not-a-real-slug')).toHaveLength(all.length)
  })

  it('returns nothing for a series that does not exist', () => {
    expect(queueFromDay('no-such-series', 'whatever')).toHaveLength(0)
  })
})

/**
 * A cover for the player.
 *
 * Seven of the eight players surveyed on Mobbin lead with cover art — Spotify
 * Audiobooks, Headway, Blinkist, Finimize, The Atlantic and the rest. Ours had
 * none, while every devotional already has artwork on the page. See
 * docs/audio/PLAYER-GAP-ANALYSIS-2026-08-20.md.
 *
 * The resolution order matches what the reading page itself does, so the player
 * and the page never disagree about which image belongs to a reading: the day's
 * own art first, then the series hero. The fallback is what keeps a Bible-365
 * day — which has no per-day art — from showing an empty square.
 *
 * Bible-365 is read here and never written; the founder's "leave the 365 bible
 * alone" stands.
 */
describe('coverForReading', () => {
  it('uses the reading’s own artwork when it has some', () => {
    const cover = coverForReading('abiding-in-his-presence-day-2')
    expect(cover).toBeTruthy()
    expect(cover!.src.startsWith('/')).toBe(true)
  })

  it('falls back to the series hero for a day with no art of its own', () => {
    const cover = coverForReading('bible-365-day-3')
    expect(cover).toBeTruthy()
    expect(cover!.src.startsWith('/')).toBe(true)
  })

  it('returns null rather than a broken image for an unknown reading', () => {
    expect(coverForReading('not-a-real-devotional-day-1')).toBeNull()
  })
})
