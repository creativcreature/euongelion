import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Contrast and readability contract', () => {
  const cssPath = path.join(process.cwd(), 'src', 'app', 'globals.css')
  const css = fs.readFileSync(cssPath, 'utf8')

  it('uses stronger muted text contrast tokens in newspaper shells', () => {
    expect(css).toContain('--mock-muted: rgba(17, 24, 42, 0.82);')
    expect(css).toContain('--color-text-muted: rgba(17, 24, 42, 0.64);')
    expect(css).toContain('--mock-muted: rgba(239, 229, 216, 0.86);')
    expect(css).toContain('--color-text-muted: rgba(239, 229, 216, 0.68);')
  })

  it('keeps validation/error copy and footnotes legible', () => {
    expect(css).toContain('font-size: clamp(0.92rem, 0.95vw, 1.08rem);')
    expect(css).toContain('.mock-footnote')
    expect(css).toContain('line-height: 1.25;')
  })

  it('adds explicit high-contrast overrides for mock shell readability', () => {
    expect(css).toContain('@media (prefers-contrast: high)')
    expect(css).toContain('--mock-line: #1f2a8d;')
    expect(css).toContain('--color-text-muted: rgba(239, 229, 216, 0.84);')
  })

  it('forces white text for browser copy/paste selection across engines', () => {
    expect(css).toContain('::selection')
    expect(css).toContain('::-moz-selection')
    expect(css).toContain('color: #fff;')
  })

  it('defines visible consent-required and inline selection error styles', () => {
    expect(css).toContain('.cookie-consent-banner.is-required')
    expect(css).toContain('.soul-audit-selection-error')
    expect(css).toContain('cookie-consent-required-pulse')
  })
})
