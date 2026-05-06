import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createRequestId,
  logApiError,
  withRequestIdHeaders,
} from '@/lib/api-security'

/**
 * GET /api/auth/session
 *
 * Returns `{ authenticated, user: { id, email } | null }` for the
 * current Supabase session. Always returns 200 — even when the
 * lookup throws — so client code can treat this as a non-failing
 * "what's my auth state" probe.
 */
export async function GET(request: NextRequest) {
  const requestId = createRequestId()
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    return withRequestIdHeaders(
      NextResponse.json(
        {
          authenticated: Boolean(user),
          user: user
            ? {
                id: user.id,
                email: user.email ?? null,
              }
            : null,
        },
        { status: 200, headers: { 'Cache-Control': 'no-store' } },
      ),
      requestId,
    )
  } catch (error) {
    logApiError({
      scope: 'auth-session',
      requestId,
      error,
      method: request.method,
      path: '/api/auth/session',
    })
    return withRequestIdHeaders(
      NextResponse.json(
        { authenticated: false, user: null },
        { status: 200, headers: { 'Cache-Control': 'no-store' } },
      ),
      requestId,
    )
  }
}
