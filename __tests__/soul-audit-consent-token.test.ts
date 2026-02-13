import { describe, expect, it } from 'vitest'
import {
  createConsentToken,
  verifyConsentToken,
} from '@/lib/soul-audit/consent-token'

describe('soul audit consent-token', () => {
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

  it('accepts token when session mismatch fallback is enabled', () => {
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
      allowSessionMismatch: true,
    })

    expect(verified).not.toBeNull()
    expect(verified?.sessionBound).toBe(false)
  })
})
