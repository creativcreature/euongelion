import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
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
 * POST /api/admin/reset-my-account — founder onboarding re-test control
 * (custom-generation brief §9, F-077).
 *
 * Resets THE CALLING ADMIN'S OWN account to first-run state: every data
 * row cascades away exactly like an account deletion (plans, progress,
 * bookmarks, audit history, sessions, push subscriptions), but the auth
 * user and public.users row survive — so email, role, and subscription
 * state are preserved while onboarding state and the one-time free
 * generation grant reset.
 *
 * Gating (ALL required, in order — brief §9 "real, not obscurity"):
 *   1. env `ADMIN_ACCOUNT_RESET_ENABLED === 'true'` — 404 otherwise, so
 *      the control can be disabled in production independently of role.
 *   2. Authenticated session — 404 otherwise.
 *   3. `public.users.role === 'admin'` — verified server-side on every
 *      call; the role is granted manually in the DB only (migration
 *      20260711000001). Non-admins receive 404, indistinguishable from
 *      a missing route.
 *   4. Body `{ "confirm": "RESET MY ACCOUNT" }` — a deliberate typed
 *      action, defense-in-depth alongside SameSite=Lax cookies.
 *
 * The endpoint can only ever reset the caller's own account — no target
 * parameter exists.
 */

const CONFIRM_PHRASE = 'RESET MY ACCOUNT'
const NOT_FOUND = { error: 'Not found.', status: 404 as const }

/** Metadata keys cleared so onboarding re-offers itself (F-065). */
const ONBOARDING_METADATA_RESET = {
  onboardingCompleted: false,
  onboardingSkipped: false,
  onboardingPreferences: null,
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId()

  // Gate 1: environment switch (independent of role).
  if (process.env.ADMIN_ACCOUNT_RESET_ENABLED !== 'true') {
    return jsonError({ ...NOT_FOUND, requestId })
  }

  const limiter = await takeRateLimit({
    namespace: 'admin-account-reset',
    key: getClientKey(request),
    limit: 5,
    windowMs: 60_000,
  })
  if (!limiter.ok) {
    return jsonError({
      error: 'Too many reset attempts. Wait a moment.',
      code: 'RATE_LIMITED',
      status: 429,
      requestId,
      rateLimit: limiter,
    })
  }

  try {
    // Gate 2: authenticated caller.
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return jsonError({ ...NOT_FOUND, requestId })
    }

    // Gate 3: DB role check, server-side, every call.
    const admin = createAdminClient()
    const { data: roleRow, error: roleError } = await admin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    const role = (roleRow as { role?: string } | null)?.role
    if (roleError || role !== 'admin') {
      return jsonError({ ...NOT_FOUND, requestId })
    }

    // Gate 4: deliberate typed confirmation.
    const parsed = await readJsonWithLimit<{ confirm?: string }>({
      request,
      maxBytes: 1_024,
    })
    if (!parsed.ok || parsed.data.confirm !== CONFIRM_PHRASE) {
      return jsonError({
        error: `Confirmation required: POST { "confirm": "${CONFIRM_PHRASE}" }`,
        code: 'CONFIRMATION_REQUIRED',
        status: 400,
        requestId,
      })
    }

    // Cascade all data, preserving the auth user + users row.
    const cascade = await deleteUserAccount(user.id, {
      preserveAuthUser: true,
    })

    // Reset first-run state on the surviving users row. Subscription
    // and Stripe columns are deliberately untouched.
    const { error: rowResetError } = await admin
      .from('users')
      .update({
        onboarding_completed: false,
        free_generation_used_at: null,
        preferences: {},
      })
      .eq('id', user.id)

    // Clear onboarding keys in auth metadata (merged shallowly).
    let metadataReset = true
    try {
      const { error } = await admin.auth.admin.updateUserById(user.id, {
        user_metadata: ONBOARDING_METADATA_RESET,
      })
      metadataReset = !error
    } catch {
      metadataReset = false
    }

    return withRequestIdHeaders(
      NextResponse.json(
        {
          ok: true,
          reset: {
            tablesDeleted: cascade.tablesDeleted,
            partialFailures: cascade.partialFailures,
            sessionTokensProcessed: cascade.sessionTokensProcessed,
            usersRowReset: !rowResetError,
            metadataReset,
          },
          note: 'To walk the site as a genuine first-time visitor, sign out (or clear site data) — your session cookie and any local flags on this device are client-side and are not cleared by this endpoint.',
        },
        { status: 200, headers: { 'Cache-Control': 'no-store' } },
      ),
      requestId,
    )
  } catch (error) {
    logApiError({
      scope: 'admin-account-reset',
      requestId,
      error,
      method: request.method,
      path: '/api/admin/reset-my-account',
    })
    return jsonError({
      error: 'Reset failed.',
      status: 500,
      requestId,
      code: 'RESET_FAILED',
    })
  }
}
