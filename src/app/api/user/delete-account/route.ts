import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createRequestId,
  getClientKey,
  jsonError,
  logApiError,
  readJsonWithLimit,
  takeRateLimit,
  withRequestIdHeaders,
} from '@/lib/api-security'
import { deleteUserAccount } from '@/lib/privacy/account-deletion'

/**
 * POST /api/user/delete-account
 *
 * IRREVERSIBLE. Cascade-deletes the authenticated user's data
 * across all session-token-keyed and user-id-keyed tables, then
 * deletes the auth.users row.
 *
 * Auth: required (verified Supabase session).
 * CSRF/XSS protection: the body MUST include
 *   { "confirm": "DELETE MY ACCOUNT", "userEmail": "<the user's email>" }
 * This double-confirmation prevents:
 *   - A casual page visit from triggering deletion
 *   - An XSS that steals a session cookie from triggering deletion
 *     without also knowing the user's email (which the attacker
 *     would have to phish separately)
 *
 * Rate limit: 3 per day per client. This is a one-shot action;
 * legitimate users never need more.
 *
 * Returns the deletion result so the user knows which (if any)
 * tables had partial failures, and is then logged out.
 */

const MAX_DELETIONS_PER_DAY = 3
const MAX_BODY_BYTES = 4_096
const REQUIRED_CONFIRM_PHRASE = 'DELETE MY ACCOUNT'

interface DeleteAccountBody {
  confirm?: string
  userEmail?: string
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId()
  try {
    const limiter = await takeRateLimit({
      namespace: 'user-delete-account',
      key: getClientKey(request),
      limit: MAX_DELETIONS_PER_DAY,
      windowMs: 24 * 60 * 60_000,
    })
    if (!limiter.ok) {
      return jsonError({
        error: 'Too many deletion requests. Please try again later.',
        status: 429,
        requestId,
        code: 'RATE_LIMITED',
      })
    }

    const parsed = await readJsonWithLimit<DeleteAccountBody>({
      request,
      maxBytes: MAX_BODY_BYTES,
    })
    if (!parsed.ok) {
      return jsonError({
        error: parsed.error,
        status: parsed.status,
        requestId,
        code: 'INVALID_JSON_BODY',
      })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return jsonError({
        error: 'Sign in to delete your account.',
        status: 401,
        requestId,
        code: 'AUTH_REQUIRED',
      })
    }

    const confirm =
      typeof parsed.data.confirm === 'string' ? parsed.data.confirm.trim() : ''
    const userEmail =
      typeof parsed.data.userEmail === 'string'
        ? parsed.data.userEmail.trim().toLowerCase()
        : ''
    const sessionEmail = (user.email || '').trim().toLowerCase()

    if (confirm !== REQUIRED_CONFIRM_PHRASE) {
      return jsonError({
        error: `Confirmation phrase must be exactly "${REQUIRED_CONFIRM_PHRASE}".`,
        status: 400,
        requestId,
        code: 'CONFIRMATION_MISMATCH',
      })
    }

    if (!userEmail || !sessionEmail || userEmail !== sessionEmail) {
      return jsonError({
        error: 'Email confirmation does not match the signed-in user.',
        status: 400,
        requestId,
        code: 'EMAIL_MISMATCH',
      })
    }

    const result = await deleteUserAccount(user.id)

    // Sign out the now-deleted user so the session cookie is cleared.
    // Do this AFTER the delete — signing out first would invalidate
    // the supabase session we use to call admin.deleteUser.
    try {
      await supabase.auth.signOut()
    } catch {
      // Sign-out failure is non-fatal — the auth.users row is gone,
      // so the next request would fail auth anyway.
    }

    return withRequestIdHeaders(
      NextResponse.json(
        {
          ok: true,
          deletion: result,
        },
        {
          status: 200,
          headers: { 'Cache-Control': 'no-store' },
        },
      ),
      requestId,
    )
  } catch (error) {
    logApiError({
      scope: 'user-delete-account',
      requestId,
      error,
      method: request.method,
      path: '/api/user/delete-account',
    })
    return jsonError({
      error: 'Could not delete your account. Please try again.',
      status: 500,
      requestId,
      code: 'DELETE_FAILED',
    })
  }
}
