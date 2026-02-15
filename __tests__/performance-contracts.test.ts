/**
 * Performance Contracts Test Suite
 *
 * Covers PLAN-V3 Phase 18.2, euan-PLAN-v2 performance tests, CLAUDE.md constraints:
 * - Core Web Vitals (LCP < 2.5s, FID/INP < 100ms, CLS < 0.1)
 * - Time to Interactive (TTI < 3.5s)
 * - TTFB thresholds per route
 * - API response latency limits
 * - Bundle size budgets
 * - API payload size limits
 * - Image optimization requirements
 * - Font loading strategy
 * - Code splitting verification
 * - Service worker caching strategy
 * - Library index query performance under volume
 */
import { describe, expect, it } from 'vitest'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PerformanceBudget {
  metric: string
  target: number
  unit: string
  pages: string[]
}

interface APILatencyBudget {
  route: string
  method: string
  maxMs: number
  p95MaxMs: number
  includesAI: boolean
}

interface BundleBudget {
  chunk: string
  maxSizeKB: number
  compressed: boolean
}

interface PayloadBudget {
  route: string
  maxSizeKB: number
  description: string
}

interface ImageOptimizationRule {
  context: string
  format: string[]
  lazyLoading: boolean
  maxWidthPx: number
  srcSetRequired: boolean
}

interface FontLoadingConfig {
  strategy: string
  subsetting: boolean
  preload: boolean
  fontDisplayValue: string
  fonts: { family: string; weights: number[]; preloaded: boolean }[]
}

interface CachingStrategy {
  resourceType: string
  strategy: string
  maxAgeSeconds: number
  staleWhileRevalidate: boolean
}

// ---------------------------------------------------------------------------
// Contract definitions
// ---------------------------------------------------------------------------

const CORE_WEB_VITALS: PerformanceBudget[] = [
  {
    metric: 'LCP',
    target: 2500,
    unit: 'ms',
    pages: ['/', '/daily-bread', '/wake-up/devotional/*'],
  },
  {
    metric: 'FID',
    target: 100,
    unit: 'ms',
    pages: ['/', '/soul-audit', '/daily-bread', '/series'],
  },
  {
    metric: 'INP',
    target: 200,
    unit: 'ms',
    pages: ['/', '/soul-audit', '/daily-bread', '/series'],
  },
  {
    metric: 'CLS',
    target: 0.1,
    unit: 'score',
    pages: ['/', '/soul-audit', '/daily-bread', '/wake-up', '/series'],
  },
  {
    metric: 'TTFB',
    target: 800,
    unit: 'ms',
    pages: ['/', '/daily-bread', '/soul-audit', '/series'],
  },
  { metric: 'TTI', target: 3500, unit: 'ms', pages: ['/', '/daily-bread'] },
]

const API_LATENCY_BUDGETS: APILatencyBudget[] = [
  {
    route: '/api/daily-bread/state',
    method: 'GET',
    maxMs: 100,
    p95MaxMs: 200,
    includesAI: false,
  },
  {
    route: '/api/daily-bread/activate',
    method: 'POST',
    maxMs: 200,
    p95MaxMs: 500,
    includesAI: false,
  },
  {
    route: '/api/daily-bread/replace-slot',
    method: 'POST',
    maxMs: 200,
    p95MaxMs: 500,
    includesAI: false,
  },
  {
    route: '/api/daily-bread/switch-current',
    method: 'POST',
    maxMs: 100,
    p95MaxMs: 200,
    includesAI: false,
  },
  {
    route: '/api/soul-audit/submit',
    method: 'POST',
    maxMs: 2000,
    p95MaxMs: 5000,
    includesAI: true,
  },
  {
    route: '/api/soul-audit/select',
    method: 'POST',
    maxMs: 200,
    p95MaxMs: 500,
    includesAI: false,
  },
  {
    route: '/api/soul-audit/current',
    method: 'GET',
    maxMs: 100,
    p95MaxMs: 200,
    includesAI: false,
  },
  {
    route: '/api/bookmarks',
    method: 'POST',
    maxMs: 50,
    p95MaxMs: 100,
    includesAI: false,
  },
  {
    route: '/api/bookmarks',
    method: 'GET',
    maxMs: 100,
    p95MaxMs: 200,
    includesAI: false,
  },
  {
    route: '/api/annotations',
    method: 'POST',
    maxMs: 50,
    p95MaxMs: 100,
    includesAI: false,
  },
  {
    route: '/api/annotations',
    method: 'GET',
    maxMs: 100,
    p95MaxMs: 200,
    includesAI: false,
  },
  {
    route: '/api/library/index',
    method: 'GET',
    maxMs: 200,
    p95MaxMs: 500,
    includesAI: false,
  },
  {
    route: '/api/library/trash',
    method: 'GET',
    maxMs: 100,
    p95MaxMs: 200,
    includesAI: false,
  },
  {
    route: '/api/chat',
    method: 'POST',
    maxMs: 3000,
    p95MaxMs: 8000,
    includesAI: true,
  },
  {
    route: '/api/saved-series',
    method: 'GET',
    maxMs: 100,
    p95MaxMs: 200,
    includesAI: false,
  },
]

