# EUONGELION Performance Budget

**Version:** 1.0
**Last Updated:** January 17, 2026

---

## Overview

Performance budget defining target metrics, bundle sizes, and optimization strategies for EUONGELION. These budgets ensure a fast, accessible experience across all devices and network conditions.

**Philosophy:** The devotional reading experience should feel immediate and immersive. Performance is a feature.

---

## Core Web Vitals Targets

### Production Targets (75th Percentile)

| Metric                              | Target  | Acceptable | Poor    |
| ----------------------------------- | ------- | ---------- | ------- |
| **LCP** (Largest Contentful Paint)  | < 2.0s  | < 2.5s     | > 2.5s  |
| **FID** (First Input Delay)         | < 50ms  | < 100ms    | > 100ms |
| **INP** (Interaction to Next Paint) | < 150ms | < 200ms    | > 200ms |
| **CLS** (Cumulative Layout Shift)   | < 0.05  | < 0.1      | > 0.1   |
| **TTFB** (Time to First Byte)       | < 200ms | < 400ms    | > 600ms |
| **FCP** (First Contentful Paint)    | < 1.2s  | < 1.8s     | > 2.0s  |

### Mobile-Specific Targets

Testing on: Moto G Power (mid-tier Android) on 3G

| Metric                    | Target  | Notes                               |
| ------------------------- | ------- | ----------------------------------- |
| LCP                       | < 3.0s  | Allow extra time for slower devices |
| FID                       | < 100ms | Critical for Soul Audit form        |
| TTI (Time to Interactive) | < 4.0s  | Full interactivity                  |

### Per-Page Targets

| Page                           | LCP Target | LCP Element                              |
| ------------------------------ | ---------- | ---------------------------------------- |
| Home `/`                       | < 2.0s     | Hero text "What are you wrestling with?" |
| Series Browse `/series`        | < 2.0s     | First series card image                  |
| Series Detail `/series/[slug]` | < 2.0s     | Series hero image                        |
| Daily Bread `/daily-bread`     | < 2.5s     | First module content                     |
| Settings `/settings`           | < 1.5s     | Form container                           |

---

## Bundle Size Budgets

### Total JavaScript Budget

| Metric                    | Budget  | Warning Threshold |
| ------------------------- | ------- | ----------------- |
| Initial JS (compressed)   | < 100KB | > 80KB            |
| Initial JS (uncompressed) | < 350KB | > 280KB           |
| Total JS (all chunks)     | < 300KB | > 240KB           |
| Main bundle               | < 50KB  | > 40KB            |

### Per-Route Budgets

| Route            | JS Budget (compressed) | Notes                             |
| ---------------- | ---------------------- | --------------------------------- |
| `/` (Home)       | < 60KB                 | Includes Soul Audit form          |
| `/series`        | < 45KB                 | List rendering                    |
| `/series/[slug]` | < 50KB                 | Series detail                     |
| `/daily-bread`   | < 80KB                 | Module renderer, all module types |
| `/settings`      | < 35KB                 | Simple form                       |

### Third-Party Script Budgets

| Category        | Budget | Current Estimate               |
| --------------- | ------ | ------------------------------ |
| Analytics       | < 15KB | Vercel: ~10KB, Plausible: ~1KB |
| Error tracking  | < 20KB | Sentry: ~15KB (if used)        |
| Fonts           | < 50KB | See font strategy below        |
| Total 3rd party | < 85KB | -                              |

### Bundle Splitting Strategy

