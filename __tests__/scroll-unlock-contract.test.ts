import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Global scroll unlock contract', () => {
  const providersPath = path.join(process.cwd(), 'src', 'app', 'providers.tsx')
  const source = fs.readFileSync(providersPath, 'utf8')

  it('clears inline overflow locks on both body and documentElement', () => {
    expect(source).toContain("document.body.style.removeProperty('overflow')")
    expect(source).toContain(
      "document.documentElement.style.removeProperty('overflow')",
    )
    expect(source).toContain("document.body.style.removeProperty('position')")
    expect(source).toContain(
      "document.documentElement.style.removeProperty('position')",
    )
  })

  it('removes stale lenis classes from both html and body', () => {
    expect(source).toContain("'lenis-stopped'")
    expect(source).toContain("'lenis-scrolling'")
    expect(source).toContain("'lenis-smooth'")
    expect(source).toContain('document.documentElement.classList.remove(klass)')
    expect(source).toContain('document.body.classList.remove(klass)')
  })
})
