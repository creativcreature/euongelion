import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('LCP/CLS stability contract', () => {
  const layoutPath = path.join(process.cwd(), 'src', 'app', 'layout.tsx')
  const homePath = path.join(process.cwd(), 'src', 'app', 'HomeClient.tsx')
  const cssPath = path.join(process.cwd(), 'src', 'app', 'globals.css')

  const layout = fs.readFileSync(layoutPath, 'utf8')
  const home = fs.readFileSync(homePath, 'utf8')
  const css = fs.readFileSync(cssPath, 'utf8')

  it('preloads Industry bold font used in masthead', () => {
    expect(layout).toContain('href="/fonts/IndustryTest-Bold.otf"')
  })

  it('marks hero banner image as high priority for LCP', () => {
    // SA-113: the hero rotates per page load via the parse-time draw script in
    // src/lib/home/hero-rotation.ts, which appends a fetchpriority="high"
    // image preload for the chosen plate — the LCP contract the old
    // next/image `priority` prop carried. Full rotation behavior is pinned in
    // __tests__/hero-rotation-contract.test.ts.
    const heroLib = fs.readFileSync(
      path.join(process.cwd(), 'src', 'lib', 'home', 'hero-rotation.ts'),
      'utf8',
    )
    expect(home).toContain('homepage-hero-banner-art')
    expect(home).toContain('heroDrawScript(HERO_ROTATION)')
    expect(heroLib).toContain('fetchpriority')
    expect(heroLib).toContain("setAttribute('rel','preload')")
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
