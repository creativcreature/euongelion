/**
 * Daily Bread V2 routes and rendering (SA-142 / F-184): the flag keeps the
 * SA-090 paper untouched when off; date routes 404 unless the flag is on and
 * the edition is published; the frozen document renders in every archetype
 * with its serial, navigation and no injected HTML; withdrawn editions do not
 * show their content.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import DailyBreadEdition from '@/components/daily-bread/DailyBreadEdition'
import { ARCHETYPE_IDS, ARCHETYPES } from '@/lib/daily-bread/composition/archetypes'
import { composeEdition } from '@/lib/daily-bread/composition/compose'
import { createRunLogger } from '@/lib/daily-bread/log'
import { createDailyBreadEdition } from '@/lib/daily-bread/orchestrator'
import { publishDailyBreadEdition } from '@/lib/daily-bread/publish'
import { MemoryDailyBreadRepository } from '@/lib/daily-bread/repository/memory'
import { toArchiveEntry } from '@/lib/daily-bread/repository/types'
import { offlineSources } from '@/lib/daily-bread/e2e'
import {
  formatArchiveMonth,
  loadArchiveMonth,
  loadEditionForDate,
  loadLiveEdition,
  serialLabel,
} from '@/lib/daily-bread/read'
import { fixedClock } from '@/lib/daily-bread/time'
import type { ArchetypeId, DailyEdition } from '@/lib/daily-bread/types'

vi.mock('@/components/EuangelionShellHeader', () => ({ default: () => null }))
vi.mock('@/components/SiteBottom', () => ({ default: () => null }))

const repo = new MemoryDailyBreadRepository()
let edition: DailyEdition

beforeAll(async () => {
  for (const [date, at] of [
    ['2026-09-13', '2026-09-13T12:00:00Z'],
    ['2026-09-14', '2026-09-14T11:30:00Z'],
    ['2026-09-15', '2026-09-15T11:30:00Z'],
  ] as const) {
    const d = {
      repo,
      sources: offlineSources(),
      providers: [],
      clock: fixedClock(at),
      logger: createRunLogger(`r-${date}`, { sink: () => {} }),
      trigger: 'e2e' as const,
      policy: 'deterministic-only' as const,
    }
    const built = await createDailyBreadEdition(date, d)
    if (built.result !== 'ready') throw new Error(`build failed: ${built.reason}`)
    await publishDailyBreadEdition(date, d)
  }
  edition = (await repo.getEdition('2026-09-14'))!
}, 180_000)

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('reader loaders', () => {
  it('live shows today when published, and yesterday with a notice flag when not', async () => {
    const today = await loadLiveEdition(fixedClock('2026-09-15T12:00:00Z'), repo)
    expect(today).toMatchObject({ liveDate: '2026-09-15', isFallbackToPrevious: false })
    expect(today.edition?.issue).toBe(3)
    const tomorrow = await loadLiveEdition(fixedClock('2026-09-16T12:00:00Z'), repo)
    expect(tomorrow).toMatchObject({ liveDate: '2026-09-16', isFallbackToPrevious: true })
    expect(tomorrow.edition?.editionDate).toBe('2026-09-15')
  })

  it('plan §31: the previous paper is "on the press" inside the grace window, then last-known-good', async () => {
    expect((await loadLiveEdition(fixedClock('2026-09-15T12:00:00Z'), repo)).status).toBe('current')
    // 7:10am EDT on Sep 16, nothing published yet: still going to press.
    expect(await loadLiveEdition(fixedClock('2026-09-16T11:10:00Z'), repo)).toMatchObject({ status: 'on-press', minutesAfterRollover: 10 })
    // 8:00am: past the 35-minute grace window. A failure, not a default.
    expect(await loadLiveEdition(fixedClock('2026-09-16T12:00:00Z'), repo)).toMatchObject({ status: 'last-known-good', minutesAfterRollover: 60 })
    // Before 7am the live date is still Sep 15, and Sep 15's paper is current.
    expect((await loadLiveEdition(fixedClock('2026-09-16T10:30:00Z'), repo)).status).toBe('current')
  })

  it('the live page names both dates over an older paper, and raises a critical alert only past the grace window', async () => {
    vi.stubEnv('DAILY_BREAD_V2', 'on')
    const render = async (status: string) => {
      vi.resetModules()
      vi.doMock('@/lib/daily-bread/read', async (orig) => ({
        ...(await orig<typeof import('@/lib/daily-bread/read')>()),
        loadLiveEdition: async () => ({
          liveDate: '2026-09-15',
          edition,
          neighbors: { previous: null, next: null },
          status,
          isFallbackToPrevious: status !== 'current',
          minutesAfterRollover: status === 'on-press' ? 10 : 90,
        }),
      }))
      const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
      const { default: Page } = await import('@/app/daily-bread/page')
      const html = renderToStaticMarkup(await Page())
      const critical = errors.mock.calls.map((c) => String(c[0])).filter((l) => l.includes('last_known_good_served'))
      errors.mockRestore()
      vi.doUnmock('@/lib/daily-bread/read')
      return { html, critical }
    }
    const onPress = await render('on-press')
    expect(onPress.html).toContain('Today’s paper (Tuesday, September 15, 2026) is still on the press. This is the most recent edition, from Monday, September 14, 2026.')
    expect(onPress.critical).toHaveLength(0)
    const lkg = await render('last-known-good')
    expect(lkg.html).toContain('Today’s paper (Tuesday, September 15, 2026) is delayed. This is the most recent edition, from Monday, September 14, 2026.')
    expect(lkg.html).not.toContain('That’s today’s bread.')
    expect(lkg.critical).toHaveLength(1)
    expect(JSON.parse(lkg.critical[0].slice(lkg.critical[0].indexOf('{')))).toMatchObject({
      level: 'critical',
      liveDate: '2026-09-15',
      servedDate: '2026-09-14',
      minutesAfterRollover: 90,
    })
  })

  it('date loader rejects invalid slugs and unpublished dates', async () => {
    expect(await loadEditionForDate('2026-02-30', repo)).toBeNull()
    expect(await loadEditionForDate('../../etc', repo)).toBeNull()
    expect(await loadEditionForDate('2030-01-01', repo)).toBeNull()
    const found = await loadEditionForDate('2026-09-14', repo)
    expect(found?.neighbors.previous?.editionDate).toBe('2026-09-13')
    expect(found?.neighbors.next?.editionDate).toBe('2026-09-15')
  })

  it('archive: one month per page in date order, adjacent months skip empty ones (plan §14)', async () => {
    const monthRepo = new MemoryDailyBreadRepository()
    const at = (date: string, extra: Partial<DailyEdition> = {}) =>
      monthRepo.seedPublished({ ...edition, editionDate: date, slug: date, ...extra })
    at('2026-07-31')
    at('2026-09-14', { liturgical: { ...edition.liturgical, feast: 'Exaltation of the Holy Cross' } })
    at('2026-09-01')
    at('2026-11-02')

    const newest = await loadArchiveMonth(undefined, monthRepo)
    expect(newest).toMatchObject({ month: '2026-11', previousMonth: '2026-09', nextMonth: null })
    expect(newest.entries.map((e) => e.editionDate)).toEqual(['2026-11-02'])

    const september = await loadArchiveMonth('2026-09', monthRepo)
    expect(september.entries.map((e) => e.editionDate)).toEqual(['2026-09-01', '2026-09-14'])
    expect(september).toMatchObject({ previousMonth: '2026-07', nextMonth: '2026-11' })
    expect(september.entries[1].feast).toBe('Exaltation of the Holy Cross')

    expect(await loadArchiveMonth('2026-10', monthRepo)).toMatchObject({ entries: [], previousMonth: '2026-09', nextMonth: '2026-11' })
    expect((await loadArchiveMonth('2026-13', monthRepo)).month).toBe('2026-11')
    expect(await loadArchiveMonth(undefined, new MemoryDailyBreadRepository())).toEqual({ month: null, entries: [], previousMonth: null, nextMonth: null })
    expect(formatArchiveMonth('2026-09')).toBe('September 2026')

    const page = await loadArchiveMonth(undefined, repo)
    expect(serialLabel(page.entries[page.entries.length - 1])).toBe('Vol. 1 · No. 003')
    expect(serialLabel({ archiveOrigin: 'backfilled', volume: null, issue: null })).toBe('From the archive · unnumbered')
  })
})

describe('historical snapshots do not follow their sources (plan §13)', () => {
  const EDITED = 'EDITED SOURCE TEXT: this sentence was written after publication.'
  const edit = (devotional: Record<string, unknown>) => {
    const copy = JSON.parse(JSON.stringify(devotional)) as {
      modules?: { type: string; content?: unknown; body?: unknown }[]
      panels?: { type: string; content?: unknown }[]
    }
    for (const m of copy.modules ?? []) {
      if (['teaching', 'story', 'insight', 'bridge'].includes(m.type)) {
        m.content = EDITED
        m.body = EDITED
      }
    }
    for (const p of copy.panels ?? []) if (p.type !== 'cover') p.content = EDITED
    return copy
  }
  const readingText = (e: DailyEdition) =>
    e.modules.flatMap((m) => (m.type === 'reading' ? m.blocks.map((b) => ('text' in b ? b.text : '')) : [])).join('\n')

  it('publish → edit the source article → retrieve the issue → the published text is unchanged', async () => {
    const date = '2026-09-16'
    const snapRepo = new MemoryDailyBreadRepository()
    const sources = offlineSources()
    const d = (at: string) => ({
      repo: snapRepo,
      sources,
      providers: [],
      clock: fixedClock(at),
      logger: createRunLogger(`snap-${at}`, { sink: () => {} }),
      trigger: 'e2e' as const,
      policy: 'deterministic-only' as const,
    })

    // 1. Publish.
    expect(await createDailyBreadEdition(date, d('2026-09-15T23:00:00Z'))).toMatchObject({ result: 'ready' })
    expect(await publishDailyBreadEdition(date, d('2026-09-16T11:30:00Z'))).toMatchObject({ result: 'published' })
    const published = (await loadEditionForDate(date, snapRepo))!.edition
    const originalText = readingText(published)
    expect(originalText.length).toBeGreaterThan(200)

    // 2. Edit the source article the reading was built from.
    const original = sources.loadDevotional
    sources.loadDevotional = async (slug) => {
      const dev = await original(slug)
      return dev ? (edit(dev as unknown as Record<string, unknown>) as unknown as typeof dev) : dev
    }
    // The edit is real: a fresh build from the edited source carries it.
    const freshRepo = new MemoryDailyBreadRepository()
    await createDailyBreadEdition(date, { ...d('2026-09-15T23:00:00Z'), repo: freshRepo })
    expect(readingText((await freshRepo.getEdition(date, { includeUnpublished: true }))!)).toContain(EDITED)

    // 3. Retrieve the historical issue — even after the scheduler runs again for that date.
    expect(await createDailyBreadEdition(date, d('2026-09-17T02:15:00Z'))).toMatchObject({ result: 'skipped' })
    const retrieved = (await loadEditionForDate(date, snapRepo))!.edition
    const html = renderToStaticMarkup(
      <DailyBreadEdition edition={retrieved} neighbors={{ previous: null, next: null }} mode="archive" />,
    )

    // 4. The published text did not silently change.
    expect(readingText(retrieved)).toBe(originalText)
    expect(html).not.toContain('EDITED SOURCE TEXT')
    expect((await snapRepo.getRevisions(date)).map((r) => r.revision)).toEqual([1])
  }, 180_000)
})

describe('rendering the frozen edition', () => {
  it('renders the serial, date, navigation and every placed module', () => {
    const html = renderToStaticMarkup(
      <DailyBreadEdition edition={edition} neighbors={{ previous: null, next: null }} mode="archive" />,
    )
    expect(html).toContain('Vol. 1 · No. 002')
    expect(html).toContain('Monday, September 14, 2026')
    expect(html).toContain(`data-archetype="${edition.composition.archetype}"`)
    expect(html).toContain('The first edition')
    for (const p of edition.composition.placements) {
      expect(html, p.module).toContain(`db2-cell--${p.module}`)
    }
    expect(html).not.toContain('The strip is being drawn')
    // The only injected HTML is the escaped JSON-LD block.
    const scripts = html.match(/<script[^>]*>/g) ?? []
    expect(scripts.every((s) => s.includes('application/ld+json'))).toBe(true)
  })

  it('ends with the plan’s copy: today’s paper vs a past paper (plan §15)', async () => {
    const sep13 = (await repo.getEdition('2026-09-13'))!
    const sep15 = (await repo.getEdition('2026-09-15'))!
    const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    const neighbors = { previous: toArchiveEntry(sep13), next: toArchiveEntry(sep15) }

    const today = text(
      renderToStaticMarkup(
        <DailyBreadEdition edition={edition} neighbors={{ previous: neighbors.previous, next: null }} mode="live" current />,
      ),
    )
    expect(today).toContain('That’s today’s bread.')
    expect(today).toContain('← Yesterday')
    expect(today).toContain('Browse the archive')
    expect(today).not.toContain('This was the Daily Bread')

    const past = renderToStaticMarkup(<DailyBreadEdition edition={edition} neighbors={neighbors} mode="archive" />)
    expect(text(past)).toContain('This was the Daily Bread for September 14, 2026.')
    expect(text(past)).toContain('← September 13')
    expect(text(past)).toContain('September 15 →')
    expect(past).toContain('href="/daily-bread/2026-09-15"')
    expect(text(past)).not.toContain('Yesterday')

    // A gap before today's paper names the date instead of "Yesterday".
    const gap = text(
      renderToStaticMarkup(
        <DailyBreadEdition edition={sep15} neighbors={{ previous: toArchiveEntry(sep13), next: null }} mode="live" current />,
      ),
    )
    expect(gap).toContain('← September 13')
  })

  it('renders every one of the eight archetypes from the same modules', () => {
    const seen = new Set<ArchetypeId>()
    for (const target of ARCHETYPE_IDS) {
      // The frozen document holds only what printed that day (plan §40), so the
      // archetype's required modules are added to the module list it is set from.
      const types = [...new Set([...edition.modules.map((m) => m.type), ...ARCHETYPES[target].requires])]
      const composition = composeEdition(
        {
          dateSlug: edition.editionDate,
          seed: 1,
          weekday: 1,
          season: 'ordinary',
          dayLabel: 'Ordinary Time',
          primaryReference: 'Luke 1:1',
          recentArchetypes: [],
        },
        types,
        { archetype: target },
      )
      const variant: DailyEdition = { ...edition, composition }
      const html = renderToStaticMarkup(
        <DailyBreadEdition edition={variant} neighbors={{ previous: null, next: null }} mode="archive" />,
      )
      expect(html).toContain(`db2-arch--${composition.archetype}`)
      expect(html).toContain(ARCHETYPES[composition.archetype].description)
      seen.add(composition.archetype)
    }
    expect(seen.size).toBe(ARCHETYPE_IDS.length)
  })

  it('a withdrawn edition shows the notice, not the content', () => {
    const withdrawn: DailyEdition = { ...edition, lifecycle: 'superseded', supersededReason: 'Withdrawn for editorial review.' }
    const html = renderToStaticMarkup(
      <DailyBreadEdition edition={withdrawn} neighbors={{ previous: null, next: null }} mode="archive" />,
    )
    expect(html).toContain('This edition was withdrawn')
    expect(html).toContain('Withdrawn for editorial review.')
    expect(html).not.toContain('db2-cell--reading')
  })

  it('tells the reader when an edition is a fallback edition', () => {
    const html = renderToStaticMarkup(
      <DailyBreadEdition edition={{ ...edition, quality: 'fallback' }} neighbors={{ previous: null, next: null }} mode="archive" />,
    )
    expect(html).toContain('standing library')
  })
})

describe('routes', () => {
  it('the date route 404s while the flag is off, and for bad slugs when on', async () => {
    const { default: Page } = await import('@/app/daily-bread/[date]/page')
    vi.stubEnv('DAILY_BREAD_V2', 'off')
    await expect(Page({ params: Promise.resolve({ date: '2026-09-14' }) })).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/)
    vi.stubEnv('DAILY_BREAD_V2', 'on')
    await expect(Page({ params: Promise.resolve({ date: 'not-a-date' }) })).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/)
  })

  it('canonical metadata: /daily-bread and the dated route both name the dated issue URL', async () => {
    vi.stubEnv('DAILY_BREAD_V2', 'on')
    vi.resetModules()
    vi.doMock('@/lib/daily-bread/read', async (orig) => ({
      ...(await orig<typeof import('@/lib/daily-bread/read')>()),
      loadLiveEdition: async () => ({ liveDate: '2026-09-14', edition, neighbors: { previous: null, next: null }, status: 'current', isFallbackToPrevious: false, minutesAfterRollover: 60 }),
      loadEditionForDate: async (date: string) => (date === '2026-09-14' ? { edition, neighbors: { previous: null, next: null } } : null),
    }))
    const live = await (await import('@/app/daily-bread/page')).generateMetadata()
    expect(live.alternates?.canonical).toBe('/daily-bread/2026-09-14')
    expect(live.openGraph).toMatchObject({ url: 'https://euangelion.app/daily-bread/2026-09-14' })
    const dated = await (await import('@/app/daily-bread/[date]/page')).generateMetadata({ params: Promise.resolve({ date: '2026-09-14' }) })
    expect(dated.alternates?.canonical).toBe('/daily-bread/2026-09-14')
    vi.doUnmock('@/lib/daily-bread/read')
  })

  it('the archive page renders the month heading, its editions, the feast, and month links; old ?before= links still land', async () => {
    vi.stubEnv('DAILY_BREAD_V2', 'on')
    vi.resetModules()
    const view = {
      month: '2026-09',
      entries: [
        { ...(await loadArchiveMonth('2026-09', repo)).entries[1], feast: 'Exaltation of the Holy Cross' },
      ],
      previousMonth: '2026-08',
      nextMonth: '2026-10',
    }
    vi.doMock('@/lib/daily-bread/read', async (orig) => ({
      ...(await orig<typeof import('@/lib/daily-bread/read')>()),
      loadArchiveMonth: async () => view,
    }))
    const archive = await import('@/app/daily-bread/archive/page')
    const html = renderToStaticMarkup((await archive.default({ searchParams: Promise.resolve({ month: '2026-09' }) })) as never)
    expect(html).toContain('<h2 id="db2-archive-month-heading" class="db2-archive-monthname">September 2026</h2>')
    expect(html).toContain('1 edition')
    expect(html).toContain('href="/daily-bread/2026-09-14"')
    expect(html).toContain('Exaltation of the Holy Cross')
    expect(html).toContain('href="/daily-bread/archive?month=2026-08"')
    expect(html).toContain('href="/daily-bread/archive?month=2026-10"')
    expect((await archive.generateMetadata({ searchParams: Promise.resolve({ month: '2026-09' }) })).alternates?.canonical).toBe(
      '/daily-bread/archive?month=2026-09',
    )
    expect((await archive.generateMetadata({ searchParams: Promise.resolve({ before: '2026-09-01' }) })).alternates?.canonical).toBe(
      '/daily-bread/archive?month=2026-08',
    )
    expect((await archive.generateMetadata({ searchParams: Promise.resolve({ month: '../../etc' }) })).alternates?.canonical).toBe(
      '/daily-bread/archive',
    )
    vi.doUnmock('@/lib/daily-bread/read')
  })

  it('/daily-bread renders the SA-090 paper when the flag is off', async () => {
    vi.stubEnv('DAILY_BREAD_V2', 'off')
    vi.doMock('@/components/edition/EditionPage', () => ({ default: () => 'LEGACY_EDITION_PAGE' }))
    vi.resetModules()
    const { default: Page } = await import('@/app/daily-bread/page')
    const el = (await Page()) as { type: unknown }
    expect(renderToStaticMarkup(el as never)).toContain('LEGACY_EDITION_PAGE')
    vi.doUnmock('@/components/edition/EditionPage')
  })

  it('the legacy archive date route redirects only when a V2 edition exists for that date', async () => {
    vi.stubEnv('DAILY_BREAD_V2', 'on')
    vi.resetModules()
    vi.doMock('@/lib/daily-bread/read', async (orig) => ({
      ...(await orig<typeof import('@/lib/daily-bread/read')>()),
      loadEditionForDate: async (date: string) => (date === '2026-09-14' ? { edition: {}, neighbors: {} } : null),
    }))
    vi.doMock('@/lib/edition/archive', () => ({ isArchivedEdition: () => true }))
    vi.doMock('@/components/edition/EditionPage', () => ({ default: () => 'LEGACY_EDITION_PAGE' }))
    const { default: Page } = await import('@/app/daily-bread/archive/[date]/page')
    await expect(Page({ params: Promise.resolve({ date: '2026-09-14' }) })).rejects.toThrow(/NEXT_REDIRECT/)
    const legacy = await Page({ params: Promise.resolve({ date: '2026-08-20' }) })
    expect(renderToStaticMarkup(legacy as never)).toContain('LEGACY_EDITION_PAGE')
    vi.doUnmock('@/lib/daily-bread/read')
    vi.doUnmock('@/lib/edition/archive')
    vi.doUnmock('@/components/edition/EditionPage')
  })
})
