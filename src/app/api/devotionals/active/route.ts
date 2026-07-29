import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import {
  LibraryPersistenceError,
  archiveSeries,
  clearActiveSeries,
  clearScheduledSwap,
  getActiveSeries,
  getScheduledSwap,
  nextMondayStartsAt,
  promoteScheduledSwapIfDue,
  replaceActiveSeries,
  setActiveSeries,
  setScheduledSwap,
  updateActiveSeriesDay,
} from '@/lib/library/repository'
import { SERIES_DATA } from '@/data/series'
import {
  createRequestId,
  getClientKey,
  isSafeSlug,
  jsonError,
  logApiError,
  normalizeTimezoneOffsetMinutes,
  readJsonWithLimit,
  takeRateLimit,
  withRequestIdHeaders,
} from '@/lib/api-security'

const MAX_BODY_BYTES = 4_096
const MAX_REQUESTS_PER_MINUTE = 60

type StartMode = 'replace_now' | 'queue_monday'

interface PutBody {
  seriesSlug?: string
  mode?: StartMode
  confirm?: boolean
  timezoneOffsetMinutes?: number
  /**
   * 2026-05-14: pin the active day to where the user is reading
   * (defaults to 1 server-side). Used by "Start this devotional"
   * called from a /devotional/<slug>-day-N page so reload-state
   * matches what the user was reading.
   */
  currentDay?: number
}

/**
 * 2026-07-27 (Daily Bread root-cause fix): a LibraryPersistenceError
 * means the Supabase write did not land — the request must fail
 * honestly instead of returning ok:true from memory that evaporates
 * on the next isolate. Root cause was migration 013 never applied in
 * prod; this guard keeps any future persistence failure loud.
 */
function persistenceFailureResponse(requestId: string, error: unknown) {
  if (!(error instanceof LibraryPersistenceError)) return null
  return jsonError({
    error:
      'Your devotional could not be saved to your account, so nothing was changed. Please try again in a moment.',
    code: 'PERSISTENCE_FAILED',
    status: 503,
    requestId,
  })
}

export async function GET() {
  const requestId = createRequestId()
  try {
    const user = await getUser()
    if (!user) {
      return jsonError({
        error: 'Sign in is required to read your active devotional.',
        code: 'AUTH_REQUIRED',
        status: 401,
        requestId,
      })
    }

    const active = await promoteScheduledSwapIfDue(user.id)
    const swap = await getScheduledSwap(user.id)

    return withRequestIdHeaders(
      NextResponse.json(
        {
          ok: true,
          active: active
            ? {
                seriesSlug: active.series_slug,
                currentDay: active.current_day,
                source: active.source,
                startedAt: active.started_at,
                lastOpenedAt: active.last_opened_at,
                seriesTitle: SERIES_DATA[active.series_slug]?.title ?? null,
              }
            : null,
          scheduledSwap: swap
            ? {
                seriesSlug: swap.series_slug,
                startsAt: swap.starts_at,
                queuedAt: swap.queued_at,
                seriesTitle: SERIES_DATA[swap.series_slug]?.title ?? null,
              }
            : null,
        },
        { status: 200 },
      ),
      requestId,
    )
  } catch (error) {
    logApiError({
      scope: 'devotionals-active-get',
      requestId,
      error,
      method: 'GET',
      path: '/api/devotionals/active',
    })
    return jsonError({
      error: 'Unable to read active devotional.',
      status: 500,
      requestId,
    })
  }
}

