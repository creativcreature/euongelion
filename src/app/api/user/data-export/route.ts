import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createRequestId,
  getClientKey,
  jsonError,
  logApiError,
  takeRateLimit,
  withRequestIdHeaders,
} from '@/lib/api-security'
import {
  exportUserData,
  formatExportForDownload,
} from '@/lib/privacy/data-export'

/**
 * GET /api/user/data-export
 *
 * Returns the authenticated user's full dataset as a downloadable
 * JSON file (Content-Disposition: attachment).
 *
 * Auth: required. Returns 401 when unauthenticated.
 * Rate limit: 5 per hour per client (export is heavy).
 *
 * The route NEVER returns another user's data — `userId` always
 * comes from the verified Supabase session, never from a query param.
 *
 * Partial-failure semantics: the export helper records per-table
 * failures into `partialFailures` rather than throwing. The user
 * still gets a usable JSON file even if one table is briefly
 * unavailable.
 */

const MAX_EXPORTS_PER_HOUR = 5

export async function GET(request: NextRequest) {
  const requestId = createRequestId()
  try {
    const limiter = await takeRateLimit({
      namespace: 'user-data-export',
      key: getClientKey(request),
      limit: MAX_EXPORTS_PER_HOUR,
      windowMs: 60 * 60_000,
    })
    if (!limiter.ok) {
      return jsonError({
        error: 'Too many export requests. Please try again later.',
        status: 429,
        requestId,
        code: 'RATE_LIMITED',
      })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return jsonError({
        error: 'Sign in to export your data.',
        status: 401,
        requestId,
        code: 'AUTH_REQUIRED',
      })
    }

    const result = await exportUserData(user.id)
    const [body, filename] = formatExportForDownload(result)

    return withRequestIdHeaders(
      new NextResponse(body, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      }),
      requestId,
    )
  } catch (error) {
    logApiError({
      scope: 'user-data-export',
      requestId,
      error,
      method: request.method,
      path: '/api/user/data-export',
    })
    return jsonError({
      error: 'Could not build your data export. Please try again.',
      status: 500,
      requestId,
      code: 'EXPORT_FAILED',
    })
  }
}
