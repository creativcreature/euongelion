import fs from 'node:fs'
import path from 'node:path'
import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'
import {
  HERO_ROTATION,
  heroDrawScript,
  heroVariant,
} from '@/lib/home/hero-rotation'

/**
 * SA-113 hero rotation — hydration-survival contract.
 *
 * The first shipped implementation injected an <img> into the banner div via
 * document.currentScript.insertAdjacentHTML. page.tsx is a client component,
 * so React hydration owns that subtree: a client re-render resets the div's
 * innerHTML from __html, scripts re-inserted through innerHTML never execute,
 * and the injected image vanished — a blank banner in production.
 *
 * The contract now: the drawn plate lives entirely OUTSIDE React's
 * reconciliation — a CSS custom property on documentElement consumed by the
 * banner as a background-image, with the tomb as the CSS fallback for JS-off.
 */
describe('hero rotation contract (SA-113)', () => {
  const home = fs.readFileSync(
    path.join(process.cwd(), 'src', 'app', 'page.tsx'),
    'utf8',
  )
  const css = fs.readFileSync(
    path.join(process.cwd(), 'src', 'app', 'globals.css'),
    'utf8',
  )

  it('rotation carries seven plates, the tomb first', () => {
    expect(HERO_ROTATION).toHaveLength(7)
    expect(HERO_ROTATION[0]).toBe('/images/site/homepage/hero/header-v2.webp')
    for (const src of HERO_ROTATION) {
      expect(src).toMatch(/^\/images\/site\/homepage\/hero\/[\w-]+\.webp$/)
    }
  })

  it('the draw script sets the CSS property and a high-priority preload', () => {
    const dom = new JSDOM('<div class="homepage-hero-banner-art"></div>', {
      runScripts: 'outside-only',
    })
    dom.window.eval(heroDrawScript(HERO_ROTATION))

    const style = dom.window.document.documentElement.style
    const drawn = style.getPropertyValue('--hero-rot')
    const match = HERO_ROTATION.filter((src) => drawn.includes(src))
    expect(match).toHaveLength(1)
    const plate = match[0]

    // All three widths are published for the SAME plate. A CSS background
    // cannot pick by viewport on its own, so globals.css switches between
    // these at 600/1100px; publishing different plates per width would let a
    // reader see the banner change image as they resize.
    expect(style.getPropertyValue('--hero-rot-sm')).toBe(
      `url(${heroVariant(plate, 960)})`,
    )
    expect(style.getPropertyValue('--hero-rot-md')).toBe(
      `url(${heroVariant(plate, 1600)})`,
    )
    expect(drawn).toBe(`url(${plate})`)

    const preload = dom.window.document.head.querySelector(
      'link[rel="preload"][as="image"]',
    )
    expect(preload).not.toBeNull()
    expect(preload?.getAttribute('fetchpriority')).toBe('high')

    // THE PRELOAD MUST MATCH WHAT CSS WILL PAINT. Preloading a width the page
    // never renders is worse than preloading nothing: it spends the LCP budget
    // on a file that is then fetched again at the right size.
    const w = dom.window.innerWidth
    const expected =
      w >= 1100
        ? heroVariant(plate, 2400)
        : w >= 600
          ? heroVariant(plate, 1600)
          : heroVariant(plate, 960)
    expect(preload?.getAttribute('href')).toBe(expected)
  })

  it('the drawn plate survives a React client re-render of the banner', () => {
    // Simulate the production failure: after the script runs, React
    // client-renders and resets the banner subtree via innerHTML. The draw
    // must not live in that subtree.
    const dom = new JSDOM(
      '<section><div class="homepage-hero-banner-art"></div></section>',
      { runScripts: 'outside-only' },
    )
    dom.window.eval(heroDrawScript(HERO_ROTATION))
    const before =
      dom.window.document.documentElement.style.getPropertyValue('--hero-rot')

    const section = dom.window.document.querySelector('section')!
    section.innerHTML = section.innerHTML // the innerHTML reset

    const after =
      dom.window.document.documentElement.style.getPropertyValue('--hero-rot')
    expect(after).toBe(before)
    expect(after).not.toBe('')
  })

  it('page and stylesheet consume the property; the fragile path is gone', () => {
    expect(home).toContain('heroDrawScript(')
    expect(home).not.toContain('insertAdjacentHTML')
    // The banner paints the variable with the tomb as CSS fallback, so a
    // JS-off reader still gets a plate without any <noscript> markup.
    expect(css).toMatch(
      /--hero-rot,\s*url\(['"]?\/images\/site\/homepage\/hero\/header-v2\.webp/,
    )
  })
})
