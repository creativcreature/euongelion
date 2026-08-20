import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('LCP/CLS stability contract', () => {
  const layoutPath = path.join(process.cwd(), 'src', 'app', 'layout.tsx')
  const homePath = path.join(process.cwd(), 'src', 'app', 'page.tsx')
  const cssPath = path.join(process.cwd(), 'src', 'app', 'globals.css')

  const layout = fs.readFileSync(layoutPath, 'utf8')
  const home = fs.readFileSync(homePath, 'utf8')
  const css = fs.readFileSync(cssPath, 'utf8')

  it('preloads Industry bold font used in masthead', () => {
    expect(layout).toContain('href="/fonts/IndustryTest-Bold.otf"')
  })

  it('marks hero banner image as high priority for LCP', () => {
    // SA-113: the hero rotates per page load via a parse-time inline script
    // over HERO_ROTATION. The LCP contract is that the injected <img> carries
    // fetchpriority="high", and a JS-off reader still gets a plate through
    // <noscript> — we don't hard-code filenames, which would re-break on every
    // cache-bust rename.
    expect(home).toContain('homepage-hero-banner-art')
    expect(home).toContain('HERO_ROTATION')
    expect(home).toContain('fetchpriority')
    expect(home).toContain('<noscript>')
  })

  it('uses block font-display for Industry weights to prevent layout shift', () => {
    const industryFaceBlocks = css.match(
      /@font-face\s*\{[\s\S]*?font-family:\s*'Industry';[\s\S]*?\}/g,
    )
    expect(industryFaceBlocks?.length).toBeGreaterThanOrEqual(3)
    industryFaceBlocks?.forEach((block) => {
      expect(block).toContain('font-display: block;')
    })
  })
})
