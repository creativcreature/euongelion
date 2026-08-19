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
  isPendingReadingProgressMigration,
  listReadingProgress,
  upsertReadingCompletion,
} from '@/lib/reading/reading-progress-repository'

interface CompletionBody {
  devotionalSlug?: string
  completedAt?: string
  timeSpentSeconds?: number
}

const MAX_BODY_BYTES = 1_024
/**
 * An abuse ceiling, not the expected rate. The steady state is one write per
 * devotional finished; the burst case is the first sign-in on a device that
 * has read a whole series signed-out and is backfilling it a row at a time.
 */
const MAX_REQUESTS_PER_MINUTE = 60
/**
 * A devotional is a five-minute read and `useReadingTime` counts wall clock
 * from mount, so any larger number is a tab left open, not time spent reading.
 * Clamped rather than rejected: the completion is real even when its timer is
 * not, and refusing the whole write over a bad stopwatch would lose it.
 */
const MAX_TIME_SPENT_SECONDS = 3_600

/**
 * GET — every devotional this account has finished.
 *
 * Returns `{ progress: null, signedIn: false }` with 200 for a signed-out
 * reader. That is not an error: it means "nothing recorded against an
 * account", and the client keeps using this device's progress. Answering 401
 * would log a failure on every signed-out page load, which is most of them.
 */
export async function GET(request: NextRequest) {
  const requestId = createRequestId()
  const clientKey = getClientKey(request)
  try {
    const user = await getUser()
    if (!user) {
      return withRequestIdHeaders(
        NextResponse.json(
          { ok: true, signedIn: false, progress: null },
          { status: 200 },
        ),
        requestId,
      )
    }

    const progress = await listReadingProgress({ userId: user.id })

    return withRequestIdHeaders(
      NextResponse.json(
        // `userId` is the client's owner stamp: on a shared device it is how
        // the sync layer notices a different account signed in and refuses to
        // backfill the previous reader's history into this one.
        { ok: true, signedIn: true, userId: user.id, progress },
        { status: 200 },
      ),
      requestId,
    )
  } catch (error) {
    // Migration 019 may not be applied yet. Progress then behaves exactly as
    // it did before this feature — on-device only. The failure is LOGGED, so
    // this is a degraded path we can see, not a silent fallback.
    if (isPendingReadingProgressMigration(error)) {
      logApiFailure({
        scope: 'reading-progress-get',
        requestId,
        // CONFIG_FEATURE_DISABLED, not a new code: the taxonomy in
        // api-failure.ts is a closed alerting contract and this is exactly its
        // "environment not provisioned" case. The specificity lives in
        // `context`, which does not need the contract to change.
        code: 'CONFIG_FEATURE_DISABLED',
        context: { migration: '019_user_progress_by_slug', pending: true },
        error,
        method: request.method,
        path: request.nextUrl.pathname,
        clientKey,
      })
      return withRequestIdHeaders(
        NextResponse.json(
          { ok: true, signedIn: true, progress: null, pendingMigration: true },
          { status: 200 },
        ),
        requestId,
      )
    }

    logApiError({
      scope: 'reading-progress-get',
      requestId,
      error,
      method: request.method,
      path: request.nextUrl.pathname,
      clientKey,
    })
    logApiFailure({
      scope: 'reading-progress-get',
      requestId,
      code: 'UPSTREAM_DB_ERROR',
      error,
      method: request.method,
      path: request.nextUrl.pathname,
      clientKey,
    })
    return jsonError({
      error: 'Unable to read reading progress.',
      code: 'READING_PROGRESS_READ_FAILED',
      status: 500,
      requestId,
    })
  }
}

/** POST — record one finished devotional. Requires an account (SA-060). */
export async function POST(request: NextRequest) {
  const requestId = createRequestId()
  const clientKey = getClientKey(request)
  try {
    const user = await getUser()
    if (!user) {
      return jsonError({
        error: 'Sign in to keep your progress across devices.',
        code: 'AUTH_REQUIRED_SAVE_STATE',
        status: 401,
        requestId,
      })
    }

    const limiter = await takeRateLimit({
      namespace: 'reading-progress-post',
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

    const parsed = await readJsonWithLimit<CompletionBody>({
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

    // The client sends when IT recorded the completion, which matters when a
    // device has been reading signed-out and is backfilling. An unparseable or
    // absent stamp falls back to now rather than rejecting a real completion;
    // a future-dated one is not trusted, because a wrong device clock must not
    // be able to plant a completion date nothing can ever supersede.
    const now = Date.now()
    const claimed = payload.completedAt ? Date.parse(payload.completedAt) : NaN
    const completedAt = new Date(
      Number.isFinite(claimed) && claimed > 0 && claimed <= now ? claimed : now,
    ).toISOString()

    const timeSpent = Number(payload.timeSpentSeconds)
    const timeSpentSeconds =
      Number.isFinite(timeSpent) && timeSpent > 0
        ? Math.round(Math.min(timeSpent, MAX_TIME_SPENT_SECONDS))
        : null

    const progress = await upsertReadingCompletion({
      userId: user.id,
      devotionalSlug,
      completedAt,
      timeSpentSeconds,
    })

    return withRequestIdHeaders(
      NextResponse.json({ ok: true, progress }, { status: 200 }),
      requestId,
    )
  } catch (error) {
    if (isPendingReadingProgressMigration(error)) {
      logApiFailure({
        scope: 'reading-progress-post',
        requestId,
        // CONFIG_FEATURE_DISABLED, not a new code: the taxonomy in
        // api-failure.ts is a closed alerting contract and this is exactly its
        // "environment not provisioned" case. The specificity lives in
        // `context`, which does not need the contract to change.
        code: 'CONFIG_FEATURE_DISABLED',
        context: { migration: '019_user_progress_by_slug', pending: true },
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
      scope: 'reading-progress-post',
      requestId,
      error,
      method: request.method,
      path: request.nextUrl.pathname,
      clientKey,
    })
    logApiFailure({
      scope: 'reading-progress-post',
      requestId,
      code: 'UPSTREAM_DB_ERROR',
      error,
      method: request.method,
      path: request.nextUrl.pathname,
      clientKey,
    })
    return jsonError({
      error: 'Unable to save reading progress.',
      code: 'READING_PROGRESS_SAVE_FAILED',
      status: 500,
      requestId,
    })
  }
}
