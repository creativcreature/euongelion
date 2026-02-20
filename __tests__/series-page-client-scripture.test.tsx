import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SeriesPageClient from '@/app/wake-up/series/[slug]/SeriesPageClient'

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

vi.mock('@/hooks/useProgress', () => ({
  useProgress: () => ({
    isRead: () => false,
    getSeriesProgress: () => ({ completed: 0, total: 2, percentage: 0 }),
    canRead: () => ({ canRead: true }),
  }),
}))

describe('SeriesPageClient scripture-first day cards', () => {
  it('renders scripture reference + snippet on day cards with fallback support', () => {
    render(
      <SeriesPageClient
        slug="identity"
        series={{
          title: 'Identity Crisis',
          question: 'Who are you when everything shakes?',
          introduction: 'Intro',
          context: 'Context',
          framework:
            'John 14:27 - Peace I give you, not as the world gives to you.',
          pathway: 'Awake',
          keywords: ['identity'],
          days: [
            { day: 1, title: 'Day 1', slug: 'identity-day-1' },
            { day: 2, title: 'Day 2', slug: 'identity-day-2' },
          ],
        }}
        dayScriptureByDayNumber={{
          1: {
            reference: 'Matthew 6:33',
            snippet:
              'Seek first the kingdom of God and his righteousness, and all these things will be added.',
          },
        }}
      />,
    )

    expect(screen.getByText('Matthew 6:33')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Seek first the kingdom of God and his righteousness, and all these things will be added.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Scripture')).toBeInTheDocument()
  })
})
