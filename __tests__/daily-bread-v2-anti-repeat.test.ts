// @vitest-environment node
/**
 * Plan §42–43 (SA-142 / F-184): the anti-repetition engine across archetype,
 * hero, Gallery work and artist, historical author, procedural renderer, game
 * and module order — hard exclusions, soft penalties, and the plain-language
 * explanation the preview shows. Every pick is deterministic.
 */
import { describe, expect, it } from 'vitest'
import { ARCHETYPES, MODULE_TIERS } from '@/lib/daily-bread/composition/archetypes'
import { chooseArchetype, composeEdition, expectedHero, heroGroup, type CompositionContext } from '@/lib/daily-bread/composition/compose'
import { createRunLogger } from '@/lib/daily-bread/log'
import { createDailyBreadEdition } from '@/lib/daily-bread/orchestrator'
import { editionSeed, hashString } from '@/lib/daily-bread/prng'
import { MemoryDailyBreadRepository } from '@/lib/daily-bread/repository/memory'
import { offlineSources } from '@/lib/daily-bread/e2e'
import { addDays, fixedClock } from '@/lib/daily-bread/time'
import type { ArchetypeId, EditionDocument, EditionModuleType, HeroVariant } from '@/lib/daily-bread/types'
import { generateGallery, GALLERY_WORK_COOLDOWN_DAYS } from '@/lib/edition/generators/gallery'
import { pickVoiceForDay, VOICES } from '@/data/voices-bank'

const ALL_MODULES = Object.keys(MODULE_TIERS) as EditionModuleType[]
const D = (iso: string) => new Date(`${iso}T00:00:00Z`)

function ctx(date: string, extra: Partial<CompositionContext> = {}): CompositionContext {
  return {
    dateSlug: date,
    seed: hashString(editionSeed(date)),
    weekday: D(date).getUTCDay(),
    season: 'ordinary',
    dayLabel: 'Ordinary Time',
    primaryReference: 'Matthew 6:33',
    recentArchetypes: [],
    ...extra,
  }
}

describe('Gallery cooldown (plan §42)', () => {
  it('without history the SA-090 pick is unchanged', async () => {
    const plain = await generateGallery(D('2026-09-16'))
    const again = await generateGallery(D('2026-09-16'), undefined, {})
    expect(again).toEqual(plain)
  })

  it('never hangs a work hung within 60 days, and prefers artists not hung this week', async () => {
    const date = D('2026-09-16')
    const yesterday = (await generateGallery(new Date(Date.UTC(2026, 8, 15)))).map((g) => g.payload)
    // Tomorrow's natural arms overlap heavily with works hung 20 days earlier.
    const twentyDaysAgo = (await generateGallery(new Date(Date.UTC(2026, 7, 27)))).map((g) => g.payload)
    const natural = (await generateGallery(date)).map((g) => g.payload.image)
    const recent = [
      ...yesterday.map((p) => ({ image: p.image, artist: p.artist, daysAgo: 1 })),
      ...twentyDaysAgo.map((p) => ({ image: p.image, artist: p.artist, daysAgo: 20 })),
    ]
    const notes: string[] = []
    const plates = (await generateGallery(date, undefined, { recent, notes })).map((g) => g.payload)
    expect(plates).toHaveLength(7)
    const resting = new Set(recent.map((r) => r.image))
    expect(natural.some((img) => resting.has(img))).toBe(true) // the cooldown had real work to do
    for (const p of plates) expect(resting.has(p.image), p.image).toBe(false)
    const weekArtists = new Set(yesterday.map((p) => p.artist))
    expect(plates.filter((p) => weekArtists.has(p.artist)).length).toBeLessThanOrEqual(
      notes.some((n) => n.includes('artist hung in the last week')) ? 7 : 0,
    )
    expect(new Set(plates.map((p) => p.image)).size).toBe(7)
    expect(notes.some((n) => n.startsWith('gallery: 14 work(s) resting'))).toBe(true)
    // Deterministic.
    expect((await generateGallery(date, undefined, { recent })).map((g) => g.payload)).toEqual(plates)
  })

  it('when the pool is too small for the rest, the longest-rested works return first and a note says so', async () => {
    const all = (
      await Promise.all(Array.from({ length: 21 }, (_, i) => generateGallery(new Date(Date.UTC(2026, 6, 1 + i)))))
    ).flatMap((items, i) => items.map((g) => ({ image: g.payload.image, artist: g.payload.artist, daysAgo: 1 + i * 2 })))
    const notes: string[] = []
    const plates = (await generateGallery(D('2026-09-16'), undefined, { recent: all, notes })).map((g) => g.payload)
    expect(plates).toHaveLength(7)
    expect(notes.some((n) => n.includes('the pool is small for a 60-day rest'))).toBe(true)
    const freshest = new Set(all.filter((r) => r.daysAgo <= 7).map((r) => r.image))
    for (const p of plates) expect(freshest.has(p.image)).toBe(false)
    expect(GALLERY_WORK_COOLDOWN_DAYS).toBe(60)
  })
})

