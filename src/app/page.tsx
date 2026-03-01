'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteFooter from '@/components/SiteFooter'
import SeriesRailSection from '@/components/SeriesRailSection'
import { useSoulAuditSubmit } from '@/hooks/useSoulAuditSubmit'
import { MAX_AUDITS_PER_CYCLE } from '@/lib/soul-audit/constants'
import { typographer } from '@/lib/typographer'
import { ALL_SERIES_ORDER, FEATURED_SERIES } from '@/data/series'

const HOW_STEPS = [
  {
    title: '1. Name it.',
    body: 'Name what is real without polishing it. Honest words are enough.',
    image: '/images/illustrations/euangelion-homepage-engraving-09.svg',
  },
  {
    title: '2. Read it.',
    body: 'Review three matched devotional paths and choose where to begin.',
    image: '/images/illustrations/euangelion-homepage-engraving-10.svg',
  },
  {
    title: '3. Now Walk It Out.',
    body: 'Get your curated 5-day plan and take one faithful step each day.',
    image: '/images/illustrations/euangelion-homepage-engraving-11.svg',
  },
]

const FAQ_ITEMS = [
  {
    question: 'What if I am skeptical or feel spiritually numb?',
    answer:
      'This is built for honest questions and earnest searching. Start exactly where you are.',
  },
  {
    question: 'How much time do I need each day?',
    answer:
      'Most days are 5-7 minutes. Long enough to matter, short enough to sustain.',
  },
  {
    question: 'Do I need to sign up first?',
    answer: 'No account required. Start immediately with a custom 5-day plan.',
  },
  {
    question: 'What if I miss a day?',
    answer:
      'No guilt loop. Return the next day and continue your path with the same clarity.',
  },
]

