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
 *
 * 2026-07-29 (false-coverage replacement): the Daily Bread latency and payload
 * budgets in this file used to name four endpoints that were never shipped —
 * /api/daily-bread/state, /activate, /replace-slot, /switch-current, remnants of
 * the abandoned three-slot architecture. A budget for a route that does not
 * exist cannot be exceeded, so those assertions could not fail. They are now
 * declared for the shipped Daily Bread routes, the payload budgets are MEASURED
 * against the real handlers' serialized responses rather than merely declared,
 * and a route-existence guard keeps the tables honest.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { existsSync } from 'fs'
import { join } from 'path'
import { SERIES_DATA, SERIES_ORDER } from '@/data/series'

// ---------------------------------------------------------------------------
// Real-route harness (payload measurement)
// ---------------------------------------------------------------------------

const mockedGetUser = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', () => ({ getUser: mockedGetUser }))

const libraryRepository = vi.hoisted(() => ({
  getScheduledSwap: vi.fn(),
  listArchivedSeries: vi.fn(),
  promoteScheduledSwapIfDue: vi.fn(),
}))
vi.mock('@/lib/library/repository', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/library/repository')>()
  return { ...actual, ...libraryRepository }
})

const savedRepository = vi.hoisted(() => ({
  listBookmarksWithFallback: vi.fn(),
}))
vi.mock('@/lib/soul-audit/repository', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/soul-audit/repository')>()
  return { ...actual, ...savedRepository }
})

import { GET as activeGet } from '@/app/api/devotionals/active/route'
import { GET as archiveGet } from '@/app/api/devotionals/archive/route'
import { GET as savedGet } from '@/app/api/devotionals/saved/route'

const USER_ID = '00000000-0000-0000-0000-0000000009fe'

