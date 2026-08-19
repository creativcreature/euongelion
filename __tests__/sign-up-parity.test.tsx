/**
 * /auth/sign-up parity with /auth/sign-in (audit B1/B2/B3/B4).
 *
 * The two pages are one flow with two doors, so sign-up must not be a
 * weaker surface than sign-in. Contract under test:
 *  - NEXT_PUBLIC_GOOGLE_AUTH_ENABLED !== 'true' → the Google button (and
 *    its "or" divider) never renders: an unconfigured provider can never
 *    present a broken path.
 *  - Flag on → "Continue with Google" renders BELOW the email form
 *    (ChatGPT ordering — never above), and exactly two auth paths exist.
 *  - After the email is sent, the "check your email" state ALSO offers a
 *    code input, posting the SAME email + compacted code + redirect to
 *    /api/auth/verify-code, then navigating to the API-provided `next`.
 *    This path matters most on sign-up: a brand-new reader is the one
 *    likeliest to hit the mailer's 2-emails/hour cap or wait on a slow
 *    first delivery.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SignUpPage from '@/app/auth/sign-up/page'

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('redirect=%2Fsaved'),
}))

// Turnstile talks to challenges.cloudflare.com — the real widget can never
// mount in jsdom. Mock the client module so the site key is a per-test
// switch (null = the unconfigured default, exactly as in CI).
const { turnstileState, mountTurnstileMock } = vi.hoisted(() => ({
  turnstileState: { siteKey: null as string | null },
  mountTurnstileMock: vi.fn(),
}))

vi.mock('@/lib/auth/turnstile-client', () => ({
  turnstileSiteKey: () => turnstileState.siteKey,
  mountTurnstile: mountTurnstileMock,
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

async function sendSignUpLink(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    screen.getByPlaceholderText('you@example.com'),
    'reader@example.com',
  )
  await user.click(screen.getByRole('button', { name: 'Send Sign Up Link' }))
  await screen.findByText('CHECK YOUR EMAIL')
}

beforeEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
  turnstileState.siteKey = null
  mountTurnstileMock.mockReset()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('sign-up Google flag gating', () => {
  it('renders NO Google path while the provider flag is off', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_AUTH_ENABLED', '')
    render(<SignUpPage />)

    expect(
      screen.queryByRole('button', { name: 'Continue with Google' }),
    ).toBeNull()
    expect(screen.queryByText('or')).toBeNull()
    // Email remains the whole surface.
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Send Sign Up Link' }),
    ).toBeInTheDocument()
  })

  it('treats any value other than the exact string true as off', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_AUTH_ENABLED', 'TRUE')
    render(<SignUpPage />)
    expect(
      screen.queryByRole('button', { name: 'Continue with Google' }),
    ).toBeNull()
  })

  it('renders Google BELOW email when the flag is on — a quiet peer', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_AUTH_ENABLED', 'true')
    render(<SignUpPage />)

    const emailInput = screen.getByPlaceholderText('you@example.com')
    const submitButton = screen.getByRole('button', {
      name: 'Send Sign Up Link',
    })
    const googleButton = screen.getByRole('button', {
      name: 'Continue with Google',
    })
    expect(googleButton).toBeInTheDocument()

    // ChatGPT ordering: email field, then the primary verb, THEN Google.
    expect(
      emailInput.compareDocumentPosition(googleButton) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      submitButton.compareDocumentPosition(googleButton) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    // Exactly two auth paths: email(+code) and Google — no third provider.
    const authButtons = screen
      .getAllByRole('button')
      .map((el) => el.textContent?.trim())
      .filter(
        (label) =>
          label === 'Send Sign Up Link' || label === 'Continue with Google',
      )
    expect(authButtons).toHaveLength(2)
    expect(screen.queryByText(/apple|facebook|github/i)).toBeNull()
  })
})

describe('sign-up guest escape hatch', () => {
  it('offers "Continue as guest" pointing at the sanitized redirect', () => {
    render(<SignUpPage />)

    // Same hatch as sign-in: the reassurance line plus a plain link out.
    expect(
      screen.getByText('You can keep reading without one', { exact: false }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Continue as guest' }),
    ).toHaveAttribute('href', '/saved')
  })
})

describe('sign-up in-app code entry', () => {
  it('offers the code input beside the emailed-link instructions', async () => {
    installFetchMock()
    const user = userEvent.setup()
    render(<SignUpPage />)
    await sendSignUpLink(user)

    // Both paths coexist: the link instruction AND the code form.
    expect(
      screen.getByText('Click the link in your email to complete sign up', {
        exact: false,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Or enter the code from the email', { exact: false }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('textbox', { name: 'Sign-up code from your email' }),
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
      render(<SignUpPage />)
      await sendSignUpLink(user)

      await user.type(
        screen.getByRole('textbox', { name: 'Sign-up code from your email' }),
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
    render(<SignUpPage />)
    await sendSignUpLink(user)

    await user.type(
      screen.getByRole('textbox', { name: 'Sign-up code from your email' }),
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
    render(<SignUpPage />)
    await sendSignUpLink(user)

    await user.type(
      screen.getByRole('textbox', { name: 'Sign-up code from your email' }),
      '12ab',
    )
    await user.click(screen.getByRole('button', { name: 'Verify Code' }))

    expect(
      await screen.findByText('Enter the code from the email.'),
    ).toBeInTheDocument()
    expect(calls.some((c) => c.url.includes('verify-code'))).toBe(false)
  })

  it('accepts an 8-digit code, so a Supabase config change cannot break sign-up', async () => {
    const { calls } = installFetchMock()
    const assignSpy = vi.fn()
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, assign: assignSpy },
    })

    try {
      const user = userEvent.setup()
      render(<SignUpPage />)
      await sendSignUpLink(user)

      await user.type(
        screen.getByRole('textbox', { name: 'Sign-up code from your email' }),
        '12345678',
      )
      await user.click(screen.getByRole('button', { name: 'Verify Code' }))

      // It reached the network instead of being refused locally.
      await waitFor(() => {
        expect(calls.some((c) => c.url.includes('verify-code'))).toBe(true)
      })
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: originalLocation,
      })
    }
  })
})

describe('sign-up Turnstile', () => {
  it('mounts no widget and sends no token without a site key', async () => {
    const { calls } = installFetchMock()
    const user = userEvent.setup()
    render(<SignUpPage />)
    await sendSignUpLink(user)

    expect(mountTurnstileMock).not.toHaveBeenCalled()
    const magicLinkCall = calls.find((c) => c.url.includes('magic-link'))
    expect(magicLinkCall?.body).toEqual({
      email: 'reader@example.com',
      redirectTo: '/auth/callback?redirect=%2Fsaved',
    })
  })

  it('posts the Turnstile token with the magic-link request when a site key is set', async () => {
    turnstileState.siteKey = 'test-site-key'
    const getToken = vi.fn(() => Promise.resolve('turnstile-token-abc'))
    const destroy = vi.fn()
    mountTurnstileMock.mockResolvedValue({ getToken, destroy })

    const { calls } = installFetchMock()
    const user = userEvent.setup()
    render(<SignUpPage />)

    await waitFor(() => {
      expect(mountTurnstileMock).toHaveBeenCalled()
    })
    await sendSignUpLink(user)

    expect(getToken).toHaveBeenCalled()
    const magicLinkCall = calls.find((c) => c.url.includes('magic-link'))
    expect(magicLinkCall?.body).toEqual({
      email: 'reader@example.com',
      redirectTo: '/auth/callback?redirect=%2Fsaved',
      turnstileToken: 'turnstile-token-abc',
    })
  })

  it('re-mounts the widget into the fresh container after "Try again"', async () => {
    turnstileState.siteKey = 'test-site-key'
    const getToken = vi.fn(() => Promise.resolve('turnstile-token-abc'))
    const destroy = vi.fn()
    mountTurnstileMock.mockResolvedValue({ getToken, destroy })

    installFetchMock()
    const user = userEvent.setup()
    render(<SignUpPage />)

    await waitFor(() => {
      expect(mountTurnstileMock).toHaveBeenCalledTimes(1)
    })
    await sendSignUpLink(user)

    // Entering the sent phase unmounts the container div and tears the
    // widget down with it.
    await waitFor(() => {
      expect(destroy).toHaveBeenCalled()
    })

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    // Back at idle a NEW container div renders — the latent defect was
    // deps of [siteKey] alone, which never re-ran the mount for it.
    await waitFor(() => {
      expect(mountTurnstileMock).toHaveBeenCalledTimes(2)
    })
  })
})
