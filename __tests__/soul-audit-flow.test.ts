import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST as submitHandler } from '@/app/api/soul-audit/submit/route'
import { POST as consentHandler } from '@/app/api/soul-audit/consent/route'
import { POST as selectHandler } from '@/app/api/soul-audit/select/route'
import { POST as resetHandler } from '@/app/api/soul-audit/reset/route'
import { GET as activeDaysHandler } from '@/app/api/daily-bread/active-days/route'
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

  it('submit returns exactly 5 options and no eager plan payload', async () => {
    const response = await submitHandler(
      postJson('http://localhost/api/soul-audit/submit', {
        response: 'I feel spiritually numb, distracted, and I need peace.',
      }) as never,
    )
    expect(response.status).toBe(200)

    const payload = (await response.json()) as Record<string, unknown>
    expect(payload.version).toBe('v2')
    expect(Array.isArray(payload.options)).toBe(true)
    expect((payload.options as unknown[]).length).toBe(5)
    const aiPrimary = (payload.options as Array<{ kind: string }>).filter(
      (option) => option.kind === 'ai_primary',
    ).length
    const curatedPrefab = (payload.options as Array<{ kind: string }>).filter(
      (option) => option.kind === 'curated_prefab',
    ).length
    expect(aiPrimary).toBe(3)
    expect(curatedPrefab).toBe(2)
    const aiTitles = (payload.options as Array<{ kind: string; title: string }>)
      .filter((option) => option.kind === 'ai_primary')
      .map((option) => option.title)
    expect(aiTitles.every((title) => title.trim().length > 0)).toBe(true)
    expect(
      aiTitles.some((title) =>
        /(peace|distracted|spiritual|numb|skeptic|truth|overwhelmed)/i.test(
          title,
        ),
      ),
    ).toBe(true)
    expect(payload).not.toHaveProperty('customPlan')
    expect(payload).not.toHaveProperty('customDevotional')

    const optionsWithPreview = payload.options as Array<{
      preview?: { verse?: string; verseText?: string }
    }>
    expect(
      optionsWithPreview.every(
        (option) =>
          typeof option.preview?.verse === 'string' &&
          option.preview.verse.trim().length > 0 &&
          typeof option.preview?.verseText === 'string' &&
          option.preview.verseText.trim().length > 0,
      ),
    ).toBe(true)
  })

  it('accepts single-word input and still returns options', async () => {
    const response = await submitHandler(
      postJson('http://localhost/api/soul-audit/submit', {
        response: 'money',
      }) as never,
    )
    expect(response.status).toBe(200)

    const payload = (await response.json()) as {
      options?: Array<{ kind: string }>
      inputGuidance?: string
    }
    expect(Array.isArray(payload.options)).toBe(true)
    expect(payload.options).toHaveLength(5)
    expect(
      payload.options?.filter((option) => option.kind === 'ai_primary').length,
    ).toBe(3)
    expect(
      payload.options?.filter((option) => option.kind === 'curated_prefab')
        .length,
    ).toBe(2)
    expect(typeof payload.inputGuidance).toBe('string')
  })

  it('accepts short phrase input and returns options without hard gate', async () => {
    const response = await submitHandler(
      postJson('http://localhost/api/soul-audit/submit', {
        response: 'I need money today',
      }) as never,
    )
    expect(response.status).toBe(200)

    const payload = (await response.json()) as {
      options?: Array<{ kind: string }>
    }
    expect(Array.isArray(payload.options)).toBe(true)
    expect(payload.options).toHaveLength(5)
    expect(
      payload.options?.filter((option) => option.kind === 'ai_primary').length,
    ).toBe(3)
    expect(
      payload.options?.filter((option) => option.kind === 'curated_prefab')
        .length,
    ).toBe(2)
  })

  it('crisis acknowledgement gate is enforced at consent', async () => {
    const submitResponse = await submitHandler(
      postJson('http://localhost/api/soul-audit/submit', {
        response: 'I want to die and do not want to be here anymore.',
      }) as never,
    )
    const submitPayload = (await submitResponse.json()) as {
      auditRunId: string
    }

    const consentResponse = await consentHandler(
      postJson('http://localhost/api/soul-audit/consent', {
        auditRunId: submitPayload.auditRunId,
        essentialAccepted: true,
        analyticsOptIn: false,
        crisisAcknowledged: false,
      }) as never,
    )

    expect(consentResponse.status).toBe(400)
    const consentPayload = (await consentResponse.json()) as {
      code?: string
      error?: string
      crisis?: {
        required?: boolean
        resources?: Array<{ name: string; contact: string }>
      }
    }
    expect(consentPayload.code).toBe('CRISIS_ACK_REQUIRED')
    expect(consentPayload.error).toMatch(/acknowledge/i)
    expect(consentPayload.crisis?.required).toBe(true)
    expect(Array.isArray(consentPayload.crisis?.resources)).toBe(true)
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

  it('AI option path returns plan token after consent + selection', async () => {
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

    const consentResponse = await consentHandler(
      postJson('http://localhost/api/soul-audit/consent', {
        auditRunId: submitPayload.auditRunId,
        essentialAccepted: true,
        analyticsOptIn: false,
        crisisAcknowledged: false,
      }) as never,
    )
    expect(consentResponse.status).toBe(200)
    const consentPayload = (await consentResponse.json()) as {
      consentToken?: string
    }
    expect(typeof consentPayload.consentToken).toBe('string')

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
    expect(selectionPayload.route).toMatch(/planToken=.*&day=\d+/)
  })

  it('prefab option routes to series overview after consent + selection', async () => {
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

    const consentResponse = await consentHandler(
      postJson('http://localhost/api/soul-audit/consent', {
        auditRunId: submitPayload.auditRunId,
        essentialAccepted: true,
        analyticsOptIn: false,
        crisisAcknowledged: false,
      }) as never,
    )
    expect(consentResponse.status).toBe(200)

    const prefabOption = submitPayload.options.find(
      (option) => option.kind === 'curated_prefab',
    )
    expect(prefabOption).toBeTruthy()

    const selectionResponse = await selectHandler(
      postJson('http://localhost/api/soul-audit/select', {
        auditRunId: submitPayload.auditRunId,
        optionId: prefabOption?.id,
      }) as never,
    )
    expect(selectionResponse.status).toBe(200)

    const payload = (await selectionResponse.json()) as {
      selectionType: string
      route: string
      planToken?: string
    }
    expect(payload.selectionType).toBe('curated_prefab')
    expect(payload.route).toMatch(/^\/devotional\//)
    expect(payload.planToken).toBeUndefined()
  })

  it('prefab selection becomes the active daily-bread source', async () => {
    mockedSessionToken = 'session-prefab-current'
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

    const consentResponse = await consentHandler(
      postJson('http://localhost/api/soul-audit/consent', {
        auditRunId: submitPayload.auditRunId,
        essentialAccepted: true,
        analyticsOptIn: false,
        crisisAcknowledged: false,
      }) as never,
    )
    expect(consentResponse.status).toBe(200)

    const prefabOption = submitPayload.options.find(
      (option) => option.kind === 'curated_prefab',
    )
    expect(prefabOption).toBeTruthy()

    const selectionResponse = await selectHandler(
      postJson('http://localhost/api/soul-audit/select', {
        auditRunId: submitPayload.auditRunId,
        optionId: prefabOption?.id,
      }) as never,
    )
    expect(selectionResponse.status).toBe(200)
    const selectionPayload = (await selectionResponse.json()) as {
      route: string
      selectionType: string
    }
    expect(selectionPayload.selectionType).toBe('curated_prefab')
    expect(selectionPayload.route).toMatch(/^\/devotional\//)
    const selectionCookie = selectionResponse.headers.get('set-cookie') || ''
    expect(selectionCookie).toContain('euangelion_current_route=')

    const persistedSelection =
      await getLatestSelectionForSessionWithFallback(mockedSessionToken)
    expect(persistedSelection?.option_kind).toBe('curated_prefab')

    const activeDaysResponse = await activeDaysHandler({
      cookies: { get: () => undefined },
    } as never)
    expect(activeDaysResponse.status).toBe(200)
    const activeDaysPayload = (await activeDaysResponse.json()) as {
      hasPlan: boolean
      planToken: string | null
      dayLocking: 'enabled' | 'disabled'
      days: Array<{
        day: number
        status: string
        route: string
      }>
    }
    expect(activeDaysPayload.hasPlan).toBe(true)
    expect(activeDaysPayload.planToken).toBeNull()
    expect(['enabled', 'disabled']).toContain(activeDaysPayload.dayLocking)
    expect(activeDaysPayload.days.length).toBeGreaterThanOrEqual(5)
    expect(activeDaysPayload.days[0]?.status).toBe('current')
    expect(activeDaysPayload.days[0]?.route).toBe(selectionPayload.route)
  })

  it('reset clears current devotional route after prefab selection', async () => {
    mockedSessionToken = 'session-prefab-reset'
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

    const consentResponse = await consentHandler(
      postJson('http://localhost/api/soul-audit/consent', {
        auditRunId: submitPayload.auditRunId,
        essentialAccepted: true,
        analyticsOptIn: false,
        crisisAcknowledged: false,
      }) as never,
    )
    expect(consentResponse.status).toBe(200)

    const prefabOption = submitPayload.options.find(
      (option) => option.kind === 'curated_prefab',
    )
    expect(prefabOption).toBeTruthy()

    const selectionResponse = await selectHandler(
      postJson('http://localhost/api/soul-audit/select', {
        auditRunId: submitPayload.auditRunId,
        optionId: prefabOption?.id,
      }) as never,
    )
    expect(selectionResponse.status).toBe(200)

    const beforeReset =
      await getLatestSelectionForSessionWithFallback(mockedSessionToken)
    expect(beforeReset?.option_kind).toBe('curated_prefab')

    const resetResponse = await resetHandler()
    expect(resetResponse.status).toBe(200)
    const resetCookie = resetResponse.headers.get('set-cookie') || ''
    expect(resetCookie).toContain('euangelion_current_route=;')

    const afterReset = await getLatestSelectionForSessionWithFallback(
      'session-prefab-reset',
    )
    expect(afterReset).toBeNull()

    const activeDaysResponse = await activeDaysHandler({
      cookies: { get: () => undefined },
    } as never)
    const activeDaysPayload = (await activeDaysResponse.json()) as {
      hasPlan: boolean
      days: unknown[]
    }
    expect(activeDaysResponse.status).toBe(200)
    expect(activeDaysPayload.hasPlan).toBe(false)
    expect(activeDaysPayload.days).toEqual([])
  })

  it('rejects run/consent token reuse after session-token churn', async () => {
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
    const prefabOption = submitPayload.options.find(
      (option) => option.kind === 'curated_prefab',
    )
    expect(prefabOption).toBeTruthy()

    mockedSessionToken = 'session-b'
    const consentResponse = await consentHandler(
      postJson('http://localhost/api/soul-audit/consent', {
        auditRunId: submitPayload.auditRunId,
        runToken: submitPayload.runToken,
        essentialAccepted: true,
        analyticsOptIn: false,
        crisisAcknowledged: false,
      }) as never,
    )
    expect(consentResponse.status).toBe(403)
    const consentPayload = (await consentResponse.json()) as {
      code?: string
      error?: string
    }
    expect(consentPayload.code).toBe('RUN_ACCESS_DENIED')
    expect(consentPayload.error).toMatch(/access denied/i)
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
    const payload = (await mismatch.json()) as { code?: string; error?: string }
    expect(payload.code).toBe('REROLL_RESPONSE_MISMATCH')
    expect(payload.error).toMatch(/original audit response/i)
  })
})
