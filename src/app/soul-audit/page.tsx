'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'

export default function SoulAuditPage() {
  const [response, setResponse] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nudge, setNudge] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const charCount = response.trim().length

  async function handleSubmit() {
    if (charCount === 0) {
      setError("Take your time. When you're ready, just write what comes.")
      return
    }

    if (charCount < 10 && !nudge) {
      setNudge(true)
      setError('Say a little more. Even one sentence helps.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/soul-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: response.trim() }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          data.error || "Something broke. It's not you. We're working on it.",
        )
      }

      const data = await res.json()

      // Store results in sessionStorage for the results page
      sessionStorage.setItem('soul-audit-result', JSON.stringify(data))
      router.push('/soul-audit/results')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something broke. Try again.',
      )
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-page">
      <Navigation />

      <main
        id="main-content"
        className="flex min-h-[calc(100vh-88px)] flex-col items-center justify-center px-6"
      >
        <div className="w-full max-w-2xl">
          <p className="landing-reveal landing-reveal-1 text-label vw-small mb-6 text-center text-gold">
            SOUL AUDIT
          </p>

          <h1
            className="landing-reveal landing-reveal-2 text-serif-italic mb-6 text-center"
            style={{
              fontSize: 'clamp(2rem, 5vw, 4rem)',
              lineHeight: 1.2,
            }}
          >
            What are you wrestling with today?
          </h1>

          <p className="landing-reveal landing-reveal-3 vw-body mb-12 text-center text-secondary">
            You don&apos;t have to have it figured out. Just start writing.
          </p>

          <div className="landing-reveal landing-reveal-3">
            <textarea
              ref={textareaRef}
              value={response}
              onChange={(e) => {
                setResponse(e.target.value)
                setError(null)
                setNudge(false)
              }}
              placeholder="Lately, I've been..."
              rows={6}
              disabled={isSubmitting}
              className="mb-6 w-full resize-none bg-surface-raised p-6 text-serif-italic vw-body-lg text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none"
              style={{
                border: '1px solid var(--color-border)',
                lineHeight: 1.8,
                transition: 'border-color 300ms cubic-bezier(0, 0, 0.2, 1)',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--color-gold)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--color-border)'
              }}
            />

            {error && (
              <p className="vw-body mb-6 text-center text-secondary">{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full bg-[var(--color-fg)] px-10 py-5 text-label vw-small text-[var(--color-bg)] transition-all duration-300 hover:bg-gold hover:text-tehom focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-50"
              style={{
                transitionTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
              }}
            >
              {isSubmitting ? 'Listening...' : 'Continue'}
            </button>

            <p className="vw-small mt-8 text-center text-muted">
              This is between you and the page. Your response helps us find
              content that speaks to where you are.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
