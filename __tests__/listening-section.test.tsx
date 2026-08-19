import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { afterEach } from 'vitest'
import ListeningSection from '@/components/audio/ListeningSection'
import { useAudioStore, type QueueItem } from '@/stores/audioStore'

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
