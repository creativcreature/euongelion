import { NextResponse } from 'next/server'
import {
  getAllPlanDaysWithFallback,
  listPlanInstancesForSessionWithFallback,
} from '@/lib/soul-audit/repository'
import { getOrCreateAuditSessionToken } from '@/lib/soul-audit/session'

export async function GET() {
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
          route: `/soul-audit/results?planToken=${plan.plan_token}`,
          days: days.map((row) => ({
            day: row.day_number,
            title: row.content.title,
            route: `/soul-audit/results?planToken=${plan.plan_token}&day=${row.day_number}`,
          })),
        }
      }),
    )

    return NextResponse.json(
      {
        ok: true,
        archive,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error('Archive load error:', error)
    return NextResponse.json(
      { error: 'Unable to load archived devotional plans.' },
      { status: 500 },
    )
  }
}
