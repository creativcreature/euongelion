/**
 * Soul Audit structured telemetry.
 *
 * A tiny, dependency-free structured-logging helper for the Soul Audit
 * generation path. It emits single-line JSON to stdout (`console.*`), which
 * both Cloudflare Workers and Supabase Edge/Functions capture and ship to
 * their log drains. There is NO external service and NO network call here —
 * telemetry must never add latency or a failure surface to the product path.
 *
 * Why JSON-on-stdout: it is queryable in Workers tail / Supabase logs without
 * standing up an analytics dependency, and it works identically in the Node
 * (Next route), Deno (Edge), and Workers runtimes that share this module.
 *
 * Event taxonomy (the `event` field):
 *   - generation_start    — a plan-day generation call is about to run
 *   - generation_success  — the day was woven + verified + saved
 *   - generation_fail     — the day failed (weave error / verify gate / save)
 *   - rate_limited        — a request was blocked by the per-day rate limiter
 *   - budget_exceeded     — generation was paused by the daily spend ceiling
 *   - ledger_write_failed — the cost-ledger insert failed (observability only;
 *                           never blocks the user's devotional)
 *
 * All events share a common envelope so log queries can filter on
 * `scope:"soul-audit"` and group by `event`.
 */

export type SoulAuditTelemetryEvent =
  | 'generation_start'
  | 'generation_success'
  | 'generation_fail'
  | 'rate_limited'
  | 'budget_exceeded'
  | 'ledger_write_failed'

export interface SoulAuditTelemetryFields {
  /** Generation mode for plan days: the daily reading vs the long-form dive. */
  mode?: 'reading' | 'deepdive'
  /** Resolved model id (e.g. claude-sonnet-4-6). */
  model?: string
  /** Plan day being generated (1..7). */
  dayNumber?: number
  /** Wall-clock duration of the measured operation, in milliseconds. */
  durationMs?: number
  /** Real input tokens billed by the provider for this call. */
  inputTokens?: number
  /** Real output tokens billed by the provider for this call. */
  outputTokens?: number
  /** Estimated USD cost of this call, from real token counts. */
  estimatedCostUsd?: number
  /** Session token (audit session cookie) driving the request. */
  sessionToken?: string
  /** Hashed IP client key fallback (see api-security.getClientKey). */
  clientKey?: string
  /** Soul Audit job id (soul_audit_jobs.id) when available. */
  jobId?: string
  /** Plan token (devotional_plan_instances.plan_token) when available. */
  planToken?: string
  /** Limit kind that tripped, for rate_limited / budget_exceeded events. */
  limit?: string
  /** Observed value at the moment a cap tripped (count or USD). */
  observed?: number
  /** Configured ceiling the observed value was compared against. */
  ceiling?: number
  /** Structured failure reason / error message (never raw secrets). */
  reason?: string
}

/**
 * Emit one structured telemetry event. Synchronous, never throws: a logging
 * failure must not be able to break a generation. The single JSON line is
 * prefixed with a stable `[soul-audit:telemetry]` tag so it is greppable in
 * mixed log streams while still parsing as JSON after the tag is stripped.
 */
export function emitSoulAuditTelemetry(
  event: SoulAuditTelemetryEvent,
  fields: SoulAuditTelemetryFields = {},
): void {
  try {
    // Pull the session token out so the rest of `fields` can be spread freely
    // without ever re-introducing the full cookie value into the log line.
    const { sessionToken, ...rest } = fields
    const payload = {
      scope: 'soul-audit',
      event,
      ts: new Date().toISOString(),
      ...rest,
      // Truncate the session token in logs — enough to correlate, not the full
      // secret cookie value.
      ...(sessionToken ? { sessionToken: sessionToken.slice(0, 12) } : {}),
    }
    const line = `[soul-audit:telemetry] ${JSON.stringify(payload)}`
    // Failures and trips go to stderr so they surface in error log filters;
    // routine lifecycle events go to stdout.
    if (
      event === 'generation_fail' ||
      event === 'rate_limited' ||
      event === 'budget_exceeded' ||
      event === 'ledger_write_failed'
    ) {
      console.error(line)
    } else {
      console.info(line)
    }
  } catch {
    // Telemetry is best-effort. Never let a serialization error escape into
    // the generation path.
  }
}
