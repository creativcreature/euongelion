import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createRequestId,
  jsonError,
  logApiError,
  withRequestIdHeaders,
} from '@/lib/api-security'

/**
 * POST /api/auth/sign-out
 *
 * Signs out the current Supabase session. Clears the auth cookie.
 * Idempotent — calling twice is safe.
 */
export async function POST(request: NextRequest) {
  const requestId = createRequestId()
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      logApiError({
        scope: 'auth-sign-out',
        requestId,
        error,
        method: request.method,
        path: '/api/auth/sign-out',
      })
      return jsonError({
        error: error.message,
        status: 500,
        requestId,
        code: 'SIGN_OUT_FAILED',
      })
    }
    return withRequestIdHeaders(
      NextResponse.json(
        { ok: true },
        { status: 200, headers: { 'Cache-Control': 'no-store' } },
      ),
      requestId,
    )
  } catch (error) {
    logApiError({
      scope: 'auth-sign-out',
      requestId,
      error,
      method: request.method,
      path: '/api/auth/sign-out',
    })
    return jsonError({
      error: 'Unable to sign out.',
      status: 500,
      requestId,
      code: 'SIGN_OUT_FAILED',
    })
  }
}
