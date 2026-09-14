/**
 * The funnies are ECHO & DUST (SA-114 canon; SA-142 / F-184 correction,
 * founder 2026-09-14: "the comic strip is completely wrong… where is Dust and
 * Echo?"). The chain prints the day's Echo & Dust strip, else a credited
 * reprint of a founder-published strip that ran before the date, else
 * nothing — never a stand-in drawing. The SVG safety and legacy renderer tests
 * remain only while frozen silhouette strips await correction.
 */
import { cleanup, render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ComicStrip from '@/components/daily-bread/ComicStrip'
import { ModuleView } from '@/components/daily-bread/ModuleViews'
import {
  composeComic,
  httpImageAvailable,
  publishedStripBank,
  stripBankEntryFromRow,
  type StripBankEntry,
} from '@/lib/daily-bread/comic/chain'
import { renderComicPanelSvg, renderComicStrip } from '@/lib/daily-bread/comic/render'
import { assertSafeSvgTree, svgToString, type SvgNode } from '@/lib/daily-bread/comic/svg'
import type { ComicModule, ComicScript, DailyEdition, Placement } from '@/lib/daily-bread/types'
import type { Edition } from '@/lib/edition/store'

afterEach(() => cleanup())

function svg(children: SvgNode[], attrs: SvgNode['attrs'] = {}): SvgNode {
  return { tag: 'svg', attrs: { viewBox: '0 0 10 10', ...attrs }, children }
}

// The asset policy admits only the project's own storage bucket.
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://ovivwbopjfruikehrlgm.supabase.co')
const STORAGE = 'https://ovivwbopjfruikehrlgm.supabase.co/storage/v1/object/public/edition-assets/strip'

/** The three founder-published strips, as their edition_items rows read. */
const PUBLISHED_ROWS = [
  { id: 'a1', publish_date: '2026-08-20', payload: { image: `${STORAGE}/echo-dust-001-microwave-minute.jpg`, alt: 'Echo & Dust: Teddy: Why does a microwave minute feel longer than a real one?', caption: 'Echo & Dust — No. 1: The Microwave Minute', panelId: 'echo-dust-001-microwave-minute', width: 1512, height: 745 } },
  { id: 'a2', publish_date: '2026-08-21', payload: { image: `${STORAGE}/echo-dust-005-windowseat.jpg`, alt: 'Echo & Dust: Teddy: I prayed for the window seat and got it.', caption: 'Echo & Dust — No. 2: The Window Seat', panelId: 'echo-dust-005-windowseat', width: '1512', height: '745' } },
  { id: 'a3', publish_date: '2026-08-22', payload: { image: `${STORAGE}/echo-dust-006-leftovers.jpg`, alt: 'Echo & Dust: Teddy: The fast starts at midnight.', caption: 'Echo & Dust — No. 3: The Leftovers', panelId: 'echo-dust-006-leftovers', width: 1512, height: 745 } },
]
const BANK = PUBLISHED_ROWS.map(stripBankEntryFromRow).filter((e): e is StripBankEntry => e !== null)
const reachable = async () => true

function stripItem(date: string, panelId: string, caption: string): Edition {
  return {
    strip: [
      {
        id: `row-${date}`,
        kind: 'strip',
        publishDate: date,
        slot: 0,
        status: 'draft',
        payload: { image: `${STORAGE}/${panelId}.jpg`, alt: `Echo & Dust: ${caption}`, caption, panelId, width: 1512, height: 745 },
      },
    ],
  } as unknown as Edition
}

describe('the funnies are Echo & Dust', () => {
  it('prints the day’s Echo & Dust strip when one was drawn for the date', async () => {
    const out = await composeComic({
      dateSlug: '2026-08-24',
      liveItems: stripItem('2026-08-24', 'echo-dust-005', 'Echo & Dust — No. 5: Are You Still Watching?'),
      bank: BANK,
      recentComicIds: [],
      assetAvailable: reachable,
    })
    expect(out.level).toBe('approved-art')
    expect(out.module).toMatchObject({
      type: 'comic',
      level: 'approved-art',
      stripId: 'echo-dust-005',
      caption: 'Echo & Dust — No. 5: Are You Still Watching?',
      image: { src: `${STORAGE}/echo-dust-005.jpg`, width: 1512, height: 745 },
    })
    expect(out.module).not.toHaveProperty('script')
    expect(out.sourceItemIds).toEqual(['row-2026-08-24'])
  })

  it('otherwise reprints a published strip that ran BEFORE the date, least recently printed first', async () => {
    const out = await composeComic({
      dateSlug: '2026-09-15',
      liveItems: {},
      bank: BANK,
      recentComicIds: ['echo-dust-006-leftovers', 'echo-dust-001-microwave-minute'],
      assetAvailable: reachable,
    })
    expect(out.level).toBe('archive-reprint')
    expect(out.module).toMatchObject({ stripId: 'echo-dust-005-windowseat', firstRan: '2026-08-21' })

    // All recent: the one printed longest ago comes back first.
    const allRecent = await composeComic({
      dateSlug: '2026-09-15',
      liveItems: {},
      bank: BANK,
      recentComicIds: ['echo-dust-006-leftovers', 'echo-dust-005-windowseat', 'echo-dust-001-microwave-minute'],
      assetAvailable: reachable,
    })
    expect(allRecent.module?.stripId).toBe('echo-dust-001-microwave-minute')

    // Never a strip that first ran after the edition's date.
    const early = await composeComic({ dateSlug: '2026-08-21', liveItems: {}, bank: BANK, recentComicIds: [], assetAvailable: reachable })
    expect(early.module?.stripId).toBe('echo-dust-001-microwave-minute')
  })

  it('an unreachable image is skipped; with nothing left the comic is omitted — never a stand-in drawing', async () => {
    const skip = await composeComic({
      dateSlug: '2026-09-15',
      liveItems: stripItem('2026-09-15', 'echo-dust-099', 'Echo & Dust — No. 99'),
      bank: BANK,
      recentComicIds: [],
      assetAvailable: async (src) => !src.includes('echo-dust-099') && !src.includes('microwave'),
    })
    expect(skip.level).toBe('archive-reprint')
    expect(skip.module?.stripId).toBe('echo-dust-005-windowseat')
    expect(skip.notes.join(' ')).toMatch(/not reachable \(echo-dust-099\)/)

    const before = await composeComic({ dateSlug: '2026-08-18', liveItems: {}, bank: BANK, recentComicIds: [], assetAvailable: reachable })
    expect(before).toMatchObject({ level: 'omitted', module: null })
    expect(before.notes.join(' ')).toMatch(/none published before it/)

    const down = await composeComic({ dateSlug: '2026-09-15', liveItems: {}, bank: BANK, recentComicIds: [], assetAvailable: async () => false })
    expect(down).toMatchObject({ level: 'omitted', module: null })
    expect(down.usage).toEqual([])
  })

  it('rows that fail the asset policy never enter the bank', () => {
    expect(stripBankEntryFromRow({ id: 'x', publish_date: '2026-08-20', payload: { image: 'javascript:alert(1)', panelId: 'p', width: 1, height: 1 } })).toBeNull()
    expect(stripBankEntryFromRow({ id: 'x', publish_date: '2026-08-20', payload: { image: `${STORAGE}/a.jpg`, width: 1512, height: 745 } })).toBeNull()
    expect(BANK).toHaveLength(3)
    expect(BANK[1]).toMatchObject({ width: 1512, height: 745 })
  })

  it('a strip whose file another row also uses is never reprinted (the 2026-08-24 overwrite)', () => {
    const rows = [
      { ...PUBLISHED_ROWS[0], status: 'published', payload: { ...PUBLISHED_ROWS[0].payload, image: `${STORAGE}/echo-dust-004.jpg`, panelId: 'echo-dust-004' } },
      { id: 'd4', publish_date: '2026-08-23', status: 'draft', payload: { image: `${STORAGE}/echo-dust-004.jpg`, alt: 'Echo & Dust', caption: 'Echo & Dust — No. 4: The Receipt', panelId: 'echo-dust-004', width: 1512, height: 745 } },
      { ...PUBLISHED_ROWS[1], status: 'published' },
      { id: 'r6', publish_date: '2026-08-25', status: 'rejected', payload: { image: `${STORAGE}/echo-dust-006.jpg`, alt: 'x', caption: 'Echo & Dust — No. 6', panelId: 'echo-dust-006', width: 1512, height: 745 } },
    ]
    expect(publishedStripBank(rows).map((e) => e.panelId)).toEqual(['echo-dust-005-windowseat'])
    // Once No. 1's row points at its own restored file, it is back in the bank.
    rows[0] = { ...PUBLISHED_ROWS[0], status: 'published' }
    expect(publishedStripBank(rows).map((e) => e.panelId)).toEqual(['echo-dust-001-microwave-minute', 'echo-dust-005-windowseat'])
  })

  it('the build-time asset check wants a 200 image over https', async () => {
    const answer = (status: number, type: string) => (async () => new Response(null, { status, headers: { 'content-type': type } })) as unknown as typeof fetch
    expect(await httpImageAvailable(`${STORAGE}/a.jpg`, answer(200, 'image/jpeg'))).toBe(true)
    expect(await httpImageAvailable(`${STORAGE}/a.jpg`, answer(404, 'text/html'))).toBe(false)
    expect(await httpImageAvailable(`${STORAGE}/a.jpg`, answer(200, 'text/html'))).toBe(false)
    expect(await httpImageAvailable('http://example.com/a.jpg', answer(200, 'image/jpeg'))).toBe(false)
    expect(await httpImageAvailable('/images/edition/strip/echo-dust-001b.jpg')).toBe(true)
  })

  it('the page labels the section Echo & Dust and credits a reprint with its first run', () => {
    const reprint: ComicModule = {
      type: 'comic',
      level: 'archive-reprint',
      title: 'Echo & Dust — No. 2: The Window Seat',
      caption: 'Echo & Dust — No. 2: The Window Seat',
      stripId: 'echo-dust-005-windowseat',
      firstRan: '2026-08-21',
      image: { src: `${STORAGE}/echo-dust-005-windowseat.jpg`, width: 1512, height: 745, alt: 'Echo & Dust: Teddy: I prayed for the window seat and got it.' },
    }
    const placement = { module: 'comic', span: 6, band: 3, beat: 'open', region: 'feature', tier: 'feature' } as unknown as Placement
    const html = renderToStaticMarkup(<>{ModuleView({ module: reprint, placement, edition: {} as DailyEdition })}</>)
    expect(html).toContain('Echo &amp; Dust')
    expect(html).toContain('Echo &amp; Dust — No. 2: The Window Seat')
    expect(html).toContain('A reprint — first ran Friday, August 21, 2026')
    expect(html).not.toContain('wordless')
    expect(html).not.toContain('<svg')
  })
})

describe('assertSafeSvgTree', () => {
  it('accepts a plain tree', () => {
    expect(() =>
      assertSafeSvgTree(
        svg([
          {
            tag: 'path',
            attrs: { d: 'M 0 0 L 1 1', fill: 'url(#db2-halftone-x)' },
          },
        ]),
      ),
    ).not.toThrow()
  })

  it('rejects a script tag', () => {
    const tree = svg([{ tag: 'script' as SvgNode['tag'], attrs: {} }])
    expect(() => assertSafeSvgTree(tree)).toThrow(/not allowed/)
  })

  it('rejects href, xlink:href, onload and style attributes', () => {
    for (const name of ['href', 'xlink:href', 'onload', 'style']) {
      const tree = svg([{ tag: 'rect', attrs: { [name]: 'x' } }])
      expect(() => assertSafeSvgTree(tree), name).toThrow(/not allowed/)
    }
  })

  it('rejects javascript: urls and external url()', () => {
    expect(() =>
      assertSafeSvgTree(
        svg([{ tag: 'g', attrs: { class: 'javascript:alert(1)' } }]),
      ),
    ).toThrow(/javascript/)
    expect(() =>
      assertSafeSvgTree(
        svg([
          { tag: 'rect', attrs: { fill: 'url(https://evil.example/x.svg#p)' } },
        ]),
      ),
    ).toThrow(/url/)
    expect(() =>
      assertSafeSvgTree(
        svg([{ tag: 'g', attrs: { transform: 'url(data:x)' } }]),
      ),
    ).toThrow(/url/)
  })

  it('rejects markup in values, bad paints, non-finite numbers, and text off title', () => {
    expect(() =>
      assertSafeSvgTree(svg([{ tag: 'g', attrs: { id: '"><script>' } }])),
    ).toThrow()
    expect(() =>
      assertSafeSvgTree(svg([{ tag: 'rect', attrs: { fill: 'red' } }])),
    ).toThrow(/paint/)
    expect(() =>
      assertSafeSvgTree(svg([{ tag: 'circle', attrs: { r: Number.NaN } }])),
    ).toThrow(/finite/)
    expect(() =>
      assertSafeSvgTree(svg([{ tag: 'g', attrs: {}, text: 'hello' }])),
    ).toThrow(/text/)
  })

  it('rejects trees that are too deep or too large', () => {
    let deep: SvgNode = { tag: 'g', attrs: {} }
    for (let i = 0; i < 13; i++)
      deep = { tag: 'g', attrs: {}, children: [deep] }
    expect(() => assertSafeSvgTree(deep)).toThrow(/depth/)
    const wide = svg(
      Array.from({ length: 4001 }, () => ({ tag: 'rect' as const, attrs: {} })),
    )
    expect(() => assertSafeSvgTree(wide)).toThrow(/nodes/)
  })

  it('svgToString escapes title text', () => {
    const out = svgToString(
      svg([{ tag: 'title', attrs: {}, text: 'Bread & <fish>' }]),
    )
    expect(out).toContain('Bread &amp; &lt;fish&gt;')
    expect(out).not.toContain('<fish>')
  })
})

describe('LEGACY silhouette strips (frozen snapshots awaiting correction)', () => {
  const script: ComicScript = {
    id: 'the-lost-sheep',
    title: 'The Lost Sheep',
    scriptureReference: 'Luke 15:4-5',
    panels: [
      { setting: 'hillside', figures: [{ figure: 'shepherd', x: 0.2, y: 0.88, scale: 1.1 }, { figure: 'sheep', x: 0.46, y: 0.84, scale: 1.1 }], description: 'A shepherd stands with his flock on a green hillside, counting them.' },
      { setting: 'road', figures: [{ figure: 'shepherd', x: 0.6, y: 0.66, scale: 0.8 }], description: 'He sets off alone down the long road toward one small sheep far away.', caption: 'go after the one that is lost' },
      { setting: 'hillside', figures: [{ figure: 'sheep', x: 0.47, y: 0.58, scale: 1.1 }, { figure: 'shepherd', x: 0.46, y: 0.94, scale: 1.3 }], description: 'The shepherd walks home with the found sheep carried across his shoulders.' },
    ],
  }

  it('still render safely until their editions are revised', () => {
    const tree = renderComicStrip(script)
    expect(() => assertSafeSvgTree(tree)).not.toThrow()
    expect(svgToString(tree)).not.toMatch(/<script|href|style=|\son[a-z]+=/i)
    script.panels.forEach((_, index) => expect(() => assertSafeSvgTree(renderComicPanelSvg(script, index))).not.toThrow())
    const { container } = render(<ComicStrip script={script} caption="go after the one that is lost" level="deterministic-script" />)
    expect(container.querySelector('svg.db2-comic-strip')).not.toBeNull()
    expect(screen.getAllByRole('img').length).toBeGreaterThan(0)
  })
})
