'use client'

import { useState, useEffect } from 'react'
import Navigation from '@/components/Navigation'

type Theme = 'dark' | 'light' | 'system'
type SabbathDay = 'saturday' | 'sunday'

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  return (localStorage.getItem('theme-preference') as Theme) || 'dark'
}

function getStoredSabbath(): SabbathDay {
  if (typeof window === 'undefined') return 'sunday'
  return (localStorage.getItem('sabbath-day') as SabbathDay) || 'sunday'
}

function getStoredTranslation(): string {
  if (typeof window === 'undefined') return 'NIV'
  return localStorage.getItem('bible-translation') || 'NIV'
}

export default function SettingsPage() {
  const [themePreference, setThemePreference] = useState<Theme>(getStoredTheme)
  const [sabbathDay, setSabbathDay] = useState<SabbathDay>(getStoredSabbath)
  const [translation, setTranslation] = useState(getStoredTranslation)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    localStorage.setItem('theme-preference', themePreference)

    if (themePreference === 'system') {
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)',
      ).matches
      document.documentElement.classList.toggle('dark', prefersDark)
      localStorage.removeItem('theme')
    } else {
      document.documentElement.classList.toggle(
        'dark',
        themePreference === 'dark',
      )
      localStorage.setItem('theme', themePreference)
    }
  }, [themePreference])

  useEffect(() => {
    localStorage.setItem('sabbath-day', sabbathDay)
  }, [sabbathDay])

  useEffect(() => {
    localStorage.setItem('bible-translation', translation)
  }, [translation])

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-screen bg-page">
      <Navigation />

      <main
        id="main-content"
        className="mx-auto max-w-2xl px-6 pb-32 pt-12 md:px-[60px] md:pb-48 md:pt-20"
      >
        <h1 className="text-display vw-heading-lg mb-12">Settings</h1>

        {/* Theme */}
        <div
          className="mb-8 pb-8"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <h2 className="text-label vw-small mb-6 text-gold">APPEARANCE</h2>
          <div className="flex gap-4">
            {(['dark', 'light', 'system'] as Theme[]).map((t) => (
              <button
                key={t}
                onClick={() => setThemePreference(t)}
                className="px-6 py-3 text-label vw-small transition-all duration-300"
                style={{
                  backgroundColor:
                    themePreference === t
                      ? 'var(--color-fg)'
                      : 'var(--color-surface)',
                  color:
                    themePreference === t
                      ? 'var(--color-bg)'
                      : 'var(--color-text-secondary)',
                  border: `1px solid ${themePreference === t ? 'var(--color-fg)' : 'var(--color-border)'}`,
                  transitionTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
                }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Sabbath Day */}
        <div
          className="mb-8 pb-8"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <h2 className="text-label vw-small mb-4 text-gold">SABBATH DAY</h2>
          <p className="vw-small mb-6 text-secondary">
            No new content unlocks on your Sabbath.
          </p>
          <div className="flex gap-4">
            {(['saturday', 'sunday'] as SabbathDay[]).map((day) => (
              <button
                key={day}
                onClick={() => setSabbathDay(day)}
                className="px-6 py-3 text-label vw-small transition-all duration-300"
                style={{
                  backgroundColor:
                    sabbathDay === day
                      ? 'var(--color-fg)'
                      : 'var(--color-surface)',
                  color:
                    sabbathDay === day
                      ? 'var(--color-bg)'
                      : 'var(--color-text-secondary)',
                  border: `1px solid ${sabbathDay === day ? 'var(--color-fg)' : 'var(--color-border)'}`,
                  transitionTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
                }}
              >
                {day.charAt(0).toUpperCase() + day.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Bible Translation */}
        <div
          className="mb-8 pb-8"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <h2 className="text-label vw-small mb-4 text-gold">
            BIBLE TRANSLATION
          </h2>
          <p className="vw-small mb-6 text-secondary">
            Default translation for Scripture passages.
          </p>
          <select
            value={translation}
            onChange={(e) => setTranslation(e.target.value)}
            className="w-full max-w-xs bg-surface-raised px-6 py-3 vw-body text-[var(--color-text-primary)]"
            style={{
              border: '1px solid var(--color-border)',
              appearance: 'none',
            }}
          >
            <option value="NIV">NIV (New International Version)</option>
            <option value="ESV">ESV (English Standard Version)</option>
            <option value="NASB">NASB (New American Standard Bible)</option>
            <option value="KJV">KJV (King James Version)</option>
            <option value="NLT">NLT (New Living Translation)</option>
            <option value="MSG">MSG (The Message)</option>
          </select>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          className="bg-[var(--color-fg)] px-10 py-5 text-label vw-small text-[var(--color-bg)] transition-all duration-300 hover:bg-gold hover:text-tehom focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          style={{ transitionTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)' }}
        >
          {saved ? 'Saved' : 'Save Preferences'}
        </button>

        {/* Legal Links */}
        <div className="mt-16">
          <p className="text-label vw-small mb-4 text-muted">LEGAL</p>
          <div className="space-y-3">
            <a
              href="/privacy"
              className="block vw-small text-secondary transition-colors duration-300 hover:text-[var(--color-text-primary)]"
            >
              Privacy Policy
            </a>
            <a
              href="/terms"
              className="block vw-small text-secondary transition-colors duration-300 hover:text-[var(--color-text-primary)]"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
