'use client'

import { useState, useRef, useEffect, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteFooter from '@/components/SiteFooter'
import FadeIn from '@/components/motion/FadeIn'
import { submitSoulAuditResponse } from '@/lib/soul-audit/submit-client'
import { useSoulAuditStore } from '@/stores/soulAuditStore'
import { typographer } from '@/lib/typographer'
import type { SoulAuditSubmitResponseV2 } from '@/types/soul-audit'

const emptySubscribe = () => () => {}

const GATHERING_MESSAGES = [
  'Reading your reflection\u2026',
  'Searching Scripture\u2026',
  'Building three paths\u2026',
  'Shaping your options\u2026',
  'Almost ready\u2026',
]

export default function SoulAuditPage() {
  const [response, setResponse] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFailedSubmission, setLastFailedSubmission] = useState<
    string | null
  >(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()
  const hydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )
  const { auditCount, recordAudit, hasReachedLimit, resetAudit } =
    useSoulAuditStore()
  const limitReached = hydrated && hasReachedLimit()
  const shortInputWordCount = response
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0).length
  const showLowContextHint = shortInputWordCount > 0 && shortInputWordCount <= 3

  // Cycling status messages while LLM generates options
  const [gatheringIdx, setGatheringIdx] = useState(0)
  useEffect(() => {
    if (!isSubmitting) {
      setGatheringIdx(0)
      return
    }
    const id = setInterval(() => {
      setGatheringIdx((prev) =>
        prev < GATHERING_MESSAGES.length - 1 ? prev + 1 : prev,
      )
    }, 6_000)
    return () => clearInterval(id)
  }, [isSubmitting])

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleResetAudit = async () => {
    resetAudit()
    setError(null)
    setResponse('')
    setLastFailedSubmission(null)
    localStorage.removeItem('soul-audit-result')
    localStorage.removeItem('soul-audit-submit-v2')
    localStorage.removeItem('soul-audit-selection-v2')

    try {
      const response = await fetch('/api/soul-audit/reset', {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error('Unable to reset server audit state.')
      }
    } catch {
      setError(
        'Local audit state was reset, but server reset failed. Please try once more.',
      )
    }
  }

  async function submitResponse(raw: string) {
    const trimmedResponse = raw.trim()
    const charCount = trimmedResponse.length

    if (limitReached) {
      setError('You\u2019ve explored enough. Time to dive in.')
      setLastFailedSubmission(null)
      return
    }

    if (charCount === 0) {
      setError('Take your time. When you\u2019re ready, just write what comes.')
      setLastFailedSubmission(null)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const data = (await submitSoulAuditResponse({
        response: trimmedResponse,
      })) as SoulAuditSubmitResponseV2
      localStorage.setItem('soul-audit-submit-v2', JSON.stringify(data))
      localStorage.removeItem('soul-audit-selection-v2')
      recordAudit(trimmedResponse, data)
      setLastFailedSubmission(null)
      router.push('/soul-audit/results')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something broke. Try again.',
      )
      setLastFailedSubmission(trimmedResponse)
      setIsSubmitting(false)
    }
  }

  async function handleSubmit() {
    await submitResponse(response)
  }

  return (
    <div className="mock-home">
      <main id="main-content" className="mock-paper">
        <EuangelionShellHeader />

        <section className="shell-content-pad flex min-h-[calc(100vh-120px)] flex-col items-center justify-center px-2">
          <div className="w-full max-w-2xl">
            {/* Line-Level Contrast: sans label above, serif italic question below */}
            <FadeIn y={0}>
              <p className="text-label vw-small mb-6 text-center text-gold type-caption">
                SOUL AUDIT
              </p>
            </FadeIn>

            <FadeIn delay={0.15} y={12}>
              <h1 className="vw-heading-md mb-6 text-center">
                {typographer('What are you wrestling with today?')}
              </h1>
            </FadeIn>

            <FadeIn delay={0.3} y={8}>
              <p className="vw-body mb-12 text-center text-secondary type-prose">
                {typographer(
                  'You don\u2019t have to have it figured out. Just start writing.',
                )}
              </p>
            </FadeIn>

            <FadeIn delay={0.4} y={16}>
              {isSubmitting ? (
                /* ── Gathering-options loader ── */
                <div className="flex flex-col items-center py-16" role="status" aria-live="polite">
                  {/* Animated dot cluster */}
                  <div className="mb-10 flex items-center gap-2">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="inline-block h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: 'var(--color-gold)',
                          animation: `gatherDot 1.4s ease-in-out ${i * 0.2}s infinite`,
                        }}
                      />
                    ))}
                  </div>

                  {/* Cycling status message */}
                  <p
                    key={gatheringIdx}
                    className="text-serif-italic vw-body-lg text-center text-secondary"
                    style={{
                      animation: 'fadeInUp 0.5s ease-out',
                    }}
                  >
                    {GATHERING_MESSAGES[gatheringIdx]}
                  </p>

                  <p className="vw-small mt-6 text-center text-muted">
                    This usually takes 30\u201360 seconds.
                  </p>

                  {/* Inline keyframes */}
                  <style>{`
                    @keyframes gatherDot {
                      0%, 100% { opacity: 0.3; transform: scale(0.85); }
                      50%      { opacity: 1;   transform: scale(1.15); }
                    }
                    @keyframes fadeInUp {
                      from { opacity: 0; transform: translateY(8px); }
                      to   { opacity: 1; transform: translateY(0); }
                    }
                  `}</style>
                </div>
              ) : limitReached ? (
                <div className="py-8 text-center">
                  <p className="text-serif-italic vw-body-lg mb-8 text-secondary">
                    {typographer(
                      'You\u2019ve explored enough. Time to dive in.',
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleResetAudit()}
                    className="text-label vw-small mb-6 inline-flex border border-[var(--color-border)] px-6 py-3"
                  >
                    Reset Audit
                  </button>
                  <Link
                    href="/series"
                    className="cta-major text-label vw-small inline-flex w-full px-10 py-5"
                  >
                    Browse All Series &rarr;
                  </Link>
                </div>
              ) : (
                <div>
                  {hydrated && auditCount > 0 && (
                    <div className="mb-4 grid justify-items-center gap-2">
                      <p className="vw-small text-center text-muted">
                        Audit {auditCount + 1} of 3
                      </p>
                      <button
                        type="button"
                        onClick={() => void handleResetAudit()}
                        className="text-label vw-small border border-[var(--color-border)] px-4 py-2"
                      >
                        Reset Audit
                      </button>
                    </div>
                  )}

                  <textarea
                    ref={textareaRef}
                    value={response}
                    onChange={(e) => {
                      setResponse(e.target.value)
                      setError(null)
                    }}
                    placeholder="Lately, I've been..."
                    rows={6}
                    disabled={isSubmitting}
                    aria-label="What are you wrestling with today?"
                    className="mb-6 w-full resize-none bg-surface-raised p-6 text-serif-italic vw-body-lg text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none"
                    style={{
                      border: '1px solid var(--color-border)',
                      lineHeight: 1.8,
                      transition:
                        'border-color 300ms cubic-bezier(0, 0, 0.2, 1)',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'var(--color-gold)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'var(--color-border)'
                    }}
                  />
                  {showLowContextHint && (
                    <p className="vw-small mb-6 text-center text-muted">
                      Add one more sentence for more precise curation.
                    </p>
                  )}

                  {error && (
                    <p className="vw-body mb-6 text-center text-secondary">
                      {error}
                    </p>
                  )}
                  {error && lastFailedSubmission && !isSubmitting && (
                    <div className="mb-6 text-center">
                      <button
                        type="button"
                        className="text-label vw-small border border-[var(--color-border)] px-5 py-2"
                        onClick={() =>
                          void submitResponse(lastFailedSubmission)
                        }
                      >
                        Retry Last Submit
                      </button>
                    </div>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="cta-major text-label vw-small w-full px-10 py-5 disabled:opacity-50"
                    style={{
                      transitionTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
                    }}
                  >
                    Continue
                  </button>

                  <p className="vw-small mt-8 text-center text-muted">
                    {typographer(
                      'This is between you and the page. We will show five options first, then build the full 5-day plan after you choose.',
                    )}
                  </p>
                </div>
              )}
            </FadeIn>
          </div>
        </section>
        <SiteFooter />
      </main>
    </div>
  )
}
