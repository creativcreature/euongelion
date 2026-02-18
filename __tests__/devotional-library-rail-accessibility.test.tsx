import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DevotionalLibraryRail from '@/components/DevotionalLibraryRail'

vi.mock('@/stores/progressStore', () => ({
  useProgressStore: (
    selector: (state: { completions: unknown[] }) => unknown,
  ) => selector({ completions: [] }),
}))

function mockJsonResponse(payload: unknown) {
  return {
    ok: true,
    json: async () => payload,
  } as Response
}

describe('DevotionalLibraryRail accessibility', () => {
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

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input)

        if (url.includes('/api/daily-bread/active-days')) {
          return mockJsonResponse({
            ok: true,
            hasPlan: true,
            planToken: 'plan-token-1',
            seriesSlug: 'peace',
            days: [
              {
                day: 1,
                title: 'Orientation',
                scriptureReference: 'Psalm 46:10',
                scriptureText: 'Be still, and know that I am God.',
                status: 'current',
                route: '/soul-audit/results?planToken=plan-token-1#plan-day-1',
              },
              {
                day: 2,
                title: 'Trust',
                scriptureReference: 'Proverbs 3:5',
                scriptureText:
                  'Trust in the Lord with all your heart, and lean not on your own understanding.',
                status: 'locked',
                route: '/soul-audit/results?planToken=plan-token-1#plan-day-2',
                lockMessage:
                  "This day isn't ready yet. Your next day unlocks at 7:00 AM local time.",
              },
            ],
          })
        }

        if (url.includes('/api/bookmarks')) {
          return mockJsonResponse({ bookmarks: [] })
        }

        if (url.includes('/api/annotations')) {
          return mockJsonResponse({ annotations: [] })
        }

        if (url.includes('/api/soul-audit/archive')) {
          return mockJsonResponse({ archive: [] })
        }

        return mockJsonResponse({})
      }),
    )
  })

  it('exposes library sections through tab semantics', async () => {
    const user = userEvent.setup()
    render(<DevotionalLibraryRail />)

    const tablist = await screen.findByRole('tablist', {
      name: 'Daily Bread library sections',
    })
    expect(tablist).toBeInTheDocument()

    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(7)
    expect(
      screen.getByRole('tab', { name: /Today \+ 7 Days/i }),
    ).toHaveAttribute('aria-selected', 'true')

    await user.click(screen.getByRole('tab', { name: /Bookmarks/i }))

    expect(screen.getByRole('tab', { name: /Bookmarks/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(
      screen.getByRole('tabpanel', {
        name: /Bookmarks/i,
      }),
    ).toBeInTheDocument()
  })

  it('announces locked-day controls with explicit labels', async () => {
    const user = userEvent.setup()
    render(<DevotionalLibraryRail />)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /View teaser for day 2/i }),
      ).toBeInTheDocument()
    })

    await user.click(
      screen.getByRole('button', { name: /View teaser for day 2/i }),
    )
    expect(
      screen.getByRole('button', { name: /Enable reminder for day 2/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Close locked day teaser/i }),
    ).toBeInTheDocument()
  })
})
