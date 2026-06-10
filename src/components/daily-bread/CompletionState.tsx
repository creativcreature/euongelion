import Link from 'next/link'
import type { PlanWithDays } from '@/types/soul-audit-plan'

interface CompletionStateProps {
  plan: PlanWithDays
}

export default function CompletionState({ plan }: CompletionStateProps) {
  return (
    <div className="mx-auto max-w-lg px-5 py-16 text-center">
      <p className="text-label vw-small mb-3 text-gold">DAILY BREAD</p>
      <h1 className="vw-heading-md mb-4">You’ve walked this series.</h1>

      {plan.theme && (
        <div
          className="mx-auto mb-6 max-w-sm border px-6 py-4"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <p className="text-label vw-small mb-1 text-gold">THEME</p>
          <p className="vw-body text-secondary">{plan.theme}</p>
        </div>
      )}

      {plan.scripture_anchor && (
        <p className="vw-small mb-8 text-muted">{plan.scripture_anchor}</p>
      )}

      <p className="vw-body mb-8 text-secondary">
        The word you received this week is seed planted in good soil. Let it
        take root. Let it grow. Let it bear fruit in the days ahead.
      </p>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <Link href="/soul-audit" className="cta-major">
          TAKE ANOTHER SOUL AUDIT
        </Link>
        <Link href="/series" className="link-highlight text-label vw-small">
          BROWSE SERIES
        </Link>
      </div>
    </div>
  )
}
