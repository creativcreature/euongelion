// @vitest-environment node
/**
 * Daily Bread V2 pipeline (SA-142 / F-184): lifecycle and quality are
 * orthogonal; the scheduler builds before rollover and publishes after;
 * failure injection at every stage records an attempt and never leaves a
 * half-built edition; backfill never consumes an issue; health reports
 * honestly; the E2E and total-AI-outage scenarios pass.
 */
import { describe, expect, it } from 'vitest'
import { createRunLogger } from '@/lib/daily-bread/log'
import {
  createDailyBreadEdition,
  decideQuality,
  runDailyBread,
  type PipelineDeps,
} from '@/lib/daily-bread/orchestrator'
import { publishDailyBreadEdition } from '@/lib/daily-bread/publish'
import { MemoryDailyBreadRepository } from '@/lib/daily-bread/repository/memory'
import { failingProvider, offlineSources, runInMemoryE2E } from '@/lib/daily-bread/e2e'
import { runBackfill } from '@/lib/daily-bread/backfill'
import { getDailyBreadHealth } from '@/lib/daily-bread/health'
import { addDays, fixedClock } from '@/lib/daily-bread/time'
import { repairComics } from '@/lib/daily-bread/maintenance'
import { buildBaseEdition, leadPlateRegistryLink } from '@/lib/daily-bread/modules/build'
import { getSeriesHero } from '@/lib/series-hero'
import type { TextProvider } from '@/lib/daily-bread/providers/types'

const quietLogger = (id: string) => createRunLogger(id, { sink: () => {} })
const noSleep = async () => {}

function deps(repo: MemoryDailyBreadRepository, at: string, extra: Partial<PipelineDeps> = {}): PipelineDeps {
  return {
    repo,
    sources: offlineSources(),
    providers: [],
    clock: fixedClock(at),
    logger: quietLogger(`t-${at}`),
    trigger: 'e2e',
    policy: 'deterministic-only',
    sleep: noSleep,
    providerTimeoutMs: 2000,
    ...extra,
  }
}

describe('quality is orthogonal to lifecycle', () => {
  it('decides normal / fallback / minimum from what happened', () => {
    const base = {
      policy: 'full' as const,
      frameFallbackLevel: 0 as const,
      comicLevel: 'approved-art' as const,
      scriptureSource: 'devotional' as const,
      hasLead: true,
      hasReading: true,
      failedModules: [] as string[],
    }
    expect(decideQuality(base)).toBe('normal')
    // Plan §30: the backup provider writing the frame is a meaningful alternate provider.
    expect(decideQuality({ ...base, frameFallbackLevel: 1 })).toBe('fallback')
    expect(decideQuality({ ...base, frameFallbackLevel: 2 })).toBe('fallback')
    expect(decideQuality({ ...base, policy: 'deterministic-only', frameFallbackLevel: 2 })).toBe('normal')
    expect(decideQuality({ ...base, comicLevel: 'archive-reprint' })).toBe('fallback')
    expect(decideQuality({ ...base, comicLevel: 'omitted' })).toBe('fallback')
    expect(decideQuality({ ...base, failedModules: ['crossword'] })).toBe('fallback')
    expect(decideQuality({ ...base, hasReading: false })).toBe('minimum')
    expect(
      decideQuality({ ...base, failedModules: ['practice', 'word', 'prayer', 'redLetter', 'proverb', 'memoryVerse', 'question', 'voices', 'season', 'hymn'] }),
    ).toBe('minimum')
  })

  it('a fallback edition is still a real, numbered, published edition', async () => {
    const repo = new MemoryDailyBreadRepository()
    const d = deps(repo, '2026-09-14T11:30:00Z', {
      policy: 'full',
      providers: [failingProvider('claude-api'), failingProvider('gemini')],
    })
    const built = await createDailyBreadEdition('2026-09-14', d)
    expect(built).toMatchObject({ result: 'ready', quality: 'fallback' })
    const pub = await publishDailyBreadEdition('2026-09-14', d)
    expect(pub).toMatchObject({ result: 'published', issue: 1 })
    const e = await repo.getEdition('2026-09-14')
    expect(e).toMatchObject({ lifecycle: 'published', quality: 'fallback', issue: 1, volume: 1 })
  }, 60_000)
})

