import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Mobile image reliability (SA-123, F-168).
 *
 * Founder report 2026-08-24: "The mobile version of the homepage doesnt load
 * the images." Production probes (real Chrome + real WebKit at 375px, plus
 * direct asset checks) showed the site healthy — the failure mode lives on
 * the device: the service worker's image handler fabricated an EMPTY 404 on
 * any failed fetch, and an installed PWA keeps the same page alive for days,
 * so one bad network moment paints permanently blank images. Separately, the
 * homepage's most prominent image (the featured devotional art, an LCP
 * candidate) was lazy-loaded.
 */
describe('service worker image handler', () => {
  const sw = fs.readFileSync(
    path.join(process.cwd(), 'public', 'sw.js'),
    'utf8',
  )

  it('never fabricates an empty 404 for a failed image fetch', () => {
    expect(sw).not.toContain("new Response('', { status: 404 })")
  })

  it('retries a failed image fetch once, then fails with a real network error', () => {
    const imageBranch = sw.slice(sw.indexOf('// Images: cache-first'))
    const branch = imageBranch.slice(0, imageBranch.indexOf('return\n  }') + 12)
    expect(branch).toContain('.catch(() => attempt())')
    expect(branch).toContain('Response.error()')
  })
})

describe('homepage featured image', () => {
  it('is priority-loaded — the LCP candidate must never be lazy', () => {
    const page = fs.readFileSync(
      path.join(process.cwd(), 'src', 'app', 'page.tsx'),
      'utf8',
    )
    const i = page.indexOf('HOMEPAGE_TODAY.featuredArt')
    expect(i).toBeGreaterThan(-1)
    const imageBlock = page.slice(
      page.lastIndexOf('<Image', i),
      page.indexOf('/>', i) + 2,
    )
    expect(imageBlock).toContain('priority')
  })
})
