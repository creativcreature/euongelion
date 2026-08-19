import { describe, expect, it } from 'vitest'
import { getVerse, clearVerseCache } from '@/lib/bible/getVerse'
import { validateEditionItem } from '@/lib/edition/kinds'
import {
  generatePrayer,
  prayerForDate,
  PRAYER_CANON,
} from '@/lib/edition/generators/prayer'
import {
  generateWord,
  wordForDate,
  loadStrongsIndex,
  WORD_CANON,
} from '@/lib/edition/generators/word'

/** Mid-year window, plus a second window straddling 1 January below — the
 * index reset is part of the contract and is tested, not avoided. */
const WINDOW_START = Date.UTC(2026, 5, 1) // 2026-06-01
const BOUNDARY_START = Date.UTC(2026, 11, 15) // 2026-12-15 → into January
const DAY_MS = 86_400_000

function utcDay(offset: number): Date {
  return new Date(WINDOW_START + offset * DAY_MS)
}

/**
 * THE DEFECTIVE-EXTRACTION HEURISTIC.
 *
 * `public/lexicon-strongs.json` is built by flattening a lexicon article into
 * a single semicolon run, and for some words the flattener swept up the
 * article's *example clauses* instead of its glosses — "...; I love thee; ...",
 * "...; and they cast; on me; ...", "...; title-deed,". Fifteen entries were
 * dropped from WORD_CANON for exactly this. This gate exists so a future
 * re-curation of the canon cannot put them back silently.
 *
 * Three cheap signals, no parsing:
 *   1. the whole gloss ends in a comma or semicolon → truncated mid-list
 *   2. a ';'-segment is a bare function word, or ends in "the" → the run was
 *      split mid-phrase ("...; think of; on; mention of; ...")
 *   3. the gloss uses a personal pronoun → it is an example clause, not a
 *      gloss ("I love thee", "thy servant", "he caused", "my honour")
 *
 * "it"/"its" are deliberately NOT in the pronoun list: they occur in real
 * glosses (G5046 teleios — "having reached its end"). This is a floor, not a
 * proof — it cannot catch every bad extraction (G1343's "teaching of" took a
 * human eye) — but everything it does catch is a genuine defect.
 */
const BARE_FUNCTION_WORD =
  /^(on|at|for|of|to|in|with|by|from|and|or|the|a|an)$/i
const PERSONAL_PRONOUN =
  /\b(i|me|my|mine|thee|thy|thou|thine|we|us|our|ours|they|them|their|he|him|his|she|her|hers)\b/i

function extractionDefects(gloss: string): string[] {
  const defects: string[] = []
  if (/[,;]\s*$/.test(gloss)) defects.push('truncated mid-list')

  const pronoun = gloss.match(PERSONAL_PRONOUN)
  if (pronoun) defects.push(`example clause (pronoun "${pronoun[0]}")`)

  for (const segment of gloss.split(';').map((s) => s.trim())) {
    if (BARE_FUNCTION_WORD.test(segment)) {
      defects.push(`bare function word "${segment}"`)
    } else if (/\bthe$/i.test(segment)) {
      defects.push(`dangling determiner "${segment}"`)
    }
  }
  return defects
}

/**
 * The fifteen Strong's numbers curation removed. Two of them (H539 ʼāman,
 * G2098 euangelion) are not reachable by the heuristic above — their glosses
 * are well-formed English that simply never arrives at the sense the printed
 * reference carries — so they are named here explicitly.
 */
const DROPPED_FOR_DEFECTIVE_GLOSSES = [
  'H539',
  'H2142',
  'H3034',
  'H3335',
  'H3519',
  'H3820',
  'H5650',
  'H6960',
  'H7355',
  'H7812',
  'H8085',
  'G1343',
  'G2098',
  'G3466',
  'G5287',
]