export default function Home() {
  const router = useRouter()
  const {
    text: auditText,
    setText: setAuditText,
    isSubmitting,
    error,
    setError,
    lastFailedSubmission,
    submit: submitAudit,
    reset: handleResetAudit,
    hydrated,
    auditCount,
    limitReached,
    showLowContextHint,
  } = useSoulAuditSubmit()

  const [faqIndex, setFaqIndex] = useState(0)
  const [activeFaqQuestion, setActiveFaqQuestion] = useState<string | null>(
    null,
  )
  const [resumeRoute, setResumeRoute] = useState<string | null>(null)
  const [isMobileViewport, setIsMobileViewport] = useState(false)

  const featuredSlugs = useMemo(() => {
    const seeded = [...FEATURED_SERIES, ...ALL_SERIES_ORDER]
    const deduped = Array.from(new Set(seeded))
    return deduped.slice(0, 6)
  }, [])
  const faqWindow = useMemo(
    () =>
      [0, 1, 2].map(
        (offset) => FAQ_ITEMS[(faqIndex + offset) % FAQ_ITEMS.length],
      ),
    [faqIndex],
  )
  const faqItemsToRender = isMobileViewport ? FAQ_ITEMS : faqWindow

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const hasAuthCallbackParams =
      params.has('code') || params.has('token_hash') || params.has('type')

    if (!hasAuthCallbackParams) return

    const query = params.toString()
    router.replace(`/auth/callback${query ? `?${query}` : ''}`)
  }, [router])

  useEffect(() => {
    if (!isMobileViewport) {
      setActiveFaqQuestion(null)
    }
  }, [isMobileViewport])

  useEffect(() => {
    let cancelled = false

    async function resolveCurrentHome() {
      try {
        const response = await fetch('/api/soul-audit/current', {
          cache: 'no-store',
        })
        if (!response.ok) throw new Error('Current route unavailable.')

        const payload = (await response.json()) as {
          hasCurrent?: boolean
          route?: string
        }
        if (cancelled) return

        if (
          payload.hasCurrent &&
          typeof payload.route === 'string' &&
          payload.route !== '/'
        ) {
          setResumeRoute(payload.route)
        } else {
          setResumeRoute(null)
          localStorage.removeItem('soul-audit-selection-v2')
        }
      } catch {
        if (cancelled) return
        setResumeRoute(null)
      }
    }

    void resolveCurrentHome()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    // Defensive reset in case mobile menu state from another route left scroll locked.
    document.body.style.overflow = ''
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(max-width: 900px)')
    const syncViewport = () => setIsMobileViewport(media.matches)
    syncViewport()
    media.addEventListener('change', syncViewport)
    return () => media.removeEventListener('change', syncViewport)
  }, [])

  return (
    <div className="mock-home mock-homepage">
      <main id="main-content" className="mock-paper">
        <EuangelionShellHeader />

        <section className="homepage-hero" id="start-audit">
          <div className="homepage-hero-art" aria-hidden="true">
            <Image
              src="/images/illustrations/euangelion-homepage-engraving-04.svg"
              alt=""
              fill
              sizes="(max-width: 900px) 100vw, 190px"
              priority
            />
          </div>

          <div className="homepage-hero-main">
            {resumeRoute ? (
              <>
                <p className="text-label mock-kicker">MY DEVOTIONAL</p>
                <h2 className="mock-title mock-homepage-prompt-title">
                  You have a devotional waiting.
                </h2>
                <p className="mock-subcopy">
                  Continue where you left off. Your current path is ready.
                </p>
                <Link
                  href={resumeRoute}
                  className="mock-btn mock-btn-inline text-label"
                >
                  CONTINUE MY DEVOTIONAL
                </Link>
                <button
                  type="button"
                  className="mock-reset-btn text-label"
                  onClick={() => void handleResetAudit()}
                >
                  Reset Audit
                </button>
              </>
            ) : (
              <>
                <p className="text-label mock-kicker">SOUL AUDIT</p>
                <h1 className="mock-title mock-homepage-prompt-title">
                  What are you wrestling with today?
                </h1>
                <p className="mock-subcopy">
                  {typographer(
                    'Name what is real and get matched to a focused devotional path for the season you are actually in.',
                  )}
                </p>

                <textarea
                  value={auditText}
                  onChange={(e) => {
                    setAuditText(e.target.value)
                    setError(null)
                  }}
                  placeholder="Write your paragraph here..."
                  rows={3}
                  disabled={isSubmitting}
                  className="mock-textarea"
                  aria-label="What are you wrestling with today?"
                />

                {/* Sample prompt pills */}
                <div className="homepage-prompt-pills">
                  {[
                    'I feel anxious about my future',
                    'I want to learn about the prophets',
                    'I keep falling into the same sin',
                    'I don\u2019t know what I believe',
                  ].map((pill) => (
                    <button
                      key={pill}
                      type="button"
                      className="homepage-prompt-pill text-label"
                      onClick={() => {
                        setAuditText(pill)
                        setError(null)
                      }}
                      disabled={isSubmitting}
                    >
                      {pill}
                    </button>
                  ))}
                </div>

                {showLowContextHint && (
                  <p className="mock-footnote">
                    Add one more sentence for more precise curation.
                  </p>
                )}

                <button
                  type="button"
                  className="mock-btn mock-btn-inline text-label"
                  onClick={() => void submitAudit(auditText)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'BUILDING YOUR PLAN...' : 'GET MY DEVOTION'}
                </button>
                <p className="mock-footnote">
                  No account required. Start immediately.
                </p>
                {hydrated && auditCount > 0 && !limitReached && (
                  <p className="mock-footnote">
                    Audit {auditCount + 1} of {MAX_AUDITS_PER_CYCLE}
                  </p>
                )}
                {hydrated && limitReached && (
                  <p className="mock-footnote">
                    All {MAX_AUDITS_PER_CYCLE} audits used. Reset to start
                    fresh.
                  </p>
                )}
                <button
                  type="button"
                  className="mock-reset-btn text-label"
                  onClick={() => void handleResetAudit()}
                >
                  Reset Audit
                </button>
                {error && <p className="mock-error">{error}</p>}
                {lastFailedSubmission && !isSubmitting && (
                  <button
                    type="button"
                    className="mock-reset-btn text-label"
                    onClick={() => void submitAudit(lastFailedSubmission)}
                  >
                    Retry Last Submit
                  </button>
                )}
              </>
            )}
          </div>
        </section>

        <section className="mock-section-center">
          <p className="text-label mock-kicker">WHAT ARE YOU EVEN DOING?</p>
          <h2 className="mock-title-center">How this works.</h2>
          <p className="mock-subcopy-center">
            Simple flow. Honest input. Focused output that meets where you are.
          </p>
        </section>

        <section className="mock-steps-grid">
          {HOW_STEPS.map((step) => (
            <article key={step.title} className="mock-step-card">
              <div className="mock-step-image-wrap" aria-hidden="true">
                <div className="mock-step-image">
                  <Image
                    src={step.image}
                    alt=""
                    fill
                    sizes="(max-width: 900px) 100vw, 320px"
                  />
                </div>
              </div>
              <div className="mock-step-copy">
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </article>
          ))}
        </section>

        <SeriesRailSection
          label="Featured Series"
          subtitle="Curated reading paths for common spiritual seasons and questions."
          slugs={featuredSlugs}
          layout="rail"
          cardVariant="large"
        />

        <section className="mock-more-row mock-series-more-row">
          <Link href="/series" className="mock-btn text-label">
            MORE DEVOTIONALS
          </Link>
          <p className="mock-footnote">
            No account required. Start immediately.
          </p>
        </section>

        <section className="mock-faq-row">
          <article className="mock-faq-lead">
            <h3>
              {isMobileViewport
                ? 'Frequently asked questions.'
                : 'Questions before you begin?'}
            </h3>
            <p>
              {isMobileViewport
                ? 'Everything you need to know before you start.'
                : 'Honest answers, clear expectations, no pressure.'}
            </p>
          </article>

          {!isMobileViewport && (
            <button
              type="button"
              className="mock-arrow"
              aria-label="Previous question"
              onClick={() =>
                setFaqIndex(
                  (prev) => (prev - 1 + FAQ_ITEMS.length) % FAQ_ITEMS.length,
                )
              }
            >
              &lt;
            </button>
          )}

          {faqItemsToRender.map((item, idx) => {
            const cardId = `faq-card-${idx}`
            const answerId = `faq-answer-${idx}`
            const isActive =
              isMobileViewport && activeFaqQuestion === item.question

            if (isMobileViewport) {
              return (
                <button
                  type="button"
                  key={`${item.question}-${idx}`}
                  id={cardId}
                  className={`mock-faq-card ${isActive ? 'is-active' : ''}`}
                  aria-expanded={isActive}
                  aria-controls={answerId}
                  onClick={() =>
                    setActiveFaqQuestion((previous) =>
                      previous === item.question ? null : item.question,
                    )
                  }
                >
                  <p className="mock-faq-question">{item.question}</p>
                  <p id={answerId} className="mock-faq-answer">
                    {item.answer}
                  </p>
                </button>
              )
            }

            return (
              <button
                type="button"
                key={`${item.question}-${idx}`}
                id={cardId}
                className="mock-faq-card"
                aria-expanded={false}
                aria-controls={answerId}
              >
                <p className="mock-faq-question">{item.question}</p>
                <p id={answerId} className="mock-faq-answer">
                  {item.answer}
                </p>
              </button>
            )
          })}

          {!isMobileViewport && (
            <button
              type="button"
              className="mock-arrow"
              aria-label="Next question"
              onClick={() =>
                setFaqIndex((prev) => (prev + 1) % FAQ_ITEMS.length)
              }
            >
              &gt;
            </button>
          )}
        </section>
        <section className="mock-more-row">
          <Link href="/help#faq" className="mock-btn text-label">
            VIEW FULL FAQ
          </Link>
        </section>

        {/* Bottom CTA — link to hero rather than duplicate textarea */}
        <section className="mock-cta">
          <p className="text-label mock-kicker">READY TO BEGIN?</p>
          {resumeRoute ? (
            <>
              <h2 className="mock-cta-headline">
                Your devotional is ready to continue.
              </h2>
              <p className="mock-subcopy-center">
                Jump back into your current day and keep your rhythm.
              </p>
              <Link href={resumeRoute} className="mock-btn text-label">
                CONTINUE MY DEVOTIONAL
              </Link>
            </>
          ) : (
            <>
              <h2 className="mock-cta-headline">
                Start with one honest sentence.
              </h2>
              <p className="mock-subcopy-center">
                You do not need certainty before you begin. You need a next
                step. You need grace.
              </p>
              <a href="#start-audit" className="mock-btn text-label">
                START YOUR SOUL AUDIT
              </a>
            </>
          )}
        </section>

        <SiteFooter />
        <section className="mock-bottom-brand">
          <h2 className="text-masthead mock-masthead-word">
            <span className="js-shell-masthead-fit mock-masthead-text">
              EUANGELION
            </span>
          </h2>
        </section>
      </main>
    </div>
  )
}
