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

/** Default monthly USD ceiling (brief §12.6 hard monthly cap). */
const DEFAULT_MONTHLY_COST_BUDGET_USD = 100

export function dailyCostBudgetUsd(): number {
  return (
    toFloat(process.env.SOUL_AUDIT_DAILY_COST_BUDGET) ??
    DEFAULT_DAILY_COST_BUDGET_USD
  )
}

export function monthlyCostBudgetUsd(): number {
  return (
    toFloat(process.env.SOUL_AUDIT_MONTHLY_COST_BUDGET) ??
    DEFAULT_MONTHLY_COST_BUDGET_USD
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

// ─── Monthly spend (brief §12.6: hard monthly cap + 50/80/100% alerts) ──────

export interface MonthlySpend {
  spendUsd: number
  degraded: boolean
}

/** utc month key, e.g. '2026-07'. */
function utcMonth(now = new Date()): string {
  return now.toISOString().slice(0, 7)
}

// Module-cached monthly read (per isolate) so the pre-call wall doesn't
// double every generation's DB reads. 5-minute staleness is acceptable:
// the daily cap bounds the drift a stale month figure can allow.
let monthlySpendCache: {
  month: string
  value: MonthlySpend
  fetchedAt: number
} | null = null
const MONTHLY_SPEND_CACHE_TTL_MS = 5 * 60_000

/** Sum the month's `global_spend` day rows. */
export async function getMonthlySpend(now = new Date()): Promise<MonthlySpend> {
  const month = utcMonth(now)
  if (
    monthlySpendCache &&
    monthlySpendCache.month === month &&
    Date.now() - monthlySpendCache.fetchedAt < MONTHLY_SPEND_CACHE_TTL_MS
  ) {
    return monthlySpendCache.value
  }

  const supabase = maybeAdminClient()
  if (!supabase) {
    return { spendUsd: 0, degraded: true }
  }
  try {
    const { data, error } = await (supabase as any)
      .from('soul_audit_daily_counters')
      .select('spend_usd')
      .eq('scope', 'global_spend')
      .eq('subject', 'global')
      .gte('utc_day', `${month}-01`)
      .lte('utc_day', `${month}-31`)
    if (error) {
      emitSoulAuditTelemetry('budget_exceeded', {
        reason: `monthly_spend_read_error: ${error.message}`,
      })
      return { spendUsd: 0, degraded: true }
    }
    const spendUsd = ((data ?? []) as { spend_usd?: unknown }[]).reduce(
      (sum, row) => {
        const value = Number(row.spend_usd ?? 0)
        return sum + (Number.isFinite(value) ? value : 0)
      },
      0,
    )
    const value: MonthlySpend = { spendUsd, degraded: false }
    monthlySpendCache = { month, value, fetchedAt: Date.now() }
    return value
  } catch (err) {
    emitSoulAuditTelemetry('budget_exceeded', {
      reason: `monthly_spend_read_threw: ${err instanceof Error ? err.message : String(err)}`,
    })
    return { spendUsd: 0, degraded: true }
  }
}

/** Test helper: reset the monthly cache + alert dedup. */
export function resetMonthlySpendStateForTests(): void {
  monthlySpendCache = null
  alertedThresholds.clear()
}

// Threshold alerting: one loud structured log per threshold per month
// per isolate. Log-based alerting (§12.6) until a real alert channel
// exists; cross-isolate duplicates are acceptable — better twice than
// never. 100% is also a hard wall below.
const SPEND_ALERT_THRESHOLDS = [0.5, 0.8, 1.0] as const
const alertedThresholds = new Set<string>()

function emitMonthlySpendAlerts(
  spendUsd: number,
  ceilingUsd: number,
  now: Date,
): void {
  if (ceilingUsd <= 0) return
  const month = utcMonth(now)
  for (const threshold of SPEND_ALERT_THRESHOLDS) {
    if (spendUsd >= ceilingUsd * threshold) {
      const key = `${month}:${threshold}`
      if (alertedThresholds.has(key)) continue
      alertedThresholds.add(key)
      console.error(
        `[spend-alert] ALERT monthly LLM spend $${spendUsd.toFixed(2)} has crossed ${Math.round(
          threshold * 100,
        )}% of the $${ceilingUsd.toFixed(2)} cap (${month})`,
      )
      emitSoulAuditTelemetry('budget_exceeded', {
        reason: `monthly_spend_threshold_${Math.round(threshold * 100)}`,
        observed: spendUsd,
        ceiling: ceilingUsd,
      })
    }
  }
}

export interface BudgetDecision {
  ok: boolean
  /** Why the budget tripped (for telemetry / logs), when ok=false. */
  reason?:
    | 'cost_budget_exceeded'
    | 'token_budget_exceeded'
    | 'monthly_cost_budget_exceeded'
  spendUsd: number
  tokens: number
  costCeilingUsd: number
  tokenCeiling: number | null
  monthlySpendUsd: number
  monthlyCeilingUsd: number
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
  const monthlyCeilingUsd = monthlyCostBudgetUsd()
  const spend = await getDailySpend(now)
  const monthly = await getMonthlySpend(now)

  // 50/80/100% monthly alerts fire on every check that sees a crossed
  // threshold (deduped per month per isolate) — even when the daily
  // wall is what ultimately blocks.
  if (!monthly.degraded) {
    emitMonthlySpendAlerts(monthly.spendUsd, monthlyCeilingUsd, now)
  }

  // Store unreachable → fail open to the rate limits (logged in getDailySpend).
  if (spend.degraded) {
    return {
      ok: true,
      spendUsd: spend.spendUsd,
      tokens: spend.tokens,
      costCeilingUsd,
      tokenCeiling,
      monthlySpendUsd: monthly.spendUsd,
      monthlyCeilingUsd,
      degraded: true,
    }
  }

  // Hard monthly wall (§12.6). Checked first: a blown month must pause
  // generation even when today's spend is still under the daily cap.
  if (!monthly.degraded && monthly.spendUsd >= monthlyCeilingUsd) {
    emitSoulAuditTelemetry('budget_exceeded', {
      reason: 'monthly_cost_budget_exceeded',
      observed: monthly.spendUsd,
      ceiling: monthlyCeilingUsd,
    })
    return {
      ok: false,
      reason: 'monthly_cost_budget_exceeded',
      spendUsd: spend.spendUsd,
      tokens: spend.tokens,
      costCeilingUsd,
      tokenCeiling,
      monthlySpendUsd: monthly.spendUsd,
      monthlyCeilingUsd,
      degraded: false,
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
      monthlySpendUsd: monthly.spendUsd,
      monthlyCeilingUsd,
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
      monthlySpendUsd: monthly.spendUsd,
      monthlyCeilingUsd,
      degraded: false,
    }
  }

  return {
    ok: true,
    spendUsd: spend.spendUsd,
    tokens: spend.tokens,
    costCeilingUsd,
    tokenCeiling,
    monthlySpendUsd: monthly.spendUsd,
    monthlyCeilingUsd,
    degraded: false,
  }
}

/** Honest user-facing copy for a budget pause. No technical codes. */
export const BUDGET_PAUSED_MESSAGE =
  'Devotional generation is paused for today. We limit how much we generate each day so this stays free and sustainable — please come back tomorrow.'

/** Monthly-wall variant: "come back tomorrow" would be dishonest. */
export const BUDGET_PAUSED_MONTHLY_MESSAGE =
  'Devotional generation is paused for now. We limit how much we generate each month so this stays sustainable — it resumes at the start of next month.'

/** Pick the honest pause copy for a failed BudgetDecision. */
export function budgetPausedMessage(reason: BudgetDecision['reason']): string {
  return reason === 'monthly_cost_budget_exceeded'
    ? BUDGET_PAUSED_MONTHLY_MESSAGE
    : BUDGET_PAUSED_MESSAGE
}
