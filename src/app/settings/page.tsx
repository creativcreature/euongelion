'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteFooter from '@/components/SiteFooter'
import { useUIStore } from '@/stores/uiStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useChatStore } from '@/stores/chatStore'
import { serializeDayLockingCookie } from '@/lib/day-locking'
import {
  detectBillingPlatform,
  purchasePlanOnIos,
  restoreIosPurchases,
} from '@/lib/billing/purchases'
import {
  type BillingLifecycleState,
  resolveBillingFlash,
  sanitizeCheckoutSessionId,
} from '@/lib/billing/flash'
import type { BillingConfigResponse, BillingPlan } from '@/types/billing'

type Theme = 'dark' | 'light' | 'system'
type SabbathDay = 'saturday' | 'sunday'
type BibleTranslation = 'NIV' | 'ESV' | 'NASB' | 'KJV' | 'NLT' | 'MSG'
type TextScale = 'default' | 'large' | 'xlarge'
type BrainMode = 'auto' | 'openai' | 'google' | 'minimax' | 'nvidia_kimi'
type MockMode = 'anonymous' | 'mock_account'

type MockRetention = {
  anonymousSessionDays: number
  bookmarksDays: number
  notesDays: number
  highlightsDays: number
  chatHistoryDays: number
  archivedArtifactsDays: number
  trashRestoreWindowDays: number
}

type MockAccountSessionResponse = {
  ok?: boolean
  mode?: MockMode
  analyticsOptIn?: boolean
  capabilities?: string[]
  retention?: MockRetention
  retentionSummary?: Record<string, string>
  error?: string
}

