'use client'

/**
 * GenerationPaywall — the commissioning surface shown at exactly one
 * moment: an un-entitled reader asked for a custom edition (Phase 1c,
 * pattern doc §1, SA-026/SA-027).
 *
 * Framed as commissioning an edition, not a gate: the reader's request
 * is already HELD (pendingGenerationStore) and resumes automatically
 * after sign-in / entitlement — the surface says so plainly.
 *
 * States:
 *  - sign_in_required   : "Your first custom edition is free" banner,
 *                         primary CTA signs in then auto-resumes.
 *                         Subscribe card quiet below.
 *  - no_entitlement     : subscribe card primary (Annual RECOMMENDED,
 *                         Monthly, More durations), lifecycle timeline,
 *                         text-links row, covenant.
 *  - allowance_exhausted: factual copy, no purchase pressure.
 *
 * SA-024: mobile is a full-height sheet with a scrolling offer stack
 * and a sticky selected-plan summary footer; desktop is an editorial
 * two-column spread (offer stack left; specimen + lifecycle timeline
 * right). Two presentations, one component.
 *
 * Honesty: loading is a layout-accurate skeleton; a price-load failure
 * shows the covenant + Try again (never placeholder prices); when
 * payments are not enabled the surface says so in one honest line.
 * No countdowns, no strikethroughs, no cancel-shame (SA-025).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  formatBilledAmountLabel,
  formatEditionCount,
  GENERATION_COVENANT,
  sellableCreditPacks,
  type GenerationPaywallState,
} from '@/lib/billing/paywall-state'
import { usePendingGenerationStore } from '@/stores/pendingGenerationStore'
import { typographer } from '@/lib/typographer'
import { useScrollLock } from '@/lib/use-scroll-lock'
import CreditPackCard from './CreditPackCard'
import PlanOfferStack from './PlanOfferStack'
import RedeemCodeSheet from './RedeemCodeSheet'
import SubscriptionLifecycleTimeline from './SubscriptionLifecycleTimeline'
import type {
  BillingConfigResponse,
  BillingEntitlementsResponse,
  BillingPlan,
  BillingPlanId,
} from '@/types/billing'

interface GenerationPaywallProps {
  state: GenerationPaywallState
  freeGenerationUsed: boolean
  /** The chosen direction's title — the reader's own words, echoed. */
  pendingTheme: string | null
  /** Scripture from the chosen direction, typeset as the specimen. */
  specimenVerse?: string | null
  specimenVerseText?: string | null
  /** Where sign-in should return to so the held request auto-resumes. */
  resumePath: string
  /** Decline — returns the reader exactly where they were. */
  onDismiss: () => void
  /**
   * "Already subscribed?" verified an active entitlement — the parent
   * re-fires the held selection immediately.
   */
  onEntitled: () => void
}

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/** Real Scripture for the specimen when the held option carries none. */
const FALLBACK_SPECIMEN = {
  verse: 'Matthew 11:28',
  text: 'Come unto me, all ye that labour and are heavy laden, and I will give you rest.',
}

type ConfigPhase = 'loading' | 'ready' | 'error'
type CheckoutPhase = 'idle' | 'starting' | 'redirecting'
type RecheckPhase = 'idle' | 'checking' | 'not_subscribed' | 'error'