async function payloadSizeKB(response: Response): Promise<number> {
  const body = await response.text()
  return new TextEncoder().encode(body).byteLength / 1024
}

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
  // Daily Bread, as shipped. The four /api/daily-bread/* budgets this list used
  // to carry described the abandoned three-slot design; the reads and writes
  // below are what the reader actually calls.
  {
    route: '/api/devotionals/active',
    method: 'GET',
    maxMs: 100,
    p95MaxMs: 200,
    includesAI: false,
  },
  {
    // Starts, switches and Monday-queues a devotional (was: activate +
    // replace-slot + switch-current).
    route: '/api/devotionals/active',
    method: 'PUT',
    maxMs: 200,
    p95MaxMs: 500,
    includesAI: false,
  },
  {
    // Persists day-to-day reading progress inside /daily-bread.
    route: '/api/devotionals/active',
    method: 'PATCH',
    maxMs: 100,
    p95MaxMs: 200,
    includesAI: false,
  },
  {
    route: '/api/devotionals/active',
    method: 'DELETE',
    maxMs: 200,
    p95MaxMs: 500,
    includesAI: false,
  },
  {
    route: '/api/devotionals/archive',
    method: 'GET',
    maxMs: 100,
    p95MaxMs: 200,
    includesAI: false,
  },
  {
    route: '/api/devotionals/archive/restart',
    method: 'POST',
    maxMs: 200,
    p95MaxMs: 500,
    includesAI: false,
  },
  {
    route: '/api/devotionals/saved',
    method: 'GET',
    maxMs: 100,
    p95MaxMs: 200,
    includesAI: false,
  },
  {
    route: '/api/devotionals/saved',
    method: 'POST',
    maxMs: 50,
    p95MaxMs: 100,
    includesAI: false,
  },
  {
    route: '/api/devotionals/saved',
    method: 'DELETE',
    maxMs: 50,
    p95MaxMs: 100,
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
    // The shipped library index: the archived-plan feed /library loads. There
    // is no /api/library/index — that budget named an endpoint that was never
    // built.
    route: '/api/soul-audit/manage',
    method: 'GET',
    maxMs: 200,
    p95MaxMs: 500,
    includesAI: false,
  },
  {
    // The day index the library rail loads alongside it.
    route: '/api/daily-bread/active-days',
    method: 'GET',
    maxMs: 200,
    p95MaxMs: 500,
    includesAI: false,
  },
  {
    route: '/api/chat',
    method: 'POST',
    maxMs: 3000,
    p95MaxMs: 8000,
    includesAI: true,
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
    // Replaces the /api/daily-bread/state budget. Same property — the Daily
    // Bread state read must stay tiny — against the endpoint that ships.
    // Measured in "API payload size limits" below.
    route: '/api/devotionals/active',
    maxSizeKB: 10,
    description: 'Active series + scheduled swap (single record each)',
  },
  {
    route: '/api/devotionals/archive',
    maxSizeKB: 20,
    description: 'Archived series list, worst case = every series archived',
  },
  {
    route: '/api/devotionals/saved',
    maxSizeKB: 64,
    // Measured at 48.8KB with the whole catalog saved and no notes (2026-07-29),
    // so this is worst-observed + ~30% headroom. The route is UNPAGINATED and
    // notes are capped only per-item (1000 chars), never in aggregate — a
    // heavy annotator can exceed this. Tracked as a residual risk, not softened
    // here: shrinking it requires pagination on the route itself.
    description:
      'Saved devotional list, worst case = every devotional saved (unpaginated)',
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
    route: '/api/soul-audit/manage',
    maxSizeKB: 50,
    description: 'Archived devotional plan index (all plans for the session)',
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

  it('the Daily Bread state read responds within 100ms', () => {
    const stateEndpoint = API_LATENCY_BUDGETS.find(
      (b) => b.route === '/api/devotionals/active' && b.method === 'GET',
    )
    expect(stateEndpoint).toBeDefined()
    expect(stateEndpoint!.maxMs).toBeLessThanOrEqual(100)
  })

  it('every Daily Bread write has a bounded, non-AI budget', () => {
    // These four replace the never-shipped activate / replace-slot /
    // switch-current budgets. Cloudflare Workers gives 10ms CPU per request, so
    // none of them may become an LLM-touching route by accident.
    const writes = API_LATENCY_BUDGETS.filter(
      (b) =>
        b.method !== 'GET' &&
        (b.route.startsWith('/api/devotionals/') ||
          b.route === '/api/devotionals/archive/restart'),
    )
    expect(writes.length).toBeGreaterThanOrEqual(4)
    for (const budget of writes) {
      expect(budget.includesAI, `${budget.route} must not call an LLM`).toBe(
        false,
      )
      expect(budget.maxMs).toBeLessThanOrEqual(200)
    }
  })

  it('library index responds within 200ms', () => {
    const libraryEndpoint = API_LATENCY_BUDGETS.find(
      (b) => b.route === '/api/soul-audit/manage',
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
  beforeEach(() => {
    vi.clearAllMocks()
    mockedGetUser.mockResolvedValue({ id: USER_ID })
    libraryRepository.promoteScheduledSwapIfDue.mockResolvedValue(null)
    libraryRepository.getScheduledSwap.mockResolvedValue(null)
    libraryRepository.listArchivedSeries.mockResolvedValue([])
    savedRepository.listBookmarksWithFallback.mockResolvedValue([])
  })

  it('the Daily Bread state read stays under its 10KB budget — measured', async () => {
    // The measured replacement for the old `/api/daily-bread/state` budget.
    // Both records populated, i.e. the largest shape this route can return.
    libraryRepository.promoteScheduledSwapIfDue.mockResolvedValue({
      user_id: USER_ID,
      series_slug: SERIES_ORDER[0],
      current_day: 4,
      source: 'manual_start',
      started_at: '2026-07-28T10:00:00.000Z',
      last_opened_at: '2026-07-28T11:00:00.000Z',
    })
    libraryRepository.getScheduledSwap.mockResolvedValue({
      user_id: USER_ID,
      series_slug: SERIES_ORDER[1],
      starts_at: '2026-08-03T07:00:00.000Z',
      queued_at: '2026-07-28T11:00:00.000Z',
    })

    const budget = PAYLOAD_BUDGETS.find(
      (b) => b.route === '/api/devotionals/active',
    )!
    expect(budget.maxSizeKB).toBeLessThanOrEqual(10)

    const response = await activeGet()
    expect(response.status).toBe(200)
    expect(await payloadSizeKB(response)).toBeLessThanOrEqual(budget.maxSizeKB)
  })

  it('the Daily Bread state read carries no devotional body content', async () => {
    // The budget only holds because this route returns pointers, not prose. If
    // someone inlines day content here the payload grows by two orders of
    // magnitude, so assert the shape, not just the size.
    libraryRepository.promoteScheduledSwapIfDue.mockResolvedValue({
      user_id: USER_ID,
      series_slug: SERIES_ORDER[0],
      current_day: 4,
      source: 'manual_start',
      started_at: '2026-07-28T10:00:00.000Z',
      last_opened_at: '2026-07-28T11:00:00.000Z',
    })

    const payload = (await (await activeGet()).json()) as {
      active: Record<string, unknown>
    }

    expect(Object.keys(payload.active).sort()).toEqual([
      'currentDay',
      'lastOpenedAt',
      'seriesSlug',
      'seriesTitle',
      'source',
      'startedAt',
    ])
  })

  it('the archive list stays within budget at worst case — measured', async () => {
    // Worst case is bounded by the catalog: a user cannot archive a series that
    // does not exist.
    libraryRepository.listArchivedSeries.mockResolvedValue(
      SERIES_ORDER.map((slug, index) => ({
        user_id: USER_ID,
        series_slug: slug,
        furthest_day_reached: (index % 7) + 1,
        state: 'paused' as const,
        archived_at: '2026-07-28T11:00:00.000Z',
      })),
    )

    const budget = PAYLOAD_BUDGETS.find(
      (b) => b.route === '/api/devotionals/archive',
    )!
    const response = await archiveGet()

    expect(response.status).toBe(200)
    expect(await payloadSizeKB(response)).toBeLessThanOrEqual(budget.maxSizeKB)
  })

  it('the saved list stays within budget for a full catalog — measured', async () => {
    // Every devotional in the catalog saved, notes empty. This is the endpoint's
    // realistic ceiling; see the residual-risk note below on notes.
    const allDevotionalSlugs = SERIES_ORDER.flatMap((seriesSlug) =>
      SERIES_DATA[seriesSlug].days.map((day) => day.slug),
    )
    savedRepository.listBookmarksWithFallback.mockResolvedValue(
      allDevotionalSlugs.map((slug) => ({
        session_token: USER_ID,
        devotional_slug: slug,
        note: null,
        created_at: '2026-07-28T11:00:00.000Z',
      })),
    )

    const budget = PAYLOAD_BUDGETS.find(
      (b) => b.route === '/api/devotionals/saved',
    )!
    const response = await savedGet()

    expect(response.status).toBe(200)
    expect(allDevotionalSlugs.length).toBeGreaterThan(100)
    expect(await payloadSizeKB(response)).toBeLessThanOrEqual(budget.maxSizeKB)
  })

  it('list endpoints return only index fields, never full records', async () => {
    libraryRepository.listArchivedSeries.mockResolvedValue([
      {
        user_id: USER_ID,
        series_slug: SERIES_ORDER[0],
        furthest_day_reached: 3,
        state: 'paused' as const,
        archived_at: '2026-07-28T11:00:00.000Z',
      },
    ])
    savedRepository.listBookmarksWithFallback.mockResolvedValue([
      {
        session_token: USER_ID,
        devotional_slug: 'the-harvest-day-1',
        note: 'a note',
        created_at: '2026-07-28T11:00:00.000Z',
      },
    ])

    const archive = (await (await archiveGet()).json()) as {
      archived: Record<string, unknown>[]
    }
    expect(Object.keys(archive.archived[0]).sort()).toEqual([
      'archivedAt',
      'furthestDayReached',
      'seriesSlug',
      'seriesTitle',
      'state',
      'totalDays',
    ])
    // The internal owner id never crosses the wire.
    expect(archive.archived[0].user_id).toBeUndefined()

    const saved = (await (await savedGet()).json()) as {
      saved: Record<string, unknown>[]
    }
    expect(Object.keys(saved.saved[0]).sort()).toEqual([
      'devotionalSlug',
      'note',
      'savedAt',
    ])
    expect(saved.saved[0].session_token).toBeUndefined()
  })

  it('soul audit submit response under 5KB', () => {
    const budget = PAYLOAD_BUDGETS.find(
      (b) => b.route === '/api/soul-audit/submit',
    )
    expect(budget?.maxSizeKB).toBeLessThanOrEqual(5)
  })

  it('the library index has a bounded budget', () => {
    const budget = PAYLOAD_BUDGETS.find(
      (b) => b.route === '/api/soul-audit/manage',
    )
    expect(budget).toBeDefined()
    expect(budget!.maxSizeKB).toBeLessThanOrEqual(50)
  })

  it('all payloads have descriptions', () => {
    for (const budget of PAYLOAD_BUDGETS) {
      expect(budget.description.length).toBeGreaterThan(0)
    }
  })
})

describe('Budget tables reference shipped routes', () => {
  // The guard that would have caught the /api/daily-bread/* budgets on the day
  // the three-slot architecture was abandoned: a budget for a route with no
  // handler on disk is coverage theatre.
  function handlerExists(route: string): boolean {
    return existsSync(
      join(process.cwd(), 'src', 'app', ...route.split('/'), 'route.ts'),
    )
  }

  it('every latency budget names a route that exists', () => {
    for (const budget of API_LATENCY_BUDGETS) {
      expect(
        handlerExists(budget.route),
        `${budget.method} ${budget.route} has a latency budget but no handler`,
      ).toBe(true)
    }
  })

  it('every payload budget names a route that exists', () => {
    for (const budget of PAYLOAD_BUDGETS) {
      expect(
        handlerExists(budget.route),
        `${budget.route} has a payload budget but no handler`,
      ).toBe(true)
    }
  })

  it('the retired three-slot Daily Bread endpoints carry no budgets', () => {
    const retired = [
      '/api/daily-bread/state',
      '/api/daily-bread/activate',
      '/api/daily-bread/replace-slot',
      '/api/daily-bread/switch-current',
    ]
    const budgeted = [
      ...API_LATENCY_BUDGETS.map((b) => b.route),
      ...PAYLOAD_BUDGETS.map((b) => b.route),
    ]
    for (const route of retired) {
      expect(handlerExists(route), `${route} unexpectedly exists`).toBe(false)
      expect(budgeted, `${route} is still budgeted`).not.toContain(route)
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
