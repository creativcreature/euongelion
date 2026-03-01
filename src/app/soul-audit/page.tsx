'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteFooter from '@/components/SiteFooter'
import FadeIn from '@/components/motion/FadeIn'
import { useSoulAuditSubmit } from '@/hooks/useSoulAuditSubmit'
import { typographer } from '@/lib/typographer'

export default function SoulAuditPage() {
  const {
    text: response,
    setText: setResponse,
    isSubmitting,
    error,
    lastFailedSubmission,
    submit: submitResponse,
    reset: handleResetAudit,
    hydrated,
    auditCount,
    limitReached,
    showLowContextHint,
  } = useSoulAuditSubmit()

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  return (
    <div className="mock-home">
      <main id="main-content" className="mock-paper">
        <EuangelionShellHeader />

        <section className="shell-content-pad flex min-h-[calc(100vh-120px)] flex-col items-center justify-center px-2">
          <div className="w-full max-w-2xl">
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
                <div
                  className="flex flex-col items-center py-16"
                  role="status"
                  aria-live="polite"
                >
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

                  <p className="text-serif-italic vw-body-lg text-center text-secondary">
                    Building your paths...
                  </p>

                  <style>{`
                    @keyframes gatherDot {
                      0%, 100% { opacity: 0.3; transform: scale(0.85); }
                      50%      { opacity: 1;   transform: scale(1.15); }
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
                    onClick={() => void submitResponse(response)}
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
                      'This is between you and the page. We will show three matched paths, then build the full 5-day plan after you choose.',
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
