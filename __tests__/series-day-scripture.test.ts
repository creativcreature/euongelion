import { beforeEach, describe, expect, it, vi } from 'vitest'

const curationState = vi.hoisted(() => ({
  candidates: [] as Array<{
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
  }>,
}))

vi.mock('@/lib/soul-audit/curation-engine', () => ({
  getCuratedDayCandidates: () => curationState.candidates,
}))

import { buildSeriesDayScriptureMap } from '@/lib/soul-audit/series-day-scripture'

describe('buildSeriesDayScriptureMap', () => {
  beforeEach(() => {
    curationState.candidates = []
  })

  it('uses curated day scripture when available', () => {
    curationState.candidates = [
      {
        key: 'identity:1',
        seriesSlug: 'identity',
        seriesTitle: 'Identity Crisis',
        sourcePath: 'content/approved/identity.json',
        dayNumber: 1,
        dayTitle: 'Day 1',
        scriptureReference: 'Matthew 6:33',
        scriptureText:
          'Seek first the kingdom of God and his righteousness, and all these things will be added to you.',
        teachingText: 't',
        reflectionPrompt: 'r',
        prayerText: 'p',
        takeawayText: 't',
        searchText: 'identity',
      },
    ]

    const map = buildSeriesDayScriptureMap({
      seriesSlug: 'identity',
      framework:
        'John 14:27 - Peace I give you, not as the world gives to you.',
      dayNumbers: [1, 2],
    })

    expect(map[1]).toEqual({
      reference: 'Matthew 6:33',
      snippet:
        'Seek first the kingdom of God and his righteousness, and all these things will be added to you.',
    })
    expect(map[2]).toEqual({
      reference: 'John 14:27',
      snippet: 'Peace I give you, not as the world gives to you.',
    })
  })

  it('falls back to placeholder when framework is empty', () => {
    const map = buildSeriesDayScriptureMap({
      seriesSlug: 'identity',
      framework: '   ',
      dayNumbers: [1],
    })

    expect(map[1]).toEqual({
      reference: 'Scripture',
      snippet: '',
    })
  })
})
