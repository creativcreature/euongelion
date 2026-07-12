'use client'

/**
 * /settings/subscription — subscription management (Phase 1c, pattern
 * doc §2 "Management"). Plan card with a Started→Renewal style dot
 * timeline (rendered from the dates the entitlements API actually
 * knows), what's included, Change plan, Update payment, and a VISIBLE
 * one-tap Cancel subscription — no interrogation, no cancel-shame
 * (SA-025). Stripe's billing portal performs the actual changes; every
 * portal action carries the round-trip sentence.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteFooter from '@/components/SiteFooter'
import { formatEditionCount, formatLongDate } from '@/lib/billing/paywall-state'
import { usePendingGenerationStore } from '@/stores/pendingGenerationStore'
import type { BillingEntitlementsResponse } from '@/types/billing'

type LoadPhase = 'loading' | 'ready' | 'error'

const WHATS_INCLUDED = [
  'Unlimited custom editions — composed for your specific reflection',
  'Unlimited Soul Audit re-rolls',
  'Priority support',
  'Everything in Free — the full library never leaves you',
] as const

function TimelineDot({
  label,
  detail,
  filled,
  last = false,
}: {
  label: string
  detail: string
  filled: boolean
  last?: boolean
}) {
  return (
    <li className="relative flex gap-4">
      <span
        aria-hidden="true"
        className="relative flex w-3 shrink-0 justify-center"
      >
        <span
          className="absolute top-1.5 h-2 w-2 rounded-full"
          style={{
            backgroundColor: filled ? 'var(--color-gold)' : 'transparent',
            border: '1px solid var(--color-gold)',
          }}
        />
        {!last && (
          <span
            className="absolute bottom-0 top-4 w-px"
            style={{ backgroundColor: 'var(--color-border)' }}
          />
        )}
      </span>
      <span className={last ? undefined : 'pb-5'}>
        <span className="text-label vw-small block text-gold">
          {label.toUpperCase()}
        </span>
        <span className="vw-small mt-1 block text-secondary">{detail}</span>
      </span>
    </li>
  )
}

export default function SubscriptionSettingsPage() {
  const lastCheckoutSessionId = usePendingGenerationStore(
    (store) => store.lastCheckoutSessionId,
  )
  const [phase, setPhase] = useState<LoadPhase>('loading')
  const [authenticated, setAuthenticated] = useState(false)
  const [entitlements, setEntitlements] = useState<
    BillingEntitlementsResponse['entitlements'] | null
  >(null)
  const [portalBusy, setPortalBusy] = useState(false)
  const [portalError, setPortalError] = useState<string | null>(null)

  const loadEntitlements = useCallback(async () => {
    setPhase('loading')
    try {
      const response = await fetch('/api/billing/entitlements', {
        cache: 'no-store',
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error(`Entitlements returned ${response.status}`)
      }
      const payload = (await response.json()) as BillingEntitlementsResponse
      if (!payload.ok) throw new Error('Entitlements response incomplete.')
      setAuthenticated(payload.authenticated)
      setEntitlements(payload.entitlements)
      setPhase('ready')
    } catch {
      setPhase('error')
    }
  }, [])

  useEffect(() => {
    void loadEntitlements()
  }, [loadEntitlements])

  async function openPortal() {
    setPortalError(null)
    if (!lastCheckoutSessionId) {
      // The portal endpoint requires the checkout session from this
      // device. Honest limitation + a real next step — never a broken
      // button (Dev Rule #1).
      setPortalError(
        'Billing management opens through Stripe using the checkout completed on this device, and we don’t have that here. Open the link in your Stripe receipt email instead — it manages the same subscription.',
      )
      return
    }
    setPortalBusy(true)
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkoutSessionId: lastCheckoutSessionId,
          returnPath: '/settings/subscription',
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
      setPortalError(
        error instanceof Error
          ? error.message
          : 'Unable to open billing management right now.',
      )
    } finally {
      setPortalBusy(false)
    }
  }

  const premiumActive = Boolean(entitlements?.premiumActive)
  const generationCredits = entitlements?.generationCredits ?? 0
  const renewsAt = entitlements?.subscriptionRenewsAt ?? null
  const expiresAt = entitlements?.premiumExpiresAt ?? null
  const isRecurring = Boolean(renewsAt)
  const isPostCancel =
    premiumActive && entitlements?.subscriptionStatus === 'canceled'
  const paidThroughDate = formatLongDate(renewsAt ?? expiresAt)

  let content: React.ReactNode
  if (phase === 'loading') {
    content = (
      <div className="grid gap-4" aria-hidden="true">
        <div
          className="h-40 animate-pulse"
          style={{
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
          }}
        />
        <div
          className="h-24 animate-pulse"
          style={{
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
          }}
        />
      </div>
    )
  } else if (phase === 'error') {
    content = (
      <div
        className="grid gap-4 p-6"
        style={{ border: '1px solid var(--color-border)' }}
      >
        <p className="vw-body text-secondary" role="alert">
          We couldn’t load your subscription status.
        </p>
        <button
          type="button"
          className="cta-major text-label vw-small w-fit px-5 py-3"
          onClick={() => void loadEntitlements()}
        >
          Try again
        </button>
      </div>
    )
  } else if (!authenticated) {
    content = (
      <div
        className="grid gap-4 p-6"
        style={{ border: '1px solid var(--color-border)' }}
      >
        <p className="vw-body text-secondary">
          Sign in to see and manage your subscription.
        </p>
        <Link
          href="/auth/sign-in?redirect=%2Fsettings%2Fsubscription"
          className="mock-btn text-label w-fit"
        >
          SIGN IN
        </Link>
      </div>
    )
  } else if (!premiumActive) {
    content = (
      <div
        className="grid gap-4 p-6"
        style={{ border: '1px solid var(--color-border)' }}
      >
        <p className="text-label vw-small text-gold">FREE</p>
        <p className="vw-body text-secondary">
          You’re on the free tier — the full library, the Soul Audit, and three
          matched paths, always free.
        </p>
        {entitlements?.freeGenerationUsed === false && (
          <p className="vw-small text-muted">
            Your first custom edition is still free.
          </p>
        )}
        <Link
          href="/pricing"
          className="text-label vw-small link-highlight w-fit"
        >
          See plans
        </Link>
      </div>
    )
  } else {
    content = (
      <div className="grid gap-6">
        {/* Plan card */}
        <div
          className="grid gap-6 p-6 sm:p-7"
          style={{
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-surface)',
          }}
        >
          <div>
            <p className="text-label vw-small mb-2 text-gold">EUANGELION+</p>
            <p className="vw-body text-[var(--color-text-primary)]">
              {isPostCancel
                ? paidThroughDate
                  ? `Cancelled — paid until ${paidThroughDate}.`
                  : 'Cancelled — active through the end of your paid period.'
                : isRecurring
                  ? paidThroughDate
                    ? `Active · renews ${paidThroughDate}`
                    : 'Active'
                  : paidThroughDate
                    ? `Active · access through ${paidThroughDate}`
                    : 'Active'}
            </p>
            {isPostCancel && (
              <p className="vw-small mt-2 text-secondary">
                Your generated editions remain yours forever.
              </p>
            )}
          </div>

          <ol
            className="m-0 grid list-none gap-0 p-0"
            aria-label="Subscription timeline"
          >
            <TimelineDot
              label="Active today"
              detail="Custom editions are open to you."
              filled
            />
            <TimelineDot
              label={
                isPostCancel
                  ? paidThroughDate
                    ? `Paid until ${paidThroughDate}`
                    : 'End of paid period'
                  : isRecurring
                    ? paidThroughDate
                      ? `Renews ${paidThroughDate}`
                      : 'Renewal'
                    : paidThroughDate
                      ? `Access through ${paidThroughDate}`
                      : 'Term end'
              }
              detail={
                isPostCancel
                  ? 'Nothing more is charged. Everything you’ve generated stays in your library.'
                  : isRecurring
                    ? 'Cancel anytime before then — everything you’ve generated stays yours.'
                    : 'One-time payment — nothing renews automatically.'
              }
              filled={false}
              last
            />
          </ol>

          <div>
            <p className="text-label vw-small mb-3 text-gold">
              WHAT’S INCLUDED
            </p>
            <ul className="vw-small m-0 grid list-none gap-2 p-0 text-secondary">
              {WHATS_INCLUDED.map((item) => (
                <li key={item}>· {item}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Actions — portal round-trips */}
        <div
          className="grid gap-4 p-6 sm:p-7"
          style={{ border: '1px solid var(--color-border)' }}
        >
          <p className="vw-small text-secondary">
            Plan changes and payment details are handled in Stripe’s secure
            portal — you’ll go there and come right back here.
          </p>
          <div className="flex flex-wrap gap-3">
            {isRecurring && !isPostCancel && (
              <button
                type="button"
                className="min-h-[44px] px-5 py-3 text-label vw-small disabled:opacity-40"
                style={{
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text-secondary)',
                }}
                disabled={portalBusy}
                onClick={() => void openPortal()}
              >
                Change plan
              </button>
            )}
            <button
              type="button"
              className="min-h-[44px] px-5 py-3 text-label vw-small disabled:opacity-40"
              style={{
                border: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text-secondary)',
              }}
              disabled={portalBusy}
              onClick={() => void openPortal()}
            >
              Update payment
            </button>
            {isRecurring && !isPostCancel && (
              <button
                type="button"
                className="min-h-[44px] px-5 py-3 text-label vw-small disabled:opacity-40"
                style={{
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text-secondary)',
                }}
                disabled={portalBusy}
                onClick={() => void openPortal()}
              >
                Cancel subscription
              </button>
            )}
          </div>
          {!isRecurring && (
            <p className="vw-small text-muted">
              This is a one-time purchase — there’s nothing that renews or needs
              cancelling.
            </p>
          )}
          {isRecurring && !isPostCancel && (
            <p className="vw-small text-muted">
              Cancelling takes effect at the end of your paid period. Your
              generated editions remain yours forever.
            </p>
          )}
          {portalBusy && (
            <p className="vw-small text-muted" role="status" aria-live="polite">
              Opening Stripe’s secure portal…
            </p>
          )}
          {portalError && (
            <p
              className="vw-small"
              style={{ color: 'var(--color-error)' }}
              role="alert"
            >
              {portalError}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="mock-home min-h-screen">
      <main id="main-content" className="mock-paper min-h-screen">
        <EuangelionShellHeader />
        <div className="shell-content-pad mx-auto w-full max-w-3xl">
          <Breadcrumbs
            className="mb-7"
            items={[
              { label: 'HOME', href: '/' },
              { label: 'SETTINGS', href: '/settings' },
              { label: 'SUBSCRIPTION' },
            ]}
          />
          <h1 className="text-display vw-heading-lg mb-10">Subscription</h1>
          {content}
          {/* Editions balance (SA-027 credits) — rendered on both the
              free and subscribed states; hidden entirely at zero. */}
          {phase === 'ready' && authenticated && generationCredits > 0 && (
            <div
              className="mt-6 grid gap-2 p-6 sm:p-7"
              style={{ border: '1px solid var(--color-border)' }}
            >
              <p className="text-label vw-small text-gold">EDITIONS</p>
              <p className="vw-body text-[var(--color-text-primary)]">
                {formatEditionCount(generationCredits)} available
              </p>
              <p className="vw-small text-muted">
                From packs or gift codes. Credits never expire — each custom
                edition uses one.
              </p>
            </div>
          )}
        </div>
        <SiteFooter />
      </main>
    </div>
  )
}
