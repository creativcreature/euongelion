'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
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
  resolveBillingFlash,
  sanitizeCheckoutSessionId,
} from '@/lib/billing/flash'
import type { BillingConfigResponse, BillingPlan } from '@/types/billing'

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
    dayLockingEnabled,
    setBibleTranslation,
    setSabbathDay,
    setAnthropicApiKey,
    setDayLockingEnabled,
  } = useSettingsStore()
  const { messages, clearHistory } = useChatStore()
  const [billingConfig, setBillingConfig] =
    useState<BillingConfigResponse | null>(null)
  const [billingPlatform, setBillingPlatform] = useState<'ios' | 'web'>('web')
  const [billingBusy, setBillingBusy] = useState(false)
  const [billingPortalBusy, setBillingPortalBusy] = useState(false)
  const [billingError, setBillingError] = useState<string | null>(null)
  const [billingMessage, setBillingMessage] = useState<string | null>(null)
  const [checkoutSessionId, setCheckoutSessionId] = useState<string | null>(
    null,
  )

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

  // Show saved confirmation
  const [saved, setSaved] = useState(false)
  function showSaved() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
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
        const checkoutStatus = params.get('billing')
        const parsedSessionId = sanitizeCheckoutSessionId(
          params.get('session_id'),
        )
        if (parsedSessionId) {
          setCheckoutSessionId(parsedSessionId)
        }

        const flash = resolveBillingFlash({
          billingStatus: checkoutStatus,
          platform,
        })
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
        setBillingError('Unable to load billing settings right now.')
      }
    }
    void loadBilling()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!hydrated || typeof document === 'undefined') return
    document.cookie = serializeDayLockingCookie(dayLockingEnabled)
  }, [dayLockingEnabled, hydrated])

  async function startWebCheckout(plan: BillingPlan) {
    setBillingBusy(true)
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
      setBillingError(
        error instanceof Error ? error.message : 'Unable to start checkout.',
      )
    } finally {
      setBillingBusy(false)
    }
  }

  async function startIosPurchase(plan: BillingPlan) {
    setBillingBusy(true)
    setBillingError(null)
    setBillingMessage(null)
    try {
      await purchasePlanOnIos(plan.id)
      setBillingMessage('Purchase complete. Premium access is now active.')
    } catch (error) {
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
    setBillingError(null)
    setBillingMessage(null)
    try {
      await restoreIosPurchases()
      setBillingMessage('Restored App Store purchases.')
    } catch (error) {
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
      setBillingError(
        'No recent checkout session found. Complete checkout once to enable billing management.',
      )
      return
    }

    setBillingPortalBusy(true)
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
      <div className="newspaper-home min-h-screen">
        <EuangelionShellHeader />
        <main id="main-content" className="shell-content-pad mx-auto max-w-2xl">
          <h1 className="text-display vw-heading-lg mb-12">Settings</h1>
        </main>
      </div>
    )
  }

  return (
    <div className="newspaper-home min-h-screen">
      <EuangelionShellHeader />

      <main id="main-content" className="shell-content-pad mx-auto max-w-2xl">
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
            Replay the guided Daily Bread walkthrough at any time.
          </p>
          <div className="flex flex-wrap items-center gap-4">
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
            <p className="vw-small mb-4 text-muted">{billingDisabledReason}</p>
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
      <SiteFooter />
    </div>
  )
}
