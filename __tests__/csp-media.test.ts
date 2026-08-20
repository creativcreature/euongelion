import { describe, expect, it } from 'vitest'
import nextConfig from '../next.config'

/**
 * The CSP has to name media-src.
 *
 * Found 2026-08-20 by listening for `securitypolicyviolation` on the live site:
 * loading narration from a blob URL fires
 * `{ directive: 'media-src', blockedURI: 'blob', disposition: 'enforce' }`.
 * There is no `media-src` in the header, so media falls back to
 * `default-src 'self'`, and `'self'` does not cover `blob:`.
 *
 * That matters because the service worker synthesises 206 responses for
 * downloaded readings, and any blob-backed playback is blocked outright.
 * CHANGELOG already claims "media-src now names the R2 host" — it does not, so
 * this asserts against the REAL config rather than a copy of the header. The
 * existing CSP tests in security.test.ts assert against a hardcoded fixture,
 * which cannot catch a drift like this one.
 */
describe('the deployed Content-Security-Policy', () => {
  const cspHeader = async () => {
    const groups = await nextConfig.headers!()
    for (const group of groups) {
      const found = group.headers.find(
        (h) => h.key.toLowerCase() === 'content-security-policy',
      )
      if (found) return found.value
    }
    return null
  }

  it('names media-src explicitly rather than falling back to default-src', async () => {
    const csp = await cspHeader()
    expect(csp).not.toBeNull()
    expect(csp).toMatch(/media-src/)
  })

  it('allows same-origin narration and blob: playback', async () => {
    const csp = await cspHeader()
    const directive = csp!
      .split(';')
      .find((d) => d.trim().startsWith('media-src'))
    expect(directive).toBeDefined()
    // 'self' is the narration route; blob: is the offline/downloaded path.
    expect(directive).toContain("'self'")
    expect(directive).toContain('blob:')
  })
})