type MockExportResponse = {
  ok?: boolean
  error?: string
  code?: string
}

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
    defaultBrainMode,
    openWebDefaultEnabled,
    devotionalDepthPreference,
    keyStorageMode,
    anthropicApiKey,
    openaiApiKey,
    googleApiKey,
    minimaxApiKey,
    nvidiaKimiApiKey,
    dayLockingEnabled,
    textScale,
    reduceMotion,
    highContrast,
    readingComfort,
    setBibleTranslation,
    setSabbathDay,
    setDefaultBrainMode,
    setOpenWebDefaultEnabled,
    setDevotionalDepthPreference,
    setKeyStorageMode,
    hydrateRememberedProviderKeys,
    clearProviderKeys,
    setAnthropicApiKey,
    setOpenaiApiKey,
    setGoogleApiKey,
    setMinimaxApiKey,
    setNvidiaKimiApiKey,
    setDayLockingEnabled,
    setTextScale,
    setReduceMotion,
    setHighContrast,
    setReadingComfort,
  } = useSettingsStore()
  const { messages, clearHistory } = useChatStore()
  const [billingConfig, setBillingConfig] =
    useState<BillingConfigResponse | null>(null)
  const [billingPlatform, setBillingPlatform] = useState<'ios' | 'web'>('web')
  const [billingBusy, setBillingBusy] = useState(false)
  const [billingPortalBusy, setBillingPortalBusy] = useState(false)
  const [billingError, setBillingError] = useState<string | null>(null)
  const [billingMessage, setBillingMessage] = useState<string | null>(null)
  const [billingLifecycleState, setBillingLifecycleState] =
    useState<BillingLifecycleState>('idle')
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(
    null,
  )
  const [privacyMode, setPrivacyMode] = useState<MockMode>('anonymous')
  const [privacyAnalyticsOptIn, setPrivacyAnalyticsOptIn] = useState(false)
  const [privacyCapabilities, setPrivacyCapabilities] = useState<string[]>([])
  const [privacyRetention, setPrivacyRetention] =
    useState<MockRetention | null>(null)
  const [privacyRetentionSummary, setPrivacyRetentionSummary] = useState<
    Record<string, string>
  >({})
  const [privacyBusy, setPrivacyBusy] = useState(false)
  const [privacyExportBusy, setPrivacyExportBusy] = useState(false)
  const [privacyMessage, setPrivacyMessage] = useState<string | null>(null)
  const [privacyError, setPrivacyError] = useState<string | null>(null)
  const brainSyncTimerRef = useRef<number | null>(null)

  const hydrated = useHydrated()

  const billingEnabled = useMemo(() => {
    if (!billingConfig) return false
    return billingPlatform === 'ios'
      ? billingConfig.paymentsEnabled.iosIap
      : billingConfig.paymentsEnabled.webStripe
  }, [billingConfig, billingPlatform])

  const billingDisabledReason = useMemo(() => {
    if (billingConfig) {
      if (billingEnabled) return null
      return billingPlatform === 'ios'
        ? 'App Store IAP is not configured yet in this environment.'
        : 'Stripe checkout is not configured yet in this environment.'
    }
    return 'Billing configuration is loading.'
  }, [billingConfig, billingEnabled, billingPlatform])

  const billingLifecycleCopy = useMemo(() => {
    switch (billingLifecycleState) {
      case 'processing':
        return 'Payment is processing. Please wait while we confirm your billing status.'
      case 'succeeded':
        return 'Payment confirmed. Premium access is active.'
      case 'cancelled':
        return 'Checkout was cancelled before completion.'
      case 'restore_succeeded':
        return 'Purchases restored successfully.'
      case 'restore_failed':
        return 'Restore failed. Try again in a few moments.'
      case 'requires_action':
        return 'Payment needs additional verification from your bank.'
      case 'failed':
        return 'Payment failed. Retry with the same or a different method.'
      case 'unknown':
        return 'Billing status could not be verified. Please retry.'
      case 'idle':
      default:
        return null
    }
  }, [billingLifecycleState])

  const billingLifecycleTone = useMemo(() => {
    if (
      billingLifecycleState === 'succeeded' ||
      billingLifecycleState === 'restore_succeeded'
    ) {
      return 'success'
    }
    if (billingLifecycleState === 'processing') {
      return 'pending'
    }
    if (billingLifecycleState === 'idle') {
      return 'neutral'
    }
    return 'error'
  }, [billingLifecycleState])

  // Show saved confirmation
  const [saved, setSaved] = useState(false)
  function showSaved() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function loadPrivacySession() {
    try {
      const response = await fetch('/api/mock-account/session', {
        cache: 'no-store',
      })
      const payload = (await response.json()) as MockAccountSessionResponse
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Unable to load privacy session.')
      }

      setPrivacyMode(
        payload.mode === 'mock_account' ? 'mock_account' : 'anonymous',
      )
      setPrivacyAnalyticsOptIn(Boolean(payload.analyticsOptIn))
      setPrivacyCapabilities(
        Array.isArray(payload.capabilities) ? payload.capabilities : [],
      )
      setPrivacyRetention(payload.retention ?? null)
      setPrivacyRetentionSummary(payload.retentionSummary ?? {})
    } catch (error) {
      setPrivacyError(
        error instanceof Error
          ? error.message
          : 'Unable to load privacy settings.',
      )
    }
  }

  async function savePrivacySession(next: {
    mode: MockMode
    analyticsOptIn: boolean
  }) {
    setPrivacyBusy(true)
    setPrivacyError(null)
    setPrivacyMessage(null)
    try {
      const response = await fetch('/api/mock-account/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
      const payload = (await response.json()) as MockAccountSessionResponse
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Unable to save privacy settings.')
      }

      setPrivacyMode(
        payload.mode === 'mock_account' ? 'mock_account' : 'anonymous',
      )
      setPrivacyAnalyticsOptIn(Boolean(payload.analyticsOptIn))
      setPrivacyCapabilities(
        Array.isArray(payload.capabilities) ? payload.capabilities : [],
      )
      setPrivacyRetention(payload.retention ?? null)
      setPrivacyRetentionSummary(payload.retentionSummary ?? {})
      setPrivacyMessage('Privacy preferences saved.')
      showSaved()
    } catch (error) {
      setPrivacyError(
        error instanceof Error
          ? error.message
          : 'Unable to save privacy settings.',
      )
    } finally {
      setPrivacyBusy(false)
    }
  }

  async function exportMockAccountData() {
    setPrivacyExportBusy(true)
    setPrivacyError(null)
    setPrivacyMessage(null)

    try {
      const response = await fetch('/api/mock-account/export', {
        cache: 'no-store',
      })
      const payload = (await response.json()) as MockExportResponse
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to export data.')
      }

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `euangelion-mock-account-export-${new Date()
        .toISOString()
        .slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setPrivacyMessage('Mock account export downloaded.')
    } catch (error) {
      setPrivacyError(
        error instanceof Error ? error.message : 'Unable to export data.',
      )
    } finally {
      setPrivacyExportBusy(false)
    }
  }

  useEffect(() => {
    let mounted = true
    async function loadBilling() {
      try {
        const [platform, configRes] = await Promise.all([
          detectBillingPlatform(),
          fetch('/api/billing/config', { cache: 'no-store' }),
        ])
        if (!mounted) return
        setBillingPlatform(platform)
        if (configRes.ok) {
          setBillingConfig((await configRes.json()) as BillingConfigResponse)
        }

        const params = new URLSearchParams(window.location.search)
        let checkoutStatus = params.get('billing')
        const parsedSessionId = sanitizeCheckoutSessionId(
          params.get('session_id'),
        )
        if (parsedSessionId) {
          setCheckoutSessionId(parsedSessionId)
          try {
            const lifecycleRes = await fetch(
              `/api/billing/lifecycle?session_id=${encodeURIComponent(
                parsedSessionId,
              )}`,
              {
                cache: 'no-store',
              },
            )
            const lifecyclePayload = (await lifecycleRes.json()) as {
              billingStatus?: string
              premiumActive?: boolean
            }
            if (lifecycleRes.ok && lifecyclePayload.billingStatus) {
              checkoutStatus = lifecyclePayload.billingStatus
              if (lifecyclePayload.premiumActive) {
                setBillingMessage(
                  'Subscription confirmed. Premium features are now active.',
                )
              }
            }
          } catch {
            // Keep query-param fallback flash behavior.
          }
        }

        const flash = resolveBillingFlash({
          billingStatus: checkoutStatus,
          platform,
        })
        setBillingLifecycleState(flash.state)
        if (flash.message) setBillingMessage(flash.message)
        if (flash.error) setBillingError(flash.error)

        if (checkoutStatus || parsedSessionId) {
          params.delete('billing')
          params.delete('session_id')
          const nextSearch = params.toString()
          const nextUrl = `${window.location.pathname}${
            nextSearch ? `?${nextSearch}` : ''
          }${window.location.hash}`
          window.history.replaceState({}, '', nextUrl)
        }
      } catch {
        if (!mounted) return
        setBillingLifecycleState('failed')
        setBillingError('Unable to load billing settings right now.')
      }
    }
    void loadBilling()
    void loadPrivacySession()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!hydrated || typeof document === 'undefined') return
    document.cookie = serializeDayLockingCookie(dayLockingEnabled)
  }, [dayLockingEnabled, hydrated])

  useEffect(() => {
    if (!hydrated) return
    void hydrateRememberedProviderKeys()
  }, [hydrated, hydrateRememberedProviderKeys])

  useEffect(() => {
    if (!hydrated) return
    if (brainSyncTimerRef.current) {
      window.clearTimeout(brainSyncTimerRef.current)
    }

    brainSyncTimerRef.current = window.setTimeout(() => {
      void fetch('/api/brain/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultBrainMode,
          openWebDefaultEnabled,
          devotionalDepthPreference,
        }),
      }).catch(() => {
        // Best-effort sync for authenticated users.
      })
    }, 500)

    return () => {
      if (brainSyncTimerRef.current) {
        window.clearTimeout(brainSyncTimerRef.current)
      }
    }
  }, [
    hydrated,
    defaultBrainMode,
    openWebDefaultEnabled,
    devotionalDepthPreference,
  ])

  async function startWebCheckout(plan: BillingPlan) {
    setBillingBusy(true)
    setBillingLifecycleState('processing')
    setBillingError(null)
    setBillingMessage(null)
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, platform: 'web' }),
      })
      const payload = (await response.json()) as {
        checkoutUrl?: string
        error?: string
      }
      if (!response.ok || !payload.checkoutUrl) {
        throw new Error(payload.error || 'Unable to start checkout.')
      }
      window.location.href = payload.checkoutUrl
    } catch (error) {
      setBillingLifecycleState('failed')
      setBillingError(
        error instanceof Error ? error.message : 'Unable to start checkout.',
      )
    } finally {
      setBillingBusy(false)
    }
  }

  async function startIosPurchase(plan: BillingPlan) {
    setBillingBusy(true)
    setBillingLifecycleState('processing')
    setBillingError(null)
    setBillingMessage(null)
    try {
      await purchasePlanOnIos(plan.id)
      setBillingLifecycleState('succeeded')
      setBillingMessage('Purchase complete. Premium access is now active.')
    } catch (error) {
      setBillingLifecycleState('failed')
      setBillingError(
        error instanceof Error
          ? error.message
          : 'Unable to complete in-app purchase.',
      )
    } finally {
      setBillingBusy(false)
    }
  }

  async function restorePurchasesAction() {
    setBillingBusy(true)
    setBillingLifecycleState('processing')
    setBillingError(null)
    setBillingMessage(null)
    try {
      await restoreIosPurchases()
      setBillingLifecycleState('restore_succeeded')
      setBillingMessage('Restored App Store purchases.')
    } catch (error) {
      setBillingLifecycleState('restore_failed')
      setBillingError(
        error instanceof Error
          ? error.message
          : 'Unable to restore purchases right now.',
      )
    } finally {
      setBillingBusy(false)
    }
  }

  async function openBillingPortal() {
    if (!checkoutSessionId) {
      setBillingLifecycleState('failed')
      setBillingError(
        'No recent checkout session found. Complete checkout once to enable billing management.',
      )
      return
    }

    setBillingPortalBusy(true)
    setBillingLifecycleState('processing')
    setBillingError(null)
    setBillingMessage(null)
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkoutSessionId,
          returnPath: '/settings',
        }),
      })
      const payload = (await response.json()) as {
        portalUrl?: string
        error?: string
      }
      if (!response.ok || !payload.portalUrl) {
        throw new Error(
          payload.error || 'Unable to open billing management right now.',
        )
      }
      window.location.href = payload.portalUrl
    } catch (error) {
      setBillingLifecycleState('failed')
      setBillingError(
        error instanceof Error
          ? error.message
          : 'Unable to open billing management right now.',
      )
    } finally {
      setBillingPortalBusy(false)
    }
  }

  if (!hydrated) {
    return (
      <div className="mock-home min-h-screen">
        <main id="main-content" className="mock-paper min-h-screen">
          <EuangelionShellHeader />
          <div className="shell-content-pad mx-auto max-w-2xl">
            <h1 className="text-display vw-heading-lg mb-12">Settings</h1>
          </div>
          <SiteFooter />
        </main>
      </div>
    )
  }

  return (
    <div className="mock-home min-h-screen">
      <main id="main-content" className="mock-paper min-h-screen">
        <EuangelionShellHeader />
        <div className="shell-content-pad mx-auto max-w-2xl">
          <Breadcrumbs
            className="mb-7"
            items={[{ label: 'HOME', href: '/' }, { label: 'SETTINGS' }]}
          />
          <h1 className="text-display vw-heading-lg mb-12">Settings</h1>

          <div
            id="tutorial"
            className="mb-8 pb-8"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <h2 className="text-label vw-small mb-4 text-gold">
              WALKTHROUGH &amp; HELP
            </h2>
            <p className="vw-small mb-4 text-secondary">
              Replay onboarding or the guided Daily Bread walkthrough at any
              time.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/onboarding?force=1&redirect=%2Fsettings"
                className="mock-btn text-label"
              >
                REPLAY ONBOARDING
              </Link>
              <Link
                href="/daily-bread?tutorial=1"
                className="mock-btn text-label"
              >
                REPLAY TUTORIAL
              </Link>
              <Link
                href="/help#faq"
                className="text-label vw-small link-highlight"
              >
                Open Help FAQ
              </Link>
            </div>
          </div>

          {/* Theme */}
          <div
            className="mb-8 pb-8"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <h2 className="text-label vw-small mb-6 text-gold">APPEARANCE</h2>
            <div className="flex gap-4">
              {(['dark', 'light', 'system'] as Theme[]).map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => {
                    setTheme(t)
                    showSaved()
                  }}
                  aria-pressed={theme === t}
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

          <div
            className="mb-8 pb-8"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <h2 className="text-label vw-small mb-4 text-gold">
              ACCESSIBILITY
            </h2>
            <p className="vw-small mb-6 text-secondary">
              Accessibility preferences apply globally across the site.
            </p>

            <p className="text-label vw-small mb-3 text-gold">TEXT SIZE</p>
            <div className="mb-6 flex flex-wrap gap-3">
              {(['default', 'large', 'xlarge'] as TextScale[]).map((scale) => (
                <button
                  type="button"
                  key={scale}
                  onClick={() => {
                    setTextScale(scale)
                    showSaved()
                  }}
                  aria-pressed={textScale === scale}
                  className="px-6 py-3 text-label vw-small transition-theme"
                  style={{
                    backgroundColor:
                      textScale === scale
                        ? 'var(--color-fg)'
                        : 'var(--color-surface)',
                    color:
                      textScale === scale
                        ? 'var(--color-bg)'
                        : 'var(--color-text-secondary)',
                    border: `1px solid ${
                      textScale === scale
                        ? 'var(--color-fg)'
                        : 'var(--color-border)'
                    }`,
                  }}
                >
                  {scale === 'default'
                    ? 'Default'
                    : scale === 'large'
                      ? 'Large'
                      : 'Extra Large'}
                </button>
              ))}
            </div>

            <div className="grid gap-3">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={reduceMotion}
                  onChange={(event) => {
                    setReduceMotion(event.target.checked)
                    showSaved()
                  }}
                />
                <span className="vw-small text-secondary">Reduce motion</span>
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={highContrast}
                  onChange={(event) => {
                    setHighContrast(event.target.checked)
                    showSaved()
                  }}
                />
                <span className="vw-small text-secondary">
                  High contrast mode
                </span>
              </label>
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={readingComfort}
                  onChange={(event) => {
                    setReadingComfort(event.target.checked)
                    showSaved()
                  }}
                />
                <span className="vw-small text-secondary">
                  Reading comfort mode (more line-height and spacing)
                </span>
              </label>
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
                  type="button"
                  key={day}
                  onClick={() => {
                    setSabbathDay(day)
                    showSaved()
                  }}
                  aria-pressed={sabbathDay === day}
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

          {/* Brain + AI */}
          <div
            className="mb-8 pb-8"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <h2 className="text-label vw-small mb-4 text-gold">
              BRAIN ROUTING + AI
            </h2>
            <p className="vw-small mb-6 text-secondary">
              Choose your default brain, devotional depth profile, and optional
              BYO provider keys.
            </p>
            <div className="grid gap-6">
              <div className="grid gap-3">
                <p className="text-label vw-small text-gold">DEFAULT BRAIN</p>
                <div className="flex flex-wrap gap-3">
                  {[
                    { label: 'Auto (Claude-first)', value: 'auto' },
                    { label: 'Claude/OpenAI', value: 'openai' },
                    { label: 'Google', value: 'google' },
                    { label: 'MiniMax', value: 'minimax' },
                    { label: 'NVIDIA Kimi', value: 'nvidia_kimi' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setDefaultBrainMode(option.value as BrainMode)
                        showSaved()
                      }}
                      aria-pressed={defaultBrainMode === option.value}
                      className="px-4 py-2 text-label vw-small"
                      style={{
                        border: `1px solid ${
                          defaultBrainMode === option.value
                            ? 'var(--color-border-strong)'
                            : 'var(--color-border)'
                        }`,
                        background:
                          defaultBrainMode === option.value
                            ? 'var(--color-active)'
                            : 'var(--color-surface)',
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3">
                <p className="text-label vw-small text-gold">
                  DEVOTIONAL DEPTH
                </p>
                <div className="flex flex-wrap gap-3">
                  {[
                    { label: '5-7 min', value: 'short_5_7' },
                    { label: '20-30 min', value: 'medium_20_30' },
                    { label: '45-60 min', value: 'long_45_60' },
                    { label: 'Variable', value: 'variable' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setDevotionalDepthPreference(
                          option.value as
                            | 'short_5_7'
                            | 'medium_20_30'
                            | 'long_45_60'
                            | 'variable',
                        )
                        showSaved()
                      }}
                      aria-pressed={devotionalDepthPreference === option.value}
                      className="px-4 py-2 text-label vw-small"
                      style={{
                        border: `1px solid ${
                          devotionalDepthPreference === option.value
                            ? 'var(--color-border-strong)'
                            : 'var(--color-border)'
                        }`,
                        background:
                          devotionalDepthPreference === option.value
                            ? 'var(--color-active)'
                            : 'var(--color-surface)',
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={openWebDefaultEnabled}
                  onChange={(event) => {
                    setOpenWebDefaultEnabled(event.target.checked)
                    showSaved()
                  }}
                />
                <span className="vw-small text-secondary">
                  Open Web mode default (still requires explicit per-query
                  acknowledgement in chat).
                </span>
              </label>

              <div className="grid gap-4">
                <p className="text-label vw-small text-gold">BYO KEYS</p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setKeyStorageMode('session_only')
                      showSaved()
                    }}
                    aria-pressed={keyStorageMode === 'session_only'}
                    className="px-4 py-2 text-label vw-small"
                    style={{
                      border: `1px solid ${
                        keyStorageMode === 'session_only'
                          ? 'var(--color-border-strong)'
                          : 'var(--color-border)'
                      }`,
                      background:
                        keyStorageMode === 'session_only'
                          ? 'var(--color-active)'
                          : 'var(--color-surface)',
                    }}
                  >
                    Session only
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setKeyStorageMode('remember_encrypted')
                      showSaved()
                    }}
                    aria-pressed={keyStorageMode === 'remember_encrypted'}
                    className="px-4 py-2 text-label vw-small"
                    style={{
                      border: `1px solid ${
                        keyStorageMode === 'remember_encrypted'
                          ? 'var(--color-border-strong)'
                          : 'var(--color-border)'
                      }`,
                      background:
                        keyStorageMode === 'remember_encrypted'
                          ? 'var(--color-active)'
                          : 'var(--color-surface)',
                    }}
                  >
                    Remember encrypted
                  </button>
                </div>
                <input
                  type="password"
                  value={openaiApiKey || anthropicApiKey}
                  onChange={(event) => {
                    setOpenaiApiKey(event.target.value)
                    setAnthropicApiKey(event.target.value)
                    showSaved()
                  }}
                  placeholder="OpenAI key"
                  className="w-full max-w-md bg-surface-raised px-6 py-3 vw-body text-[var(--color-text-primary)] placeholder:text-muted focus:outline-none"
                  style={{ border: '1px solid var(--color-border)' }}
                  autoComplete="off"
                />
                <input
                  type="password"
                  value={googleApiKey}
                  onChange={(event) => {
                    setGoogleApiKey(event.target.value)
                    showSaved()
                  }}
                  placeholder="Google key"
                  className="w-full max-w-md bg-surface-raised px-6 py-3 vw-body text-[var(--color-text-primary)] placeholder:text-muted focus:outline-none"
                  style={{ border: '1px solid var(--color-border)' }}
                  autoComplete="off"
                />
                <input
                  type="password"
                  value={minimaxApiKey}
                  onChange={(event) => {
                    setMinimaxApiKey(event.target.value)
                    showSaved()
                  }}
                  placeholder="MiniMax key"
                  className="w-full max-w-md bg-surface-raised px-6 py-3 vw-body text-[var(--color-text-primary)] placeholder:text-muted focus:outline-none"
                  style={{ border: '1px solid var(--color-border)' }}
                  autoComplete="off"
                />
                <input
                  type="password"
                  value={nvidiaKimiApiKey}
                  onChange={(event) => {
                    setNvidiaKimiApiKey(event.target.value)
                    showSaved()
                  }}
                  placeholder="NVIDIA Kimi key"
                  className="w-full max-w-md bg-surface-raised px-6 py-3 vw-body text-[var(--color-text-primary)] placeholder:text-muted focus:outline-none"
                  style={{ border: '1px solid var(--color-border)' }}
                  autoComplete="off"
                />
                <p className="vw-small text-muted">
                  {keyStorageMode === 'session_only'
                    ? 'Keys stay in-memory for this browser session and are not persisted.'
                    : 'Keys are encrypted before local persistence on this device.'}
                </p>
                <p className="vw-small text-muted">
                  Client-side encryption protects storage at rest, but does not
                  mitigate active XSS inside the browser runtime.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    clearProviderKeys()
                    showSaved()
                  }}
                  className="w-fit border px-4 py-2 text-label vw-small"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  Clear all provider keys
                </button>
              </div>

              <Link
                href="/usage"
                className="text-label vw-small link-highlight"
              >
                View usage + quota details
              </Link>
            </div>
          </div>

          {/* Privacy + Mock Account */}
          <div
            className="mb-8 pb-8"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <h2 className="text-label vw-small mb-4 text-gold">
              PRIVACY + DATA
            </h2>
            <p className="vw-small mb-6 text-secondary">
              Anonymous mode is default. Switch to mock account mode to enable
              full save features and export.
            </p>
            <div className="flex flex-wrap gap-4">
              {(['anonymous', 'mock_account'] as MockMode[]).map((mode) => (
                <button
                  type="button"
                  key={mode}
                  onClick={() =>
                    void savePrivacySession({
                      mode,
                      analyticsOptIn: privacyAnalyticsOptIn,
                    })
                  }
                  disabled={privacyBusy || privacyExportBusy}
                  aria-pressed={privacyMode === mode}
                  className="px-6 py-3 text-label vw-small transition-theme disabled:opacity-40"
                  style={{
                    backgroundColor:
                      privacyMode === mode
                        ? 'var(--color-fg)'
                        : 'var(--color-surface)',
                    color:
                      privacyMode === mode
                        ? 'var(--color-bg)'
                        : 'var(--color-text-secondary)',
                    border: `1px solid ${
                      privacyMode === mode
                        ? 'var(--color-fg)'
                        : 'var(--color-border)'
                    }`,
                  }}
                >
                  {mode === 'anonymous'
                    ? 'Anonymous (Default)'
                    : 'Mock Account'}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={privacyAnalyticsOptIn}
                  onChange={(event) => {
                    const next = event.target.checked
                    setPrivacyAnalyticsOptIn(next)
                    void savePrivacySession({
                      mode: privacyMode,
                      analyticsOptIn: next,
                    })
                  }}
                  disabled={privacyBusy || privacyExportBusy}
                />
                <span className="vw-small text-secondary">
                  Optional analytics opt-in (default OFF). Required for
                  mock-account export.
                </span>
              </label>
            </div>

            <div className="mt-5">
              <p className="text-label vw-small mb-2 text-gold">CAPABILITIES</p>
              <p className="vw-small text-secondary">
                {privacyCapabilities.length > 0
                  ? privacyCapabilities.join(', ')
                  : 'bookmarks, resume'}
              </p>
            </div>

            <div className="mt-5 grid gap-2">
              <p className="text-label vw-small text-gold">RETENTION</p>
              {Object.entries(privacyRetentionSummary).map(([key, value]) => (
                <p key={key} className="vw-small text-muted">
                  {value}
                </p>
              ))}
              {privacyRetention && (
                <p className="vw-small text-muted">
                  Anonymous session: {privacyRetention.anonymousSessionDays}{' '}
                  days. Trash restore window:{' '}
                  {privacyRetention.trashRestoreWindowDays} days.
                </p>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => void exportMockAccountData()}
                disabled={
                  privacyExportBusy ||
                  privacyBusy ||
                  privacyMode !== 'mock_account'
                }
                className="px-6 py-3 text-label vw-small transition-theme disabled:opacity-30"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {privacyExportBusy
                  ? 'Exporting...'
                  : 'Export Mock Account Data'}
              </button>
              {privacyMode !== 'mock_account' && (
                <p className="vw-small text-muted">
                  Switch to mock account mode to enable export.
                </p>
              )}
            </div>

            {privacyError && (
              <p
                className="vw-small mt-4"
                style={{ color: 'var(--color-error)' }}
                aria-live="assertive"
              >
                {privacyError}
              </p>
            )}
            {privacyMessage && (
              <p className="vw-small mt-4 text-gold" aria-live="polite">
                {privacyMessage}
              </p>
            )}
          </div>

          {/* Testing / Release toggles */}
          <div
            className="mb-8 pb-8"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <h2 className="text-label vw-small mb-4 text-gold">
              TESTING TOGGLES
            </h2>
            <p className="vw-small mb-6 text-secondary">
              Day locking can be disabled during QA so all days render
              immediately. Re-enable before launch if you want cadence gating.
            </p>
            <button
              type="button"
              onClick={() => {
                setDayLockingEnabled(!dayLockingEnabled)
                showSaved()
              }}
              aria-pressed={dayLockingEnabled}
              className="text-label vw-small px-6 py-3 transition-theme"
              style={{
                backgroundColor: dayLockingEnabled
                  ? 'var(--color-fg)'
                  : 'var(--color-surface)',
                color: dayLockingEnabled
                  ? 'var(--color-bg)'
                  : 'var(--color-text-secondary)',
                border: `1px solid ${
                  dayLockingEnabled ? 'var(--color-fg)' : 'var(--color-border)'
                }`,
              }}
            >
              Day Locking: {dayLockingEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Billing */}
          <div
            className="mb-8 pb-8"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <h2 className="text-label vw-small mb-4 text-gold">BILLING</h2>
            <p className="vw-small mb-6 text-secondary">
              {billingPlatform === 'ios'
                ? 'iOS uses App Store In-App Purchase for digital subscriptions.'
                : 'Web uses secure Stripe checkout for subscriptions.'}
            </p>

            {billingDisabledReason && (
              <p className="vw-small mb-4 text-muted">
                {billingDisabledReason}
              </p>
            )}

            <div className="grid gap-4">
              {(billingConfig?.plans || []).map((plan) => (
                <div
                  key={plan.id}
                  className="bg-surface-raised p-5"
                  style={{ border: '1px solid var(--color-border)' }}
                >
                  <p className="text-label vw-small mb-2 text-gold">
                    {plan.name}
                  </p>
                  <p className="vw-body mb-2 text-[var(--color-text-primary)]">
                    {plan.priceLabel}
                  </p>
                  <p className="vw-small mb-4 text-secondary">
                    {plan.description}
                  </p>
                  <button
                    type="button"
                    disabled={
                      billingBusy ||
                      billingPortalBusy ||
                      !billingConfig ||
                      !billingEnabled
                    }
                    aria-busy={billingBusy || billingPortalBusy}
                    onClick={() =>
                      billingPlatform === 'ios'
                        ? void startIosPurchase(plan)
                        : void startWebCheckout(plan)
                    }
                    className="cta-major text-label vw-small px-5 py-2 disabled:opacity-40"
                  >
                    {billingPlatform === 'ios'
                      ? 'Subscribe in App Store'
                      : 'Subscribe on Web'}
                  </button>
                </div>
              ))}
            </div>

            {billingPlatform === 'web' &&
              billingConfig?.supportsBillingPortal &&
              checkoutSessionId && (
                <button
                  type="button"
                  className="text-label vw-small mt-4 border border-[var(--color-border)] px-4 py-2 disabled:opacity-40"
                  disabled={billingBusy || billingPortalBusy}
                  onClick={() => void openBillingPortal()}
                  aria-busy={billingPortalBusy}
                >
                  {billingPortalBusy
                    ? 'Opening Billing Management...'
                    : 'Manage Subscription'}
                </button>
              )}

            {billingPlatform === 'ios' && (
              <button
                type="button"
                disabled={billingBusy || billingPortalBusy}
                onClick={() => void restorePurchasesAction()}
                className="text-label vw-small mt-4 border border-[var(--color-border)] px-4 py-2 disabled:opacity-40"
              >
                Restore Purchases
              </button>
            )}

            {!billingMessage && !billingError && billingLifecycleCopy && (
              <p
                className="vw-small mt-4"
                style={
                  billingLifecycleTone === 'success'
                    ? { color: 'var(--color-gold)' }
                    : billingLifecycleTone === 'pending'
                      ? { color: 'var(--color-text-muted)' }
                      : { color: 'var(--color-error)' }
                }
                role="status"
                aria-live="polite"
              >
                {billingLifecycleCopy}
              </p>
            )}

            {billingError && (
              <p
                className="vw-small mt-4"
                style={{ color: 'var(--color-error)' }}
                aria-live="assertive"
              >
                {billingError}
              </p>
            )}
            {billingMessage && (
              <p className="vw-small mt-4 text-gold" aria-live="polite">
                {billingMessage}
              </p>
            )}
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
                type="button"
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
                type="button"
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
            <p className="vw-small text-gold">
              Preferences saved automatically.
            </p>
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
        </div>
        <SiteFooter />
      </main>
    </div>
  )
}
