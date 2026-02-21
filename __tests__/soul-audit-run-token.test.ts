import { beforeAll, describe, expect, it } from 'vitest'
import type { AuditOptionPreview } from '@/types/soul-audit'
import { createRunToken, verifyRunToken } from '@/lib/soul-audit/run-token'

const options: AuditOptionPreview[] = [
  {
    id: 'ai_primary:identity:1:1',
    slug: 'identity',
    kind: 'ai_primary',
    rank: 1,
    title: 'Identity Crisis',
    question: 'Who are you when labels fall away?',
    confidence: 0.92,
    reasoning: 'Matched themes from your response.',
    preview: {
      verse: 'Matthew 6:33',
      paragraph: 'Seek first the kingdom.',
      curationSeed: {
        seriesSlug: 'identity',
        dayNumber: 1,
        candidateKey: 'identity:1',
      },
    },
  },
]

describe('soul audit run-token', () => {
  beforeAll(() => {
    process.env.SOUL_AUDIT_RUN_TOKEN_SECRET =
      'test-secret-token-value-for-soul-audit-0123456789'
  })

  it('verifies a valid token for the same run and session', () => {
    const token = createRunToken({
      auditRunId: 'run-1',
      responseText: 'I feel overwhelmed and anxious.',
      crisisDetected: false,
      options,
      sessionToken: 'session-a',
    })

    const verified = verifyRunToken({
      token,
      expectedRunId: 'run-1',
      sessionToken: 'session-a',
    })

    expect(verified).not.toBeNull()
    expect(verified?.auditRunId).toBe('run-1')
    expect(verified?.responseText).toContain('overwhelmed')
    expect(verified?.options).toHaveLength(1)
  })

  it('rejects token when session token does not match', () => {
    const token = createRunToken({
      auditRunId: 'run-2',
      responseText: 'I am searching for peace.',
      crisisDetected: false,
      options,
      sessionToken: 'session-a',
    })

    const verified = verifyRunToken({
      token,
      expectedRunId: 'run-2',
      sessionToken: 'session-b',
    })

    expect(verified).toBeNull()
  })

  it('rejects token when session does not match (strict binding)', () => {
    const token = createRunToken({
      auditRunId: 'run-2b',
      responseText: 'I am searching for peace.',
      crisisDetected: false,
      options,
      sessionToken: 'session-a',
    })

    const verified = verifyRunToken({
      token,
      expectedRunId: 'run-2b',
      sessionToken: 'session-b',
    })

    expect(verified).toBeNull()
  })

  it('rejects token when run id does not match', () => {
    const token = createRunToken({
      auditRunId: 'run-3',
      responseText: 'I need clarity.',
      crisisDetected: false,
      options,
      sessionToken: 'session-a',
    })

    const verified = verifyRunToken({
      token,
      expectedRunId: 'run-99',
      sessionToken: 'session-a',
    })

    expect(verified).toBeNull()
  })

  it('rejects tampered token', () => {
    const token = createRunToken({
      auditRunId: 'run-4',
      responseText: 'I feel stuck.',
      crisisDetected: false,
      options,
      sessionToken: 'session-a',
    })
    const tampered = `${token}tampered`

    const verified = verifyRunToken({
      token: tampered,
      expectedRunId: 'run-4',
      sessionToken: 'session-a',
    })

    expect(verified).toBeNull()
  })
})
