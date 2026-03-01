import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET as archiveHandler } from '@/app/api/soul-audit/manage/route'

let sessionToken = 'archive-session'
let planInstances: Array<{
  plan_token: string
  series_slug: string
  created_at: string
}> = []
let planDaysByToken = new Map<
  string,
  Array<{
    day_number: number
    content: { title: string }
  }>
>()

vi.mock('@/lib/soul-audit/session', () => ({
  getOrCreateAuditSessionToken: vi.fn(async () => sessionToken),
}))

vi.mock('@/lib/soul-audit/repository', () => ({
  listPlanInstancesForSessionWithFallback: vi.fn(async () => planInstances),
  getAllPlanDaysWithFallback: vi.fn(async (planToken: string) => {
    return planDaysByToken.get(planToken) ?? []
  }),
}))

describe('GET /api/soul-audit/archive', () => {
  beforeEach(() => {
    sessionToken = `archive-${Date.now()}-${Math.random().toString(36).slice(2)}`
    planInstances = []
    planDaysByToken = new Map()
  })

  it('returns day routes with explicit day query parameter', async () => {
    planInstances = [
      {
        plan_token: 'plan-abc',
        series_slug: 'identity',
        created_at: '2026-02-20T00:00:00.000Z',
      },
    ]
    planDaysByToken.set('plan-abc', [
      { day_number: 1, content: { title: 'Name it' } },
      { day_number: 2, content: { title: 'Read it' } },
    ])

    const response = await archiveHandler()
    expect(response.status).toBe(200)

    const payload = (await response.json()) as {
      ok: boolean
      archive: Array<{
        planToken: string
        route: string
        days: Array<{ day: number; route: string }>
      }>
    }

    expect(payload.ok).toBe(true)
    expect(payload.archive[0]?.route).toBe(
      '/soul-audit/results?planToken=plan-abc',
    )
    expect(payload.archive[0]?.days[0]?.route).toBe(
      '/soul-audit/results?planToken=plan-abc&day=1',
    )
    expect(payload.archive[0]?.days[1]?.route).toBe(
      '/soul-audit/results?planToken=plan-abc&day=2',
    )
  })
})
