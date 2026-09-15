/**
 * Plan §73–74 (SA-142 / F-184): Good News carries a human verification
 * timestamp; rabbit holes link to where the site already followed that chapter.
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ModuleView } from '@/components/daily-bread/ModuleViews'
import { offlineSources } from '@/lib/daily-bread/e2e'
import { buildBaseEdition, goodNewsForDate } from '@/lib/daily-bread/modules/build'
import { chapterKey, threadFor, withThreads } from '@/lib/daily-bread/modules/threads'
import type { DailyEdition, Placement } from '@/lib/daily-bread/types'

const sources = {
  pastEditions: [
    { editionDate: '2026-09-10', title: 'The vine and the branches', reference: 'John 15:1-8' },
    { editionDate: '2026-09-03', title: 'An older John 15 paper', reference: 'John 15:12' },
  ],
  devotionals: [
    { slug: 'abiding-in-his-presence-day-1', title: 'From Visiting to Dwelling', reference: 'John 15:4' },
    { slug: 'kingdom-day-1', title: 'Seek first', reference: 'Matthew 6:33' },
  ],
}

describe('rabbit-hole threads (plan §74)', () => {
  it('prefers the newest past paper on the same chapter, then a devotional, else nothing', () => {
    expect(chapterKey('John 15:4-5')).toBe(chapterKey('John 15'))
    expect(threadFor({ reference: 'John 15:9' }, sources)).toEqual({ href: '/daily-bread/2026-09-10', label: 'The vine and the branches' })
    expect(threadFor({ reference: 'Matthew 6:25' }, sources)).toEqual({ href: '/devotional/kingdom-day-1', label: 'Seek first' })
    expect(threadFor({ reference: 'Obadiah 1:3' }, sources)).toBeUndefined()
    expect(threadFor({ reference: 'not a reference' }, sources)).toBeUndefined()
    const holes = withThreads(
      [
        { reference: 'John 15:9', text: 't', why: 'w' },
        { reference: 'Obadiah 1:3', text: 't', why: 'w' },
      ],
      sources,
    )
    expect(holes[0].thread?.href).toBe('/daily-bread/2026-09-10')
    expect(holes[1]).not.toHaveProperty('thread')
    // Two holes on the same chapter take different threads, newest paper first.
    const twins = withThreads(
      [
        { reference: 'John 15:9', text: 't', why: 'w' },
        { reference: 'John 15:13', text: 't', why: 'w' },
        { reference: 'John 15:16', text: 't', why: 'w' },
        { reference: 'John 15:17', text: 't', why: 'w' },
      ],
      sources,
    )
    expect(twins.map((h) => h.thread?.href)).toEqual([
      '/daily-bread/2026-09-10',
      '/daily-bread/2026-09-03',
      '/devotional/abiding-in-his-presence-day-1',
      undefined,
    ])
  })

  it('renders one understated link per rabbit hole, and only same-site links', () => {
    const placement = { module: 'rabbitHoles', region: 'sheet', span: 'full', tier: 'feature', band: 3, beat: 'open' } as Placement
    const html = renderToStaticMarkup(
      <>
        {ModuleView({
          module: {
            type: 'rabbitHoles',
            items: [
              { reference: 'John 15:9', text: 'As the Father has loved Me…', why: 'Love as the place to remain.', thread: { href: '/daily-bread/2026-09-10', label: 'The vine and the branches' } },
              { reference: 'Obadiah 1:3', text: 'The pride of your heart…', why: 'Pride’s address.', thread: { href: 'https://evil.example/', label: 'x' } },
            ],
          },
          placement,
          edition: {} as DailyEdition,
        })}
      </>,
    )
    expect(html).toContain('href="/daily-bread/2026-09-10"')
    expect(html).toContain('Follow this thread')
    expect(html.match(/db2-rabbit-thread"/g)).toHaveLength(1)
    expect(html).not.toContain('evil.example')
  })

  it('the build links a real devotional from the committed corpus', async () => {
    const all = await offlineSources().devotionalReferences()
    expect(all.length).toBeGreaterThan(500)
    const abiding = all.find((d) => d.slug === 'abiding-in-his-presence-day-1')
    expect(abiding).toMatchObject({ title: 'From Visiting to Dwelling', reference: 'John 15:4' })
  })
})

describe('Good News verification (plan §73)', () => {
  const entry = {
    runOn: '2026-09-20',
    headline: 'A town rebuilds its library by hand',
    summary: 'Volunteers carried books home through the flood and back again when the roof was fixed.',
    sourceName: 'The Example Gazette',
    sourceUrl: 'https://example.org/news/library',
    publishedOn: '2026-09-12',
    verifiedAt: '2026-09-18T14:05:00Z',
  }

  it('prints only entries a person verified after the report and before the paper', async () => {
    const run = async (e: typeof entry) => {
      const s = offlineSources()
      s.goodNews = (date) => goodNewsForDate(date, [e])
      return (await buildBaseEdition('2026-09-20', s)).modules.find((m) => m.type === 'goodNews')
    }
    expect(await run(entry)).toMatchObject({ items: [{ verifiedAt: '2026-09-18T14:05:00Z' }] })
    expect(await run({ ...entry, verifiedAt: '' })).toBeUndefined()
    expect(await run({ ...entry, verifiedAt: '2026-09-11T09:00:00Z' })).toBeUndefined() // before the report existed
    expect(await run({ ...entry, verifiedAt: '2026-09-21T09:00:00Z' })).toBeUndefined() // after it printed
  }, 60_000)
})
