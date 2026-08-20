import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import AudioPlayer from '@/components/AudioPlayer'
import GlobalAudioHost from '@/components/audio/GlobalAudioHost'
import { useAudioStore } from '@/stores/audioStore'

/**
 * Pressing play queues the rest of the series behind the reading.
 *
 * Founder: "The sidebar (universal player) should also que other devotionals,
 * not just the chapters." Registering only the reading you started left Up Next
 * permanently empty — the sidebar could show what was playing but never what
 * came after it, so the queue was a queue of one.
 *
 * It queues FROM the day you started, not from day one: pressing play on day
 * three should not offer to replay days one and two.
 */
// Inlined inside the factory: vi.mock is hoisted above any top-level const.
vi.mock('@/data/audio-manifest.json', () => ({
  default: Object.fromEntries(
    ['day-1', 'day-2', 'day-3', 'day-4', 'day-5', 'day-6', 'day-7'].map(
      (d, i) => [
        `he-cannot-deny-himself-${d}`,
        {
          src: `/audio/he-cannot-deny-himself-${d}.m4a`,
          duration: 900 + i,
          words: 3000,
          voice: 'chris-james-thca-master',
          engine: 'elevenlabs',
          bytes: 1000 + i,
        },
      ],
    ),
  ),
}))

const SEGMENTS = [{ id: 'seg-0', label: 'Title', text: 'The Fruit of Lies.' }]

beforeEach(() => {
  localStorage.clear()
  useAudioStore.getState().clear()
  if (!window.matchMedia) {
    window.matchMedia = ((q: string) => ({
      matches: false,
      media: q,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  }
})
afterEach(cleanup)

const play = (slug: string) => {
  render(
    <>
      <GlobalAudioHost />
      <AudioPlayer title="A Reading" segments={SEGMENTS} slug={slug} />
    </>,
  )
  const audio = document.querySelector('audio') as HTMLAudioElement
  act(() => {
    audio.dispatchEvent(new Event('play'))
  })
  return useAudioStore.getState()
}

describe('playing a reading queues the series behind it', () => {
  it('fills Up Next with the other devotionals, not just this one', () => {
    const state = play('he-cannot-deny-himself-day-1')
    expect(state.queue.length).toBeGreaterThan(1)
    expect(state.queue[0].slug).toBe('he-cannot-deny-himself-day-1')
    expect(state.queue[1].slug).toBe('he-cannot-deny-himself-day-2')
  })

  it('queues from the day you started, not from day one', () => {
    const state = play('he-cannot-deny-himself-day-3')
    expect(state.queue[0].slug).toBe('he-cannot-deny-himself-day-3')
    // Days already behind the reader are not offered again.
    expect(state.queue.some((q) => q.slug.endsWith('day-1'))).toBe(false)
  })

  it('carries the series name, so the sidebar can say where these came from', () => {
    const state = play('he-cannot-deny-himself-day-1')
    expect(state.label).toBe('He Cannot Deny Himself')
  })
})
