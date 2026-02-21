import type { User } from '@supabase/supabase-js'
import type { BrainProviderId } from './types'

export type BrainSettings = {
  defaultBrainMode: BrainProviderId
  openWebDefaultEnabled: boolean
  devotionalLengthPreference:
    | 'short_5_7'
    | 'medium_20_30'
    | 'long_45_60'
    | 'variable'
}

export const DEFAULT_BRAIN_SETTINGS: BrainSettings = {
  defaultBrainMode: 'auto',
  openWebDefaultEnabled: false,
  devotionalLengthPreference: 'short_5_7',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function sanitizeBrainSettings(
  raw: unknown,
  fallback: BrainSettings = DEFAULT_BRAIN_SETTINGS,
): BrainSettings {
  const payload = isRecord(raw) ? raw : {}

  const defaultBrainMode =
    payload.defaultBrainMode === 'auto' ||
    payload.defaultBrainMode === 'openai' ||
    payload.defaultBrainMode === 'google' ||
    payload.defaultBrainMode === 'minimax' ||
    payload.defaultBrainMode === 'nvidia_kimi'
      ? payload.defaultBrainMode
      : fallback.defaultBrainMode

  const devotionalLengthPreference =
    payload.devotionalLengthPreference === 'short_5_7' ||
    payload.devotionalLengthPreference === 'medium_20_30' ||
    payload.devotionalLengthPreference === 'long_45_60' ||
    payload.devotionalLengthPreference === 'variable'
      ? payload.devotionalLengthPreference
      : fallback.devotionalLengthPreference

  return {
    defaultBrainMode,
    openWebDefaultEnabled:
      typeof payload.openWebDefaultEnabled === 'boolean'
        ? payload.openWebDefaultEnabled
        : fallback.openWebDefaultEnabled,
    devotionalLengthPreference,
  }
}

export function readBrainSettingsFromMetadata(user: User): BrainSettings {
  const metadata = isRecord(user.user_metadata) ? user.user_metadata : {}
  return sanitizeBrainSettings(metadata.brainSettings)
}

export function buildBrainSettingsPatch(params: {
  existingMetadata: unknown
  settings: BrainSettings
}): Record<string, unknown> {
  const existing = isRecord(params.existingMetadata)
    ? { ...params.existingMetadata }
    : {}

  return {
    ...existing,
    brainSettings: params.settings,
  }
}