```
Route Bundles:
├── _app.js           # Framework runtime, shared components (~40KB)
├── home.js           # Soul Audit, landing page (~20KB)
├── series.js         # Series browse, cards (~15KB)
├── series-detail.js  # Series detail page (~18KB)
├── daily-bread.js    # Module renderer base (~25KB)
├── settings.js       # Settings form (~12KB)
└── modules/          # Lazy-loaded per module type
    ├── scripture.js  (~3KB)
    ├── teaching.js   (~4KB)
    ├── vocab.js      (~5KB)
    ├── story.js      (~4KB)
    ├── insight.js    (~3KB)
    ├── prayer.js     (~3KB)
    ├── takeaway.js   (~3KB)
    ├── reflection.js (~4KB)
    ├── bridge.js     (~4KB)
    ├── comprehension.js (~5KB)
    ├── resource.js   (~4KB)
    └── profile.js    (~5KB)
```

---

## Image Size Budgets

### Per-Image Limits

| Image Type    | Max Size (KB) | Dimensions    | Format        |
| ------------- | ------------- | ------------- | ------------- |
| Hero images   | 150KB         | 1920x1080 max | WebP/AVIF     |
| Series cards  | 50KB          | 640x400       | WebP          |
| Module images | 80KB          | 1280x720 max  | WebP          |
| Thumbnails    | 20KB          | 320x200       | WebP          |
| OG images     | 200KB         | 1200x630      | PNG           |
| Icons/UI      | 5KB each      | 64x64 max     | SVG preferred |

### Responsive Image Strategy

```html
<!-- Hero image example -->
<image
  src="/images/series/fear-not-hero.webp"
  alt="Fear Not series hero"
  width="{1920}"
  height="{1080}"
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 1200px"
  priority
  placeholder="blur"
  blurDataURL="{blurHash}"
/>
```

### Image Optimization Settings

```javascript
// next.config.js
module.exports = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
}
```

### Image Loading Priority

| Image                 | Loading    | Reason           |
| --------------------- | ---------- | ---------------- |
| Hero (above fold)     | `priority` | LCP element      |
| Series card (first 4) | `priority` | Visible on load  |
| Series card (rest)    | `lazy`     | Below fold       |
| Module images         | `lazy`     | Scroll into view |
| User avatars          | `lazy`     | Secondary        |

---

## Font Loading Strategy

### Font Selection

| Font             | Weight        | Usage             | Format |
| ---------------- | ------------- | ----------------- | ------ |
| DM Sans          | 400, 500, 700 | Body, UI          | WOFF2  |
| Playfair Display | 400, 700      | Headlines, titles | WOFF2  |

### Font File Budgets

| Font File        | Max Size  | Actual     |
| ---------------- | --------- | ---------- |
| DM Sans Regular  | 20KB      | ~18KB      |
| DM Sans Medium   | 20KB      | ~18KB      |
| DM Sans Bold     | 20KB      | ~18KB      |
| Playfair Regular | 25KB      | ~22KB      |
| Playfair Bold    | 25KB      | ~24KB      |
| **Total**        | **110KB** | **~100KB** |

### Font Loading Implementation

```css
/* Critical font CSS - inline in <head> */
@font-face {
  font-family: 'DM Sans';
  src: url('/fonts/dm-sans-400.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
  unicode-range:
    U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC,
    U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF,
    U+FFFD;
}
```

### Font Display Strategy

```typescript
// Approach: font-display: swap with fallback optimization
const fontFallback = {
  'DM Sans':
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  'Playfair Display': 'Georgia, "Times New Roman", serif',
}
```

### Preload Critical Fonts

```html
<head>
  <link
    rel="preload"
    href="/fonts/dm-sans-400.woff2"
    as="font"
    type="font/woff2"
    crossorigin
  />
  <link
    rel="preload"
    href="/fonts/playfair-display-700.woff2"
    as="font"
    type="font/woff2"
    crossorigin
  />
</head>
```

---

## Caching Policy

### Cache-Control Headers

