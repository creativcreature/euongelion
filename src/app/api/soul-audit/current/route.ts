import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  getLatestPlanInstanceForSessionWithFallback,
  getLatestSelectionForSessionWithFallback,
} from '@/lib/soul-audit/repository'
import { getOrCreateAuditSessionToken } from '@/lib/soul-audit/session'

const CURRENT_ROUTE_COOKIE = 'euangelion_current_route'
const CURRENT_ROUTE_MAX_AGE = 30 * 24 * 60 * 60

function normalizeCurrentRoute(value: string | undefined): string | null {
  if (!value) return null

  if (/^\/soul-audit\/results\?planToken=[a-f0-9-]+$/i.test(value)) {
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

export async function GET() {
  const cookieStore = await cookies()
  const routeFromCookie = normalizeCurrentRoute(
    cookieStore.get(CURRENT_ROUTE_COOKIE)?.value,
  )
  if (routeFromCookie) {
    return NextResponse.json(
      {
        ok: true,
        hasCurrent: true,
        route: routeFromCookie,
      },
      { status: 200 },
    )
  }

  const sessionToken = await getOrCreateAuditSessionToken()
  const latestPlan =
    await getLatestPlanInstanceForSessionWithFallback(sessionToken)

  if (latestPlan) {
    const route = `/soul-audit/results?planToken=${latestPlan.plan_token}`
    const response = NextResponse.json(
      {
        ok: true,
        hasCurrent: true,
        route,
        selectionType: 'ai_primary',
        planToken: latestPlan.plan_token,
        seriesSlug: latestPlan.series_slug,
      },
      { status: 200 },
    )
    response.cookies.set(CURRENT_ROUTE_COOKIE, route, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: CURRENT_ROUTE_MAX_AGE,
      path: '/',
    })
    return response
  }

  const latestSelection =
    await getLatestSelectionForSessionWithFallback(sessionToken)
  if (latestSelection?.option_kind === 'curated_prefab') {
    const route = `/series/${latestSelection.series_slug}`
    const response = NextResponse.json(
      {
        ok: true,
        hasCurrent: true,
        route,
        selectionType: latestSelection.option_kind,
        seriesSlug: latestSelection.series_slug,
      },
      { status: 200 },
    )
    response.cookies.set(CURRENT_ROUTE_COOKIE, route, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: CURRENT_ROUTE_MAX_AGE,
      path: '/',
    })
    return response
  }

  return NextResponse.json(
    {
      ok: true,
      hasCurrent: false,
    },
    { status: 200 },
  )
}
