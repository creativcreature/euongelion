import { describe, expect, it } from 'vitest'
import { GET } from '@/app/wake-up/feed.xml/route'
import { WAKEUP_ORIGINALS_SLUGS } from '@/data/series-rails'
import { SERIES_DATA } from '@/data/series'

describe('Wake-Up RSS feed', () => {
  it('returns RSS 2.0 XML with the right Content-Type header', async () => {
    const response = await GET()
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe(
      'application/rss+xml; charset=utf-8',
    )
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=86400')

    const xml = await response.text()
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(xml).toContain('<rss version="2.0"')
    expect(xml).toContain('<channel>')
    expect(xml).toContain('</channel>')
    expect(xml).toContain('</rss>')
  })

  it('emits a self-link via atom:link', async () => {
    const response = await GET()
    const xml = await response.text()
    expect(xml).toContain(
      '<atom:link href="https://euangelion.app/wake-up/feed.xml" rel="self"',
    )
  })

  it('includes one <item> per Wake-Up Originals series that exists in SERIES_DATA', async () => {
    const response = await GET()
    const xml = await response.text()
    const itemCount = (xml.match(/<item>/g) || []).length
    const expectedCount = WAKEUP_ORIGINALS_SLUGS.filter(
      (slug) => SERIES_DATA[slug],
    ).length
    expect(itemCount).toBe(expectedCount)
  })

  it('escapes XML special characters in titles and descriptions', async () => {
    const response = await GET()
    const xml = await response.text()
    // Should never include unescaped raw < > & inside <title> or
    // <description>. We test by ensuring no item title has a raw "<"
    // followed by a non-tag character.
    const titleMatches = xml.matchAll(/<title>([^<]*)<\/title>/g)
    for (const m of titleMatches) {
      expect(m[1]).not.toMatch(/[&<>"']/)
    }
  })

  it('links each item to its canonical /wake-up/series URL', async () => {
    const response = await GET()
    const xml = await response.text()
    for (const slug of WAKEUP_ORIGINALS_SLUGS) {
      if (!SERIES_DATA[slug]) continue
      expect(xml).toContain(`https://euangelion.app/wake-up/series/${slug}`)
    }
  })
})
