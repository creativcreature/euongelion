/**
 * Soul Audit cost ledger.
 *
 * Records every real LLM generation call on the plan-generation path so spend
 * is observable and the daily budget cap (budget-cap.ts) has a running total
 * to compare against. Two writes per recorded generation:
 *
 *   1. an append to `soul_audit_cost_ledger` (one row per call — the audit
 *      trail: model, real tokens, USD, mode, day, session), and
 *   2. an atomic bump of the platform-wide `global_spend` daily counter via
 *      the `soul_audit_bump_counter` RPC (the running total the budget cap
 *      reads before the NEXT call).
 *
 * OBSERVABILITY MUST NEVER BREAK THE PRODUCT PATH. The ledger write is
 * best-effort-but-LOUD: if Supabase is unreachable or the insert fails we emit
 * a structured `ledger_write_failed` telemetry event and return — we do NOT
 * throw, because a logging/observability failure must never deny a user the
 * devotional they already paid for in latency. The BLOCKING cost controls are
 * the rate limiter and the budget cap; this ledger is the record, not a gate.
 *
 * Pricing note: the brain router's generic `estimateCostUsd` (cost.ts) uses a
 * cheap-provider profile that UNDER-bills Anthropic by ~60x. Sonnet 4.x is
 * $3 / $15 per MTok. We compute USD here from REAL provider token counts using
 * Anthropic pricing (configurable via env) so the budget cap is honest.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { emitSoulAuditTelemetry } from './telemetry'

export interface GenerationUsage {
  model: string
  inputTokens: number
  outputTokens: number
  dayMode: 'reading' | 'deepdive'
  sessionToken?: string
  jobId?: string
  planToken?: string
  runId?: string
  dayNumber?: number
}

function toFloat(value: string | undefined, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

/**
 * Anthropic per-million-token pricing for the budget math. Defaults match
 * Claude Sonnet 4.x list pricing ($3 input / $15 output per MTok). Override via
 * env when the routed model changes (e.g. Haiku for the option pass).
 */
export function anthropicInputPerMillionUsd(): number {
  return toFloat(process.env.SOUL_AUDIT_INPUT_USD_PER_MTOK, 3)
}

export function anthropicOutputPerMillionUsd(): number {
  return toFloat(process.env.SOUL_AUDIT_OUTPUT_USD_PER_MTOK, 15)
}

/** USD cost from REAL token counts using the configured Anthropic pricing. */
export function estimateGenerationCostUsd(params: {
  inputTokens: number
  outputTokens: number
}): number {
  const input =
    (Math.max(0, params.inputTokens) / 1_000_000) *
    anthropicInputPerMillionUsd()
  const output =
    (Math.max(0, params.outputTokens) / 1_000_000) *
    anthropicOutputPerMillionUsd()
  return Number((input + output).toFixed(6))
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

/**
 * Record one generation's usage. Returns the estimated USD cost so the caller
 * can log it, but the persistence itself is fire-and-forget-safe: every failure
 * path is caught and surfaced via telemetry, never thrown.
 *
 * This function is intentionally `async` but callers may choose to `await` it
 * (so the day's spend lands before the next day chains) WITHOUT risking the
 * product path — it cannot reject.
 */
export async function recordGenerationUsage(
  usage: GenerationUsage,
): Promise<number> {
  const estimatedCostUsd = estimateGenerationCostUsd({
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
  })

  const supabase = maybeAdminClient()
  if (!supabase) {
    // No Supabase configured (e.g. local dev without secrets). This is an
    // observability gap, not a product failure — surface it and move on.
    emitSoulAuditTelemetry('ledger_write_failed', {
      model: usage.model,
      dayNumber: usage.dayNumber,
      mode: usage.dayMode,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      estimatedCostUsd,
      reason: 'supabase_unconfigured',
    })
    return estimatedCostUsd
  }

  const day = utcDay()

  // 1) Append the per-call ledger row (the audit trail).
  try {
    const { error } = await (supabase as any)
      .from('soul_audit_cost_ledger')
      .insert({
        utc_day: day,
        session_token: usage.sessionToken ?? null,
        job_id: usage.jobId ?? null,
        plan_token: usage.planToken ?? null,
        run_id: usage.runId ?? null,
        day_number: usage.dayNumber ?? null,
        day_mode: usage.dayMode,
        model: usage.model,
        input_tokens: Math.max(0, Math.round(usage.inputTokens)),
        output_tokens: Math.max(0, Math.round(usage.outputTokens)),
        estimated_cost_usd: estimatedCostUsd,
      })
    if (error) {
      emitSoulAuditTelemetry('ledger_write_failed', {
        model: usage.model,
        dayNumber: usage.dayNumber,
        mode: usage.dayMode,
        estimatedCostUsd,
        reason: `ledger_insert_error: ${error.message}`,
      })
    }
  } catch (err) {
    emitSoulAuditTelemetry('ledger_write_failed', {
      model: usage.model,
      dayNumber: usage.dayNumber,
      mode: usage.dayMode,
      estimatedCostUsd,
      reason: `ledger_insert_threw: ${err instanceof Error ? err.message : String(err)}`,
    })
  }

  // 2) Accumulate into the platform-wide daily spend counter the budget cap
  //    reads. Also best-effort — a missed accumulation under-counts spend but
  //    must not break the user's day.
  try {
    const { error } = await (supabase as any).rpc('soul_audit_bump_counter', {
      p_utc_day: day,
      p_scope: 'global_spend',
      p_subject: 'global',
      p_spend_delta: estimatedCostUsd,
      p_input: Math.max(0, Math.round(usage.inputTokens)),
      p_output: Math.max(0, Math.round(usage.outputTokens)),
    })
    if (error) {
      emitSoulAuditTelemetry('ledger_write_failed', {
        reason: `spend_counter_error: ${error.message}`,
        estimatedCostUsd,
      })
    }
  } catch (err) {
    emitSoulAuditTelemetry('ledger_write_failed', {
      reason: `spend_counter_threw: ${err instanceof Error ? err.message : String(err)}`,
      estimatedCostUsd,
    })
  }

  return estimatedCostUsd
}