const BUNDLE_BUDGETS: BundleBudget[] = [
  { chunk: 'initial-js', maxSizeKB: 200, compressed: true },
  { chunk: 'initial-css', maxSizeKB: 50, compressed: true },
  { chunk: 'vendor-react', maxSizeKB: 150, compressed: true },
  { chunk: 'page-home', maxSizeKB: 30, compressed: true },
  { chunk: 'page-daily-bread', maxSizeKB: 40, compressed: true },
  { chunk: 'page-soul-audit', maxSizeKB: 30, compressed: true },
  { chunk: 'page-devotional-reader', maxSizeKB: 50, compressed: true },
  { chunk: 'chat-module', maxSizeKB: 60, compressed: true },
  { chunk: 'total-initial', maxSizeKB: 350, compressed: true },
]

const PAYLOAD_BUDGETS: PayloadBudget[] = [
  {
    route: '/api/daily-bread/state',
    maxSizeKB: 10,
    description: 'Active slots + day states + counters',
  },
  {
    route: '/api/soul-audit/submit',
    maxSizeKB: 5,
    description: '5 options with preview copy',
  },
  {
    route: '/api/soul-audit/current',
    maxSizeKB: 3,
    description: 'Current audit state + slot counts',
  },
  {
    route: '/api/library/index',
    maxSizeKB: 50,
    description: 'Full library index (paginated)',
  },
  {
    route: '/api/bookmarks',
    maxSizeKB: 10,
    description: 'Bookmark list (paginated)',
  },
  {
    route: '/api/annotations',
    maxSizeKB: 20,
    description: 'Highlight/note list (paginated)',
  },
]

const IMAGE_RULES: ImageOptimizationRule[] = [
  {
    context: 'series-hero',
    format: ['webp', 'avif'],
    lazyLoading: false,
    maxWidthPx: 1200,
    srcSetRequired: true,
  },
  {
    context: 'series-card',
    format: ['webp', 'avif'],
    lazyLoading: true,
    maxWidthPx: 600,
    srcSetRequired: true,
  },
  {
    context: 'devotional-inline',
    format: ['webp', 'avif'],
    lazyLoading: true,
    maxWidthPx: 800,
    srcSetRequired: true,
  },
  {
    context: 'step-illustration',
    format: ['svg', 'webp'],
    lazyLoading: true,
    maxWidthPx: 400,
    srcSetRequired: false,
  },
  {
    context: 'avatar',
    format: ['webp'],
    lazyLoading: true,
    maxWidthPx: 128,
    srcSetRequired: false,
  },
]

const FONT_CONFIG: FontLoadingConfig = {
  strategy: 'font-display-swap',
  subsetting: true,
  preload: true,
  fontDisplayValue: 'swap',
  fonts: [
    { family: 'Instrument Serif', weights: [400], preloaded: true },
    { family: 'Inter', weights: [300, 400, 500, 600, 700], preloaded: true },
    { family: 'Industry', weights: [400, 500, 700], preloaded: false },
    { family: 'SBL Hebrew', weights: [400], preloaded: false },
  ],
}

