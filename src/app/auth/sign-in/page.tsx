'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteBottom from '@/components/SiteBottom'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import {
  mountTurnstile,
  turnstileSiteKey,
  type TurnstileHandle,
} from '@/lib/auth/turnstile-client'

/**
 * Sign-in — email-first, single field, single verb (pattern doc §5,
 * Linear model). Exactly two paths ever render:
 *
 *  1. Email + Continue (primary) → magic link + in-app 6-digit code
 *     entry (F-065).
 *  2. Google as a QUIET PEER below a hairline "or" divider (ChatGPT
 *     ordering — never above email), stroke-outline, and rendered ONLY
 *     when NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === 'true' so an
 *     unconfigured provider can never present a broken button.
 *
 * Turnstile (brief §12.4) rides invisibly on the email step when
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY is set; with it unset the form is
 * byte-for-byte yesterday's behavior.
 */

type OAuthProvider = 'google'

function normalizeRedirectPath(value: string | null): string {
  if (!value) return '/'
  const trimmed = value.trim()
  if (!trimmed.startsWith('/')) return '/'
  if (trimmed.startsWith('//')) return '/'
  if (trimmed.includes('://')) return '/'
  if (trimmed.length > 240) return '/'
  return trimmed
}

function authErrorMessage(code: string | null): string {
  if (!code) return ''
  if (code === 'link_expired') {
    return 'That sign-in link expired or was already used. Request a fresh one below.'
  }
  // `auth_failed` and unknown codes are most commonly an expired or
  // already-used magic link — name the likely cause and the fix.
  return 'We couldn’t complete sign-in — your link may have expired or already been used. Request a fresh one below.'
}

