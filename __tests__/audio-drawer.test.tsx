import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
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

let audioEl: HTMLAudioElement

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
  audioEl = audio
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

/**
 * The sidebar's sleep timer has to STOP the reading.
 *
 * SA-119 gave the sidebar a sleep chip and a sheet that opens, and I called
 * that done. It was not: the sheet recorded the choice into local state and
 * nothing ever read it, so a reader who set fifteen minutes and put the phone
 * down got the whole reading anyway. A control that answers and does nothing is
 * worse than no control — the reader stops watching the clock precisely because
 * they think it is handled.
 *
 * This matters more now that option A takes the working timer off the reading's
 * own panel: after that the sidebar is the ONLY place a sleep timer exists.
 */
describe('the sidebar sleep timer stops the reading', () => {
  const openWithOnePlaying = () => {
    act(() =>
      useAudioStore.getState().start({
        items: [item('day-1', 'The Fruit of Lies')],
        source: 'single',
        label: 'The Fruit of Lies',
      }),
    )
    act(() => useAudioStore.getState().setPanelOpen(true))
    render(<AudioDrawer />)
  }

  const arm = (name: RegExp) => {
    act(() => screen.getByRole('button', { name: /sleep timer/i }).click())
    act(() => screen.getByRole('button', { name }).click())
  }

  afterEach(() => vi.useRealTimers())

  it('pauses once the chosen minutes have run out', () => {
    vi.useFakeTimers()
    openWithOnePlaying()
    arm(/^5 minutes$/)

    act(() => void vi.advanceTimersByTime(4 * 60_000))
    expect(audioEl.pause).not.toHaveBeenCalled()

    act(() => void vi.advanceTimersByTime(90_000))
    expect(audioEl.pause).toHaveBeenCalled()
  })

  it('shows what it is set to, so the choice is visible after the sheet closes', () => {
    vi.useFakeTimers()
    openWithOnePlaying()
    arm(/^10 minutes$/)
    expect(
      screen.getByRole('button', { name: /sleep timer.*10m|10m.*remaining/i }),
    ).toBeTruthy()
  })

  it('turning it off leaves the reading alone', () => {
    vi.useFakeTimers()
    openWithOnePlaying()
    arm(/^5 minutes$/)
    act(() => screen.getByRole('button', { name: /sleep timer/i }).click())
    act(() => screen.getByRole('button', { name: /^off$|turn off/i }).click())
    act(() => void vi.advanceTimersByTime(20 * 60_000))
    expect(audioEl.pause).not.toHaveBeenCalled()
  })
})

/**
 * A speed chosen in the sidebar has to outlive the reading it was chosen in.
 *
 * Option A makes the sidebar the only place a speed control exists, and the
 * reading's own panel re-applies the REMEMBERED rate to the element every time
 * a track loads. So a sidebar that only set `playbackRate` would be undone by
 * the next reading: you set 1.5x, tap the next devotional, and it opens at 1x
 * with nothing to explain why. The preference is one key, written by whichever
 * surface the reader used.
 */
describe('the sidebar remembers the speed', () => {
  const SPEED_KEY = 'euangelion:narration-speed'

  it('persists the choice, not just the element rate', () => {
    act(() =>
      useAudioStore.getState().start({
        items: [item('day-1', 'The Fruit of Lies')],
        source: 'single',
        label: 'The Fruit of Lies',
      }),
    )
    act(() => useAudioStore.getState().setPanelOpen(true))
    render(<AudioDrawer />)

    act(() => screen.getByRole('button', { name: /speed/i }).click())
    act(() => screen.getByRole('button', { name: /^1\.5×$|^1\.5x$/i }).click())

    expect(audioEl.playbackRate).toBe(1.5)
    expect(localStorage.getItem(SPEED_KEY)).toBe('1.5')
  })

  it('persists the skip length too, which it did not', () => {
    act(() =>
      useAudioStore.getState().start({
        items: [item('day-1', 'The Fruit of Lies')],
        source: 'single',
        label: 'The Fruit of Lies',
      }),
    )
    act(() => useAudioStore.getState().setPanelOpen(true))
    render(<AudioDrawer />)

    act(() => screen.getByRole('button', { name: /speed/i }).click())
    act(() => screen.getByRole('button', { name: /^30 seconds$/i }).click())

    expect(localStorage.getItem('euangelion:narration-skip')).toBe('30')
  })

  it('opens showing the remembered speed, not 1×', () => {
    // Writing the preference is only half of it: a sidebar that always opens
    // at 1× tells the reader their choice was forgotten, while the audio plays
    // at the rate they picked. The chip has to agree with the element.
    localStorage.setItem('euangelion:narration-speed', '1.5')
    act(() =>
      useAudioStore.getState().start({
        items: [item('day-1', 'The Fruit of Lies')],
        source: 'single',
        label: 'The Fruit of Lies',
      }),
    )
    act(() => useAudioStore.getState().setPanelOpen(true))
    render(<AudioDrawer />)

    expect(screen.getByRole('button', { name: /1\.5× speed/i })).toBeTruthy()
  })
})

/**
 * The furniture every real player has and ours did not.
 *
 * Founder: "you have a lotta missing features that are fairly standard for
 * audio. players needs to be reworked based on research from mobbin." Counted
 * across eight players on Mobbin — Spotify Audiobooks, Apple Podcasts,
 * ElevenReader, Headway, Blinkist, Finimize, Patreon, The Atlantic — the two
 * things carried by real players and missing here were volume and share.
 * See docs/audio/PLAYER-GAP-ANALYSIS-2026-08-20.md.
 */
