import { NextResponse } from 'next/server'
import {
  createRequestId,
  jsonError,
  withRequestIdHeaders,
} from '@/lib/api-security'
import {
  getAllPlanDaysWithFallback,
  listPlanInstancesForSessionWithFallback,
} from '@/lib/soul-audit/repository'
import { getOrCreateAuditSessionToken } from '@/lib/soul-audit/session'

export async function GET() {
  const requestId = createRequestId()
  try {
    const sessionToken = await getOrCreateAuditSessionToken()
    const plans = await listPlanInstancesForSessionWithFallback(sessionToken)

    // The dedicated /soul-audit/plan/[token] reader is retired (Mobbin polish
    // audit 2026-07-10, P0 #5) — /daily-bread is the canonical plan reader,
    // matching what /api/soul-audit/current and /api/soul-audit/select return.
    const archive = await Promise.all(
      plans.map(async (plan) => {
        const days = await getAllPlanDaysWithFallback(plan.plan_token)
        return {
          planToken: plan.plan_token,
          seriesSlug: plan.series_slug,
          createdAt: plan.created_at,
          route: '/daily-bread',
          days: days.map((row) => ({
            day: row.day_number,
            title: row.content.title,
            route: '/daily-bread',
          })),
        }
      }),
    )

    return withRequestIdHeaders(
      NextResponse.json({ ok: true, requestId, archive }, { status: 200 }),
      requestId,
    )
  } catch (error) {
    console.error('Archive load error:', error)
    return jsonError({
      error: 'Unable to load archived devotional plans.',
      status: 500,
      requestId,
    })
  }
}
