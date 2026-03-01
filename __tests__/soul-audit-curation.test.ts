import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock composer (no real LLM calls in tests).
vi.mock('@/lib/soul-audit/composer', () => ({
  composeDay: vi.fn(
    async (params: {
      dayNumber: number
      chiasticPosition: string
      candidate: { dayTitle?: string; scriptureReference?: string }
    }) => ({
      day: {
        day: params.dayNumber,
        dayType: 'devotional',
        title: params.candidate.dayTitle ?? `Day ${params.dayNumber}`,
        scriptureReference: params.candidate.scriptureReference ?? 'Psalm 23:1',
        scriptureText: 'The Lord is my shepherd; I shall not want.',
        reflection: 'A test reflection on trust and surrender.',
        prayer: 'Lord, guide us today.',
        nextStep: 'Take a moment to be still.',
        journalPrompt: 'What does trust look like for you today?',
        chiasticPosition: params.chiasticPosition,
        totalWords: 4500,
        targetLengthMinutes: 30,
        generationStatus: 'ready',
      },
      usedChunkIds: ['test-chunk-1'],
    }),
  ),
  retrieveIngredientsForDay: vi.fn(() => []),
  WEEK_CHIASTIC: ['A', 'B', 'C', "B'", "A'"],
  WEEK_PARDES: ['peshat', 'remez', 'derash', 'sod', 'integrated'],
  isComposerAvailable: vi.fn(() => true),
}))

import { getCuratedDayCandidates } from '@/lib/soul-audit/curation-engine'
import { POST as submitHandler } from '@/app/api/soul-audit/submit/route'
import { POST as selectHandler } from '@/app/api/soul-audit/select/route'
import { resetSessionAuditCount } from '@/lib/soul-audit/repository'

let sessionToken = 'curation-session'
const originalRunTokenSecret = process.env.SOUL_AUDIT_RUN_TOKEN_SECRET

vi.mock('@/lib/soul-audit/session', () => ({
  getOrCreateAuditSessionToken: vi.fn(async () => sessionToken),
}))

function postJson(url: string, body: Record<string, unknown>) {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('Soul Audit curation reliability', () => {
  beforeEach(() => {
    process.env.SOUL_AUDIT_RUN_TOKEN_SECRET =
      'test-run-token-secret-12345678901234567890'
    sessionToken = `curation-session-${Date.now()}-${Math.random().toString(36).slice(2)}`
    resetSessionAuditCount(sessionToken)
  })

  afterAll(() => {
    if (originalRunTokenSecret === undefined) {
      delete process.env.SOUL_AUDIT_RUN_TOKEN_SECRET
      return
    }
    process.env.SOUL_AUDIT_RUN_TOKEN_SECRET = originalRunTokenSecret
  })

  it('has curated candidates and at least one complete 5-day series', () => {
    const candidates = getCuratedDayCandidates()
    expect(candidates.length).toBeGreaterThan(0)

    const daysBySeries = new Map<string, Set<number>>()
    for (const candidate of candidates) {
      if (!daysBySeries.has(candidate.seriesSlug)) {
        daysBySeries.set(candidate.seriesSlug, new Set<number>())
      }
      daysBySeries.get(candidate.seriesSlug)?.add(candidate.dayNumber)
    }

    const completeSeries = Array.from(daysBySeries.values()).filter(
      (days) => days.size >= 5,
    )
    expect(completeSeries.length).toBeGreaterThan(0)
  })

  it('extracts rich module text from nested data modules', () => {
    const candidates = getCuratedDayCandidates()
    const candidate = candidates.find((item) => item.seriesSlug === 'why-jesus')
    expect(candidate).toBeTruthy()
    expect((candidate?.teachingText ?? '').length).toBeGreaterThan(200)
    expect((candidate?.reflectionPrompt ?? '').length).toBeGreaterThan(30)
    expect((candidate?.scriptureText ?? '').length).toBeGreaterThan(60)
  })

  it('selecting the first AI option returns a devotional plan route', async () => {
    const submitResponse = await submitHandler(
      postJson('http://localhost/api/soul-audit/submit', {
        response:
          'too much on my plate and I need focused peace and faithful structure',
      }) as never,
    )
    expect(submitResponse.status).toBe(200)
    const submitPayload = (await submitResponse.json()) as {
      auditRunId: string
      options: Array<{ id: string; kind: string }>
    }

    // All options are now ai_primary
    expect(submitPayload.options.length).toBe(3)
    expect(submitPayload.options.every((o) => o.kind === 'ai_primary')).toBe(
      true,
    )

    const firstOption = submitPayload.options[0]
    expect(firstOption).toBeTruthy()

    const selectResponse = await selectHandler(
      postJson('http://localhost/api/soul-audit/select', {
        auditRunId: submitPayload.auditRunId,
        optionId: firstOption.id,
        essentialAccepted: true,
      }) as never,
    )
    const selectPayload = (await selectResponse.json()) as {
      ok?: boolean
      selectionType?: string
      planToken?: string
      route?: string
    }
    expect(selectResponse.status).toBe(200)
    expect(selectPayload.ok).toBe(true)
    expect(selectPayload.selectionType).toBe('ai_primary')
    expect(typeof selectPayload.planToken).toBe('string')
    expect(selectPayload.route).toMatch(/\/soul-audit\/plan\/[^/?]+\?day=\d+/)
  })
})
