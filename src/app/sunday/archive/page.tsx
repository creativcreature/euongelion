/**
 * /sunday/archive — Sunday Edition Broadsheet Grid
 *
 * Shows the last 24 Sunday Edition picks in a newspaper-style grid.
 * Server-rendered; no client JS required.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteFooter from '@/components/SiteFooter'
import { getSundayArchive } from '@/lib/sunday-edition'

export const metadata: Metadata = {
  title: 'Sunday Edition Archive',
  description:
    'Past Sunday Edition long-form devotional pieces from Euangelion.',
  openGraph: {
    title: 'Sunday Edition Archive — Euangelion',
    description: 'Long-form devotional reading. Every week.',
    url: 'https://euangelion.app/sunday/archive',
  },
}

export default function SundayArchivePage() {
  const now = new Date()
  const entries = getSundayArchive(now, 24)

  // Deduplicate by daySlug (same piece can appear if rotation overlaps)
  const seen = new Set<string>()
  const unique = entries.filter((e) => {
    if (seen.has(e.daySlug)) return false
    seen.add(e.daySlug)
    return true
  })

  return (
    <div className="newspaper-reading">
      <EuangelionShellHeader />

      <main id="main-content" className="sunday-archive-page">
        <header className="sunday-archive-header">
          <nav className="sunday-archive-breadcrumb" aria-label="Breadcrumb">
            <Link href="/sunday" className="sunday-archive-back">
              &larr; Current Edition
            </Link>
          </nav>
          <h1 className="sunday-archive-title">Sunday Edition Archive</h1>
          <p className="sunday-archive-subtitle">
            Long-form devotional reading. Every week.
          </p>
        </header>

        <section aria-label="Past Sunday editions">
          <ol className="sunday-archive-grid" reversed>
            {unique.map((entry, i) => {
              // Build a "Week of …" label from the date we stepped back to
              const d = new Date(now)
              d.setUTCDate(d.getUTCDate() - i * 7)
              const weekLabel = d.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                timeZone: 'UTC',
              })
              const isCurrent = i === 0

              return (
                <li
                  key={`${entry.daySlug}-${i}`}
                  className={`sunday-archive-item${isCurrent ? ' is-current' : ''}`}
                >
                  <Link
                    href={
                      isCurrent ? '/sunday' : `/devotional/${entry.daySlug}`
                    }
                    className="sunday-archive-card"
                    aria-label={`${isCurrent ? 'Current edition: ' : ''}${entry.seriesTitle}, week of ${weekLabel}`}
                  >
                    <span className="sunday-archive-card-week">
                      {isCurrent ? (
                        <span className="sunday-archive-current-badge">
                          THIS WEEK
                        </span>
                      ) : (
                        `WEEK ${entry.isoWeek}`
                      )}
                    </span>
                    <span className="sunday-archive-card-date">
                      Week of {weekLabel}
                    </span>
                    <span className="sunday-archive-card-series">
                      {entry.seriesTitle}
                    </span>
                    <span className="sunday-archive-card-slug">
                      {entry.daySlug
                        .split('-')
                        .filter((w) => !/^day$/i.test(w))
                        .join(' ')}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ol>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
