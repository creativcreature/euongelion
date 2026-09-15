// @vitest-environment node
/**
 * Plan §66–72 (SA-142 / F-184): structured attempt logs, the plan's stage
 * names with failures recorded where they happened, the health surface, alert
 * levels, and cost from the Claude CLI.
 */
import { describe, expect, it } from 'vitest'
import { offlineSources } from '@/lib/daily-bread/e2e'
import { getDailyBreadHealth } from '@/lib/daily-bread/health'
import { createRunLogger } from '@/lib/daily-bread/log'
import { createDailyBreadEdition } from '@/lib/daily-bread/orchestrator'
import { parseCliResult } from '@/lib/daily-bread/providers/claude-cli'
import { publishDailyBreadEdition } from '@/lib/daily-bread/publish'
import { MemoryDailyBreadRepository } from '@/lib/daily-bread/repository/memory'
import { fixedClock } from '@/lib/daily-bread/time'
import type { PublicationAttempt } from '@/lib/daily-bread/types'

function capture() {
  const lines: Record<string, unknown>[] = []
  const logger = createRunLogger('obs', { sink: (_l, line) => lines.push(JSON.parse(line.slice(line.indexOf('{')))) })
  return { logger, lines }
}

const deps = (repo: MemoryDailyBreadRepository, at: string, logger = capture().logger) => ({
  repo,
  sources: offlineSources(),
  providers: [],
  clock: fixedClock(at),
  logger,
  trigger: 'e2e' as const,
  policy: 'deterministic-only' as const,
})

describe('pipeline stages and attempt logs (plan §66–67)', () => {
  it('emits the plan’s stages and one attempt line with every identifier', async () => {
    const repo = new MemoryDailyBreadRepository()
    const { logger, lines } = capture()
    const built = await createDailyBreadEdition('2026-09-14', deps(repo, '2026-09-13T23:00:00Z', logger))
    expect(built.result).toBe('ready')
    const stages = lines.filter((l) => l.event === 'stage_timing').map((l) => l.stage)
    expect(stages).toEqual(['lock_acquired', 'sources_loaded', 'asset_selection', 'primary_generation', 'comic_generation', 'composition', 'validation', 'ready'])
    expect(lines.some((l) => l.event === 'static_capture' && l.result === 'skipped')).toBe(true)
    const done = lines.find((l) => l.event === 'attempt_completed')!
    expect(done).toMatchObject({
      target_date: '2026-09-14',
      attempt_id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      edition_id: expect.any(String),
      stage: 'ready',
      provider: 'deterministic',
      fallback_level: 2,
      quality: expect.stringMatching(/normal|fallback|minimum/),
      duration_ms: expect.any(Number),
      result: 'ready',
    })
    const pub = capture()
    await publishDailyBreadEdition('2026-09-14', deps(repo, '2026-09-14T11:05:00Z', pub.logger))
    expect(pub.lines.filter((l) => l.event === 'stage_timing').map((l) => l.stage)).toEqual(['published'])
    expect(pub.lines.find((l) => l.event === 'attempt_completed')).toMatchObject({ issue_number: 1, result: 'published' })
    // No secret-shaped value in any line.
    expect(JSON.stringify([...lines, ...pub.lines])).not.toMatch(/sk-ant-|AIza|Bearer /)
  }, 60_000)

  it('records a failure against the stage that failed, not "assemble"', async () => {
    const repo = new MemoryDailyBreadRepository()
    const d = deps(repo, '2026-09-13T23:00:00Z')
    d.sources.publishedStrips = async () => {
      throw new Error('published strips read failed: fetch failed')
    }
    const out = await createDailyBreadEdition('2026-09-14', d)
    expect(out.result).toBe('failed')
    const [attempt] = await repo.recentAttempts(1)
    expect(attempt.errors[0]).toMatchObject({ stage: 'comic_generation' })
    expect(attempt.errors[0].message).toContain('fetch failed')
  }, 60_000)
})

