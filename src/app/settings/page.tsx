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
import SiteBottom from '@/components/SiteBottom'
import PresenceWeekRow from '@/components/PresenceWeekRow'
import ReminderScheduler from '@/components/settings/ReminderScheduler'
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
import { formatLongDate } from '@/lib/billing/paywall-state'
import { usePendingGenerationStore } from '@/stores/pendingGenerationStore'
import BillingReturnRoom from '@/components/billing/BillingReturnRoom'
import type {
  BillingConfigResponse,
  BillingEntitlementsResponse,
  BillingPlan,
} from '@/types/billing'
import {
  BIBLE_TRANSLATION_CODES,
  BIBLE_TRANSLATIONS,
  type BibleTranslationCode,
} from '@/lib/bible'
import { retentionClarityRows } from '@/lib/privacy/retention'

type Theme = 'dark' | 'light' | 'system'
type BibleTranslation = BibleTranslationCode
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

const emptySubscribe = () => () => {}

function useHydrated() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )
}

/**
 * F-073 — grouped settings card. Cards flow single-column on mobile and into
 * a two-column masonry (CSS columns) on desktop; `break-inside-avoid` keeps
 * each card whole.
 */
function SettingsCard({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      aria-label={title}
      className="mb-6 break-inside-avoid p-6 sm:p-7"
      style={{
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
      }}
    >
      <h2 className="text-label vw-small mb-6 text-gold">{title}</h2>
      {children}
    </section>
  )
}

