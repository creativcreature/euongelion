import { NextRequest, NextResponse } from 'next/server'
import { validateInternalSecret } from '@/lib/internal-auth'
import {
  createRequestId,
  jsonError,
  logApiError,
  withRequestIdHeaders,
} from '@/lib/api-security'
import { runRetentionCleanup } from '@/lib/privacy/retention-cleanup'

/**
 * POST /api/admin/run-retention-cleanup
 *
 * INTERNAL-ONLY route protected by `X-Internal-Secret` header.
 *
 * Runs the 30-day anonymous-data retention cleanup synchronously and
 * returns the structured result. Designed to be called by:
 *   - A future Cloudflare Cron Trigger (when the binding is added)
 *   - A GitHub Action on a schedule
 *   - A manual ops call (`curl -H 'X-Internal-Secret: ...' POST ...`)
 *
 * The cleanup helper itself never throws — partial failures are
 * recorded in the result.
 *
 * Optional body params (JSON, all optional):
 *   - `windowDays`: override the default retention window (for testing)
 *   - `now`: ISO timestamp to treat as "now" (for testing)
 *
 * Returns 403 if the internal secret is missing/wrong, 200 with the
 * cleanup result otherwise.
 */

interface CleanupRequestBody {
  windowDays?: number
  now?: string
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId()
  if (!validateInternalSecret(request)) {
    return jsonError({
      error: 'Forbidden',
      status: 403,
      requestId,
      code: 'INTERNAL_SECRET_REQUIRED',
    })
  }

  let body: CleanupRequestBody = {}
  try {
    const text = await request.text()
    if (text.length > 0) {
      body = JSON.parse(text) as CleanupRequestBody
    }
  } catch {
    // Empty body is fine; only complain on malformed JSON.
    return jsonError({
      error: 'Invalid JSON body.',
      status: 400,
      requestId,
      code: 'INVALID_JSON_BODY',
    })
  }

  try {
    const overrides: { windowDays?: number; now?: Date } = {}
    if (typeof body.windowDays === 'number' && body.windowDays > 0) {
      overrides.windowDays = body.windowDays
    }
    if (typeof body.now === 'string') {
      const parsed = new Date(body.now)
      if (!Number.isNaN(parsed.getTime())) {
        overrides.now = parsed
      }
    }

    const result = await runRetentionCleanup(overrides)

    return withRequestIdHeaders(
      NextResponse.json(
        { ok: true, cleanup: result },
        { status: 200, headers: { 'Cache-Control': 'no-store' } },
      ),
      requestId,
    )
  } catch (error) {
    logApiError({
      scope: 'admin-retention-cleanup',
      requestId,
      error,
      method: request.method,
      path: '/api/admin/run-retention-cleanup',
    })
    return jsonError({
      error: 'Retention cleanup failed.',
      status: 500,
      requestId,
      code: 'CLEANUP_FAILED',
    })
  }
}