| Resource Type | Cache-Control                                                  | Max-Age   |
| ------------- | -------------------------------------------------------------- | --------- |
| HTML pages    | `public, max-age=0, s-maxage=31536000, stale-while-revalidate` | ISR based |
| Static JS/CSS | `public, max-age=31536000, immutable`                          | 1 year    |
| Images        | `public, max-age=31536000, immutable`                          | 1 year    |
| Fonts         | `public, max-age=31536000, immutable`                          | 1 year    |
| API responses | `private, no-cache`                                            | None      |
| User-specific | `private, no-store`                                            | None      |

### Vercel Edge Caching

```typescript
// next.config.js headers
async headers() {
  return [
    {
      source: '/fonts/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
    {
      source: '/images/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
  ];
}
```

### ISR (Incremental Static Regeneration)

| Page             | Revalidation   | Notes                   |
| ---------------- | -------------- | ----------------------- |
| `/` (Home)       | 3600s (1 hour) | Series count may change |
| `/series`        | 3600s (1 hour) | New series may be added |
| `/series/[slug]` | 3600s (1 hour) | Series content stable   |
| `/about`         | 86400s (1 day) | Rarely changes          |

```typescript
// Example: Series page
export const revalidate = 3600 // 1 hour

export default async function SeriesPage({ params }) {
  const series = await getSeriesBySlug(params.slug)
  // ...
}
```

### Service Worker Strategy (Phase 2)

```javascript
// Cache-first for static assets
// Network-first for API calls
// Stale-while-revalidate for pages

const CACHE_VERSION = 'v1'
const STATIC_CACHE = `static-${CACHE_VERSION}`
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`

// Precache critical assets
const PRECACHE = [
  '/',
  '/fonts/dm-sans-400.woff2',
  '/fonts/playfair-display-700.woff2',
]
```

---

## Network Optimization

### Resource Hints

```html
<head>
  <!-- DNS prefetch for third-party domains -->
  <link rel="dns-prefetch" href="//fonts.googleapis.com" />
  <link rel="dns-prefetch" href="//api.anthropic.com" />

  <!-- Preconnect to critical origins -->
  <link rel="preconnect" href="https://your-project.supabase.co" crossorigin />

  <!-- Prefetch likely next pages -->
  <link rel="prefetch" href="/series" />
</head>
```

### Prefetching Strategy

```typescript
// Next.js Link with prefetch
import Link from 'next/link';

// Prefetch on hover (default)
<Link href="/series/fear-not">Fear Not</Link>

// Prefetch immediately
<Link href="/series" prefetch={true}>Browse Series</Link>

