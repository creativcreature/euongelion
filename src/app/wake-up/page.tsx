'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import Navigation from '@/components/Navigation'
import { DEVOTIONAL_SERIES } from '@/data/series'

export default function WakeUpPage() {
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
    <div className="bg-page min-h-screen">
      <Navigation />

      {/* Full-viewport Hero */}
      <header className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="observe-fade">
          <h1
            className="text-display mb-6"
            style={{ fontSize: 'clamp(3rem, 8vw, 6rem)', lineHeight: 1 }}
          >
            WAKE UP
          </h1>
          <p className="text-label vw-small mb-8 text-gold">
            7 SERIES &middot; 35 DEVOTIONALS &middot; 5 DAYS EACH
          </p>
          <p
            className="text-serif-italic vw-body-lg mx-auto mb-16 text-secondary"
            style={{ maxWidth: '50ch' }}
          >
            In a world drowning in noise, Wake Up offers something rare:
            clarity, rest, and truth. Seven questions for the searching. Five
            days per question. Ancient structure. Modern urgency.
          </p>
          <Link
            href="/wake-up/series/identity"
            className="inline-block bg-[var(--color-fg)] px-10 py-5 text-label vw-small text-[var(--color-bg)] transition-all duration-300 hover:bg-gold hover:text-tehom focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            style={{
              transitionTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
            }}
          >
            Start with Question 01
          </Link>
        </div>
      </header>

      {/* Problem Statement — full-width surface */}
      <section
        className="bg-surface section-breathing"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <div className="mx-auto max-w-7xl px-6 md:px-[60px] lg:px-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="observe-fade vw-body mb-6 text-secondary">
              We live in apocalyptic times. Political violence. Economic
              collapse. 43% more anxious than last year. The ground beneath us
              is shaking.
            </p>
            <p className="observe-fade text-serif-italic vw-body-lg">
              The seven questions below aren&apos;t easy. But they&apos;re
              honest. Each one invites you into a 5-day journey to seek first
              the kingdom—and discover that everything else gets added.
            </p>
          </div>
        </div>
      </section>

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
            Each series follows a chiastic arc—building toward a revelation,
            then reflecting back. Ancient structure. Modern questions.
          </p>
        </div>
      </section>

      {/* Seven Questions — the main event */}
      <main
        id="main-content"
        className="section-breathing"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
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
                    {/* Large section number */}
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

                    {/* Question text */}
                    <div className="flex-1">
                      <p className="text-serif-italic vw-body-lg transition-all duration-300 group-hover:translate-x-2">
                        <span className="transition-colors duration-300 group-hover:text-gold">
                          {series.question}
                        </span>
                      </p>
                    </div>

                    {/* BEGIN arrow */}
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

      {/* Footer */}
      <footer
        className="py-16 md:py-24"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <div className="mx-auto max-w-7xl px-6 md:px-[60px] lg:px-20">
          <div className="text-center">
            <p className="observe-fade text-label vw-small leading-relaxed text-muted">
              VENERATE THE MIRACLE.
              <br />
              DISMANTLE THE HAVEL.
            </p>
            <p className="vw-small mt-8 text-muted">&copy; 2026 EUANGELION</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