export async function PUT(request: NextRequest) {
  const requestId = createRequestId()
  const clientKey = getClientKey(request)
  try {
    const user = await getUser()
    if (!user) {
      return jsonError({
        error: 'Sign in is required to start a devotional.',
        code: 'AUTH_REQUIRED',
        status: 401,
        requestId,
      })
    }

    const limiter = await takeRateLimit({
      namespace: 'devotionals-active-put',
      key: clientKey,
      limit: MAX_REQUESTS_PER_MINUTE,
      windowMs: 60_000,
    })
    if (!limiter.ok) {
      return jsonError({
        error: 'Too many requests. Please retry shortly.',
        status: 429,
        requestId,
        rateLimit: limiter,
      })
    }

    const parsed = await readJsonWithLimit<PutBody>({
      request,
      maxBytes: MAX_BODY_BYTES,
    })
    if (!parsed.ok) {
      return jsonError({
        error: parsed.error,
        status: parsed.status,
        requestId,
      })
    }

    const body = parsed.data
    const seriesSlug = String(body.seriesSlug || '').trim()
    if (!seriesSlug || !isSafeSlug(seriesSlug)) {
      return jsonError({
        error: 'A safe seriesSlug is required.',
        status: 400,
        requestId,
      })
    }
    if (!SERIES_DATA[seriesSlug]) {
      return jsonError({
        error: 'Unknown series.',
        status: 404,
        requestId,
      })
    }

    const mode: StartMode =
      body.mode === 'queue_monday' ? 'queue_monday' : 'replace_now'

    // Clamp currentDay to series bounds. Defaults to 1.
    const seriesDayCount = SERIES_DATA[seriesSlug]?.days.length ?? 1
    const requestedDay = Number.isFinite(body.currentDay)
      ? Math.floor(body.currentDay as number)
      : 1
    const clampedDay = Math.min(Math.max(requestedDay, 1), seriesDayCount)

    const existing = await getActiveSeries(user.id)
    const requiresConfirm =
      existing !== null && existing.series_slug !== seriesSlug
    if (requiresConfirm && body.confirm !== true) {
      return jsonError({
        error: 'A different series is already active. Confirm the switch.',
        code: 'CONFIRM_REQUIRED',
        status: 409,
        requestId,
        details: {
          currentSeriesSlug: existing.series_slug,
          currentSeriesTitle: SERIES_DATA[existing.series_slug]?.title ?? null,
          currentDay: existing.current_day,
        },
      })
    }

    if (mode === 'queue_monday') {
      const offsetMinutes =
        normalizeTimezoneOffsetMinutes(body.timezoneOffsetMinutes) ?? 0
      const startsAt = nextMondayStartsAt(new Date(), offsetMinutes)
      const swap = await setScheduledSwap({
        userId: user.id,
        seriesSlug,
        startsAt,
      })
      // If nothing is active yet, also seed the slot so the user isn't
      // staring at an empty Daily Bread between now and Monday. The
      // queued swap then becomes a no-op on Monday (same slug).
      if (!existing) {
        await setActiveSeries({
          userId: user.id,
          seriesSlug,
          currentDay: clampedDay,
          source: 'manual_start',
        })
      }
      return withRequestIdHeaders(
        NextResponse.json(
          {
            ok: true,
            mode,
            scheduledSwap: {
              seriesSlug: swap.series_slug,
              startsAt: swap.starts_at,
            },
          },
          { status: 200 },
        ),
        requestId,
      )
    }

    // replace_now
    const active = await replaceActiveSeries({
      userId: user.id,
      seriesSlug,
      source: 'manual_start',
      currentDay: clampedDay,
    })
    return withRequestIdHeaders(
      NextResponse.json(
        {
          ok: true,
          mode,
          active: {
            seriesSlug: active.series_slug,
            currentDay: active.current_day,
            source: active.source,
          },
        },
        { status: 200 },
      ),
      requestId,
    )
  } catch (error) {
    const persistence = persistenceFailureResponse(requestId, error)
    if (persistence) {
      logApiError({
        scope: 'devotionals-active-put',
        requestId,
        error,
        method: 'PUT',
        path: '/api/devotionals/active',
      })
      return persistence
    }
    logApiError({
      scope: 'devotionals-active-put',
      requestId,
      error,
      method: 'PUT',
      path: '/api/devotionals/active',
      clientKey,
    })
    return jsonError({
      error: 'Unable to update active devotional.',
      status: 500,
      requestId,
    })
  }
}

/**
 * PATCH /api/devotionals/active
 *
 * Update the `current_day` on the user's active series record. Used
 * by CuratedActiveView when the reader navigates day-to-day inside
 * /daily-bread — without this, the client moves on but the server
 * keeps returning the original day, causing the "Daily Bread reloads
 * to a different day" bug (founder-reported 2026-05-14).
 *
 * Body: { currentDay: number }
 * Returns: { ok: true, active: {...} } | error
 */
