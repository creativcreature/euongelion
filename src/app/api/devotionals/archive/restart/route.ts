import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import {
  LibraryPersistenceError,
  archiveSeries,
  getActiveSeries,
  getArchivedSeries,
  removeArchivedSeries,
  setActiveSeries,
} from '@/lib/library/repository'
import { SERIES_DATA } from '@/data/series'
import {
  createRequestId,
  getClientKey,
  isSafeSlug,
  jsonError,
  logApiError,
  readJsonWithLimit,
  takeRateLimit,
  withRequestIdHeaders,
} from '@/lib/api-security'

const MAX_BODY_BYTES = 2_048
const MAX_REQUESTS_PER_MINUTE = 30

interface RestartBody {
  seriesSlug?: string
  from?: 'day_1' | 'resume'
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId()
  const clientKey = getClientKey(request)
  try {
    const user = await getUser()
    if (!user) {
      return jsonError({
        error: 'Sign in is required to restart a devotional.',
        code: 'AUTH_REQUIRED',
        status: 401,
        requestId,
      })
    }

    const limiter = await takeRateLimit({
      namespace: 'devotionals-archive-restart',
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

    const parsed = await readJsonWithLimit<RestartBody>({
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

    const seriesSlug = String(parsed.data.seriesSlug || '').trim()
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

    const from: 'day_1' | 'resume' =
      parsed.data.from === 'resume' ? 'resume' : 'day_1'

    const archived = await getArchivedSeries(user.id, seriesSlug)

    // Archive whatever's currently active (if different), then promote
    // the requested archived series. Day defaults to 1 unless `resume`.
    const current = await getActiveSeries(user.id)
    if (current && current.series_slug !== seriesSlug) {
      await archiveSeries({
        userId: user.id,
        seriesSlug: current.series_slug,
        furthestDayReached: current.current_day,
        state: 'paused',
      })
    }

    const currentDay =
      from === 'resume' && archived ? archived.furthest_day_reached : 1

    const active = await setActiveSeries({
      userId: user.id,
      seriesSlug,
      currentDay,
      source: 'restart_from_archive',
    })

    // Remove the archive entry — it's now active. If they pause again,
    // a new archive row gets written with the latest progress.
    await removeArchivedSeries(user.id, seriesSlug)

    return withRequestIdHeaders(
      NextResponse.json(
        {
          ok: true,
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
    if (error instanceof LibraryPersistenceError) {
      return jsonError({
        error:
          'Your devotional could not be saved to your account, so nothing was changed. Please try again in a moment.',
        code: 'PERSISTENCE_FAILED',
        status: 503,
        requestId,
      })
    }
    logApiError({
      scope: 'devotionals-archive-restart',
      requestId,
      error,
      method: 'POST',
      path: '/api/devotionals/archive/restart',
      clientKey,
    })
    return jsonError({
      error: 'Unable to restart series.',
      status: 500,
      requestId,
    })
  }
}
