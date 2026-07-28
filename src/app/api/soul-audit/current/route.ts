import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRequestId, withRequestIdHeaders } from '@/lib/api-security'
import { getOrCreateAuditSessionToken } from '@/lib/soul-audit/session'
import { SERIES_DATA } from '@/data/series'
import { resolveCurrentReading } from '@/lib/reading/current-reading'

const CURRENT_ROUTE_COOKIE = 'euangelion_current_route'
const CURRENT_ROUTE_MAX_AGE = 30 * 24 * 60 * 60

function normalizeCurrentRoute(value: string | undefined): string | null {
  if (!value) return null

  // The canonical reader for an active plan/series (serves the current unlocked
  // day, incl. the onboarding day-0). Active-reading resume routes here.
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

type CurrentSummary = {
  route: string
  selectionType: 'active_series' | 'ai_primary'
  planToken?: string
  seriesSlug?: string
  /**
   * Human-readable title — always resolved, never silently empty. Active-series
   * selections resolve from SERIES_DATA; AI plans resolve from the plan's stored
   * theme (the selected option's display title).
   */
  seriesTitle: string
  /** Active day number for the resume badge label. */
  dayNumber?: number
}

// Explicit last-resort label so the resume badge never renders a silent empty
// title. AI plans virtually always resolve their stored theme; this only
// surfaces if a legacy plan row predates theme persistence.
const FALLBACK_PLAN_TITLE = 'Your devotional plan'

/**
 * Resolve a real human title for the resume badge. An AI plan's `series_slug` is
 * a slugified AI direction title (NOT a curated series slug), so SERIES_DATA
 * resolves only for curated series — AI plans resolve from the stored theme.
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

export async function GET() {
  const requestId = createRequestId()
  const cookieStore = await cookies()
  const routeFromCookie = normalizeCurrentRoute(
    cookieStore.get(CURRENT_ROUTE_COOKIE)?.value,
  )

  // One canonical resolver — the SAME one /daily-bread renders from — so every
  // header/tab/home-card/resume surface agrees with the reader. It gives the
  // user-controlled active series unconditional precedence over Soul Audit
  // history, and resolves the plan account-first for signed-in readers.
  const sessionToken = await getOrCreateAuditSessionToken()
  const reading = await resolveCurrentReading(sessionToken)

  // NO SILENT FALLBACKS: a read/auth failure is never rewritten as
  // hasCurrent:false. Fail the request so the outage is honest and diagnosable.
  if (reading.status === 'unavailable') {
    throw reading.error instanceof Error
      ? reading.error
      : new Error('Current reading resolution failed.')
  }

  let current: CurrentSummary | null = null
  if (reading.status === 'active' && reading.source === 'active_series') {
    const active = reading.activeSeries
    const series = SERIES_DATA[active.series_slug]
    if (!series) {
      // Corrupt state (a persisted slug that no longer exists) must surface, not
      // hide behind a silent empty badge.
      throw new Error(
        `Active series "${active.series_slug}" is missing from SERIES_DATA.`,
      )
    }
    current = {
      route: '/daily-bread',
      selectionType: 'active_series',
      seriesSlug: active.series_slug,
      seriesTitle: series.title,
      dayNumber: active.current_day,
    }
  } else if (
    reading.status === 'active' &&
    reading.source === 'soul_audit_plan'
  ) {
    const plan = reading.plan
    current = {
      route: '/daily-bread',
      selectionType: 'ai_primary',
      planToken: plan.plan_token,
      seriesSlug: plan.series_slug,
      seriesTitle: resolveSeriesTitle({
        seriesSlug: plan.series_slug,
        theme: plan.theme,
      }),
      dayNumber: getInitialPlanDayNumber(plan.devotional_plan_days),
    }
  }

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
