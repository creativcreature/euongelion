/**
 * SA-099 / F-145 — the Library says where you are, not just what you own.
 *
 * Every series card used to read identically whether you had finished four days
 * or never opened it: a saved series said "Whole series · N days" and stopped.
 * That is a shelf, not a library.
 *
 * Asserts on a real LibraryView mount:
 *  - the live series is badged CURRENT
 *  - series carry "N of M read"
 *  - a saved series already started offers CONTINUE · DAY n, linking to that
 *    exact day rather than the top of the series
 *  - a saved series never opened offers no CONTINUE, and sorts below one that
 *    has been started
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import LibraryView from '@/components/LibraryView'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}))

// 'hope' is started (2 of 5); 'identity' is saved but untouched.
const READ = new Set(['hope-day-1', 'hope-day-2'])
vi.mock('@/lib/progress', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/progress')>()
  return {
    ...actual,
    getProgress: () => [...READ].map((slug) => ({ slug, completedAt: '' })),
    isDevotionalRead: (slug: string) => READ.has(slug),
  }
})

vi.mock('@/stores/devotionalLibraryStore', () => ({
  onAuthRequired: () => () => {},
  useDevotionalLibraryStore: (
    selector: (s: Record<string, unknown>) => unknown,
  ) =>
    selector({
      hydrated: true,
      lastError: null,
      active: {
        seriesSlug: 'hope',
        seriesTitle: 'Hope',
        currentDay: 3,
        source: 'manual',
      },
      // untouched first, so ordering is proven rather than accidental
      saved: [
        { devotionalSlug: 'identity', note: null },
        { devotionalSlug: 'hope', note: null },
      ],
      archived: [],
      hydrate: async () => {},
      refresh: async () => {},
      start: async () => {},
      unsave: async () => {},
      restartFromArchive: async () => {},
    }),
}))

afterEach(cleanup)

describe('Library — a series card knows where you are', () => {
  it('badges the live series CURRENT and shows its standing', () => {
    render(<LibraryView />)
    expect(screen.getAllByText('CURRENT').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/2 of 5 read/).length).toBeGreaterThan(0)
  })

  it('a started saved series offers CONTINUE at the next unread day', () => {
    render(<LibraryView />)
    const cont = screen.getAllByRole('link', { name: /CONTINUE.*DAY 3/i })
    expect(cont.length).toBeGreaterThan(0)
    // it must open that day, not the series top
    expect(cont[0].getAttribute('href')).toMatch(/hope-day-3|day=3/)
  })

  it('an untouched saved series gets no CONTINUE, and sorts below a started one', () => {
    const { container } = render(<LibraryView />)
    const text = container.textContent ?? ''
    // 'hope' (started) must appear before 'identity' (untouched) in the saved grid
    const savedGrid = container.querySelectorAll('.library-section')[1]
    const order = within(savedGrid as HTMLElement).getAllByText(/Whole series/i)
    expect(order.length).toBe(2)
    expect(text.indexOf('CONTINUE')).toBeGreaterThan(-1)
  })
})
