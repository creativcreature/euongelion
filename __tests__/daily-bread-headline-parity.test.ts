import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * SA-045 / F-091: a Daily Bread reading must look like a devotional, not a
 * stripped copy of one. Founder reference for the correct layout:
 * /devotional/he-cannot-deny-himself-day-1.
 *
 * Both Daily Bread reading surfaces regressed the same way and neither can be
 * rendered here without an authenticated active series, so the contract is
 * pinned at the source — the same approach
 * __tests__/contrast-readability-contract.test.ts already uses.
 *
 * The specific failure being locked out: passing `DevotionalHeadline` no
 * `imageSrc`, which silently falls back to its `--textonly` variant and drops
 * the plate with no error.
 */
const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')

const READERS = [
  {
    label: 'curated series reading (/daily-bread)',
    file: 'src/components/today/CuratedActiveView.tsx',
  },
  {
    label: 'soul-audit plan reading (/daily-bread)',
    file: 'src/components/today/DailyBreadView.tsx',
  },
  {
    label: 'canonical devotional reader (/devotional/[slug])',
    file: 'src/app/devotional/[slug]/DevotionalPageClient.tsx',
  },
]

describe('Daily Bread headline parity with the devotional reader', () => {
  for (const reader of READERS) {
    it(`${reader.label} renders DevotionalHeadline`, () => {
      expect(read(reader.file)).toContain('<DevotionalHeadline')
    })

    it(`${reader.label} passes an imageSrc so the plate renders`, () => {
      const src = read(reader.file)
      const block = src.slice(
        src.indexOf('<DevotionalHeadline'),
        src.indexOf('/>', src.indexOf('<DevotionalHeadline')),
      )
      expect(block).toContain('imageSrc=')
      // getSeriesHero is the single source every surface resolves art through.
      expect(block).toContain('getSeriesHero(')
    })

    it(`${reader.label} passes the scripture reference`, () => {
      const src = read(reader.file)
      const block = src.slice(
        src.indexOf('<DevotionalHeadline'),
        src.indexOf('/>', src.indexOf('<DevotionalHeadline')),
      )
      expect(block).toContain('scripture=')
    })
  }

  it('the headline still has a text-only fallback for art-less surfaces', () => {
    // Not a regression: the variant must keep existing, it simply must not be
    // what a reading surface silently lands on.
    expect(read('src/components/devotional/DevotionalHeadline.tsx')).toContain(
      'devotional-headline--textonly',
    )
  })
})
