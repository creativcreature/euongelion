'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import SeriesHero from '@/components/SeriesHero'
import { useProgress } from '@/hooks/useProgress'
import {
  SERIES_DATA,
  ALL_SERIES_ORDER,
  WAKEUP_SERIES_ORDER,
  SUBSTACK_SERIES_ORDER,
} from '@/data/series'

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
            {ALL_SERIES_ORDER.length} series. Ancient wisdom for modern
            wrestling. Pick one that speaks to where you are.
          </p>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto max-w-7xl px-6 pb-32 md:px-[60px] md:pb-48 lg:px-20"
      >
        {/* Wake-Up 7 */}
        <section className="mb-20">
          <div className="observe-fade mb-8">
            <p className="text-label vw-small text-gold">WAKE-UP MAGAZINE</p>
            <p className="vw-small mt-2 text-muted">
              Seven questions for the searching. Five days each.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {WAKEUP_SERIES_ORDER.map((slug, index) => (
              <SeriesCard
                key={slug}
                slug={slug}
                index={index}
                progress={getSeriesProgress(slug)}
              />
            ))}
          </div>
        </section>

        {/* Substack 19 */}
        <section>
          <div className="observe-fade mb-8">
            <p className="text-label vw-small text-gold">DEEP DIVES</p>
            <p className="vw-small mt-2 text-muted">
              Topical series from our archive. Dig into specific questions.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {SUBSTACK_SERIES_ORDER.map((slug, index) => (
              <SeriesCard
                key={slug}
                slug={slug}
                index={index}
                progress={getSeriesProgress(slug)}
              />
            ))}
          </div>
        </section>

        {/* Soul Audit CTA */}
        <div className="observe-fade mt-16 text-center md:mt-24">
          <p className="vw-body mb-6 text-secondary">
            Not sure where to start?
          </p>
          <Link
            href="/"
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

function SeriesCard({
  slug,
  index,
  progress,
}: {
  slug: string
  index: number
  progress: { completed: number; total: number; percentage: number }
}) {
  const series = SERIES_DATA[slug]

  return (
    <Link
      href={`/wake-up/series/${slug}`}
      className={`observe-fade group block ${index > 0 ? `stagger-${Math.min(index, 6)}` : ''}`}
    >
      <div
        className="flex h-full flex-col overflow-hidden transition-all duration-300"
        style={{
          border: '1px solid var(--color-border)',
          transitionTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
        }}
      >
        <SeriesHero seriesSlug={slug} size="thumbnail" overlay />

        <div className="flex flex-1 flex-col p-6 md:p-8">
          <p className="text-label vw-small mb-3 text-gold">{series.title}</p>

          <h2 className="text-serif-italic vw-body-lg mb-3 transition-colors duration-300 group-hover:text-gold">
            {series.question}
          </h2>

          <p className="vw-small mb-6 flex-1 text-secondary">
            {series.introduction.slice(0, 120)}...
          </p>

          <div className="flex items-center justify-between">
            <span className="text-label vw-small text-muted">
              {series.days.length} {series.days.length === 1 ? 'DAY' : 'DAYS'}
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
            <div className="mt-3">
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
      </div>
    </Link>
  )
}
