import { NextRequest, NextResponse } from 'next/server'
import {
  createRequestId,
  getClientKey,
  jsonError,
  logApiError,
  takeRateLimit,
  withRequestIdHeaders,
} from '@/lib/api-security'
import { getFoundingMemberCount } from '@/lib/billing/founding-member'
import type { FoundingMemberCount } from '@/types/billing'

/**
 * GET /api/billing/founding-member-count
 *
 * Returns the current Founding Member slot count for rendering the
 * "N of 500 claimed" counter on /pricing. Cached for 60s server-side
 * via the helper module.
 *
 * Public — no auth required, since the count itself is non-sensitive
 * marketing copy. Rate-limited per-client to prevent abuse.
 */

const MAX_REQUESTS_PER_MINUTE = 60

export async function GET(request: NextRequest) {
  const requestId = createRequestId()
  try {
    const limiter = await takeRateLimit({
      namespace: 'billing-founding-member-count',
      key: getClientKey(request),
      limit: MAX_REQUESTS_PER_MINUTE,
      windowMs: 60_000,
    })
    if (!limiter.ok) {
      return jsonError({
        error: 'Too many requests. Please retry shortly.',
        status: 429,
        requestId,
        code: 'RATE_LIMITED',
      })
    }

    const count: FoundingMemberCount = await getFoundingMemberCount()

    return withRequestIdHeaders(
      NextResponse.json(
        { ok: true, count },
        {
          status: 200,
          // Match the helper's TTL — public cache OK since the value
          // is non-sensitive and shifts slowly.
          headers: { 'Cache-Control': 'public, max-age=60' },
        },
      ),
      requestId,
    )
  } catch (error) {
    logApiError({
      scope: 'billing-founding-member-count',
      requestId,
      error,
      method: request.method,
      path: '/api/billing/founding-member-count',
    })
    return jsonError({
      error: 'Could not load Founding Member count.',
      status: 500,
      requestId,
      code: 'COUNT_LOOKUP_FAILED',
    })
  }
}
