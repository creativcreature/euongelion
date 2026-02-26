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

  it('marks hero engraving image as high priority for LCP', () => {
    expect(home).toContain(
      'src="/images/illustrations/euangelion-homepage-engraving-04.svg"',
    )
    expect(home).toContain('priority')
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
