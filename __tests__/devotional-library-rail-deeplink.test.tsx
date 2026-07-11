import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DevotionalLibraryRail, {
  normalizeLibraryTab,
} from '@/components/DevotionalLibraryRail'

vi.mock('@/stores/progressStore', () => ({
  useProgressStore: (
    selector: (state: { completions: unknown[] }) => unknown,
  ) => selector({ completions: [] }),
}))

// The SERIES tab embeds LibraryView (own store actions, router, modals) and
// the CLIPPINGS tab embeds ClippingsList (device IndexedDB). Both own their
// data and have dedicated coverage; the rail tests focus on tab IA.
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

function mockJsonResponse(payload: unknown) {
  return {
    ok: true,
    json: async () => payload,
  } as Response
}

describe('DevotionalLibraryRail deep-link + keyboard IA (F-030 / F-068)', () => {
  afterEach(() => {
    cleanup()
  })

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
          return mockJsonResponse({ ok: true, hasPlan: false, days: [] })
        }
        if (url.includes('/api/bookmarks'))
          return mockJsonResponse({ bookmarks: [] })
        if (url.includes('/api/annotations'))
          return mockJsonResponse({ annotations: [] })
        if (url.includes('/api/soul-audit/manage'))
          return mockJsonResponse({ archive: [] })
        return mockJsonResponse({})
      }),
    )
  })

  it('normalizes deep-link tab params, including favorites/saved aliases', () => {
    expect(normalizeLibraryTab('series')).toBe('series')
    expect(normalizeLibraryTab('today')).toBe('today')
    expect(normalizeLibraryTab('bookmarks')).toBe('bookmarks')
    expect(normalizeLibraryTab('notes')).toBe('notes')
    expect(normalizeLibraryTab('clippings')).toBe('clippings')
    expect(normalizeLibraryTab('favorites')).toBe('highlights')
    expect(normalizeLibraryTab('favorite-verses')).toBe('highlights')
    expect(normalizeLibraryTab('saved')).toBe('bookmarks')
    expect(normalizeLibraryTab('chat-notes')).toBe('chat-history')
    // F-068: series lifecycle is the library home tab.
    expect(normalizeLibraryTab(null)).toBe('series')
    expect(normalizeLibraryTab('garbage')).toBe('series')
  })

  it('opens to the deep-linked initialTab', async () => {
    render(<DevotionalLibraryRail initialTab="notes" />)
    const notesTab = await screen.findByRole('tab', { name: /^Notes/i })
    expect(notesTab).toHaveAttribute('aria-selected', 'true')
  })

  it('opens the consolidated clippings tab from a deep link', async () => {
    render(<DevotionalLibraryRail initialTab="clippings" />)
    const clippingsTab = await screen.findByRole('tab', {
      name: /^Clippings/i,
    })
    expect(clippingsTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('clippings-panel')).toBeInTheDocument()
  })

  it('notifies the parent (URL sync) when a tab is activated', async () => {
    const user = userEvent.setup()
    const onTabChange = vi.fn()
    render(<DevotionalLibraryRail onTabChange={onTabChange} />)
    await user.click(await screen.findByRole('tab', { name: /Highlights/i }))
    expect(onTabChange).toHaveBeenCalledWith('highlights')
  })

  it('supports roving-tabindex keyboard navigation across tabs', async () => {
    const user = userEvent.setup()
    const onTabChange = vi.fn()
    render(<DevotionalLibraryRail onTabChange={onTabChange} />)

    const seriesTab = await screen.findByRole('tab', { name: /^Series/i })
    // Default tab is in the tab order; the rest are removed from it.
    expect(seriesTab).toHaveAttribute('tabindex', '0')

    seriesTab.focus()
    await user.keyboard('{ArrowDown}')
    expect(onTabChange).toHaveBeenLastCalledWith('today')

    await user.keyboard('{End}')
    expect(onTabChange).toHaveBeenLastCalledWith('trash')

    await user.keyboard('{Home}')
    expect(onTabChange).toHaveBeenLastCalledWith('series')
  })

  it('exposes a mobile drawer trigger that toggles the section list', async () => {
    const user = userEvent.setup()
    const { container } = render(<DevotionalLibraryRail />)
    await screen.findByRole('tablist')
    const trigger = container.querySelector<HTMLButtonElement>(
      'button[aria-controls="library-section-tablist"]',
    )
    expect(trigger).not.toBeNull()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await user.click(trigger!)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })
})