describe('historical voices (plan §42)', () => {
  it('skips a quote printed in the last 30 days and, where possible, an author from the last week', () => {
    const date = D('2026-09-16')
    const natural = pickVoiceForDay(date)
    expect(pickVoiceForDay(date, {})).toEqual(natural)
    const skipQuote = pickVoiceForDay(date, { recent: [{ quote: natural.quote, author: 'nobody', daysAgo: 25 }] })
    expect(skipQuote.quote).not.toBe(natural.quote)
    const skipAuthor = pickVoiceForDay(date, { recent: [{ quote: 'x', author: natural.author, daysAgo: 3 }] })
    expect(skipAuthor.author).not.toBe(natural.author)
    // An author rested longer than a week is fair game again.
    expect(pickVoiceForDay(date, { recent: [{ quote: 'x', author: natural.author, daysAgo: 8 }] })).toEqual(natural)
    expect(VOICES.length).toBeGreaterThan(100)
  })
})

describe('archetype and hero (plan §42 hard exclusions, §43 explanation)', () => {
  it('never opens with yesterday’s hero when another archetype is eligible, and says why a higher score lost', () => {
    const present = new Set(ALL_MODULES)
    for (const hero of ['scene', 'lead-with-rail', 'prayer', 'scripture'] as HeroVariant[]) {
      const choice = chooseArchetype(ctx('2026-09-20', { recentHeroes: [hero] }), present)
      expect(heroGroup(expectedHero(ARCHETYPES[choice.archetype], present)), `${hero} -> ${choice.archetype}`).not.toBe(heroGroup(hero))
      expect(choice.scoring.find((s) => s.archetype === choice.archetype)?.why).toMatch(/— chosen$/)
      for (const s of choice.scoring) {
        const top = choice.scoring.find((x) => x.archetype === choice.archetype)!
        if (s.score > top.score) expect(s.why).toMatch(/passed over: (printed yesterday|same hero as yesterday)/)
      }
      expect(choice.scoring.every((s) => typeof s.why === 'string' && s.why.length > 0)).toBe(true)
    }
  })

  it('60 simulated days: no consecutive heroes or archetypes, and no module order repeats within two weeks', () => {
    const recentArchetypes: ArchetypeId[] = []
    const recentHeroes: (HeroVariant | undefined)[] = []
    const recentPrinted: EditionModuleType[][] = []
    const orders: string[] = []
    for (let i = 0; i < 60; i++) {
      const date = new Date(Date.UTC(2026, 8, 1 + i)).toISOString().slice(0, 10)
      const m = composeEdition(ctx(date, { recentArchetypes, recentHeroes, recentPrinted }), ALL_MODULES)
      // One lead-led front page never follows another: at phone width they look the same.
      if (recentHeroes[0]) expect(heroGroup(m.heroVariant), date).not.toBe(heroGroup(recentHeroes[0]))
      if (recentArchetypes[0]) expect(m.archetype, date).not.toBe(recentArchetypes[0])
      const order = m.moduleOrder!.join(',')
      expect(orders.slice(0, 14), `${date} repeats a module order`).not.toContain(order)
      orders.unshift(order)
      recentArchetypes.unshift(m.archetype)
      recentHeroes.unshift(m.heroVariant)
      recentPrinted.unshift(m.moduleOrder!)
    }
  })
})

describe('the build applies the cooldowns and explains them (plan §43)', () => {
  it('a week of builds: no Gallery work rehung, renderer and hero never repeat day to day, and explanations name the cooldowns', async () => {
    const repo = new MemoryDailyBreadRepository()
    const docs: EditionDocument[] = []
    for (let i = 0; i < 6; i++) {
      const date = addDays('2026-09-14', i)
      const out = await createDailyBreadEdition(date, {
        repo,
        sources: offlineSources(),
        providers: [],
        clock: fixedClock(`${addDays(date, -1)}T23:00:00Z`),
        logger: createRunLogger(`ar-${date}`, { sink: () => {} }),
        trigger: 'e2e',
        policy: 'deterministic-only',
      })
      expect(out.result, out.reason).toBe('ready')
      docs.push(out.document!)
    }
    const works = (d: EditionDocument) =>
      d.modules.flatMap((m) => (m.type === 'gallery' ? m.plates.map((p) => p.image) : []))
    const hung = docs.filter((d) => works(d).length > 0)
    expect(hung.length).toBeGreaterThanOrEqual(2) // the Gallery rotates, so check the days it hung
    const all = hung.flatMap(works)
    expect(new Set(all).size).toBe(all.length)
    expect(hung[1].composition.explanations?.some((n) => /^gallery: \d+ work\(s\) resting/.test(n))).toBe(true)
    const renderer = (d: EditionDocument) => d.modules.flatMap((m) => (m.type === 'scene' ? [m.renderer] : []))[0]
    for (let i = 1; i < docs.length; i++) {
      expect(renderer(docs[i])).not.toBe(renderer(docs[i - 1]))
      expect(docs[i].composition.heroVariant).not.toBe(docs[i - 1].composition.heroVariant)
      expect(docs[i].composition.scoring.every((s) => typeof s.why === 'string')).toBe(true)
    }
  }, 180_000)
})