describe('health surface and alert levels (plan §69–70)', () => {
  const attempt = (over: Partial<PublicationAttempt>): PublicationAttempt => ({
    targetDate: '2026-09-15',
    runId: 'r',
    trigger: 'scheduler',
    startedAt: '2026-09-15T02:00:00Z',
    completedAt: '2026-09-15T02:01:00Z',
    lifecycleStage: 'ready',
    fallbackProvidersUsed: [],
    errors: [],
    warnings: [],
    moduleFailures: [],
    assetFallbacks: [],
    stageTimings: [],
    providerUsage: [],
    estimatedCostUsd: 0,
    publicationResult: 'ready',
    ...over,
  })

  it('reports provider state, the latest failure, and warnings when Claude fails over to the backup', async () => {
    const repo = new MemoryDailyBreadRepository()
    await repo.recordAttempt(
      attempt({
        providerUsage: [
          { provider: 'claude-api', task: 'editorial-frame', ok: false, attempts: 0, durationMs: 0, error: 'unavailable (not configured)' },
          { provider: 'claude-cli', task: 'editorial-frame', ok: false, attempts: 1, durationMs: 900, error: 'claude-cli: exit 1 (quota)' },
          { provider: 'openai', task: 'editorial-frame', ok: true, attempts: 1, durationMs: 4000, estimatedCostUsd: 0.0012 },
        ],
        assetFallbacks: ['comic: omitted'],
      }),
    )
    await repo.recordAttempt(
      attempt({ targetDate: '2026-09-13', startedAt: '2026-09-13T02:00:00Z', lifecycleStage: 'comic_generation', publicationResult: 'failed', errors: [{ stage: 'comic_generation', message: 'fetch failed' }] }),
    )
    const health = await getDailyBreadHealth(repo, fixedClock('2026-09-15T03:00:00Z'))
    expect(health.providers).toMatchObject({ claude: 'failing', secondary: 'configured' })
    expect(health.providers.claudeDetail).toContain('quota')
    expect(health.latestFailure).toMatchObject({ targetDate: '2026-09-13', stage: 'comic_generation' })
    expect(health.warnings.join(' ')).toContain('Claude failed and the backup wrote the frame')
    expect(health.warnings.join(' ')).toContain('comic was omitted')
    expect(health.latestPublished).toBeNull()
  })

  it('raises critical alerts: nothing ready before the deadline, a failed publication transaction, repeated duplicates', async () => {
    const repo = new MemoryDailyBreadRepository()
    for (let i = 0; i < 3; i++) {
      await repo.recordAttempt(attempt({ targetDate: '2026-09-15', startedAt: `2026-09-15T0${i}:00:00Z`, lifecycleStage: 'lease:assembling', publicationResult: 'skipped' }))
    }
    await repo.recordAttempt(
      attempt({ targetDate: '2026-09-15', startedAt: '2026-09-15T09:00:00Z', lifecycleStage: 'published', publicationResult: 'failed', errors: [{ stage: 'published', message: 'daily-bread publish failed: timeout' }] }),
    )
    // 6am ET on Sep 15: today's (Sep 14) paper is missing and tomorrow is not ready.
    const health = await getDailyBreadHealth(repo, fixedClock('2026-09-15T10:00:00Z'))
    expect(health.alertLevel).toBe('critical')
    const text = health.critical.join(' | ')
    expect(text).toContain('No issue ready before the deadline')
    expect(text).toContain('publication transaction failed for 2026-09-15')
    expect(text).toContain('Duplicate edition attempts for 2026-09-15: 3')
    expect(health.alerts).toEqual([...health.critical, ...health.warnings])
  })
})

describe('Claude CLI cost (plan §72)', () => {
  it('reads tokens, cost and the writing model from the CLI’s JSON result', () => {
    const json = JSON.stringify({
      type: 'result',
      is_error: false,
      result: ' {"deck":"x"} ',
      usage: { input_tokens: 12, cache_creation_input_tokens: 2400, cache_read_input_tokens: 100, output_tokens: 40 },
      total_cost_usd: 0.0251,
      modelUsage: { 'claude-haiku-4-5-20251001': {}, 'claude-opus-5[1m]': {} },
    })
    expect(parseCliResult(json, 'claude-code-default')).toEqual({
      result: { text: '{"deck":"x"}', model: 'claude-opus-5[1m]', inputTokens: 2512, outputTokens: 40, estimatedCostUsd: 0.0251 },
    })
  })

  it('an error result is an error; plain text still works with no usage (missing cost never fails a task)', () => {
    expect(parseCliResult(JSON.stringify({ type: 'result', is_error: true, result: "You've hit your weekly limit" }), 'm')).toEqual({
      error: "You've hit your weekly limit",
    })
    expect(parseCliResult('just text', 'm')).toEqual({ result: { text: 'just text', model: 'm' } })
  })
})
