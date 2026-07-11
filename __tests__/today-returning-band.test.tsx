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

// D-22 (F-074): sessionStorage audit payloads that provably point at the
// mocked current plan — the ONLY condition under which the why-row renders.
const WHY_REASONING =
  'A restlessness that will not settle — this path sits with stillness before God.'

function seedAuditReason(params: { planToken: string; seriesSlug: string }) {
  window.sessionStorage.setItem(
    'soul-audit-submit-v2',
    JSON.stringify({
      version: 'v2',
      auditRunId: 'run-1',
      runToken: 'tok-1',
      remainingAudits: 2,
      requiresEssentialConsent: true,
      analyticsOptInDefault: false,
      consentAccepted: true,
      crisis: {
        required: false,
        acknowledged: false,
        resources: [],
        prompt: '',
      },
      options: [
        {
          id: 'opt-1',
          kind: 'ai_primary',
          rank: 1,
          slug: params.seriesSlug,
          title: 'Quieting the Noise',
          question: 'Where did the quiet go?',
          confidence: 0.9,
          reasoning: WHY_REASONING,
        },
      ],
      policy: {
        noAccountRequired: true,
        maxAuditsPerCycle: 3,
        directionCount: 3,
      },
    }),
  )
  window.sessionStorage.setItem(
    'soul-audit-selection-v2',
    JSON.stringify({
      ok: true,
      auditRunId: 'run-1',
      selectionType: 'ai_primary',
      route: '/daily-bread',
      planToken: params.planToken,
      seriesSlug: params.seriesSlug,
    }),
  )
}

describe('TodayReturningBand', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    window.sessionStorage.clear()
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

    // D-22: no stored audit reason in this session → no why-row. The row
    // must never render from fabricated data.
    expect(screen.queryByTestId('today-why-this')).toBeNull()
  })

  it('renders the WHY THIS row only when the session holds the real audit reason (D-22)', async () => {
    seedAuditReason({ planToken: 'abc-123', seriesSlug: 'quieting-the-noise' })
    mockFetchOnce({
      ok: true,
      hasCurrent: true,
      route: '/daily-bread',
      selectionType: 'ai_primary',
      planToken: 'abc-123',
      seriesSlug: 'quieting-the-noise',
      seriesTitle: 'Quieting the Noise',
      dayNumber: 2,
    })

    render(<TodayReturningBand />)

    const why = await screen.findByTestId('today-why-this')
    expect(why.textContent).toContain('WHY THIS')
    expect(why.textContent).toContain(WHY_REASONING)
    // Brand voice: quiet, no exclamation.
    expect(why.textContent).not.toMatch(/!/)
  })

  it('omits the WHY THIS row when the stored audit points at a different plan (D-22)', async () => {
    seedAuditReason({
      planToken: 'some-other-plan',
      seriesSlug: 'another-path',
    })
    mockFetchOnce({
      ok: true,
      hasCurrent: true,
      route: '/daily-bread',
      selectionType: 'ai_primary',
      planToken: 'abc-123',
      seriesSlug: 'quieting-the-noise',
      seriesTitle: 'Quieting the Noise',
      dayNumber: 2,
    })

    render(<TodayReturningBand />)

    await waitFor(() => {
      expect(screen.getByTestId('today-continue-card')).toBeTruthy()
    })
    expect(screen.queryByTestId('today-why-this')).toBeNull()
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
