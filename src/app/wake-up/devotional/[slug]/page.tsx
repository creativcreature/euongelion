import type { Metadata } from 'next'
import { SERIES_DATA, SERIES_ORDER } from '@/data/series'
import DevotionalPageClient from './DevotionalPageClient'
import {
  getDevotionalTeaser,
  getDevotionalTitle,
} from '@/data/devotional-teasers'

// Audit T2 (HOMEPAGE-AUDIT-2026-05-11): build-time teaser index. See
// the same comment in src/app/devotional/[slug]/page.tsx.

export const revalidate = 3600

interface Props {
  params: Promise<{ slug: string }>
}

function findDevotionalMeta(slug: string) {
  for (const seriesSlug of SERIES_ORDER) {
    const series = SERIES_DATA[seriesSlug]
    const day = series.days.find((d) => d.slug === slug)
    if (day) return { series, seriesSlug, day }
  }
  return null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const meta = findDevotionalMeta(slug)
  if (!meta) return { title: 'Devotional Not Found' }

  const { series, day } = meta

  // Audit Manus §5 (Updated 2026-05-13): prefer the devotional's
  // actual headline from its JSON over the bare "Day N" placeholder.
  const jsonTitle = getDevotionalTitle(slug)
  const isBareDayPlaceholder = /^day\s+\d+$/i.test(day.title.trim())
  const dayTitle = jsonTitle
    ? jsonTitle
    : isBareDayPlaceholder
      ? day.title
      : `Day ${day.day}: ${day.title}`

  // Use the day's teaser (build-time index) for the description so
  // each day in a series has its own meta description — series.question
  // is identical across all days and Google dedupes it.
  const dayTeaser = getDevotionalTeaser(slug)
  const description = dayTeaser ?? `${series.title} — ${series.question}`

  // Cross-canonical to the main /devotional/[slug] route per founder
  // direction 2026-05-07: /devotional is the canonical surface so SEO
  // ranking accrues there. Wake-Up stays as a sibling product
  // (separate funnel + RSS feed) but its devotional URLs send Google
  // to the main brand surface.
  return {
    title: dayTitle,
    description,
    alternates: {
      canonical: `/devotional/${slug}`,
    },
    openGraph: {
      title: `${dayTitle} | ${series.title}`,
      description,
      type: 'article',
      url: `https://euangelion.app/devotional/${slug}`,
    },
  }
}

export function generateStaticParams() {
  const params: { slug: string }[] = []
  for (const seriesSlug of SERIES_ORDER) {
    const series = SERIES_DATA[seriesSlug]
    for (const day of series.days) {
      params.push({ slug: day.slug })
    }
  }
  return params
}

export default async function DevotionalPage({ params }: Props) {
  const { slug } = await params
  const meta = findDevotionalMeta(slug)

  // Audit T2 — build-time teaser index for JSON-LD Article description.
  const dayTeaser = meta ? getDevotionalTeaser(slug) : null

  const jsonLd = meta
    ? [
        {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: `Day ${meta.day.day}: ${meta.day.title}`,
          description:
            dayTeaser ?? `${meta.series.title} — ${meta.series.question}`,
          publisher: {
            '@type': 'Organization',
            name: 'Euangelion',
            url: 'https://euangelion.app',
          },
          isPartOf: {
            '@type': 'CreativeWorkSeries',
            name: meta.series.title,
          },
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: 'https://euangelion.app',
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'Series',
              item: 'https://euangelion.app/series',
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: meta.series.title,
              item: `https://euangelion.app/wake-up/series/${meta.seriesSlug}`,
            },
            {
              '@type': 'ListItem',
              position: 4,
              name: `Day ${meta.day.day}: ${meta.day.title}`,
            },
          ],
        },
      ]
    : null

  return (
    <>
      {jsonLd &&
        jsonLd.map((schema, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
      {/* Audit C1 deferred — see /devotional/[slug]/page.tsx for the
          comment. initialDevotional pass-through broke prerendering. */}
      <DevotionalPageClient slug={slug} />
    </>
  )
}
