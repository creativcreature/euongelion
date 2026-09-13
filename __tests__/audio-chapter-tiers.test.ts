/**
 * Chapter tiers — the premise the listening player rests on.
 *
 * The player asks a listener to navigate by section NAME. Measured over all
 * 6,132 chapter marks in the manifest, 3,451 of them (56.3%) are module
 * labels, and 13% of readings repeat a label — `bible-365-day-1` says
 * "Scripture" seven times. So a name is not, on its own, a thing you can aim
 * at, and the player needs to know which labels are titles and which are
 * furniture.
 */
import { describe, expect, it } from 'vitest'
import { isStructuralChapter, sectionBack } from '@/lib/audio/tracks'
import manifest from '@/data/audio-manifest.json'

type Entry = { chapters?: { t: number; label: string; module: number }[] }

describe('isStructuralChapter', () => {
  it('names the six module labels as structural', () => {
    for (const label of ['Opening', 'Scripture', 'Word study', 'Reflect', 'Prayer', 'Takeaway']) {
      expect(isStructuralChapter(label)).toBe(true)
    }
  })

  it('treats an editorial heading as editorial', () => {
    expect(isStructuralChapter('The Tabernacle Principle')).toBe(false)
    expect(isStructuralChapter("The Spiritual Commuter's Dilemma")).toBe(false)
    expect(isStructuralChapter('Unplowed Ground')).toBe(false)
  })

  it('is case- and whitespace-insensitive', () => {
    expect(isStructuralChapter('  scripture ')).toBe(true)
    expect(isStructuralChapter('WORD STUDY')).toBe(true)
  })

  it('splits the catalog the way it was measured', () => {
    const entries = Object.values(manifest as Record<string, Entry>)
    let structural = 0
    let total = 0
    for (const entry of entries) {
      for (const chapter of entry.chapters ?? []) {
        total += 1
        if (isStructuralChapter(chapter.label)) structural += 1
      }
    }
    // If this drifts, the tier list has gone out of step with the corpus and
    // the design's premise needs re-measuring rather than the number nudging.
    expect(total).toBe(6132)
    // 568 Opening + 687 Scripture + 590 Word study + 592 Reflect + 520 Prayer
    // + 487 Takeaway = 3,444, plus the two stragglers the set also covers:
    // 3 "Title" and 4 "Reflection". 3,451 of 6,132 is 56.3%.
    expect(structural).toBe(3451)
  })
})

/**
 * Two readings in the catalog have only ONE editorial chapter, and both are
 * day-7 sabbath readings whose single non-module heading is "Sabbath":
 *
 *   all-these-things-day-7   Opening · Scripture · Sabbath · Reflect · Prayer
 *   drawing-near-day-7       Opening · Scripture · Sabbath · Scripture · Reflect · Prayer
 *
 * That is a true property of a short liturgical reading, not a gap in the tier
 * list — the only way to give them a second editorial chapter would be to
 * un-tier Prayer or Scripture, which defeats the purpose. The player must
 * therefore cope with a reading whose ticks are nearly all short, and this test
 * is pinned to the two known slugs so a THIRD one going thin fails the build.
 */
describe('every reading still has something to navigate by', () => {
  const KNOWN_THIN = ['all-these-things-day-7', 'drawing-near-day-7']

  it('has exactly the two known thin readings', () => {
    const thin: string[] = []
    for (const [slug, entry] of Object.entries(manifest as Record<string, Entry>)) {
      const editorial = (entry.chapters ?? []).filter((c) => !isStructuralChapter(c.label))
      if (editorial.length < 2) thin.push(slug)
    }
    expect(thin.sort()).toEqual([...KNOWN_THIN].sort())
  })
})

describe('sectionBack', () => {
  const chapters = [
    { t: 0, label: 'Opening', module: 0 },
    { t: 60, label: 'Unplowed Ground', module: 1 },
    { t: 200, label: 'Prayer', module: 2 },
  ]

  it('restarts the current section when it is under way', () => {
    // 150s is 90s into "Unplowed Ground". "Back" means restart it, which is
    // what every audiobook player does and what a listener means by back.
    expect(sectionBack(chapters, 150, 300)).toBe(60)
  })

  it('goes to the previous section when this one has only just begun', () => {
    expect(sectionBack(chapters, 62, 300)).toBe(0)
  })

  it('stays at zero in the first section', () => {
    expect(sectionBack(chapters, 1, 300)).toBe(0)
  })

  it('returns null with no chapters rather than guessing', () => {
    expect(sectionBack(undefined, 10, 300)).toBeNull()
    expect(sectionBack([], 10, 300)).toBeNull()
  })
})
