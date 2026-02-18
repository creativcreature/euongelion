'use client'

import Link from 'next/link'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import MixedHeadline, { Sans, Serif } from '@/components/MixedHeadline'
import SiteFooter from '@/components/SiteFooter'
import FadeIn from '@/components/motion/FadeIn'
import StaggerGrid from '@/components/motion/StaggerGrid'
import { scriptureLeadFromFramework } from '@/lib/scripture-reference'
import { typographer } from '@/lib/typographer'
import { useProgress } from '@/hooks/useProgress'
import {
  SERIES_DATA,
  ALL_SERIES_ORDER,
  WAKEUP_SERIES_ORDER,
  SUBSTACK_SERIES_ORDER,
} from '@/data/series'

export default function SeriesBrowsePage() {
  const { getSeriesProgress } = useProgress()

  return (
    <div className="mock-home">
      <main id="main-content" className="mock-paper">
        <EuangelionShellHeader />

        <header className="shell-content-pad section-rule mx-auto max-w-7xl pb-14 md:pb-20">
          <FadeIn>
            <MixedHeadline as="h1" size="xl" className="mb-8">
              <Sans>ALL</Sans> <Serif>Series</Serif>
            </MixedHeadline>
            <p className="text-serif-italic vw-body-lg text-secondary type-prose type-serif-flow">
              {typographer(
                `${ALL_SERIES_ORDER.length} series. Ancient wisdom for modern wrestling. Pick one that speaks to where you are.`,
              )}
            </p>
          </FadeIn>
        </header>

        <section className="shell-content-pad mx-auto max-w-7xl pt-10">
          {/* Wake-Up 7 */}
          <section className="mb-20">
            <FadeIn>
              <div className="mb-8">
                <MixedHeadline as="p" size="sm" className="text-gold">
                  <Sans>WAKE-UP</Sans> <Serif>Magazine</Serif>
                </MixedHeadline>
                {/* Thin gold rule */}
                <div
                  className="mt-3 mb-4"
                  style={{
                    height: '1px',
                    maxWidth: '200px',
                    background: 'var(--color-gold)',
                    opacity: 0.2,
                  }}
                />
                <p className="vw-small text-muted type-prose">
                  {typographer(
                    'Seven questions for the searching. Five days each.',
                  )}
                </p>
              </div>
            </FadeIn>

            <StaggerGrid className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {WAKEUP_SERIES_ORDER.map((slug) => (
                <SeriesCard
                  key={slug}
                  slug={slug}
                  progress={getSeriesProgress(slug)}
                />
              ))}
            </StaggerGrid>
          </section>

          {/* Substack 19 */}
          <section>
            <FadeIn>
              <div className="mb-8">
                <MixedHeadline as="p" size="sm" className="text-gold">
                  <Sans>DEEP</Sans> <Serif>Dives</Serif>
                </MixedHeadline>
                {/* Thin gold rule */}
                <div
                  className="mt-3 mb-4"
                  style={{
                    height: '1px',
                    maxWidth: '200px',
                    background: 'var(--color-gold)',
                    opacity: 0.2,
                  }}
                />
                <p className="vw-small text-muted type-prose">
                  {typographer(
                    'Topical series from our archive. Dig into specific questions.',
                  )}
                </p>
              </div>
            </FadeIn>

            <StaggerGrid className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {SUBSTACK_SERIES_ORDER.map((slug) => (
                <SeriesCard
                  key={slug}
                  slug={slug}
                  progress={getSeriesProgress(slug)}
                />
              ))}
            </StaggerGrid>
          </section>

          {/* Soul Audit CTA */}
          <FadeIn>
            <div className="mt-16 text-center md:mt-24">
              <p className="vw-body mb-6 text-secondary type-prose">
                {typographer('Not sure where to start?')}
              </p>
              <Link
                href="/"
                className="inline-block bg-[var(--color-fg)] px-10 py-5 text-label vw-small text-[var(--color-bg)] transition-all duration-300 hover:bg-gold hover:text-tehom focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                style={{
                  transitionTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
                }}
              >
                Take the Soul Audit
              </Link>
            </div>
          </FadeIn>
        </section>

        <SiteFooter />
      </main>
    </div>
  )
}

function SeriesCard({
  slug,
  progress,
}: {
  slug: string
  progress: { completed: number; total: number; percentage: number }
}) {
  const series = SERIES_DATA[slug]

  return (
    <Link href={`/wake-up/series/${slug}`} className="group block">
      <div
        className="newspaper-card flex h-full flex-col overflow-hidden transition-all duration-300"
        style={{
          transitionTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
        }}
      >
        <div
          className="mx-6 mt-6 border border-[var(--color-border)] p-4 md:mx-8 md:mt-8 md:p-5"
          style={{ minHeight: '132px' }}
        >
          <p className="text-label vw-small mb-3 text-gold">SCRIPTURE LEAD</p>
          <p className="text-serif-italic vw-body-lg text-[var(--color-text-primary)]">
            {typographer(scriptureLeadFromFramework(series.framework))}
          </p>
        </div>

        <div className="flex flex-1 flex-col p-6 md:p-8">
          <p className="text-label vw-small mb-2 text-gold">{series.title}</p>
          {/* Thin gold rule */}
          <div
            className="mb-3"
            style={{
              height: '1px',
              background: 'var(--color-gold)',
              opacity: 0.2,
            }}
          />

          <h2 className="text-serif-italic vw-body mb-3 transition-colors duration-300 group-hover:text-gold type-serif-flow">
            {series.question}
          </h2>

          <p className="vw-small mb-6 flex-1 text-secondary type-prose">
            {series.introduction.slice(0, 120)}...
          </p>

          <div className="flex items-center justify-between">
            <span className="text-label vw-small text-muted oldstyle-nums">
              {series.days.length} {series.days.length === 1 ? 'DAY' : 'DAYS'}
            </span>
            {progress.completed > 0 ? (
              <span
                className="text-label vw-small oldstyle-nums"
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
