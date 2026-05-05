import { NextResponse } from 'next/server'
import { SERIES_DATA } from '@/data/series'
import { WAKEUP_ORIGINALS_SLUGS } from '@/data/series-rails'

/**
 * RSS 2.0 feed for Wake-Up Magazine.
 *
 * Surfaces the 7 Wake-Up Originals series as feed items so readers
 * can subscribe via any RSS reader. Each item links to the canonical
 * Wake-Up series detail page.
 *
 * Static — does not include per-day items (each series is a 5+ day
 * journey better browsed in-product than as individual feed items).
 * If we ever want per-day items, switch to a paginated feed and
 * include cycle dates from `schedule.ts`.
 *
 * Cache: revalidates daily; the source data (SERIES_DATA + heroImage)
 * doesn't change between deploys.
 */
export const revalidate = 86_400

const SITE_URL = 'https://euangelion.app'
const FEED_URL = `${SITE_URL}/wake-up/feed.xml`

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  const buildDate = new Date().toUTCString()

  const items = WAKEUP_ORIGINALS_SLUGS.map((slug) => {
    const series = SERIES_DATA[slug]
    if (!series) return ''

    const seriesUrl = `${SITE_URL}/wake-up/series/${slug}`
    const description = series.introduction || series.context || series.question
    const heroImage = series.heroImage ? `${SITE_URL}${series.heroImage}` : null

    return `    <item>
      <title>${escapeXml(series.title)}</title>
      <link>${seriesUrl}</link>
      <guid isPermaLink="true">${seriesUrl}</guid>
      <description>${escapeXml(description)}</description>
      <category>${escapeXml(series.pathway)} Pathway</category>
${
  heroImage ? `      <enclosure url="${heroImage}" type="image/webp" />\n` : ''
}    </item>`
  })
    .filter(Boolean)
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Euangelion Wake-Up Magazine</title>
    <link>${SITE_URL}/wake-up</link>
    <atom:link href="${FEED_URL}" rel="self" type="application/rss+xml" />
    <description>Daily bread for the cluttered, hungry soul. Wake-Up Magazine is Euangelion's gateway collection — devotionals built for cultural anxiety, current events, and honest spiritual searching.</description>
    <language>en-us</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <generator>Euangelion (Next.js)</generator>
${items}
  </channel>
</rss>`

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
