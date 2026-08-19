import { beforeEach, describe, expect, it } from 'vitest'
import { useAudioStore, currentItem, type QueueItem } from '@/stores/audioStore'
import { formatRuntime, queueDuration } from '@/lib/audio/queue-builder'

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