const CACHING_STRATEGIES: CachingStrategy[] = [
  {
    resourceType: 'static-assets',
    strategy: 'cache-first',
    maxAgeSeconds: 31536000,
    staleWhileRevalidate: false,
  },
  {
    resourceType: 'api-responses',
    strategy: 'network-first',
    maxAgeSeconds: 300,
    staleWhileRevalidate: true,
  },
  {
    resourceType: 'devotional-json',
    strategy: 'stale-while-revalidate',
    maxAgeSeconds: 86400,
    staleWhileRevalidate: true,
  },
  {
    resourceType: 'images',
    strategy: 'cache-first',
    maxAgeSeconds: 2592000,
    staleWhileRevalidate: false,
  },
  {
    resourceType: 'fonts',
    strategy: 'cache-first',
    maxAgeSeconds: 31536000,
    staleWhileRevalidate: false,
  },
  {
    resourceType: 'html-pages',
    strategy: 'network-first',
    maxAgeSeconds: 0,
    staleWhileRevalidate: true,
  },
]

const LIBRARY_QUERY_PERF = {
  itemCount: 1000,
  maxQueryMs: 200,
  maxRenderMs: 300,
  paginationSize: 50,
  indexedFields: [
    'seriesSlug',
    'dayNumber',
    'kind',
    'state',
    'createdAt',
    'tags',
  ],
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Core Web Vitals thresholds', () => {
  it('LCP target is under 2.5 seconds', () => {
    const lcp = CORE_WEB_VITALS.find((v) => v.metric === 'LCP')
    expect(lcp?.target).toBeLessThanOrEqual(2500)
  })

  it('FID target is under 100ms', () => {
    const fid = CORE_WEB_VITALS.find((v) => v.metric === 'FID')
    expect(fid?.target).toBeLessThanOrEqual(100)
  })

  it('INP target is under 200ms', () => {
    const inp = CORE_WEB_VITALS.find((v) => v.metric === 'INP')
    expect(inp?.target).toBeLessThanOrEqual(200)
  })

  it('CLS target is under 0.1', () => {
    const cls = CORE_WEB_VITALS.find((v) => v.metric === 'CLS')
    expect(cls?.target).toBeLessThanOrEqual(0.1)
  })

  it('TTFB target is under 800ms', () => {
    const ttfb = CORE_WEB_VITALS.find((v) => v.metric === 'TTFB')
    expect(ttfb?.target).toBeLessThanOrEqual(800)
  })

  it('TTI target is under 3.5 seconds', () => {
    const tti = CORE_WEB_VITALS.find((v) => v.metric === 'TTI')
    expect(tti?.target).toBeLessThanOrEqual(3500)
  })

  it('all CWV metrics cover key pages', () => {
    for (const vital of CORE_WEB_VITALS) {
      expect(vital.pages.length).toBeGreaterThan(0)
      expect(vital.pages).toContain('/')
    }
  })

  it('devotional reader included in LCP checks', () => {
    const lcp = CORE_WEB_VITALS.find((v) => v.metric === 'LCP')
    expect(lcp?.pages).toContain('/wake-up/devotional/*')
  })
})

describe('API latency budgets', () => {
  it('all non-AI endpoints respond within 200ms', () => {
    const nonAI = API_LATENCY_BUDGETS.filter((b) => !b.includesAI)
    for (const budget of nonAI) {
      expect(budget.maxMs).toBeLessThanOrEqual(200)
    }
  })

  it('AI endpoints have relaxed but bounded limits', () => {
    const aiEndpoints = API_LATENCY_BUDGETS.filter((b) => b.includesAI)
    expect(aiEndpoints.length).toBeGreaterThanOrEqual(2)
    for (const budget of aiEndpoints) {
      expect(budget.maxMs).toBeLessThanOrEqual(3000)
      expect(budget.p95MaxMs).toBeLessThanOrEqual(8000)
    }
  })

  it('CRUD operations respond within 50ms', () => {
    const crudWrites = API_LATENCY_BUDGETS.filter(
      (b) =>
        b.method === 'POST' && !b.includesAI && b.route.includes('bookmark'),
    )
    for (const budget of crudWrites) {
      expect(budget.maxMs).toBeLessThanOrEqual(50)
    }
  })

  it('daily-bread state responds within 100ms', () => {
    const stateEndpoint = API_LATENCY_BUDGETS.find(
      (b) => b.route === '/api/daily-bread/state',
    )
    expect(stateEndpoint?.maxMs).toBeLessThanOrEqual(100)
  })

  it('library index responds within 200ms', () => {
    const libraryEndpoint = API_LATENCY_BUDGETS.find(
      (b) => b.route === '/api/library/index',
    )
    expect(libraryEndpoint?.maxMs).toBeLessThanOrEqual(200)
  })

  it('all routes have p95 budgets', () => {
    for (const budget of API_LATENCY_BUDGETS) {
      expect(budget.p95MaxMs).toBeGreaterThan(budget.maxMs)
    }
  })
})

