// @vitest-environment node
/**
 * Plan §53 (SA-142 / F-184): the asset reservoir indexes what can print, with
 * only recorded facts, and counts real use from published editions.
 */
import { describe, expect, it } from 'vitest'
import { buildReservoir, frameworkReference } from '@/lib/daily-bread/assets/reservoir'
import type { DailyEdition } from '@/lib/daily-bread/types'

const sources = () => ({
  prints: [{ file: 'millet-the-angelus.webp', artist: 'Millet' }],
  vasari: new Map([['millet-the-angelus.webp', { title: 'The Angelus' }]]),
  series: [
    { slug: 'kingdom', title: 'Kingdom', heroImage: '/images/site/series/kingdom.webp', keywords: ['kingdom', 'seek'], framework: 'Matthew 6:33 - Seek first' },
    { slug: 'no-art', title: 'No Art', keywords: [], framework: 'A theme without a verse' },
  ],
  scenes: ['grain'] as const,
  strips: [{ panelId: 'echo-dust-2026-09-21-abc', image: 'https://x.test/strip.jpg', caption: 'Echo & Dust — The Button', width: 1512, height: 745 }],
  dimensions: new Map([
    ['/images/devotional-prints/millet-the-angelus.webp', { width: 1536, height: 1024 }],
    ['/images/site/series/kingdom.webp', { width: 1100, height: 600 }],
  ]),
})

describe('asset reservoir (plan §53)', () => {
  it('records what the sources say and leaves the rest visibly empty', () => {
    const assets = buildReservoir(sources())
    expect(assets.map((a) => a.id)).toEqual([
      'comic:echo-dust-2026-09-21-abc',
      'euangelion-art:kingdom',
      'historical-art:millet-the-angelus',
      'procedural-poster:grain',
    ])
    const print = assets.find((a) => a.kind === 'historical-art')!
    expect(print).toMatchObject({ title: 'The Angelus', artist: 'Millet', rights: 'unrecorded', aspectRatio: 1.5, scriptureAffinity: [], usageCount: null })
    expect(assets.find((a) => a.kind === 'euangelion-art')).toMatchObject({
      tags: ['kingdom', 'seek'],
      scriptureAffinity: ['Matthew 6:33'],
      rights: 'Original (Euangelion)',
      aspectRatio: 1.833,
    })
    expect(assets.find((a) => a.kind === 'comic')?.aspectRatio).toBe(2.03)
    expect(frameworkReference('A theme without a verse')).toEqual([])
  })

  it('counts use once per edition and keeps the latest date', () => {
    const edition = (date: string, images: string[], scene = 'grain'): Pick<DailyEdition, 'editionDate' | 'modules' | 'assets'> =>
      ({
        editionDate: date,
        assets: { leadPlate: { id: 'series-hero:kingdom', src: '/images/site/series/kingdom.webp', alt: '', kind: 'series-hero' } },
        modules: [
          { type: 'gallery', plates: images.map((image) => ({ image, artist: 'Millet' })) },
          { type: 'scene', scene, renderer: 'riso', seed: 1, label: 'x' },
        ],
      }) as never
    const assets = buildReservoir({
      ...sources(),
      editions: [
        edition('2026-09-01', ['/images/devotional-prints/millet-the-angelus.webp', '/images/devotional-prints/millet-the-angelus.webp']),
        edition('2026-09-12', []),
      ],
    })
    expect(assets.find((a) => a.kind === 'historical-art')).toMatchObject({ usageCount: 1, lastUsed: '2026-09-01' })
    expect(assets.find((a) => a.kind === 'euangelion-art')).toMatchObject({ usageCount: 2, lastUsed: '2026-09-12' })
    expect(assets.find((a) => a.kind === 'procedural-poster')).toMatchObject({ usageCount: 2, lastUsed: '2026-09-12' })
    expect(assets.find((a) => a.kind === 'comic')).toMatchObject({ usageCount: 0, lastUsed: null })
  })
})
