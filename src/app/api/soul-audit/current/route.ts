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

type CurrentCandidate = {
  route: string
  createdAt: string
  selectionType: 'ai_primary' | 'curated_prefab'
  planToken?: string
  seriesSlug?: string
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
    candidates.push({
      route: `/soul-audit/results?planToken=${latestPlan.plan_token}`,
      createdAt: latestPlan.created_at,
      selectionType: 'ai_primary',
      planToken: latestPlan.plan_token,
      seriesSlug: latestPlan.series_slug,
    })
  }

  if (latestSelection?.option_kind === 'curated_prefab') {
    candidates.push({
      route: `/series/${latestSelection.series_slug}`,
      createdAt: latestSelection.created_at,
      selectionType: 'curated_prefab',
      seriesSlug: latestSelection.series_slug,
    })
  } else if (
    latestSelection?.option_kind === 'ai_primary' &&
    latestSelection.plan_token
  ) {
    candidates.push({
      route: `/soul-audit/results?planToken=${latestSelection.plan_token}`,
      createdAt: latestSelection.created_at,
      selectionType: 'ai_primary',
      planToken: latestSelection.plan_token,
      seriesSlug: latestSelection.series_slug,
    })
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
