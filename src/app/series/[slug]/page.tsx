import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SERIES_DATA, ALL_SERIES_ORDER } from '@/data/series'
import { buildSeriesDayScriptureMap } from '@/lib/soul-audit/series-day-scripture'
import { buildSeriesArtwork, buildSeriesVoices } from '@/lib/series-detail-tabs'
import SeriesPageClient from '@/app/wake-up/series/[slug]/SeriesPageClient'

export const revalidate = 3600

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const series = SERIES_DATA[slug]
  if (!series) return { title: 'Series Not Found' }

  return {
    title: series.title,
    description: series.question,
    openGraph: {
      title: `${series.title} | Euangelion`,
      description: series.question,
      type: 'article',
    },
  }
}

export function generateStaticParams() {
  return ALL_SERIES_ORDER.map((slug) => ({ slug }))
}

export default async function SeriesPage({ params }: Props) {
  const { slug } = await params
  const series = SERIES_DATA[slug]
  if (!series) notFound()
  const dayScriptureByDayNumber = buildSeriesDayScriptureMap({
    seriesSlug: slug,
    framework: series.framework,
    dayNumbers: series.days.map((day) => day.day),
  })

  // F-074 series detail tabs — VOICES (profile modules from the day
  // JSONs) and ARTWORK (per-day art assignments). Empty arrays mean
  // the tab is omitted client-side.
  const voices = await buildSeriesVoices(series)
  const artwork = buildSeriesArtwork(series)

  const seriesUrl = `https://euangelion.app/series/${slug}`

  const breadcrumbJsonLd = {
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
        name: series.title,
        item: seriesUrl,
      },
    ],
  }

  // Schema.org CreativeWorkSeries describes the series itself so search
  // engines can render it as a multi-day reading collection (vs. a
  // single article). hasPart enumerates each day so day-level pages can
  // surface in sitelinks.
  const seriesJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWorkSeries',
    name: series.title,
    headline: series.title,
    description: series.introduction || series.question,
    url: seriesUrl,
    numberOfEpisodes: series.days.length,
    inLanguage: 'en',
    genre: 'Christian devotional',
    publisher: {
      '@type': 'Organization',
      name: 'Euangelion',
      url: 'https://euangelion.app',
    },
    image: series.heroImage
      ? `https://euangelion.app${series.heroImage}`
      : undefined,
    hasPart: series.days.map((day) => ({
      '@type': 'CreativeWork',
      position: day.day,
      name: day.title,
      url: `https://euangelion.app/devotional/${day.slug}`,
    })),
  }

  // Audit batch 2026-05-14: emit a CollectionPage entity alongside
  // CreativeWorkSeries. The two complement each other: CWS describes
  // the series as a work; CollectionPage describes the URL as a
  // collection-of-things-to-read. Both index well.
  const collectionPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: series.title,
    description: series.introduction || series.question,
    url: seriesUrl,
    inLanguage: 'en',
    isPartOf: {
      '@type': 'WebSite',
      name: 'Euangelion',
      url: 'https://euangelion.app',
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: series.days.length,
      itemListOrder: 'Ascending',
      itemListElement: series.days.map((day) => ({
        '@type': 'ListItem',
        position: day.day,
        name: day.title,
        url: `https://euangelion.app/devotional/${day.slug}`,
      })),
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(seriesJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(collectionPageJsonLd),
        }}
      />
      <SeriesPageClient
        slug={slug}
        series={series}
        silo="euangelion"
        dayScriptureByDayNumber={dayScriptureByDayNumber}
        voices={voices}
        artwork={artwork}
      />
    </>
  )
}
