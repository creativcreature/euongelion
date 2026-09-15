// @vitest-environment node
/**
 * Plan §78 (SA-142 / F-184): published Daily Bread issues and the archive are in
 * the sitemap at their canonical URLs; withdrawn issues are not; a failed read
 * never takes the sitemap down.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
  vi.doUnmock('@/lib/daily-bread/repository')
})

const entry = (editionDate: string, lifecycle: 'published' | 'superseded') => ({
  editionDate,
  issue: 1,
  volume: 1,
  archiveOrigin: 'native',
  title: 't',
  quality: 'normal',
  archetype: 'broadsheet',
  lifecycle,
})

describe('sitemap (plan §78)', () => {
  it('lists every published issue and the archive, not withdrawn issues', async () => {
    vi.stubEnv('DAILY_BREAD_V2', 'on')
    vi.doMock('@/lib/daily-bread/repository', () => ({
      getDailyBreadRepository: () => ({
        listArchive: async () => [entry('2026-09-14', 'published'), entry('2026-09-13', 'published'), entry('2026-09-12', 'superseded')],
      }),
    }))
    const { default: sitemap } = await import('@/app/sitemap')
    const urls = (await sitemap()).map((e) => e.url)
    expect(urls).toContain('https://euangelion.app/daily-bread/2026-09-14')
    expect(urls).toContain('https://euangelion.app/daily-bread/2026-09-13')
    expect(urls).toContain('https://euangelion.app/daily-bread/archive')
    expect(urls).not.toContain('https://euangelion.app/daily-bread/2026-09-12')
    expect(urls).toContain('https://euangelion.app/who-is-god')
  })

  it('a failed archive read leaves the rest of the sitemap serving', async () => {
    vi.stubEnv('DAILY_BREAD_V2', 'on')
    vi.doMock('@/lib/daily-bread/repository', () => ({
      getDailyBreadRepository: () => ({
        listArchive: async () => {
          throw new Error('fetch failed')
        },
      }),
    }))
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { default: sitemap } = await import('@/app/sitemap')
    const urls = (await sitemap()).map((e) => e.url)
    expect(urls).toContain('https://euangelion.app/daily-bread')
    expect(urls.some((u) => /daily-bread\/\d{4}-/.test(u))).toBe(false)
    expect(errors).toHaveBeenCalled()
    errors.mockRestore()
  })
})
