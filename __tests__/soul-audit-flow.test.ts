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
        compositionReport: {
          referencePercentage: 80,
          generatedPercentage: 20,
          sources: ['Test Commentary'],
        },
      },
      usedChunkIds: ['test-chunk-1'],
    }),
  ),
  retrieveIngredientsForDay: vi.fn(() => []),
  WEEK_CHIASTIC: ['A', 'B', 'C', "B'", "A'"],
  WEEK_PARDES: ['peshat', 'remez', 'derash', 'sod', 'integrated'],
  composeSabbath: vi.fn(() => ({
    day: 6,
    dayType: 'sabbath',
    title: 'Sabbath Rest',
    scriptureReference: 'Psalm 46:10',
    scriptureText: 'Be still, and know that I am God.',
    reflection: 'Rest.',
    prayer: 'Amen.',
    nextStep: 'Rest.',
    journalPrompt: 'What lingered?',
    chiasticPosition: 'Sabbath',
    generationStatus: 'ready',
  })),
  composeRecap: vi.fn(() => ({
    day: 7,
    dayType: 'review',
    title: 'Week in Review',
    scriptureReference: 'Philippians 1:6',
    scriptureText: 'He who began a good work...',
    reflection: 'Review.',
    prayer: 'Amen.',
    nextStep: 'Start next path.',
    journalPrompt: 'What did you learn?',
    chiasticPosition: 'Review',
    generationStatus: 'ready',
  })),
  isComposerAvailable: vi.fn(() => true),
}))

import { POST as submitHandler } from '@/app/api/soul-audit/submit/route'
import { POST as selectHandler } from '@/app/api/soul-audit/select/route'
import { POST as resetHandler } from '@/app/api/soul-audit/manage/route'
import {
  getLatestSelectionForSessionWithFallback,
  resetSessionAuditCount,
} from '@/lib/soul-audit/repository'
import { createConsentToken } from '@/lib/soul-audit/consent-token'

let mockedSessionToken = 'test-session-token'
const originalRunTokenSecret = process.env.SOUL_AUDIT_RUN_TOKEN_SECRET

vi.mock('@/lib/soul-audit/session', () => ({
  getOrCreateAuditSessionToken: vi.fn(async () => mockedSessionToken),
  rotateAuditSessionToken: vi.fn(async () => {
    mockedSessionToken = `${mockedSessionToken}-rotated`
    return mockedSessionToken
  }),
}))

function postJson(
  url: string,
  body: Record<string, unknown>,
  headers?: HeadersInit,
) {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(headers || {}) },
    body: JSON.stringify(body),
  })
}

