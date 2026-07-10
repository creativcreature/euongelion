import type { Metadata } from 'next'
import { SERIES_DATA, SERIES_ORDER } from '@/data/series'
import DevotionalPageClient from '@/app/wake-up/devotional/[slug]/DevotionalPageClient'
import {
  getDevotionalTeaser,
  getDevotionalTitle,
} from '@/data/devotional-teasers'
import { fetchTodayDevotional } from '@/lib/today-devotional'
import type { Devotional } from '@/types'

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

  // Audit Manus §5 (Updated 2026-05-13): prefer the devotional's
  // actual headline (from its JSON) over the bare "Day N" placeholder
  // stored in series.ts. The page <title> becomes the article
  // headline ("A Voice in the Wilderness") instead of "Day 1" — fixes
  // SEO + shareability.
  const jsonTitle = getDevotionalTitle(slug)
  const isBareDayPlaceholder = /^day\s+\d+$/i.test(meta.day.title.trim())
  const dayTitle = jsonTitle
    ? jsonTitle
    : isBareDayPlaceholder
      ? meta.day.title
      : `Day ${meta.day.day}: ${meta.day.title}`

  // Prefer the day's own teaser (build-time index from
  // public/devotionals/[slug].json) over the series-level question.
  // Series-level descriptions are identical for every day in a series;
  // Google deduplicates them. The teaser is unique per day.
  const dayTeaser = getDevotionalTeaser(slug)
  const description =
    dayTeaser ?? `${meta.series.title} — ${meta.series.question}`

  // /devotional/[slug] IS the canonical devotional surface (founder
  // direction 2026-05-07). The same content is also reachable via
  // /wake-up/devotional/[slug], but that route cross-canonicals here
  // (see its generateMetadata) so SEO ranking accrues on this URL.
  // This route stays self-canonical.
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

  // Mobbin P0 #8 (2026-07-10): server-render the devotional body so the
  // initial HTML carries the full reading — no client-side LOADING flash.
  // Same pattern as /wake-up/devotional/[slug] (Phase 1.1) and /today:
  // fetchTodayDevotional reads from fs at build/dev time and self-fetches
  // the static JSON asset on Cloudflare Workers (990e6cf6). The original
  // blocker — a "b.replace is not a function" prerender crash on
  // too-busy-for-god-day-6 — was root-caused to ResourceModule calling
  // typographer() on structured (non-string) fields and fixed at the
  // renderer layer in 0b873c86, so this route can now SSR safely.
  // On 404/error we pass null and the client falls back to its own fetch.
  const initialDevotional: Devotional | null = await fetchTodayDevotional(slug)

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
          author: {
            '@type': 'Organization',
            name: 'Euangelion',
            url: 'https://euangelion.app',
          },
          publisher: {
            '@type': 'Organization',
            name: 'Euangelion',
            url: 'https://euangelion.app',
            logo: {
              '@type': 'ImageObject',
              url: 'https://euangelion.app/icons/icon-512.png',
            },
          },
          // Anchor scripture is the canonical "based on" source.
          isBasedOn: meta.series.framework
            ? {
                '@type': 'Book',
                name: 'The Bible',
                bookEdition: meta.series.framework,
              }
            : undefined,
          isPartOf: {
            '@type': 'CreativeWorkSeries',
            name: meta.series.title,
            url: `https://euangelion.app/series/${meta.seriesSlug}`,
          },
          // Stable identity per devotional URL.
          mainEntityOfPage: {
            '@type': 'WebPage',
            '@id': `https://euangelion.app/devotional/${slug}`,
          },
          inLanguage: 'en',
          // Without per-day publish dates we use the build date — at
          // least bots get a parseable ISO. Update once dates land
          // on the devotional JSON itself.
          datePublished: '2026-01-01',
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
      {/* Mobbin P0 #8: pass the server-fetched devotional so the body is
          in the initial HTML (loading=false from first paint). */}
      <DevotionalPageClient
        slug={slug}
        silo="euangelion"
        initialDevotional={initialDevotional}
      />
    </>
  )
}
