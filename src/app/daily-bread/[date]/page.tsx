/**
 * /daily-bread/YYYY-MM-DD — one frozen Daily Bread V2 edition (SA-142 /
 * F-184). The canonical, permanent address of a published edition: it renders
 * the snapshot exactly as it was published (or as corrected by a revision),
 * with previous/next navigation. Invalid, unpublished or unknown dates are
 * 404. The route does not exist while DAILY_BREAD_V2 is off.
 */
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import DailyBreadEdition from '@/components/daily-bread/DailyBreadEdition'
import { dailyBreadV2Enabled } from '@/lib/daily-bread/flags'
import { loadEditionForDate, serialLabel } from '@/lib/daily-bread/read'
import { isValidDateSlug } from '@/lib/daily-bread/time'

// A published edition is immutable except for an explicit revision; an hour
// of ISR lets a correction land without re-rendering on every request.
export const revalidate = 3600

const load = cache(async (date: string) => loadEditionForDate(date))

export async function generateMetadata({
  params,
}: {
  params: Promise<{ date: string }>
}): Promise<Metadata> {
  const { date } = await params
  if (!dailyBreadV2Enabled() || !isValidDateSlug(date)) return {}
  const found = await load(date)
  if (!found) return {}
  const { edition } = found
  const title = `${edition.title} — ${serialLabel(edition)} | The Daily Bread`
  return {
    title,
    description: edition.deck || `The Daily Bread for ${date}.`,
    alternates: { canonical: `/daily-bread/${date}` },
    robots: edition.lifecycle === 'superseded' ? { index: false, follow: true } : undefined,
    openGraph: {
      title,
      description: edition.deck,
      type: 'article',
      url: `https://euangelion.app/daily-bread/${date}`,
      publishedTime: edition.publishedAt ?? undefined,
    },
  }
}

export default async function DailyBreadEditionPage({
  params,
}: {
  params: Promise<{ date: string }>
}) {
  const { date } = await params
  if (!dailyBreadV2Enabled() || !isValidDateSlug(date)) notFound()
  const found = await load(date)
  if (!found) notFound()
  return <DailyBreadEdition edition={found.edition} neighbors={found.neighbors} mode="archive" />
}
