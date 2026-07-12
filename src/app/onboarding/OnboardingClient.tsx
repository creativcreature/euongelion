'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSettingsStore } from '@/stores/settingsStore'
import type { OnboardingPreferences } from '@/lib/auth/onboarding'
import {
  ONBOARDING_BEATS,
  ONBOARDING_WINDOW_CHOICES,
  beatIndex,
  isOnboardingWindowChoice,
  nextBeat,
  previousBeat,
  resolveOnboardingDestination,
  type OnboardingBeat,
  type OnboardingWindowChoice,
} from '@/lib/auth/onboarding-flow'
import { REMINDER_WINDOWS } from '@/lib/push/reminder-window'
import {
  detectReminderCapability,
  enableReminders,
  type ReminderCapability,
} from '@/lib/push/subscribe-client'

interface OnboardingClientProps {
  finalRedirect: string
  initialPreferences: OnboardingPreferences
}

type SaveResponse = {
  ok?: boolean
  error?: string
}

/**
 * Account onboarding — the bookend welcome (pattern doc §4, F-065
 * extension). The reader arrives here mid-journey: they created an
 * account at the generation gate, having already told us what they're
 * wrestling with. So this is a brief welcome, never a cold-start quiz:
 *
 *   warm framing (the WHY precedes the what)
 *   → beat A: named reminder window — Morning / Midday / Evening (§7.3)
 *   → beat B: reminders opt-in with an equal-dignity "Not now"
 *     (web-push permission is requested ONLY on the explicit yes)
 *   → bridge: what the answers were for + the honesty line
 *   → lands IN content (the held plan / interstitial via redirect, the
 *     active plan, or Daily Bread) — never a menu.
 *
 * Skip sits directly above Continue; skipping everything still lands in
 * content with defaults. State persists in the existing auth-metadata
 * keys via /api/auth/onboarding (admin reset stays compatible), and the
 * flow is re-enterable from Settings → "Revisit your welcome".
 */
