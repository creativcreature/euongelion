import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Offline service worker contract', () => {
  const swPath = path.join(process.cwd(), 'public', 'sw.js')
  const sw = fs.readFileSync(swPath, 'utf8')

  it('uses current cache namespace', () => {
    expect(sw).toContain("const CACHE_NAME = 'euangelion-v45'")
  })

  it('precaches critical routes for degraded navigation', () => {
    expect(sw).toContain("'/offline'")
    expect(sw).toContain("'/daily-bread'")
    expect(sw).toContain("'/soul-audit'")
    expect(sw).toContain("'/series'")
  })

  it('includes static asset strategy for build assets and fonts', () => {
    expect(sw).toContain("url.pathname.startsWith('/_next/static/')")
    expect(sw).toContain("url.pathname.startsWith('/fonts/')")
    expect(sw).toContain('STATIC_ASSET_RE')
  })
})
