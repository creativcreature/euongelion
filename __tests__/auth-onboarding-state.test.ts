import { describe, expect, it } from 'vitest'
import type { User } from '@supabase/supabase-js'
import {
  DEFAULT_ONBOARDING_PREFERENCES,
  readOnboardingStateFromMetadata,
  sanitizeOnboardingPreferences,
  shouldRequirePostSignupOnboarding,
} from '@/lib/auth/onboarding'

function mockUser(params: {
  createdAt: string
  lastSignInAt: string
  userMetadata?: Record<string, unknown>
}): User {
  return {
    id: 'user-1',
    app_metadata: {},
    user_metadata: params.userMetadata ?? {},
    aud: 'authenticated',
    created_at: params.createdAt,
    last_sign_in_at: params.lastSignInAt,
  } as unknown as User
}

describe('auth onboarding metadata', () => {
  it('sanitizes preferences with defaults', () => {
    const preferences = sanitizeOnboardingPreferences({
      theme: 'invalid',
      textScale: 'wrong',
      sabbathDay: 'monday',
      bibleTranslation: 'bad',
      reduceMotion: 'yes',
      highContrast: true,
      readingComfort: false,
    })

    expect(preferences.theme).toBe(DEFAULT_ONBOARDING_PREFERENCES.theme)
    expect(preferences.textScale).toBe(DEFAULT_ONBOARDING_PREFERENCES.textScale)
    expect(preferences.sabbathDay).toBe(
      DEFAULT_ONBOARDING_PREFERENCES.sabbathDay,
    )
    expect(preferences.bibleTranslation).toBe(
      DEFAULT_ONBOARDING_PREFERENCES.bibleTranslation,
    )
    expect(preferences.highContrast).toBe(true)
    expect(preferences.reduceMotion).toBe(false)
  })

  it('reads completed onboarding metadata state', () => {
    const state = readOnboardingStateFromMetadata({
      onboardingCompleted: true,
      onboardingSkipped: false,
      onboardingCompletedAt: '2026-02-20T00:00:00.000Z',
      onboardingPreferences: {
        sabbathDay: 'saturday',
        textScale: 'large',
      },
    })

    expect(state.completed).toBe(true)
    expect(state.skipped).toBe(false)
    expect(state.preferences.sabbathDay).toBe('saturday')
    expect(state.preferences.textScale).toBe('large')
  })

  it('requires onboarding on first sign-in when metadata not set', () => {
    const createdAt = new Date().toISOString()
    const user = mockUser({
      createdAt,
      lastSignInAt: createdAt,
      userMetadata: {},
    })

    expect(shouldRequirePostSignupOnboarding(user)).toBe(true)
  })

  it('does not require onboarding when already completed', () => {
    const user = mockUser({
      createdAt: '2026-02-01T00:00:00.000Z',
      lastSignInAt: '2026-02-20T00:00:00.000Z',
      userMetadata: { onboardingCompleted: true },
    })

    expect(shouldRequirePostSignupOnboarding(user)).toBe(false)
  })

  it('requires onboarding when explicitly marked incomplete', () => {
    const user = mockUser({
      createdAt: '2026-02-01T00:00:00.000Z',
      lastSignInAt: '2026-02-20T00:00:00.000Z',
      userMetadata: { onboardingCompleted: false },
    })

    expect(shouldRequirePostSignupOnboarding(user)).toBe(true)
  })
})
