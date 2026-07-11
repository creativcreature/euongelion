// Supabase Edge Function: send-daily-push (Phase 2.2 sender + F-070 windows)
//
// Delivers ONE calm daily notification ("today's edition is ready") to every
// browser that opted in via /api/push/subscribe (rows in push_subscriptions),
// inside the reader's chosen local-time window:
//
//   early_morning 5-7 · morning 7-9 · midday 12-14 · evening 19-21
//
// Designed to be fired HOURLY by Supabase pg_cron (see the F-070 rollout
// steps in the deploy runbook). The function is idempotent per reader-local
// calendar day: after a successful send it stamps last_sent_date with the
// reader's local date and skips any row already stamped for today — so an
// hourly cron never double-sends, and a window spanning two hours gets one
// send in whichever invocation lands first.
//
// Requires migration 017 (reminder_window / timezone / last_sent_date). If
// the columns are missing the select fails and the run returns 500 — loudly,
// by design. NULL timezone is evaluated as UTC. The window logic mirrors
// src/lib/push/reminder-window.ts (this function is deliberately
// self-contained: npm: deps only, no app-source imports); the app-side unit
// tests pin the boundary values so drift is caught.
//
// Contract:
//   POST, optional JSON body:
//     { dryRun?: boolean, onlyEndpoint?: string, now?: string }
//   - dryRun: compute and report decisions, send nothing, stamp nothing.
//   - onlyEndpoint: restrict the run to ONE subscription endpoint — the
//     REQUIRED guard for any manual test invocation against a database that
//     holds real subscriber rows. Never mass-send by hand.
//   - now: ISO timestamp override for dry-run window inspection only
//     (ignored unless dryRun is true).
//   → { ok, total, due, sent, skippedOutsideWindow, skippedAlreadySent,
//       removed, failed, dryRun }
//   Auth: double-gated — Supabase verify_jwt (caller sends a service-role
//   bearer) AND the shared X-Internal-Secret header.
//
// Dead endpoints (404/410 from the push service) are pruned from the table.
//
// Secrets (Supabase project, shared across functions):
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, INTERNAL_ROUTE_SECRET,
//   NEXT_PUBLIC_APP_URL. SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected.

import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'

declare const Deno: {
  env: { get(name: string): string | undefined }
  serve(handler: (req: Request) => Response | Promise<Response>): void
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
const VAPID_SUBJECT =
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:chrisparker21@gmail.com'
const APP_URL = (
  Deno.env.get('NEXT_PUBLIC_APP_URL') || 'https://euangelion.app'
).replace(/\/$/, '')
const INTERNAL_SECRET = Deno.env.get('INTERNAL_ROUTE_SECRET') ?? ''

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)
}

// ---------------------------------------------------------------------------
// Window logic — mirror of src/lib/push/reminder-window.ts. Keep in sync.
// ---------------------------------------------------------------------------

type ReminderWindow = 'early_morning' | 'morning' | 'midday' | 'evening'

const REMINDER_WINDOWS: Record<
  ReminderWindow,
  { startHour: number; endHour: number }
> = {
  early_morning: { startHour: 5, endHour: 7 },
  morning: { startHour: 7, endHour: 9 },
  midday: { startHour: 12, endHour: 14 },
  evening: { startHour: 19, endHour: 21 },
}

const DEFAULT_REMINDER_WINDOW: ReminderWindow = 'morning'

function isReminderWindow(value: unknown): value is ReminderWindow {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(REMINDER_WINDOWS, value)
  )
}

function localClockFor(
  timezone: string | null | undefined,
  now: Date,
): { hour: number; isoDate: string } {
  let tz = 'UTC'
  if (timezone) {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: timezone })
      tz = timezone
    } catch {
      tz = 'UTC' // unresolvable zone — evaluate as UTC (documented behavior)
    }
  }
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
  }).formatToParts(now)
  const read = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? ''
  return {
    hour: Number(read('hour')),
    isoDate: `${read('year')}-${read('month')}-${read('day')}`,
  }
}

