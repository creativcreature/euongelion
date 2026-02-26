import { beforeEach, describe, expect, it, vi } from 'vitest'

type Candidate = {
  key: string
  seriesSlug: string
  seriesTitle: string
  sourcePath: string
  dayNumber: number
  dayTitle: string
  scriptureReference: string
  scriptureText: string
  teachingText: string
  reflectionPrompt: string
  prayerText: string
  takeawayText: string
  searchText: string
}

const curationState = vi.hoisted(() => ({
  candidates: [] as Candidate[],
  ranked: [] as Array<{
    candidate: Candidate
    score: number
    matches: string[]
  }>,
}))

vi.mock('@/lib/soul-audit/curation-engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/soul-audit/curation-engine')>()
  return {
    ...actual,
    getCuratedDayCandidates: () => curationState.candidates,
    rankCandidatesForInput: () => curationState.ranked,
  }
})

import { buildAuditOptions } from '@/lib/soul-audit/matching'

function makeIdentityCandidates(): Candidate[] {
  return Array.from({ length: 5 }).map((_, index) => ({
    key: `identity:${index + 1}`,
    seriesSlug: 'identity',
    seriesTitle: 'Identity Crisis',
    sourcePath: 'content/series-json/identity.json',
    dayNumber: index + 1,
    dayTitle: `Identity Day ${index + 1}`,
    scriptureReference: 'Matthew 6:33',
    scriptureText: 'Seek first the kingdom of God.',
    teachingText: 'Teaching text',
    reflectionPrompt: 'What is God showing you today?',
    prayerText: 'Guide me, Lord.',
    takeawayText: 'Take one step today.',
    searchText: 'identity purpose kingdom',
  }))
}

describe('soul audit options fallback', () => {
  beforeEach(() => {
    curationState.candidates = []
    curationState.ranked = []
  })

  it('falls back to series metadata when curated candidates are unavailable', () => {
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
    expect(
      options.every(
        (option) =>
          typeof option.preview?.verseText === 'string' &&
          option.preview.verseText.trim().length > 0,
      ),
    ).toBe(true)
  })

  it('keeps 3+2 split when curated candidates come from a single series', () => {
    const singleSeriesCandidates = makeIdentityCandidates()
    curationState.candidates = singleSeriesCandidates
    curationState.ranked = singleSeriesCandidates.map((candidate, idx) => ({
      candidate,
      score: 10 - idx,
      matches: ['identity', 'purpose'],
    }))

    const options = buildAuditOptions(
      'Everything feels shaken and I need clarity for who I am in Christ.',
    )
    expect(options).toHaveLength(5)
    expect(
      options.filter((option) => option.kind === 'ai_primary'),
    ).toHaveLength(3)
    expect(
      options.filter((option) => option.kind === 'curated_prefab'),
    ).toHaveLength(2)
    expect(
      options.every(
        (option) =>
          typeof option.preview?.verseText === 'string' &&
          option.preview.verseText.trim().length > 0,
      ),
    ).toBe(true)
  })
})
