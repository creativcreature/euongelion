import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CurrentReading } from '@/lib/reading/current-reading'

let cookieRouteValue: string | undefined
let reading: CurrentReading = { status: 'empty' }

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

// The route derives its badge summary from the ONE canonical resolver. Every
// resolution branch (active_series precedence, account-first plan, empty,
// unavailable) is exercised in current-reading-resolver.test.ts; here we prove
// the route maps each resolver state to the correct badge payload / cookie / HTTP
// behavior.
vi.mock('@/lib/reading/current-reading', () => ({
  resolveCurrentReading: vi.fn(async () => reading),
}))

import { GET as currentRouteHandler } from '@/app/api/soul-audit/current/route'

function planReading(plan: Record<string, unknown>): CurrentReading {
  return {
    status: 'active',
    source: 'soul_audit_plan',
    // The route only reads plan_token / series_slug / theme / devotional_plan_days.
    plan: plan as never,
  }
}

describe('GET /api/soul-audit/current', () => {
  beforeEach(() => {
    cookieRouteValue = undefined
    reading = { status: 'empty' }
  })

  it('maps an active_series to a /today badge with its real title and day', async () => {
    reading = {
      status: 'active',
      source: 'active_series',
      activeSeries: {
        user_id: 'user-1',
        series_slug: 'the-harvest',
        current_day: 4,
        source: 'manual_start',
        started_at: '2026-02-01T00:00:00.000Z',
        last_opened_at: '2026-02-01T00:00:00.000Z',
      },
    }

    const response = await currentRouteHandler()
    const payload = (await response.json()) as Record<string, unknown>

    expect(payload).toMatchObject({
      hasCurrent: true,
      route: '/today',
      selectionType: 'active_series',
      seriesSlug: 'the-harvest',
      seriesTitle: 'The Harvest',
      dayNumber: 4,
    })
  })

  it('throws when an active_series slug no longer exists in SERIES_DATA', async () => {
    reading = {
      status: 'active',
      source: 'active_series',
      activeSeries: {
        user_id: 'user-1',
        series_slug: 'a-series-that-was-deleted',
        current_day: 1,
        source: 'manual_start',
        started_at: '2026-02-01T00:00:00.000Z',
        last_opened_at: '2026-02-01T00:00:00.000Z',
      },
    }

    await expect(currentRouteHandler()).rejects.toThrow(/SERIES_DATA/)
  })

  it('maps a soul_audit_plan to an ai_primary /daily-bread badge, title from theme', async () => {
    reading = planReading({
      plan_token: 'ai-plan-token',
      series_slug: 'when-anxiety-steals-your-rest',
      theme: 'When anxiety steals your rest.',
      devotional_plan_days: [{ day_number: 0 }, { day_number: 1 }],
    })

    const response = await currentRouteHandler()
    const payload = (await response.json()) as Record<string, unknown>

    expect(payload).toMatchObject({
      hasCurrent: true,
      route: '/today',
      selectionType: 'ai_primary',
      planToken: 'ai-plan-token',
      seriesTitle: 'When anxiety steals your rest.',
      dayNumber: 0,
    })
  })

  it('gives an AI plan without a stored theme an explicit fallback title', async () => {
    reading = planReading({
      plan_token: 'legacy-plan-token',
      series_slug: 'some-legacy-ai-slug',
      theme: null,
      devotional_plan_days: [{ day_number: 1 }],
    })

    const response = await currentRouteHandler()
    const payload = (await response.json()) as { seriesTitle: string }

    // Never a silent empty title.
    expect(payload.seriesTitle).toBe('Your devotional plan')
  })

  it('returns hasCurrent:false and clears a stale cookie when reading is empty', async () => {
    cookieRouteValue = '/series/peace'
    reading = { status: 'empty' }

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

  it('fails the request instead of faking absence when the read is unavailable', async () => {
    reading = { status: 'unavailable', error: new Error('supabase down') }

    await expect(currentRouteHandler()).rejects.toThrow(/supabase down/)
  })
})
