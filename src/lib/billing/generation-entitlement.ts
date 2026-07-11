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
 * Count plans created this UTC calendar month across all of the
 * user's sessions. Fails CLOSED to the allowance limit? No — a count
 * failure returning huge would lock paying users out on our outage.
 * Counting failures return 0 (allow), because the hard cost walls
 * (daily plan cap + global budget) still stand behind this gate.
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

    const { count, error } = await supabase
      .from('devotional_plan_instances')
      .select('id', { count: 'exact', head: true })
      .in('session_token', tokens)
      .gte('created_at', monthStart)
    if (error) return 0
    return count ?? 0
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
