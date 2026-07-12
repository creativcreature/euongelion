/**
 * credits.ts — spendable custom-generation credits (SA-027 paths 3 & 6,
 * Phase 2 of the custom-generation brief).
 *
 * The balance lives on public.users.generation_credits (atomic
 * conditional decrement, same race-safety pattern as the SA-026 free
 * grant) and every movement is journaled in generation_credit_ledger.
 * Credits never expire. Grants happen ONLY on verified Stripe webhooks
 * (pack purchases) or gift-code redemptions (atomic RPC) — never from
 * client redirects.
 *
 * Pack catalog: definitions here, prices in Stripe (STRIPE_PRICE_* env
 * per pack, same pattern as subscription plans). The founder tunes
 * pricing by editing Stripe prices + the label envs — no code change.
 */

import { randomBytes, createHash } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export interface CreditPack {
  id: string
  credits: number
  /** Display label; env-overridable so Stripe price edits don't drift. */
  priceLabel: string
  perEditionLabel: string
  stripePriceIdEnv: string
}

/**
 * Brief §2 Path 3 suggested "$2.99 for 5 editions — tune pricing later;
 * make it config-driven." Labels are env-overridable
 * (CREDIT_PACK_<N>_LABEL); the charged amount is ALWAYS whatever the
 * Stripe price object says — the label must be kept in sync by the
 * founder when tuning (checkout shows the authoritative Stripe amount
 * either way, so a drifted label can never overcharge silently).
 */
export function getCreditPacks(): CreditPack[] {
  return [
    {
      id: 'credits_3',
      credits: 3,
      priceLabel: process.env.CREDIT_PACK_3_LABEL || '$1.99',
      perEditionLabel: '≈ $0.66 per edition',
      stripePriceIdEnv: 'STRIPE_PRICE_CREDITS_3',
    },
    {
      id: 'credits_5',
      credits: 5,
      priceLabel: process.env.CREDIT_PACK_5_LABEL || '$2.99',
      perEditionLabel: '≈ $0.60 per edition',
      stripePriceIdEnv: 'STRIPE_PRICE_CREDITS_5',
    },
    {
      id: 'credits_10',
      credits: 10,
      priceLabel: process.env.CREDIT_PACK_10_LABEL || '$4.99',
      perEditionLabel: '≈ $0.50 per edition',
      stripePriceIdEnv: 'STRIPE_PRICE_CREDITS_10',
    },
  ]
}

export function getCreditPackById(packId: string): CreditPack | null {
  return getCreditPacks().find((pack) => pack.id === packId) ?? null
}

export function getStripePriceIdForPack(packId: string): string | null {
  const pack = getCreditPackById(packId)
  if (!pack) return null
  const value = process.env[pack.stripePriceIdEnv]
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

/**
 * Grant purchased credits (webhook-only caller). Idempotent per Stripe
 * event via the ledger's unique stripe_event_id index — a replayed
 * event inserts nothing and grants nothing.
 */
export async function grantPurchasedCredits(params: {
  userId: string
  credits: number
  stripeEventId: string
}): Promise<{ granted: boolean; reason?: string }> {
  if (params.credits <= 0) return { granted: false, reason: 'no credits' }

  let supabase: ReturnType<typeof createAdminClient>
  try {
    supabase = createAdminClient()
  } catch {
    return { granted: false, reason: 'admin client unavailable' }
  }

  try {
    // Ledger first: the unique index on stripe_event_id is the
    // idempotency wall. If this insert conflicts, the grant already
    // happened — do nothing.
    const { error: ledgerError } = await (supabase as any)
      .from('generation_credit_ledger')
      .insert({
        user_id: params.userId,
        delta: params.credits,
        reason: 'pack_purchase',
        stripe_event_id: params.stripeEventId,
      })
    if (ledgerError) {
      const duplicate =
        typeof ledgerError.code === 'string' && ledgerError.code === '23505'
      return {
        granted: false,
        reason: duplicate ? 'duplicate event' : ledgerError.message,
      }
    }

    const { data: row, error: readError } = await supabase
      .from('users')
      .select('generation_credits')
      .eq('id', params.userId)
      .maybeSingle()
    if (readError || !row) return { granted: false, reason: 'user not found' }
    const current = Number(
      (row as { generation_credits?: number }).generation_credits ?? 0,
    )

    const { error: writeError } = await supabase
      .from('users')
      .update({ generation_credits: current + params.credits })
      .eq('id', params.userId)
      .eq('generation_credits', current) // optimistic-concurrency guard
    if (writeError) return { granted: false, reason: writeError.message }
    return { granted: true }
  } catch (error) {
    return {
      granted: false,
      reason: error instanceof Error ? error.message : 'grant threw',
    }
  }
}

/**
 * Atomically consume one credit. Reads the balance and decrements with
 * an equality guard (WHERE generation_credits = seen AND > 0) so two
 * concurrent selects can never spend the same credit; the loser simply
 * retries the read once. Journals the consumption.
 */
export async function consumeGenerationCredit(
  userId: string,
): Promise<boolean> {
  let supabase: ReturnType<typeof createAdminClient>
  try {
    supabase = createAdminClient()
  } catch {
    return false
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data: row, error: readError } = await supabase
        .from('users')
        .select('generation_credits')
        .eq('id', userId)
        .maybeSingle()
      if (readError || !row) return false
      const current = Number(
        (row as { generation_credits?: number }).generation_credits ?? 0,
      )
      if (current <= 0) return false

      const { data: updated, error: writeError } = await supabase
        .from('users')
        .update({ generation_credits: current - 1 })
        .eq('id', userId)
        .eq('generation_credits', current)
        .select('id')
        .maybeSingle()
      if (writeError) return false
      if (!updated) continue // lost the race — re-read once

      await (supabase as any).from('generation_credit_ledger').insert({
        user_id: userId,
        delta: -1,
        reason: 'consume',
      })
      return true
    } catch {
      return false
    }
  }
  return false
}

