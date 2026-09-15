// @vitest-environment node
/**
 * Daily Bread V2 security (SA-142 / F-184): safe links and assets, secret
 * redaction in logs and errors, document validation (no credentials, no
 * script-like content, no unsafe links), and endpoint protection.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { safeAssetSrc, safeHref, cleanText, boldSegments } from '@/lib/daily-bread/safe'
import { errorMessage, redact, redactString } from '@/lib/daily-bread/redact'
import { createRunLogger } from '@/lib/daily-bread/log'
import { validateEditionDocument } from '@/lib/daily-bread/validate'
import { DAILY_BREAD_V2_DEFAULT, dailyBreadSource, dailyBreadV2Enabled } from '@/lib/daily-bread/flags'
import { runInMemoryE2E } from '@/lib/daily-bread/e2e'

describe('safe links and assets', () => {
  it('allows same-site paths and public https only', () => {
    expect(safeHref('/daily-bread/2026-09-14')).toBe('/daily-bread/2026-09-14')
    expect(safeHref('https://www.christianitytoday.com/news/x')).toBe('https://www.christianitytoday.com/news/x')
    for (const bad of [
      'javascript:alert(1)',
      'JaVaScRiPt:alert(1)',
      'data:text/html,<script>',
      '//evil.example/x',
      'http://insecure.example',
      'https://user:pass@example.com',
      'https://127.0.0.1/admin',
      'https://localhost/x',
      'https://[::1]/',
      '/\\evil.example',
      'vbscript:msgbox',
      '',
      42,
    ]) {
      expect(safeHref(bad), String(bad)).toBeNull()
    }
  })

  it('allows only local images and the project storage bucket', () => {
    const sb = 'https://abc123.supabase.co'
    expect(safeAssetSrc('/images/devotional-prints/a.webp', sb)).toBe('/images/devotional-prints/a.webp')
    expect(safeAssetSrc(`${sb}/storage/v1/object/public/edition-assets/strip/x.jpg`, sb)).toContain('edition-assets')
    for (const bad of [
      '/images/../secrets.png',
      'https://evil.example/pixel.gif',
      `${sb}/storage/v1/object/public/other-bucket/x.jpg`,
      `${sb}/storage/v1/object/sign/edition-assets/x.jpg`,
      'https://abc123.supabase.co.evil.example/storage/v1/object/public/edition-assets/x.jpg',
      '/api/admin/x.png',
    ]) {
      expect(safeAssetSrc(bad, sb), bad).toBeNull()
    }
  })

  it('cleanText strips markup and control characters; bold segments never produce HTML', () => {
    expect(cleanText('<img src=x onerror=alert(1)>Hi\u0000 there', 100)).toBe('Hi there')
    const segs = boldSegments('a **<b>b</b>** c')
    expect(segs).toEqual([
      { text: 'a ', bold: false },
      { text: '<b>b</b>', bold: true },
      { text: ' c', bold: false },
    ])
  })
})

describe('secret redaction', () => {
  const env = {
    ANTHROPIC_API_KEY: 'sk-ant-api03-SUPERSECRETVALUE1234567890',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-secret-value-abcdef',
    INTERNAL_ROUTE_SECRET: 'internal-secret-0987654321',
  }

  it('scrubs env secret values and token-shaped strings', () => {
    const text = `failed with ${env.ANTHROPIC_API_KEY} and ${env.SUPABASE_SERVICE_ROLE_KEY} Bearer abcdefghijklmnopqrstuvwxyz ?key=AIzaSyA-something-long-123`
    const out = redactString(text, env)
    expect(out).not.toContain('SUPERSECRET')
    expect(out).not.toContain('service-role-secret')
    expect(out).not.toContain('abcdefghijklmnopqrstuvwxyz')
    expect(out).not.toContain('AIzaSy')
    expect(redact({ nested: { apiKey: 'anything', note: env.INTERNAL_ROUTE_SECRET } }, env)).toEqual({
      nested: { apiKey: '[REDACTED]', note: '[REDACTED]' },
    })
  })

  it('logger lines and error messages are redacted', () => {
    vi.stubEnv('ANTHROPIC_API_KEY', env.ANTHROPIC_API_KEY)
    const lines: string[] = []
    const log = createRunLogger('run-1', { sink: (_l, line) => lines.push(line) })
    log.error('provider_failed', new Error(`401 for key ${env.ANTHROPIC_API_KEY}`), { headers: { authorization: 'x' } })
    expect(lines.join('\n')).not.toContain('SUPERSECRET')
    expect(lines.join('\n')).toContain('[REDACTED]')
    expect(errorMessage(new Error(`boom ${env.ANTHROPIC_API_KEY}`))).not.toContain('SUPERSECRET')
    vi.unstubAllEnvs()
  })
})

describe('feature flag', () => {
  it('follows the committed default when unset, honours explicit on/off, and the source must be known', () => {
    expect(dailyBreadV2Enabled({})).toBe(DAILY_BREAD_V2_DEFAULT === 'on')
    expect(dailyBreadV2Enabled({ DAILY_BREAD_V2: 'off' })).toBe(false)
    expect(dailyBreadV2Enabled({ DAILY_BREAD_V2: 'true' })).toBe(false)
    expect(dailyBreadV2Enabled({ DAILY_BREAD_V2: 'on' })).toBe(true)
    expect(dailyBreadSource({})).toBe('supabase')
    expect(dailyBreadSource({ DAILY_BREAD_V2_SOURCE: 'fixture' })).toBe('fixture')
    expect(() => dailyBreadSource({ DAILY_BREAD_V2_SOURCE: 'memory' })).toThrow()
  })
})

describe('edition document validation', () => {
  it('a real pipeline document carries no secrets even when every provider key is set', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'sk-ant-api03-THISMUSTNOTLEAK000000000')
    vi.stubEnv('GEMINI_API_KEY', 'AIzaTHISMUSTNOTLEAK0000000000000')
    const report = await runInMemoryE2E()
    expect(report.ok, JSON.stringify(report.checks.filter((c) => !c.ok))).toBe(true)
    vi.unstubAllEnvs()
  }, 120_000)

  it('rejects credentials, script content and unsafe links', () => {
    const base = {
      schemaVersion: 1,
      editionDate: '2026-09-14',
      slug: '2026-09-14',
      archiveOrigin: 'native' as const,
      quality: 'normal' as const,
      title: 'T',
      deck: '',
      primaryScripture: { reference: 'John 1:1', text: 'In the beginning', translation: 'BSB' as const },
      liturgical: { season: 'ordinary', seasonLabel: 'Ordinary Time', dayLabel: 'Ordinary Time', color: 'green' },
      seed: 's',
      composition: { archetype: 'broadsheet' as const, seed: 1, rhythm: [], placements: [], scoring: [] },
      modules: [
        { type: 'scripture' as const, scripture: { reference: 'John 1:1', text: 'In the beginning', translation: 'BSB' as const } },
        { type: 'reading' as const, devotionalSlug: 'x', title: 'T', blocks: [{ kind: 'paragraph' as const, text: 'sk-ant-api03-leakedkeyvalue' }] },
        {
          type: 'goodNews' as const,
          items: [{ headline: 'h', summary: 's', sourceName: 'n', sourceUrl: 'javascript:alert(1)', publishedOn: '2026-09-10' }],
        },
      ],
      assets: { scenePoster: { scene: 'grain' as const, seed: 1 }, og: { title: 'T', kicker: 'k' }, fallbacks: [] },
      generation: {
        runId: 'r',
        builtAt: '2026-09-13T20:00:00Z',
        primaryProvider: 'deterministic' as const,
        fallbackProvidersUsed: [],
        usage: [],
        moduleFailures: [],
        assetFallbacks: [],
        comicLevel: 'omitted' as const,
        sourceItemIds: [],
      },
      rendererVersion: 'db2-r1',
    }
    const problems = validateEditionDocument(base).join(' | ')
    expect(problems).toMatch(/credential-shaped/)
    expect(problems).toMatch(/goodNews: unsafe source link/)
    const scripted = validateEditionDocument({ ...base, title: '<script>alert(1)</script>', modules: base.modules.slice(0, 2) })
    expect(scripted.join(' ')).toMatch(/script-like/)
  })

  it('enforces the minimum publishable issue: a printed prayer or response, a composition, a visual treatment (plan §29)', () => {
    const scripture = { reference: 'John 1:1', text: 'In the beginning', translation: 'BSB' as const }
    const place = (module: string) => ({ module, band: 0, span: 'full' }) as never
    const doc = (modules: unknown[], placements: string[], extra: Record<string, unknown> = {}) =>
      ({
        schemaVersion: 1,
        editionDate: '2026-09-14',
        slug: '2026-09-14',
        archiveOrigin: 'native',
        quality: 'minimum',
        title: 'T',
        deck: '',
        primaryScripture: scripture,
        liturgical: { season: 'ordinary', seasonLabel: 'Ordinary Time', dayLabel: 'Ordinary Time', color: 'green' },
        seed: 's',
        composition: { archetype: 'quiet', seed: 1, rhythm: [], placements: placements.map(place), scoring: [] },
        modules,
        assets: { scenePoster: { scene: 'grain', seed: 1 }, og: { title: 'T', kicker: 'k' }, fallbacks: [] },
        generation: { runId: 'r', builtAt: 'x', primaryProvider: 'deterministic', fallbackProvidersUsed: [], usage: [], moduleFailures: [], assetFallbacks: [], comicLevel: 'omitted', sourceItemIds: [] },
        rendererVersion: 'db2-r1',
        ...extra,
      }) as never
    const scriptureModule = { type: 'scripture', scripture }
    const reading = (blocks: unknown[]) => ({ type: 'reading', devotionalSlug: 'x', title: 'T', blocks })
    const prayer = { type: 'prayer', prayer: { reference: 'Psalm 141:1-4', text: 'O LORD, I call upon You.' } }

    const minimum = doc([scriptureModule, reading([{ kind: 'paragraph', text: 'p' }]), prayer], ['scripture', 'reading', 'prayer'])
    expect(validateEditionDocument(minimum)).toEqual([])

    // A prayer printed inside the reading counts as the response.
    expect(validateEditionDocument(doc([scriptureModule, reading([{ kind: 'prayer', text: 'Amen.' }])], ['scripture', 'reading']))).toEqual([])

    // No prayer or response anywhere, or one that is built but never placed on the page.
    const bare = doc([scriptureModule, reading([{ kind: 'paragraph', text: 'p' }])], ['scripture', 'reading'])
    expect(validateEditionDocument(bare)).toContain('prayer or spiritual response missing from the printed paper')
    const unplaced = doc([scriptureModule, reading([{ kind: 'paragraph', text: 'p' }]), prayer], ['scripture', 'reading'])
    expect(validateEditionDocument(unplaced)).toContain('prayer or spiritual response missing from the printed paper')

    // Core modules must be placed; composition and poster must exist.
    expect(validateEditionDocument(doc([scriptureModule, reading([]), prayer], ['reading', 'prayer']))).toContain('scripture is not placed')
    const noPoster = doc([scriptureModule, reading([]), prayer], ['scripture', 'reading', 'prayer'], {
      assets: { og: { title: 'T', kicker: 'k' }, fallbacks: [] },
    })
    expect(validateEditionDocument(noPoster)).toContain('visual treatment missing (scene poster)')
  })
})

describe('protected endpoints', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('INTERNAL_ROUTE_SECRET', 'the-internal-secret-value')
    vi.stubEnv('ADMIN_EMAIL_ALLOWLIST', 'founder@example.com')
    vi.stubEnv('DAILY_BREAD_V2_SOURCE', 'supabase')
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.doUnmock('@/lib/supabase/server')
    vi.doUnmock('@/lib/daily-bread/repository')
  })

  function mockSession(email: string | null) {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: async () => ({
        auth: { getUser: async () => ({ data: { user: email ? { id: 'u', email } : null }, error: null }) },
      }),
    }))
  }

  it('publish refuses anonymous callers and founder sessions without the internal secret', async () => {
    mockSession('founder@example.com')
    const repo = { publish: vi.fn() }
    vi.doMock('@/lib/daily-bread/repository', () => ({ getDailyBreadRepository: () => repo }))
    const { POST } = await import('@/app/api/admin/daily-bread/publish/route')
    const res = await POST(
      new Request('http://x/api/admin/daily-bread/publish', {
        method: 'POST',
        body: JSON.stringify({ date: '2026-09-14' }),
        headers: { 'cf-connecting-ip': '10.0.0.1' },
      }) as never,
    )
    expect(res.status).toBe(403)
    expect(repo.publish).not.toHaveBeenCalled()
    const body = await res.text()
    expect(body).not.toContain('the-internal-secret-value')
  })

  it('publish validates the date and its window before touching the database', async () => {
    mockSession(null)
    const repo = { publish: vi.fn(), getEdition: vi.fn(), recordAttempt: vi.fn() }
    vi.doMock('@/lib/daily-bread/repository', () => ({ getDailyBreadRepository: () => repo }))
    const { POST } = await import('@/app/api/admin/daily-bread/publish/route')
    const call = (body: unknown, ip: string) =>
      POST(
        new Request('http://x/api/admin/daily-bread/publish', {
          method: 'POST',
          body: JSON.stringify(body),
          headers: { 'x-internal-secret': 'the-internal-secret-value', 'cf-connecting-ip': ip },
        }) as never,
      )
    expect((await call({ date: '2026-02-30' }, '10.0.0.2')).status).toBe(400)
    expect((await call({ date: "2026-09-14'; drop table" }, '10.0.0.3')).status).toBe(400)
    expect((await call({ date: '2031-01-01' }, '10.0.0.4')).status).toBe(400)
    expect(repo.publish).not.toHaveBeenCalled()
  })

  it('publish is rate limited per client', async () => {
    mockSession(null)
    vi.doMock('@/lib/daily-bread/repository', () => ({ getDailyBreadRepository: () => ({}) }))
    const { POST } = await import('@/app/api/admin/daily-bread/publish/route')
    let last = 0
    for (let i = 0; i < 12; i++) {
      const res = await POST(
        new Request('http://x/api/admin/daily-bread/publish', {
          method: 'POST',
          body: '{}',
          headers: { 'cf-connecting-ip': '10.9.9.9' },
        }) as never,
      )
      last = res.status
    }
    expect(last).toBe(429)
  })

  it('a publication refreshes the paper, its dated page and the archive (plan §28 step 31)', async () => {
    mockSession(null)
    const revalidatePath = vi.fn()
    vi.doMock('next/cache', () => ({ revalidatePath }))
    vi.doMock('@/lib/daily-bread/source-review', () => ({ rejectedEditionItemIds: async () => [] }))
    const { editorialDate } = await import('@/lib/daily-bread/time')
    const date = editorialDate(new Date())
    const results = ['published', 'already_published', 'not_ready']
    const repo = {
      publish: vi.fn(async () => ({ result: results.shift(), issue: 3, volume: 1 })),
      getEdition: vi.fn(async () => null),
      recordAttempt: vi.fn(async () => {}),
    }
    vi.doMock('@/lib/daily-bread/repository', () => ({ getDailyBreadRepository: () => repo }))
    const { POST } = await import('@/app/api/admin/daily-bread/publish/route')
    const call = (ip: string) =>
      POST(
        new Request('http://x/api/admin/daily-bread/publish', {
          method: 'POST',
          body: JSON.stringify({ date }),
          headers: { 'x-internal-secret': 'the-internal-secret-value', 'cf-connecting-ip': ip },
        }) as never,
      )
    expect((await call('10.2.0.1')).status).toBe(200)
    expect(revalidatePath.mock.calls.map((c) => c[0])).toEqual(['/daily-bread', `/daily-bread/${date}`, '/daily-bread/archive'])
    await call('10.2.0.2') // already_published: the Worker cron's call after a CI publish
    expect(revalidatePath).toHaveBeenCalledTimes(6)
    await call('10.2.0.3') // not ready: nothing changed, nothing refreshed
    expect(revalidatePath).toHaveBeenCalledTimes(6)
    vi.doUnmock('next/cache')
    vi.doUnmock('@/lib/daily-bread/source-review')
  })

  it('health requires the secret or an allowlisted founder session', async () => {
    mockSession('stranger@example.com')
    vi.doMock('@/lib/daily-bread/repository', () => ({ getDailyBreadRepository: () => ({}) }))
    const { GET } = await import('@/app/api/admin/daily-bread/health/route')
    const res = await GET(new Request('http://x/api/admin/daily-bread/health', { headers: { 'cf-connecting-ip': '10.1.1.1' } }) as never)
    expect(res.status).toBe(403)
  })
})
