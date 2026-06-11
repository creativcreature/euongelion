/**
 * Soul Audit global daily budget cap.
 *
 * The hard wall on platform-wide LLM spend. Before a plan-day generation call
 * runs, the caller checks the day's accumulated spend (recorded by
 * cost-ledger.ts into the `global_spend` counter) against a configured daily
 * ceiling. When the ceiling is reached, generation is PAUSED for the rest of
 * the UTC day with a clear, honest error — NOT canned devotional content,
 * NEVER a silent degrade. A paused product must look paused, not broken in a
 * way the founder can't see and not faked with fabricated content.
 *
 * Ceiling configuration (either or both; the lower effective limit wins):
 *   - SOUL_AUDIT_DAILY_TOKEN_BUDGET — max total (input+output) tokens per day
 *   - SOUL_AUDIT_DAILY_COST_BUDGET  — max estimated USD spend per day
 *
 * The USD budget is the primary control (it is what the founder actually pays);
 * the token budget is an optional secondary guard. A sane default USD ceiling
 * is applied when neither is set so spend can never be unbounded by accident.
 *
 * This check IS blocking. Unlike the rate limiter (which fails OPEN on a
 * counter-store outage so a Supabase blip doesn't lock everyone out of a free
 * devotional), the budget cap fails OPEN ONLY when the store is unreachable AND
 * logs it loudly — because a hard-closed budget on a transient read error would
 * deny every user with no way to recover, and the per-day rate limits still
 * bound worst-case spend during such a window. The intent: under normal
 * operation the budget is the wall; under infrastructure failure it degrades to
 * the rate limits, never to fabricated content.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { emitSoulAuditTelemetry } from './telemetry'

function toFloat(value: string | undefined): number | null {
  if (value === undefined || value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : null
}

/** Default daily USD ceiling when no budget env is configured. */
const DEFAULT_DAILY_COST_BUDGET_USD = 25

export function dailyCostBudgetUsd(): number {
  return (
    toFloat(process.env.SOUL_AUDIT_DAILY_COST_BUDGET) ??
    DEFAULT_DAILY_COST_BUDGET_USD
  )
}

/** Optional daily token ceiling (input+output). null = not enforced. */
export function dailyTokenBudget(): number | null {
  return toFloat(process.env.SOUL_AUDIT_DAILY_TOKEN_BUDGET)
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

export interface DailySpend {
  spendUsd: number
  tokens: number
  /** True when the spend store was unreachable. */
  degraded: boolean
}

/** Read today's accumulated global spend (USD + tokens) from the counter. */
export async function getDailySpend(now = new Date()): Promise<DailySpend> {
  const supabase = maybeAdminClient()
  if (!supabase) {
    return { spendUsd: 0, tokens: 0, degraded: true }
  }
  try {
    const { data, error } = await (supabase as any)
      .from('soul_audit_daily_counters')
      .select('spend_usd, input_tokens, output_tokens')
      .eq('utc_day', utcDay(now))
      .eq('scope', 'global_spend')
      .eq('subject', 'global')
      .maybeSingle()
    if (error) {
      emitSoulAuditTelemetry('budget_exceeded', {
        reason: `spend_read_error: ${error.message}`,
      })
      return { spendUsd: 0, tokens: 0, degraded: true }
    }
    if (!data) return { spendUsd: 0, tokens: 0, degraded: false }
    const spendUsd = Number(data.spend_usd ?? 0)
    const tokens =
      Number(data.input_tokens ?? 0) + Number(data.output_tokens ?? 0)
    return {
      spendUsd: Number.isFinite(spendUsd) ? spendUsd : 0,
      tokens: Number.isFinite(tokens) ? tokens : 0,
      degraded: false,
    }
  } catch (err) {
    emitSoulAuditTelemetry('budget_exceeded', {
      reason: `spend_read_threw: ${err instanceof Error ? err.message : String(err)}`,
    })
    return { spendUsd: 0, tokens: 0, degraded: true }
  }
}

export interface BudgetDecision {
  ok: boolean
  /** Why the budget tripped (for telemetry / logs), when ok=false. */
  reason?: 'cost_budget_exceeded' | 'token_budget_exceeded'
  spendUsd: number
  tokens: number
  costCeilingUsd: number
  tokenCeiling: number | null
  /** True when the spend store was unreachable and we failed open. */
  degraded: boolean
}

/**
 * Check whether the daily budget allows another generation. Call this BEFORE
 * the LLM request. When `ok` is false, the caller MUST surface a clear
 * "generation paused for today" error and must NOT serve fabricated content.
 */
export async function checkDailyBudget(
  now = new Date(),
): Promise<BudgetDecision> {
  const costCeilingUsd = dailyCostBudgetUsd()
  const tokenCeiling = dailyTokenBudget()
  const spend = await getDailySpend(now)

  // Store unreachable → fail open to the rate limits (logged in getDailySpend).
  if (spend.degraded) {
    return {
      ok: true,
      spendUsd: spend.spendUsd,
      tokens: spend.tokens,
      costCeilingUsd,
      tokenCeiling,
      degraded: true,
    }
  }

  if (spend.spendUsd >= costCeilingUsd) {
    emitSoulAuditTelemetry('budget_exceeded', {
      reason: 'cost_budget_exceeded',
      observed: spend.spendUsd,
      ceiling: costCeilingUsd,
    })
    return {
      ok: false,
      reason: 'cost_budget_exceeded',
      spendUsd: spend.spendUsd,
      tokens: spend.tokens,
      costCeilingUsd,
      tokenCeiling,
      degraded: false,
    }
  }

  if (tokenCeiling !== null && spend.tokens >= tokenCeiling) {
    emitSoulAuditTelemetry('budget_exceeded', {
      reason: 'token_budget_exceeded',
      observed: spend.tokens,
      ceiling: tokenCeiling,
    })
    return {
      ok: false,
      reason: 'token_budget_exceeded',
      spendUsd: spend.spendUsd,
      tokens: spend.tokens,
      costCeilingUsd,
      tokenCeiling,
      degraded: false,
    }
  }

  return {
    ok: true,
    spendUsd: spend.spendUsd,
    tokens: spend.tokens,
    costCeilingUsd,
    tokenCeiling,
    degraded: false,
  }
}

/** Honest user-facing copy for a budget pause. No technical codes. */
export const BUDGET_PAUSED_MESSAGE =
  'Devotional generation is paused for today. We limit how much we generate each day so this stays free and sustainable — please come back tomorrow.'
