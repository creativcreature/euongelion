'use client'

/**
 * BillingReturnRoom — the return leg of Stripe hosted checkout
 * (Phase 1c, pattern doc §2). Stripe sends the reader back to
 * /settings?billing=success&session_id=… or /settings?billing=cancelled;
 * the settings page mounts this room over itself for that beat.
 *
 * Three designed states:
 *  - Pending (webhook race): "Confirming with Stripe…" — polls
 *    entitlements until premiumActive flips. The paywall is never
 *    re-shown in this window; entitlement writes happen only via
 *    verified webhooks (SA-028), we only read.
 *  - Success (The Guardian model): serif thank-you + one mission
 *    sentence, Founding Member line when earned, then ONE primary CTA
 *    that resumes the held generation. No confetti (SA-025).
 *  - Cancelled: "No charge was made. Your edition request is saved."
 *    Try again primary, Back to reading text.
 */

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { typographer } from '@/lib/typographer'
import {
  usePendingGenerationStore,
  isHeldSelectionFresh,
} from '@/stores/pendingGenerationStore'
import type {
  BillingEntitlementsResponse,
  FoundingMemberCount,
} from '@/types/billing'

interface BillingReturnRoomProps {
  status: 'success' | 'cancelled'
  sessionId: string | null
  /** Leave the room and show normal settings. */
  onClose: () => void
}

const POLL_INTERVAL_MS = 2500
const MAX_POLLS = 40 // ~100s of webhook-race patience before honesty

type SuccessPhase = 'confirming' | 'ready' | 'stalled'

const RESUME_ROUTE = '/soul-audit/results?resume=1'