export default function GenerationPaywall({
  state,
  freeGenerationUsed,
  pendingTheme,
  specimenVerse,
  specimenVerseText,
  resumePath,
  onDismiss,
  onEntitled,
}: GenerationPaywallProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const setLastCheckoutSessionId = usePendingGenerationStore(
    (store) => store.setLastCheckoutSessionId,
  )

  const [configPhase, setConfigPhase] = useState<ConfigPhase>('loading')
  const [config, setConfig] = useState<BillingConfigResponse | null>(null)
  const [selectedPlanId, setSelectedPlanId] =
    useState<BillingPlanId>('premium_annual')
  const [checkoutPhase, setCheckoutPhase] = useState<CheckoutPhase>('idle')
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [recheckPhase, setRecheckPhase] = useState<RecheckPhase>('idle')
  // Spendable edition credits (SA-027). null = unknown (fetch pending or
  // failed) — the quiet credits line simply doesn't render; the paywall's
  // own honest states never depend on this read.
  const [credits, setCredits] = useState<number | null>(null)
  const [redeemOpen, setRedeemOpen] = useState(false)
  const planStackRef = useRef<HTMLDivElement>(null)

  const signInHref = `/auth/sign-in?redirect=${encodeURIComponent(resumePath)}`

  const loadConfig = useCallback(async () => {
    setConfigPhase('loading')
    try {
      const response = await fetch('/api/billing/config', {
        cache: 'no-store',
      })
      if (!response.ok) throw new Error(`Config returned ${response.status}`)
      const payload = (await response.json()) as BillingConfigResponse
      if (!payload.ok || !Array.isArray(payload.plans)) {
        throw new Error('Billing config was incomplete.')
      }
      setConfig(payload)
      setConfigPhase('ready')
    } catch {
      setConfig(null)
      setConfigPhase('error')
    }
  }, [])

  useEffect(() => {
    void loadConfig()
  }, [loadConfig])

  // Credits visibility (SA-027): a signed-in reader who already holds
  // editions (gift code, pack bought in another tab) sees them here and
  // composes without any purchase. Anonymous readers read as 0.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const response = await fetch('/api/billing/entitlements', {
          cache: 'no-store',
          credentials: 'include',
        })
        if (!response.ok) return
        const payload = (await response.json()) as BillingEntitlementsResponse
        if (cancelled || !payload.ok || !payload.authenticated) return
        setCredits(payload.entitlements?.generationCredits ?? 0)
      } catch {
        // Unknown stays unknown — no fabricated balance.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Lock the page behind the sheet. Ref-counted centrally (backlog #59).
  useScrollLock(true)

  // Focus the dialog on mount so screen readers announce it and
  // keyboard users start inside the trap.
  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        onDismiss()
        return
      }
      if (event.key !== 'Tab') return
      const dialog = dialogRef.current
      if (!dialog) return
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => !el.closest('[aria-hidden="true"]'))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault()
          last.focus()
        }
      } else if (document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    },
    [onDismiss],
  )

  const paymentsEnabled = Boolean(config?.paymentsEnabled.webStripe)
  const plans = config?.plans ?? []
  const selectedPlan: BillingPlan | null =
    plans.find((plan) => plan.id === selectedPlanId) ?? null
  // Pack card renders ONLY when config advertises sellable packs AND web
  // payments are on — zero packs = no card, no gap (pattern doc §1.2).
  const creditPacks = sellableCreditPacks(config)
  const hasCredits = (credits ?? 0) > 0

  async function startCheckout(
    target: { planId: BillingPlanId } | { packId: string },
  ) {
    setCheckoutPhase('starting')
    setCheckoutError(null)
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...target, platform: 'web' }),
      })
      const payload = (await response.json()) as {
        checkoutUrl?: string
        checkoutSessionId?: string
        error?: string
        code?: string
      }
      if (response.status === 401 || payload.code === 'AUTH_REQUIRED') {
        // Signed out mid-flow — route through sign-in; the held request
        // brings them straight back here.
        window.location.assign(signInHref)
        return
      }
      if (!response.ok || !payload.checkoutUrl) {
        throw new Error(payload.error || 'Unable to start checkout.')
      }
      if (payload.checkoutSessionId) {
        setLastCheckoutSessionId(payload.checkoutSessionId)
      }
      // In-place beat before the redirect (§2 hand-off): the reader
      // sees the round-trip promise, then we go.
      setCheckoutPhase('redirecting')
      const checkoutUrl = payload.checkoutUrl
      window.setTimeout(() => {
        window.location.assign(checkoutUrl)
      }, 900)
    } catch (error) {
      setCheckoutPhase('idle')
      setCheckoutError(
        error instanceof Error ? error.message : 'Unable to start checkout.',
      )
    }
  }

  async function recheckEntitlements() {
    setRecheckPhase('checking')
    try {
      const response = await fetch('/api/billing/entitlements', {
        cache: 'no-store',
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Entitlement check failed.')
      const payload = (await response.json()) as BillingEntitlementsResponse
      if (payload.entitlements?.premiumActive) {
        onEntitled()
        return
      }
      setRecheckPhase('not_subscribed')
    } catch {
      setRecheckPhase('error')
    }
  }

  // Strip terminal punctuation from the echoed theme so option titles
  // that end in a period never read “…yoke..”
  const echoTheme = pendingTheme?.replace(/[.!?\s]+$/, '') ?? null
  const echoLine = echoTheme
    ? typographer(`You asked for an edition on “${echoTheme}.”`)
    : 'Your edition request is held — nothing is lost.'

  // ------------------------------------------------------------------
  // Shared fragments
  // ------------------------------------------------------------------

  const covenant = (
    <p className="vw-small text-muted">{typographer(GENERATION_COVENANT)}</p>
  )

  const declineButton = (
    <button
      type="button"
      className="min-h-[44px] w-fit text-label vw-small link-highlight"
      onClick={onDismiss}
    >
      Not now — keep reading free
    </button>
  )

  const specimen = (
    <figure
      className="m-0 p-5"
      style={{
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
      }}
    >
      <figcaption className="text-label vw-small mb-4 text-gold">
        SPECIMEN — FROM A CUSTOM EDITION
      </figcaption>
      <blockquote className="m-0">
        <p className="text-serif-italic vw-body-lg mb-3">
          {typographer(specimenVerseText || FALLBACK_SPECIMEN.text)}
        </p>
        <cite className="vw-small not-italic text-secondary">
          {specimenVerse || FALLBACK_SPECIMEN.verse}
        </cite>
      </blockquote>
      {pendingTheme && (
        <p className="vw-small mt-4 text-muted">
          {typographer(
            `Yours is composed fresh — seven days, grounded in Scripture, written for what you named.`,
          )}
        </p>
      )}
    </figure>
  )

  const offerSkeleton = (
    <div className="grid gap-3" aria-hidden="true">
      <div
        className="h-20 animate-pulse"
        style={{
          border: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface)',
        }}
      />
      <div
        className="h-20 animate-pulse"
        style={{
          border: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface)',
        }}
      />
      <div
        className="h-4 w-32 animate-pulse"
        style={{ backgroundColor: 'var(--color-surface)' }}
      />
    </div>
  )

  const priceLoadFailure = (
    <div className="grid gap-4">
      <p className="vw-body text-secondary">
        We couldn’t load plan prices right now.
      </p>
      {covenant}
      <button
        type="button"
        className="cta-major text-label vw-small w-fit px-5 py-3"
        onClick={() => void loadConfig()}
      >
        Try again
      </button>
    </div>
  )

  const paymentsClosedNotice = (
    <div className="grid gap-4">
      <p className="vw-body text-secondary">
        Subscriptions aren’t open yet. Your edition request is saved — it will
        be waiting when they are.
      </p>
      {/* Gift codes redeem server-side without checkout — the one live
          path while payments are closed stays reachable. */}
      <button
        type="button"
        className="min-h-[44px] w-fit text-label vw-small link-highlight"
        onClick={() => setRedeemOpen(true)}
      >
        REDEEM A CODE
      </button>
      {covenant}
    </div>
  )

  const textLinksRow = (
    <div
      className="pt-5"
      style={{ borderTop: '1px solid var(--color-border)' }}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <button
          type="button"
          className="min-h-[44px] text-label vw-small link-highlight"
          onClick={() => setRedeemOpen(true)}
        >
          REDEEM A CODE
        </button>
        <span aria-hidden="true" className="text-muted">
          ·
        </span>
        <button
          type="button"
          className="min-h-[44px] text-label vw-small link-highlight"
          onClick={() => void recheckEntitlements()}
          disabled={recheckPhase === 'checking'}
        >
          {recheckPhase === 'checking' ? 'CHECKING…' : 'ALREADY SUBSCRIBED?'}
        </button>
      </div>
      {recheckPhase === 'not_subscribed' && (
        <p className="vw-small mt-2 text-secondary" role="status">
          This account doesn’t show an active subscription. If you subscribed
          with a different email,{' '}
          <Link href={signInHref} className="link-highlight">
            sign in with that one
          </Link>
          .
        </p>
      )}
      {recheckPhase === 'error' && (
        <p className="vw-small mt-2 text-secondary" role="status">
          We couldn’t check your subscription just now. Try again in a moment.
        </p>
      )}
    </div>
  )

  const subscribeCta = selectedPlan && (
    <button
      type="button"
      className="cta-major text-label vw-small w-full px-6 py-4 disabled:opacity-50"
      onClick={() => void startCheckout({ planId: selectedPlan.id })}
      disabled={checkoutPhase !== 'idle'}
      aria-busy={checkoutPhase !== 'idle'}
    >
      {checkoutPhase === 'starting'
        ? 'OPENING CHECKOUT…'
        : `CONTINUE — ${formatBilledAmountLabel(selectedPlan)}`}
    </button>
  )

  // Credits in hand: the edition is already covered — composing resumes
  // the held request directly (the backend consumes one credit; no
  // purchase, no charge). Same resume machinery as "Already subscribed?".
  const composeWithCreditsCta = (
    <div className="grid gap-2">
      <button
        type="button"
        className="cta-major text-label vw-small w-full px-6 py-4"
        onClick={onEntitled}
      >
        COMPOSE MY EDITION
      </button>
      <p className="vw-small m-0 text-center text-muted">
        {typographer(
          credits === 1
            ? 'No charge — uses your one edition.'
            : `No charge — uses 1 of your ${credits ?? 0} editions.`,
        )}
      </p>
    </div>
  )

  const offerStackBlock =
    configPhase === 'loading' ? (
      offerSkeleton
    ) : configPhase === 'error' ? (
      priceLoadFailure
    ) : !paymentsEnabled ? (
      paymentsClosedNotice
    ) : (
      <div className="grid gap-4">
        <div ref={planStackRef}>
          <PlanOfferStack
            plans={plans}
            selectedPlanId={selectedPlanId}
            onSelect={setSelectedPlanId}
          />
        </div>
        {checkoutError && (
          <p
            className="vw-small"
            style={{ color: 'var(--color-error)' }}
            role="alert"
          >
            {checkoutError}
          </p>
        )}
        {/* Desktop CTA — mobile uses the sticky footer below. */}
        <div className="hidden lg:block">{subscribeCta}</div>
        {/* Mobile-inline lifecycle timeline (desktop shows it in the
            right column of the spread). */}
        {selectedPlan && (
          <div className="lg:hidden">
            <SubscriptionLifecycleTimeline plan={selectedPlan} />
          </div>
        )}
        {/* Credit-pack card (Phase 2, §1.2) — medium card between the
            subscribe card and the text-links row. Renders only when the
            config advertises sellable packs. */}
        {creditPacks.length > 0 && (
          <CreditPackCard
            packs={creditPacks}
            busy={checkoutPhase !== 'idle'}
            onPurchase={(packId) => void startCheckout({ packId })}
            onCrossLinkToSubscription={() => {
              planStackRef.current?.scrollIntoView({
                behavior: window.matchMedia('(prefers-reduced-motion: reduce)')
                  .matches
                  ? 'auto'
                  : 'smooth',
                block: 'center',
              })
            }}
          />
        )}
        {textLinksRow}
      </div>
    )

  // ------------------------------------------------------------------
  // Hand-off beat (checkout redirect in-flight)
  // ------------------------------------------------------------------

  if (checkoutPhase === 'redirecting') {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center px-6"
        style={{
          backgroundColor: 'var(--color-bg)',
          zIndex: 'var(--z-modal, 400)',
        }}
        role="status"
        aria-live="polite"
      >
        <div className="max-w-md text-center">
          <p className="text-label vw-small mb-4 text-gold">SECURE CHECKOUT</p>
          <p className="text-serif-italic vw-heading-md mb-4">
            {typographer(
              'Taking you to secure checkout — we’ll bring you right back to your edition.',
            )}
          </p>
          <p className="vw-small text-muted">
            Your edition request is held. Nothing is lost.
          </p>
        </div>
      </div>
    )
  }

  // ------------------------------------------------------------------
  // The sheet / spread
  // ------------------------------------------------------------------

  const header = (
    <div
      className="flex items-start justify-between gap-4 pb-4"
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
      <div>
        <p className="text-label vw-small mb-2 text-gold">YOUR EDITION</p>
        <p className="vw-small text-secondary">{echoLine}</p>
      </div>
      <button
        type="button"
        className="flex h-11 w-11 shrink-0 items-center justify-center text-2xl leading-none"
        style={{
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-secondary)',
        }}
        onClick={onDismiss}
        aria-label="Close and keep reading free"
      >
        ×
      </button>
    </div>
  )

  let body: React.ReactNode
  if (state === 'sign_in_required') {
    body = (
      <div className="grid gap-6">
        <div>
          <h2
            id="generation-paywall-heading"
            className="text-serif-italic vw-heading-md mb-3"
          >
            Your first custom edition is free.
          </h2>
          <p className="vw-body text-secondary">
            {typographer(
              'Sign in and we compose it — your request is held, and composition starts automatically. No re-typing.',
            )}
          </p>
          {hasCredits && (
            <p className="vw-small mt-3 text-muted" role="status">
              {typographer(`You have ${formatEditionCount(credits ?? 0)}.`)}
            </p>
          )}
        </div>
        <Link
          href={signInHref}
          className="cta-major text-label vw-small block w-full px-6 py-4 text-center"
        >
          SIGN IN — THEN COMPOSE MY EDITION
        </Link>

        {/* Quiet subscribe teaser — never competes with the free path. */}
        {configPhase === 'ready' && paymentsEnabled && (
          <div
            className="grid gap-3 p-4"
            style={{ border: '1px solid var(--color-border)' }}
          >
            <p className="text-label vw-small text-gold">
              WHEN YOU WANT MORE THAN ONE…
            </p>
            <p className="vw-small text-secondary">
              Unlimited editions from $7/mo — after your free one. Sign in first
              and we’ll bring you back.
            </p>
            <PlanOfferStack
              plans={plans}
              selectedPlanId={selectedPlanId}
              onSelect={setSelectedPlanId}
              quiet
            />
          </div>
        )}

        <div className="grid gap-4">
          {covenant}
          {declineButton}
        </div>
      </div>
    )
  } else if (state === 'allowance_exhausted') {
    body = (
      <div className="grid gap-6">
        <div>
          <h2
            id="generation-paywall-heading"
            className="text-serif-italic vw-heading-md mb-3"
          >
            You’ve composed this month’s editions.
          </h2>
          <p className="vw-body text-secondary">
            {typographer(
              'Your allowance refreshes at the start of next month. Everything you’ve already generated stays yours — and the whole library is open in the meantime.',
            )}
          </p>
        </div>
        <button
          type="button"
          className="cta-major text-label vw-small w-full px-6 py-4"
          onClick={onDismiss}
        >
          BACK TO YOUR MATCHES
        </button>
        {covenant}
      </div>
    )
  } else if (hasCredits) {
    // Covered mode (SA-027): the reader already holds editions — the
    // primary CTA resumes the held generation directly (one credit is
    // consumed server-side; no purchase, no charge). No upsell while
    // covered (SA-025) — the text-links row keeps redeem/restore near.
    body = (
      <div className="grid gap-6">
        <div>
          <h2
            id="generation-paywall-heading"
            className="text-serif-italic vw-heading-md mb-3"
          >
            This edition is covered.
          </h2>
          <p className="vw-body text-secondary" role="status">
            {typographer(
              `You have ${formatEditionCount(credits ?? 0)} — composing this one uses a credit, not a payment.`,
            )}
          </p>
        </div>
        {/* Desktop CTA — mobile uses the sticky footer below. */}
        <div className="hidden lg:block">{composeWithCreditsCta}</div>
        {textLinksRow}
        <div className="grid gap-4">
          {covenant}
          {declineButton}
        </div>
      </div>
    )
  } else {
    body = (
      <div className="grid gap-6">
        <div>
          {freeGenerationUsed && (
            <p className="vw-small mb-3 text-muted">
              You’ve used your free edition.
            </p>
          )}
          <h2
            id="generation-paywall-heading"
            className="text-serif-italic vw-heading-md mb-3"
          >
            Commission your edition.
          </h2>
          <p className="vw-body text-secondary">
            {typographer(
              'A seven-day edition, composed fresh for your specific words — grounded in real Scripture and the historic voices.',
            )}
          </p>
        </div>
        {offerStackBlock}
        <div className="grid gap-4">
          {covenant}
          {declineButton}
        </div>
      </div>
    )
  }

  const showRightColumn = state !== 'allowance_exhausted'
  // Mobile sticky footer: with credits in hand it carries the compose
  // CTA; otherwise the selected-plan summary + subscribe CTA. Never both
  // — one primary CTA per page state.
  const showComposeFooter = state === 'no_entitlement' && hasCredits
  const showPlanFooter =
    state === 'no_entitlement' &&
    !hasCredits &&
    configPhase === 'ready' &&
    paymentsEnabled

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{
        background: 'rgba(17, 24, 42, 0.72)',
        // Above the mobile tab bar (--z-fixed: 200) — this is a modal moment.
        zIndex: 'var(--z-modal, 400)',
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="generation-paywall-heading"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="mx-auto flex h-full w-full flex-col outline-none lg:h-auto lg:max-h-[92vh] lg:mt-[4vh] lg:max-w-5xl"
        style={{
          backgroundColor: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
        }}
      >
        {/* Scrolling content. One DOM instance, two bespoke arrangements
            (SA-024): mobile is a full-height single-column sheet with the
            timeline inline and a sticky footer; desktop is an editorial
            two-column spread with the specimen + timeline as the right
            column of the masthead frame. */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 sm:p-7 lg:p-10">
            {header}
            <div className="mt-6 lg:mt-8 lg:grid lg:grid-cols-[7fr_5fr] lg:gap-12">
              <div>{body}</div>
              {showRightColumn && (
                <aside className="hidden content-start gap-8 lg:grid">
                  {specimen}
                  {configPhase === 'ready' &&
                    paymentsEnabled &&
                    !hasCredits &&
                    selectedPlan && (
                      <SubscriptionLifecycleTimeline plan={selectedPlan} />
                    )}
                </aside>
              )}
            </div>
          </div>
        </div>

        {/* Mobile sticky footer — selected-plan summary + single CTA,
            or the compose CTA when editions are already in hand. */}
        {showPlanFooter && selectedPlan && (
          <div
            className="grid gap-2 p-4 lg:hidden"
            style={{
              borderTop: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
            }}
          >
            <p className="vw-small text-secondary">
              {selectedPlan.name} — {selectedPlan.priceLabel} (
              {selectedPlan.effectiveMonthlyLabel} effective)
            </p>
            {subscribeCta}
          </div>
        )}
        {showComposeFooter && (
          <div
            className="p-4 lg:hidden"
            style={{
              borderTop: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-surface)',
            }}
          >
            {composeWithCreditsCta}
          </div>
        )}

        {/* Redeem sheet (§1.3) — inside the dialog so the paywall's
            focus trap contains it; it runs its own trap on top. */}
        {redeemOpen && (
          <RedeemCodeSheet
            signInHref={signInHref}
            onClose={() => setRedeemOpen(false)}
            onRedeemed={(balance) => setCredits(balance)}
            onCompose={() => {
              setRedeemOpen(false)
              onEntitled()
            }}
          />
        )}
      </div>
    </div>
  )
}
