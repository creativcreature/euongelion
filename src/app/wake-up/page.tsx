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

      {/* Hero Section */}
      <header className="mx-auto max-w-7xl px-6 pb-16 pt-12 md:px-[60px] md:pb-24 md:pt-20 lg:px-20">
        <div className="grid gap-8 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-10 md:col-start-2">
            <div className="observe-fade mb-12 text-center md:mb-16">
              <h1 className="text-display vw-heading-xl mb-6">WAKE UP</h1>
              <p className="text-label vw-small mb-8 text-gold">
                7 SERIES &middot; 35 DEVOTIONALS &middot; 5 DAYS EACH
              </p>
              <p
                className="text-serif-italic vw-body-lg mx-auto mb-10 text-secondary"
                style={{ maxWidth: '50ch' }}
              >
                In a world drowning in noise, Wake Up offers something rare:
                clarity, rest, and truth. Seven questions for the searching.
                Five days per question. Ancient structure. Modern urgency.
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
          </div>
        </div>
      </header>

      {/* Problem Statement */}
      <section
        className="bg-surface py-16 md:py-24"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <div className="mx-auto max-w-7xl px-6 md:px-[60px] lg:px-20">
          <div className="grid gap-8 md:grid-cols-12 md:gap-16">
            <div className="text-center md:col-span-8 md:col-start-3">
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
        </div>
      </section>

      {/* How It Works */}
      <section
        className="py-16 md:py-24"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <div className="mx-auto max-w-7xl px-6 md:px-[60px] lg:px-20">
          <div className="grid gap-8 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-10 md:col-start-2">
              <h2 className="observe-fade text-label vw-small mb-10 text-center text-gold">
                HOW IT WORKS
              </h2>
              <div className="grid gap-8 text-center md:grid-cols-3 md:gap-12">
                <div className="observe-fade">
                  <div className="text-display vw-heading-md mb-4 text-gold">
                    01
                  </div>
                  <p className="vw-body text-secondary">
                    Pick a question that speaks to where you are.
                  </p>
                </div>
                <div className="observe-fade">
                  <div className="text-display vw-heading-md mb-4 text-gold">
                    02
                  </div>
                  <p className="vw-body text-secondary">
                    Read one devotional per day for 5 days.
                  </p>
                </div>
                <div className="observe-fade">
                  <div className="text-display vw-heading-md mb-4 text-gold">
                    03
                  </div>
                  <p className="vw-body text-secondary">
                    Reflect, journal, and let God reorder your heart.
                  </p>
                </div>
              </div>
              <p className="observe-fade vw-body mt-10 text-center text-tertiary">
                Each series follows a chiastic arc—building toward a revelation,
                then reflecting back. Ancient structure. Modern questions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Seven Questions */}
      <main
        id="main-content"
        className="py-20 md:py-32"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <div className="mx-auto max-w-7xl px-6 md:px-[60px] lg:px-20">
          <div className="grid gap-8 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-10 md:col-start-2">
              <h2 className="observe-fade text-label vw-small mb-12 text-center text-gold md:text-left">
                SEVEN QUESTIONS FOR THE SEARCHING
              </h2>

              <div className="space-y-1 md:space-y-2">
                {DEVOTIONAL_SERIES.map((series, index) => (
                  <Link
                    key={series.slug}
                    href={`/wake-up/series/${series.slug}`}
                    className={`observe-fade block ${index > 0 ? `stagger-${Math.min(index, 6)}` : ''}`}
                  >
                    <div
                      className={`group grid gap-6 py-8 transition-all duration-300 md:grid-cols-12 md:gap-12 md:py-10 ${series.isCenter ? 'bg-surface-raised md:-mx-8 md:px-8' : ''}`}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        transitionTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
                      }}
                    >
                      <div className="md:col-span-1">
                        <span className="vw-small font-sans text-muted">
                          {series.number}
                        </span>
                      </div>

                      <div className="md:col-span-9">
                        <p className="text-serif-italic vw-body-lg transition-all duration-300 group-hover:translate-x-2">
                          <span className="transition-colors duration-300 group-hover:text-gold">
                            {series.question}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center justify-end md:col-span-2">
                        <span className="text-label vw-small text-muted transition-colors duration-300 group-hover:text-[var(--color-text-primary)]">
                          BEGIN &rarr;
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className="py-16 md:py-24"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <div className="mx-auto max-w-7xl px-6 md:px-[60px] lg:px-20">
          <div className="grid gap-8 md:grid-cols-12">
            <div className="text-center md:col-span-6 md:col-start-4">
              <p className="observe-fade text-label vw-small leading-relaxed text-muted">
                VENERATE THE MIRACLE.
                <br />
                DISMANTLE THE HAVEL.
              </p>
              <p className="vw-small mt-8 text-muted">&copy; 2026 EUANGELION</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
