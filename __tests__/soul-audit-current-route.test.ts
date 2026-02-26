import { beforeEach, describe, expect, it, vi } from 'vitest'

let cookieRouteValue: string | undefined
let latestPlan: {
  plan_token: string
  series_slug: string
  created_at: string
} | null = null
let latestSelection: {
  option_kind: 'ai_primary' | 'curated_prefab'
  plan_token: string | null
  series_slug: string
  created_at: string
} | null = null
let planDaysByToken: Record<string, Array<{ day_number: number }>> = {}

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      name === 'euangelion_current_route' && cookieRouteValue
        ? { name, value: cookieRouteValue }
        : undefined,
  })),
}))

vi.mock('@/lib/soul-audit/session', () => ({
  getOrCreateAuditSessionToken: vi.fn(async () => 'session-current-route'),
}))

vi.mock('@/lib/soul-audit/repository', () => ({
  getLatestPlanInstanceForSessionWithFallback: vi.fn(async () => latestPlan),
  getLatestSelectionForSessionWithFallback: vi.fn(async () => latestSelection),
  getPlanInstanceWithFallback: vi.fn(async (token: string) =>
    token === latestPlan?.plan_token
      ? latestPlan
      : latestSelection?.plan_token === token
        ? {
            plan_token: token,
            series_slug: latestSelection.series_slug,
            created_at: latestSelection.created_at,
          }
        : null,
  ),
  getAllPlanDaysWithFallback: vi.fn(
    async (token: string) => planDaysByToken[token] ?? [],
  ),
}))

import { GET as currentRouteHandler } from '@/app/api/soul-audit/current/route'

describe('GET /api/soul-audit/current', () => {
  beforeEach(() => {
    cookieRouteValue = undefined
    latestPlan = null
    latestSelection = null
    planDaysByToken = {}
  })

  it('returns hasCurrent false and clears stale cookie when nothing is active', async () => {
    cookieRouteValue = '/series/peace'

    const response = await currentRouteHandler()
    const payload = (await response.json()) as {
      ok: boolean
      hasCurrent: boolean
    }

    expect(response.status).toBe(200)
    expect(payload.ok).toBe(true)
    expect(payload.hasCurrent).toBe(false)
    expect(response.headers.get('set-cookie') || '').toContain(
      'euangelion_current_route=;',
    )
  })

  it('prefers newer curated selection over older AI plan', async () => {
    latestPlan = {
      plan_token: 'old-plan-token',
      series_slug: 'identity',
      created_at: '2026-02-01T10:00:00.000Z',
    }
    planDaysByToken['old-plan-token'] = [{ day_number: 1 }]
    latestSelection = {
      option_kind: 'curated_prefab',
      plan_token: null,
      series_slug: 'community',
      created_at: '2026-02-10T10:00:00.000Z',
    }

    const response = await currentRouteHandler()
    const payload = (await response.json()) as {
      hasCurrent: boolean
      route: string
      selectionType: 'ai_primary' | 'ai_generative' | 'curated_prefab'
    }

    expect(payload.hasCurrent).toBe(true)
    expect(payload.selectionType).toBe('curated_prefab')
    expect(payload.route).toBe('/devotional/community-day-1')
  })

  it('returns newest AI plan route when plan is newer than prefab selection', async () => {
    latestPlan = {
      plan_token: 'new-plan-token',
      series_slug: 'truth',
      created_at: '2026-02-15T10:00:00.000Z',
    }
    planDaysByToken['new-plan-token'] = [{ day_number: 0 }, { day_number: 1 }]
    latestSelection = {
      option_kind: 'curated_prefab',
      plan_token: null,
      series_slug: 'community',
      created_at: '2026-02-14T10:00:00.000Z',
    }

    const response = await currentRouteHandler()
    const payload = (await response.json()) as {
      hasCurrent: boolean
      route: string
      selectionType: 'ai_primary' | 'ai_generative' | 'curated_prefab'
    }

    expect(payload.hasCurrent).toBe(true)
    expect(payload.selectionType).toBe('ai_primary')
    expect(payload.route).toBe(
      '/soul-audit/plan/new-plan-token?day=0',
    )
  })

  it('returns hasCurrent false when candidates have no resolvable content', async () => {
    latestPlan = {
      plan_token: 'empty-plan',
      series_slug: 'truth',
      created_at: '2026-02-16T10:00:00.000Z',
    }
    latestSelection = {
      option_kind: 'curated_prefab',
      plan_token: null,
      series_slug: 'missing-series',
      created_at: '2026-02-16T11:00:00.000Z',
    }

    const response = await currentRouteHandler()
    const payload = (await response.json()) as {
      hasCurrent: boolean
    }

    expect(response.status).toBe(200)
    expect(payload.hasCurrent).toBe(false)
  })
})
