'use client'

import Link from 'next/link'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteBottom from '@/components/SiteBottom'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'
import {
  mountTurnstile,
  turnstileSiteKey,
  type TurnstileHandle,
} from '@/lib/auth/turnstile-client'

/**
 * Sign-up — the same surface as /auth/sign-in (pattern doc §5, Linear
 * model), because the two pages are one flow with two doors. Exactly two
 * paths ever render:
 *
 *  1. Email + Send Sign Up Link (primary) → magic link + in-app 6-digit
 *     code entry (F-065). The code matters MOST here: a brand-new reader
 *     is the one likeliest to hit the mailer's 2-emails/hour cap or wait
 *     on a slow first delivery, and the code lets them finish without
 *     leaving the page.
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
    return 'That sign-up link expired or was already used. Request a fresh one below.'
  }
  // `auth_failed` and unknown codes are most commonly an expired or
  // already-used magic link — name the likely cause and the fix.
  return 'We couldn’t complete sign-up — your link may have expired or already been used. Request a fresh one below.'
}

function SignUpForm() {
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

  // The 'sent' phase unmounts the container div; leaving it ("Try again")
  // renders a NEW div. With [siteKey] deps alone this effect never re-ran,
  // so the fresh div stayed empty while turnstileHandleRef kept a handle
  // whose DOM was gone. Re-running on the phase boundary cleans up on the
  // way into 'sent' and mounts a fresh widget into the fresh container on
  // the way back to idle.
  const inSentPhase = status === 'sent'

  useEffect(() => {
    if (!siteKey) return
    if (inSentPhase) return
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
  }, [siteKey, inSentPhase])

  async function handleOAuth(provider: OAuthProvider) {
    setError('')
    setOauthProvider(provider)

    try {
      const supabase = createSupabaseClient()
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
        throw new Error('Unable to start sign-up. Please try again.')
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
    // 6-8 digits — see /api/auth/verify-code. The length is Supabase project
    // config, and hardcoding 6 here while it was set to 8 made every code fail.
    if (!/^\d{6,8}$/.test(compact)) {
      setCodeError('Enter the code from the email.')
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
          You&apos;re almost in.
        </h1>
        <p className="vw-body mb-8 text-secondary">
          Click the link in your email to complete sign up and continue.
        </p>

        <form onSubmit={handleVerifyCode} className="mb-8 space-y-3">
          <p className="text-label vw-small text-muted">
            OR TYPE THE CODE FROM THE EMAIL
          </p>
          <p className="vw-small text-muted">
            Or enter the code from the email without leaving this page.
          </p>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={9}
            value={code}
            onChange={(e) => {
              setCode(e.target.value)
              setCodeError('')
            }}
            placeholder="123456"
            disabled={codeStatus === 'verifying'}
            aria-label="Sign-up code from your email"
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
            className="w-full min-h-[44px] bg-[var(--color-fg)] px-10 py-4 text-label vw-small text-[var(--color-bg)] transition-all duration-300 cta-solid disabled:opacity-50"
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
      <p className="text-label vw-small mb-4 text-center text-gold">SIGN UP</p>
      <h1 className="text-serif-italic vw-heading-md mb-3 text-center">
        Create your account.
      </h1>
      <p className="vw-body mb-2 text-center text-secondary">
        Use email magic link. No password needed.
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
          aria-label="Email address"
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
          className="w-full min-h-[44px] bg-[var(--color-fg)] px-10 py-4 text-label vw-small text-[var(--color-bg)] transition-all duration-300 cta-solid disabled:opacity-50"
        >
          {status === 'sending' ? 'Sending...' : 'Send Sign Up Link'}
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
          href={`/auth/sign-in?redirect=${encodeURIComponent(redirect)}`}
          className="vw-small text-muted transition-colors duration-200 hover:text-[var(--color-text-primary)]"
        >
          Already have an account? Sign in
        </Link>
      </div>

      <div className="mt-4 text-center">
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

export default function SignUpPage() {
  return (
    <div className="mock-home">
      <main id="main-content" className="mock-paper">
        <EuangelionShellHeader />
        <section className="shell-content-pad mx-auto flex min-h-[calc(100vh-120px)] max-w-md flex-col items-center justify-center">
          <Suspense
            fallback={
              <div className="w-full text-center">
                <p className="text-label vw-small mb-4 text-gold">SIGN UP</p>
                <h1 className="text-serif-italic vw-heading-md mb-3">
                  Create your account.
                </h1>
              </div>
            }
          >
            <SignUpForm />
          </Suspense>
        </section>
        <SiteBottom />
      </main>
    </div>
  )
}
