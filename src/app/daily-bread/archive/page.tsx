/**
 * The Daily Bread archive index (SA-114 / F-158) — every past edition,
 * newest first. Founder: "the daily bread should have an archived page area
 * to see past daily bread content."
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteBottom from '@/components/SiteBottom'
import { editionArchiveDates } from '@/lib/edition/archive'

export const revalidate = 300

export const metadata: Metadata = {
  title: 'The Archive | The Daily Bread | Euangelion',
  description: 'Every past edition of The Daily Bread, kept.',
  alternates: { canonical: '/daily-bread/archive' },
}

function formatDay(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export default function DailyBreadArchivePage() {
  const dates = editionArchiveDates()
  return (
    <div className="mock-paper newspaper-reading">
      <EuangelionShellHeader />
      <main id="main-content" className="edition-archive-main">
        <h1 className="edition-archive-title">The Archive</h1>
        <p className="edition-archive-stand">
          Every past edition of The Daily Bread, kept the way it printed.
          Yesterday&apos;s paper is the newest thing here — today&apos;s is on
          the <Link href="/daily-bread">front page</Link>.
        </p>
        {dates.length === 0 ? (
          <p className="edition-archive-empty">
            The paper is young — the first archived edition arrives tomorrow.
          </p>
        ) : (
          <ul className="edition-archive-list">
            {dates.map((iso) => (
              <li key={iso}>
                <Link
                  href={`/daily-bread/archive/${iso}`}
                  className="edition-archive-link"
                >
                  <span className="edition-archive-day">{formatDay(iso)}</span>
                  <span className="edition-archive-iso">{iso}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteBottom />
    </div>
  )
}