/** Refund one credit after a failed plan creation. Best-effort + journaled. */
export async function refundGenerationCredit(userId: string): Promise<void> {
  try {
    const supabase = createAdminClient()
    const { data: row } = await supabase
      .from('users')
      .select('generation_credits')
      .eq('id', userId)
      .maybeSingle()
    const current = Number(
      (row as { generation_credits?: number } | null)?.generation_credits ?? 0,
    )
    await supabase
      .from('users')
      .update({ generation_credits: current + 1 })
      .eq('id', userId)
    await (supabase as any).from('generation_credit_ledger').insert({
      user_id: userId,
      delta: 1,
      reason: 'refund',
    })
  } catch {
    console.error(
      `[credits] failed to refund credit for ${userId} — restore manually (+1 generation_credits, ledger reason 'refund')`,
    )
  }
}

// ─── Gift codes (SA-027 path 6, brief §12.3) ────────────────────────

const GIFT_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no 0/O/1/I/L

export function hashGiftCode(code: string): string {
  return createHash('sha256')
    .update(code.trim().toUpperCase().replace(/-/g, ''))
    .digest('hex')
}

/** ≥16 random chars from a 31-char alphabet (~79 bits), grouped for humans. */
export function generateGiftCode(): string {
  const bytes = randomBytes(16)
  let code = ''
  for (let i = 0; i < 16; i++) {
    code += GIFT_CODE_ALPHABET[bytes[i] % GIFT_CODE_ALPHABET.length]
  }
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}-${code.slice(12, 16)}`
}

/**
 * Redeem a gift code for the given user via the atomic DB function
 * (lock → per-user uniqueness → decrement uses → credit → journal).
 * Returns honest failure reasons without distinguishing "no such code"
 * from "exhausted code" (no oracle for code guessing).
 */
export async function redeemGiftCode(params: {
  userId: string
  code: string
}): Promise<
  | { ok: true; creditsAdded: number; newBalance: number }
  | { ok: false; reason: 'invalid_code' | 'already_redeemed' | 'error' }
> {
  let supabase: ReturnType<typeof createAdminClient>
  try {
    supabase = createAdminClient()
  } catch {
    return { ok: false, reason: 'error' }
  }

  try {
    const { data, error } = await (supabase as any).rpc('redeem_gift_code', {
      p_code_hash: hashGiftCode(params.code),
      p_user_id: params.userId,
    })
    if (error) {
      const message = String(error.message ?? '')
      if (message.includes('invalid_or_exhausted_code')) {
        return { ok: false, reason: 'invalid_code' }
      }
      if (message.includes('duplicate key')) {
        return { ok: false, reason: 'already_redeemed' }
      }
      return { ok: false, reason: 'error' }
    }
    const row = Array.isArray(data) ? data[0] : data
    if (!row) return { ok: false, reason: 'error' }
    return {
      ok: true,
      creditsAdded: Number(row.credits_added ?? 0),
      newBalance: Number(row.new_balance ?? 0),
    }
  } catch {
    return { ok: false, reason: 'error' }
  }
}