describe('lead plate policy (no arbitrary image use)', () => {
  it('rotation days lead with the series art; no keyword-matched library print is ever the lead', async () => {
    for (const date of ['2026-09-12', '2026-09-13', '2026-09-14', '2026-09-15']) {
      const base = await buildBaseEdition(date, offlineSources())
      const plate = base.lead?.plate
      expect(plate?.kind, date).not.toBe('print')
      if (base.lead && !base.lead.authored && plate) {
        expect(plate.kind).toBe('series-hero')
        // Registry linkage: the frozen id resolves back to the art it came from.
        const link = leadPlateRegistryLink(plate)
        expect(link, date).toEqual({ registry: 'series-hero', key: base.lead.seriesSlug })
        expect(getSeriesHero(link!.key)?.src).toBe(plate.src)
      }
    }
  }, 60_000)

  it('an authored Sunday feature carries no plate unless one was made for it', async () => {
    const sources = offlineSources()
    sources.liveEditionItems = async () => ({
      lead: [
        {
          id: '22222222-2222-2222-2222-222222222222',
          kind: 'lead',
          publishDate: '2026-09-13',
          slot: 0,
          status: 'published',
          payload: {
            mode: 'authored',
            title: 'The Stranger Who Was Never Gone',
            standfirst: 'Two travelers and a stranger on the road.',
            body: 'First paragraph.\n\nSecond paragraph.',
            scriptureReference: 'Luke 24:13-18',
          },
        },
      ],
    })
    const without = await buildBaseEdition('2026-09-13', sources)
    expect(without.lead).toMatchObject({ authored: true })
    expect(without.lead?.plate).toBeUndefined()
    // A plate made for the day, and really there (plan §55 checks it at build).
    sources.assetAvailable = async () => true
    sources.generatedLeadArt = async () => ({
      src: '/images/edition/guide-lectio.webp',
      width: 1200,
      height: 800,
      subject: 's',
      alt: 'A made-for-the-day plate',
    })
    const withPlate = await buildBaseEdition('2026-09-13', sources)
    expect(withPlate.lead?.plate).toMatchObject({ kind: 'generated-plate' })
    expect(leadPlateRegistryLink(withPlate.lead!.plate!)).toEqual({ registry: 'lead-art-generated', key: '2026-09-13' })
    expect(leadPlateRegistryLink({ id: 'print:vasari-12' })).toBeNull()
  }, 60_000)
})

