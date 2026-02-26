import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockOutlineResult } from './helpers/mock-outlines'

// Mock outline generator to return test outlines (no real LLM in tests).
vi.mock('@/lib/soul-audit/outline-generator', () => ({
  generatePlanOutlines: vi.fn(async () => createMockOutlineResult()),
  reconstructPlanOutline: vi.fn((params: Record<string, unknown>) => ({
    id: params.id ?? 'test-outline',
    angle: 'Through Hope',
    title: params.title ?? 'Test Plan',
    question: params.question ?? 'Test question',
    reasoning: params.reasoning ?? 'Test reasoning',
    scriptureAnchor: 'Psalm 23:1',
    dayOutlines: (
      params.preview as { dayOutlines?: Array<Record<string, unknown>> }
    )?.dayOutlines?.map(
      (d: Record<string, unknown>, i: number) => ({
        day: d.day ?? i + 1,
        dayType: d.dayType ?? 'devotional',
        chiasticPosition: 'A',
        title: d.title ?? `Day ${i + 1}`,
        scriptureReference: d.scriptureReference ?? 'Psalm 23:1',
        topicFocus: d.topicFocus ?? 'Trust',
        pardesLevel: 'peshat',
        suggestedModules: ['scripture', 'teaching', 'reflection'],
      }),
    ) ?? [],
    referenceSeeds: ['commentary/psalms'],
  })),
}))

// Mock generative builder to return a test devotional day (no real LLM).
vi.mock('@/lib/soul-audit/generative-builder', () => ({
  generateDevotionalDay: vi.fn(
    async (params: { dayOutline: { day: number; title: string; scriptureReference: string; topicFocus: string; chiasticPosition?: string } }) => ({
      day: {
        day: params.dayOutline.day,
        dayType: 'devotional',
        title: params.dayOutline.title,
        scriptureReference: params.dayOutline.scriptureReference,
        scriptureText: 'The Lord is my shepherd; I shall not want.',
        reflection: 'A test reflection on trust and surrender.',
        prayer: 'Lord, guide us today.',
        nextStep: 'Take a moment to be still.',
        journalPrompt: 'What does trust look like for you today?',
        chiasticPosition: params.dayOutline.chiasticPosition ?? 'A',
        modules: [
          { type: 'scripture', heading: 'Scripture', content: {} },
          { type: 'teaching', heading: 'Teaching', content: {} },
          { type: 'reflection', heading: 'Reflection', content: {} },
        ],
        totalWords: 450,
        targetLengthMinutes: 10,
        generationStatus: 'ready',
      },
      usedChunkIds: ['chunk-1'],
    }),
  ),
}))

import { buildAuditOptions } from '@/lib/soul-audit/matching'
import { getCuratedDayCandidates } from '@/lib/soul-audit/curation-engine'
import { POST as submitHandler } from '@/app/api/soul-audit/submit/route'
import { POST as consentHandler } from '@/app/api/soul-audit/consent/route'
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

  it('selecting the first AI option always returns a devotional plan route', async () => {
    const localOptions = buildAuditOptions(
      'too much on my plate and I need focused peace and faithful structure',
    )
    expect(localOptions).toHaveLength(5)

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

    const consentResponse = await consentHandler(
      postJson('http://localhost/api/soul-audit/consent', {
        auditRunId: submitPayload.auditRunId,
        essentialAccepted: true,
        analyticsOptIn: false,
        crisisAcknowledged: false,
      }) as never,
    )
    expect(consentResponse.status).toBe(200)

    const firstAiOption = submitPayload.options.find(
      (option) => option.kind === 'ai_generative',
    )
    expect(firstAiOption).toBeTruthy()

    const selectResponse = await selectHandler(
      postJson('http://localhost/api/soul-audit/select', {
        auditRunId: submitPayload.auditRunId,
        optionId: firstAiOption?.id,
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
    expect(selectPayload.selectionType).toBe('ai_generative')
    expect(typeof selectPayload.planToken).toBe('string')
    expect(selectPayload.route).toMatch(/\/soul-audit\/plan\/[^/?]+\?day=\d+/)
  })
})
