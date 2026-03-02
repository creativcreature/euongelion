import { NextResponse } from 'next/server'
import {
  createRequestId,
  jsonError,
  withRequestIdHeaders,
} from '@/lib/api-security'
import {
  clearSessionAuditState,
  getAllPlanDaysWithFallback,
  listPlanInstancesForSessionWithFallback,
} from '@/lib/soul-audit/repository'
import {
  getOrCreateAuditSessionToken,
  rotateAuditSessionToken,
} from '@/lib/soul-audit/session'

const CURRENT_ROUTE_COOKIE = 'euangelion_current_route'

/**
 * GET /api/soul-audit/manage — list archived devotional plans for the session.
 */
export async function GET() {
  const requestId = createRequestId()
  try {
    const sessionToken = await getOrCreateAuditSessionToken()
    const plans = await listPlanInstancesForSessionWithFallback(sessionToken)

    const archive = await Promise.all(
      plans.map(async (plan) => {
        const days = await getAllPlanDaysWithFallback(plan.plan_token)
        return {
          planToken: plan.plan_token,
          seriesSlug: plan.series_slug,
          createdAt: plan.created_at,
          route: `/soul-audit/plan/${plan.plan_token}`,
          days: days.map((row) => ({
            day: row.day_number,
            title: row.content.title,
            route: `/soul-audit/plan/${plan.plan_token}?day=${row.day_number}`,
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

/**
 * POST /api/soul-audit/manage — reset audit state and rotate session token.
 */
export async function POST() {
  const requestId = createRequestId()
  try {
    const sessionToken = await getOrCreateAuditSessionToken()
    await clearSessionAuditState(sessionToken)
    await rotateAuditSessionToken()

    const response = NextResponse.json(
      { ok: true, reset: true, requestId },
      { status: 200 },
    )
    response.cookies.delete(CURRENT_ROUTE_COOKIE)
    return withRequestIdHeaders(response, requestId)
  } catch (error) {
    console.error('Soul audit reset error:', error)
    return jsonError({
      error: 'Unable to reset audit state right now.',
      status: 500,
      requestId,
    })
  }
}