describe('Echo & Dust restored on published editions', () => {
  it('replaces stand-in strips by revision, keeps correct ones, removes the section before the first strip ran', async () => {
    const repo = new MemoryDailyBreadRepository()
    const published = async (date: string) => {
      const d = deps(repo, `${date}T11:30:00Z`)
      expect(await createDailyBreadEdition(date, { ...d, clock: fixedClock(`${addDays(date, -1)}T23:00:00Z`) })).toMatchObject({ result: 'ready' })
      await publishDailyBreadEdition(date, d)
      return (await repo.getEdition(date))!
    }
    // Four published editions, each frozen with a LEGACY silhouette strip.
    for (const date of ['2026-08-19', '2026-08-21', '2026-08-22', '2026-08-25', '2026-08-26']) {
      const e = await published(date)
      await repo.createRevision(date, 'seed legacy comic', {
        modules: [
          ...e.modules.filter((m) => m.type !== 'comic'),
          { type: 'comic', level: 'deterministic-script', title: 'The Lost Sheep', caption: '', script: { id: 'the-lost-sheep', title: 'The Lost Sheep', scriptureReference: 'Luke 15:4-5', panels: [] } },
        ],
      })
    }
    const img = (n: string) => `/images/edition/strip/${n}.jpg`
    // The founder-APPROVED strips (daily-strip era), as publishedStripBank returns them.
    const bank = [
      { id: 'r1', publishDate: '2026-08-20', panelId: 'echo-dust-001-microwave-minute', image: img('a'), width: 1512, height: 745, alt: 'Echo & Dust', caption: 'Echo & Dust — No. 1: The Microwave Minute' },
      { id: 'r2', publishDate: '2026-08-21', panelId: 'echo-dust-005-windowseat', image: img('b'), width: 1512, height: 745, alt: 'Echo & Dust', caption: 'Echo & Dust — No. 2: The Window Seat' },
    ]
    const sources = { publishedStrips: async () => bank, assetAvailable: async () => true }

    const dry = await repairComics({ repo, sources, from: '2026-08-19', to: '2026-08-26', dryRun: true })
    expect(dry.revised.map((c) => [c.date, c.to])).toEqual([
      ['2026-08-19', 'none'], // before any approved strip
      ['2026-08-21', 'approved-art:echo-dust-005-windowseat'], // its own approved strip
      ['2026-08-22', 'none'], // same week, nothing approved before the week began
      ['2026-08-25', 'archive-reprint:echo-dust-001-microwave-minute'], // the week of Aug 24: one reprint…
      ['2026-08-26', 'archive-reprint:echo-dust-001-microwave-minute'], // …all week
    ])
    expect(dry.missing).toEqual(['2026-08-20', '2026-08-23', '2026-08-24'])
    expect((await repo.getEdition('2026-08-25'))!.modules.find((m) => m.type === 'comic')).toMatchObject({ script: { id: 'the-lost-sheep' } })

    const real = await repairComics({ repo, sources, from: '2026-08-19', to: '2026-08-26', dryRun: false })
    expect(real.failed).toEqual([])
    const aug25 = (await repo.getEdition('2026-08-25'))!
    expect(aug25.modules.find((m) => m.type === 'comic')).toMatchObject({ level: 'archive-reprint', stripId: 'echo-dust-001-microwave-minute', firstRan: '2026-08-20' })
    expect(aug25.generation.comicLevel).toBe('archive-reprint')
    expect(aug25.issue).toBe(4)
    expect((await repo.getEdition('2026-08-19'))!.modules.some((m) => m.type === 'comic')).toBe(false)
    expect((await repo.getRevisions('2026-08-25')).map((r) => r.revision)).toEqual([1, 2, 3])

    // Idempotent: a second pass changes nothing.
    const again = await repairComics({ repo, sources, from: '2026-08-19', to: '2026-08-26', dryRun: false })
    expect(again.revised).toEqual([])
  }, 180_000)
})

describe('domain records (plan §9)', () => {
  it('a persisted edition carries its id and timestamps; its revisions are readable, oldest first', async () => {
    let now = new Date('2026-09-14T11:05:00Z')
    const repo = new MemoryDailyBreadRepository({ now: () => now })
    const d = deps(repo, '2026-09-14T11:05:00Z')
    expect(await createDailyBreadEdition('2026-09-14', d)).toMatchObject({ result: 'ready' })
    await publishDailyBreadEdition('2026-09-14', d)
    const published = await repo.getEdition('2026-09-14')
    expect(published?.id).toMatch(/^mem-/)
    expect(published?.createdAt).toBe('2026-09-14T11:05:00.000Z')
    expect(published?.updatedAt).toBe('2026-09-14T11:05:00.000Z')

    now = new Date('2026-09-14T15:00:00Z')
    await repo.createRevision('2026-09-14', 'a typo in the deck', { deck: 'Corrected deck.' })
    const revised = await repo.getEdition('2026-09-14')
    expect(revised?.updatedAt).toBe('2026-09-14T15:00:00.000Z')
    expect(revised?.createdAt).toBe(published?.createdAt)

    const revisions = await repo.getRevisions('2026-09-14')
    expect(revisions.map((r) => [r.revision, r.reason, r.editionId])).toEqual([
      [1, 'initial publication', published!.id],
      [2, 'a typo in the deck', published!.id],
    ])
    expect(revisions[0].snapshot.deck).toBe(published!.deck)
    expect(revisions[1].snapshot).toMatchObject({ deck: 'Corrected deck.', issue: 1, volume: 1 })
    expect(revisions[1].createdAt).toBe('2026-09-14T15:00:00.000Z')
    expect(await repo.getRevisions('2030-01-01')).toEqual([])
  }, 60_000)
})

