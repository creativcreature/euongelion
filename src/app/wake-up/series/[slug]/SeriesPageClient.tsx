'use client'

import Link from 'next/link'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import Breadcrumbs from '@/components/Breadcrumbs'
import ShareButton from '@/components/ShareButton'
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
    <div className="mock-home">
      <main className="mock-paper">
        <EuangelionShellHeader brandWord="WAKE UP" tone="wake" />
        <Breadcrumbs
          className="mock-breadcrumb-row"
          items={[
            { label: 'HOME', href: '/' },
            { label: 'WAKE-UP', href: '/wake-up' },
            { label: series.title.toUpperCase() },
          ]}
        />

        <section className="mock-series-hero-grid">
          <article className="mock-panel mock-series-copy">
            <p className="text-label mock-kicker">SERIES</p>
            <h1 className="mock-title">{typographer(series.question)}</h1>
            <div className="mock-rule" />
            <p className="mock-body">{typographer(series.introduction)}</p>
            <p className="mock-subcopy">{typographer(series.context)}</p>
          </article>

          <aside className="mock-panel mock-series-meta">
            <p className="text-label mock-kicker">
              {series.title.toUpperCase()}
            </p>
            <p className="mock-subcopy">{series.framework}</p>

            <div className="mock-series-progress-head">
              <p className="text-label">{dayCount} DAY JOURNEY</p>
              <p className="text-label">
                {seriesProgress.completed}/{seriesProgress.total} COMPLETE
              </p>
            </div>
            <div className="mock-series-progress" aria-hidden="true">
              <div
                className="mock-series-progress-fill"
                style={{ width: `${seriesProgress.percentage}%` }}
              />
            </div>

            <div className="mock-series-meta-actions">
              <Link href="/wake-up" className="mock-btn text-label">
                ALL WAKE UP SERIES
              </Link>
              <ShareButton
                title={series.title}
                text={`${series.title} — ${series.question}`}
                className="mock-series-share"
              />
            </div>
          </aside>
        </section>

        <section className="mock-section-center">
          <p className="text-label mock-kicker">DAILY READINGS</p>
          <h2 className="mock-title-center">5 Day Path</h2>
          <p className="mock-subcopy-center">
            Read in order. Return daily. Keep your rhythm.
          </p>
        </section>

        <section className="mock-series-days-grid">
          {series.days.map((day) => {
            const readingCheck = canRead(day.slug)
            const isLocked = !readingCheck.canRead
            const dayIsRead = isRead(day.slug)
            const lockMessage =
              (readingCheck as { message?: string }).message ||
              'Unlocks in sequence as you continue.'

            const card = (
              <article
                className={`mock-series-day-card ${isLocked ? 'is-locked' : ''}`}
              >
                <p className="text-label mock-series-day-number">
                  DAY {day.day}
                </p>
                <h3>{day.title}</h3>
                <p className="mock-series-day-status">
                  {isLocked ? 'LOCKED' : dayIsRead ? 'READ AGAIN' : 'READ NOW'}
                </p>
                {isLocked && (
                  <p className="mock-series-day-lock">
                    {typographer(lockMessage)}
                  </p>
                )}
              </article>
            )

            if (isLocked) {
              return <div key={day.slug}>{card}</div>
            }

            return (
              <Link
                key={day.slug}
                href={`/wake-up/devotional/${day.slug}`}
                className="mock-series-day-link"
              >
                {card}
              </Link>
            )
          })}
        </section>

        <section className="mock-bottom-brand">
          <h2 className="text-masthead mock-masthead-word">
            <span className="js-shell-masthead-fit mock-masthead-text">
              EUANGELION
            </span>
          </h2>
        </section>
      </main>
    </div>
  )
}