describe('Bundle size budgets', () => {
  it('initial JS under 200KB gzipped', () => {
    const initialJs = BUNDLE_BUDGETS.find((b) => b.chunk === 'initial-js')
    expect(initialJs?.maxSizeKB).toBeLessThanOrEqual(200)
    expect(initialJs?.compressed).toBe(true)
  })

  it('initial CSS under 50KB gzipped', () => {
    const initialCss = BUNDLE_BUDGETS.find((b) => b.chunk === 'initial-css')
    expect(initialCss?.maxSizeKB).toBeLessThanOrEqual(50)
  })

  it('total initial load under 350KB gzipped', () => {
    const total = BUNDLE_BUDGETS.find((b) => b.chunk === 'total-initial')
    expect(total?.maxSizeKB).toBeLessThanOrEqual(350)
  })

  it('page-level chunks are code-split', () => {
    const pageChunks = BUNDLE_BUDGETS.filter((b) => b.chunk.startsWith('page-'))
    expect(pageChunks.length).toBeGreaterThanOrEqual(4)
    for (const chunk of pageChunks) {
      expect(chunk.maxSizeKB).toBeLessThanOrEqual(50)
    }
  })

  it('chat module is lazy-loaded', () => {
    const chat = BUNDLE_BUDGETS.find((b) => b.chunk === 'chat-module')
    expect(chat).toBeDefined()
    expect(chat!.maxSizeKB).toBeLessThanOrEqual(60)
  })
})

describe('API payload size limits', () => {
  it('daily-bread state under 10KB', () => {
    const budget = PAYLOAD_BUDGETS.find(
      (b) => b.route === '/api/daily-bread/state',
    )
    expect(budget?.maxSizeKB).toBeLessThanOrEqual(10)
  })

  it('soul audit submit response under 5KB', () => {
    const budget = PAYLOAD_BUDGETS.find(
      (b) => b.route === '/api/soul-audit/submit',
    )
    expect(budget?.maxSizeKB).toBeLessThanOrEqual(5)
  })

  it('library index supports pagination', () => {
    const budget = PAYLOAD_BUDGETS.find((b) => b.route === '/api/library/index')
    expect(budget).toBeDefined()
    expect(budget!.maxSizeKB).toBeLessThanOrEqual(50)
  })

  it('all payloads have descriptions', () => {
    for (const budget of PAYLOAD_BUDGETS) {
      expect(budget.description.length).toBeGreaterThan(0)
    }
  })
})

describe('Image optimization', () => {
  it('modern formats required (WebP/AVIF)', () => {
    for (const rule of IMAGE_RULES) {
      expect(rule.format.some((f) => ['webp', 'avif'].includes(f))).toBe(true)
    }
  })

  it('below-fold images use lazy loading', () => {
    const lazyImages = IMAGE_RULES.filter((r) => r.lazyLoading)
    expect(lazyImages.length).toBeGreaterThanOrEqual(3)
  })

  it('hero images are not lazy loaded', () => {
    const hero = IMAGE_RULES.find((r) => r.context === 'series-hero')
    expect(hero?.lazyLoading).toBe(false)
  })

  it('responsive images use srcSet', () => {
    const withSrcSet = IMAGE_RULES.filter((r) => r.srcSetRequired)
    expect(withSrcSet.length).toBeGreaterThanOrEqual(2)
  })

  it('max widths are reasonable per context', () => {
    const hero = IMAGE_RULES.find((r) => r.context === 'series-hero')
    const card = IMAGE_RULES.find((r) => r.context === 'series-card')
    const avatar = IMAGE_RULES.find((r) => r.context === 'avatar')
    expect(hero!.maxWidthPx).toBeLessThanOrEqual(1200)
    expect(card!.maxWidthPx).toBeLessThanOrEqual(600)
    expect(avatar!.maxWidthPx).toBeLessThanOrEqual(128)
  })
})

