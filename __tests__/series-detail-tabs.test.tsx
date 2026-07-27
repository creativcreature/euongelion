/**
 * F-074 — series detail tabs (DAYS · ABOUT · VOICES · ARTWORK).
 *
 * Contract under test:
 * 1. Tabs render adaptively — VOICES/ARTWORK only when data exists.
 * 2. DAYS is the default tab; the day list (and its gating display)
 *    is unchanged from the pre-tab page.
 * 3. ?tab= deep links select the matching tab; unknown/unavailable
 *    values stay on DAYS.
 * 4. Tablist is keyboard-operable (arrow keys, roving tabindex) with
 *    correct aria-selected wiring.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SeriesPageClient from '@/app/series/[slug]/SeriesPageClient'
import type { SeriesInfo } from '@/data/series'
import type { SeriesArtworkItem, SeriesVoice } from '@/lib/series-detail-tabs'

// SeriesActions hydrates the devotional-library store on mount, which fetches
// '/api/devotionals/active'. Stub fetch so the hydrate resolves benignly.
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

// Mutable search params so each test can simulate a ?tab= deep link.
let mockSearchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => mockSearchParams,
}))

vi.mock('@/components/EuangelionShellHeader', () => ({
  default: () => <div data-testid="shell-header" />,
}))

vi.mock('@/components/Breadcrumbs', () => ({
  default: () => <div data-testid="breadcrumbs" />,
}))

vi.mock('@/components/ShareButton', () => ({
  default: () => <button type="button">Share</button>,
}))

vi.mock('@/components/SiteFooter', () => ({
  default: () => <footer data-testid="site-footer" />,
}))

// Day 2 locked — lets the suite assert gating display inside the tab.
vi.mock('@/hooks/useProgress', () => ({
  useProgress: () => ({
    isRead: () => false,
    getSeriesProgress: () => ({ completed: 0, total: 2, percentage: 0 }),
    canRead: (slug: string) =>
      slug === 'identity-day-2'
        ? { canRead: false, message: 'Come back tomorrow.' }
        : { canRead: true },
  }),
}))

const series: SeriesInfo = {
  title: 'Identity Crisis',
  question: 'Who are you when everything shakes?',
  introduction: 'An introduction to the series.',
  context: 'The cultural context paragraph.',
  framework: 'Matthew 6:33 - Seek first the kingdom of God.',
  pathway: 'Awake',
  keywords: ['identity'],
  days: [
    { day: 1, title: 'Day One Title', slug: 'identity-day-1' },
    { day: 2, title: 'Day Two Title', slug: 'identity-day-2' },
  ],
}

const voices: SeriesVoice[] = [
  {
    name: 'Corrie ten Boom',
    title: 'The Watchmaker Who Hid Jews',
    description: 'A watchmaker who sheltered the hunted.',
    keyQuote: 'There is no pit so deep.',
    days: [2],
  },
]

const artwork: SeriesArtworkItem[] = [
  {
    slug: 'sym-anchor-hope-linocut',
    src: '/images/site/devotional/sym-anchor-hope-linocut.webp',
    title: 'Sym Anchor Hope Linocut',
    days: [1],
  },
]

function renderPage(
  overrides: Partial<Parameters<typeof SeriesPageClient>[0]> = {},
) {
  return render(
    <SeriesPageClient
      slug="identity"
      series={series}
      dayScriptureByDayNumber={{
        1: { reference: 'Matthew 6:33', snippet: 'Seek first the kingdom.' },
      }}
      voices={voices}
      artwork={artwork}
      {...overrides}
    />,
  )
}

describe('series detail tabs (F-074)', () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams()
  })
  afterEach(() => {
    cleanup()
  })

  it('renders all four tabs when voices + artwork data exist', () => {
    renderPage()
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((t) => t.id)).toEqual([
      'series-tab-days',
      'series-tab-about',
      'series-tab-voices',
      'series-tab-artwork',
    ])
  })

  it('omits VOICES and ARTWORK tabs when a series has no such data', () => {
    renderPage({ voices: [], artwork: [] })
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((t) => t.id)).toEqual([
      'series-tab-days',
      'series-tab-about',
    ])
    expect(screen.queryByText('VOICES')).not.toBeInTheDocument()
    expect(screen.queryByText('ARTWORK')).not.toBeInTheDocument()
  })

  it('defaults to DAYS with the day list visible and gating display intact', () => {
    renderPage()
    const daysTab = screen.getByRole('tab', { name: /DAYS/ })
    expect(daysTab).toHaveAttribute('aria-selected', 'true')

    const daysPanel = document.getElementById('series-tabpanel-days')
    expect(daysPanel).not.toHaveAttribute('hidden')

    // Scripture-first day card content (pre-tab behavior preserved).
    expect(screen.getByText('Matthew 6:33')).toBeInTheDocument()
    expect(screen.getByText('Seek first the kingdom.')).toBeInTheDocument()

    // Day 1 unlocked → link; Day 2 locked → no link, LOCKED status + message.
    expect(screen.getByRole('link', { name: /Day One Title/ })).toHaveAttribute(
      'href',
      '/devotional/identity-day-1',
    )
    expect(
      screen.queryByRole('link', { name: /Day Two Title/ }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('LOCKED')).toBeInTheDocument()
    expect(screen.getByText('Come back tomorrow.')).toBeInTheDocument()
  })

  it('keeps the scripture-lead header above the tabs', () => {
    renderPage()
    const heading = screen.getByRole('heading', {
      name: /Who are you when everything shakes\?/,
    })
    const tablist = screen.getByRole('tablist')
    expect(
      heading.compareDocumentPosition(tablist) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('selects a tab via ?tab= deep link', () => {
    mockSearchParams = new URLSearchParams('tab=voices')
    renderPage()
    expect(screen.getByRole('tab', { name: /VOICES/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(
      document.getElementById('series-tabpanel-voices'),
    ).not.toHaveAttribute('hidden')
    expect(document.getElementById('series-tabpanel-days')).toHaveAttribute(
      'hidden',
    )
    expect(screen.getByText('Corrie ten Boom')).toBeInTheDocument()
    expect(screen.getByText(/There is no pit so deep/)).toBeInTheDocument()
  })

  it('ignores a ?tab= deep link to an unavailable tab', () => {
    mockSearchParams = new URLSearchParams('tab=voices')
    renderPage({ voices: [] })
    expect(screen.getByRole('tab', { name: /DAYS/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(document.getElementById('series-tabpanel-days')).not.toHaveAttribute(
      'hidden',
    )
  })

  it('switches panels on click and shows ABOUT content', () => {
    renderPage()
    fireEvent.click(screen.getByRole('tab', { name: /ABOUT/ }))

    expect(screen.getByRole('tab', { name: /ABOUT/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(
      document.getElementById('series-tabpanel-about'),
    ).not.toHaveAttribute('hidden')
    expect(document.getElementById('series-tabpanel-days')).toHaveAttribute(
      'hidden',
    )
    expect(
      screen.getByText('An introduction to the series.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('The cultural context paragraph.'),
    ).toBeInTheDocument()
    expect(screen.getByText('SCRIPTURE ANCHOR')).toBeInTheDocument()
  })

  it('mounts ARTWORK images only after the tab is activated', () => {
    renderPage()
    expect(screen.queryByAltText('Sym Anchor Hope Linocut')).toBeNull()

    fireEvent.click(screen.getByRole('tab', { name: /ARTWORK/ }))
    expect(screen.getByAltText('Sym Anchor Hope Linocut')).toBeInTheDocument()
    expect(
      document.getElementById('series-tabpanel-artwork'),
    ).not.toHaveAttribute('hidden')
  })

  it('moves selection with arrow keys (roving tabindex)', () => {
    renderPage()
    const daysTab = screen.getByRole('tab', { name: /DAYS/ })

    fireEvent.keyDown(daysTab, { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: /ABOUT/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: /ABOUT/ })).toHaveAttribute(
      'tabindex',
      '0',
    )
    expect(daysTab).toHaveAttribute('tabindex', '-1')

    // Wraps from first back to last.
    fireEvent.keyDown(screen.getByRole('tab', { name: /ABOUT/ }), {
      key: 'End',
    })
    expect(screen.getByRole('tab', { name: /ARTWORK/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })
})
