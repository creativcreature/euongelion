/**
 * An archived edition of The Daily Bread (SA-114 / F-158) — the SAME
 * EditionPage the live paper renders, keyed to a past date, so history
 * reads exactly as it printed. Only dates from the first edition up to
 * (not including) the live one resolve; everything else is not found.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import EditionPage from '@/components/edition/EditionPage'
import { isArchivedEdition } from '@/lib/edition/archive'

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
