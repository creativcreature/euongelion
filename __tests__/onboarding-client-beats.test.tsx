/**
 * Phase 1d — OnboardingClient beat wiring (pattern doc §4).
 *
 * Contract under test (component level, on top of the pure
 * onboarding-flow machine):
 *  - welcome → window → reminders → bridge, one decision per screen;
 *  - the window choice writes the REAL settingsStore reminderWindow;
 *  - "Not now" carries equal dignity — it advances without any
 *    permission prompt or nagging;
 *  - skip-all persists { skipped: true } and still lands in content;
 *  - finishing persists { skipped: false } and lands in content
 *    (redirect > active plan > /daily-bread).
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import OnboardingClient from '@/app/onboarding/OnboardingClient'
import { DEFAULT_ONBOARDING_PREFERENCES } from '@/lib/auth/onboarding'
import { useSettingsStore } from '@/stores/settingsStore'

const replaceMock = vi.fn()
const refreshMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: replaceMock,
    refresh: refreshMock,
    push: vi.fn(),
  }),
}))

type FetchCall = { url: string; body: Record<string, unknown> | null }

function installFetchMock(options: { activePlanRoute?: string | null } = {}) {
  const calls: FetchCall[] = []
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    calls.push({
      url,
      body: init?.body ? JSON.parse(String(init.body)) : null,
    })
    if (url.includes('/api/soul-audit/current')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve(
            options.activePlanRoute
              ? { hasCurrent: true, route: options.activePlanRoute }
              : { hasCurrent: false },
          ),
      } as Response)
    }
    if (url.includes('/api/auth/onboarding')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ok: true }),
      } as Response)
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response)
  })
  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, calls }
}

beforeEach(() => {
  replaceMock.mockReset()
  refreshMock.mockReset()
  useSettingsStore.setState({ reminderWindow: null })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function renderClient(finalRedirect = '/') {
  return render(
    <OnboardingClient
      finalRedirect={finalRedirect}
      initialPreferences={DEFAULT_ONBOARDING_PREFERENCES}
    />,
  )
}

describe('OnboardingClient beats', () => {
  it('walks welcome → window → reminders → bridge, one decision per screen', async () => {
    installFetchMock()
    const user = userEvent.setup()
    renderClient()

    // Welcome frames the WHY; no capture yet.
    expect(screen.getByText('Before you begin.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    // Beat A: the three NAMED windows, nothing else.
    expect(
      screen.getByText('When should the day’s word find you?'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Morning/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Midday/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Evening/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Early morning/ })).toBeNull()

    await user.click(screen.getByRole('button', { name: /Evening/ }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    // The choice is saved to the REAL preference the sender reads.
    expect(useSettingsStore.getState().reminderWindow).toBe('evening')

    // Beat B: opt-in with equal-dignity Not now (jsdom has no push
    // machinery, so the honest unsupported copy renders instead of a
    // fake toggle — Continue is the only advance).
    expect(screen.getByText('May we knock, softly?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    // Bridge: what the answers were for + the honesty line.
    expect(screen.getByText('That’s everything.')).toBeInTheDocument()
    expect(
      screen.getByText(
        'We only use your answers to personalize your experience.',
      ),
    ).toBeInTheDocument()
  })

  it('skip-all persists skipped:true and lands in content, never a menu', async () => {
    const { calls } = installFetchMock()
    const user = userEvent.setup()
    renderClient('/')

    await user.click(screen.getByRole('button', { name: 'Skip for now' }))

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/daily-bread')
    })
    const save = calls.find((c) => c.url.includes('/api/auth/onboarding'))
    expect(save?.body).toMatchObject({ skipped: true })
    // Preferences pass through unchanged — nothing is overwritten by a skip.
    expect(save?.body?.preferences).toEqual(DEFAULT_ONBOARDING_PREFERENCES)
    // No touched reminder window on a skip before the window beat.
    expect(useSettingsStore.getState().reminderWindow).toBeNull()
  })

  it('finishing lands on the explicit redirect (the held-generation resume)', async () => {
    const { calls } = installFetchMock({ activePlanRoute: '/daily-bread' })
    const user = userEvent.setup()
    renderClient('/soul-audit/results?resume=1')

    await user.click(screen.getByRole('button', { name: 'Continue' })) // welcome
    await user.click(screen.getByRole('button', { name: 'Continue' })) // window (morning default)
    await user.click(screen.getByRole('button', { name: 'Continue' })) // reminders (unsupported in jsdom)
    await user.click(screen.getByRole('button', { name: 'Begin reading' }))

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/soul-audit/results?resume=1')
    })
    const save = calls.find((c) => c.url.includes('/api/auth/onboarding'))
    expect(save?.body).toMatchObject({ skipped: false })
    expect(useSettingsStore.getState().reminderWindow).toBe('morning')
  })

  it('lands on the active plan route when there is no explicit redirect', async () => {
    installFetchMock({ activePlanRoute: '/daily-bread?planToken=abc&day=1' })
    const user = userEvent.setup()
    renderClient('/')

    // Wait for the active-plan probe to hydrate before finishing.
    const fetchMock = globalThis.fetch as unknown as {
      mock: { calls: unknown[][] }
    }
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some((call) =>
          String(call[0]).includes('/api/soul-audit/current'),
        ),
      ).toBe(true)
    })

    await user.click(screen.getByRole('button', { name: 'Skip for now' }))
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith(
        '/daily-bread?planToken=abc&day=1',
      )
    })
  })
})
