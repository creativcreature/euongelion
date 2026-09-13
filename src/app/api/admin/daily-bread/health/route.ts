import { NextResponse, type NextRequest } from 'next/server'
import {
  createRequestId,
  getClientKey,
  jsonError,
  logApiError,
  takeRateLimit,
  withRequestIdHeaders,
} from '@/lib/api-security'
import { authorizeDailyBread } from '@/lib/daily-bread/auth'
import { getDailyBreadHealth } from '@/lib/daily-bread/health'
import { getDailyBreadRepository } from '@/lib/daily-bread/repository'
import { systemClock } from '@/lib/daily-bread/time'

/**
 * GET /api/admin/daily-bread/health — Daily Bread V2 health (SA-142 / F-184).
 *
 * Callers: the scheduler's alert step (X-Internal-Secret) or a founder session
 * on ADMIN_EMAIL_ALLOWLIST. Returns lifecycle, quality, recent attempt stats
 * and alerts — never payloads, prompts or credentials. 200 for ok/degraded,
 * 503 for down, so an uptime monitor can alert on the status code alone.
 */

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const requestId = createRequestId()
  const limit = await takeRateLimit({
    namespace: 'daily-bread-health',
    key: getClientKey(request),
    limit: 30,
    windowMs: 60_000,
  })
  if (!limit.ok) {
    return jsonError({ error: 'Too many requests.', status: 429, requestId, code: 'RATE_LIMITED', rateLimit: limit })
  }

  const auth = await authorizeDailyBread(request, { allowAdminSession: true })
  if (!auth.ok) {
    return jsonError({
      error: auth.status === 401 ? 'Unauthorized.' : 'Forbidden.',
      status: auth.status,
      requestId,
      code: auth.status === 401 ? 'AUTH_REQUIRED' : 'AUTH_FORBIDDEN',
    })
  }

  try {
    const health = await getDailyBreadHealth(getDailyBreadRepository(), systemClock)
    return withRequestIdHeaders(
      NextResponse.json({ ok: health.status !== 'down', health }, { status: health.status === 'down' ? 503 : 200 }),
      requestId,
    )
  } catch (error) {
    logApiError({ scope: 'daily-bread-health', requestId, error })
    return jsonError({ error: 'Health check failed.', status: 500, requestId, code: 'HEALTH_FAILED' })
  }
}
