import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SERIES_DATA, ALL_SERIES_ORDER } from '@/data/series'
import SeriesPageClient from './SeriesPageClient'

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

  return <SeriesPageClient slug={slug} series={series} />
}