describe('failure injection', () => {
  it('a repository failure at mark-ready fails the attempt, releases the lease, and records it', async () => {
    const repo = new MemoryDailyBreadRepository()
    repo.failOn.markReady = new Error('connection reset')
    const out = await createDailyBreadEdition('2026-09-14', deps(repo, '2026-09-13T23:00:00Z'))
    expect(out.result).toBe('failed')
    expect(await repo.getLifecycle('2026-09-14')).toBe('draft')
    repo.failOn = {}
    const attempts = await repo.recentAttempts(5)
    expect(attempts[0]).toMatchObject({ publicationResult: 'failed', targetDate: '2026-09-14' })
    expect(attempts[0].errors[0].message).toContain('connection reset')
    // The next run recovers.
    expect((await createDailyBreadEdition('2026-09-14', deps(repo, '2026-09-13T23:10:00Z'))).result).toBe('ready')
  }, 60_000)

  it('a module that throws is recorded and the paper still builds', async () => {
    const repo = new MemoryDailyBreadRepository()
    const sources = offlineSources()
    const realLookup = sources.lookupVerse
    let first = true
    sources.lookupVerse = async (ref) => {
      if (first) {
        first = false
        throw new Error('corpus read failed')
      }
      return realLookup(ref)
    }
    const out = await createDailyBreadEdition('2026-09-14', deps(repo, '2026-09-13T23:00:00Z', { sources }))
    expect(out.result).toBe('ready')
    expect(out.document?.generation.moduleFailures.map((f) => f.module)).toContain('scripture')
    expect(out.quality).not.toBe('normal')
  }, 60_000)

  it('a publish failure is reported, and publishing never happens before rollover', async () => {
    const repo = new MemoryDailyBreadRepository()
    await createDailyBreadEdition('2026-09-14', deps(repo, '2026-09-13T23:00:00Z'))
    const early = await publishDailyBreadEdition('2026-09-14', deps(repo, '2026-09-14T10:59:00Z'))
    expect(early.result).toBe('too_early')
    repo.failOn.publish = new Error('deadlock detected')
    const failed = await publishDailyBreadEdition('2026-09-14', deps(repo, '2026-09-14T11:01:00Z'))
    expect(failed.result).toBe('failed')
    expect(await repo.getLifecycle('2026-09-14')).toBe('ready')
  }, 60_000)

  it('a reviewed item rejected after the build sends the edition back to be rebuilt', async () => {
    const repo = new MemoryDailyBreadRepository()
    const d = deps(repo, '2026-09-13T23:00:00Z')
    const built = await createDailyBreadEdition('2026-09-14', d)
    // Simulate a build that used a reviewed strip row.
    const doc = built.document!
    ;(await repo.reopenReady('2026-09-14')) &&
      (await repo.acquireAssembly('2026-09-14', 'x')) &&
      (await repo.markReady('2026-09-14', 'x', { ...doc, generation: { ...doc.generation, sourceItemIds: ['11111111-1111-1111-1111-111111111111'] } }))
    const out = await publishDailyBreadEdition('2026-09-14', {
      ...deps(repo, '2026-09-14T11:05:00Z'),
      rejectedSourceItems: async (ids) => ids,
    })
    expect(out.result).toBe('rebuild_required')
    expect(await repo.getLifecycle('2026-09-14')).toBe('draft')
  }, 60_000)

  it('a hung provider is bounded by the timeout and the chain still completes', async () => {
    const hung: TextProvider = {
      id: 'claude-api',
      model: 'm',
      available: () => true,
      generate: (req) => new Promise((_, reject) => req.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))),
    }
    const repo = new MemoryDailyBreadRepository()
    const started = Date.now()
    const out = await createDailyBreadEdition(
      '2026-09-14',
      deps(repo, '2026-09-13T23:00:00Z', { policy: 'full', providers: [hung], providerTimeoutMs: 50, providerRetries: 0 }),
    )
    expect(out.result).toBe('ready')
    expect(Date.now() - started).toBeLessThan(30_000)
    expect(out.document?.generation.usage.some((u) => u.provider === 'claude-api' && !u.ok)).toBe(true)
    // Plan §27: the frame's provenance names its writer, prompt version and fallback level.
    expect(out.document?.generation).toMatchObject({
      primaryProvider: 'claude-api',
      provider: 'deterministic',
      promptVersion: 3,
      fallbackLevel: 2,
      generatedAt: expect.any(String),
    })
    expect(out.document?.generation.usage.every((u) => u.task !== 'editorial-frame' || u.promptVersion === 3)).toBe(true)
    // Plan §37: the manifest archives the scene as printed and the renderer version.
    const scene = out.document?.modules.find((m) => m.type === 'scene')
    expect(out.document?.composition).toMatchObject({
      procedural: { scene: (scene as { scene: string }).scene, renderer: (scene as { renderer: string }).renderer, seed: (scene as { seed: number }).seed },
      rendererVersion: out.document?.rendererVersion,
      moduleOrder: out.document?.composition.placements.map((p) => p.module),
    })
  }, 60_000)
})

