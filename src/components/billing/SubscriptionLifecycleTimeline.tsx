'use client'

/**
 * SubscriptionLifecycleTimeline — the honest vertical rail from the
 * approved pattern doc (§1.2): since there is no trial, the timeline
 * narrates the subscription truthfully — today, before renewal, the
 * real renewal date and amount — and closes on the keep-forever fact.
 * One-time (2yr/3yr) plans narrate a term end instead of a renewal.
 */

import { buildLifecycleTimeline } from '@/lib/billing/paywall-state'
import type { BillingPlan } from '@/types/billing'

export default function SubscriptionLifecycleTimeline({
  plan,
}: {
  plan: BillingPlan
}) {
  const entries = buildLifecycleTimeline(plan)

  return (
    <ol
      className="m-0 grid list-none gap-0 p-0"
      aria-label="What happens with this subscription"
    >
      {entries.map((entry, index) => {
        const isLast = index === entries.length - 1
        return (
          <li key={entry.label} className="relative flex gap-4 pb-0">
            {/* Rail: dot + connecting line */}
            <span
              aria-hidden="true"
              className="relative flex w-3 shrink-0 justify-center"
            >
              <span
                className="absolute top-1.5 h-2 w-2 rounded-full"
                style={{
                  backgroundColor:
                    index === 0 ? 'var(--color-gold)' : 'transparent',
                  border: '1px solid var(--color-gold)',
                }}
              />
              {!isLast && (
                <span
                  className="absolute bottom-0 top-4 w-px"
                  style={{ backgroundColor: 'var(--color-border)' }}
                />
              )}
            </span>
            <span className={isLast ? 'pb-0' : 'pb-5'}>
              <span className="text-label vw-small block text-gold">
                {entry.label.toUpperCase()}
              </span>
              <span className="vw-small mt-1 block text-secondary">
                {entry.detail}
              </span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
