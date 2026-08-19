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
import {
  DISPLAY_NAME_MAX_LENGTH,
  sanitizeDisplayName,
} from '@/lib/auth/display-name'

/**
 * /api/user/profile — the signed-in reader's display name.
 *
 * GET  → { ok, fullName }        the current `public.users.full_name`
 * POST → { ok, fullName }        writes a validated 1–80 char name
 *
 * Auth: required on both verbs (401 when signed out).
 *
 * The write goes through the SERVER client, not the service role: RLS
 * ("Users can update own profile", database/migrations/001_create_users.sql)
 * scopes the statement to the caller's own row, so a stolen row id buys
 * nothing. The update asks for the row back — a write that matches zero
 * rows means the profile record is missing, and that surfaces as a 500
 * rather than a green checkmark over a no-op. The read holds the same
 * line: a missing row is PROFILE_ROW_MISSING (500), never fullName:null.
 */

const MAX_BODY_BYTES = 1_024
const MAX_WRITES_PER_HOUR = 20

interface ProfileSaveBody {
  fullName?: unknown
}

export async function GET(request: NextRequest) {
  const requestId = createRequestId()

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return jsonError({
        error: 'Sign in to view your profile.',
        status: 401,
        requestId,
        code: 'AUTH_REQUIRED',
      })
    }

    const { data, error } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      return jsonError({
        error: `Could not read your profile: ${error.message}`,
        status: 500,
        requestId,
        code: 'PROFILE_READ_FAILED',
      })
    }

    // A missing row is an ANOMALY, not "no name yet": the signup trigger
    // (database/migrations/001_create_users.sql) creates a public.users
    // row for every account. Mapping it to { ok, fullName: null } would
    // paint a healthy empty state over a broken profile — surface it and
    // let the client render its error state instead.
    if (!data) {
      return jsonError({
        error: 'Your profile record is missing.',
        status: 500,
        requestId,
        code: 'PROFILE_ROW_MISSING',
        details: { ok: false },
      })
    }

    return withRequestIdHeaders(
      NextResponse.json(
        {
          ok: true,
          fullName: data.full_name ?? null,
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
      scope: 'user-profile',
      requestId,
      error,
      method: request.method,
      path: '/api/user/profile',
    })
    return jsonError({
      error: 'Could not read your profile. Please try again.',
      status: 500,
      requestId,
      code: 'PROFILE_READ_FAILED',
    })
  }
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId()

  try {
    const limiter = await takeRateLimit({
      namespace: 'user-profile',
      key: getClientKey(request),
      limit: MAX_WRITES_PER_HOUR,
      windowMs: 60 * 60_000,
    })
    if (!limiter.ok) {
      return jsonError({
        error: 'Too many profile updates. Please try again later.',
        status: 429,
        requestId,
        code: 'RATE_LIMITED',
      })
    }

    const parsed = await readJsonWithLimit<ProfileSaveBody>({
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
        error: 'Sign in to change your display name.',
        status: 401,
        requestId,
        code: 'AUTH_REQUIRED',
      })
    }

    const fullName = sanitizeDisplayName(parsed.data.fullName)
    if (!fullName) {
      return jsonError({
        error: `Display name must be 1–${DISPLAY_NAME_MAX_LENGTH} printable characters.`,
        status: 400,
        requestId,
        code: 'INVALID_DISPLAY_NAME',
      })
    }

    const { data, error } = await supabase
      .from('users')
      .update({ full_name: fullName })
      .eq('id', user.id)
      .select('full_name')
      .maybeSingle()

    if (error) {
      return jsonError({
        error: `Could not save your display name: ${error.message}`,
        status: 500,
        requestId,
        code: 'PROFILE_WRITE_FAILED',
      })
    }

    if (!data) {
      return jsonError({
        error:
          'Your profile record is missing, so the display name was not saved.',
        status: 500,
        requestId,
        code: 'PROFILE_ROW_MISSING',
      })
    }

    return withRequestIdHeaders(
      NextResponse.json(
        {
          ok: true,
          fullName: data.full_name,
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
      scope: 'user-profile',
      requestId,
      error,
      method: request.method,
      path: '/api/user/profile',
    })
    return jsonError({
      error: 'Could not save your display name. Please try again.',
      status: 500,
      requestId,
      code: 'PROFILE_WRITE_FAILED',
    })
  }
}
