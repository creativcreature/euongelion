/**
 * F-090 — the series library.
 *
 * Contract under test:
 * 1. LIBRARY shows the WHOLE catalog. This is the founder's actual complaint
 *    ("series are hiding"), so it is asserted against ALL_SERIES_ORDER rather
 *    than a sample — a series added to the data must appear without anyone
 *    remembering to add it to a rail.
 * 2. All three views render and switch.
 * 3. Sorting reorders and stays exhaustive.
 * 4. Search takes over, matches on phrasing, and finds DEVOTIONALS, not just
 *    series.
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SeriesBrowser from '@/components/series/SeriesBrowser'
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

afterEach(cleanup)

const switchTo = (label: string) =>
  fireEvent.click(screen.getByRole('tab', { name: label }))

describe('SeriesBrowser', () => {
  it('defaults to the Feature view with the newest series leading', () => {
    render(<SeriesBrowser />)
    expect(screen.getByRole('tab', { name: 'Feature' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    // The lead tile is labelled "Newest".
    expect(screen.getByText(/^Newest ·/)).toBeInTheDocument()
  })

  it('never leads with a commissioned series, but still lists it', () => {
    render(<SeriesBrowser />)
    const leadTitle = screen
      .getByText(/^Newest ·/)
      .parentElement?.querySelector('.series-bento-title')?.textContent
    expect(leadTitle).not.toBe(SERIES_DATA['looking-at-the-sun'].title)

    // It must still be reachable — the exception is about the hero slot only.
    switchTo('Library')
    expect(
      screen.queryAllByText(SERIES_DATA['looking-at-the-sun'].title).length,
    ).toBeGreaterThan(0)
  })

  it('LIBRARY renders every series in the catalog — nothing hides', () => {
    render(<SeriesBrowser />)
    switchTo('Library')

    const missing = ALL_SERIES_ORDER.filter((slug) => {
      const title = SERIES_DATA[slug]?.title
      return title ? screen.queryAllByText(title).length === 0 : false
    })
    expect(missing).toEqual([])
  })

  it('prints the catalog count so a gap is visible', () => {
    render(<SeriesBrowser />)
    expect(
      screen.getByText(String(ALL_SERIES_ORDER.length)),
    ).toBeInTheDocument()
  })

  it('LIST renders every series too', () => {
    render(<SeriesBrowser />)
    switchTo('List')
    const rows = screen.getAllByRole('listitem')
    expect(rows.length).toBe(ALL_SERIES_ORDER.length)
  })

  it('sorting reorders without dropping anything', () => {
    render(<SeriesBrowser />)
    switchTo('List')

    const titlesNow = () =>
      screen.getAllByRole('listitem').map((li) => li.textContent ?? '')

    const az = titlesNow()
    fireEvent.click(screen.getByRole('button', { name: 'Z–A' }))
    const za = titlesNow()

    expect(za.length).toBe(az.length)
    expect(za[0]).not.toBe(az[0])
    expect([...za].reverse()[0]).toBe(az[0])
  })

  it('search takes over the view and matches on phrasing', () => {
    render(<SeriesBrowser />)
    const input = screen.getByRole('searchbox', {
      name: /search the library by phrase/i,
    })

    fireEvent.change(input, { target: { value: 'I feel anxious about money' } })

    // The browse controls are replaced by results.
    expect(screen.queryByRole('tab', { name: 'Library' })).toBeNull()
    expect(screen.getByText(/^Devotionals ·/)).toBeInTheDocument()
  })

  it('search surfaces individual devotionals, not only series', () => {
    render(<SeriesBrowser />)
    fireEvent.change(
      screen.getByRole('searchbox', { name: /search the library by phrase/i }),
      { target: { value: 'who am i' } },
    )

    const heading = screen.getByText(/^Devotionals ·/)
    const count = Number(heading.textContent?.split('·')[1]?.trim() ?? '0')
    expect(count).toBeGreaterThan(0)
  })

  it('reports an honest empty state rather than silently showing nothing', () => {
    render(<SeriesBrowser />)
    fireEvent.change(
      screen.getByRole('searchbox', { name: /search the library by phrase/i }),
      { target: { value: 'zzzqqq unmatchable xyzzy' } },
    )
    expect(screen.getByText(/Nothing matched/)).toBeInTheDocument()
  })

  it('clearing the search returns to browsing', () => {
    render(<SeriesBrowser />)
    const input = screen.getByRole('searchbox', {
      name: /search the library by phrase/i,
    })
    fireEvent.change(input, { target: { value: 'grace' } })
    expect(screen.queryByRole('tab', { name: 'Feature' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /clear/i }))
    expect(screen.getByRole('tab', { name: 'Feature' })).toBeInTheDocument()
  })

  it('links every library card somewhere real', () => {
    const { container } = render(<SeriesBrowser />)
    switchTo('Library')

    const cards = Array.from(
      container.querySelectorAll('a.series-lib-card'),
    ).map((a) => a.getAttribute('href') ?? '')
    expect(cards.length).toBe(ALL_SERIES_ORDER.length)
    for (const href of cards) {
      expect(href).toMatch(/^\/(series|devotional)\/[a-z0-9-]+$/)
    }
  })

  it('files under the same letter it sorts by, so the rail runs in order', () => {
    const { container } = render(<SeriesBrowser />)
    switchTo('Library')
    const letters = Array.from(
      container.querySelectorAll('.series-alpha-link'),
    ).map((a) => a.textContent ?? '')
    // "The Nature of Belief" files under N; if the sort compared the leading
    // article the rail came out as "… R S N W T V".
    expect([...letters]).toEqual([...letters].sort())
  })

  it('the A–Z rail jumps to a card that exists on the page', () => {
    const { container } = render(<SeriesBrowser />)
    switchTo('Library')

    const rail = Array.from(
      container.querySelectorAll('.series-alpha-link'),
    ).map((a) => a.getAttribute('href') ?? '')
    expect(rail.length).toBeGreaterThan(1)
    for (const href of rail) {
      expect(href).toMatch(/^#shelf-/)
      // Every jump target must resolve — a dead anchor is a broken control.
      expect(container.querySelector(`[id="${href.slice(1)}"]`)).not.toBeNull()
    }
  })
})
