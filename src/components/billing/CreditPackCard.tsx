'use client'

/**
 * CreditPackCard — the medium card of the paywall offer stack
 * (pattern doc §1 item 2, SA-027 path 3, Phase 2).
 *
 * "A single edition, no subscription": 2–3 pack sizes as big serif
 * numerals with the true price and per-edition math beside each,
 * expiry policy stated in one line (credits never expire), and a
 * quiet ClassPass-style cross-link up to the subscription. Editorial
 * credit-store register — no "POPULAR" badges, no preselection, no
 * urgency (SA-025).
 *
 * Selecting a pack IS the action: it routes through the same secure
 * checkout hand-off beat as plans (`packId` instead of `planId`), so
 * every button states the exact amount it leads to.
 *
 * Render this ONLY with a non-empty pack list (sellableCreditPacks) —
 * zero packs means no card, never an empty frame.
 */

import type { BillingCreditPack } from '@/types/billing'

interface CreditPackCardProps {
  packs: BillingCreditPack[]
  /** True while any checkout hand-off is in flight — disables buying. */
  busy: boolean
  onPurchase: (packId: string) => void
  /**
   * Quiet cross-link target: scrolls the subscribe card into view.
   * Provided by the paywall so the relationship copy stays actionable.
   */
  onCrossLinkToSubscription?: () => void
}

export default function CreditPackCard({
  packs,
  busy,
  onPurchase,
  onCrossLinkToSubscription,
}: CreditPackCardProps) {
  if (packs.length === 0) return null

  return (
    <section
      aria-labelledby="credit-pack-card-heading"
      className="grid gap-4 p-5"
      style={{
        border: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
      }}
    >
      <h3
        id="credit-pack-card-heading"
        className="text-serif-italic vw-body-lg m-0"
      >
        A single edition, no subscription.
      </h3>

      <div className="grid gap-3">
        {packs.map((pack) => (
          <button
            key={pack.id}
            type="button"
            className="flex min-h-[44px] items-baseline gap-4 p-4 text-left transition-theme disabled:opacity-50"
            style={{
              border: '1px solid var(--color-border)',
              backgroundColor: 'var(--color-bg)',
            }}
            disabled={busy}
            onClick={() => onPurchase(pack.id)}
            aria-label={`Buy ${pack.credits} ${
              pack.credits === 1 ? 'edition' : 'editions'
            } — ${pack.priceLabel} (${pack.perEditionLabel})`}
          >
            <span
              className="text-display shrink-0"
              style={{
                fontSize: 'clamp(1.9rem, 3.5vw, 2.5rem)',
                lineHeight: 1,
                minWidth: '2ch',
              }}
            >
              {pack.credits}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-label vw-small text-muted">
                  {pack.credits === 1 ? 'EDITION' : 'EDITIONS'}
                </span>
                <span className="vw-body text-[var(--color-text-primary)]">
                  {pack.priceLabel}
                </span>
              </span>
              <span className="vw-small mt-1 block text-muted">
                {pack.perEditionLabel}
              </span>
            </span>
          </button>
        ))}
      </div>

      <p className="vw-small m-0 text-secondary">Credits never expire.</p>

      <p className="vw-small m-0 text-muted">
        Prefer everything included?{' '}
        {onCrossLinkToSubscription ? (
          <button
            type="button"
            className="link-highlight"
            onClick={onCrossLinkToSubscription}
          >
            The subscription above
          </button>
        ) : (
          'The subscription above'
        )}{' '}
        covers unlimited months.
      </p>
    </section>
  )
}
