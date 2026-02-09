'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import SeriesHero from '@/components/SeriesHero'
import { SERIES_DATA, FEATURED_SERIES } from '@/data/series'

export default function Home() {
  const [auditText, setAuditText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Inline audit results
  const [auditResults, setAuditResults] = useState<{
    matches: Array<{
      slug: string
      title: string
      question: string
      confidence: number
      reasoning: string
      preview?: { verse: string; paragraph: string }
    }>
  } | null>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('gentle-rise')
          }
        })
      },
      { threshold: 0.15 },
    )

    const elements = document.querySelectorAll('.observe-fade')
    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [auditResults])

  async function handleAuditSubmit() {
    const trimmed = auditText.trim()
    if (trimmed.length === 0) {
      setError("Take your time. When you're ready, just write what comes.")
      return
    }
    if (trimmed.length < 10) {
      setError('Say a little more. Even one sentence helps.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/soul-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: trimmed }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          data.error || "Something broke. It's not you. We're working on it.",
        )
      }

      const data = await res.json()

      // Store in sessionStorage for /soul-audit/results if user navigates there
      sessionStorage.setItem('soul-audit-result', JSON.stringify(data))

      // Build matches array (handle both old and new API format)
      if (data.matches) {
        setAuditResults(data)
      } else if (data.match) {
        // Legacy format: single match + alternatives
        const matches = [
          data.match,
          ...(data.alternatives || []).map(
            (alt: { slug: string; title: string; question: string }) => ({
              ...alt,
              confidence: 0.7,
              reasoning: '',
            }),
          ),
        ].slice(0, 3)
        setAuditResults({ matches })
      }

      // Scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }, 100)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Something broke. Try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-page">
      <Navigation />

      {/* Hero — EUANGELION massive + inline Soul Audit */}
      <header className="flex min-h-[calc(100vh-57px)] flex-col items-center justify-center px-6 text-center">
        {/* Massive wordmark */}
        <h1
          className="landing-reveal landing-reveal-1 text-masthead mb-4 w-full"
          style={{
            fontSize: 'clamp(2.5rem, 10vw, 8rem)',
            lineHeight: 1,
            letterSpacing: '0.15em',
          }}
        >
          EUANGELION
        </h1>

        {/* Meaning */}
        <p className="landing-reveal landing-reveal-1 text-label vw-small mb-8 text-muted">
          EU&middot;AN&middot;GE&middot;LI&middot;ON &mdash; &ldquo;GOOD
          NEWS&rdquo;
        </p>

        {/* Tagline */}
        <p
          className="landing-reveal landing-reveal-2 text-serif-italic mx-auto mb-12"
          style={{
            fontSize: 'clamp(1.5rem, 4vw, 3rem)',
            lineHeight: 1.3,
            maxWidth: '20ch',
          }}
        >
          Daily bread for the cluttered, hungry soul.
        </p>

        {/* Inline Soul Audit */}
        <div className="landing-reveal landing-reveal-3 w-full max-w-xl">
          <p className="vw-body mb-4 text-secondary">
            What are you wrestling with today?
          </p>
          <textarea
            value={auditText}
            onChange={(e) => {
              setAuditText(e.target.value)
              setError(null)
            }}
            placeholder="Lately, I've been..."
            rows={3}
            disabled={isSubmitting}
            className="mb-4 w-full resize-none bg-surface-raised p-5 text-serif-italic vw-body text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none"
            style={{
              border: '1px solid var(--color-border)',
              lineHeight: 1.7,
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--color-gold)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--color-border)'
            }}
          />

          {error && (
            <p className="vw-small mb-4 text-center text-secondary">{error}</p>
          )}

          <button
            onClick={handleAuditSubmit}
            disabled={isSubmitting}
            className="w-full bg-[var(--color-fg)] px-10 py-4 text-label vw-small text-[var(--color-bg)] transition-all duration-300 hover:bg-gold hover:text-tehom disabled:opacity-50"
          >
            {isSubmitting ? 'Listening...' : 'Begin'}
          </button>

          {/* Secondary CTAs */}
          <div className="mt-6 flex items-center justify-center gap-6">
            <Link
              href="/series"
              className="vw-small text-muted transition-colors duration-200 hover:text-[var(--color-text-primary)]"
            >
              Browse All Series
            </Link>
            <span className="text-muted">&middot;</span>
            <Link
              href="/series"
              className="vw-small text-muted transition-colors duration-200 hover:text-[var(--color-text-primary)]"
            >
              Skip to a series
            </Link>
          </div>
        </div>
      </header>

      {/* Inline Soul Audit Results */}
      {auditResults && (
        <section
          ref={resultsRef}
          className="section-breathing"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <div className="mx-auto max-w-7xl px-6 md:px-[60px] lg:px-20">
            <p className="observe-fade text-label vw-small mb-6 text-center text-gold">
              WE FOUND SOMETHING FOR YOU
            </p>
            <h2 className="observe-fade text-serif-italic vw-heading-md mb-12 text-center">
              Here&apos;s where we&apos;ll start.
            </h2>

            {/* 3 Equal Cards */}
            <div className="grid gap-6 md:grid-cols-3">
              {auditResults.matches.slice(0, 3).map((match, index) => (
                <Link
                  key={match.slug}
                  href={`/wake-up/series/${match.slug}`}
                  className="observe-fade group block"
                >
                  <div
                    className="flex h-full flex-col overflow-hidden transition-all duration-300"
                    style={{
                      border: `1px solid ${index === 0 ? 'var(--color-gold)' : 'var(--color-border)'}`,
                    }}
                  >
                    <SeriesHero
                      seriesSlug={match.slug}
                      size="thumbnail"
                      overlay
                    />
                    <div className="flex flex-1 flex-col p-6">
                      <p className="text-label vw-small mb-3 text-gold">
                        {SERIES_DATA[match.slug]?.title || match.title}
                      </p>
                      <p className="text-serif-italic vw-body mb-3 flex-1 transition-colors duration-300 group-hover:text-gold">
                        {match.question}
                      </p>
                      {match.reasoning && (
                        <p className="vw-small mb-4 text-tertiary">
                          {match.reasoning}
                        </p>
                      )}
                      {match.preview && (
                        <div
                          className="mb-4 border-l-2 pl-4"
                          style={{ borderColor: 'var(--color-gold)' }}
                        >
                          <p className="vw-small text-serif-italic text-secondary">
                            &ldquo;{match.preview.verse}&rdquo;
                          </p>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-label vw-small text-muted">
                          {SERIES_DATA[match.slug]?.days.length || '?'} DAYS
                        </span>
                        <span className="text-label vw-small text-muted transition-colors duration-300 group-hover:text-[var(--color-text-primary)]">
                          START &rarr;
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section
        id="main-content"
        className="dot-pattern relative section-breathing"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <div className="mx-auto max-w-7xl px-6 md:px-[60px] lg:px-20">
          <h2 className="observe-fade text-label vw-small mb-16 text-center text-gold">
            HOW IT WORKS
          </h2>
          <div className="mx-auto grid max-w-4xl gap-12 text-center md:grid-cols-3 md:gap-16">
            <div className="observe-fade">
              {/* Compass icon */}
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-gold)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polygon
                    points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"
                    fill="rgba(193,154,107,0.15)"
                    stroke="var(--color-gold)"
                  />
                </svg>
              </div>
              <div
                className="mb-4 text-gold"
                style={{
                  fontFamily: 'var(--font-family-display)',
                  fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                01
              </div>
              <p className="vw-body text-secondary">
                Tell us what you&apos;re wrestling with. We&apos;ll match you to
                a series.
              </p>
            </div>
            <div className="observe-fade stagger-1">
              {/* Book/reading icon */}
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-gold)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path
                    d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"
                    fill="rgba(193,154,107,0.15)"
                  />
                  <path
                    d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"
                    fill="rgba(193,154,107,0.15)"
                  />
                </svg>
              </div>
              <div
                className="mb-4 text-gold"
                style={{
                  fontFamily: 'var(--font-family-display)',
                  fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                02
              </div>
              <p className="vw-body text-secondary">
                Read one devotional per day. Short, deep, honest.
              </p>
            </div>
            <div className="observe-fade stagger-2">
              {/* Heart icon */}
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center">
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="rgba(193,154,107,0.15)"
                  stroke="var(--color-gold)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </div>
              <div
                className="mb-4 text-gold"
                style={{
                  fontFamily: 'var(--font-family-display)',
                  fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                03
              </div>
              <p className="vw-body text-secondary">
                Reflect, journal, and let God reorder your heart.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Full-bleed editorial visual break */}
      <section
        className="relative overflow-hidden"
        style={{
          borderTop: '1px solid var(--color-border)',
          height: 'clamp(200px, 30vw, 400px)',
          background:
            'linear-gradient(135deg, var(--color-tehom) 0%, #2a1f1a 40%, #3d2b1f 70%, rgba(193, 154, 107, 0.2) 100%)',
        }}
      >
        {/* Dot pattern overlay */}
        <div className="dot-pattern-lg absolute inset-0 opacity-30" />
        {/* Radial glow */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at 50% 50%, rgba(193, 154, 107, 0.12) 0%, transparent 60%)',
          }}
        />
        {/* Decorative cross */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            width="80"
            height="80"
            viewBox="0 0 80 80"
            fill="none"
            opacity="0.15"
          >
            <line
              x1="40"
              y1="8"
              x2="40"
              y2="72"
              stroke="var(--color-gold)"
              strokeWidth="1.5"
            />
            <line
              x1="8"
              y1="32"
              x2="72"
              y2="32"
              stroke="var(--color-gold)"
              strokeWidth="1.5"
            />
          </svg>
        </div>
      </section>

      {/* Invitation */}
      <section
        className="bg-surface section-breathing"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <div className="mx-auto max-w-7xl px-6 md:px-[60px] lg:px-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="observe-fade text-serif-italic vw-heading-md mb-10">
              Something brought you here.
            </h2>
            <p className="observe-fade vw-body mb-6 leading-relaxed text-secondary">
              Maybe it&apos;s been a while since you thought about God. Maybe
              you think about Him all the time and feel nothing. Maybe
              you&apos;re tired.
            </p>
            <p className="observe-fade vw-body leading-relaxed text-secondary">
              Whatever it is, you&apos;re welcome here.
            </p>
          </div>
        </div>
      </section>

      {/* What This Is */}
      <section
        className="dot-pattern relative section-breathing"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <div className="mx-auto max-w-7xl px-6 md:px-[60px] lg:px-20">
          <div className="grid gap-16 md:grid-cols-12">
            <div className="md:col-span-5">
              <h2 className="observe-fade text-label vw-small mb-6 text-gold">
                WHAT THIS IS
              </h2>
              <p className="observe-fade text-serif-italic vw-body-lg">
                Honest content for people who believe, used to believe, or want
                to believe but have questions.
              </p>
            </div>
            <div className="md:col-span-6 md:col-start-7">
              <div className="space-y-8">
                <p className="observe-fade vw-body leading-relaxed text-secondary">
                  Each series is a multi-day journey. One reading per day.
                  Designed to be short enough for busy lives and deep enough to
                  be worth your time.
                </p>
                <p className="observe-fade vw-body leading-relaxed text-secondary">
                  We don&apos;t have all the answers. But the questions are
                  worth asking, and you shouldn&apos;t have to ask them alone.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Series */}
      <section
        className="section-breathing"
        style={{
          borderTop: '1px solid var(--color-border)',
        }}
      >
        <div className="mx-auto max-w-7xl px-6 md:px-[60px] lg:px-20">
          <h2 className="observe-fade text-label vw-small mb-12 text-center text-gold">
            FEATURED SERIES
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {FEATURED_SERIES.map((slug) => {
              const series = SERIES_DATA[slug]
              if (!series) return null
              return (
                <Link
                  key={slug}
                  href={`/wake-up/series/${slug}`}
                  className="observe-fade group block"
                >
                  <div
                    className="overflow-hidden transition-all duration-300"
                    style={{
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <SeriesHero seriesSlug={slug} size="card" overlay />
                    <div className="p-6">
                      <p className="text-label vw-small mb-2 text-gold">
                        {series.title.toUpperCase()}
                      </p>
                      <p className="text-serif-italic vw-body transition-colors duration-300 group-hover:text-gold">
                        {series.question}
                      </p>
                      <p className="vw-small mt-4 text-muted">
                        {series.days.length} DAYS
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
          <div className="observe-fade mt-12 text-center">
            <Link
              href="/series"
              className="inline-block px-10 py-4 text-label vw-small text-muted transition-all duration-300 hover:text-[var(--color-text-primary)]"
              style={{
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              View All 26 Series
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="py-16 md:py-24"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <div className="mx-auto max-w-7xl px-6 md:px-[60px] lg:px-20">
          <div className="text-center">
            <p className="observe-fade text-label vw-small leading-relaxed text-muted">
              SOMETHING TO HOLD ONTO.
            </p>
            <div className="mt-8 flex items-center justify-center gap-6">
              <Link
                href="/privacy"
                className="vw-small text-muted transition-colors duration-200 hover:text-[var(--color-text-primary)]"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="vw-small text-muted transition-colors duration-200 hover:text-[var(--color-text-primary)]"
              >
                Terms
              </Link>
            </div>
            <p className="vw-small mt-6 text-muted">&copy; 2026 EUANGELION</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
