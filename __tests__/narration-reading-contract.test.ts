/**
 * The reading contract, enforced against the real catalog.
 *
 * Two implementations extract the spoken text: `src/lib/audio/segments.ts`
 * (the browser reader) and `euangelion-voice-prototype/spec/narration_extract.py`
 * (the renderer that produces the shipped `.m4a` files). They must agree — a
 * divergence means the recorded narration and the on-page fallback read
 * different words, and the chapter marks drift against the page.
 *
 * These tests guard the properties that have actually broken before:
 *   - section headings going unspoken, leaving 24 minutes of prose with no
 *     structure a listener can hear (SA-035);
 *   - the subtitle being dropped, so a day opens with half its name;
 *   - Hebrew/Greek glyphs surviving the strip and being spelled out;
 *   - fields silently unread because no ordered group names them.
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { buildModuleSegments, openingLine } from '@/lib/audio/segments'
import type { Module } from '@/types'

const DIR = path.join(process.cwd(), 'public/devotionals')

/** Module types that are ways to leave the page, not part of the reading. */
const NAV_TYPES = new Set(['inline-image', 'art', 'video', 'cta', 'resource'])

type Devotional = {
  title?: string
  subtitle?: string
  modules?: Module[]
}

const catalog: Array<{ file: string; dev: Devotional; spoken: string }> = []
for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith('.json'))) {
  let dev: Devotional
  try {
    dev = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'))
  } catch {
    continue
  }
  if (!Array.isArray(dev.modules)) continue
  const spoken = buildModuleSegments(dev.title ?? '', dev.modules, dev.subtitle)
    .map((s) => s.text)
    .join(' ')
  catalog.push({ file, dev, spoken })
}

describe('reading contract — the whole catalog', () => {
  it('has a catalog to check', () => {
    expect(catalog.length).toBeGreaterThan(500)
  })

  it('speaks every section heading outside navigation chrome', () => {
    const missed: string[] = []
    for (const { file, dev, spoken } of catalog) {
      for (const mod of dev.modules!) {
        const heading = mod.heading
        if (!heading || NAV_TYPES.has(mod.type)) continue
        // Compare on prose identity: the extractor folds smart quotes and
        // strips glyphs, so a raw substring match would false-alarm.
        const needle = heading.toLowerCase().replace(/[^a-z0-9]/g, '')
        const hay = spoken.toLowerCase().replace(/[^a-z0-9]/g, '')
        if (needle.length > 0 && !hay.includes(needle)) {
          missed.push(`${file} :: ${mod.type} :: ${heading}`)
        }
      }
    }
    expect(missed).toEqual([])
  })

  it('opens every devotional with its title, and its subtitle when it has one', () => {
    const missed: string[] = []
    for (const { file, dev, spoken } of catalog) {
      for (const part of [dev.title, dev.subtitle]) {
        if (!part?.trim()) continue
        const needle = part.toLowerCase().replace(/[^a-z0-9]/g, '')
        const hay = spoken.toLowerCase().replace(/[^a-z0-9]/g, '')
        if (needle.length > 0 && !hay.includes(needle)) {
          missed.push(`${file} :: ${part}`)
        }
      }
    }
    expect(missed).toEqual([])
  })

  it('never hands the voice a glyph it cannot pronounce', () => {
    const offenders: string[] = []
    for (const { file, spoken } of catalog) {
      // Hebrew, Greek, Greek Extended (polytonic), Hebrew presentation forms.
      const found = spoken.match(/[֐-׿Ͱ-Ͽἀ-῿יִ-ﭏ]/g)
      if (found) offenders.push(`${file}: ${found.slice(0, 6).join('')}`)
    }
    expect(offenders).toEqual([])
  })

  it('reads a one-word title rather than dropping it', () => {
    const segments = buildModuleSegments('Contentment', [
      {
        type: 'teaching',
        content: 'A long enough block of prose to be read aloud here.',
      },
    ] as unknown as Module[])
    expect(segments[0]?.text).toBe('Contentment.')
  })
})

describe('openingLine', () => {
  it('joins title and subtitle as two sentences', () => {
    expect(
      openingLine('The Fruit of Lies', 'On the harvest that follows'),
    ).toBe('The Fruit of Lies. On the harvest that follows.')
  })

  it('does not double a period the title already carries', () => {
    expect(openingLine('Wait.', 'Then move')).toBe('Wait. Then move.')
  })

  it('handles a missing subtitle', () => {
    expect(openingLine('Contentment')).toBe('Contentment.')
    expect(openingLine('Contentment', '   ')).toBe('Contentment.')
  })

  it('is empty when there is nothing to say', () => {
    expect(openingLine('', undefined)).toBe('')
  })
})