/** A sub-block inside a card, ruled off from the block above it. */
function CardSection({
  first = false,
  id,
  children,
}: {
  first?: boolean
  id?: string
  children: React.ReactNode
}) {
  return (
    <div
      id={id}
      className={first ? undefined : 'mt-7 pt-7'}
      style={first ? undefined : { borderTop: '1px solid var(--color-border)' }}
    >
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const { theme, setTheme } = useUIStore()
  const {
    bibleTranslation,
    defaultBrainMode,
    openWebDefaultEnabled,
    devotionalDepthPreference,
    keyStorageMode,
    anthropicApiKey,
    openaiApiKey,
    dayLockingEnabled,
    textScale,
    reduceMotion,
    highContrast,
    readingComfort,
    setBibleTranslation,
    setDefaultBrainMode,
    setOpenWebDefaultEnabled,
    setDevotionalDepthPreference,
    setKeyStorageMode,
    hydrateRememberedProviderKeys,
    clearProviderKeys,
    setAnthropicApiKey,
    setOpenaiApiKey,
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
  // Phase 1c — checkout return room (pattern doc §2): success/cancelled
  // returns from Stripe land here and get the designed experience.
  const [billingReturnRoom, setBillingReturnRoom] = useState<{
    status: 'success' | 'cancelled'
    sessionId: string | null
  } | null>(null)
  // Phase 1c — Account subscription row, read from entitlements.
  const [subscriptionPhase, setSubscriptionPhase] = useState<
    'loading' | 'ready' | 'error'
  >('loading')
  const [subscriptionEntitlements, setSubscriptionEntitlements] = useState<
    BillingEntitlementsResponse['entitlements'] | null
  >(null)
  const [privacyMode, setPrivacyMode] = useState<MockMode>('anonymous')
  const [privacyAnalyticsOptIn, setPrivacyAnalyticsOptIn] = useState(false)
  const [privacyRetention, setPrivacyRetention] =
    useState<MockRetention | null>(null)
  const [privacyRetentionSummary, setPrivacyRetentionSummary] = useState<
    Record<string, string>
  >({})
  const [privacyBusy, setPrivacyBusy] = useState(false)
  const [privacyMessage, setPrivacyMessage] = useState<string | null>(null)
  const [privacyError, setPrivacyError] = useState<string | null>(null)
  // Account-data section: real signed-in user export + delete (Phase 7
  // privacy hardening). Distinct from the mock-account export above.
  const [accountEmail, setAccountEmail] = useState<string | null>(null)
  const [accountAuthed, setAccountAuthed] = useState(false)
  const [accountChecked, setAccountChecked] = useState(false)
  const [accountExportBusy, setAccountExportBusy] = useState(false)
  const [accountDeleteOpen, setAccountDeleteOpen] = useState(false)
  const [accountDeleteConfirm, setAccountDeleteConfirm] = useState('')
  const [accountDeleteEmail, setAccountDeleteEmail] = useState('')
  const [accountDeleteBusy, setAccountDeleteBusy] = useState(false)
  const [accountDeleteError, setAccountDeleteError] = useState<string | null>(
    null,
  )
  const [accountDeleteMessage, setAccountDeleteMessage] = useState<
    string | null
  >(null)
  const [signOutBusy, setSignOutBusy] = useState(false)
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const brainSyncTimerRef = useRef<number | null>(null)

  const hydrated = useHydrated()

  const billingEnabled = useMemo(() => {
    if (!billingConfig) return false
    return billingPlatform === 'ios'
      ? billingConfig.paymentsEnabled.iosIap
      : billingConfig.paymentsEnabled.webStripe
  }, [billingConfig, billingPlatform])

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

  // The billing block only appears when there is something real to act on:
  // live checkout (billingEnabled), a returning checkout session to manage,
  // or lifecycle feedback from a checkout the reader just completed. No
  // "coming soon" placeholder is rendered — F-073.
  const billingBlockVisible =
    billingEnabled ||
    Boolean(checkoutSessionId) ||
    Boolean(billingMessage) ||
    Boolean(billingError) ||
    Boolean(billingLifecycleCopy)

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

  // Phase 1c — Account subscription row. Honest states only: loading,
  // the real entitlement snapshot, or an error with a retry action.
  async function loadSubscriptionEntitlements() {
    setSubscriptionPhase('loading')
    try {
      const response = await fetch('/api/billing/entitlements', {
        cache: 'no-store',
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error(`Entitlements returned ${response.status}`)
      }
      const payload = (await response.json()) as BillingEntitlementsResponse
      if (!payload.ok) {
        throw new Error('Entitlements response incomplete.')
      }
      setSubscriptionEntitlements(payload.entitlements)
      setSubscriptionPhase('ready')
    } catch {
      setSubscriptionPhase('error')
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

  // Phase 7 — real signed-in user data export. Hits
  // /api/user/data-export which streams a JSON download.
  async function exportSignedInAccountData() {
    setAccountExportBusy(true)
    setAccountDeleteError(null)
    setAccountDeleteMessage(null)
    try {
      const response = await fetch('/api/user/data-export', {
        cache: 'no-store',
        credentials: 'include',
      })
      if (!response.ok) {
        const payload = await response
          .json()
          .catch(() => ({ error: `Server returned ${response.status}` }))
        throw new Error(
          (payload as { error?: string }).error ||
            'Unable to export your data.',
        )
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `euangelion-data-export-${new Date()
        .toISOString()
        .slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setAccountDeleteMessage('Data export downloaded.')
    } catch (error) {
      setAccountDeleteError(
        error instanceof Error ? error.message : 'Unable to export your data.',
      )
    } finally {
      setAccountExportBusy(false)
    }
  }

  // Phase 7 — real signed-in user account deletion. Requires the
  // exact phrase "DELETE MY ACCOUNT" + the user's own email.
  async function confirmDeleteAccount() {
    setAccountDeleteBusy(true)
    setAccountDeleteError(null)
    setAccountDeleteMessage(null)
    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirm: accountDeleteConfirm.trim(),
          userEmail: accountDeleteEmail.trim().toLowerCase(),
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(
          (payload as { error?: string }).error ||
            'Account deletion failed. Please try again.',
        )
      }
      setAccountDeleteMessage(
        'Account deleted. Signing out — you will be redirected to the home page.',
      )
      // Refresh to clear any client state and pick up the cleared session.
      window.setTimeout(() => {
        window.location.assign('/')
      }, 1500)
    } catch (error) {
      setAccountDeleteError(
        error instanceof Error
          ? error.message
          : 'Account deletion failed. Please try again.',
      )
    } finally {
      setAccountDeleteBusy(false)
    }
  }

  async function signOut() {
    setSignOutBusy(true)
    setSignOutError(null)
    try {
      const response = await fetch('/api/auth/sign-out', {
        method: 'POST',
        credentials: 'include',
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(
          (payload as { error?: string }).error || 'Unable to sign out.',
        )
      }
      window.location.assign('/')
    } catch (error) {
      setSignOutError(
        error instanceof Error ? error.message : 'Unable to sign out.',
      )
      setSignOutBusy(false)
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

        const stripBillingParams = () => {
          params.delete('billing')
          params.delete('session_id')
          const nextSearch = params.toString()
          const nextUrl = `${window.location.pathname}${
            nextSearch ? `?${nextSearch}` : ''
          }${window.location.hash}`
          window.history.replaceState({}, '', nextUrl)
        }

        // Phase 1c (pattern doc §2): success + cancelled checkout returns
        // get the designed return room — pending → success → resume, or
        // the honest "No charge was made" state — never a flash banner.
        if (checkoutStatus === 'success' && parsedSessionId) {
          setCheckoutSessionId(parsedSessionId)
          // Remember the session for the management page's portal access.
          usePendingGenerationStore
            .getState()
            .setLastCheckoutSessionId(parsedSessionId)
          setBillingReturnRoom({
            status: 'success',
            sessionId: parsedSessionId,
          })
          stripBillingParams()
          return
        }
        if (checkoutStatus === 'cancelled' || checkoutStatus === 'canceled') {
          setBillingReturnRoom({ status: 'cancelled', sessionId: null })
          stripBillingParams()
          return
        }

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
          stripBillingParams()
        }
      } catch {
        if (!mounted) return
        setBillingLifecycleState('failed')
        setBillingError('Unable to load billing settings right now.')
      }
    }
    void loadBilling()
    void loadPrivacySession()
    void loadSubscriptionEntitlements()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!hydrated || typeof document === 'undefined') return
    document.cookie = serializeDayLockingCookie(dayLockingEnabled)
  }, [dayLockingEnabled, hydrated])

  // Profile header + account card: hydrate auth state from /api/auth/session
  // so we know whether to surface the signed-in identity, sign-out, and the
  // data-export / delete-account controls. Cancellation-safe.
  useEffect(() => {
    if (!hydrated) return
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/auth/session', {
          credentials: 'include',
        })
        if (!res.ok) return
        const data = (await res.json()) as {
          authenticated?: boolean
          user?: { email?: string | null } | null
        }
        if (cancelled) return
        setAccountAuthed(Boolean(data.authenticated))
        setAccountEmail(data.user?.email ?? null)
      } catch {
        // Silent — UI degrades to the anonymous invitation.
      } finally {
        if (!cancelled) setAccountChecked(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hydrated])

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
          <div className="shell-content-pad mx-auto w-full max-w-6xl">
            <h1 className="text-display vw-heading-lg mb-12">Settings</h1>
          </div>
          <SiteBottom />
        </main>
      </div>
    )
  }

  // Phase 1c — the checkout return leg takes over the page for its beat:
  // pending → success room (resume CTA) or the honest cancelled state.
  // The paywall is never re-shown in this window.
  if (billingReturnRoom) {
    return (
      <div className="mock-home min-h-screen">
        <main id="main-content" className="mock-paper min-h-screen">
          <EuangelionShellHeader />
          <div className="shell-content-pad mx-auto w-full max-w-6xl">
            <BillingReturnRoom
              status={billingReturnRoom.status}
              sessionId={billingReturnRoom.sessionId}
              onClose={() => {
                setBillingReturnRoom(null)
                void loadSubscriptionEntitlements()
              }}
            />
          </div>
          <SiteBottom />
        </main>
      </div>
    )
  }

  const avatarInitial = accountAuthed
    ? (accountEmail?.trim().charAt(0).toUpperCase() ?? '—')
    : '—'

  // Phase 1c — subscription row label, from the real entitlement snapshot.
  const subscriptionRenewDate = formatLongDate(
    subscriptionEntitlements?.subscriptionRenewsAt ?? null,
  )
  const subscriptionExpireDate = formatLongDate(
    subscriptionEntitlements?.premiumExpiresAt ?? null,
  )
  const subscriptionRowLabel = subscriptionEntitlements?.premiumActive
    ? subscriptionRenewDate
      ? `Euangelion+ · renews ${subscriptionRenewDate}`
      : subscriptionExpireDate
        ? `Euangelion+ · access through ${subscriptionExpireDate}`
        : 'Euangelion+ · active'
    : 'Free — the full library, always.'

  const selectedButtonStyle = (active: boolean) => ({
    backgroundColor: active ? 'var(--color-fg)' : 'var(--color-surface)',
    color: active ? 'var(--color-bg)' : 'var(--color-text-secondary)',
    border: `1px solid ${active ? 'var(--color-fg)' : 'var(--color-border)'}`,
  })

  const quietPillStyle = (active: boolean) => ({
    border: `1px solid ${
      active ? 'var(--color-border-strong)' : 'var(--color-border)'
    }`,
    background: active ? 'var(--color-active)' : 'var(--color-surface)',
  })

  return (
    <div className="mock-home min-h-screen">
      <main id="main-content" className="mock-paper min-h-screen">
        <EuangelionShellHeader />
        <div className="shell-content-pad mx-auto w-full max-w-6xl">
          <Breadcrumbs
            className="mb-7"
            items={[{ label: 'HOME', href: '/' }, { label: 'SETTINGS' }]}
          />
          <h1 className="text-display vw-heading-lg mb-10">Settings</h1>

          {/* ------------------------------------------------------------ */}
          {/* Profile header — quiet identity, no gamification (F-073)      */}
          {/* ------------------------------------------------------------ */}
          <section
            aria-label="Profile"
            className="mb-8 flex flex-wrap items-center gap-5 p-6 sm:p-7"
            style={{
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
            }}
          >
            <div
              aria-hidden="true"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full"
              style={{
                border: '1px solid var(--color-border-strong)',
                backgroundColor: 'var(--color-active)',
              }}
            >
              <span
                className="text-display"
                style={{ fontSize: '1.4rem', lineHeight: 1 }}
              >
                {avatarInitial}
              </span>
            </div>
            {!accountChecked ? (
              <p className="vw-small text-muted">Checking your session…</p>
            ) : accountAuthed ? (
              <div className="min-w-0">
                <p className="vw-body truncate text-[var(--color-text-primary)]">
                  {accountEmail}
                </p>
                <p className="vw-small text-muted">Signed in</p>
              </div>
            ) : (
              <div className="min-w-0">
                <p className="vw-body text-[var(--color-text-primary)]">
                  Reading anonymously
                </p>
                <p className="vw-small text-secondary">
                  <Link href="/auth/sign-in" className="link-highlight">
                    Sign in
                  </Link>{' '}
                  to keep your library across devices.
                </p>
              </div>
            )}
            {/* F-066 (SA-025): gentle presence — days you showed up this
                week, quietly lit. No counts, no streaks, no red. */}
            <PresenceWeekRow className="w-full sm:ml-auto sm:w-auto" />
          </section>

          {/* ------------------------------------------------------------ */}
          {/* Grouped cards — single column on mobile, two on desktop        */}
          {/* ------------------------------------------------------------ */}
          <div className="lg:columns-2 lg:gap-6">
            {/* READING ------------------------------------------------- */}
            <SettingsCard id="account" title="ACCOUNT">
              <CardSection first>
                {!accountChecked ? (
                  <p className="vw-small text-muted">Checking your session…</p>
                ) : accountAuthed ? (
                  <>
                    <p className="vw-small mb-1 text-secondary">Signed in as</p>
                    <p className="vw-body mb-5 break-all text-[var(--color-text-primary)]">
                      {accountEmail}
                    </p>
                    <button
                      type="button"
                      onClick={() => void signOut()}
                      disabled={signOutBusy}
                      aria-busy={signOutBusy}
                      className="px-6 py-3 text-label vw-small transition-theme disabled:opacity-40"
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {signOutBusy ? 'Signing out…' : 'Sign out'}
                    </button>
                    {signOutError && (
                      <p
                        className="vw-small mt-4"
                        style={{ color: 'var(--color-error)' }}
                        aria-live="assertive"
                      >
                        {signOutError}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="vw-small mb-5 text-secondary">
                      You&rsquo;re reading anonymously. Your bookmarks and
                      progress live in this browser — sign in to keep them
                      across devices.
                    </p>
                    <Link href="/auth/sign-in" className="mock-btn text-label">
                      SIGN IN
                    </Link>
                  </>
                )}
              </CardSection>

              {/* Phase 1c — subscription row (pattern doc §2): status
                  inline from entitlements, detail on its own page. */}
              <CardSection>
                <h3 className="text-label vw-small mb-4 text-gold">
                  SUBSCRIPTION
                </h3>
                {subscriptionPhase === 'loading' ? (
                  <p className="vw-small text-muted">Checking subscription…</p>
                ) : subscriptionPhase === 'error' ? (
                  <div>
                    <p className="vw-small mb-3 text-secondary" role="alert">
                      Couldn&rsquo;t load your subscription status.
                    </p>
                    <button
                      type="button"
                      className="min-h-[44px] px-4 py-2 text-label vw-small"
                      style={{
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-surface)',
                        color: 'var(--color-text-secondary)',
                      }}
                      onClick={() => void loadSubscriptionEntitlements()}
                    >
                      Try again
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/settings/subscription"
                    className="flex min-h-[44px] items-center justify-between gap-4 px-4 py-3 transition-theme"
                    style={{
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                    }}
                  >
                    <span className="min-w-0">
                      <span className="vw-body block truncate text-[var(--color-text-primary)]">
                        {subscriptionRowLabel}
                      </span>
                      <span className="vw-small text-muted">
                        {subscriptionEntitlements?.premiumActive
                          ? 'Manage plan, payment, cancellation'
                          : 'Plans, and what stays free forever'}
                      </span>
                    </span>
                    <span aria-hidden="true" className="text-secondary">
                      →
                    </span>
                  </Link>
                )}
              </CardSection>

              {billingBlockVisible && (
                <CardSection>
                  <h3 className="text-label vw-small mb-4 text-gold">
                    BILLING
                  </h3>
                  {billingEnabled && (
                    <>
                      <p className="vw-small mb-6 text-secondary">
                        {billingPlatform === 'ios'
                          ? 'iOS uses App Store In-App Purchase for digital subscriptions.'
                          : 'Web uses secure Stripe checkout for subscriptions.'}
                      </p>
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
                              disabled={billingBusy || billingPortalBusy}
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
                    </>
                  )}

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

                  {billingPlatform === 'ios' && billingEnabled && (
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
                </CardSection>
              )}
            </SettingsCard>

            <SettingsCard id="reading" title="READING">
              <CardSection first>
                <h3 className="text-label vw-small mb-4 text-gold">
                  APPEARANCE
                </h3>
                <div className="flex flex-wrap gap-4">
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
                      style={selectedButtonStyle(theme === t)}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
                <p className="vw-small mt-4 text-muted">
                  Named reading themes — Ink, Parchment, Vellum, Night — live in
                  the reader itself: open any reading and tap Aa.
                </p>
              </CardSection>

              <CardSection>
                <h3 className="text-label vw-small mb-4 text-gold">
                  TEXT SIZE &amp; COMFORT
                </h3>
                <p className="vw-small mb-5 text-secondary">
                  These preferences apply globally across the site.
                </p>
                <div className="mb-6 flex flex-wrap gap-3">
                  {(['default', 'large', 'xlarge'] as TextScale[]).map(
                    (scale) => (
                      <button
                        type="button"
                        key={scale}
                        onClick={() => {
                          setTextScale(scale)
                          showSaved()
                        }}
                        aria-pressed={textScale === scale}
                        className="px-6 py-3 text-label vw-small transition-theme"
                        style={selectedButtonStyle(textScale === scale)}
                      >
                        {scale === 'default'
                          ? 'Default'
                          : scale === 'large'
                            ? 'Large'
                            : 'Extra Large'}
                      </button>
                    ),
                  )}
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
                    <span className="vw-small text-secondary">
                      Reduce motion
                    </span>
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
              </CardSection>

              <CardSection>
                <h3 className="text-label vw-small mb-4 text-gold">
                  BIBLE TRANSLATION
                </h3>
                <p className="vw-small mb-2 text-secondary">
                  Your preferred translation for Scripture in generated
                  readings. All seven options are public domain or
                  CC0-dedicated.
                </p>
                <p className="vw-small mb-6 text-muted">
                  See{' '}
                  <Link
                    href="/credits"
                    className="underline decoration-dotted underline-offset-2"
                  >
                    Credits &amp; Translations
                  </Link>{' '}
                  for full attribution.
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
                  aria-label="Default Bible translation"
                >
                  {BIBLE_TRANSLATION_CODES.map((code) => {
                    const meta = BIBLE_TRANSLATIONS[code]
                    return (
                      <option key={code} value={code}>
                        {meta.short} ({meta.name}) · {meta.licenseShort}
                      </option>
                    )
                  })}
                </select>
              </CardSection>

              <CardSection>
                <h3 className="text-label vw-small mb-4 text-gold">
                  DEVOTIONAL DEPTH
                </h3>
                <p className="vw-small mb-5 text-secondary">
                  How long a generated day of reading should run.
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
                      style={quietPillStyle(
                        devotionalDepthPreference === option.value,
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </CardSection>
            </SettingsCard>

            <SettingsCard id="reminders" title="REMINDERS">
              <ReminderScheduler />
              {/* Phase 1d (pattern doc §7.7) — the account onboarding is
                  re-enterable from here, and only here. Anonymous readers
                  have the landing-page first-run intro instead. */}
              {accountAuthed && (
                <CardSection id="revisit-welcome">
                  <h3 className="text-label vw-small mb-4 text-gold">
                    YOUR WELCOME
                  </h3>
                  <Link
                    href="/onboarding?force=1"
                    className="flex min-h-[44px] items-center justify-between gap-4 px-4 py-3 transition-theme"
                    style={{
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                    }}
                  >
                    <span className="min-w-0">
                      <span className="vw-body block text-[var(--color-text-primary)]">
                        Revisit your welcome
                      </span>
                      <span className="vw-small text-muted">
                        Reminder window and notifications, one step at a time
                      </span>
                    </span>
                    <span aria-hidden="true" className="text-secondary">
                      →
                    </span>
                  </Link>
                </CardSection>
              )}
            </SettingsCard>

            <SettingsCard id="data-privacy" title="DATA & PRIVACY">
              <CardSection first>
                {/* F-083 settings cleanup 2026-07-27 (founder): the
                    "Mock Account" mode toggle, capabilities list, and
                    mock export predate real auth — retired from the UI.
                    Real export/delete live in YOUR ACCOUNT DATA below. */}
                <div className="mt-1">
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
                      disabled={privacyBusy}
                    />
                    <span className="vw-small text-secondary">
                      Optional analytics opt-in (default OFF).
                    </span>
                  </label>
                </div>

                <div className="mt-5 grid gap-3">
                  <p className="text-label vw-small text-gold">
                    RETENTION — WHAT WE STORE, AND FOR HOW LONG
                  </p>
                  <div className="grid gap-3">
                    {retentionClarityRows().map((row) => (
                      <div
                        key={row.id}
                        className="p-3"
                        style={{ border: '1px solid var(--color-border)' }}
                      >
                        <p className="vw-small mb-1 text-[var(--color-text-primary)]">
                          {row.artifact}
                        </p>
                        <p className="vw-small text-muted">{row.what}</p>
                        <p className="vw-small text-muted">
                          Stored: {row.where}
                        </p>
                        <p className="vw-small text-muted">{row.retention}</p>
                      </div>
                    ))}
                  </div>
                  {/* Live policy echoed from the API response so this UI proves
                      the numbers it shows match the values the server returned. */}
                  {privacyRetention && (
                    <p className="vw-small text-muted">
                      Current policy in effect — anonymous session:{' '}
                      {privacyRetention.anonymousSessionDays} days; trash
                      restore window: {privacyRetention.trashRestoreWindowDays}{' '}
                      days.
                    </p>
                  )}
                  {Object.keys(privacyRetentionSummary).length === 0 && (
                    <p className="vw-small text-muted">
                      Loading current retention policy from the server...
                    </p>
                  )}
                  <Link
                    href="/privacy#retention-clarity-heading"
                    className="text-label vw-small link-highlight"
                  >
                    Full retention &amp; privacy policy
                  </Link>
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
              </CardSection>

              {/* Account data — Phase 7 privacy hardening (real signed-in user) */}
              <CardSection>
                <h3 className="text-label vw-small mb-4 text-gold">
                  YOUR ACCOUNT DATA
                </h3>
                <p className="vw-small mb-6 text-secondary">
                  Export everything we have about you, or delete your account
                  entirely. These controls operate on your <em>signed-in</em>{' '}
                  account — distinct from the mock-account export above.
                </p>

                {!accountAuthed && (
                  <p className="vw-small mb-6 text-muted">
                    Sign in to use these controls.
                  </p>
                )}

                {accountAuthed && (
                  <>
                    <div className="mb-6 flex flex-wrap items-center gap-4">
                      <button
                        type="button"
                        onClick={() => void exportSignedInAccountData()}
                        disabled={accountExportBusy || accountDeleteBusy}
                        className="px-6 py-3 text-label vw-small transition-theme disabled:opacity-30"
                        style={{
                          backgroundColor: 'var(--color-surface)',
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        {accountExportBusy
                          ? 'Building your export...'
                          : 'Export My Data'}
                      </button>
                      <p className="vw-small text-muted">
                        Downloads a JSON file with your profile, plans, journal,
                        bookmarks, and audit reflections.
                      </p>
                    </div>

                    <div className="mt-4">
                      <p className="text-label vw-small mb-3 text-gold">
                        DANGER ZONE
                      </p>
                      {!accountDeleteOpen && (
                        <button
                          type="button"
                          onClick={() => {
                            setAccountDeleteOpen(true)
                            setAccountDeleteError(null)
                            setAccountDeleteMessage(null)
                          }}
                          className="px-6 py-3 text-label vw-small transition-theme"
                          style={{
                            backgroundColor: 'transparent',
                            border: '1px solid var(--color-error, #b94f4f)',
                            color: 'var(--color-error, #b94f4f)',
                          }}
                        >
                          Delete My Account
                        </button>
                      )}
                      {accountDeleteOpen && (
                        <div
                          className="mt-3 rounded border p-4"
                          style={{
                            borderColor: 'var(--color-error, #b94f4f)',
                          }}
                        >
                          <p className="vw-small mb-3 text-secondary">
                            This <strong>cannot be undone</strong>. Your
                            profile, all devotional plans, journal entries,
                            bookmarks, and audit reflections will be permanently
                            removed.
                          </p>
                          <p className="vw-small mb-4 text-secondary">
                            To confirm, type{' '}
                            <code className="text-gold">DELETE MY ACCOUNT</code>{' '}
                            and your email address (
                            {accountEmail || 'your account email'}) below.
                          </p>
                          <label className="block mb-3">
                            <span className="text-label vw-small mb-1 block text-gold">
                              CONFIRMATION PHRASE
                            </span>
                            <input
                              type="text"
                              value={accountDeleteConfirm}
                              onChange={(e) =>
                                setAccountDeleteConfirm(e.target.value)
                              }
                              placeholder="DELETE MY ACCOUNT"
                              autoComplete="off"
                              className="w-full px-3 py-2 vw-small"
                              style={{
                                backgroundColor: 'var(--color-surface)',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text-primary)',
                              }}
                            />
                          </label>
                          <label className="block mb-4">
                            <span className="text-label vw-small mb-1 block text-gold">
                              YOUR EMAIL
                            </span>
                            <input
                              type="email"
                              value={accountDeleteEmail}
                              onChange={(e) =>
                                setAccountDeleteEmail(e.target.value)
                              }
                              placeholder={accountEmail || 'you@example.com'}
                              autoComplete="off"
                              className="w-full px-3 py-2 vw-small"
                              style={{
                                backgroundColor: 'var(--color-surface)',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text-primary)',
                              }}
                            />
                          </label>
                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={() => void confirmDeleteAccount()}
                              disabled={
                                accountDeleteBusy ||
                                accountDeleteConfirm.trim() !==
                                  'DELETE MY ACCOUNT' ||
                                accountDeleteEmail.trim().toLowerCase() !==
                                  (accountEmail || '').trim().toLowerCase()
                              }
                              className="px-6 py-3 text-label vw-small disabled:opacity-30"
                              style={{
                                backgroundColor: 'var(--color-error, #b94f4f)',
                                border: '1px solid var(--color-error, #b94f4f)',
                                // NOT --color-bg: that resolves to #0b1420 in
                                // dark, putting this label at 2.83:1 on the red.
                                // White holds 5.38:1 in every theme, and this is
                                // the highest-stakes button in the app.
                                color: '#fff',
                              }}
                            >
                              {accountDeleteBusy
                                ? 'Deleting...'
                                : 'Permanently Delete My Account'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAccountDeleteOpen(false)
                                setAccountDeleteConfirm('')
                                setAccountDeleteEmail('')
                              }}
                              disabled={accountDeleteBusy}
                              className="px-6 py-3 text-label vw-small disabled:opacity-30"
                              style={{
                                backgroundColor: 'transparent',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text-secondary)',
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {accountDeleteError && (
                  <p
                    className="vw-small mt-4"
                    style={{ color: 'var(--color-error)' }}
                    aria-live="assertive"
                  >
                    {accountDeleteError}
                  </p>
                )}
                {accountDeleteMessage && (
                  <p className="vw-small mt-4 text-gold" aria-live="polite">
                    {accountDeleteMessage}
                  </p>
                )}
              </CardSection>

              <CardSection>
                <h3 className="text-label vw-small mb-4 text-gold">
                  CHAT HISTORY
                </h3>
                <p className="vw-small mb-6 text-secondary">
                  {messages.length} message{messages.length !== 1 ? 's' : ''}{' '}
                  saved locally.
                </p>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (messages.length === 0) return
                      const blob = new Blob(
                        [JSON.stringify(messages, null, 2)],
                        {
                          type: 'application/json',
                        },
                      )
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
              </CardSection>
            </SettingsCard>

            <SettingsCard id="ai-keys" title="ADVANCED — AI & KEYS">
              <CardSection first>
                <p className="vw-small mb-6 text-secondary">
                  Choose your default brain and optional BYO provider keys.
                </p>
                <div className="grid gap-6">
                  <div className="grid gap-3">
                    <p className="text-label vw-small text-gold">
                      DEFAULT BRAIN
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {/* F-083 settings repair (SA-033, 2026-07-27): Google's
                          configured model was shut down upstream and the
                          MiniMax / NVIDIA options were exotic BYO-only paths —
                          all three retired from the picker (router code
                          untouched). */}
                      {[
                        { label: 'Auto (Claude-first)', value: 'auto' },
                        { label: 'Claude/OpenAI', value: 'openai' },
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
                          style={quietPillStyle(
                            defaultBrainMode === option.value,
                          )}
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
                        style={quietPillStyle(
                          keyStorageMode === 'session_only',
                        )}
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
                        style={quietPillStyle(
                          keyStorageMode === 'remember_encrypted',
                        )}
                      >
                        Remember encrypted
                      </button>
                    </div>
                    {/* F-083 settings repair: this used to be one field
                        labeled "OpenAI key" that silently wrote BOTH the
                        OpenAI and Anthropic keys; the Google/MiniMax/NVIDIA
                        fields served retired picker options. Two honest
                        fields now. */}
                    <input
                      type="password"
                      value={anthropicApiKey}
                      onChange={(event) => {
                        setAnthropicApiKey(event.target.value)
                        showSaved()
                      }}
                      placeholder="Anthropic key"
                      aria-label="Anthropic API key"
                      className="w-full max-w-md bg-surface-raised px-6 py-3 vw-body text-[var(--color-text-primary)] placeholder:text-muted focus:outline-none"
                      style={{ border: '1px solid var(--color-border)' }}
                      autoComplete="off"
                    />
                    <input
                      type="password"
                      value={openaiApiKey}
                      onChange={(event) => {
                        setOpenaiApiKey(event.target.value)
                        showSaved()
                      }}
                      placeholder="OpenAI key"
                      aria-label="OpenAI API key"
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
                      Client-side encryption protects storage at rest, but does
                      not mitigate active XSS inside the browser runtime.
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
              </CardSection>
            </SettingsCard>

            <SettingsCard id="about" title="ABOUT">
              {/* Deep link target: /settings#tutorial (Help hub links here). */}
              <CardSection first id="tutorial">
                <h3 className="text-label vw-small mb-4 text-gold">
                  WALKTHROUGH &amp; HELP
                </h3>
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
                    href="/help#faq"
                    className="text-label vw-small link-highlight"
                  >
                    Open Help FAQ
                  </Link>
                </div>
              </CardSection>

              <CardSection>
                <div className="space-y-3">
                  <Link
                    href="/how-we-write"
                    className="block vw-small text-secondary transition-colors duration-300 hover:text-[var(--color-text-primary)]"
                  >
                    How We Write
                  </Link>
                  <Link
                    href="/credits"
                    className="block vw-small text-secondary transition-colors duration-300 hover:text-[var(--color-text-primary)]"
                  >
                    Credits &amp; Translations
                  </Link>
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
              </CardSection>
            </SettingsCard>
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
        </div>
        <SiteBottom />
      </main>
    </div>
  )
}
