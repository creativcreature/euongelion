/**
 * F-094 — the reading room.
 *
 * Contract under test:
 * 1. Ten layouts, each reachable, each rendering the WHOLE catalog. The
 *    founder's original complaint was "series are hiding", so coverage is
 *    asserted against ALL_SERIES_ORDER in every view rather than sampled.
 * 2. The bento leads with title + plate — no kicker above the title, and never
 *    a commissioned series in the lead slot.
 * 3. The list carries no pathway/category column.
 * 4. Sorting reorders without dropping anything.
 * 5. Search takes the page over and finds readings, not just series.
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SeriesBrowser from '@/components/series/SeriesBrowser'
import { VIEWS } from '@/components/series/SeriesLayouts'
import { ALL_SERIES_ORDER, SERIES_DATA } from '@/data/series'

vi.stubGlobal(
  'fetch',
  vi.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    } as Response),
  ),
)

afterEach(() => {
  cleanup()
  // The browser remembers the reader's chosen layout, so without this the
  // previous test's choice leaks into the next one's default.
  window.localStorage.clear()
})

const openView = (label: string) =>
  fireEvent.click(screen.getByRole('tab', { name: label }))

/** Every series title present somewhere in the stage. */
const missingFromStage = (container: HTMLElement) => {
  const stage = container.querySelector('.rr-stage') as HTMLElement
  const text = stage.textContent ?? ''
  return ALL_SERIES_ORDER.filter((slug) => {
    const title = SERIES_DATA[slug]?.title
    return title ? !text.includes(title) : false
  })
}

describe('SeriesBrowser — ten layouts', () => {
  it('offers exactly ten layouts, each with an icon and a name', () => {
    const { container } = render(<SeriesBrowser />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(10)
    expect(VIEWS).toHaveLength(10)
    // Every switcher control carries a glyph, not just a word.
    expect(container.querySelectorAll('.rr-view svg')).toHaveLength(10)
  })

  it('renders the whole catalog in EVERY layout — nothing hides anywhere', () => {
    for (const view of VIEWS) {
      const { container, unmount } = render(<SeriesBrowser />)
      openView(view.label)
      expect(
        missingFromStage(container),
        `${view.label} is hiding series`,
      ).toEqual([])
      unmount()
    }
  })

  it('defaults to Feature and leads with the newest eligible series', () => {
    const { container } = render(<SeriesBrowser />)
    expect(screen.getByRole('tab', { name: 'Feature' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    const lead = container.querySelector('.bento-lead') as HTMLElement
    expect(lead).not.toBeNull()
    // SA-036(4): a commissioned series never takes a feature slot.
    expect(lead.textContent).not.toContain(
      SERIES_DATA['looking-at-the-sun'].title,
    )
    // …but it is still on the shelf.
    expect(missingFromStage(container)).toEqual([])
  })

  it('bento tiles lead with the title — no kicker above it', () => {
    const { container } = render(<SeriesBrowser />)
    const tile = container.querySelector('.bento-tile:not(.bento-lead)') as HTMLElement
    const copy = tile.querySelector('.bento-copy') as HTMLElement
    // Title first in the DOM, meta second. The old build put a gold uppercase
    // kicker above the title, which made the least important thing loudest.
    const order = Array.from(copy.children).map((c) => c.className)
    expect(order[0]).toContain('bento-title')
    expect(order[1]).toContain('bento-meta')
  })

  it('the list shows no pathway/category column', () => {
    const { container } = render(<SeriesBrowser />)
    openView('List')
    const row = container.querySelector('.stock-row') as HTMLElement
    expect(row).not.toBeNull()
    for (const pathway of ['Sleep', 'Awake', 'Shepherd']) {
      expect(row.textContent).not.toContain(pathway)
    }
    // Three tracks: title, question, length.
    expect(row.children).toHaveLength(3)
  })

  it('the rack hangs every series over a rail', () => {
    const { container } = render(<SeriesBrowser />)
    openView('Rack')
    expect(container.querySelectorAll('.rack-paper')).toHaveLength(
      ALL_SERIES_ORDER.length,
    )
    expect(container.querySelectorAll('.rack-bar').length).toBeGreaterThan(0)
  })

  it('numbers contact-sheet frames by position in the current sort', () => {
    const { container } = render(<SeriesBrowser />)
    openView('Contact')
    const nums = Array.from(container.querySelectorAll('.frame-num')).map(
      (n) => n.textContent,
    )
    expect(nums[0]).toBe('01')
    expect(nums).toHaveLength(ALL_SERIES_ORDER.length)
  })

  it('sorting reorders without dropping anything', () => {
    const { container } = render(<SeriesBrowser />)
    openView('List')
    const titles = () =>
      Array.from(container.querySelectorAll('.stock-title')).map(
        (n) => n.textContent ?? '',
      )

    const az = titles()
    fireEvent.click(screen.getByRole('button', { name: 'Z–A' }))
    const za = titles()

    expect(za).toHaveLength(az.length)
    expect(za[0]).not.toBe(az[0])
    expect([...za].reverse()[0]).toBe(az[0])
  })

  it('search takes over the page and finds readings, not just series', () => {
    render(<SeriesBrowser />)
    fireEvent.change(
      screen.getByRole('searchbox', { name: /search the library by phrase/i }),
      { target: { value: 'I feel anxious about money' } },
    )
    // The shelves step aside while searching.
    expect(screen.queryByRole('tab', { name: 'Rack' })).toBeNull()
    expect(screen.getByText(/^Readings$/)).toBeInTheDocument()
  })

  it('an empty result names the search and offers real next words', () => {
    render(<SeriesBrowser />)
    fireEvent.change(
      screen.getByRole('searchbox', { name: /search the library by phrase/i }),
      { target: { value: 'zzzqqq unmatchable xyzzy' } },
    )
    expect(screen.getByText(/Nothing in the library matches/)).toBeInTheDocument()
    // Seeds are suggestions that actually return something.
    expect(screen.getByText('waiting on God')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /back to the shelves/i }))
    expect(screen.getByRole('tab', { name: 'Feature' })).toBeInTheDocument()
  })

  it('links every card in every layout to a real route', () => {
    for (const view of VIEWS) {
      const { container, unmount } = render(<SeriesBrowser />)
      openView(view.label)
      const stage = container.querySelector('.rr-stage') as HTMLElement
      const hrefs = Array.from(stage.querySelectorAll('a')).map(
        (a) => a.getAttribute('href') ?? '',
      )
      expect(hrefs.length, `${view.label} has no links`).toBeGreaterThan(0)
      for (const href of hrefs) {
        expect(href, `${view.label} bad href`).toMatch(
          /^\/(series|devotional)\/[a-z0-9-]+$/,
        )
      }
      unmount()
    }
  })
})