describe('the player carries what real players carry', () => {
  const openPlaying = () => {
    act(() =>
      useAudioStore.getState().start({
        items: [item('day-1', 'The Fruit of Lies')],
        source: 'single',
        label: 'The Fruit of Lies',
      }),
    )
    act(() => useAudioStore.getState().setPanelOpen(true))
    render(<AudioDrawer />)
  }

  it('offers a volume control, and it drives the element', () => {
    // Apple Podcasts and ElevenReader both carry one. On the web a desktop
    // listener otherwise has no in-page volume at all.
    openPlaying()
    const slider = screen.getByRole('slider', { name: /volume/i })
    act(() => {
      fireEvent.change(slider, { target: { value: '0.4' } })
    })
    expect(audioEl.volume).toBeCloseTo(0.4, 2)
  })

  it('shares the reading through the system sheet when there is one', async () => {
    const share = vi.fn((_data: ShareData) => Promise.resolve())
    vi.stubGlobal('navigator', { ...navigator, share })
    openPlaying()

    await act(async () => {
      screen.getByRole('button', { name: /share/i }).click()
    })

    expect(share).toHaveBeenCalledTimes(1)
    const payload = share.mock.calls[0][0]
    expect(payload.title).toContain('The Fruit of Lies')
    expect(payload.url).toContain('/devotional/day-1')
    vi.unstubAllGlobals()
  })

  it('falls back to the clipboard where there is no share sheet', async () => {
    // Desktop Firefox and older Chrome have no navigator.share. Copying the
    // link is the honest fallback; doing nothing is not.
    const writeText = vi.fn((_text: string) => Promise.resolve())
    vi.stubGlobal('navigator', {
      ...navigator,
      share: undefined,
      clipboard: { writeText },
    })
    openPlaying()

    await act(async () => {
      screen.getByRole('button', { name: /share/i }).click()
    })

    expect(writeText).toHaveBeenCalledTimes(1)
    expect(String(writeText.mock.calls[0][0])).toContain('/devotional/day-1')
    vi.unstubAllGlobals()
  })
})

/**
 * The player leads with the cover, as seven of eight surveyed players do.
 *
 * The art is decorative here rather than informative — the title and series sit
 * immediately beside it in text — so it carries an empty alt and is hidden from
 * assistive tech. Announcing the same reading twice is worse than not
 * announcing the picture.
 */
describe('the player shows a cover', () => {
  const openWith = (slug: string) => {
    act(() =>
      useAudioStore.getState().start({
        items: [item(slug, 'Finding the Secret Place')],
        source: 'series',
        label: 'Abiding in His Presence',
      }),
    )
    act(() => useAudioStore.getState().setPanelOpen(true))
    return render(<AudioDrawer />)
  }

  it('renders the artwork for the reading being played', () => {
    const { container } = openWith('abiding-in-his-presence-day-2')
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img!.getAttribute('src')).toBeTruthy()
    // Decorative: the title is already read out beside it.
    expect(img!.getAttribute('alt')).toBe('')
  })

  it('loads the cover eagerly, or it never loads at all', () => {
    /**
     * next/image lazy-loads by default, and on the deployed site that cover
     * never loaded: `loading="lazy"`, `complete: false`, `currentSrc: ""`,
     * an empty 491x491 square. Next's lazy loader uses its own
     * IntersectionObserver, and the drawer mounts its contents inside a panel
     * that slides in — the observer records the image as not intersecting and
     * never revisits it. A `new Image()` with the identical src loaded fine
     * (928x1152), which is what ruled out the file, the URL and the CSP.
     *
     * Lazy buys nothing here anyway: the markup only exists once the reader
     * has opened the panel.
     */
    const { container } = openWith('abiding-in-his-presence-day-2')
    const img = container.querySelector('img')
    expect(img!.getAttribute('loading')).not.toBe('lazy')
  })

  it('shows no empty frame when a reading has no art at all', () => {
    const { container } = openWith('not-a-real-devotional-day-1')
    expect(container.querySelector('img')).toBeNull()
  })
})

/**
 * Opening the player from a reading should offer THAT reading.
 *
 * Founder, on the panel's "more listening controls": pressing it "on a reading
 * you haven't started opens the sidebar saying 'Nothing playing'." True, and
 * useless — the reader is looking at a reading and asking for its controls.
 *
 * The fix deliberately does NOT queue anything as a side effect of opening a
 * panel. Queuing would light the header dot, which means "something is waiting
 * for you", off the back of a button that was only ever a request to see more.
 * So the sidebar reads the reading off the path instead, offers it, and the
 * queue changes only when the reader actually presses play.
 */
describe('opening the sidebar from a reading', () => {
  const openOn = (path: string) => {
    pathname = path
    act(() => useAudioStore.getState().setPanelOpen(true))
    return render(<AudioDrawer />)
  }

  it('offers the reading on the page when nothing is queued', () => {
    openOn('/devotional/abiding-in-his-presence-day-2')
    expect(
      screen.getByRole('button', { name: /play this reading/i }),
    ).toBeTruthy()
  })

  it('does not queue anything merely by being opened', () => {
    openOn('/devotional/abiding-in-his-presence-day-2')
    expect(useAudioStore.getState().queue).toHaveLength(0)
  })

  it('queues the reading and its series once play is pressed', () => {
    openOn('/devotional/abiding-in-his-presence-day-2')
    act(() =>
      screen.getByRole('button', { name: /play this reading/i }).click(),
    )
    const { queue } = useAudioStore.getState()
    expect(queue.length).toBeGreaterThan(1)
    expect(queue[0].slug).toBe('abiding-in-his-presence-day-2')
  })

  it('still says nothing is playing away from a reading', () => {
    openOn('/series')
    expect(
      screen.queryByRole('button', { name: /play this reading/i }),
    ).toBeNull()
    expect(screen.getByText(/nothing playing/i)).toBeTruthy()
  })
})