describe('the Daily Prayer generator', () => {
  it('produces one approved slot-0 item for the date', async () => {
    const items = await generatePrayer(new Date('2026-06-01T00:00:00Z'))
    expect(items).toHaveLength(1)
    expect(items[0].kind).toBe('prayer')
    expect(items[0].publishDate).toBe('2026-06-01')
    expect(items[0].slot).toBe(0)
    expect(items[0].status).toBe('approved')
    expect(items[0].payload.translation).toBe('BSB')
    expect(items[0].payload.text.length).toBeGreaterThan(80)
    expect(items[0].payload.prayedBy.length).toBeGreaterThan(0)
  })

  it('prints the canon reference in the singular — "Psalm N", never "Psalms N"', async () => {
    // The BSB corpus names the book "Psalms", so getVerse's `canonical`
    // renders "Psalms 9" — how you cite the book, never how you cite one
    // psalm. 90 of the 146 canon entries are psalms, so taking the reference
    // from `canonical` was wrong on ~62% of days. The text still comes from
    // getVerse; only the reference is ours.
    const date = new Date('2026-06-01T00:00:00Z')
    expect(prayerForDate(date).reference).toBe('Psalm 9')

    const [item] = await generatePrayer(date)
    expect(item.payload.reference).toBe('Psalm 9')
    expect(item.payload.reference).not.toMatch(/^Psalms\b/)
    expect(item.payload.text).toContain(
      'I will give thanks to the LORD with all my heart',
    )
  })

  it('emits the canon reference verbatim for every day of a year', async () => {
    // Not just the psalms: whatever this file says is what the paper prints.
    for (let i = 0; i < 366; i++) {
      const date = new Date(Date.UTC(2026, 0, 1) + i * DAY_MS)
      const [item] = await generatePrayer(date)
      expect(item.payload.reference).toBe(prayerForDate(date).reference)
      expect(item.payload.reference).not.toMatch(/^Psalms\b/)
    }
  })

  it('is deterministic — the same UTC date always yields the same payload', async () => {
    const morning = await generatePrayer(new Date('2026-06-14T00:05:00Z'))
    const evening = await generatePrayer(new Date('2026-06-14T23:55:00Z'))
    expect(evening[0].publishDate).toBe(morning[0].publishDate)
    expect(evening[0].payload).toEqual(morning[0].payload)
  })

  it('never repeats a prayer across 30 consecutive days', async () => {
    const seen: string[] = []
    for (let i = 0; i < 30; i++) {
      const [item] = await generatePrayer(utcDay(i))
      seen.push(item.payload.reference)
    }
    expect(seen).toHaveLength(30)
    expect(new Set(seen).size).toBe(30)
  })

  it('changes the prayer from one day to the next', () => {
    for (let i = 0; i < 30; i++) {
      expect(prayerForDate(utcDay(i)).reference).not.toBe(
        prayerForDate(utcDay(i + 1)).reference,
      )
    }
  })

  it('resolves every entry in the canon through getVerse', async () => {
    clearVerseCache()
    expect(PRAYER_CANON.length).toBeGreaterThanOrEqual(120)

    const failures: string[] = []
    for (const entry of PRAYER_CANON) {
      try {
        const result = await getVerse(entry.reference, 'BSB')
        if (result.verses.length === 0) {
          failures.push(`${entry.reference}: no verses`)
        }
        if (result.text.trim().length === 0) {
          failures.push(`${entry.reference}: empty text`)
        }
      } catch (err) {
        failures.push(`${entry.reference}: ${(err as Error).message}`)
      }
    }
    expect(failures).toEqual([])
  })

  it('has no duplicate references in the canon', () => {
    const refs = PRAYER_CANON.map((entry) => entry.reference)
    expect(new Set(refs).size).toBe(refs.length)
  })

  it('validates as an edition item', async () => {
    for (let i = 0; i < 10; i++) {
      const [item] = await generatePrayer(utcDay(i))
      expect(validateEditionItem(item)).toBeNull()
    }
  })
})

