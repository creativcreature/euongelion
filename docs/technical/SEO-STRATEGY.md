# EUONGELION SEO Strategy

**Version:** 1.0
**Last Updated:** January 17, 2026

---

## Overview

SEO strategy for EUONGELION devotional platform. Focus on discoverability for seekers searching for spiritual content, Bible study resources, and devotional materials.

**Primary Goals:**

1. Attract seekers searching for devotional content
2. Enable social sharing with compelling previews
3. Establish authority for wokeGod brand
4. Support series/content discoverability

---

## Meta Title Templates

### Format Guidelines

- Maximum 60 characters (Google truncates beyond this)
- Primary keyword near the beginning
- Brand at the end
- Use pipes (|) or dashes (-) as separators

### Templates by Page Type

#### Homepage

```
EUONGELION | Daily Devotionals for the Spiritually Curious
```

- Character count: 54
- Focus: Brand awareness + value proposition

#### Series Browse

```
Devotional Series | Guided Bible Studies | EUONGELION
```

- Character count: 52
- Focus: Content type + brand

#### Series Detail

```
{Series Title} | {Day Count}-Day Devotional | EUONGELION
```

Examples:

- `Fear Not | 5-Day Devotional Series | EUONGELION` (47 chars)
- `The Good News | 7-Day Gospel Journey | EUONGELION` (49 chars)

#### About Page

```
About EUONGELION | Daily Devotionals by wokeGod
```

- Character count: 46
- Focus: Brand + parent organization

#### Legal Pages

```
Privacy Policy | EUONGELION
Terms of Service | EUONGELION
```

#### 404 Page

```
Page Not Found | EUONGELION
```

---

## Meta Description Templates

### Format Guidelines

- 150-160 characters optimal (Google truncates at ~160)
- Include primary CTA or value proposition
- Use active voice
- Include relevant keywords naturally

### Templates by Page Type

#### Homepage

```
Discover daily devotionals that meet you where you are. Deep Bible study with Hebrew and Greek word studies, modern stories, and practical reflection. Start your journey today.
```

- Character count: 173 (will truncate slightly)
- Focus: Value proposition + features + CTA

#### Series Browse

```
Explore {count}+ devotional series covering fear, anxiety, grief, faith foundations, and more. Each series guides you through Scripture with depth and beauty. Find your path.
```

- Character count: ~165
- Focus: Content breadth + topics + CTA

#### Series Detail

```
{Series Title}: A {day_count}-day journey through {core_theme}. Discover Hebrew word studies, powerful stories, and daily reflections. Begin your transformation today.
```

Example:

```
Fear Not: A 5-day journey through anxiety and trust. Discover Hebrew word studies, powerful stories, and daily reflections. Begin your transformation today.
```

- Character count: 154

#### About Page

```
EUONGELION is a daily devotional platform by wokeGod. We create deep, beautiful Bible study content for seekers, skeptics, and those finding their way back to faith.
```

- Character count: 165

---

## Open Graph (OG) Specifications

### Standard OG Tags (All Pages)

```html
<meta property="og:site_name" content="EUONGELION" />
<meta property="og:locale" content="en_US" />
<meta property="og:type" content="website" />
```

### Page-Specific OG Tags

#### Homepage

```html
<meta
  property="og:title"
  content="EUONGELION | Daily Devotionals for the Spiritually Curious"
/>
<meta
  property="og:description"
  content="Discover daily devotionals with deep Bible study, Hebrew word studies, and modern stories. Start your journey today."
/>
<meta property="og:url" content="https://wokegod.world" />
<meta property="og:image" content="https://wokegod.world/og/home.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta
  property="og:image:alt"
  content="EUONGELION - Daily devotionals for the spiritually curious"
/>
```

#### Series Detail

```html
<meta property="og:type" content="article" />
<meta
  property="og:title"
  content="{Series Title} | {Day Count}-Day Devotional"
/>
<meta
  property="og:description"
  content="{Series subtitle or core_theme description}"
/>
<meta property="og:url" content="https://wokegod.world/series/{slug}" />
<meta
  property="og:image"
  content="https://wokegod.world/og/series/{slug}.png"
/>
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta
  property="og:image:alt"
  content="{Series Title} - EUONGELION devotional series"
/>
<meta property="article:author" content="wokeGod" />
<meta property="article:section" content="Devotional" />
<meta property="article:tag" content="{pathway}" />
```

