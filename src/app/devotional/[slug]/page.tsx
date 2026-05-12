import { promises as fs } from 'fs'
import path from 'path'
import type { Metadata } from 'next'
import { SERIES_DATA, SERIES_ORDER } from '@/data/series'
import DevotionalPageClient from '@/app/wake-up/devotional/[slug]/DevotionalPageClient'

async function readDevotionalTeaser(slug: string): Promise<string | null> {
  try {
    const file = path.join(
      process.cwd(),
      'public',
      'devotionals',
      `${slug}.json`,
    )
    const raw = await fs.readFile(file, 'utf-8')
    const data = JSON.parse(raw) as { teaser?: unknown }
    return typeof data.teaser === 'string' && data.teaser.trim().length > 0
      ? data.teaser
      : null
  } catch {
    return null
  }
}

export const revalidate = 3600

interface Props {
  params: Promise<{ slug: string }>
}

function findDevotionalMeta(slug: string) {
  for (const seriesSlug of SERIES_ORDER) {
    const series = SERIES_DATA[seriesSlug]
    const day = series.days.find((entry) => entry.slug === slug)
    if (day) return { series, seriesSlug, day }
  }
  return null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const meta = findDevotionalMeta(slug)
  if (!meta) return { title: 'Devotional Not Found' }

  // Many series in src/data/series.ts use a bare `Day N` title placeholder.
  // Detect the redundancy so we don't render "Day 5: Day 5 | Euangelion".
  const dayTitle = /^day\s+\d+$/i.test(meta.day.title.trim())
    ? meta.day.title
    : `Day ${meta.day.day}: ${meta.day.title}`

  // Prefer the day's own teaser (from public/devotionals/[slug].json) over
  // the series-level question. Series-level descriptions are identical for
  // every day in a series; Google deduplicates them. The teaser is unique
  // per day and is what actually drives long-tail search.
  const dayTeaser = await readDevotionalTeaser(slug)
  const description =
    dayTeaser ?? `${meta.series.title} — ${meta.series.question}`

  // Self-canonical. The same content is also reachable via
  // /wake-up/devotional/[slug]; until the founder picks one canonical
  // surface (see docs/overnight-followups.md Phase 10.6 — canonical
  // URL audit), each route declares itself canonical so Google does
  // not pick something weird (e.g., a tracking URL parameter).
  return {
    title: dayTitle,
    description,
    alternates: {
      canonical: `/devotional/${slug}`,
    },
    openGraph: {
      title: `${dayTitle} | ${meta.series.title}`,
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

  const dayHeadline = meta
    ? /^day\s+\d+$/i.test(meta.day.title.trim())
      ? meta.day.title
      : `Day ${meta.day.day}: ${meta.day.title}`
    : ''

  const dayTeaser = meta ? await readDevotionalTeaser(slug) : null
  const articleDescription = meta
    ? (dayTeaser ?? `${meta.series.title} — ${meta.series.question}`)
    : ''

  const jsonLd = meta
    ? [
        {
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: dayHeadline,
          description: articleDescription,
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
              item: `https://euangelion.app/series/${meta.seriesSlug}`,
            },
            {
              '@type': 'ListItem',
              position: 4,
              name: dayHeadline,
            },
          ],
        },
      ]
    : null

  return (
    <>
      {jsonLd &&
        jsonLd.map((schema, index) => (
          <script
            key={index}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
      <DevotionalPageClient slug={slug} silo="euangelion" />
    </>
  )
}