export async function PATCH(request: NextRequest) {
  const requestId = createRequestId()
  const clientKey = getClientKey(request)
  try {
    const user = await getUser()
    if (!user) {
      return jsonError({
        error: 'Sign in is required to update your active devotional.',
        code: 'AUTH_REQUIRED',
        status: 401,
        requestId,
      })
    }

    const limiter = await takeRateLimit({
      namespace: 'devotionals-active-patch',
      key: clientKey,
      limit: MAX_REQUESTS_PER_MINUTE,
      windowMs: 60_000,
    })
    if (!limiter.ok) {
      return jsonError({
        error: 'Too many requests. Please retry shortly.',
        status: 429,
        requestId,
        rateLimit: limiter,
      })
    }

    const parsed = await readJsonWithLimit<{ currentDay?: number }>({
      request,
      maxBytes: MAX_BODY_BYTES,
    })
    if (!parsed.ok) {
      return jsonError({
        error: parsed.error,
        status: parsed.status,
        requestId,
      })
    }

    const requestedDay = Number.isFinite(parsed.data.currentDay)
      ? Math.floor(parsed.data.currentDay as number)
      : null
    if (requestedDay === null) {
      return jsonError({
        error: 'currentDay (integer ≥1) is required.',
        status: 400,
        requestId,
      })
    }

    const existing = await getActiveSeries(user.id)
    if (!existing) {
      return jsonError({
        error: 'No active series to update.',
        status: 404,
        requestId,
      })
    }
    const seriesDayCount = SERIES_DATA[existing.series_slug]?.days.length ?? 1
    const clampedDay = Math.min(Math.max(requestedDay, 1), seriesDayCount)

    const updated = await updateActiveSeriesDay(user.id, clampedDay)
    if (!updated) {
      return jsonError({
        error: 'No active series to update.',
        status: 404,
        requestId,
      })
    }

    return withRequestIdHeaders(
      NextResponse.json(
        {
          ok: true,
          active: {
            seriesSlug: updated.series_slug,
            currentDay: updated.current_day,
            source: updated.source,
          },
        },
        { status: 200 },
      ),
      requestId,
    )
  } catch (error) {
    const persistence = persistenceFailureResponse(requestId, error)
    if (persistence) {
      logApiError({
        scope: 'devotionals-active-patch',
        requestId,
        error,
        method: 'PATCH',
        path: '/api/devotionals/active',
      })
      return persistence
    }
    logApiError({
      scope: 'devotionals-active-patch',
      requestId,
      error,
      method: 'PATCH',
      path: '/api/devotionals/active',
      clientKey,
    })
    return jsonError({
      error: 'Unable to update active devotional.',
      status: 500,
      requestId,
    })
  }
}

export async function DELETE(request: NextRequest) {
  const requestId = createRequestId()
  const clientKey = getClientKey(request)
  try {
    const user = await getUser()
    if (!user) {
      return jsonError({
        error: 'Sign in is required to clear your active devotional.',
        code: 'AUTH_REQUIRED',
        status: 401,
        requestId,
      })
    }

    // This handler archives the active series and clears the slot — the most
    // destructive write on the route — yet it was the only one of PUT/PATCH/
    // DELETE with no limiter, despite already computing clientKey for one.
    const limiter = await takeRateLimit({
      namespace: 'devotionals-active-delete',
      key: clientKey,
      limit: MAX_REQUESTS_PER_MINUTE,
      windowMs: 60_000,
    })
    if (!limiter.ok) {
      return jsonError({
        error: 'Too many requests. Please retry shortly.',
        status: 429,
        requestId,
        rateLimit: limiter,
      })
    }

    const target = request.nextUrl.searchParams.get('target')
    if (target === 'swap') {
      await clearScheduledSwap(user.id)
      return withRequestIdHeaders(
        NextResponse.json({ ok: true }, { status: 200 }),
        requestId,
      )
    }

    const current = await getActiveSeries(user.id)
    if (current) {
      await archiveSeries({
        userId: user.id,
        seriesSlug: current.series_slug,
        furthestDayReached: current.current_day,
        state: 'paused',
      })
      await clearActiveSeries(user.id)
    }
    return withRequestIdHeaders(
      NextResponse.json({ ok: true }, { status: 200 }),
      requestId,
    )
  } catch (error) {
    const persistence = persistenceFailureResponse(requestId, error)
    if (persistence) {
      logApiError({
        scope: 'devotionals-active-delete',
        requestId,
        error,
        method: 'DELETE',
        path: '/api/devotionals/active',
      })
      return persistence
    }
    logApiError({
      scope: 'devotionals-active-delete',
      requestId,
      error,
      method: 'DELETE',
      path: '/api/devotionals/active',
      clientKey,
    })
    return jsonError({
      error: 'Unable to clear active devotional.',
      status: 500,
      requestId,
    })
  }
}