#### Shared Day Content (Public Preview)

```html
<meta property="og:type" content="article" />
<meta property="og:title" content="{Day Title} | Day {N} of {Series Title}" />
<meta
  property="og:description"
  content="Join the journey. {First sentence of teaching or hook}"
/>
<meta
  property="og:url"
  content="https://wokegod.world/share/{series-slug}/{day}"
/>
<meta
  property="og:image"
  content="https://wokegod.world/og/series/{slug}.png"
/>
```

---

## OG Image Specifications

### Dimensions

- **Standard:** 1200 x 630 pixels (1.91:1 ratio)
- **High-res:** 2400 x 1260 pixels (for retina displays)
- **Format:** PNG (for text clarity) or WebP
- **File size:** Under 300KB

### Design Guidelines

#### Homepage OG Image

```
Layout:
┌─────────────────────────────────────────────┐
│                                             │
│     EUONGELION                              │
│     ──────────                              │
│                                             │
│     Daily devotionals for the               │
│     spiritually curious                     │
│                                             │
│                            [wokeGod logo]   │
└─────────────────────────────────────────────┘

Colors:
- Background: Tehom Black (#1A1612)
- Text: Scroll White (#F7F3ED)
- Accent: God is Gold (#C19A6B)

Typography:
- "EUONGELION": Playfair Display, 72pt
- Tagline: DM Sans, 32pt
```

#### Series OG Image Template

```
Layout:
┌─────────────────────────────────────────────┐
│                                             │
│     {SERIES TITLE}                          │
│     A {N}-day devotional journey            │
│                                             │
│     [Visual: Caravaggio-style image         │
│      representing series theme]             │
│                                             │
│                            EUONGELION       │
└─────────────────────────────────────────────┘

Typography:
- Series title: Playfair Display, 64pt, white
- Subtitle: DM Sans, 28pt, gold
- Brand: DM Sans, 24pt, white/gold
```

### OG Image Generation Strategy

**Option 1: Pre-generated (Recommended for MVP)**

- Create OG images for each series manually
- Store in `/public/og/series/{slug}.png`
- Lower complexity, guaranteed quality

**Option 2: Dynamic with @vercel/og (Phase 2)**

```typescript
// app/api/og/series/[slug]/route.tsx
import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';

export async function GET(request: Request, { params }: { params: { slug: string } }) {
  const series = await getSeriesBySlug(params.slug);

  return new ImageResponse(
    (
      <div style={{
        background: '#1A1612',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: 60,
      }}>
        <div style={{ color: '#F7F3ED', fontSize: 64, fontFamily: 'Playfair Display' }}>
          {series.title}
        </div>
        <div style={{ color: '#C19A6B', fontSize: 28 }}>
          A {series.day_count}-day devotional journey
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
```

---

## Twitter Card Specifications

### Card Type

Use `summary_large_image` for visual impact

### Standard Twitter Tags (All Pages)

```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:site" content="@wokegod" />
<meta name="twitter:creator" content="@wokegod" />
```

### Page-Specific Twitter Tags

#### Homepage

```html
<meta name="twitter:title" content="EUONGELION | Daily Devotionals" />
<meta
  name="twitter:description"
  content="Deep Bible study with Hebrew word studies, modern stories, and daily reflection. Start your journey."
/>
<meta name="twitter:image" content="https://wokegod.world/og/home.png" />
<meta
  name="twitter:image:alt"
  content="EUONGELION - Daily devotionals for the spiritually curious"
/>
```

#### Series Detail

```html
<meta
  name="twitter:title"
  content="{Series Title} | {Day Count}-Day Devotional"
/>
<meta name="twitter:description" content="{Series subtitle - max 200 chars}" />
<meta
  name="twitter:image"
  content="https://wokegod.world/og/series/{slug}.png"
/>
<meta name="twitter:image:alt" content="{Series Title} devotional series" />
```

---

## Structured Data (JSON-LD)

