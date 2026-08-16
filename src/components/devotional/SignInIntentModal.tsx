'use client'

import { useEffect, useRef, useState } from 'react'
import type { LibraryIntent } from '@/stores/devotionalLibraryStore'

interface SignInIntentModalProps {
  open: boolean
  intent: LibraryIntent | null
  redirectPath: string
  onClose: () => void
}

function describeIntent(intent: LibraryIntent | null): string {
  if (!intent) return 'continue'
  switch (intent.kind) {
    case 'save':
      return 'save this devotional to your library'
    case 'unsave':
      return 'manage your saved devotionals'
    case 'start':
      return intent.mode === 'queue_monday'
        ? 'queue this devotional for Monday'
        : 'start this devotional'
    case 'restart_archive':
      return 'restart a devotional from your library'
    case 'journal':
      return 'keep what you write'
    case 'highlight':
      return 'keep this highlight'
  }
}

export default function SignInIntentModal({
  open,
  intent,
  redirectPath,
  onClose,
}: SignInIntentModalProps) {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const emailRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!open) {
      setSent(false)
      setError(null)
      return
    }
    const frame = window.requestAnimationFrame(() => {
      emailRef.current?.focus()
    })
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('keydown', handleEsc)
      window.cancelAnimationFrame(frame)
    }
  }, [open, onClose])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!email.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const response = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          redirectTo: redirectPath,
        }),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(body?.error ?? 'Unable to send sign-in link.')
      }
      setSent(true)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to send sign-in link.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="library-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signin-intent-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="library-modal-panel">
        <p className="text-label vw-small text-gold mb-2">
          SIGN IN TO CONTINUE
        </p>
        <h2 id="signin-intent-title" className="vw-heading-md mb-3">
          Sign in to {describeIntent(intent)}.
        </h2>
        <p className="vw-body text-secondary mb-5">
          We&rsquo;ll send you a one-tap sign-in link. When you come back,
          we&rsquo;ll pick up right where you left off.
        </p>

        {sent ? (
          <div className="library-modal-success">
            <p className="vw-body">
              Check your inbox — your sign-in link is on its way.
            </p>
            <button
              type="button"
              className="cta-major text-label vw-small mt-4 px-5 py-2"
              onClick={onClose}
            >
              CLOSE
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="library-modal-form">
            <label
              className="library-modal-label"
              htmlFor="signin-intent-email"
            >
              <span className="text-label vw-small text-secondary">EMAIL</span>
              <input
                id="signin-intent-email"
                ref={emailRef}
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="library-modal-input"
              />
            </label>
            {error && (
              <p className="vw-small text-error mt-2" role="alert">
                {error}
              </p>
            )}
            <div className="library-modal-actions mt-4">
              <button
                type="submit"
                className="cta-major text-label vw-small px-5 py-2"
                disabled={submitting || !email.trim()}
              >
                {submitting ? 'SENDING…' : 'SEND SIGN-IN LINK'}
              </button>
              <button
                type="button"
                className="text-label vw-small link-highlight library-modal-tertiary"
                onClick={onClose}
              >
                CANCEL
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
