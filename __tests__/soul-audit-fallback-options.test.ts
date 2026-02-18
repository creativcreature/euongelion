import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/soul-audit/curation-engine', () => ({
  getCuratedDayCandidates: () => [],
  rankCandidatesForInput: () => [],
}))

import { buildAuditOptions } from '@/lib/soul-audit/matching'

describe('soul audit options fallback', () => {
  it('fails closed when curated candidates are unavailable', () => {
    const options = buildAuditOptions(
      'I feel overwhelmed, isolated, and unsure how to keep faith when everything shifts.',
    )

    expect(options).toHaveLength(0)
  })
})
