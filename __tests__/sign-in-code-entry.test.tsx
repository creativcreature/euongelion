/**
 * F-065 — sign-in page in-app code entry (client half of the Linear model).
 *
 * Contract under test:
 *  - After the magic link is sent, the "check your email" state ALSO offers
 *    a code input. Length is NOT hardcoded: Supabase's `mailer_otp_length` is
 *    project config, and it was found set to 8 while the UI and route demanded
 *    exactly 6 — so every code a reader typed was rejected before it reached
 *    verifyOtp. Both ends now accept 6-8. (copy works whether or not the email template
 *    includes {{ .Token }}).
 *  - Submitting the code calls /api/auth/verify-code with the SAME email
 *    the link was sent to, the compacted code, and the redirect target.
 *  - A rejected code shows the API's honest error and leaves the form
 *    usable; a malformed code never reaches the network.
 *  - Success navigates to the API-provided `next` path (full navigation).
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SignInPage from '@/app/auth/sign-in/page'

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('redirect=%2Fsaved'),
}))

// The page shell (header/footer) probes auth + renders nav — out of scope.
vi.mock('@/components/EuangelionShellHeader', () => ({
  default: () => <div data-testid="shell-header" />,
}))
vi.mock('@/components/SiteFooter', () => ({
  default: () => <div data-testid="site-footer" />,
}))

type FetchCall = { url: string; body: Record<string, unknown> }

function installFetchMock(
  verifyResponse: { status: number; payload: unknown } = {
    status: 200,
    payload: { ok: true, next: '/saved' },
  },
) {
  const calls: FetchCall[] = []
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    calls.push({
      url,
      body: init?.body ? JSON.parse(String(init.body)) : {},
    })
    if (url.includes('/api/auth/magic-link')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      } as Response)
    }
    return Promise.resolve({
      ok: verifyResponse.status >= 200 && verifyResponse.status < 300,
      status: verifyResponse.status,
      json: () => Promise.resolve(verifyResponse.payload),
    } as Response)
  })
  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, calls }
}

async function sendMagicLink(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    screen.getByPlaceholderText('you@example.com'),
    'reader@example.com',
  )
  // Phase 1d (pattern doc §5): the primary verb is Continue — email first,
  // single field, single verb (ChatGPT ordering).
  await user.click(screen.getByRole('button', { name: 'Continue' }))
  await screen.findByText('We sent you a sign-in link.')
}

beforeEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('sign-in in-app code entry', () => {
  it('offers the code input beside the emailed-link instructions', async () => {
    installFetchMock()
    const user = userEvent.setup()
    render(<SignInPage />)
    await sendMagicLink(user)

    // Both paths coexist: the link instruction AND the code form.
    expect(
      screen.getByText('Click the link in your email to continue.', {
        exact: false,
      }),
    ).toBeInTheDocument()
    // Copy is honest either way — the code only exists if the email
    // template includes it.
    expect(
      screen.getByText('Or enter the code from the email', {
        exact: false,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('textbox', { name: 'Sign-in code from your email' }),
    ).toBeInTheDocument()
  })

  it('verifies with the sent email + compacted code + redirect, then navigates to next', async () => {
    const { calls } = installFetchMock({
      status: 200,
      payload: { ok: true, next: '/onboarding?redirect=%2Fsaved' },
    })
    const assignSpy = vi.fn()
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, assign: assignSpy },
    })

    try {
      const user = userEvent.setup()
      render(<SignInPage />)
      await sendMagicLink(user)

      await user.type(
        screen.getByRole('textbox', { name: 'Sign-in code from your email' }),
        '123 456',
      )
      await user.click(screen.getByRole('button', { name: 'Verify Code' }))

      await waitFor(() => {
        expect(assignSpy).toHaveBeenCalledWith('/onboarding?redirect=%2Fsaved')
      })

      const verifyCall = calls.find((c) => c.url.includes('verify-code'))
      expect(verifyCall).toBeDefined()
      expect(verifyCall?.body).toEqual({
        email: 'reader@example.com',
        code: '123456',
        redirect: '/saved',
      })
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation,
      })
    }
  })

  it('shows the honest API error for a wrong or expired code', async () => {
    installFetchMock({
      status: 400,
      payload: {
        error:
          'That code didn’t work — it may be mistyped, expired, or already used. Request a fresh email below and try again.',
      },
    })
    const user = userEvent.setup()
    render(<SignInPage />)
    await sendMagicLink(user)

    await user.type(
      screen.getByRole('textbox', { name: 'Sign-in code from your email' }),
      '000000',
    )
    await user.click(screen.getByRole('button', { name: 'Verify Code' }))

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toMatch(/mistyped, expired, or already used/)
    // The form recovers — the reader can correct and retry.
    expect(screen.getByRole('button', { name: 'Verify Code' })).toBeEnabled()
  })

  it('rejects a malformed code locally without touching the network', async () => {
    const { calls } = installFetchMock()
    const user = userEvent.setup()
    render(<SignInPage />)
    await sendMagicLink(user)

    await user.type(
      screen.getByRole('textbox', { name: 'Sign-in code from your email' }),
      '12ab',
    )
    await user.click(screen.getByRole('button', { name: 'Verify Code' }))

    expect(
      await screen.findByText('Enter the code from the email.'),
    ).toBeInTheDocument()
    expect(calls.some((c) => c.url.includes('verify-code'))).toBe(false)
  })

  it('surfaces the rate-limit state honestly', async () => {
    installFetchMock({
      status: 429,
      payload: { error: 'Too many attempts. Wait a minute and try again.' },
    })
    const user = userEvent.setup()
    render(<SignInPage />)
    await sendMagicLink(user)

    await user.type(
      screen.getByRole('textbox', { name: 'Sign-in code from your email' }),
      '111111',
    )
    await user.click(screen.getByRole('button', { name: 'Verify Code' }))

    expect(
      await screen.findByText(
        'Too many attempts. Wait a minute and try again.',
      ),
    ).toBeInTheDocument()
  })

  it('accepts an 8-digit code, so a config change cannot break sign-in', async () => {
    // The exact fault found on 2026-08-16: Supabase's mailer_otp_length was 8
    // while both the UI and the route demanded exactly 6, so every code a
    // reader typed was rejected before it ever reached verifyOtp. The config is
    // 6 now, but being liberal in what we accept means the next change to it is
    // not an outage.
    const { calls } = installFetchMock()
    const user = userEvent.setup()
    render(<SignInPage />)
    await sendMagicLink(user)

    await user.type(
      screen.getByRole('textbox', { name: 'Sign-in code from your email' }),
      '12345678',
    )
    await user.click(screen.getByRole('button', { name: 'Verify Code' }))

    // It reached the network instead of being refused locally.
    expect(calls.some((c) => c.url.includes('verify-code'))).toBe(true)
  })
})
