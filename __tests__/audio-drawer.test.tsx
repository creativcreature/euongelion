import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import AudioDrawer from '@/components/audio/AudioDrawer'
import AddToQueue from '@/components/audio/AddToQueue'
import SavedPlaylists from '@/components/audio/SavedPlaylists'
import { registerAudioElement } from '@/lib/audio/audio-element'
import { useAudioStore, type QueueItem } from '@/stores/audioStore'
import { usePlaylistsStore } from '@/stores/playlistsStore'

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
  pathname = '/series'
  localStorage.clear()
  useAudioStore.getState().clear()
  usePlaylistsStore.setState({ playlists: [] })
  const audio = document.createElement('audio')
  // jsdom implements neither, and both are called from tap handlers here.
  audio.play = vi.fn(() => Promise.resolve())
  audio.pause = vi.fn()
  registerAudioElement(audio)
})
afterEach(cleanup)

/**
 * SA-107 — audio, tucked but not invisible.
 *
 * The founder's complaint was that audio was "clunky on the site in the areas
 * that aren't strictly the devotional". A full-width bar pinned across every
 * page pushed against the written content the site is for. What replaced it is
 * a handle — so the contracts worth pinning are that it stays small until
 * asked, and that it still announces what is playing and what is behind it.
 */
describe('the tucked handle', () => {
  const startTwo = () =>
    useAudioStore.getState().start({
      items: [
        item('a', 'The Fruit of Lies'),
        item('b', 'Like a Morning Cloud'),
      ],
      source: 'series',
      label: 'He Cannot Deny Himself',
    })

  it('shows nothing before a reader has started', () => {
    render(<AudioDrawer />)
    expect(screen.queryByText('The Fruit of Lies')).toBeNull()
  })

  it('announces what is playing and how many are behind it', () => {
    startTwo()
    render(<AudioDrawer />)
    expect(screen.getByText('The Fruit of Lies')).toBeTruthy()
    // "+1" is the not-invisible part: the depth of the queue is legible
    // without opening anything.
    expect(screen.getByText('+1')).toBeTruthy()
  })

  it('keeps the queue closed until it is asked for', () => {
    startTwo()
    render(<AudioDrawer />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('opens the queue as a drawer', () => {
    startTwo()
    render(<AudioDrawer />)
    act(() => screen.getByRole('button', { name: /open the queue/i }).click())
    const drawer = screen.getByRole('dialog')
    expect(within(drawer).getByText('Like a Morning Cloud')).toBeTruthy()
  })

  it('stands aside on the reading it is playing', () => {
    startTwo()
    pathname = '/devotional/a'
    render(<AudioDrawer />)
    // The reader's own panel owns the transport there; two on one screen is a bug.
    expect(screen.queryByText('+1')).toBeNull()
  })

  it('offers both skip directions in the drawer', () => {
    startTwo()
    render(<AudioDrawer />)
    act(() => screen.getByRole('button', { name: /open the queue/i }).click())
    const drawer = screen.getByRole('dialog')
    expect(within(drawer).getByLabelText('Back 15 seconds')).toBeTruthy()
    expect(within(drawer).getByLabelText('Forward 15 seconds')).toBeTruthy()
  })

  it('can be cleared, which empties the queue and closes it', () => {
    // Carried over from the bar this replaced: a listener must always have a
    // way out of a transport that follows them across every page.
    startTwo()
    render(<AudioDrawer />)
    act(() => screen.getByRole('button', { name: /open the queue/i }).click())
    act(() => screen.getByRole('button', { name: /^clear$/i }).click())
    expect(useAudioStore.getState().queue).toHaveLength(0)
    expect(useAudioStore.getState().started).toBe(false)
  })

  it('saves what is queued as a playlist, in one tap', () => {
    startTwo()
    render(<AudioDrawer />)
    act(() => screen.getByRole('button', { name: /open the queue/i }).click())
    act(() =>
      screen.getByRole('button', { name: /save as a playlist/i }).click(),
    )
    const [saved] = usePlaylistsStore.getState().playlists
    expect(saved.name).toBe('He Cannot Deny Himself')
    expect(saved.items).toHaveLength(2)
  })
})

describe('adding while browsing', () => {
  it('queues a reading without starting playback', () => {
    render(<AddToQueue item={item('c', 'A Third')} />)
    act(() =>
      screen.getByRole('button', { name: /add a third to the queue/i }).click(),
    )
    expect(useAudioStore.getState().queue.map((q) => q.slug)).toEqual(['c'])
    // Adding is quiet: it must not take over from whatever is sounding.
    expect(useAudioStore.getState().playing).toBe(false)
  })

  it('will not queue the same reading twice', () => {
    render(<AddToQueue item={item('c', 'A Third')} />)
    const button = screen.getByRole('button', { name: /add a third/i })
    act(() => button.click())
    act(() => button.click())
    expect(useAudioStore.getState().queue).toHaveLength(1)
  })

  it('offers nothing when a reading has no track', () => {
    const { container } = render(<AddToQueue item={null} />)
    expect(container.querySelector('button')).toBeNull()
  })
})

describe('playlists in the library', () => {
  it('stays out of the way until one has been saved', () => {
    const { container } = render(<SavedPlaylists />)
    expect(container.firstChild).toBeNull()
  })

  it('lists a saved playlist with its length', () => {
    usePlaylistsStore
      .getState()
      .save('For the drive', [item('a', 'One'), item('b', 'Two')])
    render(<SavedPlaylists />)
    expect(screen.getByText('For the drive')).toBeTruthy()
    expect(screen.getByText(/2 readings · 20 min/)).toBeTruthy()
  })

  it('plays a playlist as the queue', () => {
    usePlaylistsStore.getState().save('For the drive', [item('a', 'One')])
    render(<SavedPlaylists />)
    act(() =>
      screen.getByRole('button', { name: /play for the drive/i }).click(),
    )
    expect(useAudioStore.getState().label).toBe('For the drive')
    expect(useAudioStore.getState().queue).toHaveLength(1)
  })

  it('deletes a playlist', () => {
    usePlaylistsStore.getState().save('Temp', [item('a', 'One')])
    render(<SavedPlaylists />)
    act(() => screen.getByRole('button', { name: /delete temp/i }).click())
    expect(usePlaylistsStore.getState().playlists).toHaveLength(0)
  })
})
