import { describe, expect, it } from 'vitest'
import { buildMetadataFallbackPlan } from '@/lib/soul-audit/metadata-plan-builder'

describe('buildMetadataFallbackPlan', () => {
  it('builds five deterministic fallback days from series metadata', () => {
    const plan = buildMetadataFallbackPlan({
      seriesSlug: 'identity',
      userResponse: 'I feel overwhelmed and need peace.',
    })

    expect(plan).toHaveLength(5)
    expect(plan[0]?.day).toBe(1)
    expect(plan[4]?.day).toBe(5)
    expect(plan.every((day) => day.scriptureReference.length > 0)).toBe(true)
    expect(plan.every((day) => day.reflection.length >= 500)).toBe(true)
    expect(plan.every((day) => day.prayer.length >= 220)).toBe(true)
  })
})
