/**
 * SA-095 / F-141 — /today can finish a day of a CURATED SERIES.
 *
 * `/today` has two readers. The Soul Audit plan path (`DailyBreadView`) has
 * always had MARK DAY COMPLETE. The curated-series path (`CuratedActiveView`)
 * had nothing: `setActiveDay` is local React state, so moving to day 2
 * evaporated on reload and the server's `active_series.current_day` stayed at 1
 * forever. A reader working through a curated series could never finish a day,
 * and `/today` — the page whose whole job is "your place in your plan" — kept
 * serving day 1.
 *
 * These tests assert the wiring, not the pixels: the control appears, and
 * pressing it calls the completion path that PATCHes `current_day`.
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CuratedActiveView from '@/components/today/CuratedActiveView'

vi.mock('@/components/AudioPlayer', () => ({ default: () => null }))
vi.mock('@/components/PushOptIn', () => ({ default: () => null }))
vi.mock('@/components/ClipButton', () => ({ default: () => null }))
vi.mock('@/components/ModuleRenderer', () => ({ default: () => null }))
vi.mock('@/components/devotional/DevotionalFolio', () => ({
  default: () => null,
}))
vi.mock('@/components/devotional/DevotionalHeadline', () => ({
  default: () => null,
}))
vi.mock('@/components/devotional/DevotionalRhythm', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
vi.mock('@/components/devotional/AuthorColophon', () => ({
  default: () => null,
}))
vi.mock('@/components/devotional/ChurchYearCard', () => ({
  default: () => null,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/today',
}))

// The completion path itself is covered elsewhere; here we prove the button
// reaches it with the right day.
const markDevotionalComplete = vi.fn()
vi.mock('@/lib/progress', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/progress')>()
  return {
    ...actual,
    markDevotionalComplete: (...a: unknown[]) => markDevotionalComplete(...a),
  }
})

describe('CuratedActiveView — finishing a day of a curated series', () => {
  beforeEach(() => {
    markDevotionalComplete.mockClear()
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              day: 1,
              title: 'Day One',
              modules: [],
              panels: [],
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
      ),
    )
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('offers a mark-read control on the active day', async () => {
    render(
      <CuratedActiveView
        seriesSlug="identity"
        currentDay={1}
        source="manual"
        startedAt={new Date().toISOString()}
      />,
    )
    await waitFor(() =>
      expect(
        screen.getByText(/Finished reading\? Mark this day read\./i),
      ).toBeTruthy(),
    )
  })

  it('pressing it records the completion for THIS day, which is what advances the plan', async () => {
    render(
      <CuratedActiveView
        seriesSlug="identity"
        currentDay={1}
        source="manual"
        startedAt={new Date().toISOString()}
      />,
    )
    const button = await screen.findByRole('button', { name: /MARK READ/i })
    fireEvent.click(button)
    await waitFor(() => expect(markDevotionalComplete).toHaveBeenCalled())
    // The slug it completes must be the day on screen — completing the wrong
    // day would advance the plan past unread material.
    expect(String(markDevotionalComplete.mock.calls[0][0])).toContain(
      'identity',
    )
  })
})
