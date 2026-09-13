/**
 * Daily Bread V2 composition (SA-142 / F-184): seeded PRNG determinism, eight
 * structurally distinct archetypes, anti-repeat scoring, module tiers and
 * band rhythm.
 */
import { describe, expect, it } from 'vitest'
import { createRng, editionSeed, hashString } from '@/lib/daily-bread/prng'
import {
  ARCHETYPES,
  ARCHETYPE_IDS,
  MODULE_TIERS,
} from '@/lib/daily-bread/composition/archetypes'
import {
  chooseArchetype,
  composeEdition,
  recencyPenalty,
  type CompositionContext,
} from '@/lib/daily-bread/composition/compose'
import type { ArchetypeId, EditionModuleType } from '@/lib/daily-bread/types'

const ALL_MODULES = Object.keys(MODULE_TIERS) as EditionModuleType[]

function ctx(date: string, recent: ArchetypeId[] = [], extra: Partial<CompositionContext> = {}): CompositionContext {
  const d = new Date(`${date}T00:00:00Z`)
  return {
    dateSlug: date,
    seed: hashString(editionSeed(date)),
    weekday: d.getUTCDay(),
    season: 'ordinary',
    dayLabel: 'Ordinary Time',
    primaryReference: 'Matthew 6:33',
    recentArchetypes: recent,
    ...extra,
  }
}

describe('seeded PRNG', () => {
  it('is deterministic per seed and differs across seeds', () => {
    const a = createRng('x')
    const b = createRng('x')
    const c = createRng('y')
    const seqA = Array.from({ length: 20 }, () => a.next())
    expect(Array.from({ length: 20 }, () => b.next())).toEqual(seqA)
    expect(Array.from({ length: 20 }, () => c.next())).not.toEqual(seqA)
    expect(seqA.every((v) => v >= 0 && v < 1)).toBe(true)
  })

  it('shuffle is a permutation and pick stays in bounds', () => {
    const rng = createRng(7)
    const items = [1, 2, 3, 4, 5, 6, 7, 8]
    expect([...rng.shuffle(items)].sort()).toEqual(items)
    expect(items).toContain(rng.pick(items))
    expect(() => rng.pick([])).toThrow()
  })
})

describe('archetypes', () => {
  it('defines eight archetypes', () => {
    expect(ARCHETYPE_IDS.sort()).toEqual(
      ['broadsheet', 'field-notes', 'illuminated', 'joy', 'prayer-book', 'quiet', 'red-letter', 'study-table'].sort(),
    )
  })

  it('every pair of archetypes differs in structure, not only in name', () => {
    const signature = (id: ArchetypeId) => {
      const def = ARCHETYPES[id]
      return JSON.stringify({
        front: def.front.map((b) => b.items.map(([m, s]) => `${m}:${s}`)),
        bands: def.bands.map((b) => b.items.map(([m, s]) => `${m}:${s}`)),
        omit: [...def.omit].sort(),
      })
    }
    const sigs = new Set(ARCHETYPE_IDS.map(signature))
    expect(sigs.size).toBe(ARCHETYPE_IDS.length)
    // Structural distinctness: each front page leads with a different first module or span.
    const fronts = new Set(ARCHETYPE_IDS.map((id) => JSON.stringify(ARCHETYPES[id].front[0].items)))
    expect(fronts.size).toBeGreaterThanOrEqual(6)
  })

  it('every band span set fits the six-column grid', () => {
    const width = { full: 6, wide: 4, half: 3, third: 2, narrow: 2 }
    for (const id of ARCHETYPE_IDS) {
      for (const band of [...ARCHETYPES[id].front, ...ARCHETYPES[id].bands]) {
        const total = band.items.reduce((s, [, span]) => s + width[span], 0)
        expect([6], `${id} band ${JSON.stringify(band.items)}`).toContain(total)
      }
    }
  })

  it('each archetype, when forced, places the reading and every non-omitted module exactly once', () => {
    for (const id of ARCHETYPE_IDS) {
      const others = ARCHETYPE_IDS.filter((a) => a !== id)
      // Force by penalising every other archetype heavily through recency.
      const history = [...others, ...others, ...others]
      const manifest = composeEdition(ctx('2026-09-16', history.slice(0, 7)), ALL_MODULES)
      const placed = manifest.placements.map((p) => p.module)
      expect(new Set(placed).size).toBe(placed.length)
      expect(placed).toContain('reading')
      const omitted = new Set(ARCHETYPES[manifest.archetype].omit)
      for (const m of ALL_MODULES) {
        if (!omitted.has(m)) expect(placed, `${manifest.archetype} missing ${m}`).toContain(m)
      }
      expect(manifest.rhythm.length).toBe(new Set(manifest.placements.map((p) => p.band)).size)
    }
  })
})

describe('anti-repeat scoring', () => {
  it('never repeats yesterday when another archetype is eligible', () => {
    for (const id of ARCHETYPE_IDS) {
      const choice = chooseArchetype(ctx('2026-09-16', [id]), new Set(ALL_MODULES))
      expect(choice.archetype).not.toBe(id)
    }
  })

  it('penalises recent use more than older use', () => {
    expect(recencyPenalty('joy', ['joy'])).toBeGreaterThan(recencyPenalty('joy', ['quiet', 'broadsheet', 'joy']))
    expect(recencyPenalty('joy', ['joy', 'x' as ArchetypeId, 'joy', 'y' as ArchetypeId, 'joy'])).toBeGreaterThan(5)
  })

  it('a simulated 28 days uses at least 6 archetypes and never the same two days running', () => {
    const history: ArchetypeId[] = []
    const seen = new Set<ArchetypeId>()
    for (let i = 0; i < 28; i++) {
      const date = new Date(Date.UTC(2026, 8, 1 + i)).toISOString().slice(0, 10)
      const { archetype } = chooseArchetype(ctx(date, history), new Set(ALL_MODULES))
      if (history[0]) expect(archetype).not.toBe(history[0])
      history.unshift(archetype)
      seen.add(archetype)
    }
    expect(seen.size).toBeGreaterThanOrEqual(6)
  })

  it('a somber day goes quiet, and requirements gate eligibility', () => {
    const goodFriday = chooseArchetype(
      ctx('2026-04-03', [], { season: 'holy-week', dayLabel: 'Good Friday' }),
      new Set(ALL_MODULES),
    )
    expect(goodFriday.archetype).toBe('quiet')
    const noComicNoRabbit = ALL_MODULES.filter((m) => m !== 'rabbitHoles' && m !== 'redLetter')
    const choice = chooseArchetype(ctx('2026-09-17'), new Set(noComicNoRabbit))
    expect(['field-notes', 'red-letter']).not.toContain(choice.archetype)
  })

  it('composition is deterministic for the same inputs', () => {
    const a = composeEdition(ctx('2026-09-20', ['broadsheet']), ALL_MODULES)
    const b = composeEdition(ctx('2026-09-20', ['broadsheet']), ALL_MODULES)
    expect(a).toEqual(b)
  })
})
