import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST as submitHandler } from '@/app/api/soul-audit/submit/route'
import { POST as consentHandler } from '@/app/api/soul-audit/consent/route'
import { POST as selectHandler } from '@/app/api/soul-audit/select/route'
import { resetSessionAuditCount } from '@/lib/soul-audit/repository'

let mockedSessionToken = 'test-session-token'

vi.mock('@/lib/soul-audit/session', () => ({
  getOrCreateAuditSessionToken: vi.fn(async () => mockedSessionToken),
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
    mockedSessionToken = 'test-session-token'
    resetSessionAuditCount('test-session-token')
    resetSessionAuditCount('session-a')
    resetSessionAuditCount('session-b')
    resetSessionAuditCount('session-c')
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
    expect(payload).not.toHaveProperty('customPlan')
    expect(payload).not.toHaveProperty('customDevotional')
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
    }
    expect(consentPayload.code).toBe('CRISIS_ACK_REQUIRED')
    expect(consentPayload.error).toMatch(/acknowledge/i)
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

      // Fail-closed (422) is expected for incomplete curated series candidates.
      if (selectionResponse.status !== 422) {
        throw new Error(
          `Unexpected selection status ${selectionResponse.status}: ${JSON.stringify(selectionPayload)}`,
        )
      }
    }

    expect(successful).toBe(true)
    expect(selectionPayload).toBeTruthy()
    if (!selectionPayload) {
      throw new Error('Expected selection payload to be defined')
    }
    expect(selectionPayload.ok).toBe(true)
    expect(selectionPayload.selectionType).toBe('ai_primary')
    expect(selectionPayload.planToken).toBeTruthy()
    expect(selectionPayload.route).toMatch(/planToken=/)
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
    expect(payload.route).toMatch(/^\/wake-up\/series\//)
    expect(payload.planToken).toBeUndefined()
  })

  it('survives session-token churn via run/consent token fallback', async () => {
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
    expect(consentResponse.status).toBe(200)
    const consentPayload = (await consentResponse.json()) as {
      consentToken: string
    }
    expect(typeof consentPayload.consentToken).toBe('string')

    mockedSessionToken = 'session-c'
    const selectionResponse = await selectHandler(
      postJson('http://localhost/api/soul-audit/select', {
        auditRunId: submitPayload.auditRunId,
        optionId: prefabOption?.id,
        runToken: submitPayload.runToken,
        consentToken: consentPayload.consentToken,
      }) as never,
    )
    expect(selectionResponse.status).toBe(200)
    const selectionPayload = (await selectionResponse.json()) as {
      ok: boolean
      selectionType: string
      route: string
    }
    expect(selectionPayload.ok).toBe(true)
    expect(selectionPayload.selectionType).toBe('curated_prefab')
    expect(selectionPayload.route).toMatch(/^\/wake-up\/series\//)
  })
})