describe('the Word of the day generator', () => {
  it('produces one approved slot-0 item for the date', async () => {
    const items = await generateWord(new Date('2026-06-01T00:00:00Z'))
    expect(items).toHaveLength(1)
    expect(items[0].kind).toBe('word')
    expect(items[0].publishDate).toBe('2026-06-01')
    expect(items[0].slot).toBe(0)
    expect(items[0].status).toBe('approved')
    expect(items[0].payload.gloss.length).toBeGreaterThan(0)
    expect(items[0].payload.source).toContain("Strong's")
    // `note` is our own voice and this generator has none.
    expect(items[0].payload.note).toBeUndefined()
  })

  it('is deterministic — the same UTC date always yields the same payload', async () => {
    const morning = await generateWord(new Date('2026-06-14T00:05:00Z'))
    const evening = await generateWord(new Date('2026-06-14T23:55:00Z'))
    expect(evening[0].publishDate).toBe(morning[0].publishDate)
    expect(evening[0].payload).toEqual(morning[0].payload)
  })

  it('never repeats a word across 30 consecutive days', async () => {
    const seen: string[] = []
    for (let i = 0; i < 30; i++) {
      const [item] = await generateWord(utcDay(i))
      seen.push(item.payload.strong)
    }
    expect(seen).toHaveLength(30)
    expect(new Set(seen).size).toBe(30)
  })

  it('changes the word from one day to the next', () => {
    for (let i = 0; i < 30; i++) {
      expect(wordForDate(utcDay(i)).strong).not.toBe(
        wordForDate(utcDay(i + 1)).strong,
      )
    }
  })

  it('stays at or above the 103-entry year-boundary safety floor', () => {
    // Below 103 the 29-day December tail reaches back far enough to collide
    // with the January indexes after the 1 January reset, and the no-repeat
    // guarantee breaks. Curation may drop entries; it may not go below this.
    expect(WORD_CANON.length).toBeGreaterThanOrEqual(103)
  })

  it('prints no gloss that is a defective lexicon extraction', () => {
    const index = loadStrongsIndex()

    const defective: string[] = []
    for (const curated of WORD_CANON) {
      const entry = index[curated.strong]
      if (!entry) {
        defective.push(`${curated.strong}: missing from the index`)
        continue
      }
      for (const defect of extractionDefects(entry.gloss)) {
        defective.push(`${curated.strong} — ${defect} — "${entry.gloss}"`)
      }
    }
    expect(defective).toEqual([])
  })

  it('keeps the known-defective Strong numbers out of the canon', () => {
    const strongs = new Set(WORD_CANON.map((c) => c.strong))
    const reintroduced = DROPPED_FOR_DEFECTIVE_GLOSSES.filter((s) =>
      strongs.has(s),
    )
    expect(reintroduced).toEqual([])
  })

  it('resolves every curated Strong number in the precomputed index', () => {
    expect(WORD_CANON.length).toBeGreaterThanOrEqual(103)
    const index = loadStrongsIndex()

    const missing: string[] = []
    for (const curated of WORD_CANON) {
      const entry = index[curated.strong]
      if (
        !entry ||
        !entry.word ||
        !entry.xlit ||
        !entry.gloss ||
        !entry.source
      ) {
        missing.push(curated.strong)
      }
    }
    expect(missing).toEqual([])
  })

  it('carries both languages and no duplicate Strong numbers', () => {
    const strongs = WORD_CANON.map((c) => c.strong)
    expect(new Set(strongs).size).toBe(strongs.length)
    expect(strongs.some((s) => s.startsWith('H'))).toBe(true)
    expect(strongs.some((s) => s.startsWith('G'))).toBe(true)
  })

  it('prints a scripture reference that actually exists', async () => {
    const failures: string[] = []
    for (const curated of WORD_CANON) {
      try {
        await getVerse(curated.reference, 'BSB')
      } catch (err) {
        failures.push(
          `${curated.strong} -> ${curated.reference}: ${(err as Error).message}`,
        )
      }
    }
    expect(failures).toEqual([])
  })

  it('validates as an edition item', async () => {
    for (let i = 0; i < 10; i++) {
      const [item] = await generateWord(utcDay(i))
      expect(validateEditionItem(item)).toBeNull()
    }
  })
})

describe('the year boundary (1 January index reset)', () => {
  function utcBoundaryDay(offset: number): Date {
    return new Date(BOUNDARY_START + offset * DAY_MS)
  }

  it('never repeats a prayer within a 30-day window straddling 1 January', async () => {
    const refs: string[] = []
    for (let i = 0; i < 30; i++) {
      const [item] = await generatePrayer(utcBoundaryDay(i))
      refs.push((item.payload as { reference: string }).reference)
    }
    expect(new Set(refs).size).toBe(30)
  })

  it('never repeats a word within a 30-day window straddling 1 January', async () => {
    const words: string[] = []
    for (let i = 0; i < 30; i++) {
      const [item] = await generateWord(utcBoundaryDay(i))
      words.push((item.payload as { strong: string }).strong)
    }
    expect(new Set(words).size).toBe(30)
  })
})
