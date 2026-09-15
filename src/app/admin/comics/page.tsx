import AdminShell from '@/components/AdminShell'
import { assertAdminOr404 } from '@/lib/admin/assert-admin'
import { getStripsFrom } from '@/lib/edition/store'
import { addDays, editorialDate, weekStart } from '@/lib/daily-bread/time'
import ComicsBatchClient, { type WeekOfStrips } from './ComicsBatchClient'

/**
 * /admin/comics — approve Echo & Dust a batch at a time (SA-142 / F-184).
 *
 * Founder, 2026-09-14: "I think the comic should be weekly and the bread daily"
 * and "I want to approve the months of comics at once." One strip per week,
 * dated its Monday, prints every day of that week once APPROVED. This page lays
 * out last week and the next twelve, each with its strip (or the gap), and
 * records verdicts through the existing review endpoint — one click per week,
 * or every draft on the page at once.
 */

export const metadata = {
  title: 'Echo & Dust — Weekly Strips | Euangelion',
  description: 'Approve the weekly Echo & Dust strips in one sitting.',
}

export const dynamic = 'force-dynamic'

const WEEKS_AHEAD = 12

export default async function AdminComicsPage() {
  await assertAdminOr404()

  const thisWeek = weekStart(editorialDate(new Date()))
  const from = addDays(thisWeek, -7)
  let weeks: WeekOfStrips[] = []
  let readError: string | null = null
  try {
    const strips = await getStripsFrom(from)
    weeks = Array.from({ length: WEEKS_AHEAD + 1 }, (_, i) => {
      const monday = addDays(from, i * 7)
      const sunday = addDays(monday, 6)
      return {
        monday,
        isCurrent: monday === thisWeek,
        strips: strips
          .filter((s) => s.publishDate >= monday && s.publishDate <= sunday && s.id)
          .map((s) => ({
            id: s.id as string,
            publishDate: s.publishDate,
            status: s.status,
            image: s.payload.image,
            alt: s.payload.alt,
            caption: s.payload.caption,
            width: s.payload.width ?? 1512,
            height: s.payload.height ?? 745,
          })),
      }
    })
  } catch (error) {
    readError = error instanceof Error ? error.message : String(error)
  }

  return (
    <AdminShell title="Echo & Dust" kicker="WEEKLY STRIPS" activeHref="/admin/comics">
      {readError ? (
        <div className="border border-[var(--color-border-strong)] p-4" role="alert">
          <p className="vw-body">The strips could not be loaded.</p>
          <p className="vw-small text-secondary mt-1">{readError}</p>
        </div>
      ) : (
        <ComicsBatchClient weeks={weeks} />
      )}
    </AdminShell>
  )
}
