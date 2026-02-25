import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Layout overflow and sticky contract', () => {
  const cssPath = path.join(process.cwd(), 'src', 'app', 'globals.css')
  const css = fs.readFileSync(cssPath, 'utf8')

  it('keeps newspaper containers sticky-compatible by avoiding x-hidden clipping', () => {
    const newspaperHomeBlock = css.match(
      /\.newspaper-home\s*\{[\s\S]*?\n\}/,
    )?.[0]
    expect(newspaperHomeBlock).toBeTruthy()
    expect(newspaperHomeBlock).toContain('overflow-x: visible;')
  })

  it('uses percentage-based frame width with viewport max guard', () => {
    expect(css).toContain('width: min(1860px, calc(100% - 1.4rem));')
    expect(css).toContain('max-width: calc(100vw - 1.4rem);')
    expect(css).toContain('width: calc(100vw - 0.5rem);')
  })

  it('keeps desktop nav sticky below topbar for persistent navigation', () => {
    const navBlock = css.match(/\.mock-nav\s*\{[\s\S]*?\n\}/)?.[0]
    expect(navBlock).toBeTruthy()
    expect(navBlock).toContain('position: sticky;')
    expect(navBlock).toContain(
      'top: calc(var(--mock-h-topbar, 42px) + var(--shell-safe-top, 0px));',
    )
  })

  it('keeps mobile nav sticky for small-view navigation', () => {
    const mobileBlock = css.match(
      /@media \(max-width: 900px\)\s*\{[\s\S]*?\.mock-nav\s*\{[\s\S]*?\n\s*\}/,
    )?.[0]
    expect(mobileBlock).toBeTruthy()
    expect(mobileBlock).toContain('position: sticky;')
    expect(mobileBlock).toContain('top: 0;')
  })
})
