/**
 * The Daily Bread archive index (SA-114 / F-158) — every past edition,
 * newest first. Founder: "the daily bread should have an archived page area
 * to see past daily bread content."
 *
 * DAILY_BREAD_V2 on (SA-142 / F-184): the persisted record of published
 * editions, one month per page (?month=YYYY-MM, newest month by default), in
 * date order, with serial numbers, titles, the feast kept, and links to the
 * nearest earlier and later months (plan §14). An old ?before=YYYY-MM-DD link
 * opens the month that cursor pointed into. Off: the SA-114 date list, unchanged.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteBottom from '@/components/SiteBottom'
import { editionArchiveDates } from '@/lib/edition/archive'
import { dailyBreadV2Enabled } from '@/lib/daily-bread/flags'
import { ARCHETYPES } from '@/lib/daily-bread/composition/archetypes'
import {
  formatArchiveMonth,
  isValidMonthSlug,
  loadArchiveMonth,
  serialLabel,
  type ArchiveMonthView,
} from '@/lib/daily-bread/read'
import { errorMessage } from '@/lib/daily-bread/redact'
import { addDays, formatEditorialDate, isValidDateSlug } from '@/lib/daily-bread/time'

export const revalidate = 300

type ArchiveSearchParams = Promise<{ month?: string | string[]; before?: string | string[] }>

function requestedMonth(params: Awaited<ArchiveSearchParams> | undefined): string | undefined {
  const month = params?.month
  if (isValidMonthSlug(month)) return month
  const before = params?.before
  if (typeof before === 'string' && isValidDateSlug(before)) return addDays(before, -1).slice(0, 7)
  return undefined
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: ArchiveSearchParams
}): Promise<Metadata> {
  const month = requestedMonth(await searchParams)
  return {
    title: month
      ? `${formatArchiveMonth(month)} | The Archive | The Daily Bread | Euangelion`
      : 'The Archive | The Daily Bread | Euangelion',
    description: 'Every past edition of The Daily Bread, kept.',
    alternates: { canonical: month ? `/daily-bread/archive?month=${month}` : '/daily-bread/archive' },
  }
}

function MonthNav({ view, placement }: { view: ArchiveMonthView; placement: 'top' | 'bottom' }) {
  if (!view.previousMonth && !view.nextMonth) return null
  return (
    <nav className={`db2-archive-monthnav db2-archive-monthnav--${placement}`} aria-label={placement === 'top' ? 'Archive months' : 'Archive months, end of list'}>
      {view.previousMonth ? (
        <Link href={`/daily-bread/archive?month=${view.previousMonth}`} rel="prev" className="db2-archive-monthlink">
          {`← ${formatArchiveMonth(view.previousMonth)}`}
        </Link>
      ) : (
        <span />
      )}
      {view.nextMonth ? (
        <Link
          href={`/daily-bread/archive?month=${view.nextMonth}`}
          rel="next"
          className="db2-archive-monthlink db2-archive-monthlink--next"
        >
          {`${formatArchiveMonth(view.nextMonth)} →`}
        </Link>
      ) : (
        <span />
      )}
    </nav>
  )
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

function V2Archive({ view }: { view: ArchiveMonthView | null }) {
  if (!view) {
    return (
      <div className="edition-broken" role="alert">
        <p className="edition-broken-head">The archive could not be loaded.</p>
        <p className="edition-broken-body">This failure has been recorded, not hidden.</p>
      </div>
    )
  }
  if (!view.month) {
    return <p className="edition-archive-empty">No editions have been published yet.</p>
  }
  const count = view.entries.length
  return (
    <section className="db2-archive-month" aria-labelledby="db2-archive-month-heading">
      <header className="db2-archive-monthhead">
        <h2 id="db2-archive-month-heading" className="db2-archive-monthname">
          {formatArchiveMonth(view.month)}
        </h2>
        <p className="db2-archive-monthcount">
          {count === 0 ? 'No editions this month' : count === 1 ? '1 edition' : `${count} editions`}
        </p>
      </header>
      <MonthNav view={view} placement="top" />
      {count > 0 ? (
        <ol className="edition-archive-list db2-archive-list">
          {view.entries.map((e) => (
            <li key={e.editionDate}>
              <Link href={`/daily-bread/${e.editionDate}`} className="edition-archive-link db2-archive-link">
                <span className="db2-archive-serial">{serialLabel(e)}</span>
                <span className="edition-archive-day">{formatEditorialDate(e.editionDate)}</span>
                <span className="db2-archive-title">{e.title}</span>
                <span className="edition-archive-iso">
                  {e.feast ? <span className="db2-archive-feast">{e.feast} · </span> : null}
                  {ARCHETYPES[e.archetype]?.name ?? e.archetype}
                  {e.lifecycle === 'superseded' ? ' · withdrawn' : ''}
                  {e.quality !== 'normal' ? ` · ${e.quality} edition` : ''}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      ) : null}
      <MonthNav view={view} placement="bottom" />
    </section>
  )
}

export default async function DailyBreadArchivePage({
  searchParams,
}: {
  searchParams?: ArchiveSearchParams
}) {
  if (dailyBreadV2Enabled()) {
    const month = requestedMonth(await searchParams)
    let view: ArchiveMonthView | null = null
    try {
      view = await loadArchiveMonth(month)
    } catch (error) {
      console.error('[daily-bread] archive read failed', errorMessage(error))
    }
    return (
      <div className="mock-paper newspaper-reading">
        <EuangelionShellHeader />
        <main id="main-content" className="edition-archive-main">
          <h1 className="edition-archive-title">The Archive</h1>
          <p className="edition-archive-stand">
            Every edition of The Daily Bread, kept exactly as it was published. Today&apos;s is on
            the <Link href="/daily-bread">front page</Link>.
          </p>
          <V2Archive view={view} />
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
