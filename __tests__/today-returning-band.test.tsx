import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TodayReturningBand, {
  greetingForHour,
} from '@/components/TodayReturningBand'

// FadeIn is a GSAP ScrollTrigger wrapper — render children directly so the
// test asserts the band's content, not the animation plumbing.
vi.mock('@/components/motion/FadeIn', () => ({
  default: ({
    children,
    className,
  }: {
    children: React.ReactNode
    className?: string
  }) => <div className={className}>{children}</div>,
}))

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

function mockFetchReject() {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.reject(new Error('network down'))),
  )
}

const GREETINGS = ['Good morning.', 'Good afternoon.', 'Good evening.']

describe('greetingForHour', () => {
  it('greets by time of day — plain, warm, no exclamation', () => {
    expect(greetingForHour(5)).toBe('Good morning.')
    expect(greetingForHour(9)).toBe('Good morning.')
    expect(greetingForHour(11)).toBe('Good morning.')
    expect(greetingForHour(12)).toBe('Good afternoon.')
    expect(greetingForHour(16)).toBe('Good afternoon.')
    expect(greetingForHour(17)).toBe('Good evening.')
    expect(greetingForHour(22)).toBe('Good evening.')
    // Small hours read as evening, not a fourth cutesy variant.
    expect(greetingForHour(0)).toBe('Good evening.')
    expect(greetingForHour(4)).toBe('Good evening.')
  })
})

describe('TodayReturningBand', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renders greeting + DAY N · title continue card when a plan is active', async () => {
    mockFetchOnce({
      ok: true,
      hasCurrent: true,
      route: '/daily-bread',
      selectionType: 'ai_primary',
      planToken: 'abc-123',
      seriesSlug: 'identity',
      seriesTitle: 'Identity Crisis',
      dayNumber: 3,
    })

    render(<TodayReturningBand />)

    await waitFor(() => {
      expect(screen.getByTestId('today-continue-card')).toBeTruthy()
    })

    const card = screen.getByTestId('today-continue-card')
    expect(card.getAttribute('href')).toBe('/daily-bread')
    expect(card.textContent).toContain('DAY 3')
    expect(card.textContent).toContain('Identity Crisis')
    expect(card.textContent).toContain('Continue where you left off.')

    const greeting = screen.getByTestId('today-greeting')
    expect(GREETINGS).toContain(greeting.textContent)

    // Plan state must not stack a recommendation on top of the edition.
    expect(screen.queryByTestId('today-soul-audit-card')).toBeNull()
  })

  it('omits the DAY label (but keeps the title) when dayNumber is missing', async () => {
    mockFetchOnce({
      ok: true,
      hasCurrent: true,
      route: '/devotional/sleep-day-1',
      selectionType: 'curated_prefab',
      seriesSlug: 'sleep',
      seriesTitle: 'Too Busy For God',
    })

    render(<TodayReturningBand />)

    await waitFor(() => {
      expect(screen.getByTestId('today-continue-card')).toBeTruthy()
    })

    const card = screen.getByTestId('today-continue-card')
    expect(card.getAttribute('href')).toBe('/devotional/sleep-day-1')
    expect(card.textContent).toContain('Too Busy For God')
    expect(card.textContent).not.toContain('DAY')
  })

  it('renders greeting + one Soul Audit recommendation when no plan is active', async () => {
    mockFetchOnce({ ok: true, hasCurrent: false })

    render(<TodayReturningBand />)

    await waitFor(() => {
      expect(screen.getByTestId('today-soul-audit-card')).toBeTruthy()
    })

    const card = screen.getByTestId('today-soul-audit-card')
    expect(card.getAttribute('href')).toBe('/soul-audit')
    expect(card.textContent).toContain('SOUL AUDIT')
    expect(card.textContent).toContain(
      'Name what you’re carrying — we’ll compose three paths.',
    )

    const greeting = screen.getByTestId('today-greeting')
    expect(GREETINGS).toContain(greeting.textContent)

    expect(screen.queryByTestId('today-continue-card')).toBeNull()
  })

  it('renders nothing on HTTP failure', async () => {
    mockFetchOnce({}, 500)
    const { container } = render(<TodayReturningBand />)

    // Initial render is empty (loading), and stays empty after resolution.
    expect(container.firstChild).toBeNull()
    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    })
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)
  })

  it('renders nothing when the fetch rejects (offline)', async () => {
    mockFetchReject()
    const { container } = render(<TodayReturningBand />)

    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)
    })
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when hasCurrent is true but the payload is malformed', async () => {
    // A plan exists but the payload lost its route/title — hide the band
    // rather than invent a destination or misrecommend a new path.
    mockFetchOnce({ ok: true, hasCurrent: true, seriesTitle: '' })
    const { container } = render(<TodayReturningBand />)

    await waitFor(() => {
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)
    })
    expect(container.firstChild).toBeNull()
  })
})
