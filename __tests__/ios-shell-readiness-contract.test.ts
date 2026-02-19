import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('iOS shell readiness contract', () => {
  const cssPath = path.join(process.cwd(), 'src', 'app', 'globals.css')
  const css = fs.readFileSync(cssPath, 'utf8')

  it('defines safe-area tokens on the shared shell frame', () => {
    expect(css).toContain('--shell-safe-top: env(safe-area-inset-top, 0px);')
    expect(css).toContain(
      '--shell-safe-bottom: env(safe-area-inset-bottom, 0px);',
    )
  })

  it('uses topbar-safe-area padding instead of double sticky offsets', () => {
    expect(css).toContain('.mock-topbar {')
    expect(css).toContain('top: 0;')
    expect(css).toContain('padding-top: var(--shell-safe-top, 0px);')
    expect(css).toContain('top: var(--mock-h-topbar, 42px);')
  })

  it('keeps mobile nav pinned to viewport top while topbar scrolls away', () => {
    expect(css).toContain('@media (max-width: 900px)')
    expect(css).toContain('.mock-topbar {')
    expect(css).toContain('position: static;')
    expect(css).toContain('.mock-nav {')
    expect(css).toContain('top: 0;')
  })
})
