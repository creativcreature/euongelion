import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Tests for src/lib/billing/credits.ts (SA-027 paths 3 & 6, Phase 2).
 * Grants are webhook-only + event-idempotent; consumption is atomic;
 * refunds are journaled; gift codes are hash-only with an atomic RPC.
 */

let userRows: { id: string; generation_credits: number }[] = []
let ledgerRows: {
  user_id: string
  delta: number
  reason: string
  stripe_event_id?: string | null
}[] = []
let rpcResult:
  | { data: unknown; error: null }
  | { data: null; error: { message: string } } = {
  data: [{ credits_added: 5, new_balance: 5 }],
  error: null,
}
let rpcCalls: { fn: string; args: Record<string, unknown> }[] = []

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    rpc: (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args })
      return Promise.resolve(rpcResult)
    },
    from: (table: string) => {
      const chain: Record<string, unknown> = {}
      let mode: 'select' | 'update' | 'insert' = 'select'
      let updateValues: Record<string, unknown> = {}
      let filtered = userRows
      chain.insert = vi.fn((values: Record<string, unknown>) => {
        mode = 'insert'
        if (table === 'generation_credit_ledger') {
          const row = values as (typeof ledgerRows)[number]
          if (
            row.stripe_event_id &&
            ledgerRows.some((l) => l.stripe_event_id === row.stripe_event_id)
          ) {
            return Promise.resolve({
              error: { code: '23505', message: 'duplicate key' },
            })
          }
          ledgerRows.push(row)
        }
        return Promise.resolve({ error: null })
      })
      chain.select = vi.fn(() => chain)
      chain.update = vi.fn((values: Record<string, unknown>) => {
        mode = 'update'
        updateValues = values
        return chain
      })
      chain.eq = vi.fn((col: string, val: unknown) => {
        filtered = filtered.filter(
          (row) => row[col as 'id' | 'generation_credits'] === val,
        )
        return chain
      })
      chain.maybeSingle = vi.fn(() => {
        if (mode === 'update') {
          const target = filtered[0] ?? null
          if (target) {
            userRows = userRows.map((row) =>
              row.id === target.id ? { ...row, ...updateValues } : row,
            )
          }
          return Promise.resolve({
            data: target ? { id: target.id } : null,
            error: null,
          })
        }
        return Promise.resolve({ data: filtered[0] ?? null, error: null })
      })
      chain.then = (resolve: (value: unknown) => void) => {
        if (mode === 'update') {
          const target = filtered[0] ?? null
          if (target) {
            userRows = userRows.map((row) =>
              row.id === target.id ? { ...row, ...updateValues } : row,
            )
          }
          resolve({ error: null })
          return
        }
        resolve({ data: filtered, error: null })
      }
      return chain
    },
  }),
}))

beforeEach(() => {
  userRows = []
  ledgerRows = []
  rpcCalls = []
  rpcResult = { data: [{ credits_added: 5, new_balance: 5 }], error: null }
  vi.unstubAllEnvs()
})

describe('grantPurchasedCredits', () => {
  it('grants credits and journals with the Stripe event id', async () => {
    userRows = [{ id: 'u1', generation_credits: 2 }]
    const { grantPurchasedCredits } = await import('@/lib/billing/credits')
    const result = await grantPurchasedCredits({
      userId: 'u1',
      credits: 5,
      stripeEventId: 'evt_1',
    })
    expect(result.granted).toBe(true)
    expect(userRows[0].generation_credits).toBe(7)
    expect(ledgerRows).toHaveLength(1)
    expect(ledgerRows[0]).toMatchObject({
      user_id: 'u1',
      delta: 5,
      reason: 'pack_purchase',
      stripe_event_id: 'evt_1',
    })
  })

  it('is idempotent per Stripe event (replay grants nothing)', async () => {
    userRows = [{ id: 'u1', generation_credits: 0 }]
    const { grantPurchasedCredits } = await import('@/lib/billing/credits')
    await grantPurchasedCredits({
      userId: 'u1',
      credits: 5,
      stripeEventId: 'evt_dup',
    })
    const replay = await grantPurchasedCredits({
      userId: 'u1',
      credits: 5,
      stripeEventId: 'evt_dup',
    })
    expect(replay.granted).toBe(false)
    expect(replay.reason).toBe('duplicate event')
    expect(userRows[0].generation_credits).toBe(5)
    expect(ledgerRows).toHaveLength(1)
  })
})

