'use client'

/**
 * RedeemCodeSheet — the single-field gift-code sheet opened by the
 * paywall's REDEEM A CODE link (pattern doc §1 item 3, SA-027 path 6).
 *
 * SA-024 two presentations, one component: mobile is a bottom sheet;
 * desktop is a small centered panel. One input (auto-uppercase, codes
 * accepted with or without hyphens), one verb: REDEEM.
 *
 * Honest states, every one ending in an action:
 *  - client-side shape check catches obvious typos BEFORE spending one
 *    of the 5/hour attempts;
 *  - 401 → sign-in link carrying the same resume redirect the paywall
 *    uses (the held request survives the round trip);
 *  - 400/404/409/429/5xx → the server's own copy inline, input kept;
 *  - success → "Someone covered your edition." + credits added, and a
 *    single CTA that resumes the held generation exactly like the
 *    checkout success room does.
 *
 * Escape / × closes back to the paywall. The sheet renders INSIDE the
 * paywall dialog and runs its own focus trap, stopping propagation so
 * the paywall's trap and Escape-to-dismiss never fire underneath it.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  formatEditionCount,
  giftCodeForWire,
  isGiftCodeShapePlausible,
  normalizeGiftCodeInput,
  resolveRedeemOutcome,
  type RedeemOutcome,
} from '@/lib/billing/paywall-state'
import { typographer } from '@/lib/typographer'

interface RedeemCodeSheetProps {
  /** Sign-in URL with the paywall's resume redirect (401 path). */
  signInHref: string
  /** Close back to the paywall (Escape, ×, backdrop). */
  onClose: () => void
  /** A redemption landed — the paywall updates its credits line. */
  onRedeemed: (balance: number) => void
  /** Success CTA — resume the held generation (paywall onEntitled). */
  onCompose: () => void
}

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

type SheetPhase =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'failed'; outcome: Exclude<RedeemOutcome, { kind: 'success' }> }
  | { kind: 'success'; creditsAdded: number; balance: number; message: string }

export default function RedeemCodeSheet({
  signInHref,
  onClose,
  onRedeemed,
  onCompose,
}: RedeemCodeSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [code, setCode] = useState('')
  const [phase, setPhase] = useState<SheetPhase>({ kind: 'idle' })

  // Focus the field immediately — the sheet exists for one input.
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      // The paywall dialog listens beneath us — everything the sheet
      // handles must not reach it.
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      event.stopPropagation()
      const panel = panelRef.current
      if (!panel) return
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE),
      )
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
    [onClose],
  )

  async function submit() {
    if (phase.kind === 'submitting') return

    // Obvious-typo gate: same honest copy the server uses, but without
    // spending one of the rate-limited attempts.
    if (!isGiftCodeShapePlausible(code)) {
      setPhase({
        kind: 'failed',
        outcome: {
          kind: 'invalid_code',
          error:
            'That doesn’t look like a code. Check for typos and try again.',
        },
      })
      return
    }

    setPhase({ kind: 'submitting' })
    try {
      const response = await fetch('/api/billing/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code: giftCodeForWire(code) }),
      })
      const payload = (await response.json().catch(() => null)) as unknown
      const outcome = resolveRedeemOutcome(response.status, payload)
      if (outcome.kind === 'success') {
        onRedeemed(outcome.balance)
        setPhase({
          kind: 'success',
          creditsAdded: outcome.creditsAdded,
          balance: outcome.balance,
          message: outcome.message,
        })
      } else {
        setPhase({ kind: 'failed', outcome })
      }
    } catch {
      setPhase({
        kind: 'failed',
        outcome: {
          kind: 'error',
          error: 'Unable to redeem right now. Please try again in a moment.',
        },
      })
    }
  }

  const failedOutcome = phase.kind === 'failed' ? phase.outcome : null

  return (
    <div
      className="fixed inset-0 flex items-end justify-center sm:items-center"
      style={{
        background: 'rgba(17, 24, 42, 0.6)',
        zIndex: 'calc(var(--z-modal, 400) + 10)',
      }}
    >
      {/* Backdrop click closes back to the paywall. */}
      <button
        type="button"
        aria-label="Close and return to the offer"
        className="absolute inset-0 cursor-default"
        style={{ background: 'transparent' }}
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="redeem-code-heading"
        onKeyDown={handleKeyDown}
        className="relative w-full p-5 sm:max-w-md sm:p-7"
        style={{
          backgroundColor: 'var(--color-bg)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div
          className="flex items-start justify-between gap-4 pb-4"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <div>
            <p className="text-label vw-small mb-2 text-gold">REDEEM A CODE</p>
            <h2
              id="redeem-code-heading"
              className="text-serif-italic vw-body-lg m-0"
            >
              {phase.kind === 'success'
                ? typographer(phase.message)
                : typographer('Have a code? It covers your edition.')}
            </h2>
          </div>
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center text-2xl leading-none"
            style={{
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
            onClick={onClose}
            aria-label="Close and return to the offer"
          >
            ×
          </button>
        </div>

        {phase.kind === 'success' ? (
          <div className="grid gap-4 pt-5">
            <p className="vw-body text-secondary" role="status">
              {typographer(
                `${formatEditionCount(phase.creditsAdded)} added — you now have ${formatEditionCount(phase.balance)}.`,
              )}
            </p>
            <button
              type="button"
              className="cta-major text-label vw-small w-full px-6 py-4"
              onClick={onCompose}
            >
              COMPOSE MY EDITION
            </button>
            <button
              type="button"
              className="min-h-[44px] w-fit text-label vw-small link-highlight"
              onClick={onClose}
            >
              Back to the offer
            </button>
          </div>
        ) : (
          <form
            className="grid gap-4 pt-5"
            onSubmit={(event) => {
              event.preventDefault()
              void submit()
            }}
          >
            <label className="grid gap-2">
              <span className="text-label vw-small text-secondary">
                YOUR CODE
              </span>
              <input
                ref={inputRef}
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                className="min-h-[44px] w-full px-4 py-3 text-label"
                style={{
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                  letterSpacing: '0.12em',
                }}
                value={code}
                onChange={(event) => {
                  setCode(normalizeGiftCodeInput(event.target.value))
                  if (phase.kind === 'failed') setPhase({ kind: 'idle' })
                }}
                aria-invalid={failedOutcome ? true : undefined}
                aria-describedby={
                  failedOutcome ? 'redeem-code-error' : undefined
                }
              />
              <span className="vw-small text-muted">
                With or without hyphens — both work.
              </span>
            </label>

            {failedOutcome && (
              <div id="redeem-code-error" role="alert" className="grid gap-2">
                <p
                  className="vw-small m-0"
                  style={{ color: 'var(--color-error)' }}
                >
                  {typographer(failedOutcome.error)}
                </p>
                {failedOutcome.kind === 'auth_required' && (
                  <Link
                    href={signInHref}
                    className="cta-major text-label vw-small block w-full px-6 py-4 text-center"
                  >
                    SIGN IN — THEN REDEEM
                  </Link>
                )}
              </div>
            )}

            {failedOutcome?.kind !== 'auth_required' && (
              <button
                type="submit"
                className="cta-major text-label vw-small w-full px-6 py-4 disabled:opacity-50"
                disabled={phase.kind === 'submitting' || code.length === 0}
                aria-busy={phase.kind === 'submitting'}
              >
                {phase.kind === 'submitting' ? 'REDEEMING…' : 'REDEEM'}
              </button>
            )}

            <p className="vw-small m-0 text-muted">
              Codes attach editions to your account — nothing is charged.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
