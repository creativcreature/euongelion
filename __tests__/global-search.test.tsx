/**
 * F-071 — Global search (site audit P1 #14).
 *
 * Covers the search library (matching + ranking + href contracts), the
 * overlay component (groups, counts, empty/no-results/loading states,
 * Escape + focus return), and the shell-header entry points (button and
 * Cmd/Ctrl+K).
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay'
import {
  buildNoteItems,
  normalizeSearchText,
  resolveDevotionalHref,
  searchDevotionals,
  searchNotes,
  searchSeries,
} from '@/lib/global-search'

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}))

type FetchHandler = (url: string) => Promise<unknown> | unknown

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  }
}

function stubFetch(overrides: Record<string, FetchHandler> = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      for (const [fragment, handler] of Object.entries(overrides)) {
        if (url.includes(fragment)) return handler(url)
      }
      if (url.includes('/api/auth/session')) {
        return jsonResponse({ authenticated: false, user: null })
      }
      if (url.includes('/api/annotations')) {
        return jsonResponse({ ok: true, annotations: [] })
      }
      if (url.includes('/api/bookmarks')) {
        return jsonResponse({ ok: true, bookmarks: [] })
      }
      if (url.includes('/api/soul-audit/current')) {
        return jsonResponse({ hasCurrent: false })
      }
      return jsonResponse({})
    }),
  )
}

beforeEach(() => {
  const mockResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    value: mockResizeObserver,
  })
  Object.defineProperty(window, 'requestAnimationFrame', {
    writable: true,
    value: (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    },
  })
  Object.defineProperty(window, 'cancelAnimationFrame', {
    writable: true,
    value: () => {},
  })
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query === '(max-width: 900px)',
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
  const store: Record<string, string> = {}
  Object.defineProperty(window, 'localStorage', {
    writable: true,
    value: {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value
      },
      removeItem: (key: string) => {
        delete store[key]
      },
    },
  })
  stubFetch()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  document.body.style.overflow = ''
})

// ---------------------------------------------------------------------------
// Library: matching, ranking, href contracts
// ---------------------------------------------------------------------------

describe('global-search library', () => {
  it('normalizes case, diacritics, curly quotes, and whitespace', () => {
    expect(normalizeSearchText('  Ánxious’   HEART ')).toBe("anxious' heart")
  })

  it('matches series by keyword (peace series carries "anxious")', () => {
    const results = searchSeries('anxious')
    expect(results.some((result) => result.slug === 'peace')).toBe(true)
    for (const result of results) {
      expect(result.href).toBe(`/series/${result.slug}`)
    }
  })

  it('ranks a series title match above keyword-only matches', () => {
    const results = searchSeries('peace')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].slug).toBe('peace')
    expect(results[0].title).toBe('Peace')
  })

  it('matches devotionals by title and links to /devotional/[slug]', () => {
    const results = searchDevotionals('abiding')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].title.toLowerCase()).toContain('abiding')
    for (const result of results) {
      expect(result.href).toBe(`/devotional/${result.slug}`)
    }
  })

  it('ranks devotional title matches above teaser-only matches', () => {
    const results = searchDevotionals('vanity')
    const titleHit = results.findIndex((result) =>
      result.title.toLowerCase().includes('vanity'),
    )
    const teaserOnlyHit = results.findIndex(
      (result) =>
        !result.title.toLowerCase().includes('vanity') &&
        (result.teaser ?? '').toLowerCase().includes('vanity'),
    )
    expect(titleHit).toBeGreaterThanOrEqual(0)
    if (teaserOnlyHit >= 0) {
      expect(titleHit).toBeLessThan(teaserOnlyHit)
    }
  })

  it('requires every query token to match (AND semantics)', () => {
    expect(searchSeries('peace zzxqjvw').length).toBe(0)
  })

  it('ranks note text matches above location-label matches', () => {
    const items = [
      {
        id: 'label-hit',
        kind: 'bookmark' as const,
        text: '',
        label: 'Grace Notes',
        href: '/devotional/x',
      },
      {
        id: 'text-hit',
        kind: 'note' as const,
        text: 'grace upon grace',
        label: 'Elsewhere',
        href: '/devotional/y',
      },
    ]
    const results = searchNotes('grace', items)
    expect(results.map((result) => result.id)).toEqual([
      'text-hit',
      'label-hit',
    ])
  })

  it('routes plan-day slugs to /daily-bread and catalog slugs to the reader', () => {
    expect(resolveDevotionalHref('plan-0a1b-2c3d-day-3')).toBe('/daily-bread')
    expect(resolveDevotionalHref('peace-day-1')).toBe('/devotional/peace-day-1')
  })

  it('builds note items from annotations, bookmarks, and clippings', () => {
    const items = buildNoteItems({
      annotations: [
        {
          id: 'a1',
          devotional_slug: 'peace-day-2',
          annotation_type: 'note',
          anchor_text: null,
          body: 'stop trying to control everything',
        },
      ],
      bookmarks: [{ id: 'b1', devotional_slug: 'peace-day-1', note: null }],
      clippings: [
        {
          id: 'c1',
          text: 'Peace I leave with you',
          sourceTitle: 'Peace — Day 3',
          sourceSlug: 'peace-day-3',
          createdAt: 1,
        },
      ],
    })
    expect(items).toHaveLength(3)
    expect(items[0]).toMatchObject({
      kind: 'note',
      text: 'stop trying to control everything',
      href: '/devotional/peace-day-2',
    })
    expect(items[1]).toMatchObject({
      kind: 'bookmark',
      href: '/devotional/peace-day-1',
    })
    // A bookmark without a note still carries the day title so a reader
    // can find it by where it lives.
    expect(items[1].label.length).toBeGreaterThan(0)
    expect(items[2]).toMatchObject({
      kind: 'clipping',
      href: '/devotional/peace-day-3',
    })
  })
})

// ---------------------------------------------------------------------------
// Overlay component: states, groups, a11y
// ---------------------------------------------------------------------------

describe('GlobalSearchOverlay', () => {
  it('shows the quiet hint before any query is typed', async () => {
    render(<GlobalSearchOverlay open onClose={() => {}} />)
    expect(
      screen.getByText('Search series, devotionals, your notes.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/SERIES/)).toBeNull()
    await waitFor(() => {
      expect(screen.getByRole('searchbox')).toHaveFocus()
    })
  })

  it('renders grouped results with counts and real links', async () => {
    const user = userEvent.setup()
    render(<GlobalSearchOverlay open onClose={() => {}} />)

    await user.type(screen.getByRole('searchbox'), 'peace')

    const seriesGroup = await screen.findByRole('region', {
      name: /^Series —/,
    })
    expect(seriesGroup).toBeInTheDocument()
    const links = Array.from(
      seriesGroup.querySelectorAll('a[data-search-result]'),
    )
    expect(
      links.some((link) => link.getAttribute('href') === '/series/peace'),
    ).toBe(true)

    const devotionalGroup = screen.getByRole('region', {
      name: /^Devotionals —/,
    })
    expect(devotionalGroup).toBeInTheDocument()
    expect(
      devotionalGroup.querySelectorAll('a[data-search-result]').length,
    ).toBeGreaterThan(0)

    // Counts render in the group headers.
    expect(seriesGroup.textContent).toMatch(/SERIES\s*·\s*\d+/)
  })

  it('shows the reader notes group with matches from the APIs', async () => {
    stubFetch({
      '/api/annotations': () =>
        jsonResponse({
          ok: true,
          annotations: [
            {
              id: 'a1',
              devotional_slug: 'peace-day-2',
              annotation_type: 'note',
              anchor_text: null,
              body: 'God is teaching me to loosen my grip',
            },
          ],
        }),
      '/api/bookmarks': () => jsonResponse({ ok: true, bookmarks: [] }),
    })
    const user = userEvent.setup()
    render(<GlobalSearchOverlay open onClose={() => {}} />)

    await user.type(screen.getByRole('searchbox'), 'loosen my grip')

    const notesGroup = await screen.findByRole('region', {
      name: /^Your notes —/,
    })
    expect(notesGroup.textContent).toContain(
      'God is teaching me to loosen my grip',
    )
    const noteLink = notesGroup.querySelector('a[data-search-result]')
    expect(noteLink?.getAttribute('href')).toBe('/devotional/peace-day-2')
  })

  it('shows a loading state while the notes fetch is in flight', async () => {
    let resolveAnnotations!: (value: unknown) => void
    stubFetch({
      '/api/annotations': () =>
        new Promise((resolve) => {
          resolveAnnotations = resolve
        }),
    })
    const user = userEvent.setup()
    render(<GlobalSearchOverlay open onClose={() => {}} />)

    await user.type(screen.getByRole('searchbox'), 'peace')
    expect(screen.getByText('Loading your notes…')).toBeInTheDocument()

    resolveAnnotations(jsonResponse({ ok: true, annotations: [] }))
    await waitFor(() => {
      expect(screen.queryByText('Loading your notes…')).toBeNull()
    })
  })

  it('surfaces a notes error instead of failing silently', async () => {
    stubFetch({
      '/api/annotations': () => jsonResponse({ error: 'nope' }, 500),
      '/api/bookmarks': () => jsonResponse({ error: 'nope' }, 500),
    })
    const user = userEvent.setup()
    render(<GlobalSearchOverlay open onClose={() => {}} />)

    await user.type(screen.getByRole('searchbox'), 'peace')
    await waitFor(() => {
      expect(
        screen.getByText(/Couldn’t load your notes right now/),
      ).toBeInTheDocument()
    })
  })

  it('shows the designed no-results state with a Soul Audit invitation', async () => {
    const user = userEvent.setup()
    render(<GlobalSearchOverlay open onClose={() => {}} />)

    await user.type(screen.getByRole('searchbox'), 'zzxqjvw')
    await waitFor(() => {
      expect(
        screen.getByText(/Nothing here matched “zzxqjvw”\./),
      ).toBeInTheDocument()
    })
    const invitation = screen.getByRole('link', {
      name: /Tell the Soul Audit one honest sentence/,
    })
    expect(invitation).toHaveAttribute('href', '/soul-audit')
  })

  it('closes on Escape', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<GlobalSearchOverlay open onClose={onClose} />)

    await waitFor(() => {
      expect(screen.getByRole('searchbox')).toHaveFocus()
    })
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('moves through results with arrow keys', async () => {
    const user = userEvent.setup()
    render(<GlobalSearchOverlay open onClose={() => {}} />)

    await user.type(screen.getByRole('searchbox'), 'peace')
    await screen.findByRole('region', { name: /^Series —/ })

    await user.keyboard('{ArrowDown}')
    const active = document.activeElement
    expect(active?.hasAttribute('data-search-result')).toBe(true)
    expect(active?.tagName).toBe('A')

    await user.keyboard('{ArrowUp}')
    expect(screen.getByRole('searchbox')).toHaveFocus()
  })
})

// ---------------------------------------------------------------------------
// Shell header entry points
// ---------------------------------------------------------------------------

describe('EuangelionShellHeader — global search entry points', () => {
  it('opens the overlay from the masthead search button and returns focus on Escape', async () => {
    const user = userEvent.setup()
    render(<EuangelionShellHeader />)

    const triggers = screen.getAllByRole('button', { name: 'Search' })
    // Desktop utilities row + mobile top bar both carry the glyph.
    expect(triggers.length).toBe(2)

    await user.click(triggers[0])
    const dialog = await screen.findByRole('dialog', {
      name: 'Search Euangelion',
    })
    expect(dialog).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('searchbox')).toHaveFocus()
    })

    await user.keyboard('{Escape}')
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: 'Search Euangelion' }),
      ).toBeNull()
    })
    expect(triggers[0]).toHaveFocus()
  })

  it('opens and closes with Cmd/Ctrl+K', async () => {
    const user = userEvent.setup()
    render(<EuangelionShellHeader />)

    await user.keyboard('{Meta>}k{/Meta}')
    expect(
      await screen.findByRole('dialog', { name: 'Search Euangelion' }),
    ).toBeInTheDocument()

    await user.keyboard('{Meta>}k{/Meta}')
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: 'Search Euangelion' }),
      ).toBeNull()
    })
  })
})
