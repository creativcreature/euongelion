'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUIStore } from '@/stores/uiStore'
import type {
  BibleTranslationPreference,
  OnboardingPreferences,
  SabbathDayPreference,
  TextScalePreference,
  ThemePreference,
} from '@/lib/auth/onboarding'

interface OnboardingClientProps {
  finalRedirect: string
  initialPreferences: OnboardingPreferences
}

type StepKey = 'welcome' | 'rhythm' | 'display' | 'scripture' | 'tour'

type SaveResponse = {
  ok?: boolean
  error?: string
}

const STEPS: Array<{
  key: StepKey
  label: string
  title: string
  description: string
}> = [
  {
    key: 'welcome',
    label: 'STEP 1',
    title: 'Set Up Your Daily Rhythm',
    description:
      'We will configure your Sabbath rest day and reading defaults in under a minute. You can skip now and adjust later in Settings.',
  },
  {
    key: 'rhythm',
    label: 'STEP 2',
    title: 'Choose Your Sabbath',
    description:
      'No new day unlocks on your Sabbath. This keeps your devotional pace grounded in rest.',
  },
  {
    key: 'display',
    label: 'STEP 3',
    title: 'Tune Reading Comfort',
    description:
      'Pick theme, text size, and readability options before you enter the main app.',
  },
  {
    key: 'scripture',
    label: 'STEP 4',
    title: 'Set Scripture Defaults',
    description:
      'Select your preferred translation for cards and devotional reading.',
  },
  {
    key: 'tour',
    label: 'STEP 5',
    title: 'Know Where Everything Lives',
    description:
      'Quick orientation to Soul Audit, Daily Bread, and Settings so users do not miss core features.',
  },
]

function OptionButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="px-6 py-3 text-label vw-small transition-theme"
      style={{
        backgroundColor: active ? 'var(--color-fg)' : 'var(--color-surface)',
        color: active ? 'var(--color-bg)' : 'var(--color-text-secondary)',
        border: `1px solid ${active ? 'var(--color-fg)' : 'var(--color-border)'}`,
      }}
    >
      {children}
    </button>
  )
}