describe('publication metrics (plan §28 step 34)', () => {
  it('a publication emits one success event with serial, quality, fallback level and lateness', async () => {
    const repo = new MemoryDailyBreadRepository()
    await createDailyBreadEdition('2026-09-14', deps(repo, '2026-09-13T23:00:00Z'))
    const lines: string[] = []
    const logger = createRunLogger('t-metrics', { sink: (_level, line) => lines.push(line) })
    const at = '2026-09-14T11:15:00Z' // 7:15am EDT: 15 minutes after the 7:00 rollover
    await publishDailyBreadEdition('2026-09-14', { ...deps(repo, at), logger })
    await publishDailyBreadEdition('2026-09-14', { ...deps(repo, at), logger }) // already published: no second event
    const events = lines.map((l) => JSON.parse(l.slice(l.indexOf('{')))).filter((e) => e.event === 'edition_published')
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      dateSlug: '2026-09-14',
      issue: 1,
      quality: expect.stringMatching(/^(normal|fallback|minimum)$/),
      fallbackLevel: 2,
      frameProvider: 'deterministic',
      secondsAfterRollover: 900,
    })
  }, 60_000)
})

describe('scheduler', () => {
  it('publishes the live paper and builds tomorrow, idempotently', async () => {
    const repo = new MemoryDailyBreadRepository()
    const evening = await runDailyBread(deps(repo, '2026-09-13T23:00:00Z'))
    expect(evening.ok).toBe(true)
    expect(await repo.getLifecycle('2026-09-14')).toBe('ready')
    const again = await runDailyBread(deps(repo, '2026-09-13T23:05:00Z'))
    expect(again.actions.find((a) => a.date === '2026-09-14')?.result).toBe('skipped')
    await runDailyBread(deps(repo, '2026-09-14T11:02:00Z'))
    expect((await repo.getEdition('2026-09-14'))?.issue).toBe(2)
  }, 120_000)
})

describe('backfill', () => {
  it('publishes past dates as unnumbered archive entries and never touches today', async () => {
    const repo = new MemoryDailyBreadRepository()
    const result = await runBackfill({
      from: '2026-09-10',
      to: '2026-09-14',
      liveDate: '2026-09-13',
      deps: deps(repo, '2026-09-13T20:00:00Z'),
    })
    expect(result.published).toEqual(['2026-09-10', '2026-09-11', '2026-09-12'])
    expect(result.skipped.map((s) => s.date)).toEqual(['2026-09-13', '2026-09-14'])
    for (const d of result.published) {
      expect(await repo.getEdition(d)).toMatchObject({ archiveOrigin: 'backfilled', issue: null, volume: null })
    }
    // The first native edition is still No. 1.
    const d = deps(repo, '2026-09-13T20:00:00Z')
    await createDailyBreadEdition('2026-09-13', d)
    expect((await publishDailyBreadEdition('2026-09-13', d)).issue).toBe(1)
    await expect(runBackfill({ from: '2026-09-14', to: '2026-09-10', liveDate: '2026-09-13', deps: d })).rejects.toThrow()
  }, 120_000)
})