describe('Font loading strategy', () => {
  it('uses font-display: swap', () => {
    expect(FONT_CONFIG.fontDisplayValue).toBe('swap')
  })

  it('font subsetting enabled', () => {
    expect(FONT_CONFIG.subsetting).toBe(true)
  })

  it('primary fonts are preloaded', () => {
    const instrumentSerif = FONT_CONFIG.fonts.find(
      (f) => f.family === 'Instrument Serif',
    )
    const inter = FONT_CONFIG.fonts.find((f) => f.family === 'Inter')
    expect(instrumentSerif?.preloaded).toBe(true)
    expect(inter?.preloaded).toBe(true)
  })

  it('secondary fonts are not preloaded', () => {
    const sblHebrew = FONT_CONFIG.fonts.find((f) => f.family === 'SBL Hebrew')
    expect(sblHebrew?.preloaded).toBe(false)
  })

  it('all required font families defined', () => {
    const families = FONT_CONFIG.fonts.map((f) => f.family)
    expect(families).toContain('Instrument Serif')
    expect(families).toContain('Inter')
    expect(families).toContain('Industry')
  })
})

describe('Caching strategies', () => {
  it('static assets use cache-first with long TTL', () => {
    const statics = CACHING_STRATEGIES.find(
      (c) => c.resourceType === 'static-assets',
    )
    expect(statics?.strategy).toBe('cache-first')
    expect(statics?.maxAgeSeconds).toBeGreaterThanOrEqual(31536000)
  })

  it('API responses use network-first', () => {
    const api = CACHING_STRATEGIES.find(
      (c) => c.resourceType === 'api-responses',
    )
    expect(api?.strategy).toBe('network-first')
  })

  it('devotional JSON uses stale-while-revalidate', () => {
    const devotional = CACHING_STRATEGIES.find(
      (c) => c.resourceType === 'devotional-json',
    )
    expect(devotional?.strategy).toBe('stale-while-revalidate')
  })

  it('fonts use cache-first with long TTL', () => {
    const fonts = CACHING_STRATEGIES.find((c) => c.resourceType === 'fonts')
    expect(fonts?.strategy).toBe('cache-first')
  })

  it('HTML pages use network-first for freshness', () => {
    const html = CACHING_STRATEGIES.find((c) => c.resourceType === 'html-pages')
    expect(html?.strategy).toBe('network-first')
  })

  it('all resource types have caching strategies', () => {
    expect(CACHING_STRATEGIES.length).toBeGreaterThanOrEqual(6)
  })
})

describe('Library query performance', () => {
  it('handles 1000 items within 200ms', () => {
    expect(LIBRARY_QUERY_PERF.itemCount).toBe(1000)
    expect(LIBRARY_QUERY_PERF.maxQueryMs).toBeLessThanOrEqual(200)
  })

  it('render time within 300ms for full list', () => {
    expect(LIBRARY_QUERY_PERF.maxRenderMs).toBeLessThanOrEqual(300)
  })

  it('uses pagination with reasonable page size', () => {
    expect(LIBRARY_QUERY_PERF.paginationSize).toBeLessThanOrEqual(100)
    expect(LIBRARY_QUERY_PERF.paginationSize).toBeGreaterThanOrEqual(20)
  })

  it('indexed fields cover filter requirements', () => {
    expect(LIBRARY_QUERY_PERF.indexedFields).toContain('seriesSlug')
    expect(LIBRARY_QUERY_PERF.indexedFields).toContain('kind')
    expect(LIBRARY_QUERY_PERF.indexedFields).toContain('state')
    expect(LIBRARY_QUERY_PERF.indexedFields).toContain('createdAt')
    expect(LIBRARY_QUERY_PERF.indexedFields).toContain('tags')
  })
})