describe('consumeGenerationCredit', () => {
  it('decrements exactly one credit and journals the consumption', async () => {
    userRows = [{ id: 'u1', generation_credits: 3 }]
    const { consumeGenerationCredit } = await import('@/lib/billing/credits')
    expect(await consumeGenerationCredit('u1')).toBe(true)
    expect(userRows[0].generation_credits).toBe(2)
    expect(ledgerRows).toContainEqual(
      expect.objectContaining({ user_id: 'u1', delta: -1, reason: 'consume' }),
    )
  })

  it('refuses at zero balance', async () => {
    userRows = [{ id: 'u1', generation_credits: 0 }]
    const { consumeGenerationCredit } = await import('@/lib/billing/credits')
    expect(await consumeGenerationCredit('u1')).toBe(false)
    expect(userRows[0].generation_credits).toBe(0)
    expect(ledgerRows).toHaveLength(0)
  })
})

describe('refundGenerationCredit', () => {
  it('restores one credit with a journal entry', async () => {
    userRows = [{ id: 'u1', generation_credits: 1 }]
    const { refundGenerationCredit } = await import('@/lib/billing/credits')
    await refundGenerationCredit('u1')
    expect(userRows[0].generation_credits).toBe(2)
    expect(ledgerRows).toContainEqual(
      expect.objectContaining({ user_id: 'u1', delta: 1, reason: 'refund' }),
    )
  })
})

describe('gift codes', () => {
  it('generates ≥16-char grouped codes from the unambiguous alphabet', async () => {
    const { generateGiftCode } = await import('@/lib/billing/credits')
    const code = generateGiftCode()
    expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/)
    expect(code).not.toMatch(/[01OIL]/)
  })

  it('hashes case/hyphen-insensitively', async () => {
    const { hashGiftCode } = await import('@/lib/billing/credits')
    expect(hashGiftCode('abcd-efgh-jkmn-pqrs')).toBe(
      hashGiftCode('ABCDEFGHJKMNPQRS'),
    )
  })

  it('redeems via the atomic RPC with the hashed code', async () => {
    const { redeemGiftCode, hashGiftCode } =
      await import('@/lib/billing/credits')
    const result = await redeemGiftCode({
      userId: 'u1',
      code: 'AAAA-BBBB-CCCC-DDDD',
    })
    expect(result).toEqual({ ok: true, creditsAdded: 5, newBalance: 5 })
    expect(rpcCalls).toHaveLength(1)
    expect(rpcCalls[0].fn).toBe('redeem_gift_code')
    expect(rpcCalls[0].args.p_code_hash).toBe(
      hashGiftCode('AAAA-BBBB-CCCC-DDDD'),
    )
    expect(rpcCalls[0].args.p_user_id).toBe('u1')
  })

  it('maps invalid/exhausted codes without a guessing oracle', async () => {
    rpcResult = { data: null, error: { message: 'invalid_or_exhausted_code' } }
    const { redeemGiftCode } = await import('@/lib/billing/credits')
    const result = await redeemGiftCode({
      userId: 'u1',
      code: 'AAAA-BBBB-CCCC-DDDD',
    })
    expect(result).toEqual({ ok: false, reason: 'invalid_code' })
  })

  it('maps double-redemption to already_redeemed', async () => {
    rpcResult = {
      data: null,
      error: { message: 'duplicate key value violates unique constraint' },
    }
    const { redeemGiftCode } = await import('@/lib/billing/credits')
    const result = await redeemGiftCode({
      userId: 'u1',
      code: 'AAAA-BBBB-CCCC-DDDD',
    })
    expect(result).toEqual({ ok: false, reason: 'already_redeemed' })
  })
})
