import type { MetadataRoute } from 'next'
import { SERIES_DATA, ALL_SERIES_ORDER } from '@/data/series'
import { AUTHOR_SLUGS } from '@/data/authors'
import { dailyBreadV2Enabled } from '@/lib/daily-bread/flags'
import { errorMessage } from '@/lib/daily-bread/redact'
import { getDailyBreadRepository } from '@/lib/daily-bread/repository'

/**
 * Plan §78: every published Daily Bread issue at its canonical dated URL, and
 * the archive. Withdrawn (superseded) issues are noindex, so they are left out.
 * A failed read is logged and the rest of the sitemap still serves.
 */
async function dailyBreadPages(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  if (!dailyBreadV2Enabled()) return []
  try {
    const entries = await getDailyBreadRepository().listArchive({ limit: 5000 })
    return [
      { url: `${baseUrl}/daily-bread/archive`, changeFrequency: 'daily', priority: 0.6 },
      ...entries
        .filter((e) => e.lifecycle === 'published')
        .map((e) => ({
          url: `${baseUrl}/daily-bread/${e.editionDate}`,
          lastModified: new Date(`${e.editionDate}T11:00:00Z`),
          changeFrequency: 'yearly' as const,
          priority: 0.6,
        })),
    ]
  } catch (error) {
    console.error('[sitemap] daily bread archive read failed', errorMessage(error))
    return []
  }
}

// Rendered per request: a sitemap prerendered at build would never list the
// issues published after it, and the Worker has no incremental cache to refresh it.
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
      // Outreach page — indexed deliberately and at high priority so someone
      // searching "help in Georgia" can find it without knowing about us.
      url: `${baseUrl}/seeking-help-georgia`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      // Introduction for someone with no church background. Indexed at high
      // priority — this is the page a cold search like "who is God" should land
      // on, and it is written to be read by a complete stranger.
      url: `${baseUrl}/who-is-god`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
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

  // The masthead's author pages (SA-089 follow-on).
  const authorPages: MetadataRoute.Sitemap = AUTHOR_SLUGS.map((slug) => ({
    url: `${baseUrl}/authors/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.4,
  }))

  return [...staticPages, ...seriesPages, ...devotionalPages, ...authorPages, ...(await dailyBreadPages(baseUrl))]
}
