/**
 * Auth, Consent, and Session Tests
 *
 * Tests from PLAN-V3 Phase 4 and euan-PLAN-v2 decisions 20-21:
 * - Site-level consent banner (essential required, analytics optional OFF)
 * - Soft auth prompt after audit results
 * - Hard auth gate on save actions
 * - Anonymous session merge on sign-up
 * - Auth methods: Apple + Google + magic link
 * - Anonymous browsing and temporary state
 */
import { describe, expect, it, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Contract types
// ---------------------------------------------------------------------------

interface ConsentState {
  essentialConsent: boolean
  analyticsConsent: boolean
  shown: boolean
  recordedAt: number | null
}

type AuthState = 'anonymous' | 'soft_prompted' | 'authenticated'
type AuthMethod = 'apple' | 'google' | 'magic_link'

interface SessionState {
  authState: AuthState
  userId: string | null
  sessionToken: string
  tempSaves: TempSave[]
  consentState: ConsentState
}

interface TempSave {
  id: string
  kind: 'bookmark' | 'highlight' | 'note' | 'progress'
  data: Record<string, unknown>
  createdAt: number
}

// ---------------------------------------------------------------------------
// Pure helpers (contract stubs)
// ---------------------------------------------------------------------------

function createAnonymousSession(): SessionState {
  return {
    authState: 'anonymous',
    userId: null,
    sessionToken: `anon-${Date.now()}`,
    tempSaves: [],
    consentState: {
      essentialConsent: false,
      analyticsConsent: false,
      shown: false,
      recordedAt: null,
    },
  }
}

function recordConsent(
  session: SessionState,
  essential: boolean,
  analytics: boolean,
): SessionState {
  if (!essential) throw new Error('Essential consent is required')
  return {
    ...session,
    consentState: {
      essentialConsent: essential,
      analyticsConsent: analytics,
      shown: true,
      recordedAt: Date.now(),
    },
  }
}

function addTempSave(
  session: SessionState,
  save: Omit<TempSave, 'createdAt'>,
): SessionState {
  if (session.authState === 'authenticated') {
    throw new Error('Authenticated users save directly — no temp saves')
  }
  return {
    ...session,
    tempSaves: [...session.tempSaves, { ...save, createdAt: Date.now() }],
  }
}

function requiresAuthGate(action: string): boolean {
  const gatedActions = [
    'bookmark',
    'highlight',
    'note',
    'chat_persist',
    'plan_persist',
  ]
  return gatedActions.includes(action)
}

function requiresSoftPrompt(action: string): boolean {
  return action === 'view_audit_results'
}

function mergeSession(session: SessionState, userId: string): SessionState {
  return {
    ...session,
    authState: 'authenticated',
    userId,
    // tempSaves would be merged to DB in real implementation
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Consent banner', () => {
  let session: SessionState

  beforeEach(() => {
    session = createAnonymousSession()
  })

  it('consent not shown initially', () => {
    expect(session.consentState.shown).toBe(false)
    expect(session.consentState.essentialConsent).toBe(false)
  })

  it('records essential + analytics consent', () => {
    session = recordConsent(session, true, true)
    expect(session.consentState.essentialConsent).toBe(true)
    expect(session.consentState.analyticsConsent).toBe(true)
    expect(session.consentState.shown).toBe(true)
    expect(session.consentState.recordedAt).toBeDefined()
  })

  it('analytics defaults to OFF', () => {
    session = recordConsent(session, true, false)
    expect(session.consentState.analyticsConsent).toBe(false)
  })

  it('rejects missing essential consent', () => {
    expect(() => recordConsent(session, false, false)).toThrow(
      'Essential consent is required',
    )
  })

  it('essential consent cannot be pre-checked as false', () => {
    // The banner must require essential; there's no valid path with essential=false
    expect(() => recordConsent(session, false, true)).toThrow(
      'Essential consent is required',
    )
  })
})

describe('Auth gates', () => {
  it('hard gate on bookmark', () => {
    expect(requiresAuthGate('bookmark')).toBe(true)
  })

  it('hard gate on highlight', () => {
    expect(requiresAuthGate('highlight')).toBe(true)
  })

  it('hard gate on note', () => {
    expect(requiresAuthGate('note')).toBe(true)
  })

  it('hard gate on chat persistence', () => {
    expect(requiresAuthGate('chat_persist')).toBe(true)
  })

  it('hard gate on plan persistence', () => {
    expect(requiresAuthGate('plan_persist')).toBe(true)
  })

  it('no gate on browsing', () => {
    expect(requiresAuthGate('browse')).toBe(false)
  })

  it('no gate on soul audit submit', () => {
    expect(requiresAuthGate('soul_audit_submit')).toBe(false)
  })

  it('soft prompt after audit results', () => {
    expect(requiresSoftPrompt('view_audit_results')).toBe(true)
  })

  it('no soft prompt on browse', () => {
    expect(requiresSoftPrompt('browse')).toBe(false)
  })
})

describe('Anonymous session', () => {
  let session: SessionState

  beforeEach(() => {
    session = createAnonymousSession()
  })

  it('starts as anonymous', () => {
    expect(session.authState).toBe('anonymous')
    expect(session.userId).toBeNull()
  })

  it('can accumulate temp saves', () => {
    session = addTempSave(session, {
      id: 'ts1',
      kind: 'bookmark',
      data: { slug: 'identity' },
    })
    session = addTempSave(session, {
      id: 'ts2',
      kind: 'highlight',
      data: { text: 'hello' },
    })
    expect(session.tempSaves).toHaveLength(2)
  })

  it('temp saves have timestamps', () => {
    session = addTempSave(session, {
      id: 'ts1',
      kind: 'note',
      data: { text: 'note' },
    })
    expect(session.tempSaves[0].createdAt).toBeGreaterThan(0)
  })

  it('anonymous mark-complete is temporary', () => {
    session = addTempSave(session, {
      id: 'ts1',
      kind: 'progress',
      data: { day: 1 },
    })
    expect(session.tempSaves.find((s) => s.kind === 'progress')).toBeDefined()
    // Without sign-in, this disappears at session end
  })
})

describe('Session merge on sign-up', () => {
  let session: SessionState

  beforeEach(() => {
    session = createAnonymousSession()
    session = addTempSave(session, {
      id: 'ts1',
      kind: 'bookmark',
      data: { slug: 'identity' },
    })
    session = addTempSave(session, {
      id: 'ts2',
      kind: 'highlight',
      data: { text: 'test' },
    })
  })

  it('merges to authenticated state', () => {
    session = mergeSession(session, 'user-123')
    expect(session.authState).toBe('authenticated')
    expect(session.userId).toBe('user-123')
  })

  it('preserves temp saves for migration', () => {
    session = mergeSession(session, 'user-123')
    expect(session.tempSaves).toHaveLength(2)
    // In real impl, these get written to DB then cleared from session
  })

  it('authenticated users do not use temp saves', () => {
    session = mergeSession(session, 'user-123')
    expect(() =>
      addTempSave(session, { id: 'ts3', kind: 'note', data: {} }),
    ).toThrow('Authenticated users save directly')
  })
})

describe('Auth methods', () => {
  const validMethods: AuthMethod[] = ['apple', 'google', 'magic_link']

  it('supports Apple sign-in', () => {
    expect(validMethods).toContain('apple')
  })

  it('supports Google sign-in', () => {
    expect(validMethods).toContain('google')
  })

  it('supports magic link', () => {
    expect(validMethods).toContain('magic_link')
  })

  it('does not include password auth', () => {
    expect(validMethods).not.toContain('password')
  })
})
