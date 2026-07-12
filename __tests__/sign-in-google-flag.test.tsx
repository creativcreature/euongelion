/**
 * Phase 1d — Google as a quiet peer on sign-in (pattern doc §5).
 *
 * Contract under test:
 *  - NEXT_PUBLIC_GOOGLE_AUTH_ENABLED !== 'true' → the Google button (and
 *    its "or" divider) never renders: an unconfigured provider can never
 *    present a broken path. Email + Continue is the whole surface.
 *  - Flag on → "Continue with Google" renders BELOW the email form
 *    (ChatGPT ordering — never above), and exactly two auth paths exist.
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
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

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
})

describe('sign-in Google flag gating', () => {
  it('renders NO Google path while the provider flag is off', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_AUTH_ENABLED', '')
    render(<SignInPage />)

    expect(
      screen.queryByRole('button', { name: 'Continue with Google' }),
    ).toBeNull()
    expect(screen.queryByText('or')).toBeNull()
    // Email remains the whole surface.
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument()
  })

  it('treats any value other than the exact string true as off', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_AUTH_ENABLED', 'TRUE')
    render(<SignInPage />)
    expect(
      screen.queryByRole('button', { name: 'Continue with Google' }),
    ).toBeNull()
  })

  it('renders Google BELOW email when the flag is on — a quiet peer', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_AUTH_ENABLED', 'true')
    render(<SignInPage />)

    const emailInput = screen.getByPlaceholderText('you@example.com')
    const continueButton = screen.getByRole('button', { name: 'Continue' })
    const googleButton = screen.getByRole('button', {
      name: 'Continue with Google',
    })
    expect(googleButton).toBeInTheDocument()

    // ChatGPT ordering: email field, then Continue, THEN Google.
    expect(
      emailInput.compareDocumentPosition(googleButton) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      continueButton.compareDocumentPosition(googleButton) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    // Exactly two auth paths: email(+code) and Google — no third provider.
    const authButtons = screen
      .getAllByRole('button')
      .map((el) => el.textContent?.trim())
      .filter(
        (label) => label === 'Continue' || label === 'Continue with Google',
      )
    expect(authButtons).toHaveLength(2)
    expect(screen.queryByText(/apple|facebook|github/i)).toBeNull()
  })
})
