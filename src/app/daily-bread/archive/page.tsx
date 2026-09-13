/**
 * The Daily Bread archive index (SA-114 / F-158) — every past edition,
 * newest first. Founder: "the daily bread should have an archived page area
 * to see past daily bread content."
 *
 * DAILY_BREAD_V2 on (SA-142 / F-184): the list is the persisted record of
 * published editions — serial numbers, titles, how each was set — paginated
 * by date cursor (?before=YYYY-MM-DD). Off: the SA-114 date list, unchanged.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteBottom from '@/components/SiteBottom'
import { editionArchiveDates } from '@/lib/edition/archive'
import { dailyBreadV2Enabled } from '@/lib/daily-bread/flags'
import { ARCHETYPES } from '@/lib/daily-bread/composition/archetypes'
import { loadArchivePage, serialLabel } from '@/lib/daily-bread/read'
import { errorMessage } from '@/lib/daily-bread/redact'
import { formatEditorialDate, isValidDateSlug } from '@/lib/daily-bread/time'

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

async function V2Archive({ before }: { before?: string }) {
  let page: Awaited<ReturnType<typeof loadArchivePage>>
  try {
    page = await loadArchivePage(before)
  } catch (error) {
    console.error('[daily-bread] archive read failed', errorMessage(error))
    return (
      <div className="edition-broken" role="alert">
        <p className="edition-broken-head">The archive could not be loaded.</p>
        <p className="edition-broken-body">This failure has been recorded, not hidden.</p>
      </div>
    )
  }
  if (page.entries.length === 0) {
    return <p className="edition-archive-empty">No editions have been published yet.</p>
  }
  return (
    <>
      <ol className="edition-archive-list db2-archive-list">
        {page.entries.map((e) => (
          <li key={e.editionDate}>
            <Link href={`/daily-bread/${e.editionDate}`} className="edition-archive-link db2-archive-link">
              <span className="db2-archive-serial">{serialLabel(e)}</span>
              <span className="edition-archive-day">{formatEditorialDate(e.editionDate)}</span>
              <span className="db2-archive-title">{e.title}</span>
              <span className="edition-archive-iso">
                {ARCHETYPES[e.archetype]?.name ?? e.archetype}
                {e.lifecycle === 'superseded' ? ' · withdrawn' : ''}
                {e.quality !== 'normal' ? ` · ${e.quality} edition` : ''}
              </span>
            </Link>
          </li>
        ))}
      </ol>
      {page.nextBefore ? (
        <p className="db2-archive-more">
          <Link href={`/daily-bread/archive?before=${page.nextBefore}`} rel="next">
            Older editions &rarr;
          </Link>
        </p>
      ) : null}
    </>
  )
}

export default async function DailyBreadArchivePage({
  searchParams,
}: {
  searchParams?: Promise<{ before?: string | string[] }>
}) {
  if (dailyBreadV2Enabled()) {
    const raw = (await searchParams)?.before
    const before = typeof raw === 'string' && isValidDateSlug(raw) ? raw : undefined
    return (
      <div className="mock-paper newspaper-reading">
        <EuangelionShellHeader />
        <main id="main-content" className="edition-archive-main">
          <h1 className="edition-archive-title">The Archive</h1>
          <p className="edition-archive-stand">
            Every edition of The Daily Bread, kept exactly as it was published. Today&apos;s is on
            the <Link href="/daily-bread">front page</Link>.
          </p>
          <V2Archive before={before} />
        </main>
        <SiteBottom />
      </div>
    )
  }

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
