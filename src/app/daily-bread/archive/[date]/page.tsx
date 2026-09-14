/**
 * An archived edition of The Daily Bread (SA-114 / F-158) — the SAME
 * EditionPage the live paper renders, keyed to a past date, so history
 * reads exactly as it printed. Only dates from the first edition up to
 * (not including) the live one resolve; everything else is not found.
 *
 * DAILY_BREAD_V2 on (SA-142 / F-184): the canonical address of an edition is
 * /daily-bread/YYYY-MM-DD, so this legacy address redirects there.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import EditionPage from '@/components/edition/EditionPage'
import { isArchivedEdition } from '@/lib/edition/archive'
import { dailyBreadV2Enabled } from '@/lib/daily-bread/flags'
import { isValidDateSlug } from '@/lib/daily-bread/time'
import { loadEditionForDate } from '@/lib/daily-bread/read'
import { errorMessage } from '@/lib/daily-bread/redact'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ date: string }>
}): Promise<Metadata> {
  const { date } = await params
  return {
    title: `${date} | The Daily Bread Archive | Euangelion`,
    description: `The Daily Bread as it printed on ${date}.`,
    alternates: { canonical: `/daily-bread/archive/${date}` },
  }
}

export default async function ArchivedEditionPage({
  params,
}: {
  params: Promise<{ date: string }>
}) {
  const { date } = await params
  if (dailyBreadV2Enabled()) {
    if (!isValidDateSlug(date)) notFound()
    // Existing links keep working: a date with a V2 edition moves to its
    // canonical address; a date without one still renders the SA-114 paper.
    let hasV2 = false
    try {
      hasV2 = (await loadEditionForDate(date)) !== null
    } catch (error) {
      console.error('[daily-bread] archive redirect lookup failed', errorMessage(error))
    }
    if (hasV2) redirect(`/daily-bread/${date}`)
  }
  if (!isArchivedEdition(date)) {
    notFound()
  }
  return (
    <div>
      <div className="edition-archive-band">
        <p>
          FROM THE ARCHIVE — this is the paper of {date}.{' '}
          <Link href="/daily-bread">Read today&apos;s edition →</Link>
        </p>
      </div>
      <EditionPage date={new Date(`${date}T12:00:00Z`)} />
    </div>
  )
}
