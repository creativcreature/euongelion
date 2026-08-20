import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import AudioDrawer from '@/components/audio/AudioDrawer'
import AddToQueue from '@/components/audio/AddToQueue'
import SavedPlaylists from '@/components/audio/SavedPlaylists'
import AudioHeaderButton from '@/components/audio/AudioHeaderButton'
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
  // `clear()` deliberately leaves the sidebar's own open state alone, so it
  // has to be reset here or it leaks between tests.
  useAudioStore.getState().setPanelOpen(false)
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

/**
 * The sidebar opens with an empty queue, because discovery lives inside it now.
 *
 * Founder, 2026-08-19: the "what are you doing?" picker above the series
 * shelves was "extremely intrusive". It moved into audio's own area — which
 * means the sidebar has to be reachable when nothing is playing, or there is no
 * way in at all.
 */
describe('the sidebar as audio’s own area', () => {
  it('opens with nothing queued and offers a way to find something', () => {
    useAudioStore.getState().setPanelOpen(true)
    render(<AudioDrawer />)
    const panel = screen.getByRole('dialog')
    expect(within(panel).getByText('Nothing playing')).toBeTruthy()
    expect(within(panel).getByText('Find something')).toBeTruthy()
  })

  it('shows no handle when nothing is playing', () => {
    render(<AudioDrawer />)
    expect(screen.queryByRole('button', { name: /open the queue/i })).toBeNull()
  })

  it('hides transport and queue controls when there is nothing to control', () => {
    useAudioStore.getState().setPanelOpen(true)
    render(<AudioDrawer />)
    const panel = screen.getByRole('dialog')
    expect(within(panel).queryByLabelText('Back 15 seconds')).toBeNull()
    expect(within(panel).queryByRole('button', { name: /^clear$/i })).toBeNull()
  })
})

/**
 * Audio has to be reachable from every page.
 *
 * Founder, 2026-08-19: "wait I should be able to access the audio player on
 * everypage right?" — and at that moment he could not. Discovery had moved into
 * the sidebar, and the sidebar could only be opened by the tucked handle, which
 * requires something already queued. With an empty queue the entire site had
 * one entry point: the homepage callout.
 *
 * This lives in the masthead utilities, beside search and theme, so it is on
 * every page that renders the shell.
 */
describe('the header entry point', () => {
  it('opens the sidebar with nothing queued', () => {
    render(<AudioHeaderButton />)
    expect(useAudioStore.getState().panelOpen).toBe(false)
    act(() =>
      screen.getByRole('button', { name: /open the audio sidebar/i }).click(),
    )
    expect(useAudioStore.getState().panelOpen).toBe(true)
  })

  it('stays quiet when there is nothing to return to', () => {
    const { container } = render(<AudioHeaderButton />)
    // The dot is the "not invisible" part, and it is wrong to show it when
    // there is no queue behind it.
    expect(container.querySelector('.audio-header-dot')).toBeNull()
  })

  it('marks a live queue, and says how many', () => {
    useAudioStore.getState().start({
      items: [item('a', 'One'), item('b', 'Two')],
      source: 'series',
    })
    const { container } = render(<AudioHeaderButton />)
    expect(container.querySelector('.audio-header-dot')).not.toBeNull()
    expect(screen.getByRole('button', { name: /2 in the queue/i })).toBeTruthy()
  })
})

/**
 * The button and the drawer, together.
 *
 * Both were tested in isolation — the button sets `panelOpen`, the drawer
 * renders when it is set — and neither test proved that CLICKING THE BUTTON
 * PUTS THE DRAWER ON SCREEN. That is the thing the founder actually asked for
 * ("when I click audio button the playlist que drawer should slide out"), so it
 * gets its own test rather than being inferred from two passing halves.
 */
describe('clicking the header button slides the drawer out', () => {
  it('opens it from an empty queue', () => {
    render(
      <>
        <AudioHeaderButton />
        <AudioDrawer />
      </>,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
    act(() =>
      screen.getByRole('button', { name: /open the audio sidebar/i }).click(),
    )
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('opens it with a queue, showing what is up next', () => {
    useAudioStore.getState().start({
      items: [
        item('a', 'The Fruit of Lies'),
        item('b', 'Like a Morning Cloud'),
      ],
      source: 'series',
      label: 'He Cannot Deny Himself',
    })
    render(
      <>
        <AudioHeaderButton />
        <AudioDrawer />
      </>,
    )
    act(() =>
      screen.getByRole('button', { name: /open the audio sidebar/i }).click(),
    )
    const panel = screen.getByRole('dialog')
    expect(within(panel).getByText('Like a Morning Cloud')).toBeTruthy()
  })

  it('closes again from inside the drawer', () => {
    render(
      <>
        <AudioHeaderButton />
        <AudioDrawer />
      </>,
    )
    act(() =>
      screen.getByRole('button', { name: /open the audio sidebar/i }).click(),
    )
    act(() => screen.getByRole('button', { name: /^close$/i }).click())
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

/**
 * The sidebar is the player — SA-118 / option A.
 *
 * Founder: "desktop sidebar should contain universal player", after observing
 * that the sidebar and the reader's own panel were "basically redundant". The
 * agreed shape is that the sidebar carries the FULL player and the page keeps
 * only a slim row, so nothing is drawn twice.
 *
 * These are the pieces the sidebar was missing: somewhere to drag to a
 * position, and the three controls a listener reaches for on a long reading.
 */
describe('the sidebar carries the whole player', () => {
  const startPlaying = () => {
    useAudioStore.getState().start({
      items: [
        item('a', 'The Fruit of Lies'),
        item('b', 'Like a Morning Cloud'),
      ],
      source: 'series',
      label: 'He Cannot Deny Himself',
    })
    useAudioStore.getState().setPanelOpen(true)
  }

  it('lets you drag to a position in the reading', () => {
    startPlaying()
    render(<AudioDrawer />)
    const panel = screen.getByRole('dialog')
    expect(within(panel).getByRole('slider', { name: /seek/i })).toBeTruthy()
  })

  it('shows elapsed as well as remaining', () => {
    startPlaying()
    const { container } = render(<AudioDrawer />)
    // Scoped to the times row: a bare /0:00/ also matches the speed chip.
    const times = container.querySelector('.lsn-times')
    expect(times).not.toBeNull()
    expect(times?.textContent).toContain('0:00')
  })

  it('offers speed, sleep and chapters', () => {
    startPlaying()
    render(<AudioDrawer />)
    const panel = screen.getByRole('dialog')
    expect(within(panel).getByRole('button', { name: /speed/i })).toBeTruthy()
    expect(within(panel).getByRole('button', { name: /sleep/i })).toBeTruthy()
    expect(
      within(panel).getByRole('button', { name: /chapters/i }),
    ).toBeTruthy()
  })

  it('can step back to the previous reading', () => {
    startPlaying()
    render(<AudioDrawer />)
    const panel = screen.getByRole('dialog')
    expect(
      within(panel).getByRole('button', { name: /previous/i }),
    ).toBeTruthy()
  })
})