### Organization Schema (Site-Wide)

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "wokeGod",
  "url": "https://wokegod.world",
  "logo": "https://wokegod.world/logo.png",
  "sameAs": ["https://twitter.com/wokegod", "https://instagram.com/wokegod"],
  "description": "Faith resources for the spiritually curious"
}
```

### WebSite Schema (Homepage)

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "EUONGELION",
  "url": "https://wokegod.world",
  "description": "Daily devotionals for the spiritually curious",
  "publisher": {
    "@type": "Organization",
    "name": "wokeGod"
  },
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://wokegod.world/series?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
```

### Series Schema (Series Detail Pages)

```json
{
  "@context": "https://schema.org",
  "@type": "Course",
  "name": "{Series Title}",
  "description": "{Series subtitle or core_theme}",
  "provider": {
    "@type": "Organization",
    "name": "EUONGELION",
    "url": "https://wokegod.world"
  },
  "numberOfCredits": "{day_count}",
  "educationalLevel": "Beginner",
  "about": {
    "@type": "Thing",
    "name": "{pathway} - Spiritual Growth"
  },
  "hasCourseInstance": {
    "@type": "CourseInstance",
    "courseMode": "online",
    "courseWorkload": "PT15M"
  }
}
```

### Devotional Day Schema (Individual Days - If Public)

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "{Day Title}",
  "description": "{First 160 chars of teaching content}",
  "author": {
    "@type": "Organization",
    "name": "wokeGod"
  },
  "publisher": {
    "@type": "Organization",
    "name": "EUONGELION",
    "logo": {
      "@type": "ImageObject",
      "url": "https://wokegod.world/logo.png"
    }
  },
  "datePublished": "{created_at}",
  "dateModified": "{updated_at}",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://wokegod.world/share/{series-slug}/{day}"
  },
  "image": "https://wokegod.world/og/series/{series-slug}.png",
  "articleSection": "Devotional",
  "keywords": "{series emotional_tones and life_circumstances}",
  "isPartOf": {
    "@type": "Course",
    "name": "{Series Title}",
    "url": "https://wokegod.world/series/{series-slug}"
  }
}
```

### BreadcrumbList Schema

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://wokegod.world"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Series",
      "item": "https://wokegod.world/series"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "{Series Title}",
      "item": "https://wokegod.world/series/{slug}"
    }
  ]
}
```

---

## Implementation: Next.js Metadata API

### Root Layout Metadata

```typescript
// app/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL('https://wokegod.world'),
  title: {
    default: 'EUONGELION | Daily Devotionals for the Spiritually Curious',
    template: '%s | EUONGELION',
  },
  description:
    'Discover daily devotionals with deep Bible study, Hebrew word studies, and modern stories. Start your journey today.',
  keywords: [
    'devotional',
    'Bible study',
    'daily devotional',
    'spiritual growth',
    'Christian',
    'faith',
  ],
  authors: [{ name: 'wokeGod' }],
  creator: 'wokeGod',
  publisher: 'wokeGod',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'EUONGELION',
    images: [
      {
        url: '/og/home.png',
        width: 1200,
        height: 630,
        alt: 'EUONGELION - Daily devotionals for the spiritually curious',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@wokegod',
    creator: '@wokegod',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'google-site-verification-code',
  },
}
```

### Series Page Metadata

```typescript
// app/series/[slug]/page.tsx
import type { Metadata } from 'next'
import { getSeriesBySlug } from '@/lib/series'

type Props = {
  params: { slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const series = await getSeriesBySlug(params.slug)

  if (!series) {
    return {
      title: 'Series Not Found',
    }
  }

  return {
    title: `${series.title} | ${series.day_count}-Day Devotional`,
    description:
      series.subtitle ||
      `A ${series.day_count}-day devotional journey exploring ${series.core_theme}`,
    openGraph: {
      title: `${series.title} | ${series.day_count}-Day Devotional`,
      description: series.subtitle,
      type: 'article',
      url: `/series/${series.slug}`,
      images: [
        {
          url: `/og/series/${series.slug}.png`,
          width: 1200,
          height: 630,
          alt: `${series.title} - EUONGELION devotional series`,
        },
      ],
    },
    twitter: {
      title: `${series.title} | ${series.day_count}-Day Devotional`,
      description: series.subtitle,
      images: [`/og/series/${series.slug}.png`],
    },
  }
}
```

