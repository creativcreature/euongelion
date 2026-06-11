/**
 * Soul Audit per-day rate limiting (session-keyed, IP fallback).
 *
 * This is a SECOND, coarser tier on top of the per-minute burst limiter in
 * api-security.ts (`takeRateLimit`). That one stops rapid-fire abuse inside a
 * 60s window; this one caps how many Soul Audit SUBMISSIONS and how many PLAN
 * generations a single visitor can trigger PER DAY — the load-bearing control
 * that keeps daily Anthropic spend bounded.
 *
 * Persistence is a Supabase counters table (migration 014) incremented via the
 * `soul_audit_bump_counter` RPC, so the count is SHARED across the Cloudflare
 * Worker and the Supabase Edge function. A per-minute in-isolate memory map
 * would not survive across runtimes or isolate restarts, so it cannot enforce
 * a daily cap on its own.
 *
 * Subject keying: we key on the audit SESSION token first (the durable cookie
 * identity), and ALSO enforce the same cap against the hashed-IP client key as
 * a fallback so a visitor who clears the cookie cannot reset their daily quota.
 * Whichever subject is over its cap blocks the request.
 *
 * Failure posture (NO SILENT FALLBACK, but observability must not break the
 * product): the COUNT path fails CLOSED only when explicitly required is not
 * appropriate here — a Supabase outage must not lock every visitor out of a
 * free devotional. So if the counter store is unreachable we surface a clear
 * structured telemetry event and FAIL OPEN for the rate check, while the
 * BUDGET cap (budget-cap.ts) remains the hard ceiling that actually caps spend.
 * This split is deliberate: rate limits shape fairness; the budget is the wall.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { emitSoulAuditTelemetry } from './telemetry'

export type RateLimitScope = 'submit' | 'plan'

function toInt(value: string | undefined, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

/** Per-day caps. Configurable via env with conservative defaults. */
export function maxSubmitsPerDay(): number {
  return toInt(process.env.SOUL_AUDIT_MAX_SUBMITS_PER_DAY, 20)
}

export function maxPlansPerDay(): number {
  return toInt(process.env.SOUL_AUDIT_MAX_PLANS_PER_DAY, 5)
}

function utcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}

function maybeAdminClient() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return null
  }
  try {
    return createAdminClient()
  } catch {
    return null
  }
}

export interface RateLimitDecision {
  ok: boolean
  /** The cap that applied (for honest messaging + telemetry). */
  limit: number
  /** Highest observed post-increment count across the keyed subjects. */
  count: number
  /** Seconds until the daily window resets (UTC midnight). */
  retryAfterSeconds: number
  /** True when the counter store was unreachable and we failed open. */
  degraded: boolean
}

function secondsUntilUtcMidnight(now = new Date()): number {
  const next = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
      0,
    ),
  )
  return Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 1000))
}

async function bumpAndRead(params: {
  scope: RateLimitScope
  subject: string
  day: string
}): Promise<number | null> {
  const supabase = maybeAdminClient()
  if (!supabase) return null
  try {
    const { data, error } = await (supabase as any).rpc(
      'soul_audit_bump_counter',
      {
        p_utc_day: params.day,
        p_scope: params.scope,
        p_subject: params.subject,
        p_count_delta: 1,
      },
    )
    if (error) {
      emitSoulAuditTelemetry('rate_limited', {
        limit: params.scope,
        reason: `counter_rpc_error: ${error.message}`,
      })
      return null
    }
    const row = Array.isArray(data) ? data[0] : data
    const count = row && typeof row.count === 'number' ? row.count : null
    return count
  } catch (err) {
    emitSoulAuditTelemetry('rate_limited', {
      limit: params.scope,
      reason: `counter_rpc_threw: ${err instanceof Error ? err.message : String(err)}`,
    })
    return null
  }
}

/**
 * Atomically record one event for this scope against BOTH the session token
 * and the IP client key, then decide whether the request exceeds the daily
 * cap. Both subjects are incremented every call so neither can be bypassed by
 * dropping the other identity.
 *
 * Returns `{ ok: false }` with a `retryAfterSeconds` (to UTC midnight) when
 * either subject is over the configured limit.
 */
export async function takeSoulAuditDailyLimit(params: {
  scope: RateLimitScope
  sessionToken: string
  clientKey: string
  now?: Date
}): Promise<RateLimitDecision> {
  const now = params.now ?? new Date()
  const day = utcDay(now)
  const limit =
    params.scope === 'submit' ? maxSubmitsPerDay() : maxPlansPerDay()

  const [sessionCount, ipCount] = await Promise.all([
    bumpAndRead({
      scope: params.scope,
      subject: `session:${params.sessionToken}`,
      day,
    }),
    bumpAndRead({ scope: params.scope, subject: params.clientKey, day }),
  ])

  // Counter store unreachable for BOTH writes → fail open for the rate check
  // (the budget cap remains the hard spend ceiling). Surface it loudly.
  if (sessionCount === null && ipCount === null) {
    return {
      ok: true,
      limit,
      count: 0,
      retryAfterSeconds: 0,
      degraded: true,
    }
  }

  const observed = Math.max(sessionCount ?? 0, ipCount ?? 0)
  const ok = observed <= limit

  if (!ok) {
    emitSoulAuditTelemetry('rate_limited', {
      limit: params.scope,
      observed,
      ceiling: limit,
      sessionToken: params.sessionToken,
      clientKey: params.clientKey,
    })
  }

  return {
    ok,
    limit,
    count: observed,
    retryAfterSeconds: secondsUntilUtcMidnight(now),
    degraded: false,
  }
}
