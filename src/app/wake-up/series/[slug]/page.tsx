'use client'

import { useEffect, use, useState } from 'react'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import { useProgress } from '@/hooks/useProgress'
import { SERIES_DATA } from '@/data/series'

export default function SeriesPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  const series = SERIES_DATA[slug]
  const { isRead, getSeriesProgress, canRead } = useProgress()
  const seriesProgress = series
    ? getSeriesProgress(slug)
    : { completed: 0, total: 5, percentage: 0 }
  const [lockMessage, setLockMessage] = useState<{
    slug: string
    message: string
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
  }, [])

  if (!series) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <div className="text-center">
          <h1 className="text-display vw-heading-lg mb-8">Series Not Found</h1>
          <Link
            href="/wake-up"
            className="inline-block bg-[var(--color-fg)] px-10 py-5 text-label vw-small text-[var(--color-bg)] transition-all duration-300 hover:bg-gold hover:text-tehom"
          >
            &larr; Back to Wake Up
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-page">
      <Navigation />

      {/* Series Introduction */}
      <header className="mx-auto max-w-7xl px-6 pb-20 pt-12 md:px-[60px] md:pb-32 md:pt-20 lg:px-20">
        <div className="grid gap-8 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-10 md:col-start-2">
            <Link
              href="/wake-up"
              className="observe-fade vw-small mb-12 inline-block text-muted transition-colors duration-300 hover:text-[var(--color-text-primary)]"
            >
              &larr; All Questions
            </Link>

            <div className="observe-fade mb-16 md:mb-24">
              <h1 className="text-display vw-heading-xl mb-8">
                {series.question}
              </h1>
              <p className="text-label vw-small text-gold">
                {series.framework}
              </p>
            </div>

            <div className="mb-20 grid gap-8 md:mb-32 md:grid-cols-12 md:gap-12">
              <div className="md:col-span-7">
                <p className="observe-fade text-serif-italic vw-body-lg mb-8">
                  {series.introduction}
                </p>
                <p className="observe-fade vw-body text-secondary">
                  {series.context}
                </p>
              </div>

              <div className="md:col-span-5">
                <div className="observe-fade bg-surface-raised p-8 md:p-10">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-label vw-small text-gold">
                      5-DAY JOURNEY
                    </p>
                    {seriesProgress.completed > 0 && (
                      <span className="text-label vw-small text-[var(--color-success)]">
                        {seriesProgress.completed}/{seriesProgress.total}{' '}
                        Complete
                      </span>
                    )}
                  </div>
                  <p className="vw-body mb-4 leading-relaxed text-secondary">
                    This series follows a chiastic structure
                    (A-B-C-B&apos;-A&apos;). Days 1 and 5 mirror each other.
                    Days 2 and 4 mirror each other. Day 3 is the pivot—the core
                    revelation everything builds toward.
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
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 5 Days */}
      <main
        id="main-content"
        className="mx-auto max-w-7xl px-6 pb-32 md:px-[60px] md:pb-48 lg:px-20"
      >
        <div className="grid gap-8 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-10 md:col-start-2">
            <div className="space-y-1 md:space-y-2">
              {series.days.map((day, index) => {
                const readingCheck = canRead(day.slug)
                const isLocked = !readingCheck.canRead
                const dayIsRead = isRead(day.slug)

                return (
                  <div
                    key={day.slug}
                    className={`observe-fade ${index > 0 ? `stagger-${Math.min(index, 6)}` : ''}`}
                  >
                    {isLocked ? (
                      <div
                        onClick={() =>
                          setLockMessage({
                            slug: day.slug,
                            message:
                              readingCheck.reason ||
                              'Complete previous devotionals first',
                          })
                        }
                        className="block cursor-help opacity-50"
                      >
                        <DayRow day={day} isLocked dayIsRead={false} />
                      </div>
                    ) : (
                      <Link
                        href={`/wake-up/devotional/${day.slug}`}
                        className="group block"
                      >
                        <DayRow
                          day={day}
                          isLocked={false}
                          dayIsRead={dayIsRead}
                        />
                      </Link>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Lock Message Modal */}
      {lockMessage && (
        <div
          className="fixed inset-0 flex items-center justify-center px-6"
          style={{
            backgroundColor: 'var(--color-overlay)',
            zIndex: 400,
          }}
          onClick={() => setLockMessage(null)}
        >
          <div
            className="w-full max-w-md bg-page p-8"
            style={{
              boxShadow: 'var(--shadow-xl)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-start gap-4">
              <svg
                className="mt-1 h-6 w-6 flex-shrink-0 text-muted"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h3 className="text-display vw-heading-md mb-4">
                  Devotional Locked
                </h3>
                <p className="vw-body mb-4 text-secondary">
                  This devotional is locked because it builds on previous days.
                </p>
                <p className="vw-body text-secondary">{lockMessage.message}</p>
              </div>
            </div>
            <button
              onClick={() => setLockMessage(null)}
              className="w-full bg-[var(--color-fg)] px-6 py-4 text-label vw-small text-[var(--color-bg)] transition-colors duration-300 hover:bg-gold hover:text-tehom focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer
        className="py-16 md:py-24"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <div className="mx-auto max-w-7xl px-6 md:px-[60px] lg:px-20">
          <div className="grid gap-8 md:grid-cols-12">
            <div className="md:col-span-6 md:col-start-4">
              <p className="text-label vw-small leading-relaxed text-muted">
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

function DayRow({
  day,
  isLocked,
  dayIsRead,
}: {
  day: { day: number; title: string; slug: string }
  isLocked: boolean
  dayIsRead: boolean
}) {
  return (
    <div
      className={`grid gap-6 py-8 transition-all duration-300 md:grid-cols-12 md:gap-12 md:py-10 ${!isLocked ? 'group-hover:border-[var(--color-border-strong)]' : ''} ${day.day === 3 ? 'bg-surface-raised md:-mx-8 md:px-8' : ''}`}
      style={{
        borderBottom: '1px solid var(--color-border)',
        transitionTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
      }}
    >
      <div className="md:col-span-1">
        <span
          className={`text-label vw-small ${isLocked ? 'text-tertiary' : day.day === 3 ? 'text-gold' : 'text-muted'}`}
        >
          DAY {day.day}
        </span>
      </div>

      <div className="md:col-span-9">
        <p
          className={`text-serif-italic vw-body-lg transition-all duration-300 ${isLocked ? 'text-tertiary' : 'group-hover:translate-x-2'}`}
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

      <div className="flex items-center justify-end gap-4 md:col-span-2">
        {isLocked ? (
          <>
            <svg
              className="h-4 w-4 text-tertiary"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-label vw-small text-tertiary">LOCKED</span>
          </>
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
            <span className="text-label vw-small text-muted transition-colors duration-300 group-hover:text-[var(--color-text-primary)]">
              {dayIsRead ? 'READ AGAIN \u2192' : 'READ \u2192'}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
