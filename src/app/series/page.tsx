'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import { useProgress } from '@/hooks/useProgress'
import { SERIES_DATA, SERIES_ORDER } from '@/data/series'

export default function SeriesBrowsePage() {
  const { getSeriesProgress } = useProgress()

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

      <header className="mx-auto max-w-7xl px-6 pb-16 pt-12 md:px-[60px] md:pb-24 md:pt-20 lg:px-20">
        <div className="observe-fade">
          <h1 className="text-display vw-heading-xl mb-8">All Series</h1>
          <p className="text-serif-italic vw-body-lg text-secondary">
            Seven questions for the searching. Five days per question. Pick one
            that speaks to where you are.
          </p>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto max-w-7xl px-6 pb-32 md:px-[60px] md:pb-48 lg:px-20"
      >
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {SERIES_ORDER.map((slug, index) => {
            const series = SERIES_DATA[slug]
            const progress = getSeriesProgress(slug)
            const isCenter = slug === 'kingdom'

            return (
              <Link
                key={slug}
                href={`/wake-up/series/${slug}`}
                className={`observe-fade group block ${index > 0 ? `stagger-${Math.min(index, 6)}` : ''}`}
              >
                <div
                  className="flex h-full flex-col p-8 transition-all duration-300 md:p-10"
                  style={{
                    backgroundColor: isCenter
                      ? 'var(--color-surface-raised)'
                      : 'var(--color-surface)',
                    border: `1px solid ${isCenter ? 'var(--color-gold)' : 'var(--color-border)'}`,
                    transitionTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
                  }}
                >
                  <p className="text-label vw-small mb-4 text-gold">
                    {String(index + 1).padStart(2, '0')}
                  </p>

                  <h2 className="text-serif-italic vw-body-lg mb-4 transition-colors duration-300 group-hover:text-gold">
                    {series.question}
                  </h2>

                  <p className="vw-small mb-8 flex-1 text-secondary">
                    {series.introduction.slice(0, 120)}...
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-label vw-small text-muted">
                      5 DAYS
                    </span>
                    {progress.completed > 0 ? (
                      <span
                        className="text-label vw-small"
                        style={{ color: 'var(--color-success)' }}
                      >
                        {progress.completed}/{progress.total}
                      </span>
                    ) : (
                      <span className="text-label vw-small text-muted transition-colors duration-300 group-hover:text-[var(--color-text-primary)]">
                        BEGIN &rarr;
                      </span>
                    )}
                  </div>

                  {progress.completed > 0 && (
                    <div className="mt-4">
                      <div
                        className="h-1 w-full overflow-hidden"
                        style={{
                          backgroundColor: 'var(--color-border)',
                          borderRadius: '2px',
                        }}
                      >
                        <div
                          className="h-1 transition-all duration-500"
                          style={{
                            width: `${progress.percentage}%`,
                            backgroundColor: 'var(--color-gold)',
                            borderRadius: '2px',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>

        {/* Soul Audit CTA */}
        <div className="observe-fade mt-16 text-center md:mt-24">
          <p className="vw-body mb-6 text-secondary">
            Not sure where to start?
          </p>
          <Link
            href="/soul-audit"
            className="inline-block bg-[var(--color-fg)] px-10 py-5 text-label vw-small text-[var(--color-bg)] transition-all duration-300 hover:bg-gold hover:text-tehom focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            style={{ transitionTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)' }}
          >
            Take the Soul Audit
          </Link>
        </div>
      </main>

      <footer
        className="py-16 md:py-24"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <div className="mx-auto max-w-7xl px-6 md:px-[60px] lg:px-20">
          <div className="text-center">
            <p className="text-label vw-small leading-relaxed text-muted">
              SOMETHING TO HOLD ONTO.
            </p>
            <p className="vw-small mt-8 text-muted">&copy; 2026 EUANGELION</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
