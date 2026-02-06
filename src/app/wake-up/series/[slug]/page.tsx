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
            entry.target.classList.add('fade-in')
          }
        })
      },
      { threshold: 0.1 },
    )

    const elements = document.querySelectorAll('.observe-fade')
    elements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [])

  if (!series) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream dark:bg-[#1a1a1a]">
        <div className="text-center">
          <h1 className="text-display vw-heading-lg mb-8">Series Not Found</h1>
          <Link
            href="/wake-up"
            className="inline-block bg-black px-10 py-5 text-label vw-small text-cream transition-all duration-300 hover:bg-gray-800"
          >
            ← Back to Wake Up
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream dark:bg-[#1a1a1a]">
      <Navigation />

      {/* Series Introduction */}
      <header className="mx-auto max-w-7xl px-6 pb-20 pt-12 md:px-12 md:pb-32 md:pt-20 lg:px-20">
        <div className="grid gap-8 md:grid-cols-12 md:gap-16">
          <div className="md:col-span-10 md:col-start-2">
            <Link
              href="/wake-up"
              className="observe-fade vw-small mb-12 inline-block text-gray-400 transition-colors duration-300 hover:text-black dark:hover:text-cream"
            >
              ← All Questions
            </Link>

            <div className="observe-fade mb-16 fade-in-delay-1 md:mb-24">
              <h1 className="text-display vw-heading-xl mb-8">
                {series.question}
              </h1>
              <p className="text-label vw-small text-gold">
                {series.framework}
              </p>
            </div>

            <div className="mb-20 grid gap-8 md:mb-32 md:grid-cols-12 md:gap-12">
              <div className="md:col-span-7">
                <p className="observe-fade text-serif-italic vw-body-lg mb-8 fade-in-delay-2">
                  {series.introduction}
                </p>
                <p className="observe-fade vw-body text-gray-700 fade-in-delay-3 dark:text-gray-300">
                  {series.context}
                </p>
              </div>

              <div className="md:col-span-5">
                <div className="observe-fade bg-gray-50 p-8 fade-in-delay-4 dark:bg-[hsl(0,0%,15%)] md:p-10">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-label vw-small text-gold">
                      5-DAY JOURNEY
                    </p>
                    {seriesProgress.completed > 0 && (
                      <span className="text-label vw-small text-green-600">
                        {seriesProgress.completed}/{seriesProgress.total}{' '}
                        Complete
                      </span>
                    )}
                  </div>
                  <p className="vw-body mb-4 leading-relaxed text-gray-700 dark:text-gray-300">
                    This series follows a chiastic structure
                    (A-B-C-B&apos;-A&apos;). Days 1 and 5 mirror each other.
                    Days 2 and 4 mirror each other. Day 3 is the pivot—the core
                    revelation everything builds toward.
                  </p>
                  {seriesProgress.completed > 0 && (
                    <div className="mt-4">
                      <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                          className="h-2 rounded-full bg-green-600 transition-all duration-500"
                          style={{ width: `${seriesProgress.percentage}%` }}
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
        className="mx-auto max-w-7xl px-6 pb-32 md:px-12 md:pb-48 lg:px-20"
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
                    className={`observe-fade ${index > 0 ? `fade-in-delay-${Math.min(index, 4)}` : ''}`}
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
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setLockMessage(null)}
        >
          <div
            className="w-full max-w-md bg-cream p-8 shadow-2xl dark:bg-[#1a1a1a]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-start gap-4">
              <svg
                className="mt-1 h-6 w-6 flex-shrink-0 text-gray-400"
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
                <p className="vw-body mb-4 text-gray-700 dark:text-gray-300">
                  This devotional is locked because it builds on previous days.
                </p>
                <p className="vw-body text-gray-700 dark:text-gray-300">
                  {lockMessage.message}
                </p>
              </div>
            </div>
            <button
              onClick={() => setLockMessage(null)}
              className="w-full bg-black px-6 py-4 text-label vw-small text-cream transition-colors hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-subtle py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-6 md:px-12 lg:px-20">
          <div className="grid gap-8 md:grid-cols-12">
            <div className="md:col-span-6 md:col-start-4">
              <p className="text-label vw-small leading-relaxed text-gray-400">
                VENERATE THE MIRACLE.
                <br />
                DISMANTLE THE HAVEL.
              </p>
              <p className="vw-small mt-8 text-gray-400">
                &copy; 2026 EUANGELION
              </p>
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
      className={`grid gap-6 border-b border-gray-200 py-8 transition-all duration-300 dark:border-gray-700 md:grid-cols-12 md:gap-12 md:py-10 ${!isLocked ? 'group-hover:border-gray-400' : ''} ${day.day === 3 ? 'md:-mx-8 md:bg-gray-50 md:px-8 dark:md:bg-[hsl(0,0%,15%)]' : ''}`}
    >
      <div className="md:col-span-1">
        <span
          className={`text-label vw-small ${isLocked ? 'text-gray-300 dark:text-gray-600' : day.day === 3 ? 'text-gold' : 'text-gray-400'}`}
        >
          DAY {day.day}
        </span>
      </div>

      <div className="md:col-span-9">
        <p
          className={`text-serif-italic vw-body-lg transition-all duration-300 ${isLocked ? 'text-gray-300 dark:text-gray-600' : 'group-hover:translate-x-2'}`}
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
              className="h-4 w-4 text-gray-300 dark:text-gray-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-label vw-small text-gray-300 dark:text-gray-600">
              LOCKED
            </span>
          </>
        ) : (
          <>
            {dayIsRead && (
              <svg
                className="h-5 w-5 text-green-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <span className="text-label vw-small text-gray-400 transition-colors duration-300 group-hover:text-black dark:text-gray-500 dark:group-hover:text-cream">
              {dayIsRead ? 'READ AGAIN →' : 'READ →'}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