function shouldSendReminderNow(params: {
  window: string | null | undefined
  timezone: string | null | undefined
  lastSentDate: string | null | undefined
  now: Date
}): { send: boolean; localDate: string; reason?: string } {
  const window = isReminderWindow(params.window)
    ? params.window
    : DEFAULT_REMINDER_WINDOW
  const clock = localClockFor(params.timezone, params.now)
  const meta = REMINDER_WINDOWS[window]
  if (clock.hour < meta.startHour || clock.hour >= meta.endHour) {
    return { send: false, localDate: clock.isoDate, reason: 'outside_window' }
  }
  if (params.lastSentDate === clock.isoDate) {
    return { send: false, localDate: clock.isoDate, reason: 'already_sent' }
  }
  return { send: true, localDate: clock.isoDate }
}

// ---------------------------------------------------------------------------

interface RunOptions {
  dryRun?: boolean
  onlyEndpoint?: string
  now?: string
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }
  if (
    !INTERNAL_SECRET ||
    req.headers.get('X-Internal-Secret') !== INTERNAL_SECRET
  ) {
    return json(403, { error: 'Forbidden' })
  }
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return json(501, { error: 'Push is not configured (missing VAPID keys).' })
  }

  let options: RunOptions = {}
  try {
    const text = await req.text()
    if (text) options = JSON.parse(text) as RunOptions
  } catch {
    return json(400, { error: 'Body must be JSON when present.' })
  }
  const dryRun = options.dryRun === true
  const onlyEndpoint =
    typeof options.onlyEndpoint === 'string' ? options.onlyEndpoint.trim() : ''
  // A time override is only honored for dry runs — real sends always use the
  // real clock so last_sent_date stamps can never be forged into the future.
  const now =
    dryRun && options.now && !Number.isNaN(Date.parse(options.now))
      ? new Date(options.now)
      : new Date()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  let query = supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth, reminder_window, timezone, last_sent_date')
  if (onlyEndpoint) {
    query = query.eq('endpoint', onlyEndpoint)
  }
  const { data: subs, error } = await query

  if (error) {
    // Loud failure — most likely migration 017 has not been applied.
    return json(500, { error: error.message })
  }

  // One calm nudge that simply announces the edition — links to /today, which
  // resolves the day's reading itself (no per-user content in the payload).
  const payload = JSON.stringify({
    title: 'Today’s Edition',
    body: 'Your reading is ready.',
    url: `${APP_URL}/today`,
  })

  let due = 0
  let sent = 0
  let skippedOutsideWindow = 0
  let skippedAlreadySent = 0
  let removed = 0
  let failed = 0

  for (const s of subs ?? []) {
    const decision = shouldSendReminderNow({
      window: s.reminder_window,
      timezone: s.timezone,
      lastSentDate: s.last_sent_date,
      now,
    })

    if (!decision.send) {
      if (decision.reason === 'already_sent') skippedAlreadySent++
      else skippedOutsideWindow++
      continue
    }

    due++
    if (dryRun) continue

    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      )
      sent++
      // Stamp the reader-local date so no other invocation today re-sends.
      const { error: stampError } = await supabase
        .from('push_subscriptions')
        .update({
          last_sent_date: decision.localDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', s.id)
      if (stampError) {
        // The push went out but the stamp failed — surface it; the next run
        // within the window would otherwise send a duplicate.
        console.error(
          '[send-daily-push] last_sent_date stamp failed:',
          s.id,
          stampError.message,
        )
        failed++
      }
    } catch (err) {
      const code = (err as { statusCode?: number })?.statusCode
      if (code === 404 || code === 410) {
        // Endpoint is dead/expired — prune it so the table stays clean.
        await supabase.from('push_subscriptions').delete().eq('id', s.id)
        removed++
      } else {
        failed++
        console.error('[send-daily-push] send failed:', code, String(err))
      }
    }
  }

  return json(200, {
    ok: true,
    total: subs?.length ?? 0,
    due,
    sent,
    skippedOutsideWindow,
    skippedAlreadySent,
    removed,
    failed,
    dryRun,
  })
})
