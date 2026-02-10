import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SERIES_DATA, ALL_SERIES_ORDER } from '@/data/series'
import SeriesPageClient from './SeriesPageClient'

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
      { '@type': 'ListItem', position: 3, name: series.title },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <SeriesPageClient slug={slug} series={series} />
    </>
  )
}
