/**
 * /daily-bread — The Daily Bread (thin route since SA-114).
 *
 * The whole paper lives in src/components/edition/EditionPage.tsx so the
 * founder's finished-state preview (/admin/preview/daily-bread) renders the
 * IDENTICAL component and can never drift from what readers see. Drafts are
 * NEVER readable here: this route renders with preview=false, whose read
 * path is the store's published-only query.
 */
import type { Metadata } from 'next'
import EditionPage from '@/components/edition/EditionPage'
import { pickTodaySlug, findSeriesForSlug } from '@/lib/today-devotional'
import { DEVOTIONAL_TEASERS } from '@/data/devotional-teasers'
import { effectiveEditionDate } from '@/lib/edition/deadline'

// ISR at five minutes: the 7am flip must LAND at 7am, not up to an hour
// late — with hourly revalidation a reader could get yesterday's paper at
// 7:59. Five minutes keeps render cost negligible and the flip punctual.
export const revalidate = 300

export async function generateMetadata(): Promise<Metadata> {
  const now = new Date(`${effectiveEditionDate(new Date())}T00:00:00Z`)
  const slug = pickTodaySlug(now)
  const meta = findSeriesForSlug(slug)
  const teaser = DEVOTIONAL_TEASERS[slug] ?? meta?.series.question ?? undefined

  const title = meta?.day.title
    ? `${meta.day.title} | The Daily Bread`
    : 'The Daily Bread | Euangelion'

  return {
    title,
    description:
      teaser ??
      "Today's devotional from Euangelion — daily bread for the cluttered, hungry soul.",
    alternates: {
      canonical: '/daily-bread',
    },
    openGraph: {
      title: title,
      description:
        teaser ??
        "Today's devotional — scripture, reflection, and prayer for today.",
      type: 'article',
      url: 'https://euangelion.app/daily-bread',
    },
  }
}

export default async function DailyBreadPage() {
  return <EditionPage date={new Date()} />
}
