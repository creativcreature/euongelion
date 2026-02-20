'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteFooter from '@/components/SiteFooter'
import { createClient as createSupabaseClient } from '@/lib/supabase/client'

type OAuthProvider = 'apple' | 'google'

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
  if (code === 'auth_failed') {
    return 'Sign-in could not be completed. Please try again.'
  }
  return 'Sign-in could not be completed. Please try again.'
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
  const isBusy = status === 'sending' || oauthProvider !== null

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
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmed,
          redirectTo: `/auth/callback?redirect=${encodeURIComponent(redirect)}`,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Something went wrong.')
      }

      setStatus('sent')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something went wrong. Try again.',
      )
      setStatus('error')
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
      <p className="vw-body mb-8 text-center text-secondary">
        Enter your email and we&apos;ll send you a magic link.
      </p>

      {callbackError && (
        <p className="vw-small mb-6 text-center text-secondary">
          {callbackError}
        </p>
      )}

      <div className="mb-6 space-y-3">
        <button
          type="button"
          disabled={isBusy}
          onClick={() => handleOAuth('apple')}
          className="w-full bg-surface-raised px-10 py-4 text-label vw-small text-[var(--color-text-primary)] transition-colors duration-200 hover:bg-[var(--color-fg)] hover:text-[var(--color-bg)] disabled:opacity-50"
          style={{ border: '1px solid var(--color-border)' }}
          aria-label="Continue with Apple"
        >
          {oauthProvider === 'apple' ? 'Connecting...' : 'Continue with Apple'}
        </button>
        <button
          type="button"
          disabled={isBusy}
          onClick={() => handleOAuth('google')}
          className="w-full bg-surface-raised px-10 py-4 text-label vw-small text-[var(--color-text-primary)] transition-colors duration-200 hover:bg-[var(--color-fg)] hover:text-[var(--color-bg)] disabled:opacity-50"
          style={{ border: '1px solid var(--color-border)' }}
          aria-label="Continue with Google"
        >
          {oauthProvider === 'google'
            ? 'Connecting...'
            : 'Continue with Google'}
        </button>
      </div>

      <p className="vw-small mb-6 text-center text-muted">OR USE EMAIL</p>

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

        {error && (
          <p className="vw-small text-center text-secondary">{error}</p>
        )}

        <button
          type="submit"
          disabled={isBusy}
          className="w-full bg-[var(--color-fg)] px-10 py-4 text-label vw-small text-[var(--color-bg)] transition-all duration-300 hover:bg-gold hover:text-tehom disabled:opacity-50"
        >
          {status === 'sending' ? 'Sending...' : 'Send Magic Link'}
        </button>
      </form>

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
        <SiteFooter />
      </main>
    </div>
  )
}