export default function OnboardingClient({
  finalRedirect,
  initialPreferences,
}: OnboardingClientProps) {
  const router = useRouter()
  const storedWindow = useSettingsStore((s) => s.reminderWindow)
  const setReminderWindow = useSettingsStore((s) => s.setReminderWindow)

  const [beat, setBeat] = useState<OnboardingBeat>('welcome')
  const [windowChoice, setWindowChoice] = useState<OnboardingWindowChoice>(
    isOnboardingWindowChoice(storedWindow) ? storedWindow : 'morning',
  )
  const [capability, setCapability] = useState<ReminderCapability | null>(null)
  const [reminderNotice, setReminderNotice] = useState<string | null>(null)
  const [remindersEnabled, setRemindersEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activePlanRoute, setActivePlanRoute] = useState<string | null>(null)

  // Capability detection is a browser question — answer it client-side once.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot browser capability probe
    setCapability(detectReminderCapability())
  }, [])

  // The bridge lands in content: an active plan's own route wins over the
  // Daily Bread default. Fetched quietly; failure just means the default.
  useEffect(() => {
    let cancelled = false
    fetch('/api/soul-audit/current')
      .then((res) => res.json())
      .then((data: { hasCurrent?: boolean; route?: string }) => {
        if (cancelled) return
        if (data.hasCurrent && data.route) setActivePlanRoute(data.route)
      })
      .catch(() => {
        // no-op — Daily Bread remains the landing
      })
    return () => {
      cancelled = true
    }
  }, [])

  const stepNumber = beatIndex(beat)
  const destination = resolveOnboardingDestination({
    redirect: finalRedirect,
    activePlanRoute,
  })

  async function persistOnboarding(skipped: boolean) {
    const response = await fetch('/api/auth/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        skipped,
        // Reading preferences are captured in Settings, not here — pass the
        // server's own snapshot back unchanged so nothing is overwritten.
        preferences: initialPreferences,
      }),
    })

    const payload = (await response.json().catch(() => ({}))) as SaveResponse
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || 'Unable to save your welcome.')
    }
  }

  async function finish(skipped: boolean) {
    setSaving(true)
    setError(null)
    try {
      await persistOnboarding(skipped)
      router.replace(destination)
      router.refresh()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to finish just now. Please try again.',
      )
      setSaving(false)
    }
  }

  function continueFromWindow() {
    // The choice is real the moment it's made: saved on this device; it
    // rides into /api/push/subscribe if the reader opts in on the next
    // beat, and is editable any time in Settings → Reminders.
    setReminderWindow(windowChoice)
    setBeat('reminders')
  }

  async function optInToReminders() {
    setBusy(true)
    setError(null)
    setReminderNotice(null)
    const result = await enableReminders(windowChoice)
    setBusy(false)
    if (result.ok) {
      setRemindersEnabled(true)
      const meta = REMINDER_WINDOWS[windowChoice]
      setReminderNotice(
        `It’s set. ${meta.label}, ${meta.hoursLabel} in your local time.`,
      )
      setBeat('bridge')
      return
    }
    if (result.reason === 'permission_denied') {
      // An honest no is a completed decision, not an error.
      setReminderNotice(result.message)
      setBeat('bridge')
      return
    }
    setError(result.message)
  }

  const windowMeta = REMINDER_WINDOWS[windowChoice]

  return (
    <div className="w-full">
      {/* Quiet segmented hairline progress — no step numerals shouting. */}
      <div
        className="onboarding-progress mb-10"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={ONBOARDING_BEATS.length}
        aria-valuenow={stepNumber + 1}
        aria-label="Welcome progress"
      >
        {ONBOARDING_BEATS.map((key, index) => (
          <span
            key={key}
            className={`onboarding-progress-segment${
              index <= stepNumber ? ' is-lit' : ''
            }`}
          />
        ))}
      </div>

      {beat === 'welcome' && (
        <section aria-labelledby="onboarding-welcome-heading">
          <p className="text-label vw-small mb-4 text-gold">WELCOME</p>
          <h1
            id="onboarding-welcome-heading"
            className="text-serif-italic vw-heading-md mb-4"
          >
            Before you begin.
          </h1>
          <p className="vw-body mb-3 text-secondary">
            You&rsquo;ve already told us what you&rsquo;re wrestling with. Two
            small questions help the words arrive well — when the day should
            reach you, and whether we may knock at all.
          </p>
          <p className="vw-small mb-10 text-muted">
            Nothing here is required, and everything stays editable in Settings.
          </p>
        </section>
      )}

      {beat === 'window' && (
        <section aria-labelledby="onboarding-window-heading">
          <p className="text-label vw-small mb-4 text-gold">ONE QUIET WORD</p>
          <h1
            id="onboarding-window-heading"
            className="text-serif-italic vw-heading-md mb-4"
          >
            When should the day&rsquo;s word find you?
          </h1>
          <p className="vw-small mb-8 text-secondary">
            One line a day at most, in the window you choose. Your local time.
          </p>
          <div className="mb-10 grid gap-3">
            {ONBOARDING_WINDOW_CHOICES.map((code) => {
              const meta = REMINDER_WINDOWS[code]
              const active = windowChoice === code
              return (
                <button
                  type="button"
                  key={code}
                  onClick={() => setWindowChoice(code)}
                  aria-pressed={active}
                  className="flex min-h-[44px] items-baseline justify-between gap-4 px-5 py-4 text-left transition-theme"
                  style={{
                    backgroundColor: active
                      ? 'var(--color-fg)'
                      : 'var(--color-surface)',
                    color: active
                      ? 'var(--color-bg)'
                      : 'var(--color-text-secondary)',
                    border: `1px solid ${
                      active ? 'var(--color-fg)' : 'var(--color-border)'
                    }`,
                  }}
                >
                  <span className="text-label vw-small">{meta.label}</span>
                  <span className="vw-small" style={{ opacity: 0.7 }}>
                    {meta.hoursLabel}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {beat === 'reminders' && (
        <section aria-labelledby="onboarding-reminders-heading">
          <p className="text-label vw-small mb-4 text-gold">REMINDERS</p>
          <h1
            id="onboarding-reminders-heading"
            className="text-serif-italic vw-heading-md mb-4"
          >
            May we knock, softly?
          </h1>
          <p className="vw-body mb-3 text-secondary">
            A single quiet notification in your {windowMeta.label.toLowerCase()}{' '}
            window — no streaks, no badges, off any time.
          </p>

          {capability === 'available' && (
            <>
              <p className="vw-small mb-8 text-muted">
                Saying yes asks your browser for permission once. Saying no
                changes nothing — the reading is yours either way.
              </p>
              <div className="mb-10 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void optInToReminders()}
                  disabled={busy || saving}
                  aria-busy={busy}
                  className="min-h-[44px] bg-[var(--color-fg)] px-6 py-4 text-label vw-small text-[var(--color-bg)] disabled:opacity-50"
                >
                  {busy ? 'One moment…' : 'Turn on reminders'}
                </button>
                <button
                  type="button"
                  onClick={() => setBeat('bridge')}
                  disabled={busy || saving}
                  className="min-h-[44px] px-6 py-4 text-label vw-small disabled:opacity-50"
                  style={{
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Not now
                </button>
              </div>
            </>
          )}

          {capability === 'unsupported' && (
            <>
              <p className="vw-small mb-8 text-secondary">
                This browser can&rsquo;t receive web notifications. On iPhone or
                iPad, add Euangelion to your Home Screen — reminders work from
                the installed app. Your chosen window is saved for when they do.
              </p>
              <div className="mb-10" />
            </>
          )}

          {capability === 'unconfigured' && (
            <>
              <p className="vw-small mb-8 text-secondary">
                Reminder delivery isn&rsquo;t switched on for this site yet.
                Your chosen window is saved on this device and takes effect the
                moment notifications are enabled — nothing arrives until then.
              </p>
              <div className="mb-10" />
            </>
          )}

          {capability === 'denied' && (
            <>
              <p className="vw-small mb-8 text-secondary">
                Notifications are blocked for this site in your browser. To
                receive the quiet word later, allow notifications for
                euangelion.app in your browser&rsquo;s site settings — your
                chosen window is already saved.
              </p>
              <div className="mb-10" />
            </>
          )}
        </section>
      )}

      {beat === 'bridge' && (
        <section aria-labelledby="onboarding-bridge-heading">
          <p className="text-label vw-small mb-4 text-gold">READY</p>
          <h1
            id="onboarding-bridge-heading"
            className="text-serif-italic vw-heading-md mb-4"
          >
            That&rsquo;s everything.
          </h1>
          {reminderNotice && (
            <p className="vw-small mb-3 text-gold" role="status">
              {reminderNotice}
            </p>
          )}
          <p className="vw-body mb-3 text-secondary">
            Your window shapes when the day&rsquo;s word arrives
            {remindersEnabled
              ? ', and reminders will do exactly what you just chose — nothing more.'
              : '; reminders stay off unless you turn them on in Settings.'}
          </p>
          <p className="vw-small mb-10 text-muted">
            We only use your answers to personalize your experience.
          </p>
        </section>
      )}

      {error && (
        <p
          className="vw-small mb-4"
          style={{ color: 'var(--color-error)' }}
          role="alert"
        >
          {error}
        </p>
      )}

      {/* Skip directly above Continue (Ten Percent Happier placement). */}
      {beat !== 'bridge' && (
        <div className="mb-3 text-center sm:text-right">
          <button
            type="button"
            onClick={() => void finish(true)}
            disabled={saving || busy}
            className="min-h-[44px] px-3 py-2 vw-small text-muted transition-colors duration-200 hover:text-[var(--color-text-primary)] disabled:opacity-50"
          >
            Skip for now
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        {beat !== 'welcome' ? (
          <button
            type="button"
            onClick={() => setBeat(previousBeat(beat))}
            disabled={saving || busy}
            className="min-h-[44px] px-6 py-3 text-label vw-small disabled:opacity-40"
            style={{ border: '1px solid var(--color-border)' }}
          >
            Back
          </button>
        ) : (
          <span aria-hidden="true" />
        )}

        {beat === 'welcome' && (
          <button
            type="button"
            onClick={() => setBeat(nextBeat(beat))}
            disabled={saving}
            className="min-h-[44px] bg-[var(--color-fg)] px-8 py-3 text-label vw-small text-[var(--color-bg)] disabled:opacity-50"
          >
            Continue
          </button>
        )}
        {beat === 'window' && (
          <button
            type="button"
            onClick={continueFromWindow}
            disabled={saving}
            className="min-h-[44px] bg-[var(--color-fg)] px-8 py-3 text-label vw-small text-[var(--color-bg)] disabled:opacity-50"
          >
            Continue
          </button>
        )}
        {beat === 'reminders' && capability !== 'available' && (
          <button
            type="button"
            onClick={() => setBeat('bridge')}
            disabled={saving || busy}
            className="min-h-[44px] bg-[var(--color-fg)] px-8 py-3 text-label vw-small text-[var(--color-bg)] disabled:opacity-50"
          >
            Continue
          </button>
        )}
        {beat === 'bridge' && (
          <button
            type="button"
            onClick={() => void finish(false)}
            disabled={saving}
            className="min-h-[44px] bg-[var(--color-fg)] px-8 py-3 text-label vw-small text-[var(--color-bg)] disabled:opacity-50"
          >
            {saving ? 'One moment…' : 'Begin reading'}
          </button>
        )}
      </div>

      <style>{`
        .onboarding-progress {
          display: flex; gap: 6px;
        }
        .onboarding-progress-segment {
          flex: 1 1 0; height: 2px;
          background: var(--color-border);
          transition: background-color 400ms ease;
        }
        .onboarding-progress-segment.is-lit {
          background: var(--color-gold);
        }
      `}</style>
    </div>
  )
}
