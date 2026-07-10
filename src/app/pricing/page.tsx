import type { Metadata } from 'next'
import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'
import EuangelionShellHeader from '@/components/EuangelionShellHeader'
import SiteFooter from '@/components/SiteFooter'
import { BILLING_PLANS } from '@/lib/billing/catalog'
import {
  FOUNDING_MEMBER_CAP,
  getFoundingMemberCount,
} from '@/lib/billing/founding-member'
import type { BillingPlan, FoundingMemberCount } from '@/types/billing'
import { DEVOTIONAL_COUNT, SERIES_COUNT } from '@/data/series'

/**
 * /pricing — built per docs/copy-specs/pricing-page-spec.md against
 * the founder-locked Section 0.2 pricing model.
 *
 * NOT-YET-SHIPPED status (founder direction 2026-05-05): the page
 * exists at /pricing but is intentionally:
 *   - `noindex,nofollow` so search engines don't surface it
 *   - excluded from the sitemap
 *   - not linked from header / footer / nav
 *
 * The page becomes discoverable when the founder OK's it after a
 * security review. Until then, it's reachable only by typing the
 * URL directly. The Founding Member counter, Stripe wiring, and
 * checkout buttons are real — they just aren't called by anything
 * the user can click on the live site.
 *
 * Companion deliverable: docs/copy-specs/pricing-page-spec.md
 */

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Free for everyone. Optional support unlocks AI-composed personal devotional plans.',
  // Hide from search engines + cross-site link metadata until the
  // founder approves public discovery (post security review).
  robots: { index: false, follow: false },
  alternates: { canonical: '/pricing' },
}

// Revalidate per request — the Founding Member count changes when
// new annual subscriptions complete. The helper itself caches for
// 60s so this isn't a Supabase round-trip per request.
export const revalidate = 60

const FAQ_ITEMS = [
  {
    q: 'Is the gospel ever paywalled?',
    a: 'No. The Bible is free. The full curated catalog is free. The Soul Audit and matched recommendations are free. We pay for AI generation; the Word costs nothing.',
  },
  {
    q: "What if I can't afford $7/month?",
    a: 'The free tier is the full curated catalog — every devotional we\'ve written, every series, every word of Scripture. It is not a "lite" version. There is no feature you\'d miss except for AI-composed personal plans, which you can sample once a quarter for free.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancellation takes effect at the end of your current billing period. You keep access until then.',
  },
  {
    q: 'What happens to my plan if I downgrade?',
    a: "Any AI-composed plans you've already generated stay in your library permanently. You just can't compose new ones until you're back on the paid tier or your quarterly free GENERATE refreshes.",
  },
  {
    q: 'Do you offer student or nonprofit pricing?',
    a: "Not currently. The free tier is designed to be enough for anyone. If you're a church, school, or nonprofit interested in a group license, email us — we'll figure something out.",
  },
  {
    q: 'Why no lifetime tier?',
    a: "Every Soul Audit and every devotional plan involves real per-user compute cost (AI API). Lifetime pricing for a SaaS with ongoing compute is a slow-motion margin trap. We'd rather charge a fair monthly price and keep the free tier robust.",
  },
] as const

const DONATION_TIERS = [
  { amount: 25, label: 'A small thanks' },
  { amount: 100, label: 'One month of AI costs at our current free-tier load' },
  { amount: 250, label: 'One quarter of operating costs' },
  {
    amount: 500,
    label: 'A meaningful contribution to a year of free reading for everyone',
  },
] as const

const FREE_TIER_FEATURES = [
  `All ${SERIES_COUNT} curated devotional series (${DEVOTIONAL_COUNT} devotionals)`,
  'Wake-Up Magazine (7 series, 35 devotionals)',
  'Soul Audit submission',
  '3 curated match recommendations with AI-written rationales',
  '1 personalized AI plan per quarter (a taste)',
  'Reading position sync across devices (with sign-in)',
  'Bookmarks + journal entries',
  'Daily Bread surface',
] as const

