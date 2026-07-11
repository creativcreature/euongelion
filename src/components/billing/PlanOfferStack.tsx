'use client'

/**
 * PlanOfferStack — the subscribe offer stack from the approved pattern
 * doc (§1.2): Annual preselected with a RECOMMENDED label, Monthly
 * beneath, 2-year/3-year behind a quiet "More durations" disclosure.
 *
 * Honesty rules baked in: true billed amounts only, months-free framing
 * (never strikethrough inflation), no countdowns, nothing pre-checked
 * beyond the visible Annual preselection. Radio cards are real radio
 * inputs ≥44px tall for keyboard + touch parity.
 */

import { useId, useState } from 'react'
import type { BillingPlan, BillingPlanId } from '@/types/billing'

interface PlanOfferStackProps {
  plans: BillingPlan[]
  selectedPlanId: BillingPlanId
  onSelect: (planId: BillingPlanId) => void
  /** Quiet variant for State A ("When you want more than one…"). */
  quiet?: boolean
}

const PRIMARY_ORDER: BillingPlanId[] = ['premium_annual', 'premium_monthly']
const EXTENDED_ORDER: BillingPlanId[] = ['premium_2year', 'premium_3year']

function planSubline(plan: BillingPlan): string {
  if (plan.id === 'premium_annual') {
    return `One month free · ${plan.effectiveMonthlyLabel} effective`
  }
  if (plan.billingType === 'one_time') {
    return `One-time payment · ${plan.effectiveMonthlyLabel} effective`
  }
  return 'Cancel anytime'
}

function PlanRadioCard({
  plan,
  groupName,
  selected,
  onSelect,
}: {
  plan: BillingPlan
  groupName: string
  selected: boolean
  onSelect: (planId: BillingPlanId) => void
}) {
  return (
    <label
      className="flex min-h-[44px] cursor-pointer items-baseline gap-4 p-4 transition-theme"
      style={{
        border: `1px solid ${
          selected ? 'var(--color-gold)' : 'var(--color-border)'
        }`,
        backgroundColor: selected
          ? 'color-mix(in srgb, var(--color-gold) 8%, var(--color-surface))'
          : 'var(--color-surface)',
      }}
    >
      <input
        type="radio"
        name={groupName}
        value={plan.id}
        checked={selected}
        onChange={() => onSelect(plan.id)}
        className="mt-1 shrink-0"
        aria-label={`${plan.name} — ${plan.priceLabel}`}
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="flex items-baseline gap-2">
            <span className="text-label vw-small text-gold">
              {plan.name.toUpperCase()}
            </span>
            {plan.id === 'premium_annual' && (
              <span
                className="text-label px-2 py-0.5"
                style={{
                  fontSize: '0.6rem',
                  letterSpacing: '0.12em',
                  border: '1px solid var(--color-gold)',
                  color: 'var(--color-gold)',
                }}
              >
                RECOMMENDED
              </span>
            )}
          </span>
          <span className="vw-body text-[var(--color-text-primary)]">
            {plan.priceLabel}
          </span>
        </span>
        <span className="vw-small mt-1 block text-muted">
          {planSubline(plan)}
        </span>
      </span>
    </label>
  )
}

export default function PlanOfferStack({
  plans,
  selectedPlanId,
  onSelect,
  quiet = false,
}: PlanOfferStackProps) {
  const groupName = useId()
  const [showExtended, setShowExtended] = useState(() =>
    EXTENDED_ORDER.includes(selectedPlanId),
  )

  const byId = new Map(plans.map((plan) => [plan.id, plan]))
  const primaryPlans = PRIMARY_ORDER.map((id) => byId.get(id)).filter(
    (plan): plan is BillingPlan => Boolean(plan),
  )
  const extendedPlans = EXTENDED_ORDER.map((id) => byId.get(id)).filter(
    (plan): plan is BillingPlan => Boolean(plan),
  )

  return (
    <fieldset
      className="m-0 border-0 p-0"
      style={quiet ? { opacity: 0.85 } : undefined}
    >
      <legend className="sr-only">Choose a subscription duration</legend>
      <div className="grid gap-3" role="radiogroup" aria-label="Plans">
        {primaryPlans.map((plan) => (
          <PlanRadioCard
            key={plan.id}
            plan={plan}
            groupName={groupName}
            selected={selectedPlanId === plan.id}
            onSelect={onSelect}
          />
        ))}

        {extendedPlans.length > 0 && !showExtended && (
          <button
            type="button"
            className="min-h-[44px] w-fit text-label vw-small link-highlight px-1 py-2"
            onClick={() => setShowExtended(true)}
            aria-expanded={false}
          >
            More durations
          </button>
        )}

        {showExtended &&
          extendedPlans.map((plan) => (
            <PlanRadioCard
              key={plan.id}
              plan={plan}
              groupName={groupName}
              selected={selectedPlanId === plan.id}
              onSelect={onSelect}
            />
          ))}
      </div>
    </fieldset>
  )
}
