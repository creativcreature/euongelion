import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { afterEach } from 'vitest'
import ListeningSection from '@/components/audio/ListeningSection'
import GlobalAudioBar from '@/components/audio/GlobalAudioBar'
import { registerAudioElement } from '@/lib/audio/audio-element'
import { useAudioStore, type QueueItem } from '@/stores/audioStore'

let pathname = '/series'
vi.mock('next/navigation', () => ({ usePathname: () => pathname }))
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) => <a href={href}>{children}</a>,
}))

const item = (slug: string, title: string): QueueItem => ({
  slug,
  title,
  src: `/audio/${slug}.m4a?v=1`,
  duration: 600,
  href: `/devotional/${slug}`,
  context: 'He Cannot Deny Himself',
})

beforeEach(() => {
  useAudioStore.getState().clear()
  localStorage.clear()
})
afterEach(cleanup)

describe('Your listening, in the library', () => {
  it('offers a way out when nothing is queued', () => {
    render(<ListeningSection />)
    // An empty state that dead-ends is worse than none — every studied queue
    // (NYTimes Audio) routes out of it.
    expect(screen.getByText('Nothing queued.')).toBeTruthy()
    const link = screen.getByText('Find something to listen to')
    expect(link.getAttribute('href')).toBe('/series')
  })

  it('lists what is up next with its context and runtime', () => {
    useAudioStore.getState().start({
      items: [
        item('a', 'The Fruit of Lies'),
        item('b', 'Like a Morning Cloud'),
      ],
      source: 'series',
      label: 'He Cannot Deny Himself',
    })
    render(<ListeningSection />)
    expect(screen.getByText('Up next')).toBeTruthy()
    expect(screen.getByText('The Fruit of Lies')).toBeTruthy()
    expect(screen.getByText('Like a Morning Cloud')).toBeTruthy()
    // Runtime stated, because what a listener needs is how long this is.
    expect(screen.getByText(/2 readings · 20 min/)).toBeTruthy()
  })

  it('can remove a reading from the queue', () => {
    useAudioStore.getState().start({
      items: [item('a', 'First'), item('b', 'Second')],
      source: 'saved',
    })
    render(<ListeningSection />)
    screen.getByLabelText('Remove First from the queue').click()
    expect(useAudioStore.getState().queue.map((q) => q.slug)).toEqual(['b'])
  })

  it('reorders without losing the reading that is sounding', () => {
    useAudioStore.getState().start({
      items: [item('a', 'First'), item('b', 'Second'), item('c', 'Third')],
      index: 0,
      source: 'saved',
    })
    render(<ListeningSection />)
    screen.getByLabelText('Move Third up').click()
    expect(useAudioStore.getState().queue.map((q) => q.slug)).toEqual([
      'a',
      'c',
      'b',
    ])
    // Still on 'a' — a reorder must never change what is playing.
    expect(useAudioStore.getState().index).toBe(0)
  })

  it('marks the reading currently playing', () => {
    useAudioStore.getState().start({
      items: [item('a', 'First'), item('b', 'Second')],
      index: 1,
      source: 'series',
    })
    const { container } = render(<ListeningSection />)
    const current = container.querySelector('.ls-row.is-current')
    expect(current).not.toBeNull()
    expect(within(current as HTMLElement).getByText('Second')).toBeTruthy()
  })
})

/**
 * The bar that follows you around the site.
 *
 * Two contracts, both from what actually ships (Mobbin, 2026-08-19): it must be
 * dismissible — Substack and Apple News both carry a close, and ours did not —
 * and it must retire on the reading it is playing, because the reader's own
 * panel is the better surface and two transports on one screen is a bug.
 */
describe('the global audio bar', () => {
  beforeEach(() => {
    pathname = '/series'
    const audio = document.createElement('audio')
    registerAudioElement(audio)
  })

  const startOne = () =>
    useAudioStore.getState().start({
      items: [item('a', 'The Fruit of Lies')],
      source: 'single',
      label: null,
    })

  it('stays away until a reader has actually started', () => {
    render(<GlobalAudioBar />)
    expect(screen.queryByLabelText('Now playing')).toBeNull()
  })

  it('appears once a queue is playing, anywhere on the site', () => {
    startOne()
    render(<GlobalAudioBar />)
    expect(screen.getByLabelText('Now playing')).toBeTruthy()
    expect(screen.getByText('The Fruit of Lies')).toBeTruthy()
  })

  it('retires on the reading it is playing', () => {
    startOne()
    pathname = '/devotional/a'
    render(<GlobalAudioBar />)
    expect(screen.queryByLabelText('Now playing')).toBeNull()
  })

  it('can be dismissed, and dismissing clears what is up next', () => {
    startOne()
    render(<GlobalAudioBar />)
    screen.getByLabelText('Close the player and clear what is up next').click()
    expect(useAudioStore.getState().queue).toHaveLength(0)
    expect(useAudioStore.getState().started).toBe(false)
  })

  it('offers both skip directions', () => {
    startOne()
    render(<GlobalAudioBar />)
    const bar = screen.getByLabelText('Now playing')
    expect(within(bar).getByLabelText('Back 15 seconds')).toBeTruthy()
    expect(within(bar).getByLabelText('Forward 15 seconds')).toBeTruthy()
  })

  it('shows queue position when there is more than one reading', () => {
    useAudioStore.getState().start({
      items: [item('a', 'First'), item('b', 'Second'), item('c', 'Third')],
      index: 1,
      source: 'series',
      label: 'He Cannot Deny Himself',
    })
    render(<GlobalAudioBar />)
    expect(screen.getByText(/2 of 3/)).toBeTruthy()
  })
})
