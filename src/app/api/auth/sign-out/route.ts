import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { AUDIT_SESSION_COOKIE } from '@/lib/soul-audit/session'
import {
  createRequestId,
  logApiError,
  withRequestIdHeaders,
} from '@/lib/api-security'

/**
 * POST /api/auth/sign-out
 *
 * Signs out unconditionally. (F-083 follow-up, 2026-07-27.)
 *
 * The previous implementation returned a 500 WITHOUT clearing cookies
 * whenever Supabase's revocation call failed — which is exactly what
 * happens with a dead/expired session. That locked users into a
 * zombie state: signed-in-looking cookies the server could not
 * validate, and no way to reset them ("I need to be able to log out
 * of my account and log back in").
 *
 * Now: revocation is best-effort; the response ALWAYS expires every
 * Supabase auth cookie (sb-*) and the Soul Audit session cookie, so
 * sign-out is a guaranteed local reset regardless of session health.
 */
export async function POST(request: NextRequest) {
  const requestId = createRequestId()

  // Best-effort server-side revocation — a dead session makes this
  // fail, and that must never block the local reset below.
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch (error) {
    logApiError({
      scope: 'auth-sign-out',
      requestId,
      error,
      method: request.method,
      path: '/api/auth/sign-out',
    })
  }

  const response = withRequestIdHeaders(
    NextResponse.json(
      { ok: true },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    ),
    requestId,
  )

  try {
    const cookieStore = await cookies()
    for (const cookie of cookieStore.getAll()) {
      // Supabase auth cookies: sb-<project-ref>-auth-token(.0/.1 chunks)
      if (cookie.name.startsWith('sb-')) {
        response.cookies.set(cookie.name, '', { path: '/', maxAge: 0 })
      }
    }
    // The Soul Audit session cookie resurrects months-old plans on
    // /daily-bread; signing out means a clean slate for that too.
    response.cookies.set(AUDIT_SESSION_COOKIE, '', { path: '/', maxAge: 0 })
  } catch (error) {
    logApiError({
      scope: 'auth-sign-out-clear',
      requestId,
      error,
      method: request.method,
      path: '/api/auth/sign-out',
    })
  }

  return response
}
