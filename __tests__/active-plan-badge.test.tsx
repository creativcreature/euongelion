import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ActivePlanBadge from '@/components/ActivePlanBadge'
import { invalidateActivePlanCache } from '@/hooks/useActivePlan'

function mockFetchOnce(payload: unknown, status = 200) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(payload),
      } as Response),
    ),
  )
}

describe('ActivePlanBadge', () => {
  beforeEach(() => {
    invalidateActivePlanCache()
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    invalidateActivePlanCache()
  })

  it('renders nothing while loading and when no active plan', async () => {
    mockFetchOnce({ ok: true, hasCurrent: false })
    const { container } = render(<ActivePlanBadge />)
    // Initial render should be empty (loading=true)
    expect(container.firstChild).toBeNull()

    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    })
  })

  it('renders Day N · series title when an active plan exists (header variant)', async () => {
    mockFetchOnce({
      ok: true,
      hasCurrent: true,
      route: '/soul-audit/plan/abc-123?day=3',
      selectionType: 'ai_primary',
      planToken: 'abc-123',
      seriesSlug: 'identity',
      seriesTitle: 'Identity Crisis',
      dayNumber: 3,
    })

    render(<ActivePlanBadge variant="header" />)

    await waitFor(() => {
      expect(screen.getByTestId('active-plan-badge')).toBeTruthy()
    })

    const badge = screen.getByTestId('active-plan-badge')
    expect(badge.getAttribute('href')).toBe('/soul-audit/plan/abc-123?day=3')
    expect(badge.textContent).toContain('DAY 3')
    expect(badge.textContent).toContain('Identity Crisis')
  })

  it('renders the tile variant with continue-reading copy', async () => {
    mockFetchOnce({
      ok: true,
      hasCurrent: true,
      route: '/devotional/sleep-day-1',
      selectionType: 'curated_prefab',
      seriesSlug: 'sleep',
      seriesTitle: 'Too Busy For God',
      dayNumber: 1,
    })

    render(<ActivePlanBadge variant="tile" />)

    await waitFor(() => {
      expect(screen.getByTestId('active-plan-tile')).toBeTruthy()
    })

    const tile = screen.getByTestId('active-plan-tile')
    expect(tile.getAttribute('href')).toBe('/devotional/sleep-day-1')
    expect(tile.textContent).toContain('Too Busy For God')
    expect(tile.textContent).toContain('Continue reading')
  })

  it('falls back to RESUME label when dayNumber missing', async () => {
    mockFetchOnce({
      ok: true,
      hasCurrent: true,
      route: '/series/identity',
      selectionType: 'curated_prefab',
      seriesSlug: 'identity',
      seriesTitle: 'Identity Crisis',
    })

    render(<ActivePlanBadge variant="header" />)

    await waitFor(() => {
      expect(screen.getByTestId('active-plan-badge')).toBeTruthy()
    })

    expect(screen.getByTestId('active-plan-badge').textContent).toContain(
      'RESUME',
    )
  })

  it('renders nothing on fetch failure', async () => {
    mockFetchOnce({}, 500)
    const { container } = render(<ActivePlanBadge />)

    await waitFor(() => {
      // Cache caches the empty result; render stays null.
      expect(container.firstChild).toBeNull()
    })
  })
})
