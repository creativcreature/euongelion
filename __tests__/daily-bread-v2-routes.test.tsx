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
import { offlineSources } from '@/lib/daily-bread/e2e'
import { loadArchivePage, loadEditionForDate, loadLiveEdition, serialLabel } from '@/lib/daily-bread/read'
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

  it('date loader rejects invalid slugs and unpublished dates', async () => {
    expect(await loadEditionForDate('2026-02-30', repo)).toBeNull()
    expect(await loadEditionForDate('../../etc', repo)).toBeNull()
    expect(await loadEditionForDate('2030-01-01', repo)).toBeNull()
    const found = await loadEditionForDate('2026-09-14', repo)
    expect(found?.neighbors.previous?.editionDate).toBe('2026-09-13')
    expect(found?.neighbors.next?.editionDate).toBe('2026-09-15')
  })

  it('archive pages newest first with a date cursor', async () => {
    const page = await loadArchivePage(undefined, repo)
    expect(page.entries.map((e) => e.editionDate)).toEqual(['2026-09-15', '2026-09-14', '2026-09-13'])
    const older = await loadArchivePage('2026-09-14', repo)
    expect(older.entries.map((e) => e.editionDate)).toEqual(['2026-09-13'])
    expect(serialLabel(page.entries[0])).toBe('Vol. 1 · No. 003')
    expect(serialLabel({ archiveOrigin: 'backfilled', volume: null, issue: null })).toBe('From the archive · unnumbered')
  })
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

  it('renders every one of the eight archetypes from the same modules', () => {
    const types = edition.modules.map((m) => m.type)
    const seen = new Set<ArchetypeId>()
    for (const target of ARCHETYPE_IDS) {
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
