// Supabase Edge Function: send-daily-push (Phase 2.2 — web push sender, E2)
//
// Delivers ONE calm daily notification ("today's edition is ready") to every
// browser that opted in via /api/push/subscribe (rows in push_subscriptions).
// Intended to be fired once per day by Supabase pg_cron (see the pg_cron arm in
// docs / the deploy runbook). Self-contained: only npm: deps, no app-source
// imports, so no esbuild bundling step is needed (unlike generate-plan-day).
//
// Contract:
//   POST (no body needed) → { ok, total, sent, removed, failed }
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

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }
  if (!INTERNAL_SECRET || req.headers.get('X-Internal-Secret') !== INTERNAL_SECRET) {
    return json(403, { error: 'Forbidden' })
  }
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return json(501, { error: 'Push is not configured (missing VAPID keys).' })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')

  if (error) return json(500, { error: error.message })

  // One calm nudge that simply announces the edition — links to /today, which
  // resolves the day's reading itself (no per-user content in the payload).
  const payload = JSON.stringify({
    title: 'Today’s Edition',
    body: 'Your reading is ready.',
    url: `${APP_URL}/today`,
  })

  let sent = 0
  let removed = 0
  let failed = 0

  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      )
      sent++
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

  return json(200, { ok: true, total: subs?.length ?? 0, sent, removed, failed })
})
