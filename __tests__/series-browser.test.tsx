/**
 * F-094 — the reading room.
 *
 * Contract under test:
 * 1. Seven layouts, each reachable, each rendering the WHOLE catalog. The
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
  it('offers exactly seven layouts, each with an icon and a name', () => {
    const { container } = render(<SeriesBrowser />)
    // Founder-cut 2026-08-15: Index, Contact and Broadsheet removed.
    expect(screen.getAllByRole('tab')).toHaveLength(7)
    expect(VIEWS).toHaveLength(7)
    // Founder 2026-08-16: Flow leads and replaces Rose; Covers follows.
    expect(VIEWS[0].label).toBe('Flow')
    expect(VIEWS[1].label).toBe('Covers')
    expect(VIEWS.map((v) => v.label)).not.toContain('Rose')
    expect(container.querySelectorAll('.rr-view svg')).toHaveLength(7)
    for (const gone of ['Index', 'Contact', 'Broadsheet']) {
      expect(screen.queryByRole('tab', { name: gone })).toBeNull()
    }
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

  it('defaults to Flow, and Feature leads with the longest reading', () => {
    const { container } = render(<SeriesBrowser />)
    // Founder-ordered 2026-08-15: Covers first, Issues second.
    expect(screen.getByRole('tab', { name: 'Flow' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getAllByRole('tab').map((t) => t.getAttribute('aria-label'))).toEqual([
      'Flow', 'Covers', 'Issues', 'Feature', 'Rack', 'Spines', 'List',
    ])
    openView('Feature')
    const lead = container.querySelector('.fp-lead') as HTMLElement
    expect(lead).not.toBeNull()
    // SA-036(4): a commissioned series never takes a feature slot.
    expect(lead.textContent).not.toContain(
      SERIES_DATA['looking-at-the-sun'].title,
    )
    // …but it is still on the shelf.
    expect(missingFromStage(container)).toEqual([])
  })

  it('the front page allocates column inches by the length of the reading', () => {
    // Founder 2026-08-16: "the hiearchy doesnt make sense in terms of size of
    // devotionals." Size now encodes days, so the page cannot set a five-day
    // above a fifty-day. Read the day counts down the page and assert they
    // never increase.
    const { container } = render(<SeriesBrowser />)
    openView('Feature')
    const days = [
      container.querySelector('.fp-lead'),
      ...container.querySelectorAll('.fp-story'),
      ...container.querySelectorAll('.fp-brief'),
    ]
      .map((el) => el?.textContent?.match(/(\d+)\s+DAYS?/i)?.[1])
      .filter(Boolean)
      .map(Number)

    expect(days.length).toBeGreaterThan(3)
    for (let i = 1; i < days.length; i += 1) {
      expect(days[i]).toBeLessThanOrEqual(days[i - 1])
    }
  })

  it('flow lays the catalog out as a uniform, repeating board', () => {
    // Founder 2026-08-16: "same sixe and aspect ration (croping no skewing or
    // stretching)… needs to overflow and repeat, and titles need to show."
    // Uniform tiles, so there is no packing to test — what matters is that
    // every series appears, the board repeats, and every tile is named.
    const { container } = render(<SeriesBrowser />)
    openView('Flow')
    const tiles = container.querySelectorAll('.flow-tile')
    expect(container.querySelector('.flow-frame')).not.toBeNull()

    // Repeats: more tiles than series, and an exact multiple of them.
    const hrefs = Array.from(tiles).map((t) => t.getAttribute('href'))
    const unique = new Set(hrefs)
    expect(tiles.length).toBeGreaterThan(unique.size)
    expect(tiles.length % unique.size).toBe(0)

    // Every tile carries its title — not a hover-only label.
    tiles.forEach((tile) => {
      expect(tile.querySelector('.flow-title')?.textContent).toBeTruthy()
    })

    // No tile carries inline sizing: they are uniform by CSS, so a stray
    // width/height here would mean something reintroduced per-tile shapes.
    tiles.forEach((tile) => {
      const el = tile as HTMLElement
      expect(el.style.gridColumn).toBe('')
      expect(el.style.gridRow).toBe('')
    })

    expect(missingFromStage(container)).toEqual([])
  })

  it('the front page leads with the headline, byline last', () => {
    const { container } = render(<SeriesBrowser />)
    openView('Feature')
    const lead = container.querySelector('.fp-lead') as HTMLElement
    const order = Array.from(lead.children).map((c) => c.className)
    // Plate, headline, standfirst, byline — a front page's own order, and the
    // byline is never the loudest thing on the story.
    expect(order[0]).toContain('fp-lead-plate')
    expect(order[1]).toContain('fp-lead-head')
    expect(order[order.length - 1]).toContain('fp-byline')
  })

  it('the front page allocates space by importance', () => {
    const { container } = render(<SeriesBrowser />)
    openView('Feature')
    expect(container.querySelectorAll('.fp-lead')).toHaveLength(1)
    expect(container.querySelectorAll('.fp-story')).toHaveLength(2)
    expect(container.querySelectorAll('.fp-brief').length).toBeGreaterThan(0)
  })

  it('below the fold the front page becomes sectioned desks', () => {
    const { container } = render(<SeriesBrowser />)
    openView('Feature')
    const desks = container.querySelectorAll('.fp-desk')
    expect(desks.length).toBeGreaterThan(1)
    // Every desk is named and leads with a wide story.
    desks.forEach((desk) => {
      expect(desk.querySelector('.fp-desk-name')?.textContent).toBeTruthy()
      expect(desk.querySelector('.fp-desk-lede')).not.toBeNull()
    })
  })

  it('every entry below the fold carries a plate', () => {
    // Founder 2026-08-16: "please bring images into the feature toggle state
    // for all devotionals." A desk entry without an image is the bug.
    const { container } = render(<SeriesBrowser />)
    openView('Feature')
    const items = container.querySelectorAll('.fp-desk-item')
    expect(items.length).toBeGreaterThan(0)
    items.forEach((item) => {
      expect(item.querySelector('.fp-desk-item-plate img')).not.toBeNull()
    })
    container.querySelectorAll('.fp-desk-lede').forEach((lede) => {
      expect(lede.querySelector('.fp-desk-lede-plate img')).not.toBeNull()
    })
  })

  it('no series is dropped when the catalog is sectioned', () => {
    // sectionsFor sweeps anything unclassified into a final desk rather than
    // silently omitting it — a browse surface that loses a reading is worse
    // than one with an imperfect heading. Compare the set of destinations the
    // front page offers against the set the plain list offers.
    const hrefsIn = (root: HTMLElement) =>
      new Set(
        Array.from(root.querySelectorAll('a[href^="/series/"]')).map((a) =>
          a.getAttribute('href'),
        ),
      )

    const feature = render(<SeriesBrowser />)
    openView('Feature')
    const featureHrefs = hrefsIn(feature.container)
    feature.unmount()

    const list = render(<SeriesBrowser />)
    openView('List')
    const listHrefs = hrefsIn(list.container)

    expect(featureHrefs.size).toBeGreaterThan(0)
    expect([...listHrefs].filter((h) => !featureHrefs.has(h))).toEqual([])
  })

  it('the shelf centres its books between a matched pair of bookends', () => {
    const { container } = render(<SeriesBrowser />)
    openView('Spines')
    container.querySelectorAll('.shelf-row').forEach((row) => {
      expect(row.querySelectorAll('.shelf-bookend')).toHaveLength(2)
      expect(row.querySelector('.shelf-bookend--left')).not.toBeNull()
      expect(row.querySelector('.shelf-bookend--right')).not.toBeNull()
    })
  })

  it('spines wrap into shelves rather than scrolling sideways', () => {
    const { container } = render(<SeriesBrowser />)
    openView('Spines')
    const units = container.querySelectorAll('.shelf-unit')
    expect(units.length).toBeGreaterThan(1)
    expect(container.querySelectorAll('.shelf-board').length).toBe(units.length)
    expect(container.querySelectorAll('.spine')).toHaveLength(
      ALL_SERIES_ORDER.length,
    )
  })

  it('the rack puts four papers on a rail', () => {
    const { container } = render(<SeriesBrowser />)
    openView('Rack')
    const rails = container.querySelectorAll('.rack-rail')
    const papers = container.querySelectorAll('.rack-paper')
    expect(papers).toHaveLength(ALL_SERIES_ORDER.length)
    expect(rails.length).toBe(Math.ceil(ALL_SERIES_ORDER.length / 4))
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

  it('numbers issues by release order, newest first', () => {
    const { container } = render(<SeriesBrowser />)
    openView('Issues')
    const nums = Array.from(container.querySelectorAll('.issue-no')).map((n) =>
      Number((n.textContent ?? '').replace(/\D/g, '')),
    )
    expect(nums).toHaveLength(ALL_SERIES_ORDER.length)
    // Descending: the newest issue carries the highest number and leads.
    expect(nums[0]).toBeGreaterThan(nums[nums.length - 1])
  })

  it('sorting reorders without dropping anything', () => {
    const { container } = render(<SeriesBrowser />)
    openView('List')
    const titles = () =>
      Array.from(container.querySelectorAll('.stock-title')).map(
        (n) => n.textContent ?? '',
      )

    const az = titles()
    expect(screen.queryByRole('button', { name: 'Pathway' })).toBeNull()
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
    expect(screen.getByRole('tab', { name: 'Covers' })).toBeInTheDocument()
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
