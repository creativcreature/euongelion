import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SavedList from '@/components/SavedList'

/**
 * Mobbin polish audit 2026-07-10, P0 #6: /saved used to hardcode every
 * bookmark href to /wake-up/devotional/<slug>, which mis-routed plan-day
 * bookmarks (no such wake-up page) and pointed devotional bookmarks at the
 * non-canonical silo. Bookmarks carry only devotional_slug, so routing is
 * derived from the slug shape:
 *   - `plan-<uuid>-day-<n>`  → /daily-bread (canonical plan reader; the
 *     dedicated /soul-audit/plan reader is retired)
 *   - anything else          → /devotional/<slug> (canonical devotional
 *     surface; /wake-up/devotional cross-canonicals to it)
 */

function mockBookmarks(
  bookmarks: Array<{
    id: string
    devotional_slug: string
    note: string | null
    created_at: string
  }>,
) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ bookmarks }),
      } as Response),
    ),
  )
}

describe('SavedList bookmark routing', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('routes devotional bookmarks to the canonical /devotional silo', async () => {
    mockBookmarks([
      {
        id: 'b1',
        devotional_slug: 'identity-day-1',
        note: 'Who Told You?',
        created_at: '2026-07-01T00:00:00.000Z',
      },
    ])

    render(<SavedList />)

    await waitFor(() => {
      expect(screen.getByText('Who Told You?')).toBeTruthy()
    })

    const link = screen.getByText('Who Told You?').closest('a')
    expect(link?.getAttribute('href')).toBe('/devotional/identity-day-1')
  })

  it('routes Soul-Audit plan-day bookmarks to /daily-bread', async () => {
    mockBookmarks([
      {
        id: 'b2',
        devotional_slug: 'plan-1f0e9d8c-7b6a-4f3e-9d2c-1b0a9f8e7d6c-day-3',
        note: 'Rest for the Weary',
        created_at: '2026-07-02T00:00:00.000Z',
      },
    ])

    render(<SavedList />)

    await waitFor(() => {
      expect(screen.getByText('Rest for the Weary')).toBeTruthy()
    })

    const link = screen.getByText('Rest for the Weary').closest('a')
    expect(link?.getAttribute('href')).toBe('/daily-bread')
  })

  it('falls back to a readable plan-day label when the bookmark has no note', async () => {
    mockBookmarks([
      {
        id: 'b3',
        devotional_slug: 'plan-1f0e9d8c-7b6a-4f3e-9d2c-1b0a9f8e7d6c-day-2',
        note: null,
        created_at: '2026-07-03T00:00:00.000Z',
      },
    ])

    render(<SavedList />)

    await waitFor(() => {
      expect(screen.getByText('Soul Audit Plan — Day 2')).toBeTruthy()
    })
  })
})
