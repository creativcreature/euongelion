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
  composeSabbath: vi.fn(() => ({
    day: 6,
    dayType: 'sabbath',
    title: 'Sabbath Rest',
    scriptureReference: 'Psalm 46:10',
    scriptureText: 'Be still.',
    reflection: 'Rest.',
    prayer: 'Amen.',
    nextStep: 'Rest.',
    journalPrompt: 'What do you need?',
    chiasticPosition: 'Sabbath',
    generationStatus: 'ready',
  })),
  composeRecap: vi.fn(() => ({
    day: 7,
    dayType: 'review',
    title: 'Week in Review',
    scriptureReference: 'Philippians 1:6',
    scriptureText: 'He who began.',
    reflection: 'Review.',
    prayer: 'Amen.',
    nextStep: 'Reflect.',
    journalPrompt: 'What did you learn?',
    chiasticPosition: 'Review',
    generationStatus: 'ready',
  })),
  WEEK_CHIASTIC: ['A', 'B', 'C', "B'", "A'"],
  WEEK_PARDES: ['peshat', 'remez', 'derash', 'sod', 'integrated'],
  isComposerAvailable: vi.fn(() => true),
}))

import { POST as submitHandler } from '@/app/api/soul-audit/submit/route'
import { POST as selectHandler } from '@/app/api/soul-audit/select/route'
import { POST as resetHandler } from '@/app/api/soul-audit/manage/route'
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

async function createRun() {
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

  it('blocks selection when essential consent is explicitly false', async () => {
    const submitResponse = await submitHandler(
      postJson('http://localhost/api/soul-audit/submit', {
        response: 'I want help naming what I am carrying this week.',
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
        essentialAccepted: false,
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

  it('rejects invalid audit run id format at select', async () => {
    const selectResponse = await selectHandler(
      postJson('http://localhost/api/soul-audit/select', {
        auditRunId: '../not-safe',
        optionId: 'ai_primary:identity:1:1',
        essentialAccepted: true,
      }) as never,
    )
    expect(selectResponse.status).toBe(400)
  })

  it('rejects invalid option id format at select', async () => {
    const submitPayload = await createRun()
    const response = await selectHandler(
      postJson('http://localhost/api/soul-audit/select', {
        auditRunId: submitPayload.auditRunId,
        optionId: 'DROP TABLE',
        essentialAccepted: true,
      }) as never,
    )
    expect(response.status).toBe(400)
  })

  it('rejects select for a different session token', async () => {
    const submitPayload = await createRun()

    const originalToken = sessionToken
    sessionToken = `${originalToken}-other`

    const selectResponse = await selectHandler(
      postJson('http://localhost/api/soul-audit/select', {
        auditRunId: submitPayload.auditRunId,
        optionId: submitPayload.options[0].id,
        essentialAccepted: true,
      }) as never,
    )
    expect(selectResponse.status).toBe(403)
  })

  it('rejects selection for unknown option id', async () => {
    const submitPayload = await createRun()
    const response = await selectHandler(
      postJson('http://localhost/api/soul-audit/select', {
        auditRunId: submitPayload.auditRunId,
        optionId: 'ai_primary:not-real:9:9',
        essentialAccepted: true,
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
    const submitPayload = await createRun()
    const option = submitPayload.options[0]
    expect(option).toBeTruthy()

    const selectResponse = await selectHandler(
      postJson('http://localhost/api/soul-audit/select', {
        auditRunId: submitPayload.auditRunId,
        optionId: option.id,
        essentialAccepted: true,
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