function SignInForm() {
  const searchParams = useSearchParams()
  const redirect = normalizeRedirectPath(searchParams.get('redirect'))
  const callbackError = authErrorMessage(searchParams.get('error'))
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle',
  )
  const [oauthProvider, setOauthProvider] = useState<OAuthProvider | null>(null)
  const [error, setError] = useState('')
  // F-065 — in-app magic-code entry (Linear model): after the email is
  // sent, the reader can type the 6-digit code instead of leaving for
  // their inbox. Verified server-side by /api/auth/verify-code, which
  // runs the same post-auth sequence as /auth/callback.
  const [code, setCode] = useState('')
  const [codeStatus, setCodeStatus] = useState<'idle' | 'verifying'>('idle')
  const [codeError, setCodeError] = useState('')
  const isBusy = status === 'sending' || oauthProvider !== null

  // Google renders only when the founder has configured the provider.
  const googleEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === 'true'

  // Turnstile — a clean conditional: no site key, no widget, no token.
  const siteKey = turnstileSiteKey()
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null)
  const turnstileHandleRef = useRef<TurnstileHandle | null>(null)
  const turnstileFailedRef = useRef(false)

  useEffect(() => {
    if (!siteKey) return
    const container = turnstileContainerRef.current
    if (!container) return
    let cancelled = false
    let handle: TurnstileHandle | null = null

    mountTurnstile(container, siteKey)
      .then((mounted) => {
        if (cancelled) {
          mounted.destroy()
          return
        }
        handle = mounted
        turnstileHandleRef.current = mounted
        turnstileFailedRef.current = false
      })
      .catch(() => {
        if (!cancelled) turnstileFailedRef.current = true
      })

    return () => {
      cancelled = true
      turnstileHandleRef.current = null
      handle?.destroy()
    }
  }, [siteKey])

  async function handleOAuth(provider: OAuthProvider) {
    setError('')
    setOauthProvider(provider)

    try {
      const supabase = createSupabaseClient()
      // Same post-auth handling as the email flows: /auth/callback runs
      // onAuthSuccess + the onboarding routing decision, then lands on
      // the sanitized redirect (incl. the Phase-1c ?resume=1 path).
      const callbackPath = `/auth/callback?redirect=${encodeURIComponent(redirect)}`
      const redirectTo = `${window.location.origin}${callbackPath}`
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
        },
      })

      if (oauthError) {
        throw oauthError
      }

      if (!data.url) {
        throw new Error('Unable to start sign-in. Please try again.')
      }

      window.location.assign(data.url)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong. Try again.',
      )
      setOauthProvider(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const trimmed = email.trim()
    if (!trimmed || !trimmed.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }

    setStatus('sending')
    setError('')

    try {
      let turnstileToken: string | undefined
      if (siteKey) {
        // The widget mounts asynchronously — a fast submit briefly waits
        // for the handle instead of failing on the race.
        const deadline = Date.now() + 8_000
        while (
          !turnstileHandleRef.current &&
          !turnstileFailedRef.current &&
          Date.now() < deadline
        ) {
          await new Promise((resolve) => setTimeout(resolve, 150))
        }
        if (!turnstileHandleRef.current) {
          throw new Error(
            'We couldn’t load the verification check. Reload the page and try again.',
          )
        }
        turnstileToken = await turnstileHandleRef.current.getToken()
      }

      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmed,
          redirectTo: `/auth/callback?redirect=${encodeURIComponent(redirect)}`,
          ...(turnstileToken ? { turnstileToken } : {}),
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Something went wrong.')
      }

      setStatus('sent')
      setCode('')
      setCodeError('')
      setCodeStatus('idle')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong. Try again.',
      )
      setStatus('error')
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()

    const compact = code.replace(/\s+/g, '')
    if (!/^\d{6}$/.test(compact)) {
      setCodeError('Enter the 6-digit code from the email.')
      return
    }

    setCodeStatus('verifying')
    setCodeError('')

    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          code: compact,
          redirect,
        }),
      })

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        next?: string
        error?: string
      }

      if (!res.ok || !data.ok) {
        throw new Error(
          data.error ||
            'That code didn’t work. Request a fresh email and try again.',
        )
      }

      // Full navigation (not router.push) so server components render
      // with the freshly set auth cookies — same end state as the
      // emailed-link path through /auth/callback.
      window.location.assign(data.next || redirect)
    } catch (err) {
      setCodeError(
        err instanceof Error ? err.message : 'Something went wrong. Try again.',
      )
      setCodeStatus('idle')
    }
  }

  if (status === 'sent') {
    return (
      <div className="w-full text-center">
        <p className="text-label vw-small mb-6 text-gold">CHECK YOUR EMAIL</p>
        <h1 className="text-serif-italic vw-heading-md mb-6">
          We sent you a sign-in link.
        </h1>
        <p className="vw-body mb-8 text-secondary">
          Click the link in your email to continue. It expires in 1 hour.
        </p>

        <form onSubmit={handleVerifyCode} className="mb-8 space-y-3">
          <p className="text-label vw-small text-muted">
            OR TYPE THE CODE FROM THE EMAIL
          </p>
          <p className="vw-small text-muted">
            If your email includes a 6-digit code, enter it here to sign in
            without leaving this page.
          </p>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            value={code}
            onChange={(e) => {
              setCode(e.target.value)
              setCodeError('')
            }}
            placeholder="123456"
            disabled={codeStatus === 'verifying'}
            aria-label="6-digit sign-in code"
            className="auth-code-input w-full bg-surface-raised px-5 py-4 text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] transition-colors duration-200 focus:outline-none"
            style={{ border: '1px solid var(--color-border)' }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--color-gold)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--color-border)'
            }}
          />
          {codeError && (
            <p className="vw-small text-center text-secondary" role="alert">
              {codeError}
            </p>
          )}
          <button
            type="submit"
            disabled={codeStatus === 'verifying'}
            className="w-full min-h-[44px] bg-[var(--color-fg)] px-10 py-4 text-label vw-small text-[var(--color-bg)] transition-all duration-300 hover:bg-gold hover:text-tehom disabled:opacity-50"
          >
            {codeStatus === 'verifying' ? 'Verifying...' : 'Verify Code'}
          </button>
        </form>

        <p className="vw-small text-muted">
          Didn&apos;t get it?{' '}
          <button
            onClick={() => setStatus('idle')}
            className="text-gold transition-colors duration-200 hover:text-[var(--color-text-primary)]"
          >
            Try again
          </button>
        </p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <p className="text-label vw-small mb-4 text-center text-gold">SIGN IN</p>
      <h1 className="text-serif-italic vw-heading-md mb-3 text-center">
        Welcome back.
      </h1>
      <p className="vw-body mb-2 text-center text-secondary">
        Enter your email and we&apos;ll send you a sign-in link.
      </p>
      <p className="vw-small mb-8 text-center text-muted">
        An account simply syncs your saved devotionals and progress across your
        devices. You can keep reading without one.
      </p>

      {callbackError && (
        <p className="vw-small mb-6 text-center text-secondary">
          {callbackError}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setError('')
          }}
          placeholder="you@example.com"
          autoFocus
          disabled={isBusy}
          className="w-full bg-surface-raised px-5 py-4 vw-body text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] transition-colors duration-200 focus:outline-none"
          style={{ border: '1px solid var(--color-border)' }}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--color-gold)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--color-border)'
          }}
        />

        {/* Invisible Turnstile slot — empty unless Cloudflare must show
            an interactive challenge. Absent entirely without a site key. */}
        {siteKey && <div ref={turnstileContainerRef} />}

        {error && (
          <p className="vw-small text-center text-secondary" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isBusy}
          className="w-full min-h-[44px] bg-[var(--color-fg)] px-10 py-4 text-label vw-small text-[var(--color-bg)] transition-all duration-300 hover:bg-gold hover:text-tehom disabled:opacity-50"
        >
          {status === 'sending' ? 'Sending...' : 'Continue'}
        </button>
      </form>

      {googleEnabled && (
        <>
          <div className="my-6 flex items-center gap-4" aria-hidden="true">
            <span
              className="h-px flex-1"
              style={{ backgroundColor: 'var(--color-border)' }}
            />
            <span className="text-label vw-small text-muted">or</span>
            <span
              className="h-px flex-1"
              style={{ backgroundColor: 'var(--color-border)' }}
            />
          </div>

          <button
            type="button"
            disabled={isBusy}
            onClick={() => void handleOAuth('google')}
            className="w-full min-h-[44px] bg-transparent px-10 py-4 text-label vw-small text-[var(--color-text-primary)] transition-colors duration-200 hover:bg-surface-raised disabled:opacity-50"
            style={{ border: '1px solid var(--color-border)' }}
            aria-label="Continue with Google"
          >
            {oauthProvider === 'google'
              ? 'Connecting...'
              : 'Continue with Google'}
          </button>
        </>
      )}

      <div className="mt-8 text-center">
        <Link
          href={redirect}
          className="vw-small text-muted transition-colors duration-200 hover:text-[var(--color-text-primary)]"
        >
          Continue as guest
        </Link>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <div className="mock-home">
      <main id="main-content" className="mock-paper">
        <EuangelionShellHeader />

        <section className="shell-content-pad mx-auto flex min-h-[calc(100vh-120px)] max-w-md flex-col items-center justify-center">
          <Suspense
            fallback={
              <div className="w-full text-center">
                <p className="text-label vw-small mb-4 text-gold">SIGN IN</p>
                <h1 className="text-serif-italic vw-heading-md mb-3">
                  Welcome back.
                </h1>
              </div>
            }
          >
            <SignInForm />
          </Suspense>
        </section>
        <SiteBottom />
      </main>
    </div>
  )
}
