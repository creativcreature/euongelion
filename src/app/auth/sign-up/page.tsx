'use client'

import Link from 'next/link'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteFooter from '@/components/SiteFooter'

function normalizeRedirectPath(value: string | null): string {
  if (!value) return '/'
  const trimmed = value.trim()
  if (!trimmed.startsWith('/')) return '/'
  if (trimmed.startsWith('//')) return '/'
  if (trimmed.includes('://')) return '/'
  if (trimmed.length > 240) return '/'
  return trimmed
}

function SignUpForm() {
  const searchParams = useSearchParams()
  const redirect = normalizeRedirectPath(searchParams.get('redirect'))
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    'idle',
  )
  const [error, setError] = useState('')

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
          You&apos;re almost in.
        </h1>
        <p className="vw-body mb-8 text-secondary">
          Click the link in your email to complete sign up and continue.
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
      <p className="text-label vw-small mb-4 text-center text-gold">SIGN UP</p>
      <h1 className="text-serif-italic vw-heading-md mb-3 text-center">
        Create your account.
      </h1>
      <p className="vw-body mb-10 text-center text-secondary">
        Use email magic link. No password needed.
      </p>

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
          disabled={status === 'sending'}
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
          disabled={status === 'sending'}
          className="w-full bg-[var(--color-fg)] px-10 py-4 text-label vw-small text-[var(--color-bg)] transition-all duration-300 hover:bg-gold hover:text-tehom disabled:opacity-50"
        >
          {status === 'sending' ? 'Sending...' : 'Send Sign Up Link'}
        </button>
      </form>

      <div className="mt-8 text-center">
        <Link
          href={`/auth/sign-in?redirect=${encodeURIComponent(redirect)}`}
          className="vw-small text-muted transition-colors duration-200 hover:text-[var(--color-text-primary)]"
        >
          Already have an account? Sign in
        </Link>
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <div className="newspaper-home min-h-screen">
      <EuangelionShellHeader />
      <main
        id="main-content"
        className="mx-auto flex min-h-[calc(100vh-64px)] max-w-md flex-col items-center justify-center px-6"
      >
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
      </main>
      <SiteFooter />
    </div>
  )
}
