/**
 * generation-entitlement.ts — the SA-026 gate for custom generation.
 *
 * Founder-ratified 2026-07-10: Soul Audit submit, option review, and
 * all curated reading stay anonymous and free forever. Composing a
 * bespoke plan requires a verified account. Every verified account
 * gets exactly ONE free generation (users.free_generation_used_at,
 * NULL = unused); beyond that, entitlement comes from a subscription
 * (SA-027/SA-028 — read from public.users via subscription-state.ts).
 *
 * Subscribers have a monthly allowance (fair use), configured via
 * SUBSCRIPTION_MONTHLY_GENERATION_ALLOWANCE (default 6; 0 or negative
 * = unlimited). Usage is counted from devotional_plan_instances across
 * the user's sessions in the current UTC calendar month — an honest
 * count from real data, not a separate counter that can drift.
 *
 * Rollout switch: GENERATION_GATE_LIVE !== 'true' bypasses the gate
 * entirely (current anonymous behavior). Mirrors BILLING_CHECKOUT_LIVE
 * so the gate and the paywall that answers it ship together — gating
 * without a way to pay would be a partial launch (CLAUDE.md rule 10).
 *
 * The free grant is consumed with an atomic conditional UPDATE
 * (`WHERE free_generation_used_at IS NULL`) so two concurrent selects
 * can't both ride one grant; a reservation is released if plan/job
 * creation fails so the user never loses the grant to our error.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { readUserBillingState } from './subscription-state'

export type GenerationEntitlement =
  | {
      allowed: true
      source: 'subscription'
      allowance: { used: number; limit: number | null }
    }
  | { allowed: true; source: 'free_grant' }
  | { allowed: true; source: 'credits'; balance: number }
  | {
      allowed: false
      reason: 'no_account' | 'no_entitlement' | 'allowance_exhausted'
      freeGenerationUsed: boolean
    }

export function generationGateLive(): boolean {
  return process.env.GENERATION_GATE_LIVE === 'true'
}

export function subscriptionMonthlyAllowance(): number | null {
  const raw = process.env.SUBSCRIPTION_MONTHLY_GENERATION_ALLOWANCE
  if (raw === undefined || raw.trim() === '') return 6
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed)) return 6
  return parsed <= 0 ? null : parsed
}

/**
 * Count generations this UTC calendar month across all of the user's
 * sessions — as DISTINCT audit runs, not raw plan instances. A failed
 * generation that the user retries creates a second plan instance for
 * the SAME run; counting instances would bill the allowance twice for
 * one composition (founder ruling 2026-07-12: our failures never cost
 * the user). Fails OPEN to 0 on lookup errors — a count failure must
 * not lock paying users out; the hard cost walls (daily plan cap +
 * global budget) still stand behind this gate.
 */
async function countMonthlyGenerations(userId: string): Promise<number> {
  let supabase: ReturnType<typeof createAdminClient>
  try {
    supabase = createAdminClient()
  } catch {
    return 0
  }

  try {
    const { data: sessions, error: sessionsError } = await supabase
      .from('user_sessions')
      .select('session_token')
      .eq('user_id', userId)
    if (sessionsError || !sessions?.length) return 0

    const tokens = (sessions as { session_token: string }[])
      .map((row) => row.session_token)
      .filter(Boolean)
    if (!tokens.length) return 0

    const now = new Date()
    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    ).toISOString()

    const { data, error } = await supabase
      .from('devotional_plan_instances')
      .select('audit_run_id')
      .in('session_token', tokens)
      .gte('created_at', monthStart)
      .limit(1000)
    if (error || !data) return 0

    const distinctRuns = new Set(
      (data as { audit_run_id: string | null }[])
        .map((row) => row.audit_run_id)
        .filter(Boolean),
    )
    // Legacy rows without an audit_run_id each count as one generation.
    const legacyRows = (data as { audit_run_id: string | null }[]).filter(
      (row) => !row.audit_run_id,
    ).length
    return distinctRuns.size + legacyRows
  } catch {
    return 0
  }
}

/**
 * The gate. Never spends tokens for an unentitled request — call this
 * BEFORE any plan/job creation or model invocation.
 */
export async function checkGenerationEntitlement(
  userId: string | null | undefined,
): Promise<GenerationEntitlement> {
  if (!userId) {
    return { allowed: false, reason: 'no_account', freeGenerationUsed: false }
  }

  const state = await readUserBillingState(userId)
  if (!state) {
    // Fail closed: no users row / lookup failure = no entitlement.
    return {
      allowed: false,
      reason: 'no_entitlement',
      freeGenerationUsed: false,
    }
  }

  if (state.premiumActive) {
    const limit = subscriptionMonthlyAllowance()
    if (limit === null) {
      return {
        allowed: true,
        source: 'subscription',
        allowance: { used: 0, limit },
      }
    }
    const used = await countMonthlyGenerations(userId)
    if (used < limit) {
      return {
        allowed: true,
        source: 'subscription',
        allowance: { used, limit },
      }
    }
    return {
      allowed: false,
      reason: 'allowance_exhausted',
      freeGenerationUsed: state.freeGenerationUsedAt !== null,
    }
  }

  if (state.freeGenerationUsedAt === null) {
    return { allowed: true, source: 'free_grant' }
  }

  // SA-027 path 3/6: purchased or gifted credits (consumed atomically at
  // plan creation via consumeGenerationCredit, after all pre-checks).
  if (state.generationCredits > 0) {
    return {
      allowed: true,
      source: 'credits',
      balance: state.generationCredits,
    }
  }

  return {
    allowed: false,
    reason: 'no_entitlement',
    freeGenerationUsed: true,
  }
}

/**
 * Atomically reserve the one free generation. Returns false when the
 * grant was already consumed (including by a concurrent request) or
 * the write fails — the caller must respond 402, never proceed.
 */
export async function reserveFreeGeneration(userId: string): Promise<boolean> {
  let supabase: ReturnType<typeof createAdminClient>
  try {
    supabase = createAdminClient()
  } catch {
    return false
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .update({ free_generation_used_at: new Date().toISOString() })
      .eq('id', userId)
      .is('free_generation_used_at', null)
      .select('id')
      .maybeSingle()
    return !error && Boolean(data)
  } catch {
    return false
  }
}

/**
 * Release a reserved free generation after a failed plan/job creation
 * so our error never costs the user their grant. Best-effort.
 */
export async function releaseFreeGeneration(userId: string): Promise<void> {
  try {
    const supabase = createAdminClient()
    await supabase
      .from('users')
      .update({ free_generation_used_at: null })
      .eq('id', userId)
  } catch {
    console.error(
      `[generation-entitlement] failed to release free grant for ${userId} — restore manually (free_generation_used_at → NULL)`,
    )
  }
}
