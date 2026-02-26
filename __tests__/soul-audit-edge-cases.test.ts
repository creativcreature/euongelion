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

import { POST as submitHandler } from '@/app/api/soul-audit/submit/route'
import { POST as consentHandler } from '@/app/api/soul-audit/consent/route'
import { POST as selectHandler } from '@/app/api/soul-audit/select/route'
import { POST as resetHandler } from '@/app/api/soul-audit/reset/route'
import { GET as planDayHandler } from '@/app/api/devotional-plan/[token]/day/[n]/route'
import {
  getLatestSelectionForSessionWithFallback,
  resetSessionAuditCount,
} from '@/lib/soul-audit/repository'

let sessionToken = 'edge-session'
const originalRunTokenSecret = process.env.SOUL_AUDIT_RUN_TOKEN_SECRET

vi.mock('@/lib/soul-audit/session', () => ({
  getOrCreateAuditSessionToken: vi.fn(async () => sessionToken),
  rotateAuditSessionToken: vi.fn(async () => `${sessionToken}-rotated`),
}))

function postJson(url: string, body: Record<string, unknown>) {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function createRunAndConsent() {
  const submitResponse = await submitHandler(
    postJson('http://localhost/api/soul-audit/submit', {
      response: 'I am searching for truth and good news in this season.',
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
  return submitPayload
}

describe('Soul Audit edge cases', () => {
  beforeEach(() => {
    process.env.SOUL_AUDIT_RUN_TOKEN_SECRET =
      'test-run-token-secret-12345678901234567890'
    sessionToken = `edge-session-${Date.now()}-${Math.random().toString(36).slice(2)}`
    resetSessionAuditCount(sessionToken)
  })

  afterAll(() => {
    if (originalRunTokenSecret === undefined) {
      delete process.env.SOUL_AUDIT_RUN_TOKEN_SECRET
      return
    }
    process.env.SOUL_AUDIT_RUN_TOKEN_SECRET = originalRunTokenSecret
  })

  it('rejects empty submit input', async () => {
    const response = await submitHandler(
      postJson('http://localhost/api/soul-audit/submit', {
        response: '   ',
      }) as never,
    )
    expect(response.status).toBe(400)
  })

  it('rejects submit input above 2000 chars', async () => {
    const response = await submitHandler(
      postJson('http://localhost/api/soul-audit/submit', {
        response: 'a'.repeat(2001),
      }) as never,
    )
    expect(response.status).toBe(400)
  })

  it('enforces audit limit at 3 per cycle', async () => {
    const responses = await Promise.all([
      submitHandler(
        postJson('http://localhost/api/soul-audit/submit', {
          response: 'I need guidance and peace for this week.',
        }) as never,
      ),
      submitHandler(
        postJson('http://localhost/api/soul-audit/submit', {
          response: 'I need guidance and peace for this week.',
        }) as never,
      ),
      submitHandler(
        postJson('http://localhost/api/soul-audit/submit', {
          response: 'I need guidance and peace for this week.',
        }) as never,
      ),
    ])
    responses.forEach((response) => expect(response.status).toBe(200))

    const fourth = await submitHandler(
      postJson('http://localhost/api/soul-audit/submit', {
        response: 'I need guidance and peace for this week.',
      }) as never,
    )
    expect(fourth.status).toBe(429)
  })

  it('blocks consent when essential consent is false', async () => {
    const submitResponse = await submitHandler(
      postJson('http://localhost/api/soul-audit/submit', {
        response: 'I want help naming what I am carrying this week.',
      }) as never,
    )
    expect(submitResponse.status).toBe(200)
    const submitPayload = (await submitResponse.json()) as {
      auditRunId: string
    }

    const consentResponse = await consentHandler(
      postJson('http://localhost/api/soul-audit/consent', {
        auditRunId: submitPayload.auditRunId,
        essentialAccepted: false,
      }) as never,
    )
    expect(consentResponse.status).toBe(400)
    const payload = (await consentResponse.json()) as {
      code?: string
      requiredActions?: { essentialConsent?: boolean }
    }
    expect(payload.code).toBe('ESSENTIAL_CONSENT_REQUIRED')
    expect(payload.requiredActions?.essentialConsent).toBe(true)
  })

  it('blocks selection before consent', async () => {
    const submitResponse = await submitHandler(
      postJson('http://localhost/api/soul-audit/submit', {
        response: 'I am overwhelmed and need direction this week.',
      }) as never,
    )
    expect(submitResponse.status).toBe(200)
    const submitPayload = (await submitResponse.json()) as {
      auditRunId: string
      options: Array<{ id: string }>
    }

    const selectionResponse = await selectHandler(
      postJson('http://localhost/api/soul-audit/select', {
        auditRunId: submitPayload.auditRunId,
        optionId: submitPayload.options[0].id,
      }) as never,
    )
    expect(selectionResponse.status).toBe(400)
    const payload = (await selectionResponse.json()) as {
      code?: string
      requiredActions?: { essentialConsent?: boolean }
    }
    expect(payload.code).toBe('ESSENTIAL_CONSENT_REQUIRED')
    expect(payload.requiredActions?.essentialConsent).toBe(true)
  })

  it('rejects invalid audit run id format at consent and select', async () => {
    const consentResponse = await consentHandler(
      postJson('http://localhost/api/soul-audit/consent', {
        auditRunId: '../not-safe',
        essentialAccepted: true,
      }) as never,
    )
    expect(consentResponse.status).toBe(400)

    const selectResponse = await selectHandler(
      postJson('http://localhost/api/soul-audit/select', {
        auditRunId: '../not-safe',
        optionId: 'ai_primary:identity:1:1',
      }) as never,
    )
    expect(selectResponse.status).toBe(400)
  })

  it('rejects invalid option id format at select', async () => {
    const submitPayload = await createRunAndConsent()
    const response = await selectHandler(
      postJson('http://localhost/api/soul-audit/select', {
        auditRunId: submitPayload.auditRunId,
        optionId: 'DROP TABLE',
      }) as never,
    )
    expect(response.status).toBe(400)
  })

  it('rejects consent/select for a different session token', async () => {
    const submitPayload = await createRunAndConsent()

    const originalToken = sessionToken
    sessionToken = `${originalToken}-other`

    const consentResponse = await consentHandler(
      postJson('http://localhost/api/soul-audit/consent', {
        auditRunId: submitPayload.auditRunId,
        essentialAccepted: true,
        analyticsOptIn: false,
      }) as never,
    )
    expect(consentResponse.status).toBe(403)

    const selectResponse = await selectHandler(
      postJson('http://localhost/api/soul-audit/select', {
        auditRunId: submitPayload.auditRunId,
        optionId: submitPayload.options[0].id,
      }) as never,
    )
    expect(selectResponse.status).toBe(403)
  })

  it('rejects selection for unknown option id', async () => {
    const submitPayload = await createRunAndConsent()
    const response = await selectHandler(
      postJson('http://localhost/api/soul-audit/select', {
        auditRunId: submitPayload.auditRunId,
        optionId: 'ai_primary:not-real:9:9',
      }) as never,
    )
    expect(response.status).toBe(404)
  })

  it('devotional plan endpoint returns 400 for invalid day param', async () => {
    const response = await planDayHandler(
      new Request(
        'http://localhost/api/devotional-plan/not-real/day/not-a-number',
      ) as never,
      {
        params: Promise.resolve({ token: 'not-real', n: 'not-a-number' }),
      } as never,
    )
    expect(response.status).toBe(400)
  })

  it('devotional plan endpoint returns 404 for unknown plan token', async () => {
    const response = await planDayHandler(
      new Request(
        'http://localhost/api/devotional-plan/not-real/day/1',
      ) as never,
      { params: Promise.resolve({ token: 'not-real', n: '1' }) } as never,
    )
    expect(response.status).toBe(404)
  })

  it('reset endpoint clears current selection state for session', async () => {
    const submitPayload = await createRunAndConsent()
    const prefabOption = submitPayload.options.find(
      (option) => option.kind === 'curated_prefab',
    )
    expect(prefabOption).toBeTruthy()

    const selectResponse = await selectHandler(
      postJson('http://localhost/api/soul-audit/select', {
        auditRunId: submitPayload.auditRunId,
        optionId: prefabOption?.id,
      }) as never,
    )
    expect(selectResponse.status).toBe(200)

    const beforeReset =
      await getLatestSelectionForSessionWithFallback(sessionToken)
    expect(beforeReset).not.toBeNull()

    const resetResponse = await resetHandler()
    expect(resetResponse.status).toBe(200)

    const afterReset =
      await getLatestSelectionForSessionWithFallback(sessionToken)
    expect(afterReset).toBeNull()
  })
})
