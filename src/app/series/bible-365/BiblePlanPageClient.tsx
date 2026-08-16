'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import Breadcrumbs from '@/components/Breadcrumbs'
import SiteBottom from '@/components/SiteBottom'
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

// Quarter arc per docs/bible-365-content-calendar-2026.md. Months are
// 0-indexed; each quarter owns three calendar months.
const QUARTERS = [
  { label: 'Q1', focus: 'Foundations', months: [0, 1, 2] },
  { label: 'Q2', focus: 'Kingdom', months: [3, 4, 5] },
  { label: 'Q3', focus: 'Promise', months: [6, 7, 8] },
  { label: 'Q4', focus: 'Fulfillment', months: [9, 10, 11] },
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

  // The month of "today" — opened by default so the page lands short
  // (a single month visible), not as a 365-row wall. Any month containing
  // at least one day stays collapsed until the reader taps it or jumps.
  const currentMonthIdx = useMemo(
    () => dayToMonthAndDate(todayDoy).month,
    [todayDoy],
  )
  const [openMonths, setOpenMonths] = useState<Set<number>>(
    () => new Set([currentMonthIdx]),
  )

  const toggleMonth = (monthIdx: number) => {
    setOpenMonths((prev) => {
      const next = new Set(prev)
      if (next.has(monthIdx)) next.delete(monthIdx)
      else next.add(monthIdx)
      return next
    })
  }

  // Jump-bar: open the target month, then scroll it into view.
  const jumpToMonth = (monthIdx: number) => {
    setOpenMonths((prev) => new Set(prev).add(monthIdx))
    requestAnimationFrame(() => {
      document
        .getElementById(`b365browse-month-${monthIdx}`)
        ?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    })
  }

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
            {/* Scoped styles for the jump-bar + accordion chrome. The
                existing bible365-* classes (in globals.css) are reused
                untouched; only b365browse-* is added here so this surface
                owns its new CSS without editing globals. */}
            <style>{`
              .b365browse-jumpbar {
                position: sticky;
                top: 0;
                z-index: 5;
                margin: 0 0 1.6rem;
                padding: 0.75rem 0 0.6rem;
                background: var(--mock-paper, inherit);
                border-bottom: 1.5px solid var(--mock-line, currentColor);
              }
              .b365browse-quarter {
                display: flex;
                flex-wrap: wrap;
                align-items: baseline;
                gap: 0.5rem;
                margin-bottom: 0.5rem;
              }
              .b365browse-quarter:last-child { margin-bottom: 0; }
              .b365browse-q-label {
                letter-spacing: 0.08em;
                min-width: 6.5rem;
                color: var(--mock-blue, currentColor);
              }
              .b365browse-q-months {
                display: flex;
                flex-wrap: wrap;
                gap: 0.4rem;
              }
              .b365browse-month-chip {
                min-height: 44px;
                padding: 0 0.85rem;
                display: inline-flex;
                align-items: center;
                gap: 0.4rem;
                border: 1.5px solid var(--mock-line, currentColor);
                background: transparent;
                color: inherit;
                font: inherit;
                letter-spacing: 0.04em;
                cursor: pointer;
                white-space: nowrap;
              }
              .b365browse-month-chip:hover {
                background: color-mix(
                  in srgb,
                  var(--mock-blue, #1f2a8d) 8%,
                  var(--mock-paper, white) 92%
                );
              }
              .b365browse-month-chip:focus-visible {
                outline: 2px solid var(--mock-blue, currentColor);
                outline-offset: 1px;
              }
              .b365browse-month-chip[data-current='true'] {
                border-color: var(--mock-blue, currentColor);
                font-weight: 600;
              }
              .b365browse-month-chip .b365browse-chip-count { opacity: 0.6; }
              .b365browse-month-toggle {
                display: flex;
                align-items: baseline;
                gap: 1rem;
                width: 100%;
                min-height: 44px;
                border: none;
                border-bottom: 1.5px solid var(--mock-line, currentColor);
                padding-bottom: 0.4rem;
                margin: 0 0 0.9rem;
                background: transparent;
                color: inherit;
                font: inherit;
                text-align: left;
                cursor: pointer;
              }
              .b365browse-month-toggle:focus-visible {
                outline: 2px solid var(--mock-blue, currentColor);
                outline-offset: 2px;
              }
              .b365browse-toggle-caret {
                margin-left: auto;
                font-size: 1rem;
                opacity: 0.7;
              }
              @media (prefers-reduced-motion: reduce) {
                .bible365-day-cell, .b365browse-month-chip {
                  transition: none;
                }
              }
            `}</style>

            {/* Sticky quarter -> month jump-bar: any month reachable in one
                tap, grouped by the year's four quarters. */}
            <nav className="b365browse-jumpbar" aria-label="Jump to a month">
              {QUARTERS.map((q) => (
                <div key={q.label} className="b365browse-quarter">
                  <span className="text-label b365browse-q-label">
                    {q.label} · {q.focus.toUpperCase()}
                  </span>
                  <span className="b365browse-q-months">
                    {q.months.map((monthIdx) => {
                      const count = daysByMonth[monthIdx].length
                      if (count === 0) return null
                      return (
                        <button
                          key={monthIdx}
                          type="button"
                          className="text-label b365browse-month-chip"
                          data-current={
                            monthIdx === currentMonthIdx ? 'true' : undefined
                          }
                          onClick={() => jumpToMonth(monthIdx)}
                        >
                          {MONTH_NAMES[monthIdx].slice(0, 3).toUpperCase()}
                          <span className="b365browse-chip-count">{count}</span>
                        </button>
                      )
                    })}
                  </span>
                </div>
              ))}
            </nav>

            {daysByMonth.map((monthDays, monthIdx) => {
              if (monthDays.length === 0) return null
              const isOpen = openMonths.has(monthIdx)
              const isCurrent = monthIdx === currentMonthIdx
              return (
                <div
                  key={monthIdx}
                  id={`b365browse-month-${monthIdx}`}
                  className="bible365-month-block"
                  style={{ scrollMarginTop: '7rem' }}
                >
                  <button
                    type="button"
                    className="b365browse-month-toggle"
                    aria-expanded={isOpen}
                    aria-controls={`b365browse-panel-${monthIdx}`}
                    onClick={() => toggleMonth(monthIdx)}
                  >
                    <span className="text-label">
                      MONTH {String(monthIdx + 1).padStart(2, '0')}
                    </span>
                    <span className="bible365-month-name">
                      {MONTH_NAMES[monthIdx]}
                    </span>
                    <span className="text-label">
                      {monthDays.length} DAYS
                      {isCurrent ? ' · NOW' : ''}
                    </span>
                    <span
                      className="b365browse-toggle-caret"
                      aria-hidden="true"
                    >
                      {isOpen ? '▴' : '▾'}
                    </span>
                  </button>
                  {isOpen && (
                    <ul
                      id={`b365browse-panel-${monthIdx}`}
                      className="bible365-day-grid"
                    >
                      {monthDays.map((day) => (
                        <DayCard
                          key={day.slug}
                          day={day}
                          todayDoy={todayDoy}
                          isRead={isRead}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </section>
        )}
      </main>
      <SiteBottom />
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
