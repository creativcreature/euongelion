import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import RetiredSavedPage from '@/app/saved/page'
import RetiredClippingsPage from '@/app/clippings/page'
import DevotionalLibraryRail from '@/components/DevotionalLibraryRail'

/**
 * F-068 (Mobbin polish audit 2026-07-10, P1 #12): /library is the ONE
 * library. The standalone /saved and /clippings pages are retired to server
 * redirects into their tabs, and the rail's BOOKMARKS tab carries the
 * silo-correct routing the old /saved page shipped (P0 #6):
 *   - `plan-<uuid>-day-<n>`  → /daily-bread (canonical plan reader)
 *   - anything else          → /devotional/<slug> (canonical devotional
 *     surface; /wake-up/devotional cross-canonicals to it)
 */

vi.mock('@/stores/progressStore', () => ({
  useProgressStore: (
    selector: (state: { completions: unknown[] }) => unknown,
  ) => selector({ completions: [] }),
}))
vi.mock('@/components/LibraryView', () => ({
  default: () => <div data-testid="series-panel" />,
}))
vi.mock('@/components/ClippingsList', () => ({
  default: () => <div data-testid="clippings-panel" />,
}))
vi.mock('@/stores/devotionalLibraryStore', () => ({
  useDevotionalLibraryStore: (
    selector: (state: {
      active: null
      saved: unknown[]
      archived: unknown[]
      hydrate: () => Promise<void>
    }) => unknown,
  ) =>
    selector({
      active: null,
      saved: [],
      archived: [],
      hydrate: async () => {},
    }),
}))

function expectRedirect(page: () => unknown, target: string) {
  let thrown: unknown = null
  try {
    page()
  } catch (error) {
    thrown = error
  }

  expect(thrown).toBeTruthy()
  expect(isRedirectError(thrown)).toBe(true)
  const digest = (thrown as { digest: string }).digest
  // Digest format: NEXT_REDIRECT;<type>;<url>;<status>;
  expect(digest).toContain('NEXT_REDIRECT')
  expect(digest).toContain(`;${target};`)
}

describe('retired library pages (F-068)', () => {
  it('redirects /saved to the library BOOKMARKS tab', () => {
    expectRedirect(RetiredSavedPage, '/library?tab=bookmarks')
  })

  it('redirects /clippings to the library CLIPPINGS tab', () => {
    expectRedirect(RetiredClippingsPage, '/library?tab=clippings')
  })
})

function mockJsonResponse(payload: unknown) {
  return {
    ok: true,
    json: async () => payload,
  } as Response
}

function stubLibraryFetch(
  bookmarks: Array<{
    id: string
    devotional_slug: string
    note: string | null
    created_at: string
  }>,
) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/daily-bread/active-days')) {
        return mockJsonResponse({ ok: true, hasPlan: false, days: [] })
      }
      if (url.includes('/api/bookmarks')) return mockJsonResponse({ bookmarks })
      if (url.includes('/api/annotations'))
        return mockJsonResponse({ annotations: [] })
      if (url.includes('/api/soul-audit/manage'))
        return mockJsonResponse({ archive: [] })
      return mockJsonResponse({})
    }),
  )
}

describe('library BOOKMARKS tab routing (consolidated /saved)', () => {
  beforeEach(() => {
    const storage = new Map<string, string>()
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value)
        },
        removeItem: (key: string) => {
          storage.delete(key)
        },
      },
    })
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('routes devotional bookmarks to the canonical /devotional silo', async () => {
    // A REAL catalog slug. This fixture used to be `identity-day-1`, which does
    // not exist in SERIES_DATA or on disk — so the test was asserting that a
    // fictional reading produced a working link, which is precisely the bug the
    // founder reported ("Says page not found"). The routing contract is still
    // what is under test; only the fixture was fiction.
    stubLibraryFetch([
      {
        id: 'b1',
        devotional_slug: 'he-cannot-deny-himself-day-1',
        note: 'Who Told You?',
        created_at: '2026-07-01T00:00:00.000Z',
      },
    ])

    render(<DevotionalLibraryRail initialTab="bookmarks" />)

    // The note renders as the row's sublabel; the link text is the catalog
    // title, so resolve the link through the row container instead.
    await waitFor(() => {
      expect(screen.getByText('Who Told You?')).toBeTruthy()
    })

    const link = screen
      .getByText('Who Told You?')
      .closest('div')
      ?.querySelector('a')
    expect(link?.getAttribute('href')).toBe(
      '/devotional/he-cannot-deny-himself-day-1',
    )
  })

  it('does NOT link a bookmark whose reading is no longer published', async () => {
    // The reported defect. A slug recorded before a catalog rewrite must be
    // shown as text, not as a link that 404s on click.
    stubLibraryFetch([
      {
        id: 'b2',
        devotional_slug: 'identity-day-1',
        note: 'A reading that no longer exists',
        created_at: '2026-07-01T00:00:00.000Z',
      },
    ])

    render(<DevotionalLibraryRail initialTab="bookmarks" />)

    await waitFor(() => {
      expect(screen.getByText('A reading that no longer exists')).toBeTruthy()
    })

    const row = screen
      .getByText('A reading that no longer exists')
      .closest('div')
    expect(row?.querySelector('a')).toBeNull()
    expect(row?.textContent).toMatch(/no longer published/i)
  })

  it('routes Soul-Audit plan-day bookmarks to /today', async () => {
    stubLibraryFetch([
      {
        id: 'b2',
        devotional_slug: 'plan-1f0e9d8c-7b6a-4f3e-9d2c-1b0a9f8e7d6c-day-3',
        note: 'Rest for the Weary',
        created_at: '2026-07-02T00:00:00.000Z',
      },
    ])

    render(<DevotionalLibraryRail initialTab="bookmarks" />)

    await waitFor(() => {
      expect(screen.getByText('Plan Day 3')).toBeTruthy()
    })

    const link = screen.getByText('Plan Day 3').closest('a')
    expect(link?.getAttribute('href')).toBe('/today')
  })

  it('falls back to a readable plan label when the bookmark has no note', async () => {
    stubLibraryFetch([
      {
        id: 'b3',
        devotional_slug: 'plan-1f0e9d8c-7b6a-4f3e-9d2c-1b0a9f8e7d6c-day-2',
        note: null,
        created_at: '2026-07-03T00:00:00.000Z',
      },
    ])

    render(<DevotionalLibraryRail initialTab="bookmarks" />)

    await waitFor(() => {
      expect(screen.getByText('Plan Day 2')).toBeTruthy()
    })
    // Without a note, the sublabel falls back to the series-level label.
    expect(screen.getByText('Soul Audit Plan')).toBeTruthy()
  })
})
