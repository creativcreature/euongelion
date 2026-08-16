import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
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
import { logApiFailure } from '@/lib/observability/api-failure'
import {
  isMissingListeningProgressTable,
  readListeningProgress,
  upsertListeningProgress,
} from '@/lib/audio/listening-progress-repository'

interface ProgressBody {
  devotionalSlug?: string
  positionSeconds?: number
  durationSeconds?: number
  listenedDelta?: number
  ended?: boolean
}

const MAX_BODY_BYTES = 1_024
/**
 * Generous, because the client already throttles to one write per 30s while
 * playing plus a flush on pause/seek/end/unload. This is an abuse ceiling, not
 * the expected rate.
 */
const MAX_REQUESTS_PER_MINUTE = 60

/**
 * GET — the account's saved position for one devotional.
 *
 * Returns `{ progress: null }` with 200 for a signed-out reader. That is not an
 * error: it means "nothing to resume from an account", and the client falls
 * back to this device. Answering 401 here would make every signed-out page load
 * log a failure for a case that is entirely normal.
 */
export async function GET(request: NextRequest) {
  const requestId = createRequestId()
  const clientKey = getClientKey(request)
  try {
    const devotionalSlug = request.nextUrl.searchParams.get('devotionalSlug')
    if (!devotionalSlug || !isSafeSlug(devotionalSlug)) {
      return jsonError({
        error: 'A safe devotionalSlug query parameter is required.',
        status: 400,
        requestId,
      })
    }

    const user = await getUser()
    if (!user) {
      return withRequestIdHeaders(
        NextResponse.json({ ok: true, progress: null }, { status: 200 }),
        requestId,
      )
    }

    const progress = await readListeningProgress({
      userId: user.id,
      devotionalSlug,
    })

    return withRequestIdHeaders(
      NextResponse.json({ ok: true, progress }, { status: 200 }),
      requestId,
    )
  } catch (error) {
    // Migration 018 may not be applied yet. Resume then behaves exactly as it
    // did before this feature — on-device only. The failure is LOGGED, so this
    // is a degraded path we can see, not a silent fallback.
    if (isMissingListeningProgressTable(error)) {
      logApiFailure({
        scope: 'listening-progress-get',
        requestId,
        // CONFIG_FEATURE_DISABLED, not a new code: the taxonomy in
        // api-failure.ts is a closed alerting contract and this is exactly its
        // "environment not provisioned" case. The specificity lives in
        // `context`, which does not need the contract to change.
        code: 'CONFIG_FEATURE_DISABLED',
        context: { migration: '018_create_listening_progress', pending: true },
        error,
        method: request.method,
        path: request.nextUrl.pathname,
        clientKey,
      })
      return withRequestIdHeaders(
        NextResponse.json(
          { ok: true, progress: null, pendingMigration: true },
          { status: 200 },
        ),
        requestId,
      )
    }

    logApiError({
      scope: 'listening-progress-get',
      requestId,
      error,
      method: request.method,
      path: request.nextUrl.pathname,
      clientKey,
    })
    logApiFailure({
      scope: 'listening-progress-get',
      requestId,
      code: 'UPSTREAM_DB_ERROR',
      error,
      method: request.method,
      path: request.nextUrl.pathname,
      clientKey,
    })
    return jsonError({
      error: 'Unable to read listening progress.',
      code: 'LISTENING_PROGRESS_READ_FAILED',
      status: 500,
      requestId,
    })
  }
}

/** PUT — record a position. Requires an account (SA-060). */
export async function PUT(request: NextRequest) {
  const requestId = createRequestId()
  const clientKey = getClientKey(request)
  try {
    const user = await getUser()
    if (!user) {
      return jsonError({
        error: 'Sign in to keep your place across devices.',
        code: 'AUTH_REQUIRED_SAVE_STATE',
        status: 401,
        requestId,
      })
    }

    const limiter = await takeRateLimit({
      namespace: 'listening-progress-put',
      key: clientKey,
      limit: MAX_REQUESTS_PER_MINUTE,
      windowMs: 60_000,
    })
    if (!limiter.ok) {
      return jsonError({
        error: 'Too many progress updates. Please retry shortly.',
        status: 429,
        requestId,
        rateLimit: limiter,
      })
    }

    const parsed = await readJsonWithLimit<ProgressBody>({
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

    const payload = parsed.data
    const devotionalSlug = String(payload.devotionalSlug || '').trim()
    if (!devotionalSlug || !isSafeSlug(devotionalSlug)) {
      return jsonError({
        error: 'A safe devotionalSlug is required.',
        status: 400,
        requestId,
      })
    }

    const position = Number(payload.positionSeconds)
    if (!Number.isFinite(position) || position < 0) {
      return jsonError({
        error: 'positionSeconds must be a non-negative number.',
        status: 400,
        requestId,
      })
    }

    const duration = Number(payload.durationSeconds)
    const delta = Number(payload.listenedDelta)

    const progress = await upsertListeningProgress({
      userId: user.id,
      devotionalSlug,
      positionSeconds: position,
      durationSeconds:
        Number.isFinite(duration) && duration > 0 ? duration : null,
      // Clamped: a client that slept through a tab suspension could otherwise
      // report hours of "listening" that never happened, and this number is
      // meant to be true enough to show a reader back to themselves.
      listenedDelta:
        Number.isFinite(delta) && delta > 0 ? Math.min(delta, 300) : 0,
      ended: payload.ended === true,
    })

    return withRequestIdHeaders(
      NextResponse.json({ ok: true, progress }, { status: 200 }),
      requestId,
    )
  } catch (error) {
    if (isMissingListeningProgressTable(error)) {
      logApiFailure({
        scope: 'listening-progress-put',
        requestId,
        // CONFIG_FEATURE_DISABLED, not a new code: the taxonomy in
        // api-failure.ts is a closed alerting contract and this is exactly its
        // "environment not provisioned" case. The specificity lives in
        // `context`, which does not need the contract to change.
        code: 'CONFIG_FEATURE_DISABLED',
        context: { migration: '018_create_listening_progress', pending: true },
        error,
        method: request.method,
        path: request.nextUrl.pathname,
        clientKey,
      })
      return withRequestIdHeaders(
        NextResponse.json(
          { ok: true, progress: null, pendingMigration: true },
          { status: 200 },
        ),
        requestId,
      )
    }

    logApiError({
      scope: 'listening-progress-put',
      requestId,
      error,
      method: request.method,
      path: request.nextUrl.pathname,
      clientKey,
    })
    logApiFailure({
      scope: 'listening-progress-put',
      requestId,
      code: 'UPSTREAM_DB_ERROR',
      error,
      method: request.method,
      path: request.nextUrl.pathname,
      clientKey,
    })
    return jsonError({
      error: 'Unable to save listening progress.',
      code: 'LISTENING_PROGRESS_SAVE_FAILED',
      status: 500,
      requestId,
    })
  }
}

/**
 * sendBeacon posts. The client uses it on `pagehide`, where a fetch would be
 * cancelled with the page — the one moment the position most needs saving.
 */
export const POST = PUT
