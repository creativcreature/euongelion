'use client'

import FadeIn from '@/components/motion/FadeIn'

type GuestOnboardingTheme = 'dark' | 'light' | 'system'
type GuestOnboardingTextScale = 'default' | 'large' | 'xlarge'

type GuestSignupGateProps = {
  step: 'signup' | 'onboarding'
  sabbathDay: 'saturday' | 'sunday'
  theme: GuestOnboardingTheme
  textScale: GuestOnboardingTextScale
  onStepChange: (step: 'signup' | 'onboarding') => void
  onSabbathDayChange: (day: 'saturday' | 'sunday') => void
  onThemeChange: (theme: GuestOnboardingTheme) => void
  onTextScaleChange: (scale: GuestOnboardingTextScale) => void
  onContinue: () => void
  onSignUp: () => void
}

export default function GuestSignupGate({
  step,
  sabbathDay,
  theme,
  textScale,
  onStepChange,
  onSabbathDayChange,
  onThemeChange,
  onTextScaleChange,
  onContinue,
  onSignUp,
}: GuestSignupGateProps) {
  return (
    <FadeIn>
      <section
        className="mb-6 rounded-sm bg-surface-raised p-5"
        style={{ border: '1px solid var(--color-border)' }}
        aria-live="polite"
      >
        {step === 'signup' ? (
          <div className="grid gap-4">
            <p className="text-label vw-small text-gold">
              SAVE YOUR FIRST AUDIT
            </p>
            <p className="vw-small text-secondary">
              Create an account before entering your devotional so this first
              path is saved across devices.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="text-label vw-small px-5 py-2"
                style={{ border: '1px solid var(--color-border)' }}
                onClick={onSignUp}
              >
                Sign up now
              </button>
              <button
                type="button"
                className="text-label vw-small px-5 py-2"
                style={{ border: '1px solid var(--color-border)' }}
                onClick={() => onStepChange('onboarding')}
              >
                Continue as guest
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            <p className="text-label vw-small text-gold">QUICK GUEST SETUP</p>
            <p className="vw-small text-secondary">
              Choose a Sabbath day and reading defaults before entering this
              devotional.
            </p>
            <div className="grid gap-3">
              <p className="text-label vw-small text-gold">Sabbath day</p>
              <div className="flex flex-wrap gap-2">
                {(['saturday', 'sunday'] as const).map((day) => (
                  <button
                    key={day}
                    type="button"
                    className="text-label vw-small px-4 py-2"
                    style={{
                      border: '1px solid var(--color-border)',
                      background:
                        sabbathDay === day ? 'var(--color-fg)' : 'transparent',
                      color:
                        sabbathDay === day
                          ? 'var(--color-bg)'
                          : 'var(--color-text-primary)',
                    }}
                    onClick={() => onSabbathDayChange(day)}
                  >
                    {day[0].toUpperCase() + day.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-3">
              <p className="text-label vw-small text-gold">Theme</p>
              <div className="flex flex-wrap gap-2">
                {(['dark', 'light', 'system'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className="text-label vw-small px-4 py-2"
                    style={{
                      border: '1px solid var(--color-border)',
                      background:
                        theme === t ? 'var(--color-fg)' : 'transparent',
                      color:
                        theme === t
                          ? 'var(--color-bg)'
                          : 'var(--color-text-primary)',
                    }}
                    onClick={() => onThemeChange(t)}
                  >
                    {t[0].toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-3">
              <p className="text-label vw-small text-gold">Text size</p>
              <div className="flex flex-wrap gap-2">
                {(['default', 'large', 'xlarge'] as const).map((scale) => (
                  <button
                    key={scale}
                    type="button"
                    className="text-label vw-small px-4 py-2"
                    style={{
                      border: '1px solid var(--color-border)',
                      background:
                        textScale === scale ? 'var(--color-fg)' : 'transparent',
                      color:
                        textScale === scale
                          ? 'var(--color-bg)'
                          : 'var(--color-text-primary)',
                    }}
                    onClick={() => onTextScaleChange(scale)}
                  >
                    {scale === 'xlarge'
                      ? 'XLarge'
                      : scale[0].toUpperCase() + scale.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                className="text-label vw-small px-5 py-2"
                style={{ border: '1px solid var(--color-border)' }}
                onClick={onContinue}
              >
                Continue to devotional
              </button>
              <button
                type="button"
                className="text-label vw-small px-5 py-2"
                style={{ border: '1px solid var(--color-border)' }}
                onClick={() => onStepChange('signup')}
              >
                Back
              </button>
            </div>
          </div>
        )}
      </section>
    </FadeIn>
  )
}