describe('backfill imports, never invents, never numbers (plan §81)', () => {
  it('a backfilled paper is the old paper: no written frame, rabbit holes, scene, reprint or rotation; no provider is called', async () => {
    const repo = new MemoryDailyBreadRepository()
    const calls: string[] = []
    const tattletale: TextProvider = {
      id: 'claude-api',
      model: 'm',
      available: () => true,
      async generate() {
        calls.push('called')
        return { text: '{}', model: 'm' }
      },
    }
    const sources = offlineSources()
    // An approved strip from BEFORE the date: a native paper would reprint it.
    sources.publishedStrips = async () => [
      { id: 'old-strip', publishDate: '2026-08-20', panelId: 'echo-dust-001', image: '/images/edition/strip/echo-dust-001b.jpg', width: 1745, height: 850, alt: 'Echo & Dust', caption: 'Echo & Dust — No. 1' },
    ]
    sources.assetAvailable = async () => true
    const result = await runBackfill({
      from: '2026-09-10',
      to: '2026-09-10',
      liveDate: '2026-09-13',
      deps: deps(repo, '2026-09-13T20:00:00Z', { sources, providers: [tattletale], policy: 'full' }),
    })
    expect(result.published).toEqual(['2026-09-10'])
    expect(calls).toEqual([])
    const e = (await repo.getEdition('2026-09-10'))!
    expect(e).toMatchObject({ archiveOrigin: 'backfilled', issue: null, deck: '' })
    const types = e.modules.map((m) => m.type)
    expect(types).not.toContain('rabbitHoles')
    expect(types).not.toContain('scene')
    expect(types).not.toContain('comic')
    expect(e.composition.rotation?.rested).toEqual([])
    expect(e.composition.placements.map((p) => p.module).sort()).toEqual([...types].sort())
    expect(e.generation.provider).toBeUndefined()
  }, 120_000)

  it('never publishes a native ready paper for a past date (that would spend an issue number)', async () => {
    const repo = new MemoryDailyBreadRepository()
    const d = deps(repo, '2026-09-11T23:00:00Z')
    expect((await createDailyBreadEdition('2026-09-12', d)).result).toBe('ready') // native, not yet published
    const result = await runBackfill({ from: '2026-09-12', to: '2026-09-12', liveDate: '2026-09-14', deps: deps(repo, '2026-09-14T20:00:00Z') })
    expect(result.published).toEqual([])
    expect(result.skipped[0]).toMatchObject({ date: '2026-09-12', reason: expect.stringContaining('never publishes a numbered paper') })
    expect(await repo.getLifecycle('2026-09-12')).toBe('ready')
    // The next native publication is still No. 1.
    expect((await publishDailyBreadEdition('2026-09-12', deps(repo, '2026-09-12T11:05:00Z'))).issue).toBe(1)
  }, 120_000)

  it('reimport-backfill revises an old-style backfilled edition to the import, never a native one, and a dry run writes nothing', async () => {
    const { reimportBackfilled, REIMPORT_REVISION_REASON } = await import('@/lib/daily-bread/maintenance')
    const repo = new MemoryDailyBreadRepository()
    // The first backfill built past dates like native papers (a written deck, rabbit holes, a scene).
    const native = deps(repo, '2026-09-09T23:00:00Z')
    expect((await createDailyBreadEdition('2026-09-10', native, { archiveOrigin: 'native' })).result).toBe('ready')
    const oldStyle = (await repo.getEdition('2026-09-10', { includeUnpublished: true }))!
    repo.seedPublished({
      ...oldStyle,
      id: undefined,
      editionDate: '2026-09-09',
      slug: '2026-09-09',
      lifecycle: 'published',
      archiveOrigin: 'backfilled',
      issue: null,
      volume: null,
      activeRevision: 1,
      publishedAt: '2026-09-13T20:00:00Z',
      deck: 'A written standfirst.',
    })
    await publishDailyBreadEdition('2026-09-10', deps(repo, '2026-09-10T11:05:00Z'))
    const buildImport = async (date: string) => {
      const mem = new MemoryDailyBreadRepository()
      const out = await createDailyBreadEdition(date, deps(mem, `${date}T11:00:00Z`), { archiveOrigin: 'backfilled' })
      return out.document!
    }
    const dry = await reimportBackfilled({ repo, buildImport, from: '2026-09-09', to: '2026-09-10', dryRun: true })
    expect(dry.revised.map((r) => r.date)).toEqual(['2026-09-09'])
    expect(dry.revised[0]).toMatchObject({ deck: 'removed' })
    expect(dry.revised[0].removed).toEqual(expect.arrayContaining(['scene', 'rabbitHoles']))
    expect(dry.skipped).toEqual([{ date: '2026-09-10', reason: 'native edition' }])
    expect(await repo.getRevisions('2026-09-09')).toHaveLength(0)
    const real = await reimportBackfilled({ repo, buildImport, from: '2026-09-09', to: '2026-09-10', dryRun: false })
    expect(real.revised.map((r) => r.date)).toEqual(['2026-09-09'])
    const revisions = await repo.getRevisions('2026-09-09')
    expect(revisions.at(-1)?.reason).toBe(REIMPORT_REVISION_REASON)
    const fixed = (await repo.getEdition('2026-09-09'))!
    expect(fixed).toMatchObject({ deck: '', issue: null, archiveOrigin: 'backfilled' })
    expect(fixed.modules.map((m) => m.type)).not.toContain('rabbitHoles')
    // Running it again finds nothing left to correct.
    expect((await reimportBackfilled({ repo, buildImport, from: '2026-09-09', to: '2026-09-09', dryRun: false })).unchanged).toEqual(['2026-09-09'])
  }, 180_000)
})

