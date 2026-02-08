'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import { DEVOTIONAL_SERIES } from '@/data/series'

export default function Home() {
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
  }, [])

  return (
    <div className="min-h-screen bg-page">
      <Navigation />

      {/* Hero — full viewport, typography-forward */}
      <header className="flex min-h-[calc(100vh-88px)] flex-col items-center justify-center px-6 text-center">
        <p className="landing-reveal landing-reveal-1 text-label vw-small mb-8 text-gold">
          EU&middot;AN&middot;GE&middot;LION &middot; GREEK: &ldquo;GOOD
          NEWS&rdquo;
        </p>

        <h1
          className="landing-reveal landing-reveal-2 text-serif-italic mx-auto mb-10"
          style={{
            fontSize: 'clamp(2.5rem, 7vw, 5.5rem)',
            lineHeight: 1.15,
            maxWidth: '18ch',
          }}
        >
          Daily bread for the cluttered, hungry soul.
        </h1>

        <p
          className="landing-reveal landing-reveal-3 mx-auto mb-16 text-secondary"
          style={{
            fontSize: 'clamp(1rem, 1.3vw, 1.25rem)',
            maxWidth: '50ch',
            lineHeight: 1.8,
          }}
        >
          Short daily readings that meet you where you are. No tracking. No
          performance. Just content worth your time.
        </p>

        <div className="landing-reveal landing-reveal-3 flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
          <Link
            href="/soul-audit"
            className="inline-block bg-[var(--color-fg)] px-10 py-5 text-label vw-small text-[var(--color-bg)] transition-all duration-300 hover:bg-gold hover:text-tehom focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            style={{
              transitionTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
            }}
          >
            Take the Soul Audit
          </Link>
          <Link
            href="/wake-up"
            className="inline-block px-10 py-5 text-label vw-small text-muted transition-all duration-300 hover:text-[var(--color-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            style={{
              borderBottom: '1px solid var(--color-border)',
              transitionTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
            }}
          >
            Start Reading
          </Link>
        </div>

        {/* Scroll indicator */}
        <div className="landing-reveal landing-reveal-4 mt-auto pb-12">
          <svg
            className="scroll-indicator h-6 w-6 text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </header>

      {/* Invitation — full-width surface */}
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
        className="section-breathing"
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
                  Each series is five days. One reading per day. Designed to be
                  short enough for busy lives and deep enough to be worth your
                  time.
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

      {/* Soul Audit CTA */}
      <section
        className="section-breathing"
        style={{
          borderTop: '1px solid var(--color-border)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <div className="mx-auto max-w-7xl px-6 md:px-[60px] lg:px-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="observe-fade text-label vw-small mb-6 text-gold">
              SOUL AUDIT
            </p>
            <h2
              className="observe-fade text-serif-italic mb-8"
              style={{
                fontSize: 'clamp(2rem, 5vw, 4rem)',
                lineHeight: 1.2,
              }}
            >
              What are you wrestling with today?
            </h2>
            <p className="observe-fade vw-body mb-12 text-secondary">
              Answer one question. We&apos;ll match you with a series that
              speaks to where you are right now. No categories. No labels. Just
              a starting point.
            </p>
            <Link
              href="/soul-audit"
              className="observe-fade inline-block bg-[var(--color-fg)] px-10 py-5 text-label vw-small text-[var(--color-bg)] transition-all duration-300 hover:bg-gold hover:text-tehom focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              style={{
                transitionTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
              }}
            >
              Begin
            </Link>
          </div>
        </div>
      </section>

      {/* Seven Questions */}
      <main id="main-content" className="section-breathing">
        <div className="mx-auto max-w-7xl px-6 md:px-[60px] lg:px-20">
          <h2 className="observe-fade text-label vw-small mb-16 text-center text-gold md:text-left">
            SEVEN QUESTIONS FOR THE SEARCHING
          </h2>

          <div>
            {DEVOTIONAL_SERIES.map((series, index) => (
              <Link
                key={series.slug}
                href={`/wake-up/series/${series.slug}`}
                className={`observe-fade block ${index > 0 ? `stagger-${Math.min(index, 6)}` : ''}`}
              >
                <div
                  className={`group py-10 transition-all duration-300 md:py-14 ${series.isCenter ? 'bg-surface-raised md:-mx-8 md:px-8' : ''}`}
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    transitionTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
                  }}
                >
                  <div className="flex items-start gap-6 md:gap-10">
                    <span
                      className={`shrink-0 transition-colors duration-300 ${series.isCenter ? 'text-gold' : 'text-muted group-hover:text-secondary'}`}
                      style={{
                        fontFamily: 'var(--font-family-display)',
                        fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
                        fontWeight: 100,
                        lineHeight: 1.2,
                      }}
                    >
                      {series.number}
                    </span>

                    <div className="flex-1">
                      <p className="text-serif-italic vw-body-lg transition-all duration-300 group-hover:translate-x-2">
                        <span className="transition-colors duration-300 group-hover:text-gold">
                          {series.question}
                        </span>
                      </p>
                    </div>

                    <span className="hidden shrink-0 self-center text-label vw-small text-muted transition-colors duration-300 group-hover:text-[var(--color-text-primary)] md:inline-block">
                      BEGIN &rarr;
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>

      {/* How It Works */}
      <section
        className="section-breathing"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <div className="mx-auto max-w-7xl px-6 md:px-[60px] lg:px-20">
          <h2 className="observe-fade text-label vw-small mb-16 text-center text-gold">
            HOW IT WORKS
          </h2>
          <div className="mx-auto grid max-w-4xl gap-12 text-center md:grid-cols-3 md:gap-16">
            <div className="observe-fade">
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
                Pick a question that speaks to where you are.
              </p>
            </div>
            <div className="observe-fade stagger-1">
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
                Read one devotional per day for 5 days.
              </p>
            </div>
            <div className="observe-fade stagger-2">
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
          <p className="observe-fade vw-body mt-16 text-center text-tertiary">
            Each series follows a chiastic arc&mdash;building toward a
            revelation, then reflecting back. Ancient structure. Modern
            questions.
          </p>
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
            <p className="vw-small mt-8 text-muted">&copy; 2026 EUANGELION</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
