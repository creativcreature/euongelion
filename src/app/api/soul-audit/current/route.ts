import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRequestId, withRequestIdHeaders } from '@/lib/api-security'
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

  // The canonical reader for an active AI plan (serves the current unlocked day,
  // incl. the onboarding day-0). Active-plan resume routes here.
  if (value === '/daily-bread') return value
  if (/^\/soul-audit\/plan\/[a-f0-9-]+(\?day=\d+)?$/i.test(value)) {
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
  selectionType: 'ai_primary' | 'ai_generative' | 'curated_prefab'
  planToken?: string
  seriesSlug?: string
  /**
   * Human-readable plan title — always resolved, never silently empty.
   * Curated selections resolve from SERIES_DATA; AI plans resolve from the
   * plan instance's stored theme (the selected option's display title).
   */
  seriesTitle: string
  /** Active day number (parsed from plan day rows for AI plans). */
  dayNumber?: number
}

/**
 * Plan-instance rows carry a `theme` column (written by
 * /api/soul-audit/select's insertPlanInstance with the selected option's
 * display title). The repository's DevotionalPlanInstanceRecord type predates
 * that column, so it is read here structurally.
 */
type PlanThemeCarrier = { theme?: string | null }

function planTheme(row: unknown): string | null {
  if (!row || typeof row !== 'object') return null
  const theme = (row as PlanThemeCarrier).theme
  if (typeof theme !== 'string') return null
  const trimmed = theme.trim()
  return trimmed.length > 0 ? trimmed : null
}

// Explicit last-resort label so the resume badge never renders a silent
// empty title. AI plans virtually always resolve their stored theme; this
// only surfaces if a legacy plan row predates theme persistence.
const FALLBACK_PLAN_TITLE = 'Your devotional plan'

/**
 * Resolve a real human title for the resume badge. `seriesSlug` on AI plans
 * is a slugified AI direction title (NOT a curated series slug), so
 * SERIES_DATA resolves only for curated selections — AI plans resolve from
 * the stored theme instead.
 */
function resolveSeriesTitle(params: {
  seriesSlug: string | null | undefined
  theme?: string | null
}): string {
  const curatedTitle = params.seriesSlug
    ? SERIES_DATA[params.seriesSlug]?.title?.trim()
    : undefined
  if (curatedTitle) return curatedTitle
  const theme = params.theme?.trim()
  if (theme) return theme
  return FALLBACK_PLAN_TITLE
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

// AI plans resume into /daily-bread — the canonical reader that correctly serves
// the current unlocked day (including the onboarding day-0). The dedicated
// /soul-audit/plan/[token] reader does not render the onboarding / locked-cycle
// state (empty timeline + perpetual lock message), so ALL active-plan entry points
// (header badge, homepage "Continue" CTA, resume link) route here instead.
// dayNumber is still surfaced separately for the badge label.
function aiRoute(): string {
  return '/daily-bread'
}

export async function GET() {
  const requestId = createRequestId()
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
        route: aiRoute(),
        createdAt: latestPlan.created_at,
        selectionType: 'ai_primary',
        planToken: latestPlan.plan_token,
        seriesSlug: latestPlan.series_slug,
        seriesTitle: resolveSeriesTitle({
          seriesSlug: latestPlan.series_slug,
          theme: planTheme(latestPlan),
        }),
        dayNumber: getInitialPlanDayNumber(planDays),
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
        seriesTitle: series.title,
        dayNumber: 1,
      })
    }
  } else if (
    (latestSelection?.option_kind === 'ai_primary' ||
      latestSelection?.option_kind === 'ai_generative') &&
    latestSelection.plan_token
  ) {
    const plan = await getPlanInstanceWithFallback(latestSelection.plan_token)
    const planDays = plan
      ? await getAllPlanDaysWithFallback(latestSelection.plan_token)
      : []
    if (plan && planDays.length > 0) {
      candidates.push({
        route: aiRoute(),
        createdAt: latestSelection.created_at,
        selectionType: latestSelection.option_kind,
        planToken: latestSelection.plan_token,
        seriesSlug: latestSelection.series_slug,
        seriesTitle: resolveSeriesTitle({
          seriesSlug: latestSelection.series_slug,
          theme: planTheme(plan),
        }),
        dayNumber: getInitialPlanDayNumber(planDays),
      })
    }
  }

  candidates.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const current = candidates[0]

  if (current) {
    const response = NextResponse.json(
      {
        ok: true,
        requestId,
        hasCurrent: true,
        route: current.route,
        selectionType: current.selectionType,
        planToken: current.planToken,
        seriesSlug: current.seriesSlug,
        seriesTitle: current.seriesTitle,
        dayNumber: current.dayNumber,
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
    return withRequestIdHeaders(response, requestId)
  }

  const response = NextResponse.json(
    {
      ok: true,
      requestId,
      hasCurrent: false,
    },
    { status: 200 },
  )
  if (routeFromCookie) {
    response.cookies.delete(CURRENT_ROUTE_COOKIE)
  }
  return withRequestIdHeaders(response, requestId)
}
