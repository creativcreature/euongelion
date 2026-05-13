'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import Breadcrumbs from '@/components/Breadcrumbs'
import SiteFooter from '@/components/SiteFooter'
import { useProgress } from '@/hooks/useProgress'
import type { SeriesInfo } from '@/data/series'
import { typographer } from '@/lib/typographer'

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

// Day-of-year → month + day-of-month for 2026 (non-leap year).
// Days 1-31 = January, 32-59 = February (28 days), etc.
const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
function dayToMonthAndDate(dayOfYear: number): { month: number; date: number } {
  let remaining = dayOfYear
  for (let m = 0; m < 12; m++) {
    if (remaining <= MONTH_LENGTHS[m]) return { month: m, date: remaining }
    remaining -= MONTH_LENGTHS[m]
  }
  return { month: 11, date: 31 } // Dec 31 fallback
}

function todayDayOfYearUTC(): number {
  const now = new Date()
  const start = Date.UTC(now.getUTCFullYear(), 0, 0)
  return Math.floor((now.getTime() - start) / 86_400_000)
}

export default function BiblePlanPageClient({
  series,
}: {
  series: SeriesInfo
}) {
  const { isRead } = useProgress()
  const todayDoy = useMemo(() => todayDayOfYearUTC(), [])
  const [searchQuery, setSearchQuery] = useState('')

  const totalDays = series.days.length
  const readCount = useMemo(
    () => series.days.filter((d) => isRead(d.slug)).length,
    [series.days, isRead],
  )
  const progressPercent = Math.round((readCount / totalDays) * 100)

  // Group all 365 days by month (1-12)
  const daysByMonth = useMemo(() => {
    const grouped: Array<typeof series.days> = Array.from(
      { length: 12 },
      () => [],
    )
    for (const day of series.days) {
      const { month } = dayToMonthAndDate(day.day)
      grouped[month].push(day)
    }
    return grouped
  }, [series.days])

  // Filter when searching
  const filteredDays = useMemo(() => {
    if (!searchQuery.trim()) return series.days
    const q = searchQuery.toLowerCase().trim()
    return series.days.filter(
      (d) =>
        d.title.toLowerCase().includes(q) || d.slug.toLowerCase().includes(q),
    )
  }, [series.days, searchQuery])

  const todayDay = series.days.find((d) => d.day === todayDoy)

  return (
    <div className="mock-home">
      <main id="main-content" className="mock-paper">
        <EuangelionShellHeader />
        <Breadcrumbs
          className="mock-breadcrumb-row"
          items={[
            { label: 'HOME', href: '/' },
            { label: 'SERIES', href: '/series' },
            { label: 'BIBLE 365' },
          ]}
        />

        {/* Hero: title + progress + 3 hop-in CTAs */}
        <section className="bible365-hero shell-content-pad">
          <p className="text-label mock-kicker">FEATURED · BIBLE 365</p>
          <h1 className="mock-title">{typographer(series.question)}</h1>
          <p className="mock-body" style={{ maxWidth: '52rem' }}>
            {typographer(series.introduction)}
          </p>
          <p className="mock-subcopy" style={{ maxWidth: '52rem' }}>
            {typographer(series.context)}
          </p>

          {/* Progress strip */}
          <div
            className="bible365-progress-strip"
            aria-label={`Read ${readCount} of ${totalDays} days`}
          >
            <div className="bible365-progress-bar">
              <div
                className="bible365-progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-label">
              {readCount} of {totalDays} days · {progressPercent}% complete
            </p>
          </div>

          {/* 3 hop-in CTAs */}
          <div className="bible365-hop-in-row">
            {todayDay && (
              <Link
                href={`/devotional/${todayDay.slug}`}
                className="mock-btn mock-btn-inline text-label"
              >
                START WITH TODAY (DAY {todayDay.day})
              </Link>
            )}
            <Link
              href="/devotional/bible-365-day-1"
              className="mock-btn mock-btn-inline text-label"
              data-variant="secondary"
            >
              START FROM DAY 1
            </Link>
            <a
              href="#calendar"
              className="mock-btn mock-btn-inline text-label"
              data-variant="secondary"
            >
              PICK A DATE
            </a>
          </div>
        </section>

        {/* Search filter */}
        <section className="bible365-search-row shell-content-pad">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search 365 days by book, theme, or title…"
            className="bible365-search-input"
            aria-label="Search Bible-365 plan"
          />
          {searchQuery.trim() && (
            <p className="text-label" style={{ marginTop: '0.5rem' }}>
              {filteredDays.length} {filteredDays.length === 1 ? 'day' : 'days'}{' '}
              match
            </p>
          )}
        </section>

        {/* Calendar view: 12 month sections (or filtered list when searching) */}
        {searchQuery.trim() ? (
          <section className="bible365-search-results shell-content-pad">
            <ul className="bible365-day-grid">
              {filteredDays.map((day) => (
                <DayCard
                  key={day.slug}
                  day={day}
                  todayDoy={todayDoy}
                  isRead={isRead}
                />
              ))}
            </ul>
          </section>
        ) : (
          <section
            id="calendar"
            className="bible365-calendar shell-content-pad"
          >
            {daysByMonth.map((monthDays, monthIdx) => (
              <div key={monthIdx} className="bible365-month-block">
                <h2 className="bible365-month-heading">
                  <span className="text-label">
                    MONTH {String(monthIdx + 1).padStart(2, '0')}
                  </span>
                  <span className="bible365-month-name">
                    {MONTH_NAMES[monthIdx]}
                  </span>
                </h2>
                <ul className="bible365-day-grid">
                  {monthDays.map((day) => (
                    <DayCard
                      key={day.slug}
                      day={day}
                      todayDoy={todayDoy}
                      isRead={isRead}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}

function DayCard({
  day,
  todayDoy,
  isRead,
}: {
  day: { day: number; title: string; slug: string }
  todayDoy: number
  isRead: (slug: string) => boolean
}) {
  const isToday = day.day === todayDoy
  const isPast = day.day < todayDoy
  const completed = isRead(day.slug)
  const { month, date } = dayToMonthAndDate(day.day)
  const status = completed
    ? 'READ'
    : isToday
      ? 'TODAY'
      : isPast
        ? 'CATCH UP'
        : 'UPCOMING'
  return (
    <li
      className="bible365-day-cell"
      data-status={status.toLowerCase().replace(' ', '-')}
    >
      <Link href={`/devotional/${day.slug}`} className="bible365-day-link">
        <p className="text-label bible365-day-num">DAY {day.day}</p>
        <p className="text-label bible365-day-date">
          {MONTH_NAMES[month].slice(0, 3).toUpperCase()} {date}
        </p>
        <p className="bible365-day-title">{day.title}</p>
        <p className="text-label bible365-day-status">{status}</p>
      </Link>
    </li>
  )
}
