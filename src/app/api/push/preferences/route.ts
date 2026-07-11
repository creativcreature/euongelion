// ---------------------------------------------------------------------------
// /api/push/preferences — the "one quiet word" delivery window (F-070).
//
// GET    → { ok, configured, subscribed, window, timezone }
//          Reads the reminder window stored on this session's push
//          subscription(s). `configured` reports whether the server has a
//          VAPID public key at all, so the client can render honest states.
// POST   → body { window, timezone? }
//          Persists the chosen window (and browser timezone) onto every
//          push_subscriptions row keyed to this session. When the session has
//          no subscription yet the response says so (`subscribed: false`) —
//          the client keeps the choice device-local and sends it along when
//          the reader actually subscribes (see /api/push/subscribe).
// DELETE → body { endpoint }
//          Removes THIS session's subscription row for the given endpoint.
//          Called after the browser-side pushManager unsubscribe so "turn
//          off" is immediate server-side rather than waiting for the sender
//          to prune the dead endpoint on a 404/410.
//
// Session keying matches /api/push/subscribe: a signed-in user's id when
// present, otherwise the anonymous audit session token.
//
// HONEST STATES: if NEXT_PUBLIC_VAPID_PUBLIC_KEY is unset, POST/DELETE return
// 501 (nothing server-side could ever deliver) and GET reports
// configured: false. If migration 017 has not been applied, the selects and
// updates on the new columns fail loudly — surfaced as a 500 with the
// database error logged, never swallowed.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUser } from '@/lib/auth'
import { getOrCreateAuditSessionToken } from '@/lib/soul-audit/session'
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
  isReminderWindow,
  isValidTimezone,
  type ReminderWindow,
} from '@/lib/push/reminder-window'

const MAX_BODY_BYTES = 4_096
const MAX_REQUESTS_PER_MINUTE = 30

function pushConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim())
}

async function resolveSessionToken(): Promise<string> {
  const user = await getUser()
  return user?.id ?? (await getOrCreateAuditSessionToken())
}

// push_subscriptions is not in the generated Database types yet (migrations
// 015 + 017 apply out-of-band), so access goes through an untyped view — the
// same pattern as /api/push/subscribe and migrateSessionData().
type UntypedRow = Record<string, unknown>
interface UntypedTable {
  select: (columns: string) => {
    eq: (
      column: string,
      value: string,
    ) => {
      order: (
        column: string,
        opts: { ascending: boolean },
      ) => {
        limit: (n: number) => Promise<{
          data: UntypedRow[] | null
          error: { message?: string } | null
        }>
      }
    }
  }
  update: (values: UntypedRow) => {
    eq: (
      column: string,
      value: string,
    ) => {
      select: (columns: string) => Promise<{
        data: UntypedRow[] | null
        error: { message?: string } | null
      }>
    }
  }
  delete: () => {
    eq: (
      column: string,
      value: string,
    ) => {
      eq: (
        column: string,
        value: string,
      ) => {
        select: (columns: string) => Promise<{
          data: UntypedRow[] | null
          error: { message?: string } | null
        }>
      }
    }
  }
}

function pushSubscriptionsTable(): UntypedTable {
  const supabase = createAdminClient()
  return (supabase as unknown as { from: (t: string) => UntypedTable }).from(
    'push_subscriptions',
  )
}

async function guardRate(request: NextRequest, requestId: string) {
  const limiter = await takeRateLimit({
    namespace: 'push-preferences',
    key: getClientKey(request),
    limit: MAX_REQUESTS_PER_MINUTE,
    windowMs: 60_000,
  })
  if (!limiter.ok) {
    return jsonError({
      error: 'Too many requests. Please retry shortly.',
      status: 429,
      requestId,
      rateLimit: limiter,
    })
  }
  return null
}

export async function GET(request: NextRequest) {
  const requestId = createRequestId()
  try {
    const limited = await guardRate(request, requestId)
    if (limited) return limited

    const sessionToken = await resolveSessionToken()
    const { data, error } = await pushSubscriptionsTable()
      .select('reminder_window, timezone, updated_at')
      .eq('session_token', sessionToken)
      .order('updated_at', { ascending: false })
      .limit(1)

    if (error) {
      logApiError({
        scope: 'push-preferences-get',
        requestId,
        error,
        method: request.method,
        path: request.nextUrl.pathname,
      })
      return jsonError({
        error:
          'Unable to read reminder preferences (is migration 017 applied?).',
        status: 500,
        requestId,
      })
    }

    const row = data?.[0] ?? null
    return withRequestIdHeaders(
      NextResponse.json(
        {
          ok: true,
          configured: pushConfigured(),
          subscribed: Boolean(row),
          window: isReminderWindow(row?.reminder_window)
            ? row?.reminder_window
            : null,
          timezone: typeof row?.timezone === 'string' ? row.timezone : null,
        },
        { status: 200, headers: { 'Cache-Control': 'no-store' } },
      ),
      requestId,
    )
  } catch (error) {
    logApiError({
      scope: 'push-preferences-get',
      requestId,
      error,
      method: request.method,
      path: request.nextUrl.pathname,
    })
    return jsonError({
      error: 'Unable to read reminder preferences.',
      status: 500,
      requestId,
    })
  }
}

