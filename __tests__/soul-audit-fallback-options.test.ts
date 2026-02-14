import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/soul-audit/curation-engine', () => ({
  getCuratedDayCandidates: () => [],
  rankCandidatesForInput: () => [],
}))

import { buildAuditOptions } from '@/lib/soul-audit/matching'

describe('soul audit options fallback', () => {
  it('returns a stable 3 AI + 2 curated split when curated candidates are unavailable', () => {
    const options = buildAuditOptions(
      'I feel overwhelmed, isolated, and unsure how to keep faith when everything shifts.',
    )

    expect(options).toHaveLength(5)
    expect(
      options.filter((option) => option.kind === 'ai_primary'),
    ).toHaveLength(3)
    expect(
      options.filter((option) => option.kind === 'curated_prefab'),
    ).toHaveLength(2)
  })
})
