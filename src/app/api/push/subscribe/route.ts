// ---------------------------------------------------------------------------
// POST /api/push/subscribe — store a Web Push subscription (Phase 2.2).
//
// SCOPE OF THIS FILE: persistence only. It saves the browser's PushSubscription
// (endpoint + p256dh/auth keys), session-keyed, so a future sender can deliver
// ONE calm daily nudge. It does NOT send anything.
//
// CONTRACT FOR THE FUTURE DAILY SEND (OUT OF SCOPE HERE — do not fake it):
//   A separate scheduled job (cron) is required to actually deliver pushes.
//   That job must:
//     1. Read every row in `public.push_subscriptions`.
//     2. For each, call web-push (the `web-push` npm package, or a Workers-
//        compatible VAPID/WebPush signer) with:
//          - VAPID_PUBLIC_KEY  === NEXT_PUBLIC_VAPID_PUBLIC_KEY (same keypair)
//          - VAPID_PRIVATE_KEY (server-only secret, NEVER shipped to client)
//          - VAPID_SUBJECT     (a `mailto:` or https contact URL, e.g.
//                               mailto:hello@euangelion.app)
//        Payload: JSON { title, body, url } — the /sw.js push handler reads
//        these (defaults to a calm /today nudge when absent).
//     3. On a 404/410 response from the push service, DELETE that subscription
//        row (the endpoint is dead/expired).
//     4. Run on a schedule (e.g. a Cloudflare Worker Cron Trigger at the
//        founder-chosen morning hour, per-timezone if/when we store tz).
//   web-push is NOT installed and no sender exists yet — that is deliberate.
//   This route is only the opt-in capture half of the feature.
//
// ENV (founder sets these; never hardcode real keys):
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY  — client + server (applicationServerKey)
//   VAPID_PRIVATE_KEY             — server-only, used by the future sender
//   VAPID_SUBJECT                 — server-only, used by the future sender
//
// HONEST DISABLED STATE: if the public VAPID key is not configured on the
// server, we respond 501 'push not configured' rather than storing junk that
// can never receive a push. The client PushOptIn component likewise refuses to
// offer opt-in when NEXT_PUBLIC_VAPID_PUBLIC_KEY is unset.
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
import { isReminderWindow, isValidTimezone } from '@/lib/push/reminder-window'

interface SubscribeBody {
  subscription?: {
    endpoint?: string
    keys?: {
      p256dh?: string
      auth?: string
    }
    expirationTime?: number | null
  }
  // F-070 — optional delivery-window fields. When present they are validated
  // and stored on the row (migration 017 columns); when absent the column
  // defaults apply (window 'morning', timezone NULL → evaluated as UTC).
  window?: string
  timezone?: string
}

const MAX_BODY_BYTES = 8_192
const MAX_SUBSCRIBE_REQUESTS_PER_MINUTE = 20

export async function POST(request: NextRequest) {
  const requestId = createRequestId()
  const clientKey = getClientKey(request)

  // Honest disabled state: no VAPID public key configured server-side means a
  // stored subscription could never be delivered to. Refuse rather than store
  // junk. Mirrors the client refusing to offer opt-in when the key is unset.
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()) {
    return jsonError({
      error: 'Push notifications are not configured (missing VAPID key).',
      status: 501,
      requestId,
    })
  }

  try {
    const limiter = await takeRateLimit({
      namespace: 'push-subscribe',
      key: clientKey,
      limit: MAX_SUBSCRIBE_REQUESTS_PER_MINUTE,
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

    const parsed = await readJsonWithLimit<SubscribeBody>({
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

    const subscription = parsed.data.subscription
    const endpoint = String(subscription?.endpoint || '').trim()
    const p256dh = String(subscription?.keys?.p256dh || '').trim()
    const auth = String(subscription?.keys?.auth || '').trim()

    if (!endpoint || !/^https:\/\//i.test(endpoint) || !p256dh || !auth) {
      return jsonError({
        error: 'A valid PushSubscription (endpoint + keys) is required.',
        status: 400,
        requestId,
      })
    }

    // Optional F-070 window fields — validated strictly when present.
    const rawWindow = parsed.data.window
    if (rawWindow !== undefined && !isReminderWindow(rawWindow)) {
      return jsonError({
        error: 'window must be one of early_morning, morning, midday, evening.',
        status: 400,
        requestId,
      })
    }
    const rawTimezone =
      typeof parsed.data.timezone === 'string'
        ? parsed.data.timezone.trim()
        : ''
    if (rawTimezone && !isValidTimezone(rawTimezone)) {
      return jsonError({
        error: 'timezone must be a valid IANA timezone name.',
        status: 400,
        requestId,
      })
    }

    // Session-keyed, matching the rest of the anonymous-friendly reading flow.
    // A signed-in user's id takes precedence when present so a subscription
    // follows the user; otherwise it's keyed to the audit session token.
    const user = await getUser()
    const sessionToken = user?.id ?? (await getOrCreateAuditSessionToken())

    const supabase = createAdminClient()
    // The push_subscriptions table is not in the generated Database types yet
    // (migration 014 ships separately), so write through an untyped view —
    // same pattern as migrateSessionData() in lib/session.ts.
    const { error } = await (
      supabase as unknown as {
        from: (t: string) => {
          upsert: (
            v: object,
            opts: { onConflict: string },
          ) => Promise<{ error: unknown }>
        }
      }
    )
      .from('push_subscriptions')
      .upsert(
        {
          session_token: sessionToken,
          endpoint,
          p256dh,
          auth,
          expiration_time: subscription?.expirationTime ?? null,
          user_agent: request.headers.get('user-agent') ?? null,
          updated_at: new Date().toISOString(),
          // Window fields are only written when the caller sent them, so a
          // legacy payload (no window) still upserts cleanly on a database
          // where migration 017 has not landed yet — and a payload WITH a
          // window fails loudly there rather than silently dropping it.
          ...(rawWindow !== undefined ? { reminder_window: rawWindow } : {}),
          ...(rawTimezone ? { timezone: rawTimezone } : {}),
        },
        { onConflict: 'endpoint' },
      )

    if (error) {
      logApiError({
        scope: 'push-subscribe',
        requestId,
        error,
        method: request.method,
        path: request.nextUrl.pathname,
        clientKey,
      })
      return jsonError({
        error: 'Unable to save push subscription.',
        status: 500,
        requestId,
      })
    }

    return withRequestIdHeaders(
      NextResponse.json({ ok: true }, { status: 200 }),
      requestId,
    )
  } catch (error) {
    logApiError({
      scope: 'push-subscribe',
      requestId,
      error,
      method: request.method,
      path: request.nextUrl.pathname,
      clientKey,
    })
    return jsonError({
      error: 'Unable to save push subscription.',
      status: 500,
      requestId,
    })
  }
}
