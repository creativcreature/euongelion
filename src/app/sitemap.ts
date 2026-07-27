import type { MetadataRoute } from 'next'
import { SERIES_DATA, ALL_SERIES_ORDER } from '@/data/series'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://euangelion.app'
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/soul-audit`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/series`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/daily-bread`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/sunday`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/sunday/archive`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/today`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/todays-edition`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/how-we-write`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/help`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/support`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/cookie-policy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/community-guidelines`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/content-disclaimer`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/donation-disclosure`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  const seriesPages: MetadataRoute.Sitemap = ALL_SERIES_ORDER.flatMap(
    (slug) => [
      {
        url: `${baseUrl}/series/${slug}`,
        lastModified: now,
        changeFrequency: 'monthly' as const,
        priority: 0.8,
      },
      {
        url: `${baseUrl}/series/${slug}`,
        lastModified: now,
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      },
    ],
  )

  // Only the canonical devotional surface is listed. The same content is
  // also reachable at /wake-up/devotional/[slug], but that route
  // cross-canonicals to /devotional/[slug] (founder direction 2026-05-07),
  // and sitemaps must list canonical URLs only — advertising the
  // non-canonical twin invites duplicate-content indexing.
  const devotionalPages: MetadataRoute.Sitemap = ALL_SERIES_ORDER.flatMap(
    (seriesSlug) =>
      (SERIES_DATA[seriesSlug]?.days || []).map((day) => ({
        url: `${baseUrl}/devotional/${day.slug}`,
        lastModified: now,
        changeFrequency: 'yearly' as const,
        priority: 0.7,
      })),
  )

  return [...staticPages, ...seriesPages, ...devotionalPages]
}
