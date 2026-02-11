'use client'

import Link from 'next/link'
import Navigation from '@/components/Navigation'
import SeriesHero from '@/components/SeriesHero'
import ShareButton from '@/components/ShareButton'
import FadeIn from '@/components/motion/FadeIn'
import StaggerGrid from '@/components/motion/StaggerGrid'
import OrnamentDivider from '@/components/OrnamentDivider'
import { typographer } from '@/lib/typographer'
import { useProgress } from '@/hooks/useProgress'
import type { SeriesInfo } from '@/data/series'

export default function SeriesPageClient({
  slug,
  series,
}: {
  slug: string
  series: SeriesInfo
}) {
  const { isRead, getSeriesProgress, canRead } = useProgress()
  const seriesProgress = getSeriesProgress(slug)

  const dayCount = series.days.length

  return (
    <div className="min-h-screen bg-page">
      <Navigation />

      {/* Series Hero Image */}
      <SeriesHero seriesSlug={slug} size="hero" overlay />

      {/* Series Header */}
      <header className="mx-auto max-w-7xl px-6 pb-20 pt-12 md:px-[60px] md:pb-32 md:pt-20 lg:px-20">
        <FadeIn>
          <div className="mb-12 flex items-center justify-between">
            <Link
              href="/series"
              className="vw-small text-muted transition-colors duration-300 hover:text-[var(--color-text-primary)]"
            >
              &larr; All Series
            </Link>
            <ShareButton
              title={series.title}
              text={`${series.title} — Euangelion`}
            />
          </div>
        </FadeIn>

        {/* Grid: content + sidebar */}
        <div className="grid gap-12 md:grid-cols-12 md:gap-16">
          {/* Main content area */}
          <div className="md:col-span-7">
            <FadeIn>
              <div className="mb-12 md:mb-16">
                <p className="type-micro mb-4 text-gold">{series.title}</p>
                <h1
                  className="text-serif-italic vw-heading-xl mb-8"
                  style={{ fontStyle: 'italic' }}
                >
                  {typographer(series.question)}
                </h1>
                <p className="type-micro text-muted">{series.framework}</p>
              </div>
            </FadeIn>

            <FadeIn delay={0.1}>
              <p
                className={`text-serif-italic vw-body-lg mb-8 type-prose type-serif-flow ${series.introduction.length > 200 ? 'columns-prose' : ''}`}
              >
                {typographer(series.introduction)}
              </p>
            </FadeIn>
            <FadeIn delay={0.2}>
              <p className="vw-body text-secondary type-prose">
                {typographer(series.context)}
              </p>
            </FadeIn>
          </div>

          {/* Journey sidebar */}
          <div className="md:col-span-4 md:col-start-9">
            <FadeIn delay={0.15}>
              <div className="bg-surface-raised p-8 md:sticky md:top-24 md:p-10">
                <div className="mb-4 flex items-center justify-between">
                  <p className="type-micro text-gold oldstyle-nums">
                    {dayCount}-DAY JOURNEY
                  </p>
                  {seriesProgress.completed > 0 && (
                    <span
                      className="type-micro oldstyle-nums"
                      style={{ color: 'var(--color-success)' }}
                    >
                      {seriesProgress.completed}/{seriesProgress.total} Complete
                    </span>
                  )}
                </div>
                <p className="vw-body mb-4 leading-relaxed text-secondary type-prose">
                  {dayCount === 5
                    ? 'This series follows a chiastic structure (A-B-C-B\u2019-A\u2019). Days 1 and 5 mirror each other. Days 2 and 4 mirror each other. Day 3 is the pivot\u2014the core revelation everything builds toward.'
                    : `${dayCount} ${dayCount === 1 ? 'day' : 'days'} of guided reading to walk you through this topic, step by step.`}
                </p>
                {seriesProgress.completed > 0 && (
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
                          width: `${seriesProgress.percentage}%`,
                          backgroundColor: 'var(--color-gold)',
                          borderRadius: '2px',
                          transitionTimingFunction:
                            'cubic-bezier(0, 0, 0.2, 1)',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </FadeIn>
          </div>
        </div>
      </header>

      {/* Day List */}
      <main
        id="main-content"
        className="mx-auto max-w-7xl px-6 pb-32 md:px-[60px] md:pb-48 lg:px-20"
      >
        <StaggerGrid className="space-y-12 md:space-y-16" selector="> *">
          {series.days.map((day) => {
            const readingCheck = canRead(day.slug)
            const isLocked = !readingCheck.canRead
            const dayIsRead = isRead(day.slug)
            const isCenter = dayCount === 5 && day.day === 3

            return (
              <div key={day.slug}>
                {isLocked ? (
                  <div className="block opacity-40">
                    <DayBlock
                      day={day}
                      isLocked
                      dayIsRead={false}
                      isCenter={isCenter}
                    />
                  </div>
                ) : (
                  <Link
                    href={`/wake-up/devotional/${day.slug}`}
                    className="group block"
                  >
                    <DayBlock
                      day={day}
                      isLocked={false}
                      dayIsRead={dayIsRead}
                      isCenter={isCenter}
                    />
                  </Link>
                )}
              </div>
            )
          })}
        </StaggerGrid>
      </main>

      {/* Footer */}
      <footer
        className="py-16 md:py-24"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <div className="mx-auto max-w-7xl px-6 md:px-[60px] lg:px-20">
          <div className="text-center">
            <OrnamentDivider />
            <p
              className="text-label vw-small leading-relaxed text-muted"
              style={{ letterSpacing: '0.2em' }}
            >
              SOMETHING TO HOLD ONTO.
            </p>
            <p className="vw-small mt-8 text-muted oldstyle-nums">
              &copy; 2026 EUANGELION
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function DayBlock({
  day,
  isLocked,
  dayIsRead,
  isCenter,
}: {
  day: { day: number; title: string; slug: string }
  isLocked: boolean
  dayIsRead: boolean
  isCenter: boolean
}) {
  return (
    <div
      className={`relative ${isCenter ? 'bg-surface-raised md:-mx-8 md:px-8 md:py-10' : ''}`}
      style={{
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <div className="flex items-center gap-8 md:gap-12">
        {/* Day number — Instrument Serif, oversized */}
        <span
          className={`shrink-0 transition-colors duration-300 oldstyle-nums ${
            isLocked
              ? 'text-tertiary'
              : isCenter
                ? 'text-gold'
                : 'text-muted group-hover:text-secondary'
          }`}
          style={{
            fontFamily: 'var(--font-family-serif)',
            fontSize: 'clamp(3.75rem, 10vw, 10rem)',
            fontWeight: 400,
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}
        >
          {day.day}
        </span>

        {/* Title — serif italic */}
        <div className="flex-1">
          <p
            className={`text-serif-italic vw-body-lg transition-all duration-300 ${
              isLocked ? 'text-tertiary' : 'group-hover:translate-x-2'
            }`}
          >
            <span
              className={
                !isLocked
                  ? 'transition-colors duration-300 group-hover:text-gold'
                  : ''
              }
            >
              {day.title}
            </span>
          </p>
        </div>

        {/* Status icons */}
        <div className="flex shrink-0 items-center gap-3">
          {isLocked ? (
            <svg
              className="h-5 w-5 text-tertiary"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <>
              {dayIsRead && (
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  style={{ color: 'var(--color-success)' }}
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              <span className="hidden type-micro text-muted transition-colors duration-300 group-hover:text-[var(--color-text-primary)] md:inline">
                {dayIsRead ? 'READ AGAIN \u2192' : 'READ \u2192'}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
