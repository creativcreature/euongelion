import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * §12.6: hard monthly spend cap + 50/80/100% alerts, layered onto the
 * existing daily wall in src/lib/soul-audit/budget-cap.ts.
 */

// Day rows in soul_audit_daily_counters (scope=global_spend).
let dayRows: { utc_day: string; spend_usd: number; tokens?: number }[] = []

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => {
      const filters: Record<string, unknown> = {}
      let gteDay: string | null = null
      let lteDay: string | null = null
      const chain: Record<string, unknown> = {}
      chain.select = vi.fn(() => chain)
      chain.eq = vi.fn((col: string, val: unknown) => {
        filters[col] = val
        return chain
      })
      chain.gte = vi.fn((_col: string, val: string) => {
        gteDay = val
        return chain
      })
      chain.lte = vi.fn((_col: string, val: string) => {
        lteDay = val
        return chain
      })
      chain.maybeSingle = vi.fn(() => {
        // Daily read: exact utc_day match.
        const row = dayRows.find((r) => r.utc_day === filters.utc_day)
        return Promise.resolve({
          data: row
            ? {
                spend_usd: row.spend_usd,
                input_tokens: row.tokens ?? 0,
                output_tokens: 0,
              }
            : null,
          error: null,
        })
      })
      chain.then = (resolve: (value: unknown) => void) => {
        // Monthly read: range query.
        const rows = dayRows.filter(
          (r) =>
            (!gteDay || r.utc_day >= gteDay) &&
            (!lteDay || r.utc_day <= lteDay),
        )
        resolve({
          data: rows.map((r) => ({ spend_usd: r.spend_usd })),
          error: null,
        })
      }
      return chain
    },
  }),
}))

vi.mock('@/lib/soul-audit/telemetry', () => ({
  emitSoulAuditTelemetry: vi.fn(),
}))

const NOW = new Date('2026-07-15T12:00:00.000Z')

beforeEach(async () => {
  dayRows = []
  vi.unstubAllEnvs()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role')
  const { resetMonthlySpendStateForTests } =
    await import('@/lib/soul-audit/budget-cap')
  resetMonthlySpendStateForTests()
})

describe('monthly spend wall', () => {
  it('passes when both daily and monthly are under their ceilings', async () => {
    dayRows = [{ utc_day: '2026-07-15', spend_usd: 5 }]
    const { checkDailyBudget } = await import('@/lib/soul-audit/budget-cap')
    const decision = await checkDailyBudget(NOW)
    expect(decision.ok).toBe(true)
    expect(decision.monthlySpendUsd).toBe(5)
    expect(decision.monthlyCeilingUsd).toBe(100)
  })

  it('blocks when the month is blown even though today is under the daily cap', async () => {
    // 20 days × $6 = $120 month; today only $6 (under the $25 daily cap).
    dayRows = Array.from({ length: 20 }, (_, i) => ({
      utc_day: `2026-07-${String(i + 1).padStart(2, '0')}`,
      spend_usd: 6,
    }))
    const { checkDailyBudget, resetMonthlySpendStateForTests } =
      await import('@/lib/soul-audit/budget-cap')
    resetMonthlySpendStateForTests()
    const decision = await checkDailyBudget(NOW)
    expect(decision.ok).toBe(false)
    expect(decision.reason).toBe('monthly_cost_budget_exceeded')
    expect(decision.monthlySpendUsd).toBe(120)
  })

  it('does not count last month against this month', async () => {
    dayRows = [
      { utc_day: '2026-06-30', spend_usd: 500 },
      { utc_day: '2026-07-15', spend_usd: 5 },
    ]
    const { checkDailyBudget, resetMonthlySpendStateForTests } =
      await import('@/lib/soul-audit/budget-cap')
    resetMonthlySpendStateForTests()
    const decision = await checkDailyBudget(NOW)
    expect(decision.ok).toBe(true)
    expect(decision.monthlySpendUsd).toBe(5)
  })

  it('respects SOUL_AUDIT_MONTHLY_COST_BUDGET override', async () => {
    vi.stubEnv('SOUL_AUDIT_MONTHLY_COST_BUDGET', '10')
    dayRows = [
      { utc_day: '2026-07-14', spend_usd: 6 },
      { utc_day: '2026-07-15', spend_usd: 6 },
    ]
    const { checkDailyBudget, resetMonthlySpendStateForTests } =
      await import('@/lib/soul-audit/budget-cap')
    resetMonthlySpendStateForTests()
    const decision = await checkDailyBudget(NOW)
    expect(decision.ok).toBe(false)
    expect(decision.reason).toBe('monthly_cost_budget_exceeded')
    expect(decision.monthlyCeilingUsd).toBe(10)
  })
})

describe('50/80/100% alerts', () => {
  it('logs each crossed threshold exactly once per month', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    dayRows = [{ utc_day: '2026-07-15', spend_usd: 85 }] // 85% of $100
    const { checkDailyBudget, resetMonthlySpendStateForTests } =
      await import('@/lib/soul-audit/budget-cap')
    resetMonthlySpendStateForTests()
    await checkDailyBudget(NOW)
    await checkDailyBudget(NOW) // second check must not re-alert

    const alerts = errorSpy.mock.calls
      .map((call) => String(call[0]))
      .filter((line) => line.includes('[spend-alert]'))
    expect(alerts).toHaveLength(2) // 50% and 80%, once each
    expect(alerts[0]).toContain('50%')
    expect(alerts[1]).toContain('80%')
    errorSpy.mockRestore()
  })

  it('fires the 100% alert alongside the hard wall', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    dayRows = [{ utc_day: '2026-07-15', spend_usd: 100 }]
    const { checkDailyBudget, resetMonthlySpendStateForTests } =
      await import('@/lib/soul-audit/budget-cap')
    resetMonthlySpendStateForTests()
    const decision = await checkDailyBudget(NOW)
    expect(decision.ok).toBe(false)
    const alerts = errorSpy.mock.calls
      .map((call) => String(call[0]))
      .filter((line) => line.includes('[spend-alert]'))
    expect(alerts.some((line) => line.includes('100%'))).toBe(true)
    errorSpy.mockRestore()
  })
})
