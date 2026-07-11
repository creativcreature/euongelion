/**
 * D-18 (F-074) — designed empty states across the Library rail
 * (Pinterest/Skyscanner/OpenTable model: one illustration OR strong
 * typographic treatment + one quiet sentence + one contextual CTA).
 *
 * Asserts, per tab with all data empty:
 *  - TODAY: typographic — sentence + BEGIN THE SOUL AUDIT → /soul-audit
 *  - HIGHLIGHTS / NOTES / CHAT HISTORY: riso illustration + sentence + CTA
 *  - ARCHIVE / TRASH: utility surfaces stay text-first, one quiet sentence
 *  - brand voice: no exclamation marks anywhere in an empty panel
 */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DevotionalLibraryRail from '@/components/DevotionalLibraryRail'

vi.mock('@/stores/progressStore', () => ({
  useProgressStore: (
    selector: (state: { completions: unknown[] }) => unknown,
  ) => selector({ completions: [] }),
}))

// SERIES embeds LibraryView and CLIPPINGS embeds ClippingsList — both own
// their data and have their own coverage; this file tests the rail's panels.
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

async function renderEmptyRail(initialTab: string) {
  const view = render(<DevotionalLibraryRail initialTab={initialTab} />)
  // Wait for the rail's API fetch to settle (loading line disappears).
  await screen.findByRole('tablist')
  return view
}

function activePanel(): HTMLElement {
  const panel = document.querySelector<HTMLElement>('[role="tabpanel"]')
  if (!panel) throw new Error('tabpanel not rendered')
  return panel
}

describe('Library rail — designed empty states (D-18 / F-074)', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    window.localStorage.clear()
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

  it('TODAY empty: one sentence + BEGIN THE SOUL AUDIT CTA to /soul-audit', async () => {
    await renderEmptyRail('today')
    const cta = await screen.findByRole('link', {
      name: /begin the soul audit/i,
    })
    expect(cta).toHaveAttribute('href', '/soul-audit')
    expect(activePanel().textContent).toContain(
      'No plan is walking with you yet',
    )
  })

  it('HIGHLIGHTS empty: oil-lamp illustration + sentence + CTA to /today', async () => {
    await renderEmptyRail('highlights')
    const cta = await screen.findByRole('link', {
      name: /read today’s edition/i,
    })
    expect(cta).toHaveAttribute('href', '/today')
    expect(activePanel().textContent).toContain('No lines marked yet')
    const img = activePanel().querySelector('img')
    expect(img?.getAttribute('src')).toContain('empty-highlights')
  })

  it('NOTES empty: blank-scroll illustration + sentence + CTA to /today', async () => {
    await renderEmptyRail('notes')
    const cta = await screen.findByRole('link', {
      name: /read today’s edition/i,
    })
    expect(cta).toHaveAttribute('href', '/today')
    expect(activePanel().textContent).toContain('No notes yet')
    const img = activePanel().querySelector('img')
    expect(img?.getAttribute('src')).toContain('empty-notes')
  })

  it('CHAT HISTORY empty: well-conversation illustration + sentence + CTA', async () => {
    await renderEmptyRail('chat-history')
    const cta = await screen.findByRole('link', {
      name: /read today’s edition/i,
    })
    expect(cta).toHaveAttribute('href', '/today')
    expect(activePanel().textContent).toContain(
      'Nothing kept from the study chat yet',
    )
    const img = activePanel().querySelector('img')
    expect(img?.getAttribute('src')).toContain('empty-chat-history')
  })

  it('BOOKMARKS empty keeps its shipped illustrated treatment', async () => {
    await renderEmptyRail('bookmarks')
    const cta = await screen.findByRole('link', {
      name: /read today’s edition/i,
    })
    expect(cta).toHaveAttribute('href', '/today')
    const img = activePanel().querySelector('img')
    expect(img?.getAttribute('src')).toContain('empty-bookmarks')
  })

  it('ARCHIVE empty: text-first — one quiet sentence per section', async () => {
    await renderEmptyRail('archive')
    const panelText = activePanel().textContent ?? ''
    expect(panelText).toContain('No past plans yet')
    expect(panelText).toContain('No pages finished yet')
    expect(panelText).toContain('Nothing set aside yet')
  })

  it('TRASH empty: text-first — one quiet sentence naming real behavior', async () => {
    await renderEmptyRail('trash')
    expect(activePanel().textContent).toContain('The trash is empty')
    expect(activePanel().textContent).toContain('restored')
  })

  it('brand voice: no exclamation marks in any empty panel', async () => {
    const user = userEvent.setup()
    await renderEmptyRail('today')
    for (const tab of [
      'Today + 7 Days',
      'Bookmarks',
      'Highlights',
      'Notes',
      'Chat History',
      'Archive',
      'Trash',
    ]) {
      const escaped = tab.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      await user.click(
        screen.getByRole('tab', { name: new RegExp(`^${escaped}`, 'i') }),
      )
      expect(activePanel().textContent).not.toMatch(/!/)
    }
  })
})
