import { revalidatePath } from 'next/cache'
import { NextResponse, type NextRequest } from 'next/server'
import {
  createRequestId,
  getClientKey,
  jsonError,
  logApiError,
  readJsonWithLimit,
  takeRateLimit,
  withRequestIdHeaders,
} from '@/lib/api-security'
import { authorizeDailyBread } from '@/lib/daily-bread/auth'
import { dailyBreadSource } from '@/lib/daily-bread/flags'
import { createRunLogger, newRunId } from '@/lib/daily-bread/log'
import { publishDailyBreadEdition } from '@/lib/daily-bread/publish'
import { getDailyBreadRepository } from '@/lib/daily-bread/repository'
import { rejectedEditionItemIds } from '@/lib/daily-bread/source-review'
import { addDays, editorialDate, isValidDateSlug, systemClock } from '@/lib/daily-bread/time'

/**
 * POST /api/admin/daily-bread/publish — publish a READY Daily Bread V2 edition
 * at (or after) its rollover (SA-142 / F-184). INTERNAL ONLY: requires
 * X-Internal-Secret; a founder session is not enough to publish by URL.
 *
 * Body: { "date": "YYYY-MM-DD" } — must be the live editorial date or one of
 * the two days before it. Publication is a single database transaction that
 * allocates the issue number; calling it twice returns already_published with
 * the same number. Building an edition is NOT possible here (that runs in the
 * scheduler, outside the Workers request budget).
 */

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const requestId = createRequestId()
  const limit = await takeRateLimit({
    namespace: 'daily-bread-publish',
    key: getClientKey(request),
    limit: 10,
    windowMs: 60_000,
  })
  if (!limit.ok) {
    return jsonError({ error: 'Too many requests.', status: 429, requestId, code: 'RATE_LIMITED', rateLimit: limit })
  }

  const auth = await authorizeDailyBread(request, { allowAdminSession: false })
  if (!auth.ok) {
    return jsonError({ error: 'Forbidden.', status: 403, requestId, code: 'INTERNAL_SECRET_REQUIRED' })
  }

  if (dailyBreadSource() !== 'supabase') {
    return jsonError({ error: 'Publishing requires the database source.', status: 409, requestId, code: 'READ_ONLY_SOURCE' })
  }

  const body = await readJsonWithLimit<{ date?: unknown }>({ request, maxBytes: 256 })
  if (!body.ok) {
    return jsonError({ error: body.error, status: body.status, requestId, code: 'BAD_BODY' })
  }
  const date = body.data?.date
  if (!isValidDateSlug(date)) {
    return jsonError({ error: 'date must be YYYY-MM-DD.', status: 400, requestId, code: 'BAD_DATE' })
  }
  const live = editorialDate(systemClock.now())
  if (date > live || date < addDays(live, -2)) {
    return jsonError({
      error: 'date must be the live editorial date or up to two days before it.',
      status: 400,
      requestId,
      code: 'DATE_OUT_OF_WINDOW',
    })
  }

  try {
    const outcome = await publishDailyBreadEdition(date, {
      repo: getDailyBreadRepository(),
      clock: systemClock,
      logger: createRunLogger(newRunId('db2-api'), { base: { requestId } }),
      trigger: 'manual',
      rejectedSourceItems: rejectedEditionItemIds,
    })
    if (outcome.result === 'published' || outcome.result === 'already_published') {
      // Plan §28 step 31. Today the Worker has no incremental cache (responses are
      // x-nextjs-cache MISS or no-store, verified 2026-09-14), so this is a no-op.
      // It keeps a future cache layer honest. already_published revalidates too:
      // the Worker cron runs after a CI publish, so its call refreshes that as well.
      for (const path of ['/daily-bread', `/daily-bread/${date}`, '/daily-bread/archive']) {
        revalidatePath(path)
      }
    }
    const status = outcome.result === 'failed' ? 500 : 200
    return withRequestIdHeaders(
      NextResponse.json(
        { ok: outcome.result === 'published' || outcome.result === 'already_published', ...outcome },
        { status },
      ),
      requestId,
    )
  } catch (error) {
    logApiError({ scope: 'daily-bread-publish', requestId, error })
    return jsonError({ error: 'Publish failed.', status: 500, requestId, code: 'PUBLISH_FAILED' })
  }
}
