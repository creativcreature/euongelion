import type { Metadata } from 'next'
import { SERIES_DATA, SERIES_ORDER } from '@/data/series'
import DevotionalPageClient from './DevotionalPageClient'

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

  return {
    title: `Day ${day.day}: ${day.title}`,
    description: `${series.title} — ${series.question}`,
    openGraph: {
      title: `Day ${day.day}: ${day.title} | ${series.title}`,
      description: series.question,
      type: 'article',
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

  const jsonLd = meta
    ? {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: `Day ${meta.day.day}: ${meta.day.title}`,
        description: `${meta.series.title} — ${meta.series.question}`,
        publisher: {
          '@type': 'Organization',
          name: 'Euangelion',
          url: 'https://euangelion.app',
        },
        isPartOf: {
          '@type': 'CreativeWorkSeries',
          name: meta.series.title,
        },
      }
    : null

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <DevotionalPageClient slug={slug} />
    </>
  )
}