describe('health', () => {
  it('is down when today is missing long after rollover, ok once published', async () => {
    const repo = new MemoryDailyBreadRepository()
    const down = await getDailyBreadHealth(repo, fixedClock('2026-09-14T13:00:00Z'))
    expect(down.status).toBe('down')
    expect(down.alerts[0]).toContain('2026-09-14')
    // A complete paper includes the week's approved Echo & Dust strip; without one the
    // edition is honestly a fallback edition and health says so.
    const sources = offlineSources()
    sources.publishedStrips = async () => [
      { id: 'strip-row', publishDate: '2026-09-14', panelId: 'echo-dust-2026-09-14-test', image: '/images/edition/strip/echo-dust-001b.jpg', width: 1745, height: 850, alt: 'Echo & Dust', caption: 'Echo & Dust — test' },
    ]
    sources.assetAvailable = async () => true
    await runDailyBread(deps(repo, '2026-09-14T13:00:00Z', { sources }))
    const ok = await getDailyBreadHealth(repo, fixedClock('2026-09-14T13:05:00Z'))
    expect(ok.status).toBe('ok')
    expect(ok.live).toMatchObject({ lifecycle: 'published', issue: 1 })
    const nearRollover = await getDailyBreadHealth(repo, fixedClock('2026-09-15T10:00:00Z'))
    expect(nearRollover.status).toBe('degraded')
    expect(nearRollover.alerts.join(' ')).toContain('2026-09-15')
  }, 120_000)
})

describe('end to end', () => {
  it('passes the full in-memory publication run including the total AI outage', async () => {
    const report = await runInMemoryE2E()
    expect(report.checks.filter((c) => !c.ok)).toEqual([])
  }, 120_000)
})