interface PreferencesBody {
  window?: string
  timezone?: string
}

export async function POST(request: NextRequest) {
  const requestId = createRequestId()

  if (!pushConfigured()) {
    return jsonError({
      error: 'Push notifications are not configured (missing VAPID key).',
      status: 501,
      requestId,
    })
  }

  try {
    const limited = await guardRate(request, requestId)
    if (limited) return limited

    const parsed = await readJsonWithLimit<PreferencesBody>({
      request,
      maxBytes: MAX_BODY_BYTES,
    })
    if (!parsed.ok) {
      return jsonError({
        error: parsed.error,
        status: parsed.status,
        requestId,
      })
    }

    const window = parsed.data.window
    if (!isReminderWindow(window)) {
      return jsonError({
        error: 'window must be one of early_morning, morning, midday, evening.',
        status: 400,
        requestId,
      })
    }

    const timezone =
      typeof parsed.data.timezone === 'string'
        ? parsed.data.timezone.trim()
        : ''
    if (timezone && !isValidTimezone(timezone)) {
      return jsonError({
        error: 'timezone must be a valid IANA timezone name.',
        status: 400,
        requestId,
      })
    }

    const sessionToken = await resolveSessionToken()
    const updateValues: UntypedRow = {
      reminder_window: window satisfies ReminderWindow,
      updated_at: new Date().toISOString(),
    }
    if (timezone) updateValues.timezone = timezone

    const { data, error } = await pushSubscriptionsTable()
      .update(updateValues)
      .eq('session_token', sessionToken)
      .select('endpoint')

    if (error) {
      logApiError({
        scope: 'push-preferences-post',
        requestId,
        error,
        method: request.method,
        path: request.nextUrl.pathname,
      })
      return jsonError({
        error:
          'Unable to save reminder preferences (is migration 017 applied?).',
        status: 500,
        requestId,
      })
    }

    return withRequestIdHeaders(
      NextResponse.json(
        {
          ok: true,
          subscribed: (data?.length ?? 0) > 0,
          window,
        },
        { status: 200, headers: { 'Cache-Control': 'no-store' } },
      ),
      requestId,
    )
  } catch (error) {
    logApiError({
      scope: 'push-preferences-post',
      requestId,
      error,
      method: request.method,
      path: request.nextUrl.pathname,
    })
    return jsonError({
      error: 'Unable to save reminder preferences.',
      status: 500,
      requestId,
    })
  }
}

interface DeleteBody {
  endpoint?: string
}

export async function DELETE(request: NextRequest) {
  const requestId = createRequestId()

  if (!pushConfigured()) {
    return jsonError({
      error: 'Push notifications are not configured (missing VAPID key).',
      status: 501,
      requestId,
    })
  }

  try {
    const limited = await guardRate(request, requestId)
    if (limited) return limited

    const parsed = await readJsonWithLimit<DeleteBody>({
      request,
      maxBytes: MAX_BODY_BYTES,
    })
    if (!parsed.ok) {
      return jsonError({
        error: parsed.error,
        status: parsed.status,
        requestId,
      })
    }

    const endpoint = String(parsed.data.endpoint || '').trim()
    if (!endpoint || !/^https:\/\//i.test(endpoint)) {
      return jsonError({
        error: 'A valid subscription endpoint is required.',
        status: 400,
        requestId,
      })
    }

    const sessionToken = await resolveSessionToken()
    const { data, error } = await pushSubscriptionsTable()
      .delete()
      .eq('session_token', sessionToken)
      .eq('endpoint', endpoint)
      .select('id')

    if (error) {
      logApiError({
        scope: 'push-preferences-delete',
        requestId,
        error,
        method: request.method,
        path: request.nextUrl.pathname,
      })
      return jsonError({
        error: 'Unable to remove the push subscription.',
        status: 500,
        requestId,
      })
    }

    return withRequestIdHeaders(
      NextResponse.json(
        { ok: true, removed: data?.length ?? 0 },
        { status: 200, headers: { 'Cache-Control': 'no-store' } },
      ),
      requestId,
    )
  } catch (error) {
    logApiError({
      scope: 'push-preferences-delete',
      requestId,
      error,
      method: request.method,
      path: request.nextUrl.pathname,
    })
    return jsonError({
      error: 'Unable to remove the push subscription.',
      status: 500,
      requestId,
    })
  }
}