export default function OnboardingClient({
  finalRedirect,
  initialPreferences,
}: OnboardingClientProps) {
  const router = useRouter()
  const setTheme = useUIStore((state) => state.setTheme)
  const setSabbathDay = useSettingsStore((state) => state.setSabbathDay)
  const setBibleTranslation = useSettingsStore(
    (state) => state.setBibleTranslation,
  )
  const setDefaultBrainMode = useSettingsStore(
    (state) => state.setDefaultBrainMode,
  )
  const setOpenWebDefaultEnabled = useSettingsStore(
    (state) => state.setOpenWebDefaultEnabled,
  )
  const setDevotionalDepthPreference = useSettingsStore(
    (state) => state.setDevotionalDepthPreference,
  )
  const setTextScale = useSettingsStore((state) => state.setTextScale)
  const setReduceMotion = useSettingsStore((state) => state.setReduceMotion)
  const setHighContrast = useSettingsStore((state) => state.setHighContrast)
  const setReadingComfort = useSettingsStore((state) => state.setReadingComfort)

  const [stepIndex, setStepIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [prefs, setPrefs] = useState<OnboardingPreferences>(initialPreferences)

  const currentStep = STEPS[stepIndex]
  const isLastStep = stepIndex === STEPS.length - 1

  const progressWidth = useMemo(() => {
    return `${Math.round(((stepIndex + 1) / STEPS.length) * 100)}%`
  }, [stepIndex])

  function applyPreferencesLocally(preferences: OnboardingPreferences) {
    setTheme(preferences.theme)
    setSabbathDay(preferences.sabbathDay)
    setBibleTranslation(preferences.bibleTranslation)
    setDefaultBrainMode(preferences.defaultBrainMode)
    setOpenWebDefaultEnabled(preferences.openWebDefaultEnabled)
    setDevotionalDepthPreference(preferences.devotionalDepthPreference)
    setTextScale(preferences.textScale)
    setReduceMotion(preferences.reduceMotion)
    setHighContrast(preferences.highContrast)
    setReadingComfort(preferences.readingComfort)
  }

  async function persistOnboarding(skipped: boolean) {
    const response = await fetch('/api/auth/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skipped,
        preferences: prefs,
      }),
    })

    const payload = (await response.json().catch(() => ({}))) as SaveResponse
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || 'Unable to save onboarding preferences.')
    }
  }

  async function finishOnboarding(skipped: boolean) {
    setSaving(true)
    setError(null)
    try {
      applyPreferencesLocally(prefs)
      await persistOnboarding(skipped)
      router.replace(finalRedirect)
      router.refresh()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to complete onboarding. Please try again.',
      )
      setSaving(false)
    }
  }

  function renderStepBody() {
    if (currentStep.key === 'welcome') {
      return (
        <div className="grid gap-4">
          <p className="vw-body text-secondary">
            First launch should make key controls clear immediately. We will set
            your reading defaults now, then take you straight into the app.
          </p>
          <div
            className="grid gap-3 rounded-sm bg-surface-raised p-5"
            style={{ border: '1px solid var(--color-border)' }}
          >
            <p className="text-label vw-small text-gold">YOU WILL SET</p>
            <p className="vw-small text-secondary">
              Sabbath day (Saturday or Sunday)
            </p>
            <p className="vw-small text-secondary">
              Theme + text size + accessibility comfort
            </p>
            <p className="vw-small text-secondary">Default Bible translation</p>
          </div>
          <p className="vw-small text-muted">
            Everything remains editable in Settings later.
          </p>
        </div>
      )
    }

    if (currentStep.key === 'rhythm') {
      return (
        <div className="grid gap-4">
          <p className="text-label vw-small text-gold">SABBATH DAY</p>
          <div className="flex flex-wrap gap-3">
            {(['saturday', 'sunday'] as SabbathDayPreference[]).map((day) => (
              <OptionButton
                key={day}
                active={prefs.sabbathDay === day}
                onClick={() =>
                  setPrefs((prev) => ({ ...prev, sabbathDay: day }))
                }
              >
                {day.charAt(0).toUpperCase() + day.slice(1)}
              </OptionButton>
            ))}
          </div>
          <p className="vw-small text-secondary">
            Your Sabbath day pauses new unlocks so rest is protected in the
            devotional cadence.
          </p>
        </div>
      )
    }

    if (currentStep.key === 'display') {
      return (
        <div className="grid gap-6">
          <div>
            <p className="text-label vw-small mb-3 text-gold">APPEARANCE</p>
            <div className="flex flex-wrap gap-3">
              {(['dark', 'light', 'system'] as ThemePreference[]).map(
                (theme) => (
                  <OptionButton
                    key={theme}
                    active={prefs.theme === theme}
                    onClick={() => setPrefs((prev) => ({ ...prev, theme }))}
                  >
                    {theme.charAt(0).toUpperCase() + theme.slice(1)}
                  </OptionButton>
                ),
              )}
            </div>
          </div>

          <div>
            <p className="text-label vw-small mb-3 text-gold">TEXT SIZE</p>
            <div className="flex flex-wrap gap-3">
              {(['default', 'large', 'xlarge'] as TextScalePreference[]).map(
                (textScale) => (
                  <OptionButton
                    key={textScale}
                    active={prefs.textScale === textScale}
                    onClick={() => setPrefs((prev) => ({ ...prev, textScale }))}
                  >
                    {textScale === 'default'
                      ? 'Default'
                      : textScale === 'large'
                        ? 'Large'
                        : 'Extra Large'}
                  </OptionButton>
                ),
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={prefs.reduceMotion}
                onChange={(event) =>
                  setPrefs((prev) => ({
                    ...prev,
                    reduceMotion: event.target.checked,
                  }))
                }
              />
              <span className="vw-small text-secondary">Reduce motion</span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={prefs.highContrast}
                onChange={(event) =>
                  setPrefs((prev) => ({
                    ...prev,
                    highContrast: event.target.checked,
                  }))
                }
              />
              <span className="vw-small text-secondary">
                High contrast mode
              </span>
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={prefs.readingComfort}
                onChange={(event) =>
                  setPrefs((prev) => ({
                    ...prev,
                    readingComfort: event.target.checked,
                  }))
                }
              />
              <span className="vw-small text-secondary">
                Reading comfort mode
              </span>
            </label>
          </div>
        </div>
      )
    }

    if (currentStep.key === 'scripture') {
      return (
        <div className="grid gap-6">
          <div className="grid gap-4">
            <p className="text-label vw-small text-gold">BIBLE TRANSLATION</p>
            <select
              value={prefs.bibleTranslation}
              onChange={(event) =>
                setPrefs((prev) => ({
                  ...prev,
                  bibleTranslation: event.target
                    .value as BibleTranslationPreference,
                }))
              }
              className="w-full max-w-sm bg-surface-raised px-5 py-3 vw-body text-[var(--color-text-primary)]"
              style={{
                border: '1px solid var(--color-border)',
                appearance: 'none',
              }}
              aria-label="Default Bible translation"
            >
              <option value="NIV">NIV (New International Version)</option>
              <option value="ESV">ESV (English Standard Version)</option>
              <option value="NASB">NASB (New American Standard Bible)</option>
              <option value="KJV">KJV (King James Version)</option>
              <option value="NLT">NLT (New Living Translation)</option>
              <option value="MSG">MSG (The Message)</option>
            </select>
          </div>

          <div>
            <p className="text-label vw-small mb-3 text-gold">
              DEVOTIONAL DEPTH
            </p>
            <div className="flex flex-wrap gap-3">
              {[
                { label: '5-7 min', value: 'short_5_7' },
                { label: '20-30 min', value: 'medium_20_30' },
                { label: '45-60 min', value: 'long_45_60' },
                { label: 'Variable', value: 'variable' },
              ].map((option) => (
                <OptionButton
                  key={option.value}
                  active={prefs.devotionalDepthPreference === option.value}
                  onClick={() =>
                    setPrefs((prev) => ({
                      ...prev,
                      devotionalDepthPreference: option.value as
                        | 'short_5_7'
                        | 'medium_20_30'
                        | 'long_45_60'
                        | 'variable',
                    }))
                  }
                >
                  {option.label}
                </OptionButton>
              ))}
            </div>
          </div>

          <div className="grid gap-3">
            <p className="text-label vw-small text-gold">DEFAULT BRAIN</p>
            <div className="flex flex-wrap gap-3">
              {[
                { label: 'Auto', value: 'auto' },
                { label: 'OpenAI', value: 'openai' },
                { label: 'Google', value: 'google' },
                { label: 'MiniMax', value: 'minimax' },
                { label: 'NVIDIA Kimi', value: 'nvidia_kimi' },
              ].map((option) => (
                <OptionButton
                  key={option.value}
                  active={prefs.defaultBrainMode === option.value}
                  onClick={() =>
                    setPrefs((prev) => ({
                      ...prev,
                      defaultBrainMode: option.value as
                        | 'auto'
                        | 'openai'
                        | 'google'
                        | 'minimax'
                        | 'nvidia_kimi',
                    }))
                  }
                >
                  {option.label}
                </OptionButton>
              ))}
            </div>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={prefs.openWebDefaultEnabled}
                onChange={(event) =>
                  setPrefs((prev) => ({
                    ...prev,
                    openWebDefaultEnabled: event.target.checked,
                  }))
                }
              />
              <span className="vw-small text-secondary">
                Allow Open Web mode by default (you can still turn it off per
                chat).
              </span>
            </label>
          </div>

          <p className="vw-small text-secondary">
            These defaults can be changed anytime in Settings.
          </p>
        </div>
      )
    }

    return (
      <div className="grid gap-4">
        <p className="vw-body text-secondary">
          Core features are now available from the primary navigation and always
          configurable in Settings.
        </p>
        <div
          className="grid gap-3 rounded-sm bg-surface-raised p-5"
          style={{ border: '1px solid var(--color-border)' }}
        >
          <p className="text-label vw-small text-gold">SOUL AUDIT</p>
          <p className="vw-small text-secondary">
            Generate curated AI pathways from short input and start day-by-day
            reading immediately.
          </p>
          <p className="text-label vw-small text-gold">DAILY BREAD</p>
          <p className="vw-small text-secondary">
            Resume your active plan, track unlocked days, and keep rhythm
            through the week.
          </p>
          <p className="text-label vw-small text-gold">SETTINGS</p>
          <p className="vw-small text-secondary">
            Replay onboarding, adjust text size, dark mode, and Sabbath anytime.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-label vw-small text-gold">{currentStep.label}</p>
        <button
          type="button"
          onClick={() => void finishOnboarding(true)}
          disabled={saving}
          className="vw-small text-muted transition-colors duration-200 hover:text-[var(--color-text-primary)] disabled:opacity-50"
        >
          Skip for now
        </button>
      </div>

      <div
        className="mb-8 h-1 w-full bg-surface-raised"
        style={{ border: '1px solid var(--color-border)' }}
      >
        <div
          className="h-full bg-[var(--color-fg)] transition-all duration-300"
          style={{ width: progressWidth }}
        />
      </div>

      <h1 className="text-serif-italic vw-heading-md mb-3">
        {currentStep.title}
      </h1>
      <p className="vw-body mb-8 text-secondary">{currentStep.description}</p>

      <div className="mb-8">{renderStepBody()}</div>

      {error && <p className="mb-4 vw-small text-secondary">{error}</p>}

      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
          disabled={saving || stepIndex === 0}
          className="px-6 py-3 text-label vw-small disabled:opacity-40"
          style={{ border: '1px solid var(--color-border)' }}
        >
          Back
        </button>

        {!isLastStep ? (
          <button
            type="button"
            onClick={() =>
              setStepIndex((index) => Math.min(STEPS.length - 1, index + 1))
            }
            disabled={saving}
            className="bg-[var(--color-fg)] px-8 py-3 text-label vw-small text-[var(--color-bg)] disabled:opacity-50"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void finishOnboarding(false)}
            disabled={saving}
            className="bg-[var(--color-fg)] px-8 py-3 text-label vw-small text-[var(--color-bg)] disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Start Euangelion'}
          </button>
        )}
      </div>
    </div>
  )
}
