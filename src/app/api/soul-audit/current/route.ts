import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  getAllPlanDaysWithFallback,
  getLatestPlanInstanceForSessionWithFallback,
  getLatestSelectionForSessionWithFallback,
  getPlanInstanceWithFallback,
} from '@/lib/soul-audit/repository'
import { getOrCreateAuditSessionToken } from '@/lib/soul-audit/session'
import { SERIES_DATA } from '@/data/series'

const CURRENT_ROUTE_COOKIE = 'euangelion_current_route'
const CURRENT_ROUTE_MAX_AGE = 30 * 24 * 60 * 60

function normalizeCurrentRoute(value: string | undefined): string | null {
  if (!value) return null

  if (/^\/soul-audit\/results\?planToken=[a-f0-9-]+(&day=\d+)?$/i.test(value)) {
    return value
  }
  if (/^\/series\/[a-z0-9-]+$/i.test(value)) {
    return value
  }
  if (/^\/devotional\/[a-z0-9-]+$/i.test(value)) {
    return value
  }
  return null
}

type CurrentCandidate = {
  route: string
  createdAt: string
  selectionType: 'ai_primary' | 'curated_prefab'
  planToken?: string
  seriesSlug?: string
}

function curatedSelectionRoute(seriesSlug: string): string {
  const firstDay = SERIES_DATA[seriesSlug]?.days?.[0]
  if (firstDay?.slug) {
    return `/devotional/${firstDay.slug}`
  }
  return `/series/${seriesSlug}`
}

function getInitialPlanDayNumber(
  planDays: Array<{ day_number: number }>,
): number {
  const dayNumbers = planDays
    .map((day) => day.day_number)
    .filter((day): day is number => Number.isFinite(day))
    .sort((a, b) => a - b)
  if (dayNumbers.length === 0) return 1
  return dayNumbers.includes(0) ? 0 : dayNumbers[0]
}

function aiRoute(planToken: string, planDays: Array<{ day_number: number }>) {
  return `/soul-audit/results?planToken=${planToken}&day=${getInitialPlanDayNumber(
    planDays,
  )}`
}

export async function GET() {
  const cookieStore = await cookies()
  const routeFromCookie = normalizeCurrentRoute(
    cookieStore.get(CURRENT_ROUTE_COOKIE)?.value,
  )
  const sessionToken = await getOrCreateAuditSessionToken()
  const latestPlan =
    await getLatestPlanInstanceForSessionWithFallback(sessionToken)
  const latestSelection =
    await getLatestSelectionForSessionWithFallback(sessionToken)

  const candidates: CurrentCandidate[] = []

  if (latestPlan) {
    const planDays = await getAllPlanDaysWithFallback(latestPlan.plan_token)
    if (planDays.length > 0) {
      candidates.push({
        route: aiRoute(latestPlan.plan_token, planDays),
        createdAt: latestPlan.created_at,
        selectionType: 'ai_primary',
        planToken: latestPlan.plan_token,
        seriesSlug: latestPlan.series_slug,
      })
    }
  }

  if (latestSelection?.option_kind === 'curated_prefab') {
    const series = SERIES_DATA[latestSelection.series_slug]
    if (series?.days?.length) {
      candidates.push({
        route: curatedSelectionRoute(latestSelection.series_slug),
        createdAt: latestSelection.created_at,
        selectionType: 'curated_prefab',
        seriesSlug: latestSelection.series_slug,
      })
    }
  } else if (
    latestSelection?.option_kind === 'ai_primary' &&
    latestSelection.plan_token
  ) {
    const plan = await getPlanInstanceWithFallback(latestSelection.plan_token)
    const planDays = plan
      ? await getAllPlanDaysWithFallback(latestSelection.plan_token)
      : []
    if (plan && planDays.length > 0) {
      candidates.push({
        route: aiRoute(latestSelection.plan_token, planDays),
        createdAt: latestSelection.created_at,
        selectionType: 'ai_primary',
        planToken: latestSelection.plan_token,
        seriesSlug: latestSelection.series_slug,
      })
    }
  }

  candidates.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const current = candidates[0]

  if (current) {
    const response = NextResponse.json(
      {
        ok: true,
        hasCurrent: true,
        route: current.route,
        selectionType: current.selectionType,
        planToken: current.planToken,
        seriesSlug: current.seriesSlug,
      },
      { status: 200 },
    )
    if (routeFromCookie !== current.route) {
      response.cookies.set(CURRENT_ROUTE_COOKIE, current.route, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: CURRENT_ROUTE_MAX_AGE,
        path: '/',
      })
    }
    return response
  }

  const response = NextResponse.json(
    {
      ok: true,
      hasCurrent: false,
    },
    { status: 200 },
  )
  if (routeFromCookie) {
    response.cookies.delete(CURRENT_ROUTE_COOKIE)
  }
  return response
}