const PAID_TIER_ADDITIONS = [
  'Unlimited AI-composed plans — written for your specific reflection',
  'Unlimited Soul Audit re-rolls',
  'Soft cap: 1 AI plan per week (catches abuse without restricting normal use)',
  'Priority support',
  'Founding Member badge for the first 500 annual subscribers',
] as const

function PlanCard({ plan }: { plan: BillingPlan }) {
  const isAnnual = plan.id === 'premium_annual'
  return (
    <div
      className="rounded border p-6"
      style={{
        borderColor: isAnnual ? 'var(--color-gold)' : 'var(--color-border)',
        background: isAnnual ? 'rgba(196, 165, 114, 0.05)' : 'transparent',
      }}
    >
      <p className="text-label vw-small mb-2 text-gold">{plan.name}</p>
      <p className="vw-heading-sm mb-1">{plan.priceLabel}</p>
      <p className="vw-small mb-3 text-muted">{plan.effectiveMonthlyLabel}</p>
      {plan.savingsLabel && (
        <p className="vw-small mb-3 text-gold">{plan.savingsLabel}</p>
      )}
      <p className="vw-small mb-4 text-secondary">{plan.description}</p>
      {plan.awardsFoundingMember && (
        <p className="vw-small mb-4 text-gold">★ Founding Member tier</p>
      )}
    </div>
  )
}

function FoundingMemberCounter({ count }: { count: FoundingMemberCount }) {
  const remaining = Math.max(0, count.total - count.claimed)
  const percent = Math.min(100, Math.round((count.claimed / count.total) * 100))
  return (
    <div
      className="rounded border p-6"
      style={{ borderColor: 'var(--color-gold)' }}
    >
      <p className="text-label vw-small mb-3 text-gold">FOUNDING MEMBERS</p>
      <h2 className="vw-heading-sm mb-3">
        The first {FOUNDING_MEMBER_CAP} annual subscribers receive a permanent
        Founding Member badge.
      </h2>
      <p className="vw-small mb-3 text-secondary">
        Badge in your profile, name in /about credits, early access to new
        features as they ship.{' '}
        <strong className="text-gold">
          No price discount. Just acknowledgment of building this with us.
        </strong>
      </p>
      <p className="vw-small mb-4 text-secondary">
        Once you claim Founding Member, the badge is yours permanently — even if
        you later cancel your subscription.
      </p>
      <div
        className="my-4 h-2 overflow-hidden rounded"
        style={{ background: 'rgba(247, 243, 237, 0.08)' }}
        role="progressbar"
        aria-valuenow={count.claimed}
        aria-valuemin={0}
        aria-valuemax={count.total}
      >
        <div
          className="h-full"
          style={{
            width: `${percent}%`,
            background: 'var(--color-gold)',
          }}
        />
      </div>
      <p className="vw-small text-muted">
        {count.claimed} of {count.total} claimed{' '}
        {count.full ? '— cap reached' : `· ${remaining} remaining`}
      </p>
    </div>
  )
}

function DonationCard() {
  return (
    <div
      className="rounded border p-6"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <p className="text-label vw-small mb-3 text-gold">
        SUPPORT BEYOND A SUBSCRIPTION
      </p>
      <h2 className="vw-heading-sm mb-3">
        One-time donations help keep the lights on and the gospel free.
      </h2>
      <ul className="vw-small mb-4 space-y-2 text-secondary">
        {DONATION_TIERS.map((tier) => (
          <li key={tier.amount}>
            <strong className="text-gold">${tier.amount}</strong> — {tier.label}
          </li>
        ))}
      </ul>
      <p className="vw-small text-muted">
        Donations are not tax-deductible. Donations are not subscriptions.
      </p>
    </div>
  )
}

