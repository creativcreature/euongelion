import type { Metadata } from 'next'
import { SERIES_DATA, SERIES_ORDER } from '@/data/series'
import DevotionalPageClient from '@/app/wake-up/devotional/[slug]/DevotionalPageClient'
import { getDevotionalTeaser } from '@/data/devotional-teasers'

// Audit T2 (HOMEPAGE-AUDIT-2026-05-11): read teasers from the build-
// time generated index. Earlier `fs.readFile(public/devotionals/...)`
// silently failed on Cloudflare Workers because public/ files are
// bound as ASSETS, not on the Worker filesystem.

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

  // Prefer the day's own teaser (build-time index from
  // public/devotionals/[slug].json) over the series-level question.
  // Series-level descriptions are identical for every day in a series;
  // Google deduplicates them. The teaser is unique per day.
  const dayTeaser = getDevotionalTeaser(slug)
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

  // Audit T2 — pull the per-day teaser from the build-time index for
  // the JSON-LD Article description as well.
  const dayTeaser = meta ? getDevotionalTeaser(slug) : null
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
      {/* NOTE: initialDevotional intentionally NOT passed. Audit C1 is
          deferred — passing the JSON through the server/client boundary
          broke prerendering on too-busy-for-god-day-6 with a runtime
          "b.replace is not a function" error. Needs paired investigation
          to pin down which deeply-nested object field the renderer
          dereferences as a string. */}
      <DevotionalPageClient slug={slug} silo="euangelion" />
    </>
  )
}