// No prefetch (authenticated routes)
<Link href="/daily-bread" prefetch={false}>Daily Bread</Link>
```

### API Response Optimization

| Endpoint               | Target Response Time | Optimization                   |
| ---------------------- | -------------------- | ------------------------------ |
| GET /api/series        | < 100ms              | Database indexes, edge caching |
| GET /api/series/[slug] | < 150ms              | ISR, database indexes          |
| GET /api/daily-bread   | < 200ms              | Optimized query, no cache      |
| POST /api/soul-audit   | < 3000ms             | Claude API dependent           |
| POST /api/progress     | < 100ms              | Simple upsert                  |

---

## Performance Testing

### Tools

| Tool             | Purpose                       | Frequency  |
| ---------------- | ----------------------------- | ---------- |
| Lighthouse CI    | Automated performance testing | Every PR   |
| WebPageTest      | Detailed analysis             | Weekly     |
| Vercel Analytics | Real user metrics             | Continuous |
| Chrome DevTools  | Development debugging         | During dev |

### Lighthouse CI Configuration

```yaml
# lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/series',
        'http://localhost:3000/series/fear-not',
      ],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['error', { maxNumericValue: 1800 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

### Performance Testing Checklist

**Before Each Release:**

- [ ] Lighthouse score > 90 on all categories
- [ ] LCP < 2.5s on 3G throttled
- [ ] CLS < 0.1 across all pages
- [ ] Total JS < 100KB compressed
- [ ] No unused CSS > 10KB
- [ ] All images optimized
- [ ] Fonts loading correctly

**Monthly Audit:**

- [ ] Review real user metrics (Vercel Analytics)
- [ ] Check bundle size trends
- [ ] Test on low-end device
- [ ] Review third-party script impact

---

## Performance Monitoring

### Key Metrics Dashboard

Track in Vercel Analytics or custom dashboard:

| Metric         | Target  | Alert Threshold |
| -------------- | ------- | --------------- |
| p75 LCP        | < 2.5s  | > 3.0s          |
| p75 FID        | < 100ms | > 150ms         |
| p75 CLS        | < 0.1   | > 0.15          |
| Error rate     | < 0.1%  | > 0.5%          |
| JS bundle size | < 100KB | > 120KB         |

### Alerting

Set up alerts for:

1. LCP regression > 500ms from baseline
2. CLS increase > 0.05 from baseline
3. Bundle size increase > 20KB
4. Error rate spike > 1%

---

## Optimization Techniques

### Code Splitting

```typescript
// Lazy load non-critical components
import dynamic from 'next/dynamic';

const SoulAuditForm = dynamic(() => import('@/components/SoulAuditForm'), {
  loading: () => <SoulAuditSkeleton />,
  ssr: false, // Client-only
});

const ModuleRenderer = dynamic(() => import('@/components/ModuleRenderer'), {
  loading: () => <ModuleSkeleton />,
});
```

### Image Optimization

```typescript
// Use blur placeholder for hero images
import { getPlaiceholder } from 'plaiceholder'

export async function getSeriesWithBlur(slug: string) {
  const series = await getSeriesBySlug(slug)
  const { base64 } = await getPlaiceholder(series.heroImage)
  return { ...series, blurDataURL: base64 }
}
```

### CSS Optimization

```typescript
// Tailwind CSS purge configuration
// tailwind.config.js
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  // Enables tree-shaking of unused styles
}
```

### React Optimization

```typescript
// Memoize expensive computations
import { useMemo, memo } from 'react';

const ModuleList = memo(function ModuleList({ modules }) {
  const sortedModules = useMemo(
    () => modules.sort((a, b) => a.position - b.position),
    [modules]
  );

  return sortedModules.map((module) => (
    <ModuleRenderer key={module.id} module={module} />
  ));
});
```

---

## Budget Enforcement

### Build-Time Checks

```json
// package.json
{
  "scripts": {
    "analyze": "ANALYZE=true next build",
    "check-bundle": "bundlesize",
    "lighthouse": "lhci autorun"
  }
}
```

### Bundle Size Check

```json
// bundlesize configuration (package.json or .bundlesizerc)
{
  "bundlesize": [
    {
      "path": ".next/static/chunks/main-*.js",
      "maxSize": "50KB"
    },
    {
      "path": ".next/static/chunks/pages/_app-*.js",
      "maxSize": "40KB"
    },
    {
      "path": ".next/static/css/*.css",
      "maxSize": "30KB"
    }
  ]
}
```

### CI/CD Integration

```yaml
# .github/workflows/performance.yml
name: Performance Checks

on: [push, pull_request]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm run lighthouse
        env:
          LHCI_GITHUB_TOKEN: ${{ secrets.LHCI_GITHUB_TOKEN }}

  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm run check-bundle
```

---

## Performance Budget Summary

| Category          | Budget       | Enforcement   |
| ----------------- | ------------ | ------------- |
| Initial JS        | < 100KB gzip | CI check      |
| Total JS          | < 300KB gzip | CI check      |
| CSS               | < 30KB gzip  | CI check      |
| Fonts             | < 110KB      | Manual        |
| Images (hero)     | < 150KB each | Manual        |
| LCP               | < 2.5s       | Lighthouse CI |
| CLS               | < 0.1        | Lighthouse CI |
| Performance score | > 90         | Lighthouse CI |

---

_Performance budgets should be reviewed monthly and adjusted based on feature requirements and real user data._
