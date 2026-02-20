import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildAuditOptions } from '@/lib/soul-audit/matching'
import { getCuratedDayCandidates } from '@/lib/soul-audit/curation-engine'
import { POST as submitHandler } from '@/app/api/soul-audit/submit/route'
import { POST as consentHandler } from '@/app/api/soul-audit/consent/route'
import { POST as selectHandler } from '@/app/api/soul-audit/select/route'
import { resetSessionAuditCount } from '@/lib/soul-audit/repository'

let sessionToken = 'curation-session'

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
    sessionToken = `curation-session-${Date.now()}-${Math.random().toString(36).slice(2)}`
    resetSessionAuditCount(sessionToken)
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
      (option) => option.kind === 'ai_primary',
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
    expect(selectPayload.selectionType).toBe('ai_primary')
    expect(typeof selectPayload.planToken).toBe('string')
    expect(selectPayload.route).toMatch(/planToken=.*&day=\d+/)
  })
})
