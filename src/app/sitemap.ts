import type { MetadataRoute } from 'next'
import { SERIES_DATA, SERIES_ORDER } from '@/data/series'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://euangelion.app'
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${baseUrl}/wake-up`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ]

  const seriesPages: MetadataRoute.Sitemap = SERIES_ORDER.map((slug) => ({
    url: `${baseUrl}/wake-up/series/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  const devotionalPages: MetadataRoute.Sitemap = SERIES_ORDER.flatMap(
    (seriesSlug) =>
      SERIES_DATA[seriesSlug].days.map((day) => ({
        url: `${baseUrl}/wake-up/devotional/${day.slug}`,
        lastModified: now,
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      })),
  )

  return [...staticPages, ...seriesPages, ...devotionalPages]
}