### JSON-LD Component

```typescript
// components/JsonLd.tsx
interface JsonLdProps {
  data: Record<string, any>;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// Usage in page
import { JsonLd } from '@/components/JsonLd';

export default function SeriesPage({ series }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: series.title,
    description: series.subtitle,
    provider: {
      '@type': 'Organization',
      name: 'EUONGELION',
    },
    numberOfCredits: series.day_count,
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      {/* Page content */}
    </>
  );
}
```

---

## Sitemap Strategy

### Sitemap Structure

```
/sitemap.xml (index)
├── /sitemap-static.xml    (static pages)
├── /sitemap-series.xml    (all published series)
└── /sitemap-legal.xml     (legal pages)
```

### Static Sitemap

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://wokegod.world</loc>
    <lastmod>2026-01-17</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://wokegod.world/series</loc>
    <lastmod>2026-01-17</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://wokegod.world/about</loc>
    <lastmod>2026-01-17</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>
```

### Dynamic Series Sitemap (Next.js)

```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next'
import { getAllPublishedSeries } from '@/lib/series'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const series = await getAllPublishedSeries()

  const seriesUrls = series.map((s) => ({
    url: `https://wokegod.world/series/${s.slug}`,
    lastModified: s.updated_at,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [
    {
      url: 'https://wokegod.world',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://wokegod.world/series',
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: 'https://wokegod.world/about',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    ...seriesUrls,
  ]
}
```

---

## robots.txt

```txt
# robots.txt for EUONGELION
# https://wokegod.world/robots.txt

User-agent: *
Allow: /
Disallow: /api/
Disallow: /auth/
Disallow: /daily-bread/
Disallow: /settings/
Disallow: /progress/

# Block authenticated content paths
Disallow: /*?day=
Disallow: /*?ref=

# Sitemaps
Sitemap: https://wokegod.world/sitemap.xml

# Crawl rate (be gentle)
Crawl-delay: 1
```

### Next.js robots.ts

```typescript
// app/robots.ts
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/auth/',
          '/daily-bread/',
          '/settings/',
          '/progress/',
        ],
      },
    ],
    sitemap: 'https://wokegod.world/sitemap.xml',
  }
}
```

---

## Canonical URLs

### Implementation

```typescript
// In metadata
export const metadata: Metadata = {
  alternates: {
    canonical: 'https://wokegod.world/series/fear-not',
  },
}
```

### Rules

1. Always use HTTPS
2. Include trailing slash consistency (we use no trailing slash)
3. Remove query parameters for canonical
4. Point to preferred URL version

---

## SEO Checklist

### Pre-Launch

- [ ] All pages have unique title tags
- [ ] All pages have meta descriptions
- [ ] OG images created for homepage and each series
- [ ] Twitter card tags configured
- [ ] JSON-LD schema on all public pages
- [ ] Sitemap generated and accessible
- [ ] robots.txt configured
- [ ] Canonical URLs set
- [ ] Google Search Console verified
- [ ] Bing Webmaster Tools verified (optional)

### Content Guidelines

- [ ] Series titles include relevant keywords
- [ ] Series subtitles are descriptive
- [ ] H1 tags used correctly (one per page)
- [ ] Image alt text meaningful
- [ ] Internal linking between related series
- [ ] No broken links (404s)

### Technical

- [ ] Pages load under 3 seconds
- [ ] Mobile-friendly (responsive)
- [ ] HTTPS enforced
- [ ] No duplicate content
- [ ] Proper redirects (301 for permanent)
- [ ] Core Web Vitals passing

---

## Monitoring

### Tools

- **Google Search Console:** Index coverage, search performance
- **Google Analytics / Vercel Analytics:** Traffic sources, landing pages
- **Ahrefs or SEMrush (optional):** Keyword rankings, backlinks

### Key Metrics to Track

1. Organic search impressions
2. Click-through rate (CTR) from search
3. Indexed pages count
4. Top landing pages from organic
5. Top queries driving traffic

---

_This SEO strategy should be reviewed quarterly and updated as content expands and search patterns evolve._
