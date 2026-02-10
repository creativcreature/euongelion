'use client'

import { useState, useSyncExternalStore } from 'react'
import Navigation from '@/components/Navigation'
import { useUIStore } from '@/stores/uiStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useChatStore } from '@/stores/chatStore'

type Theme = 'dark' | 'light' | 'system'
type SabbathDay = 'saturday' | 'sunday'
type BibleTranslation = 'NIV' | 'ESV' | 'NASB' | 'KJV' | 'NLT' | 'MSG'

const emptySubscribe = () => () => {}

function useHydrated() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )
}

export default function SettingsPage() {
  const { theme, setTheme } = useUIStore()
  const {
    bibleTranslation,
    sabbathDay,
    anthropicApiKey,
    setBibleTranslation,
    setSabbathDay,
    setAnthropicApiKey,
  } = useSettingsStore()
  const { messages, clearHistory } = useChatStore()

  const hydrated = useHydrated()

  // Show saved confirmation
  const [saved, setSaved] = useState(false)
  function showSaved() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-page">
        <Navigation />
        <main
          id="main-content"
          className="mx-auto max-w-2xl px-6 pb-32 pt-12 md:px-[60px] md:pb-48 md:pt-20"
        >
          <h1 className="text-display vw-heading-lg mb-12">Settings</h1>
        </main>
      </div>
    )
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
                onClick={() => {
                  setTheme(t)
                  showSaved()
                }}
                className="px-6 py-3 text-label vw-small transition-theme"
                style={{
                  backgroundColor:
                    theme === t ? 'var(--color-fg)' : 'var(--color-surface)',
                  color:
                    theme === t
                      ? 'var(--color-bg)'
                      : 'var(--color-text-secondary)',
                  border: `1px solid ${theme === t ? 'var(--color-fg)' : 'var(--color-border)'}`,
                }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
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
            Default translation shown in Scripture passages.
          </p>
          <select
            value={bibleTranslation}
            onChange={(e) => {
              setBibleTranslation(e.target.value as BibleTranslation)
              showSaved()
            }}
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

        {/* Sabbath Day */}
        <div
          className="mb-8 pb-8"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <h2 className="text-label vw-small mb-4 text-gold">SABBATH DAY</h2>
          <p className="vw-small mb-6 text-secondary">
            No new content unlocks on your Sabbath. Rest is sacred.
          </p>
          <div className="flex gap-4">
            {(['saturday', 'sunday'] as SabbathDay[]).map((day) => (
              <button
                key={day}
                onClick={() => {
                  setSabbathDay(day)
                  showSaved()
                }}
                className="px-6 py-3 text-label vw-small transition-theme"
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
                }}
              >
                {day.charAt(0).toUpperCase() + day.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* AI Research Chat */}
        <div
          className="mb-8 pb-8"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <h2 className="text-label vw-small mb-4 text-gold">
            AI RESEARCH CHAT
          </h2>
          <p className="vw-small mb-6 text-secondary">
            Add your own Anthropic API key for unlimited biblical research
            questions. Without a key, you get 10 free questions per day.
          </p>
          <input
            type="password"
            value={anthropicApiKey}
            onChange={(e) => {
              setAnthropicApiKey(e.target.value)
              showSaved()
            }}
            placeholder="sk-ant-..."
            className="w-full max-w-md bg-surface-raised px-6 py-3 vw-body text-[var(--color-text-primary)] placeholder:text-muted focus:outline-none"
            style={{
              border: '1px solid var(--color-border)',
            }}
            autoComplete="off"
          />
          <p className="mt-3 vw-small text-muted">
            Your key is stored locally and never sent to our servers.
          </p>
        </div>

        {/* Chat History */}
        <div
          className="mb-8 pb-8"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <h2 className="text-label vw-small mb-4 text-gold">CHAT HISTORY</h2>
          <p className="vw-small mb-6 text-secondary">
            {messages.length} message{messages.length !== 1 ? 's' : ''} saved
            locally.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => {
                if (messages.length === 0) return
                const blob = new Blob([JSON.stringify(messages, null, 2)], {
                  type: 'application/json',
                })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'euangelion-chat-history.json'
                a.click()
                URL.revokeObjectURL(url)
              }}
              disabled={messages.length === 0}
              className="px-6 py-3 text-label vw-small transition-theme disabled:opacity-30"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              Export
            </button>
            <button
              onClick={() => {
                if (
                  messages.length > 0 &&
                  window.confirm(
                    'Clear all chat history? This cannot be undone.',
                  )
                ) {
                  clearHistory()
                  showSaved()
                }
              }}
              disabled={messages.length === 0}
              className="px-6 py-3 text-label vw-small transition-theme disabled:opacity-30"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-error)',
              }}
            >
              Clear History
            </button>
          </div>
        </div>

        {/* Saved indicator */}
        <div
          className="h-10 transition-opacity"
          style={{ opacity: saved ? 1 : 0, transitionDuration: '300ms' }}
        >
          <p className="vw-small text-gold">Preferences saved automatically.</p>
        </div>

        {/* Legal Links */}
        <div className="mt-12">
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
