/**
 * /daily-bread — The Daily Bread (thin route since SA-114).
 *
 * DAILY_BREAD_V2 off (default): the SA-090 paper in
 * src/components/edition/EditionPage.tsx, exactly as before, so the founder's
 * finished-state preview (/admin/preview/daily-bread) renders the IDENTICAL
 * component. Live reads follow the SA-114 7am rule (published rows and
 * unrejected drafts at the flip).
 *
 * DAILY_BREAD_V2 on (SA-142 / F-184): the newest PUBLISHED frozen V2 edition
 * on or before today's editorial date. If today's paper is not published yet
 * the previous edition is shown with a visible notice — never a blank page and
 * never an unpublished draft.
 */
import type { Metadata } from 'next'
import { cache } from 'react'
import EditionPage from '@/components/edition/EditionPage'
import DailyBreadEdition, { DailyBreadUnavailable } from '@/components/daily-bread/DailyBreadEdition'
import { pickTodaySlug, findSeriesForSlug } from '@/lib/today-devotional'
import { DEVOTIONAL_TEASERS } from '@/data/devotional-teasers'
import { effectiveEditionDate } from '@/lib/edition/deadline'
import { dailyBreadV2Enabled } from '@/lib/daily-bread/flags'
import { loadLiveEdition } from '@/lib/daily-bread/read'
import { errorMessage } from '@/lib/daily-bread/redact'
import { formatEditorialDate } from '@/lib/daily-bread/time'

// ISR at five minutes: the 7am flip must LAND at 7am, not up to an hour
// late — with hourly revalidation a reader could get yesterday's paper at
// 7:59. Five minutes keeps render cost negligible and the flip punctual.
export const revalidate = 300

const liveV2 = cache(async () => loadLiveEdition())

export async function generateMetadata(): Promise<Metadata> {
  if (dailyBreadV2Enabled()) {
    try {
      const { edition } = await liveV2()
      if (edition) {
        const title = `${edition.title} | The Daily Bread`
        return {
          title,
          description: edition.deck || 'The Daily Bread from Euangelion.',
          alternates: { canonical: '/daily-bread' },
          openGraph: {
            title,
            description: edition.deck,
            type: 'article',
            url: 'https://euangelion.app/daily-bread',
            images: [`/daily-bread/${edition.editionDate}/opengraph-image`],
          },
        }
      }
    } catch {
      // The page body renders (and logs) the visible failure state.
    }
    return { title: 'The Daily Bread | Euangelion', alternates: { canonical: '/daily-bread' } }
  }

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
  if (!dailyBreadV2Enabled()) {
    return <EditionPage date={new Date()} />
  }
  let view: Awaited<ReturnType<typeof loadLiveEdition>>
  try {
    view = await liveV2()
  } catch (error) {
    console.error('[daily-bread] live read failed', errorMessage(error))
    return <DailyBreadUnavailable reason="read-failed" />
  }
  if (!view.edition) return <DailyBreadUnavailable reason="none-published" />
  return (
    <DailyBreadEdition
      edition={view.edition}
      neighbors={view.neighbors}
      mode="live"
      notice={
        view.isFallbackToPrevious
          ? `Today’s paper (${formatEditorialDate(view.liveDate)}) is still on the press. This is the most recent edition.`
          : undefined
      }
    />
  )
}
