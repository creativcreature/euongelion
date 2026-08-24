/**
 * Guards for site identity and link previews.
 *
 * Both of these fail silently and invisibly to the person shipping: a stock
 * favicon looks fine in a dev tab you never look at, and an OG card that
 * falls back to text looks fine until someone pastes a link into a chat. So
 * they are asserted here rather than trusted.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

const ROOT = process.cwd()

/** md5 of the favicon.ico Next.js scaffolds into new apps — the triangle. */
const NEXT_DEFAULT_FAVICON_MD5 = 'c30c7d42707a47a3f4591831641e50dc'

describe('site icon', () => {
  it('is not the stock Next.js triangle', () => {
    const buf = readFileSync(join(ROOT, 'src/app/favicon.ico'))
    const md5 = createHash('md5').update(buf).digest('hex')
    expect(md5).not.toBe(NEXT_DEFAULT_FAVICON_MD5)
  })

  it('ships the vector mark and the apple touch icon', () => {
    expect(existsSync(join(ROOT, 'src/app/icon.svg'))).toBe(true)
    expect(existsSync(join(ROOT, 'src/app/apple-icon.png'))).toBe(true)
  })

  it('draws the mark as geometry, not as a typeset glyph', () => {
    // A <text> element would make the icon depend on a font being present at
    // render time, which is exactly how favicons end up blank.
    const svg = readFileSync(join(ROOT, 'src/app/icon.svg'), 'utf8')
    expect(svg).not.toMatch(/<text/)
    expect(svg).toMatch(/#1f2a8d/i) // cobalt ground
  })

  it('has a manifest on the current palette, not the retired brown', () => {
    const m = JSON.parse(
      readFileSync(join(ROOT, 'public/manifest.json'), 'utf8'),
    )
    expect(m.background_color).not.toBe('#1a1612')
    expect(m.theme_color).not.toBe('#1a1612')
    const srcs = m.icons.map((i: { src: string }) => i.src)
    expect(srcs).toContain('/icons/icon.svg')
  })
})

describe('OG lead images', () => {
  const leadDir = join(ROOT, 'public/images/og-lead')

  it('exist for the named pages', () => {
    for (const name of ['home', 'seeking-help-georgia']) {
      expect(existsSync(join(leadDir, `${name}.jpg`)), `missing ${name}`).toBe(
        true,
      )
    }
  })

  it('covers every series that declares hero artwork', () => {
    const ts = readFileSync(join(ROOT, 'src/data/series.ts'), 'utf8')
    const keys = [...ts.matchAll(/^ {2}'?([a-z0-9-]+)'?:\s*\{/gm)].map((m) => ({
      key: m[1],
      at: m.index!,
    }))
    const missing: string[] = []
    keys.forEach((k, i) => {
      const chunk = ts.slice(k.at, keys[i + 1]?.at ?? ts.length)
      if (!/heroImage:/.test(chunk)) return
      if (!existsSync(join(leadDir, `series-${k.key}.jpg`))) missing.push(k.key)
    })
    expect(missing, `series without an OG lead: ${missing.join(', ')}`).toEqual(
      [],
    )
  })

  it('are JPEG, because Satori cannot decode webp', () => {
    // This is the whole reason the derivatives exist. A webp here renders an
    // empty band in the card and nobody notices until a link is shared.
    const files = readdirSync(leadDir)
    expect(files.length).toBeGreaterThan(0)
    expect(files.every((f) => f.endsWith('.jpg'))).toBe(true)
  })
})