export default async function PricingPage() {
  const foundingMemberCount = await getFoundingMemberCount()

  return (
    <div className="mock-home">
      <main id="main-content" className="mock-paper">
        <EuangelionShellHeader />
        <div className="shell-content-pad mx-auto max-w-4xl">
          <Breadcrumbs
            className="mb-7"
            items={[{ label: 'HOME', href: '/' }, { label: 'PRICING' }]}
          />

          {/* Minimal hero */}
          <header className="mb-10">
            <p className="text-label vw-small mb-3 text-gold">PRICING</p>
            <h1 className="vw-heading-md mb-4">Free for everyone. Always.</h1>
            <p className="vw-body mb-2 text-secondary">
              Optional: $7/month for AI-composed personal devotional plans.
            </p>
            <details className="mt-4">
              <summary className="vw-small text-gold cursor-pointer">
                What does that actually mean? →
              </summary>
              <p className="vw-small mt-3 text-secondary">
                The Bible is free. The library of {SERIES_COUNT} curated
                devotional series is free. The Soul Audit and three matched
                paths are free.{' '}
                <strong className="text-gold">
                  You only pay if you want a custom devotional plan written for
                  your specific words.
                </strong>
              </p>
            </details>
          </header>

          {/* Two-column comparison */}
          <section className="mb-12">
            <h2 className="text-label vw-small mb-4 text-gold">FREE VS PAID</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div
                className="rounded border p-6"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <p className="text-label vw-small mb-2 text-gold">FREE</p>
                <p className="vw-heading-sm mb-4">$0 — always.</p>
                <ul className="vw-small space-y-2 text-secondary">
                  {FREE_TIER_FEATURES.map((feature) => (
                    <li key={feature}>· {feature}</li>
                  ))}
                </ul>
                <p className="vw-small mt-4 text-gold">
                  No &ldquo;lite&rdquo; version. This is the full product for
                  free users.
                </p>
              </div>
              <div
                className="rounded border p-6"
                style={{
                  borderColor: 'var(--color-gold)',
                  background: 'rgba(196, 165, 114, 0.05)',
                }}
              >
                <p className="text-label vw-small mb-2 text-gold">
                  EUANGELION +
                </p>
                <p className="vw-heading-sm mb-4">From $7 / month.</p>
                <p className="vw-small mb-3 text-secondary">
                  Everything in Free, plus:
                </p>
                <ul className="vw-small space-y-2 text-secondary">
                  {PAID_TIER_ADDITIONS.map((feature) => (
                    <li key={feature}>· {feature}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Pricing tiers (all four) */}
          <section className="mb-12">
            <h2 className="text-label vw-small mb-4 text-gold">
              PAID TIER OPTIONS
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {BILLING_PLANS.map((plan) => (
                <PlanCard key={plan.id} plan={plan} />
              ))}
            </div>
            <p className="vw-small mt-4 text-muted">
              All paid tiers unlock the same Euangelion+ features. Longer terms
              are one-time payments granting the full duration of access.
            </p>
          </section>

          {/* Founding Member — hidden entirely once cap is reached.
              Founder direction 2026-05-07: prefer disappearance to a
              "cap reached" message that lingers as a missed-opportunity
              signal. */}
          {!foundingMemberCount.full && (
            <section className="mb-12">
              <FoundingMemberCounter count={foundingMemberCount} />
            </section>
          )}

          {/* Donation */}
          <section className="mb-12">
            <DonationCard />
          </section>

          {/* FAQ */}
          <section className="mb-12">
            <h2 className="text-label vw-small mb-4 text-gold">PRICING FAQ</h2>
            <div className="space-y-3">
              {FAQ_ITEMS.map((item) => (
                <details
                  key={item.q}
                  className="rounded border p-4"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <summary className="vw-small text-gold cursor-pointer">
                    {item.q}
                  </summary>
                  <p className="vw-small mt-3 text-secondary">{item.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* Quiet footer */}
          <section className="mb-12">
            <p className="vw-small text-muted">
              Questions? See{' '}
              <Link href="/about" className="text-gold underline">
                /about
              </Link>
              ,{' '}
              <Link href="/donation-disclosure" className="text-gold underline">
                donation disclosure
              </Link>
              , and{' '}
              <Link href="/privacy" className="text-gold underline">
                privacy
              </Link>
              .
            </p>
          </section>
        </div>
        <SiteFooter />
      </main>
    </div>
  )
}