export default function BillingReturnRoom({
  status,
  sessionId,
  onClose,
}: BillingReturnRoomProps) {
  const router = useRouter()
  const [phase, setPhase] = useState<SuccessPhase>('confirming')
  const [entitlements, setEntitlements] = useState<
    BillingEntitlementsResponse['entitlements'] | null
  >(null)
  const [foundingCount, setFoundingCount] =
    useState<FoundingMemberCount | null>(null)
  // Bumped by "Check again" — restarts the confirmation poll.
  const [confirmAttempt, setConfirmAttempt] = useState(0)
  const pollTimerRef = useRef<number | null>(null)
  const cancelledRef = useRef(false)

  // This room only mounts client-side (the settings page raises it in an
  // effect), so reading the persisted hold directly is hydration-safe.
  const heldSnapshot = usePendingGenerationStore((store) => store.held)
  const hasHeldSelection = isHeldSelectionFresh(heldSnapshot)

  // Confirmation poll: nudge the lifecycle endpoint once (it also claims
  // Founding Member slots on annual success), then poll entitlements
  // until premiumActive flips — writes happen only via webhooks (SA-028).
  useEffect(() => {
    if (status !== 'success') return
    cancelledRef.current = false
    let polls = 0

    async function pollOnce() {
      if (cancelledRef.current) return
      polls += 1
      try {
        const response = await fetch('/api/billing/entitlements', {
          cache: 'no-store',
          credentials: 'include',
        })
        if (response.ok) {
          const payload = (await response.json()) as BillingEntitlementsResponse
          if (cancelledRef.current) return
          if (payload.entitlements?.premiumActive) {
            setEntitlements(payload.entitlements)
            setPhase('ready')
            return
          }
        }
      } catch {
        // Transient — keep polling until the cap, then be honest.
      }
      if (cancelledRef.current) return
      if (polls >= MAX_POLLS) {
        setPhase('stalled')
        return
      }
      pollTimerRef.current = window.setTimeout(
        () => void pollOnce(),
        POLL_INTERVAL_MS,
      )
    }

    const kickoff = sessionId
      ? fetch(
          `/api/billing/lifecycle?session_id=${encodeURIComponent(sessionId)}`,
          { cache: 'no-store' },
        ).catch(() => null)
      : Promise.resolve(null)
    void kickoff.then(() => void pollOnce())

    return () => {
      cancelledRef.current = true
      if (pollTimerRef.current) window.clearTimeout(pollTimerRef.current)
    }
  }, [status, sessionId, confirmAttempt])

  // Founding Member ordinal — fetched only once earned.
  useEffect(() => {
    if (phase !== 'ready' || !entitlements?.foundingMember) return
    let cancelled = false
    void (async () => {
      try {
        const response = await fetch('/api/billing/founding-member-count', {
          cache: 'no-store',
        })
        if (!response.ok) return
        const payload = (await response.json()) as {
          ok?: boolean
          count?: FoundingMemberCount
        }
        if (!cancelled && payload.ok && payload.count) {
          setFoundingCount(payload.count)
        }
      } catch {
        // The line renders without the number — never a made-up N.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [phase, entitlements])

  // ------------------------------------------------------------------
  // Cancelled
  // ------------------------------------------------------------------

  if (status === 'cancelled') {
    return (
      <section
        aria-label="Checkout result"
        className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center py-16 text-center"
      >
        <p className="text-label vw-small mb-4 text-gold">CHECKOUT</p>
        <h1 className="text-serif-italic vw-heading-md mb-4">
          Checkout didn’t finish.
        </h1>
        <p className="vw-body mb-2 text-secondary">
          <strong>No charge was made.</strong>
        </p>
        {hasHeldSelection && (
          <p className="vw-body mb-6 text-secondary">
            Your edition request is saved.
          </p>
        )}
        <div className="grid w-full max-w-xs gap-4">
          {hasHeldSelection ? (
            <button
              type="button"
              className="cta-major text-label vw-small w-full px-6 py-4"
              onClick={() => router.push(RESUME_ROUTE)}
            >
              TRY AGAIN
            </button>
          ) : (
            <button
              type="button"
              className="cta-major text-label vw-small w-full px-6 py-4"
              onClick={onClose}
            >
              TRY AGAIN
            </button>
          )}
          <Link href="/" className="text-label vw-small link-highlight">
            Back to reading
          </Link>
        </div>
      </section>
    )
  }

  // ------------------------------------------------------------------
  // Success — confirming (webhook race)
  // ------------------------------------------------------------------

  if (phase === 'confirming') {
    return (
      <section
        aria-label="Confirming your subscription"
        className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center py-16 text-center"
      >
        <p className="text-label vw-small mb-4 text-gold">ONE MOMENT</p>
        <h1 className="text-serif-italic vw-heading-md mb-4">
          Confirming with Stripe…
        </h1>
        <p className="vw-small text-muted" role="status" aria-live="polite">
          Your payment went through — we’re waiting for the confirmation to
          reach your account. This usually takes a few seconds.
        </p>
      </section>
    )
  }

  // ------------------------------------------------------------------
  // Success — stalled (honest, with a next action)
  // ------------------------------------------------------------------

  if (phase === 'stalled') {
    return (
      <section
        aria-label="Confirmation delayed"
        className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center py-16 text-center"
      >
        <p className="text-label vw-small mb-4 text-gold">STILL CONFIRMING</p>
        <h1 className="text-serif-italic vw-heading-md mb-4">
          Stripe confirmed your payment, but your account hasn’t unlocked yet.
        </h1>
        <p className="vw-body mb-6 text-secondary">
          {typographer(
            'This can take a minute on Stripe’s side. You will not be charged twice — checking again is always safe.',
          )}
        </p>
        <div className="grid w-full max-w-xs gap-4">
          <button
            type="button"
            className="cta-major text-label vw-small w-full px-6 py-4"
            onClick={() => {
              setPhase('confirming')
              setConfirmAttempt((attempt) => attempt + 1)
            }}
          >
            CHECK AGAIN
          </button>
          <button
            type="button"
            className="text-label vw-small link-highlight"
            onClick={onClose}
          >
            Back to settings
          </button>
        </div>
      </section>
    )
  }

  // ------------------------------------------------------------------
  // Success — the room (The Guardian model, no confetti)
  // ------------------------------------------------------------------

  const foundingLine = entitlements?.foundingMember
    ? foundingCount
      ? `You’re Founding Member ${foundingCount.claimed} of ${foundingCount.total}.`
      : 'You’re a Founding Member.'
    : null

  return (
    <section
      aria-label="Subscription confirmed"
      className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center py-16 text-center"
    >
      <p className="text-label vw-small mb-4 text-gold">EUANGELION+</p>
      <h1 className="text-serif-italic vw-heading-lg mb-5">Thank you.</h1>
      <p className="vw-body mb-3 text-secondary">
        {typographer(
          'Your subscription keeps the library free for everyone — the gospel is never paywalled.',
        )}
      </p>
      {foundingLine && <p className="vw-body mb-3 text-gold">{foundingLine}</p>}

      <div className="mt-6 grid w-full max-w-xs gap-4">
        {hasHeldSelection ? (
          <button
            type="button"
            className="cta-major text-label vw-small w-full px-6 py-4"
            onClick={() => router.push(RESUME_ROUTE)}
          >
            COMPOSE MY EDITION
          </button>
        ) : (
          <button
            type="button"
            className="cta-major text-label vw-small w-full px-6 py-4"
            onClick={() => router.push('/')}
          >
            CONTINUE READING
          </button>
        )}
        <Link
          href="/settings/subscription"
          className="text-label vw-small link-highlight"
        >
          Manage subscription
        </Link>
        <p className="vw-small text-muted">
          Your receipt arrives by email from Stripe.
        </p>
      </div>
    </section>
  )
}