describe('Soul Audit staged flow', () => {
  beforeEach(() => {
    process.env.SOUL_AUDIT_RUN_TOKEN_SECRET =
      'test-run-token-secret-12345678901234567890'
    mockedSessionToken = 'test-session-token'
    resetSessionAuditCount('test-session-token')
    resetSessionAuditCount('session-a')
    resetSessionAuditCount('session-b')
    resetSessionAuditCount('session-c')
  })

  afterAll(() => {
    if (originalRunTokenSecret === undefined) {
      delete process.env.SOUL_AUDIT_RUN_TOKEN_SECRET
      return
    }
    process.env.SOUL_AUDIT_RUN_TOKEN_SECRET = originalRunTokenSecret
  })

  it('submit returns 3 ai_primary direction options', async () => {
    const response = await submitHandler(
      postJson('http://localhost/api/soul-audit/submit', {
        response: 'I feel spiritually numb, distracted, and I need peace.',
      }) as never,
    )
    expect(response.status).toBe(200)

    const payload = (await response.json()) as Record<string, unknown>
    expect(payload.version).toBe('v2')
    expect(Array.isArray(payload.options)).toBe(true)

    const options = payload.options as Array<{
      kind: string
      title: string
      preview?: { verse?: string; verseText?: string }
    }>

    // All options are now ai_primary (ingredient-selection model)
    expect(options.length).toBe(3)
    expect(options.every((o) => o.kind === 'ai_primary')).toBe(true)
    expect(options.every((o) => o.title.trim().length > 0)).toBe(true)
    expect(payload).not.toHaveProperty('customPlan')
    expect(payload).not.toHaveProperty('customDevotional')

    // Each option should have a preview with curationSeed
    expect(
      options.every(
        (o) =>
          typeof o.preview?.verse === 'string' &&
          o.preview.verse.trim().length > 0,
      ),
    ).toBe(true)
  })

  it('short input returns options with inputGuidance', async () => {
    const response = await submitHandler(
      postJson('http://localhost/api/soul-audit/submit', {
        response: 'money',
      }) as never,
    )
    expect(response.status).toBe(200)

    const payload = (await response.json()) as {
      auditRunId?: string
      options?: unknown[]
      inputGuidance?: string
    }

    // Short input now returns options directly (no clarifier gate)
    // with an optional inputGuidance hint
    expect(payload.auditRunId).toBeTruthy()
    expect(Array.isArray(payload.options)).toBe(true)
  })

  it('accepts short phrase input and returns 3 options', async () => {
    const response = await submitHandler(
      postJson('http://localhost/api/soul-audit/submit', {
        response: 'I need peace and guidance today',
      }) as never,
    )
    expect(response.status).toBe(200)

    const payload = (await response.json()) as {
      options?: Array<{ kind: string }>
    }
    expect(Array.isArray(payload.options)).toBe(true)
    expect(payload.options).toHaveLength(3)
    expect(payload.options?.every((o) => o.kind === 'ai_primary')).toBe(true)
  })

  it('crisis acknowledgement gate is enforced at selection', async () => {
    const submitResponse = await submitHandler(
      postJson('http://localhost/api/soul-audit/submit', {
        response: 'I want to die and do not want to be here anymore.',
      }) as never,
    )
    const submitPayload = (await submitResponse.json()) as {
      auditRunId: string
      options: Array<{ id: string }>
    }

    const selectResponse = await selectHandler(
      postJson('http://localhost/api/soul-audit/select', {
        auditRunId: submitPayload.auditRunId,
        optionId: submitPayload.options[0].id,
        essentialAccepted: true,
        analyticsOptIn: false,
        crisisAcknowledged: false,
      }) as never,
    )

    expect(selectResponse.status).toBe(400)
    const selectPayload = (await selectResponse.json()) as {
      code?: string
      error?: string
      crisis?: {
        required?: boolean
        resources?: Array<{ name: string; contact: string }>
      }
    }
    expect(selectPayload.code).toBe('CRISIS_ACK_REQUIRED')
    expect(selectPayload.error).toMatch(/acknowledge/i)
    expect(selectPayload.crisis?.required).toBe(true)
    expect(Array.isArray(selectPayload.crisis?.resources)).toBe(true)
  })

  it('selection returns crisis gate details when consent token skips acknowledgement', async () => {
    mockedSessionToken = 'session-crisis-select'
    resetSessionAuditCount(mockedSessionToken)

    const submitResponse = await submitHandler(
      postJson('http://localhost/api/soul-audit/submit', {
        response: 'I want to die and do not want to be here anymore.',
      }) as never,
    )
    expect(submitResponse.status).toBe(200)
    const submitPayload = (await submitResponse.json()) as {
      auditRunId: string
      runToken: string
      options: Array<{ id: string }>
    }

    const forgedConsentToken = createConsentToken({
      auditRunId: submitPayload.auditRunId,
      essentialAccepted: true,
      analyticsOptIn: false,
      crisisAcknowledged: false,
      sessionToken: mockedSessionToken,
    })

    const selectResponse = await selectHandler(
      postJson('http://localhost/api/soul-audit/select', {
        auditRunId: submitPayload.auditRunId,
        optionId: submitPayload.options[0].id,
        runToken: submitPayload.runToken,
        consentToken: forgedConsentToken,
      }) as never,
    )
    expect(selectResponse.status).toBe(400)
    const selectPayload = (await selectResponse.json()) as {
      code?: string
      crisis?: {
        required?: boolean
        resources?: Array<{ name: string; contact: string }>
      }
    }
    expect(selectPayload.code).toBe('CRISIS_ACK_REQUIRED')
    expect(selectPayload.crisis?.required).toBe(true)
    expect(Array.isArray(selectPayload.crisis?.resources)).toBe(true)
  })

  it('AI option path returns plan token after inline consent + selection', async () => {
    const submitResponse = await submitHandler(
      postJson('http://localhost/api/soul-audit/submit', {
        response:
          'I am searching, skeptical, and curious about the gospel and truth.',
      }) as never,
    )
    expect(submitResponse.status).toBe(200)
    const submitPayload = (await submitResponse.json()) as {
      auditRunId: string
      options: Array<{ id: string; kind: string }>
    }

    const aiOptions = submitPayload.options.filter(
      (option) => option.kind === 'ai_primary',
    )
    expect(aiOptions.length).toBeGreaterThan(0)

    let selectionPayload:
      | {
          ok?: boolean
          selectionType?: string
          planToken?: string
          route?: string
          code?: string
        }
      | undefined
    let successful = false

    for (const aiOption of aiOptions) {
      const selectionResponse = await selectHandler(
        postJson(
          'http://localhost/api/soul-audit/select',
          {
            auditRunId: submitPayload.auditRunId,
            optionId: aiOption.id,
            essentialAccepted: true,
            analyticsOptIn: false,
            timezone: 'America/New_York',
            timezoneOffsetMinutes: 300,
          },
          {
            'x-timezone': 'America/New_York',
            'x-timezone-offset': '300',
          },
        ) as never,
      )

      selectionPayload = (await selectionResponse.json()) as {
        ok?: boolean
        selectionType?: string
        planToken?: string
        route?: string
        code?: string
      }

      if (selectionResponse.status === 200) {
        successful = true
        break
      }

      throw new Error(
        `Unexpected selection status ${selectionResponse.status}: ${JSON.stringify(selectionPayload)}`,
      )
    }

    expect(successful).toBe(true)
    expect(selectionPayload).toBeTruthy()
    if (!selectionPayload) {
      throw new Error('Expected selection payload to be defined')
    }
    expect(selectionPayload.ok).toBe(true)
    expect(selectionPayload.selectionType).toBe('ai_primary')
    expect(selectionPayload.planToken).toBeTruthy()
    expect(selectionPayload.route).toMatch(
      /\/soul-audit\/plan\/[^/?]+\?day=\d+/,
    )
  })

  it('reset clears current selection state', async () => {
    mockedSessionToken = 'session-reset-test'
    resetSessionAuditCount(mockedSessionToken)

    const submitResponse = await submitHandler(
      postJson('http://localhost/api/soul-audit/submit', {
        response: 'I feel disconnected and need guidance this week.',
      }) as never,
    )
    expect(submitResponse.status).toBe(200)
    const submitPayload = (await submitResponse.json()) as {
      auditRunId: string
      options: Array<{ id: string; kind: string }>
    }

    const option = submitPayload.options[0]
    expect(option).toBeTruthy()

    const selectionResponse = await selectHandler(
      postJson('http://localhost/api/soul-audit/select', {
        auditRunId: submitPayload.auditRunId,
        optionId: option.id,
        essentialAccepted: true,
      }) as never,
    )
    expect(selectionResponse.status).toBe(200)

    const beforeReset =
      await getLatestSelectionForSessionWithFallback(mockedSessionToken)
    expect(beforeReset).not.toBeNull()

    const resetResponse = await resetHandler()
    expect(resetResponse.status).toBe(200)
    const resetCookie = resetResponse.headers.get('set-cookie') || ''
    expect(resetCookie).toContain('euangelion_current_route=;')

    const afterReset =
      await getLatestSelectionForSessionWithFallback('session-reset-test')
    expect(afterReset).toBeNull()
  })

  it('rejects selection after session-token churn', async () => {
    mockedSessionToken = 'session-a'
    const submitResponse = await submitHandler(
      postJson('http://localhost/api/soul-audit/submit', {
        response: 'too much on my plate and I need faithful clarity now.',
      }) as never,
    )
    expect(submitResponse.status).toBe(200)

    const submitPayload = (await submitResponse.json()) as {
      auditRunId: string
      runToken: string
      options: Array<{ id: string; kind: string }>
    }
    expect(submitPayload.options.length).toBeGreaterThan(0)

    mockedSessionToken = 'session-b'
    const selectResponse = await selectHandler(
      postJson('http://localhost/api/soul-audit/select', {
        auditRunId: submitPayload.auditRunId,
        optionId: submitPayload.options[0].id,
        essentialAccepted: true,
      }) as never,
    )
    expect(selectResponse.status).toBe(403)
  })

  it('reroll submit mode does not consume additional audit-cycle count', async () => {
    mockedSessionToken = 'session-reroll-cycle'
    resetSessionAuditCount(mockedSessionToken)

    const first = await submitHandler(
      postJson('http://localhost/api/soul-audit/submit', {
        response:
          'I feel overwhelmed and need clarity for this week right now.',
      }) as never,
    )
    expect(first.status).toBe(200)
    const firstPayload = (await first.json()) as {
      auditRunId: string
      runToken: string
      remainingAudits: number
      version: string
    }
    expect(firstPayload.version).toBe('v2')
    expect(firstPayload.remainingAudits).toBe(2)

    const reroll = await submitHandler(
      postJson('http://localhost/api/soul-audit/submit', {
        response:
          'I feel overwhelmed and need clarity for this week right now.',
        rerollForRunId: firstPayload.auditRunId,
        runToken: firstPayload.runToken,
      }) as never,
    )
    expect(reroll.status).toBe(200)
    const rerollPayload = (await reroll.json()) as {
      remainingAudits: number
      version: string
    }
    expect(rerollPayload.version).toBe('v2')
    expect(rerollPayload.remainingAudits).toBe(2)
  })

  it('rejects unverified reroll submit requests', async () => {
    mockedSessionToken = 'session-reroll-invalid'
    resetSessionAuditCount(mockedSessionToken)

    const first = await submitHandler(
      postJson('http://localhost/api/soul-audit/submit', {
        response: 'I am spiritually numb and need a faithful next step.',
      }) as never,
    )
    expect(first.status).toBe(200)
    const firstPayload = (await first.json()) as {
      auditRunId: string
    }

    const reroll = await submitHandler(
      postJson('http://localhost/api/soul-audit/submit', {
        response: 'I am spiritually numb and need a faithful next step.',
        rerollForRunId: firstPayload.auditRunId,
        runToken: 'invalid.token.value',
      }) as never,
    )
    expect(reroll.status).toBe(403)
    const payload = (await reroll.json()) as { error?: string }
    expect(payload.error).toMatch(/could not be verified/i)
  })

  it('rejects reroll requests that alter the original response text', async () => {
    mockedSessionToken = 'session-reroll-mismatch'
    resetSessionAuditCount(mockedSessionToken)

    const first = await submitHandler(
      postJson('http://localhost/api/soul-audit/submit', {
        response: 'I need clarity, peace, and faithful consistency this week.',
      }) as never,
    )
    expect(first.status).toBe(200)
    const firstPayload = (await first.json()) as {
      auditRunId: string
      runToken: string
    }

    const mismatch = await submitHandler(
      postJson('http://localhost/api/soul-audit/submit', {
        response: 'Completely different response text for bypass testing.',
        rerollForRunId: firstPayload.auditRunId,
        runToken: firstPayload.runToken,
      }) as never,
    )
    expect(mismatch.status).toBe(409)
    const payload = (await mismatch.json()) as {
      code?: string
      error?: string
    }
    expect(payload.code).toBe('REROLL_RESPONSE_MISMATCH')
    expect(payload.error).toMatch(/original audit response/i)
  })
})
