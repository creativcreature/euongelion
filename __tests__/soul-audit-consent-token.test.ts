import { beforeAll, describe, expect, it } from 'vitest'
import {
  createConsentToken,
  verifyConsentToken,
} from '@/lib/soul-audit/consent-token'

describe('soul audit consent-token', () => {
  beforeAll(() => {
    process.env.SOUL_AUDIT_RUN_TOKEN_SECRET =
      'test-secret-token-value-for-soul-audit-0123456789'
  })

  it('verifies valid consent token', () => {
    const token = createConsentToken({
      auditRunId: 'run-1',
      essentialAccepted: true,
      analyticsOptIn: false,
      crisisAcknowledged: true,
      sessionToken: 'session-a',
    })

    const verified = verifyConsentToken({
      token,
      expectedRunId: 'run-1',
      sessionToken: 'session-a',
    })

    expect(verified).not.toBeNull()
    expect(verified?.essentialAccepted).toBe(true)
    expect(verified?.crisisAcknowledged).toBe(true)
  })

  it('rejects token for wrong session', () => {
    const token = createConsentToken({
      auditRunId: 'run-2',
      essentialAccepted: true,
      analyticsOptIn: true,
      crisisAcknowledged: false,
      sessionToken: 'session-a',
    })

    const verified = verifyConsentToken({
      token,
      expectedRunId: 'run-2',
      sessionToken: 'session-b',
    })

    expect(verified).toBeNull()
  })

  it('rejects token when session does not match (strict binding)', () => {
    const token = createConsentToken({
      auditRunId: 'run-3',
      essentialAccepted: true,
      analyticsOptIn: false,
      crisisAcknowledged: true,
      sessionToken: 'session-a',
    })

    const verified = verifyConsentToken({
      token,
      expectedRunId: 'run-3',
      sessionToken: 'session-b',
    })

    expect(verified).toBeNull()
  })
})
