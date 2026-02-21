import type { User } from '@supabase/supabase-js'

export type ThemePreference = 'dark' | 'light' | 'system'
export type TextScalePreference = 'default' | 'large' | 'xlarge'
export type SabbathDayPreference = 'saturday' | 'sunday'
export type BibleTranslationPreference =
  | 'NIV'
  | 'ESV'
  | 'NASB'
  | 'KJV'
  | 'NLT'
  | 'MSG'
export type DevotionalDepthPreference =
  | 'short_5_7'
  | 'medium_20_30'
  | 'long_45_60'
  | 'variable'

export interface OnboardingPreferences {
  theme: ThemePreference
  textScale: TextScalePreference
  sabbathDay: SabbathDayPreference
  bibleTranslation: BibleTranslationPreference
  defaultBrainMode: 'auto' | 'openai' | 'google' | 'minimax' | 'nvidia_kimi'
  openWebDefaultEnabled: boolean
  devotionalDepthPreference: DevotionalDepthPreference
  reduceMotion: boolean
  highContrast: boolean
  readingComfort: boolean
}

export interface OnboardingState {
  completed: boolean
  skipped: boolean
  completedAt: string | null
  preferences: OnboardingPreferences
}

export const DEFAULT_ONBOARDING_PREFERENCES: OnboardingPreferences = {
  theme: 'dark',
  textScale: 'default',
  sabbathDay: 'sunday',
  bibleTranslation: 'NIV',
  defaultBrainMode: 'auto',
  openWebDefaultEnabled: false,
  devotionalDepthPreference: 'short_5_7',
  reduceMotion: false,
  highContrast: false,
  readingComfort: false,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function toTheme(value: unknown, fallback: ThemePreference): ThemePreference {
  return value === 'dark' || value === 'light' || value === 'system'
    ? value
    : fallback
}

function toTextScale(
  value: unknown,
  fallback: TextScalePreference,
): TextScalePreference {
  return value === 'default' || value === 'large' || value === 'xlarge'
    ? value
    : fallback
}

function toSabbathDay(
  value: unknown,
  fallback: SabbathDayPreference,
): SabbathDayPreference {
  return value === 'saturday' || value === 'sunday' ? value : fallback
}

function toTranslation(
  value: unknown,
  fallback: BibleTranslationPreference,
): BibleTranslationPreference {
  return value === 'NIV' ||
    value === 'ESV' ||
    value === 'NASB' ||
    value === 'KJV' ||
    value === 'NLT' ||
    value === 'MSG'
    ? value
    : fallback
}

function toBrainMode(
  value: unknown,
  fallback: OnboardingPreferences['defaultBrainMode'],
): OnboardingPreferences['defaultBrainMode'] {
  return value === 'auto' ||
    value === 'openai' ||
    value === 'google' ||
    value === 'minimax' ||
    value === 'nvidia_kimi'
    ? value
    : fallback
}

function toDevotionalDepth(
  value: unknown,
  fallback: DevotionalDepthPreference,
): DevotionalDepthPreference {
  return value === 'short_5_7' ||
    value === 'medium_20_30' ||
    value === 'long_45_60' ||
    value === 'variable'
    ? value
    : fallback
}

export function sanitizeOnboardingPreferences(
  raw: unknown,
  fallback: OnboardingPreferences = DEFAULT_ONBOARDING_PREFERENCES,
): OnboardingPreferences {
  const payload = isRecord(raw) ? raw : {}

  return {
    theme: toTheme(payload.theme, fallback.theme),
    textScale: toTextScale(payload.textScale, fallback.textScale),
    sabbathDay: toSabbathDay(payload.sabbathDay, fallback.sabbathDay),
    bibleTranslation: toTranslation(
      payload.bibleTranslation,
      fallback.bibleTranslation,
    ),
    defaultBrainMode: toBrainMode(
      payload.defaultBrainMode,
      fallback.defaultBrainMode,
    ),
    openWebDefaultEnabled: toBoolean(
      payload.openWebDefaultEnabled,
      fallback.openWebDefaultEnabled,
    ),
    devotionalDepthPreference: toDevotionalDepth(
      payload.devotionalDepthPreference,
      fallback.devotionalDepthPreference,
    ),
    reduceMotion: toBoolean(payload.reduceMotion, fallback.reduceMotion),
    highContrast: toBoolean(payload.highContrast, fallback.highContrast),
    readingComfort: toBoolean(payload.readingComfort, fallback.readingComfort),
  }
}

export function readOnboardingStateFromMetadata(
  metadata: unknown,
): OnboardingState {
  const record = isRecord(metadata) ? metadata : {}

  const completed = record.onboardingCompleted === true
  const skipped = record.onboardingSkipped === true
  const completedAt =
    typeof record.onboardingCompletedAt === 'string' &&
    record.onboardingCompletedAt.trim().length > 0
      ? record.onboardingCompletedAt
      : null

  const preferences = sanitizeOnboardingPreferences(
    record.onboardingPreferences,
    DEFAULT_ONBOARDING_PREFERENCES,
  )

  return {
    completed,
    skipped,
    completedAt,
    preferences,
  }
}

export function buildOnboardingMetadataPatch(params: {
  existingMetadata: unknown
  preferences: OnboardingPreferences
  skipped: boolean
  completedAt?: string
}): Record<string, unknown> {
  const existing = isRecord(params.existingMetadata)
    ? { ...params.existingMetadata }
    : {}

  return {
    ...existing,
    onboardingCompleted: true,
    onboardingSkipped: params.skipped,
    onboardingCompletedAt: params.completedAt || new Date().toISOString(),
    onboardingPreferences: params.preferences,
  }
}

export function isFirstAuthSession(
  user: Pick<User, 'created_at' | 'last_sign_in_at'>,
): boolean {
  const createdAtMs = Date.parse(user.created_at || '')
  const lastSignInMs = Date.parse(user.last_sign_in_at || '')

  if (!Number.isFinite(createdAtMs)) return false
  if (!Number.isFinite(lastSignInMs)) return true

  return Math.abs(lastSignInMs - createdAtMs) <= 120_000
}

export function shouldRequirePostSignupOnboarding(user: User): boolean {
  const state = readOnboardingStateFromMetadata(user.user_metadata)
  if (state.completed) return false

  if (
    Object.prototype.hasOwnProperty.call(
      user.user_metadata || {},
      'onboardingCompleted',
    )
  ) {
    return true
  }

  return isFirstAuthSession(user)
}
